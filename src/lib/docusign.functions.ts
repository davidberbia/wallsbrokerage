import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireStaffAuth } from "@/lib/staff-middleware";

export const getDocusignStatus = createServerFn({ method: "GET" })
  .middleware([requireStaffAuth])
  .handler(async () => {
    const { getAdmin } = await import("@/lib/automation.server");
    const admin = await getAdmin();
    const { data } = await admin.from("docusign_auth").select("env, account_email, refresh_token, base_uri").eq("id", true).maybeSingle();
    return { connected: Boolean(data?.refresh_token), live: Boolean(data?.refresh_token && data?.base_uri && !data.base_uri.includes("demo")), email: data?.account_email ?? null, env: data?.env ?? "prod" };
  });

export const startDocusignConnect = createServerFn({ method: "POST" })
  .middleware([requireStaffAuth])
  .inputValidator((d) => z.object({ env: z.enum(["prod", "demo"]) }).parse(d))
  .handler(async ({ data }) => {
    const { getAdmin } = await import("@/lib/automation.server");
    const { DS_REDIRECT, dsAuthHost, dsClientId } = await import("@/lib/docusign.server");
    const admin = await getAdmin();
    const state = crypto.randomUUID();
    await admin.from("docusign_auth").upsert({ id: true, env: data.env, pending_state: state, updated_at: new Date().toISOString() });
    const q = new URLSearchParams({ response_type: "code", scope: "signature extended", client_id: dsClientId(), redirect_uri: DS_REDIRECT, state });
    return { url: `${dsAuthHost(data.env)}/oauth/auth?${q}` };
  });

export const sendMandateForSignature = createServerFn({ method: "POST" })
  .middleware([requireStaffAuth])
  .inputValidator((d) => z.object({
    mandateId: z.string().uuid(),
    ownerName: z.string().trim().min(1).max(200),
    ownerEmail: z.string().trim().email().max(255),
    fileName: z.string().min(1).max(200),
    fileBase64: z.string().min(10).max(14_000_000),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: m, error } = await context.supabase.from("mandates").select("id, number").eq("id", data.mandateId).maybeSingle();
    if (error || !m) throw new Error("Mandat introuvable");
    const { getDsAccess } = await import("@/lib/docusign.server");
    const ds = await getDsAccess();
    const ext = data.fileName.split(".").pop()?.toLowerCase() || "pdf";
    const signers = [
      { email: data.ownerEmail, name: data.ownerName, recipientId: "1", routingOrder: "2" },
      { email: ds.email || "d.berbia@wallsbroker.com", name: "David Berbia", recipientId: "2", routingOrder: "1" },
    ];
    const r = await fetch(`${ds.api}/envelopes`, {
      method: "POST",
      headers: { Authorization: `Bearer ${ds.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        emailSubject: `Mandat n° ${m.number} — signature`,
        documents: [{ documentBase64: data.fileBase64, name: data.fileName, fileExtension: ext, documentId: "1" }],
        recipients: { signers },
        status: "sent",
      }),
    });
    const t = await r.text();
    if (!r.ok) throw new Error(`DocuSign [${r.status}] ${t}`);
    const env = JSON.parse(t) as { envelopeId: string };
    await context.supabase.from("mandates").update({
      envelope_id: env.envelopeId, signature_status: "sent", signer_email: data.ownerEmail, status: "envoyé",
    }).eq("id", m.id);
    return { ok: true };
  });

export const refreshMandateSignatures = createServerFn({ method: "POST" })
  .middleware([requireStaffAuth])
  .handler(async ({ context }) => {
    const { syncMandateSignatures } = await import("@/lib/docusign.server");
    return syncMandateSignatures(context.supabase);
  });

const anchorTab = (anchor: string, initials: string) => ({
  initialHereTabs: [{ anchorString: initials, anchorUnits: "pixels", anchorYOffset: "14", anchorXOffset: "2" }],
  signHereTabs: [{ anchorString: anchor, anchorUnits: "pixels", anchorYOffset: "18", anchorXOffset: "6", scaleValue: "1.4" }],
});

/** Prépare l'enveloppe (non envoyée) depuis le mandat généré et renvoie le PDF à vérifier. */
export const prepareMandateSignature = createServerFn({ method: "POST" })
  .middleware([requireStaffAuth])
  .inputValidator((d) => z.object({
    mandateId: z.string().uuid(),
    mandantName: z.string().trim().min(1).max(200),
    mandantEmail: z.string().trim().email().max(255),
    html: z.string().min(50).max(2_000_000),
    allowNewEnvelope: z.boolean().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: m, error } = await context.supabase.from("mandates").select("id, number, envelope_id, signature_status").eq("id", data.mandateId).maybeSingle();
    if (error || !m) throw new Error("Mandat introuvable");
    // Un mandat signé n'est jamais modifié : on crée un nouveau mandat (nouveau numéro) depuis la fiche de l'actif.
    if (m.signature_status === "completed") throw new Error("Ce mandat est déjà signé par toutes les parties : créez un nouveau mandat depuis la fiche de l'actif.");
    const { getDsAccess } = await import("@/lib/docusign.server");
    const { ANCHOR_MANDANT, ANCHOR_INIT_MANDANT, ANCHOR_INIT_MANDATAIRE, ANCHOR_MANDATAIRE } = await import("@/lib/mandate-template");
    const ds = await getDsAccess();
    const H = { Authorization: `Bearer ${ds.token}`, "Content-Type": "application/json" };
    const bytes = new TextEncoder().encode(data.html);
    let bin = ""; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    const doc = { documentBase64: btoa(bin), name: `Mandat ${m.number}.html`, fileExtension: "html", documentId: "1" };
    const signers = [
      { email: data.mandantEmail, name: data.mandantName, recipientId: "1", routingOrder: "2", roleName: "Mandant", tabs: anchorTab(ANCHOR_MANDANT, ANCHOR_INIT_MANDANT) },
      { email: ds.email || "d.berbia@wallsbroker.com", name: "Wallsbroker — David Berbia", recipientId: "2", routingOrder: "1", roleName: "Mandataire", tabs: anchorTab(ANCHOR_MANDATAIRE, ANCHOR_INIT_MANDATAIRE) },
    ];

    // Correction dans la même enveloppe (aucun crédit DocuSign) tant que personne n'a signé.
    let envelopeId: string | null = null;
    let inProcess = false;
    if (m.envelope_id) {
      const er = await fetch(`${ds.api}/envelopes/${m.envelope_id}?include=recipients`, { headers: H });
      if (er.ok) {
        const e = (await er.json()) as { status: string; recipients?: { signers?: { recipientId: string; status: string }[] } };
        const anySigned = (e.recipients?.signers ?? []).some((s) => ["completed", "signed"].includes(s.status));
        if (e.status === "completed") throw new Error("Ce mandat est déjà signé par toutes les parties : créez un nouveau mandat depuis la fiche de l'actif.");
        if (["created", "sent", "delivered", "correct"].includes(e.status)) {
          if (anySigned) {
            if (!data.allowNewEnvelope) throw new Error("DEJA_SIGNE_PARTIELLEMENT");
            await fetch(`${ds.api}/envelopes/${m.envelope_id}`, { method: "PUT", headers: H, body: JSON.stringify({ status: "voided", voidedReason: "Remplacé par un mandat corrigé" }) });
          } else {
            envelopeId = m.envelope_id;
            inProcess = e.status !== "created";
          }
        }
      }
    }

    if (envelopeId) {
      let lockHeader: Record<string, string> = {};
      if (inProcess) {
        const lr = await fetch(`${ds.api}/envelopes/${envelopeId}/lock`, { method: "POST", headers: H, body: JSON.stringify({ lockDurationInSeconds: "300", lockType: "edit" }) });
        if (!lr.ok) throw new Error(`DocuSign : enveloppe verrouillée (${lr.status}) ${await lr.text()}`);
        const { lockToken } = (await lr.json()) as { lockToken: string };
        lockHeader = { "X-DocuSign-Edit": JSON.stringify({ LockToken: lockToken, LockDurationInSeconds: "300" }) };
      }
      const HL = { ...H, ...lockHeader };
      try {
        const dr = await fetch(`${ds.api}/envelopes/${envelopeId}/documents`, { method: "PUT", headers: HL, body: JSON.stringify({ documents: [doc] }) });
        const dt = await dr.text();
        if (!dr.ok || dt.includes("errorDetails")) throw new Error(`DocuSign : remplacement du document refusé (${dr.status}) ${dt}`);
        // Nom / e-mail du mandant éventuellement corrigés.
        const ur = await fetch(`${ds.api}/envelopes/${envelopeId}/recipients`, { method: "PUT", headers: HL, body: JSON.stringify({ signers: [{ recipientId: "1", email: data.mandantEmail, name: data.mandantName }] }) });
        if (!ur.ok) throw new Error(`DocuSign : mise à jour du mandant refusée (${ur.status}) ${await ur.text()}`);
        // Emplacements : on retire les anciens champs et on repose ceux du code actuel.
        for (const s of signers) {
          const tr = await fetch(`${ds.api}/envelopes/${envelopeId}/recipients/${s.recipientId}/tabs`, { headers: HL });
          if (!tr.ok) throw new Error(`DocuSign : lecture des champs impossible (${tr.status})`);
          const tabs = (await tr.json()) as { signHereTabs?: { tabId: string }[]; initialHereTabs?: { tabId: string }[] };
          const del = {
            signHereTabs: (tabs.signHereTabs ?? []).map((t) => ({ tabId: t.tabId })),
            initialHereTabs: (tabs.initialHereTabs ?? []).map((t) => ({ tabId: t.tabId })),
          };
          if (del.signHereTabs.length || del.initialHereTabs.length) {
            const xr = await fetch(`${ds.api}/envelopes/${envelopeId}/recipients/${s.recipientId}/tabs`, { method: "DELETE", headers: HL, body: JSON.stringify(del) });
            if (!xr.ok) throw new Error(`DocuSign : suppression des anciens champs refusée (${xr.status}) ${await xr.text()}`);
          }
          const ar = await fetch(`${ds.api}/envelopes/${envelopeId}/recipients/${s.recipientId}/tabs`, { method: "POST", headers: HL, body: JSON.stringify(s.tabs) });
          if (!ar.ok) throw new Error(`DocuSign : pose des champs refusée (${ar.status}) ${await ar.text()}`);
        }
      } finally {
        if (inProcess) await fetch(`${ds.api}/envelopes/${envelopeId}/lock`, { method: "DELETE", headers: HL }).catch(() => {});
      }
    } else {
      const r = await fetch(`${ds.api}/envelopes`, {
        method: "POST", headers: H,
        body: JSON.stringify({ emailSubject: `Mandat n° ${m.number} — signature`, documents: [doc], recipients: { signers }, status: "created" }),
      });
      const t = await r.text();
      if (!r.ok) throw new Error(`DocuSign : préparation refusée (${r.status}) ${t}`);
      envelopeId = (JSON.parse(t) as { envelopeId: string }).envelopeId;
    }

    const pdf = await fetch(`${ds.api}/envelopes/${envelopeId}/documents/combined`, { headers: { Authorization: `Bearer ${ds.token}` } });
    if (!pdf.ok) throw new Error(`DocuSign : PDF indisponible (${pdf.status})`);
    const pb = new Uint8Array(await pdf.arrayBuffer());
    let pbin = ""; for (let i = 0; i < pb.length; i += 0x8000) pbin += String.fromCharCode(...pb.subarray(i, i + 0x8000));
    // Enveloppe déjà partie : elle reste en cours (le suivi continue), seul l'e-mail est renvoyé à l'étape d'envoi.
    await context.supabase.from("mandates").update(
      inProcess
        ? { envelope_id: envelopeId, signer_email: data.mandantEmail }
        : { envelope_id: envelopeId, signature_status: "prêt à envoyer", signer_email: data.mandantEmail, signed_at: null, status: "brouillon" },
    ).eq("id", m.id);
    return { pdfBase64: btoa(pbin), corrected: !!m.envelope_id && envelopeId === m.envelope_id };
  });

/** Envoie au Mandant et au Mandataire l'enveloppe vérifiée. */
export const sendPreparedMandate = createServerFn({ method: "POST" })
  .middleware([requireStaffAuth])
  .inputValidator((d) => z.object({ mandateId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: m } = await context.supabase.from("mandates").select("id, envelope_id, signature_status").eq("id", data.mandateId).maybeSingle();
    if (!m?.envelope_id || !["prêt à envoyer", "sent", "delivered"].includes(m.signature_status ?? "")) throw new Error("Générez d'abord le PDF du mandat.");
    const { getDsAccess } = await import("@/lib/docusign.server");
    const ds = await getDsAccess();
    // Enveloppe déjà partie et corrigée : simple renvoi de l'e-mail (aucun crédit).
    const resend = m.signature_status !== "prêt à envoyer";
    const r = await fetch(`${ds.api}/envelopes/${m.envelope_id}${resend ? "?resend_envelope=true" : ""}`, { method: "PUT", headers: { Authorization: `Bearer ${ds.token}`, "Content-Type": "application/json" }, body: JSON.stringify(resend ? {} : { status: "sent" }) });
    if (!r.ok) throw new Error(`DocuSign : envoi refusé (${r.status}) ${await r.text()}`);
    if (!resend) await context.supabase.from("mandates").update({ signature_status: "sent", status: "envoyé" }).eq("id", m.id);
    return { ok: true };
  });

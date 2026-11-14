import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireStaffAuth } from "@/lib/staff-middleware";

export const getDocusignStatus = createServerFn({ method: "GET" })
  .middleware([requireStaffAuth])
  .handler(async () => {
    const { getAdmin } = await import("@/lib/automation.server");
    const admin = await getAdmin();
    const { data } = await admin.from("docusign_auth").select("env, account_email, refresh_token").eq("id", true).maybeSingle();
    return { connected: Boolean(data?.refresh_token), email: data?.account_email ?? null, env: data?.env ?? "prod" };
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
      { email: data.ownerEmail, name: data.ownerName, recipientId: "1", routingOrder: "1" },
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
    const { data: rows } = await context.supabase.from("mandates").select("id, envelope_id, signature_status")
      .not("envelope_id", "is", null).neq("signature_status", "completed");
    if (!rows?.length) return { updated: 0 };
    const { getDsAccess } = await import("@/lib/docusign.server");
    const ds = await getDsAccess();
    let updated = 0;
    for (const row of rows) {
      const r = await fetch(`${ds.api}/envelopes/${row.envelope_id}`, { headers: { Authorization: `Bearer ${ds.token}` } });
      if (!r.ok) continue;
      const e = (await r.json()) as { status: string };
      if (e.status === row.signature_status) continue;
      const patch: { signature_status: string; status?: string; signed_at?: string } = { signature_status: e.status };
      if (e.status === "completed") { patch.status = "signé"; patch.signed_at = new Date().toISOString(); }
      await context.supabase.from("mandates").update(patch).eq("id", row.id);
      updated++;
    }
    return { updated };
  });

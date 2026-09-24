// Demandes de documents par les investisseurs : détection, recherche, brouillons à valider.
import { getAdmin } from "@/lib/automation.server";
import { callGeminiJson, BudgetReachedError } from "@/lib/gemini.server";
import { getMessageBody, listAttachments, searchFromWithAttachments, type AttachmentRef } from "@/lib/graph-send.server";

const KEYWORDS = /(plan|état locatif|etat locatif|bail|baux|diagnostic|dpe|photo|data ?room|taxe fonci|charges|document|kbis|surface|rent roll|titre de propri|règlement de copro|audit)/i;
const PER_TICK = 8;
export const AI_SIGNATURE =
  '<p>Bien cordialement,<br/>David Berbia<br/>Wallsbroker</p><p style="color:#888;font-size:11px">Ce mail a été créé par l\'IA de Wallsbroker.</p>';

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const toHtml = (t: string) => t.split(/\n{2,}/).map((p) => `<p>${esc(p).replace(/\n/g, "<br/>")}</p>`).join("");

type Classif = { is_request: boolean; documents: string; asset_hint: string };
type Pick = { attachment_ids: string[] };
type Letter = { subject: string; body: string };

const SYSTEM =
  "Tu es l'assistante de David Berbia, courtier en immobilier commercial chez Wallsbroker. Tu réponds en français, ton aimable, professionnel et concis. Ne signe pas, la signature est ajoutée automatiquement.";

async function pickAttachments(sellerEmail: string, documents: string): Promise<AttachmentRef[]> {
  const mails = await searchFromWithAttachments(sellerEmail);
  const all: { ref: AttachmentRef; label: string }[] = [];
  for (const m of mails.slice(0, 10)) {
    for (const a of await listAttachments(m.id)) {
      if (/^image\d*\.(png|jpe?g|gif)$/i.test(a.name)) continue; // logos de signature
      all.push({ ref: { messageId: m.id, attachmentId: a.id, name: a.name }, label: `${a.id} | ${a.name} | mail « ${m.subject} »` });
    }
  }
  if (!all.length) return [];
  const pick = await callGeminiJson<Pick>({
    task: "choix_pieces_jointes",
    system: SYSTEM,
    prompt: `Documents demandés : ${documents}\n\nPièces jointes disponibles (id | nom | mail) :\n${all.map((x) => x.label).join("\n")}\n\nRetourne {"attachment_ids": [...]} avec uniquement les pièces qui correspondent clairement aux documents demandés, sinon une liste vide.`,
  });
  const ids = new Set(pick?.attachment_ids ?? []);
  return all.filter((x) => ids.has(x.ref.attachmentId)).map((x) => x.ref);
}

async function write(task: string, instruction: string): Promise<Letter> {
  const l = await callGeminiJson<Letter>({
    task,
    system: SYSTEM,
    prompt: `${instruction}\nRetourne {"subject": "...", "body": "texte brut, paragraphes séparés par une ligne vide"}.`,
  });
  return l ?? { subject: "Votre demande", body: instruction };
}

export async function runDocRequests(): Promise<Record<string, number | string>> {
  const admin = await getAdmin();
  const report: Record<string, number | string> = {};
  try {
    // 1) Nouvelles demandes (3.A)
    const since = new Date(Date.now() - 7 * 86400_000).toISOString();
    const { data: mails } = await admin
      .from("mail_messages")
      .select("id,graph_id,from_email,from_name,subject,preview,deal_id")
      .eq("folder", "inbox")
      .is("ai_checked_at", null)
      .gte("received_at", since)
      .order("received_at", { ascending: false })
      .limit(60);
    const candidates = (mails ?? []).filter((m) => KEYWORDS.test(`${m.subject ?? ""} ${m.preview ?? ""}`));
    const skipped = (mails ?? []).filter((m) => !candidates.includes(m)).map((m) => m.id);
    if (skipped.length) await admin.from("mail_messages").update({ ai_checked_at: new Date().toISOString() }).in("id", skipped);

    const emails = Array.from(new Set(candidates.map((m) => m.from_email).filter(Boolean))) as string[];
    const { data: invs } = emails.length
      ? await admin.from("investors").select("email,full_name").in("email", emails)
      : { data: [] };
    const known = new Map((invs ?? []).map((i) => [(i.email ?? "").toLowerCase(), i.full_name]));
    const { data: deals } = await admin.from("deals").select("id,name,address").not("stage", "in", "(Signé,Perdu)");

    let created = 0;
    for (const m of candidates.slice(0, PER_TICK)) {
      await admin.from("mail_messages").update({ ai_checked_at: new Date().toISOString() }).eq("id", m.id);
      const from = (m.from_email ?? "").toLowerCase();
      if (!known.has(from)) continue; // uniquement les investisseurs identifiés
      const body = await getMessageBody(m.graph_id);
      const c = await callGeminiJson<Classif>({
        task: "detection_demande_documents",
        system: SYSTEM,
        prompt: `Mail d'un investisseur.\nObjet : ${m.subject}\nTexte : ${body}\n\nDossiers en cours : ${(deals ?? []).map((d) => `${d.id} = ${d.name}${d.address ? ` (${d.address})` : ""}`).join(" ; ")}\n\nRetourne {"is_request": bool (demande-t-il des documents sur un actif ?), "documents": "liste des documents demandés", "asset_hint": "id du dossier concerné ou chaîne vide"}.`,
      });
      if (!c?.is_request) continue;
      const dealId = m.deal_id ?? ((deals ?? []).find((d) => d.id === c.asset_hint)?.id ?? null);
      const { data: seller } = dealId
        ? await admin.from("deal_contacts").select("email").eq("deal_id", dealId).eq("role", "vendeur").limit(1).maybeSingle()
        : { data: null };
      const { data: req, error } = await admin
        .from("ai_doc_requests")
        .insert({
          investor_email: from,
          investor_name: known.get(from) ?? m.from_name,
          investor_graph_id: m.graph_id,
          deal_id: dealId,
          requested: c.documents,
          seller_email: seller?.email ?? null,
        })
        .select("id")
        .single();
      if (error || !req) continue;
      created += 1;
      const dealName = (deals ?? []).find((d) => d.id === dealId)?.name ?? "l'actif";
      const firstName = (known.get(from) ?? m.from_name ?? "").split(" ")[0];

      // 3.B : documents trouvés chez le vendeur
      const refs = seller?.email ? await pickAttachments(seller.email, c.documents) : [];
      if (refs.length) {
        const l = await write("reponse_investisseur", `Rédige la réponse à ${firstName} qui a demandé « ${c.documents} » pour ${dealName}. Les documents suivants sont joints : ${refs.map((r) => r.name).join(", ")}.`);
        await admin.from("ai_drafts").insert({ request_id: req.id, kind: "reponse_investisseur", reply_to_graph_id: m.graph_id, to_email: from, to_name: firstName, subject: `RE: ${m.subject ?? ""}`, body_html: toHtml(l.body) + AI_SIGNATURE, attachments: refs });
        await admin.from("ai_doc_requests").update({ status: "documents trouvés" }).eq("id", req.id);
      } else if (seller?.email) {
        // 3.C : demande au vendeur + accusé à l'investisseur
        const ls = await write("demande_vendeur", `Rédige un mail poli au vendeur de ${dealName} pour lui demander : ${c.documents}. Explique que c'est pour répondre à l'intérêt d'un acquéreur potentiel, sans jamais le nommer.`);
        await admin.from("ai_drafts").insert({ request_id: req.id, kind: "demande_vendeur", to_email: seller.email, subject: ls.subject, body_html: toHtml(ls.body) + AI_SIGNATURE });
        const li = await write("accuse_investisseur", `Rédige une courte réponse à ${firstName} : sa demande (« ${c.documents} » pour ${dealName}) a été transmise au vendeur, et nous lui transmettrons les éléments dès réception.`);
        await admin.from("ai_drafts").insert({ request_id: req.id, kind: "accuse_investisseur", reply_to_graph_id: m.graph_id, to_email: from, to_name: firstName, subject: `RE: ${m.subject ?? ""}`, body_html: toHtml(li.body) + AI_SIGNATURE });
        await admin.from("ai_doc_requests").update({ status: "demandé au vendeur" }).eq("id", req.id);
      } else {
        await admin.from("ai_doc_requests").update({ status: "vendeur inconnu" }).eq("id", req.id);
      }
    }
    report["demandes_documents"] = created;

    // 3.D : réception des documents du vendeur
    const { data: waiting } = await admin
      .from("ai_doc_requests")
      .select("*")
      .eq("status", "vendeur relancé")
      .not("seller_email", "is", null)
      .limit(5);
    let forwarded = 0;
    for (const r of waiting ?? []) {
      const mailsFrom = (await searchFromWithAttachments(r.seller_email!)).filter((x) => x.receivedDateTime > r.updated_at);
      if (!mailsFrom.length) continue;
      const refs: AttachmentRef[] = [];
      for (const x of mailsFrom.slice(0, 3))
        for (const a of await listAttachments(x.id))
          if (!/^image\d*\.(png|jpe?g|gif)$/i.test(a.name)) refs.push({ messageId: x.id, attachmentId: a.id, name: a.name });
      if (!refs.length) continue;
      const first = (r.investor_name ?? "").split(" ")[0];
      const li = await write("transmission_investisseur", `Rédige la réponse à ${first} : voici les documents demandés (« ${r.requested} ») reçus du vendeur, joints : ${refs.map((x) => x.name).join(", ")}.`);
      await admin.from("ai_drafts").insert({ request_id: r.id, kind: "reponse_investisseur", reply_to_graph_id: r.investor_graph_id, to_email: r.investor_email, to_name: first, subject: "RE: documents demandés", body_html: toHtml(li.body) + AI_SIGNATURE, attachments: refs });
      const lt = await write("remerciement_vendeur", `Rédige un court mail de remerciement au vendeur : ses documents (${refs.map((x) => x.name).join(", ")}) ont bien été transmis à l'acquéreur potentiel.`);
      await admin.from("ai_drafts").insert({ request_id: r.id, kind: "remerciement_vendeur", reply_to_graph_id: mailsFrom[0]!.id, to_email: r.seller_email!, subject: `RE: ${lt.subject}`, body_html: toHtml(lt.body) + AI_SIGNATURE });
      await admin.from("ai_doc_requests").update({ status: "documents reçus" }).eq("id", r.id);
      forwarded += 1;
    }
    report["documents_recus_vendeur"] = forwarded;
  } catch (e) {
    report["ia_erreur"] = e instanceof BudgetReachedError ? "plafond atteint" : (e instanceof Error ? e.message : String(e)).slice(0, 200);
  }
  return report;
}

// Création du compte agent + envoi des accès (manuel, carte T, ou automatique après signature du contrat).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any;
export async function inviteAgentAccount(admin: Db, agentId: string, signed: boolean) {
  const { data: agent } = await admin.from("commercial_agents").select("*").eq("id", agentId).maybeSingle();
  if (!agent || agent.user_id) throw new Error("Fiche introuvable ou compte déjà créé");
  const { data: users, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 }); if (listError) throw listError;
  if (users.users.some((u: { email?: string }) => u.email?.toLowerCase() === agent.email.toLowerCase())) throw new Error("Un compte utilise déjà cet email ; aucun compte existant ne sera modifié.");
  const { data: invite, error } = await admin.auth.admin.generateLink({ type: "invite", email: agent.email, options: { redirectTo: "https://wallsbrokerage.com/reset-password" } });
  if (error || !invite.user || !invite.properties?.action_link) throw new Error(error?.message || "Invitation impossible");
  const { error: linkError } = await admin.from("commercial_agents").update({ user_id: invite.user.id }).eq("id", agent.id).is("user_id", null); if (linkError) throw linkError;
  const { error: roleError } = await admin.from("user_roles").insert({ user_id: invite.user.id, role: "broker" });
  if (roleError) throw new Error("Invitation créée mais rôle non attribué ; compte sans accès commercial.");
  const { agentInviteEmail } = await import("@/lib/agent-invite"); const { sendBrevoMail } = await import("@/lib/brevo.server");
  const mail = agentInviteEmail(agent.first_name, invite.properties.action_link, signed);
  let attachment = null;
  if (signed && agent.signed_contract_path) {
    const { data } = await admin.storage.from("agent-contracts").createSignedUrl(agent.signed_contract_path, 3600);
    if (data?.signedUrl) attachment = { name: `Contrat-cadre ${agent.first_name} ${agent.last_name}.pdf`, url: data.signedUrl };
  }
  await sendBrevoMail({ to: agent.email, toName: `${agent.first_name} ${agent.last_name}`, subject: mail.subject, html: mail.html, attachment });
  return { ok: true };
}
// Suit les contrats DocuSign ; dès qu'un contrat est signé par tous, ouvre le compte et envoie les accès.
export async function syncAgentContracts(admin: Db) {
  const { data: agents } = await admin.from("commercial_agents").select("id,envelope_id,signed_contract_path,user_id,signature_status").not("envelope_id", "is", null).neq("signature_status", "prêt à envoyer");
  const todo = (agents ?? []).filter((a: { signed_contract_path: string | null; user_id: string | null; signature_status: string | null }) => !a.signed_contract_path || !a.user_id || !["completed", "voided", "declined"].includes(a.signature_status ?? ""));
  if (!todo.length) return { updated: 0, invited: 0 };
  const { getDsAccess } = await import("@/lib/docusign.server"); const ds = await getDsAccess(); let updated = 0, invited = 0;
  for (const agent of todo.slice(0, 20)) {
    const r = await fetch(`${ds.api}/envelopes/${agent.envelope_id}`, { headers: { Authorization: `Bearer ${ds.token}` } }); if (!r.ok) throw new Error(`DocuSign : suivi indisponible (${r.status})`);
    const envelope = await r.json() as { status: string }; let path = agent.signed_contract_path;
    if (envelope.status === "completed" && !path) { const doc = await fetch(`${ds.api}/envelopes/${agent.envelope_id}/documents/combined`, { headers: { Authorization: `Bearer ${ds.token}` } }); if (!doc.ok) throw new Error("Contrat signé indisponible"); path = `agents/${agent.id}/signed-${agent.envelope_id}.pdf`; const { error } = await admin.storage.from("agent-contracts").upload(path, await doc.arrayBuffer(), { contentType: "application/pdf", upsert: true }); if (error) throw error; }
    const { error } = await admin.from("commercial_agents").update({ signature_status: envelope.status, signed_contract_path: path }).eq("id", agent.id); if (error) throw error; updated++;
    if (envelope.status === "completed" && !agent.user_id) { await inviteAgentAccount(admin, agent.id, true); invited++; }
  }
  return { updated, invited };
}

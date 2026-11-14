import { getAdmin } from "@/lib/automation.server";

export const DS_REDIRECT = "https://wallsbrokerage.com/api/public/docusign/callback";
export const dsAuthHost = (env: string) => (env === "demo" ? "https://account-d.docusign.com" : "https://account.docusign.com");

const basic = () => {
  const id = process.env["DOCUSIGN_INTEGRATION_KEY"] || process.env["DOCUSIGN_CLIENT_ID"];
  const secret = process.env["DOCUSIGN_SECRET_KEY"];
  if (!id || !secret) throw new Error("Clés DocuSign manquantes");
  return { id, header: "Basic " + btoa(`${id}:${secret}`) };
};
export const dsClientId = () => basic().id;

async function tokenCall(env: string, body: URLSearchParams) {
  const r = await fetch(`${dsAuthHost(env)}/oauth/token`, {
    method: "POST",
    headers: { Authorization: basic().header, "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`DocuSign [${r.status}] ${t}`);
  return JSON.parse(t) as { access_token: string; refresh_token: string; expires_in: number };
}

export async function exchangeCode(code: string, state: string) {
  const admin = await getAdmin();
  const { data: row } = await admin.from("docusign_auth").select("*").eq("id", true).maybeSingle();
  if (!row || !row.pending_state || row.pending_state !== state) throw new Error("Lien de connexion expiré");
  const tok = await tokenCall(row.env, new URLSearchParams({ grant_type: "authorization_code", code }));
  const ui = await fetch(`${dsAuthHost(row.env)}/oauth/userinfo`, { headers: { Authorization: `Bearer ${tok.access_token}` } });
  const info = (await ui.json()) as { email?: string; accounts?: { account_id: string; base_uri: string; is_default?: boolean }[] };
  const wanted = process.env["DOCUSIGN_ACCOUNT_ID"];
  const acc = info.accounts?.find((a) => a.account_id === wanted) ?? info.accounts?.find((a) => a.is_default) ?? info.accounts?.[0];
  if (!acc) throw new Error("Aucun compte DocuSign trouvé");
  await admin.from("docusign_auth").update({
    pending_state: null, access_token: tok.access_token, refresh_token: tok.refresh_token,
    expires_at: new Date(Date.now() + tok.expires_in * 1000).toISOString(),
    base_uri: acc.base_uri, account_id: acc.account_id, account_email: info.email ?? null,
    updated_at: new Date().toISOString(),
  }).eq("id", true);
}

/** Renvoie un accès valide (rafraîchi si besoin). */
export async function getDsAccess() {
  const admin = await getAdmin();
  const { data: row } = await admin.from("docusign_auth").select("*").eq("id", true).maybeSingle();
  if (!row?.refresh_token || !row.base_uri || !row.account_id) throw new Error("DocuSign n'est pas connecté (Paramètres)");
  let token = row.access_token!;
  if (!row.expires_at || new Date(row.expires_at).getTime() < Date.now() + 120_000) {
    const tok = await tokenCall(row.env, new URLSearchParams({ grant_type: "refresh_token", refresh_token: row.refresh_token }));
    token = tok.access_token;
    await admin.from("docusign_auth").update({
      access_token: tok.access_token, refresh_token: tok.refresh_token,
      expires_at: new Date(Date.now() + tok.expires_in * 1000).toISOString(), updated_at: new Date().toISOString(),
    }).eq("id", true);
  }
  return { api: `${row.base_uri}/restapi/v2.1/accounts/${row.account_id}`, token, email: row.account_email };
}

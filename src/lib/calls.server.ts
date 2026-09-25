// Enregistrements Cube ACR déposés sur Google Drive → transcription + extraction Gemini.
import { getAdmin } from "@/lib/automation.server";
import { SYSTEM, saveExtraction, type Extraction } from "@/lib/aiscan.server";
import { callGeminiPartsJson } from "@/lib/gemini.server";

const DRIVE = "https://connector-gateway.lovable.dev/google_drive/drive/v3";
const MAX_AUDIO = 18 * 1024 * 1024; // limite des données envoyées en une fois à Gemini
const AUDIO_MIME: Record<string, string> = {
  amr: "audio/amr", m4a: "audio/aac", aac: "audio/aac", mp3: "audio/mp3", ogg: "audio/ogg",
  opus: "audio/ogg", wav: "audio/wav", flac: "audio/flac", "3gp": "audio/3gpp",
};

const CALL_SYSTEM = `${SYSTEM}
Tu reçois l'enregistrement audio d'un appel téléphonique (ou WhatsApp) de David, courtier.
Ajoute à la racine du JSON :
- "transcript" : transcription fidèle en français, en indiquant "David :" / "Interlocuteur :" quand c'est identifiable ;
- "summary" : 3 à 6 phrases — qui, quel actif, montants, adresses, décisions ;
- "actions" : liste des choses à faire suite à l'appel (relances, documents à envoyer, rendez-vous), une par ligne.
Les coordonnées de l'interlocuteur citées dans l'appel vont dans "contacts".`;

type CallResult = Extraction & { transcript?: string; summary?: string; actions?: string | string[] };

function headers() {
  const lov = process.env["LOVABLE_API_KEY"];
  const drv = process.env["GOOGLE_DRIVE_API_KEY"];
  if (!lov || !drv) throw new Error("Connexion Google Drive absente.");
  return { Authorization: `Bearer ${lov}`, "X-Connection-Api-Key": drv };
}

async function driveList(q: string): Promise<{ id: string; name: string; mimeType: string; size?: string }[]> {
  const out: { id: string; name: string; mimeType: string; size?: string }[] = [];
  let pageToken: string | undefined;
  do {
    const p = new URLSearchParams({ q, fields: "nextPageToken,files(id,name,mimeType,size)", pageSize: "1000" });
    if (pageToken) p.set("pageToken", pageToken);
    const r = await fetch(`${DRIVE}/files?${p}`, { headers: headers() });
    if (!r.ok) throw new Error(`Drive [${r.status}] ${(await r.text()).slice(0, 300)}`);
    const j = (await r.json()) as { files?: typeof out; nextPageToken?: string };
    out.push(...(j.files ?? []));
    pageToken = j.nextPageToken;
  } while (pageToken);
  return out;
}

/** « Nom (+33 6…) ↗ (phone) 2026-09-25 09-17-59.amr » → métadonnées. */
export function parseName(name: string) {
  const base = name.replace(/\.[a-z0-9]+$/i, "");
  const m = /^(.*?)\s*(↗|↙)?\s*\((phone|whatsapp|[a-z ]+)\)\s*(\d{4}-\d{2}-\d{2}) (\d{2})-(\d{2})-(\d{2})$/i.exec(base);
  if (!m) return { contact_name: base, phone: null, channel: null, direction: null, called_at: null };
  let who = m[1]!.trim();
  let phone: string | null = null;
  const ph = /^(.*?)\s*\((\+?[\d\s]{6,})\)$/.exec(who);
  if (ph) { who = ph[1]!.trim(); phone = ph[2]!.trim(); }
  else if (/^\+?[\d\s]{6,}$/.test(who)) { phone = who; who = ""; }
  // Cube ACR nomme les fichiers à l'heure de Paris (UTC+2 l'été, +1 l'hiver).
  const month = Number(m[4]!.slice(5, 7));
  const off = month >= 4 && month <= 10 ? "+02:00" : "+01:00";
  return {
    contact_name: who || null,
    phone,
    channel: m[3]!.toLowerCase(),
    direction: m[2] === "↗" ? "sortant" : m[2] === "↙" ? "entrant" : null,
    called_at: new Date(`${m[4]}T${m[5]}:${m[6]}:${m[7]}${off}`).toISOString(),
  };
}

/** Recense les nouveaux fichiers audio du dossier « Cube ACR » (et sous-dossiers par jour). */
export async function discoverCalls(): Promise<number> {
  const admin = await getAdmin();
  const roots = await driveList("name='Cube ACR' and mimeType='application/vnd.google-apps.folder' and trashed=false");
  const folders = [...roots.map((f) => f.id)];
  for (const r of roots) {
    const subs = await driveList(`'${r.id}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`);
    folders.push(...subs.map((s) => s.id));
  }
  let added = 0;
  for (const fid of folders) {
    const files = (await driveList(`'${fid}' in parents and trashed=false`)).filter((f) => f.mimeType.startsWith("audio/") || /\.(amr|m4a|aac|mp3|ogg|opus|wav|3gp)$/i.test(f.name));
    if (!files.length) continue;
    const { data: known } = await admin.from("call_recordings").select("drive_file_id").in("drive_file_id", files.map((f) => f.id));
    const seen = new Set((known ?? []).map((k) => k.drive_file_id));
    const rows = files.filter((f) => !seen.has(f.id)).map((f) => ({ drive_file_id: f.id, file_name: f.name, size: Number(f.size ?? 0), ...parseName(f.name) }));
    if (rows.length) {
      await admin.from("call_recordings").upsert(rows, { onConflict: "drive_file_id", ignoreDuplicates: true });
      added += rows.length;
    }
  }
  return added;
}

const b64 = (buf: ArrayBuffer) => {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
};

/** Transcrit et analyse un appel. Relance l'erreur Gemini bloquante (crédit, plafond) à l'appelant. */
export async function processCall(id: string): Promise<void> {
  const admin = await getAdmin();
  const { data: row } = await admin.from("call_recordings").select("*").eq("id", id).single();
  if (!row) return;
  if (row.size && row.size > MAX_AUDIO) {
    await admin.from("call_recordings").update({ status: "ignoré", error: "Enregistrement trop long pour être analysé en une fois." }).eq("id", id);
    return;
  }
  await admin.from("call_recordings").update({ status: "en cours", error: null }).eq("id", id);
  const r = await fetch(`${DRIVE}/files/${row.drive_file_id}?alt=media`, { headers: headers() });
  if (!r.ok) {
    await admin.from("call_recordings").update({ status: "erreur", error: `Drive [${r.status}]` }).eq("id", id);
    return;
  }
  const ext = row.file_name.split(".").pop()?.toLowerCase() ?? "amr";
  const who = [row.contact_name, row.phone].filter(Boolean).join(" ");
  const ex =
    (await callGeminiPartsJson<CallResult>({
      task: "appel",
      system: CALL_SYSTEM,
      parts: [
        { inlineData: { mimeType: AUDIO_MIME[ext] ?? "audio/amr", data: b64(await r.arrayBuffer()) } },
        { text: `Appel ${row.direction ?? ""} ${row.channel ?? ""} avec ${who || "un correspondant inconnu"}, le ${row.called_at ?? ""}.` },
      ],
    })) ?? {};
  const saved = await saveExtraction(admin, ex, `call:${row.drive_file_id}`, row.called_at ?? new Date().toISOString());
  const actions = Array.isArray(ex.actions) ? ex.actions.join("\n") : ex.actions ?? null;
  await admin
    .from("call_recordings")
    .update({
      status: "analysé",
      transcript: ex.transcript?.slice(0, 60_000) ?? null,
      summary: ex.summary?.slice(0, 3000) ?? null,
      actions: actions?.slice(0, 3000) ?? null,
      found_contacts: saved.contacts,
      found_comparables: saved.comparables,
      found_news: saved.news,
    })
    .eq("id", id);
}

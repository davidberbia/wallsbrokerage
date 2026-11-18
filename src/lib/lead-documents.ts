export type RequestStatus = "prepared" | "waiting" | "sending" | "reminded" | "received" | "cancelled" | "error";
export type LeadRequest = { id: string; deal_id: string; status: string; sent_at: string | null; due_at: string | null; reminded_at: string | null; received_at: string | null; subject: string; body_text: string; to_email: string; created_by: string; error: string | null; created_at: string };

export function parisWeekend(date: Date) {
  const day = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Paris", weekday: "short" }).format(date);
  return day === "Sat" || day === "Sun";
}

/** Three elapsed calendar days; advance weekend deadlines while retaining Paris wall time across DST. */
export function leadReminderDue(sent: Date): Date {
  const parts = (d: Date) => Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(d).map(p => [p.type, p.value]));
  const p = parts(sent);
  const target = new Date(Date.UTC(Number(p["year"]), Number(p["month"]) - 1, Number(p["day"]) + 3, Number(p["hour"]), Number(p["minute"]), Number(p["second"])));
  const fromWall = (wall: Date) => {
    let candidate = new Date(wall);
    for (let i = 0; i < 3; i++) {
      const c = parts(candidate);
      const current = Date.UTC(Number(c["year"]), Number(c["month"]) - 1, Number(c["day"]), Number(c["hour"]), Number(c["minute"]), Number(c["second"]));
      candidate = new Date(candidate.getTime() + wall.getTime() - current);
    }
    return candidate;
  };
  let due = fromWall(target);
  while (parisWeekend(due)) { target.setUTCDate(target.getUTCDate() + 1); due = fromWall(target); }
  return due;
}

export function canRemind(request: { status: string; due_at: string | null; received_at: string | null; reminded_at: string | null }, now: Date, active: boolean) {
  return active && request.status === "waiting" && !request.received_at && !request.reminded_at && !!request.due_at && new Date(request.due_at).getTime() <= now.getTime() && !parisWeekend(now);
}

export function leadViewStatus(status: string, request?: Pick<LeadRequest, "status">) {
  if (status === "archived") return "archived";
  if (request?.status === "reminded" || request?.status === "error") return "recall";
  if (request?.status === "waiting" || request?.status === "sending") return "waiting";
  return status;
}

export type MissingAsset = { asset_class?: string | null; price?: number | null; surface?: number | null; rent?: number | null; keys_count?: number | null; hotel_category?: string | null };
export function missingLeadItems(asset: MissingAsset, names: string[], evidence: string) {
  const normalized = `${names.join("\n")}\n${evidence}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const docs = names.join("\n").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const missing: string[] = [];
  if (!/\bplan|cadastre/.test(docs)) missing.push("Plans");
  if (!/photo|image|\.(jpe?g|png|webp|heic)\b/.test(docs)) missing.push("Photos");
  const occupied = !/\blibre|vacant|sans locataire/.test(normalized) && ((asset.rent ?? 0) > 0 || /loue|occupe|locataire|etat locatif|bail commercial/.test(normalized));
  if (occupied) {
    if (!/\bbail|\bbaux/.test(docs)) missing.push("Bail");
    if (!/etat[ _-]*locatif|rent[ _-]*roll/.test(docs)) missing.push("État locatif");
    if (!/decompte|charges/.test(docs)) missing.push("Décompte de charges");
    if (!/taxe[ _-]*fonciere|avis[ _-]*foncier/.test(docs)) missing.push("Taxe foncière");
    if (asset.rent == null) missing.push("Loyer annuel");
  }
  if (asset.price == null) missing.push("Prix");
  if (asset.surface == null) missing.push("Surface");
  if (/hotel|hôtel/i.test(asset.asset_class ?? "")) {
    if (asset.keys_count == null) missing.push("Nombre de clés / chambres");
    if (!asset.hotel_category) missing.push("Catégorie de l’hôtel");
  }
  return missing;
}

export function documentMail(name: string, items: string[], reminder = false) {
  return {
    subject: reminder ? `[Relancé auto] Votre dossier : ${name}` : `Votre dossier : ${name} — Éléments complémentaires`,
    body: `Bonjour,\n\n${reminder ? "Je me permets de vous relancer concernant les éléments complémentaires demandés pour votre dossier" : "Afin de poursuivre l’étude de votre dossier"} « ${name} », pourriez-vous me transmettre les éléments suivants ?\n\n${items.map(item => `• ${item}`).join("\n")}\n\nJe vous remercie par avance pour votre retour.\n\nBien cordialement,`,
  };
}
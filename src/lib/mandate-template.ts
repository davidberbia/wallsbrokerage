// Rendu des modèles de mandats : champs {{clé}}, titres "#"/"##", **texte très apparent**.
export function addOneYear(iso: string): string {
  const [y = 0, m = 1, d = 1] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y + 1, m - 1, d));
  if (dt.getUTCMonth() !== m - 1) dt.setUTCDate(0); // 29 février → 28 février
  return dt.toISOString().slice(0, 10);
}

export function fillTemplate(body: string, values: Record<string, string | null | undefined>): string {
  return body.replace(/\{\{(\w+)\}\}/g, (all, k: string) => {
    const v = values[k];
    return v && v.trim() ? v : all;
  });
}

export function templateFields(body: string): string[] {
  return [...new Set([...body.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1] ?? ""))];
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function templateToHtml(body: string, title: string): string {
  const html = body
    .split(/\n{2,}/)
    .map((block) => {
      const b = block.trim();
      if (!b) return "";
      if (b === "---") return '<hr style="page-break-after:always">';
      if (b.startsWith("# ")) return `<h1>${esc(b.slice(2))}</h1>`;
      if (b.startsWith("## ")) return `<h2>${esc(b.slice(3))}</h2>`;
      let t = esc(b).replace(/\*\*([\s\S]+?)\*\*/g, '<strong style="font-size:1.05em">$1</strong>');
      t = t.replace(/\{\{(\w+)\}\}/g, '<span style="background:#fff3a8">[$1]</span>');
      return `<p>${t.replace(/\n/g, "<br>")}</p>`;
    })
    .join("\n");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>body{font-family:Georgia,serif;font-size:11pt;line-height:1.45;max-width:720px;margin:24px auto;padding:0 16px}h1{text-align:center;font-size:16pt}h2{font-size:12pt;margin-top:18px}</style></head><body>${html}</body></html>`;
}

/** Index de la meilleure photo de couverture : paysage en priorité, puis plus grande résolution. */
export function pickMainPhoto(dims: { w: number; h: number }[]): number {
  let best = -1, score = -1;
  dims.forEach(({ w, h }, i) => {
    const s = (w > h ? 1e12 : 0) + w * h;
    if (s > score) { score = s; best = i; }
  });
  return best;
}

export async function imageSize(file: File): Promise<{ w: number; h: number }> {
  try { const b = await createImageBitmap(file); const r = { w: b.width, h: b.height }; b.close(); return r; }
  catch { return { w: 0, h: 0 }; }
}

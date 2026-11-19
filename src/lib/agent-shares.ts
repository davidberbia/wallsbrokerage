/** Partage des honoraires encaissés d'un agent co entre Wallsbroker, David et Ladislas. */
export type ShareAgent = { isWallsbroker: boolean; quoteAgent: number; broughtByLadislas: boolean };
export function agentShares(ca: number, a: ShareAgent) {
  if (a.isWallsbroker) return { wallsbroker: ca, david: 0, ladislas: 0 };
  const wallsbroker = (ca * (100 - (a.quoteAgent || 0))) / 100;
  return a.broughtByLadislas
    ? { wallsbroker, david: wallsbroker / 2, ladislas: wallsbroker / 2 }
    : { wallsbroker, david: wallsbroker, ladislas: 0 };
}

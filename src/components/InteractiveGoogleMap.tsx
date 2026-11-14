// @ts-nocheck — code repris tel quel du Générateur de brochures (vérifié sous sa configuration TypeScript d'origine).
import { useRef, useState } from "react";

export type InteractiveMapValue = { lat: number; lng: number; zoom: number; pinOffset?: { x: number; y: number } };

type Props = {
  address: string;
  value: InteractiveMapValue | null;
  previewMedia?: { dataUrl: string; name?: string } | null;
  errorMessage?: string;
  defaultZoom: number;
  mapType: "roadmap" | "hybrid" | "satellite" | "terrain";
  onChange: (v: InteractiveMapValue) => void;
  onCommit?: (v: InteractiveMapValue) => void;
  height?: number;
  /** Ratio largeur/hauteur pour reproduire exactement le cadrage du PPTX. */
  aspectRatio?: number;
  labels?: Array<{ name: string; lat: number; lng: number }>;
};

const TILE_SIZE = 256;

function project({ lat, lng }: { lat: number; lng: number }, zoom: number) {
  const scale = TILE_SIZE * 2 ** zoom;
  const siny = Math.min(Math.max(Math.sin((lat * Math.PI) / 180), -0.9999), 0.9999);
  return {
    x: ((lng + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + siny) / (1 - siny)) / (4 * Math.PI)) * scale,
  };
}

function unproject({ x, y }: { x: number; y: number }, zoom: number): { lat: number; lng: number } {
  const scale = TILE_SIZE * 2 ** zoom;
  const lng = (x / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / scale;
  const lat = (180 / Math.PI) * Math.atan(Math.sinh(n));
  return { lat, lng };
}

function shiftPoint(value: InteractiveMapValue, dx: number, dy: number): InteractiveMapValue {
  const p = project(value, value.zoom);
  const next = unproject({ x: p.x + dx, y: p.y + dy }, value.zoom);
  return { ...value, ...next, zoom: value.zoom };
}

export function InteractiveGoogleMap({
  address, value, previewMedia, errorMessage, defaultZoom, mapType, onChange, onCommit, height = 320, aspectRatio, labels = [],
}: Props) {
  const mapDragRef = useRef<{ pointerId: number; startX: number; startY: number; dx: number; dy: number; moved: boolean } | null>(null);
  const pinDragRef = useRef<{ pointerId: number; startX: number; startY: number; baseX: number; baseY: number } | null>(null);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [pinOffset, setPinOffset] = useState<{ x: number; y: number }>(value?.pinOffset ?? { x: 0, y: 0 });

  // Keep local pin offset in sync when value changes externally.
  const lastValueRef = useRef(value);
  if (value !== lastValueRef.current) {
    lastValueRef.current = value;
    setPinOffset(value?.pinOffset ?? { x: 0, y: 0 });
  }

  const commitMap = (next: InteractiveMapValue) => {
    setPanOffset({ x: 0, y: 0 });
    onChange(next);
    onCommit?.(next);
  };

  const commitPan = (dx: number, dy: number) => {
    if (!value) return;
    commitMap(shiftPoint(value, -dx, -dy));
  };

  const commitPin = (offset: { x: number; y: number }) => {
    if (!value) return;
    const next = { ...value, pinOffset: offset };
    onChange(next);
    onCommit?.(next);
  };

  const zoomBy = (delta: number) => {
    if (!value) return;
    const zoom = Math.max(3, Math.min(20, (value.zoom || defaultZoom) + delta));
    commitMap({ ...value, zoom });
  };

  if (!value) return <div className="text-xs text-slate-400">Renseignez l'adresse au point 1 pour afficher la carte.</div>;

  return (
    <div className="space-y-1">
      <div
        style={aspectRatio ? { aspectRatio: String(aspectRatio), touchAction: "none" } : { height, touchAction: "none" }}
        className="relative w-full select-none overflow-hidden rounded-md border-2 border-orange-500 bg-slate-950 cursor-grab active:cursor-grabbing"
        data-map-type={mapType}
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest("button")) return;
          if ((e.target as HTMLElement).closest("[data-pin]")) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          mapDragRef.current = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, dx: 0, dy: 0, moved: false };
        }}
        onPointerMove={(e) => {
          const drag = mapDragRef.current;
          if (!drag || drag.pointerId !== e.pointerId) return;
          drag.dx = e.clientX - drag.startX;
          drag.dy = e.clientY - drag.startY;
          if (Math.abs(drag.dx) > 2 || Math.abs(drag.dy) > 2) drag.moved = true;
          setPanOffset({ x: drag.dx, y: drag.dy });
        }}
        onPointerUp={(e) => {
          const drag = mapDragRef.current;
          if (!drag || drag.pointerId !== e.pointerId) return;
          mapDragRef.current = null;
          if (drag.moved) commitPan(drag.dx, drag.dy);
          else setPanOffset({ x: 0, y: 0 });
        }}
        onPointerCancel={() => { mapDragRef.current = null; setPanOffset({ x: 0, y: 0 }); }}
      >
        {previewMedia?.dataUrl ? (
          <img
            src={previewMedia.dataUrl}
            alt={`Carte Google Maps ${address}`}
            className="h-full w-full object-cover"
            draggable={false}
            style={{ transform: `translate(${panOffset.x}px, ${panOffset.y}px)` }}
          />
        ) : errorMessage ? (
          <div className="flex h-full w-full items-center justify-center px-6 text-center text-xs text-red-300">
            {errorMessage}
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center px-4 text-center text-xs text-slate-400">
            Génération de la carte Google Maps…
          </div>
        )}
        {previewMedia?.dataUrl && (
          labels.slice(0, 36).map((label, index) => {
            const centerPx = project(value, value.zoom);
            const labelPx = project(label, value.zoom);
            const referenceAspect = aspectRatio || 1.28;
            const xPct = 50 + ((labelPx.x - centerPx.x) / (1000 * referenceAspect)) * 100;
            const yPct = 50 + ((labelPx.y - centerPx.y) / 1000) * 100;
            if (xPct < -5 || xPct > 105 || yPct < -5 || yPct > 105) return null;
            return (
              <div
                key={`${label.name}-${index}`}
                className="pointer-events-none absolute z-10 max-w-[150px] truncate rounded border border-slate-300 bg-white/95 px-1.5 py-0.5 text-[10px] font-semibold leading-tight text-slate-900 shadow"
                style={{ left: `calc(${xPct}% + ${panOffset.x}px)`, top: `calc(${yPct}% + ${panOffset.y}px)`, transform: "translate(-50%, -50%)" }}
                title={label.name}
              >
                {label.name}
              </div>
            );
          })
        )}
        {previewMedia?.dataUrl && (
          <div
            data-pin
            role="button"
            aria-label="Déplacer le pin"
            className="absolute left-1/2 top-1/2 z-10 h-12 w-12 cursor-grab active:cursor-grabbing"
            style={{ transform: `translate(calc(-50% + ${pinOffset.x + panOffset.x}px), calc(-100% + ${pinOffset.y + panOffset.y}px))`, touchAction: "none" }}
            onPointerDown={(e) => {
              e.stopPropagation();
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              pinDragRef.current = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, baseX: pinOffset.x, baseY: pinOffset.y };
            }}
            onPointerMove={(e) => {
              const drag = pinDragRef.current;
              if (!drag || drag.pointerId !== e.pointerId) return;
              setPinOffset({ x: drag.baseX + (e.clientX - drag.startX), y: drag.baseY + (e.clientY - drag.startY) });
            }}
            onPointerUp={(e) => {
              const drag = pinDragRef.current;
              if (!drag || drag.pointerId !== e.pointerId) return;
              pinDragRef.current = null;
              const next = { x: drag.baseX + (e.clientX - drag.startX), y: drag.baseY + (e.clientY - drag.startY) };
              setPinOffset(next);
              commitPin(next);
            }}
            onPointerCancel={() => { pinDragRef.current = null; }}
          >
            <svg viewBox="0 0 48 48" className="h-full w-full drop-shadow-lg pointer-events-none" aria-hidden="true">
              <path d="M24 3C14.6 3 7 10.6 7 20c0 12.8 17 25 17 25s17-12.2 17-25C41 10.6 33.4 3 24 3Z" fill="#f97316" stroke="#ffffff" strokeWidth="3" />
              <circle cx="24" cy="20" r="6" fill="#ffffff" />
            </svg>
          </div>
        )}
        <div className="absolute right-2 top-2 z-20 flex flex-col overflow-hidden rounded border border-slate-300 bg-white text-slate-900 shadow">
          <button type="button" className="h-8 w-8 text-lg font-semibold leading-none hover:bg-slate-100" onClick={(e) => { e.stopPropagation(); zoomBy(1); }}>+</button>
          <button type="button" className="h-8 w-8 border-t border-slate-300 text-lg font-semibold leading-none hover:bg-slate-100" onClick={(e) => { e.stopPropagation(); zoomBy(-1); }}>−</button>
        </div>
      </div>
      <p className="text-[10px] text-slate-400">
        Adresse : {address || "—"} · Glissez la carte pour la déplacer, glissez le pin pour le repositionner, zoomez avec + / −.
      </p>
    </div>
  );
}

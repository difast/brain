"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n";

const VIEW = 240; // crop viewport, px
const OUTPUT = 256; // exported avatar size, px

interface Props {
  file: File;
  onCancel: () => void;
  onSave: (dataUrl: string) => void;
}

/** Drag-to-reposition, zoom-to-scale square photo cropper (no dependencies). */
export function AvatarCropper({ file, onCancel, onSave }: Props) {
  const { t } = useT();
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [baseScale, setBaseScale] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number; px: number; py: number } | null>(
    null,
  );

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const el = new Image();
    el.onload = () => {
      const scale = VIEW / Math.min(el.naturalWidth, el.naturalHeight);
      setBaseScale(scale);
      setPos({
        x: (VIEW - el.naturalWidth * scale) / 2,
        y: (VIEW - el.naturalHeight * scale) / 2,
      });
      setImg(el);
    };
    el.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function clamp(next: { x: number; y: number }, s: number) {
    if (!img) return next;
    const w = img.naturalWidth * s;
    const h = img.naturalHeight * s;
    return {
      x: Math.min(0, Math.max(VIEW - w, next.x)),
      y: Math.min(0, Math.max(VIEW - h, next.y)),
    };
  }

  function onPointerDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y };
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return;
    const d = dragRef.current;
    const s = baseScale * zoom;
    setPos(
      clamp({ x: d.px + (e.clientX - d.x), y: d.py + (e.clientY - d.y) }, s),
    );
  }

  function onPointerUp() {
    dragRef.current = null;
  }

  function onZoom(next: number) {
    const s = baseScale * next;
    setZoom(next);
    setPos((p) => clamp(p, s));
  }

  function save() {
    if (!img) return;
    const s = baseScale * zoom;
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT;
    canvas.height = OUTPUT;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const sourceX = -pos.x / s;
    const sourceY = -pos.y / s;
    const sourceSize = VIEW / s;
    ctx.drawImage(
      img,
      sourceX,
      sourceY,
      sourceSize,
      sourceSize,
      0,
      0,
      OUTPUT,
      OUTPUT,
    );
    onSave(canvas.toDataURL("image/jpeg", 0.85));
  }

  const s = baseScale * zoom;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">{t("account.cropTitle")}</h3>
        <p className="modal-body">{t("account.cropHint")}</p>

        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          style={{
            width: VIEW,
            height: VIEW,
            margin: "16px auto 0",
            borderRadius: "50%",
            overflow: "hidden",
            position: "relative",
            background: "var(--panel-2)",
            border: "1px solid var(--border)",
            cursor: img ? "grab" : "default",
            touchAction: "none",
          }}
        >
          {img && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={img.src}
              alt=""
              draggable={false}
              style={{
                position: "absolute",
                left: pos.x,
                top: pos.y,
                width: img.naturalWidth * s,
                height: img.naturalHeight * s,
                maxWidth: "none",
                userSelect: "none",
                pointerEvents: "none",
              }}
            />
          )}
        </div>

        <input
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          onChange={(e) => onZoom(Number(e.target.value))}
          disabled={!img}
          style={{ width: "100%", marginTop: 14 }}
          aria-label={t("account.cropZoom")}
        />

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onCancel}>
            {t("common.cancel")}
          </button>
          <button onClick={save} disabled={!img}>
            {t("account.cropSave")}
          </button>
        </div>
      </div>
    </div>
  );
}

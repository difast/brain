"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { API_BASE } from "@/lib/api";
import { useT } from "@/lib/i18n";

/* ---------------- Toasts ---------------- */

type ToastKind = "success" | "error";
type Toast = { id: number; message: string; kind: ToastKind };

type ConfirmOpts = {
  title: string;
  body?: string;
  confirmLabel?: string;
  danger?: boolean;
};

type FeedbackCtx = {
  toast: (message: string, kind?: ToastKind) => void;
  confirm: (opts: ConfirmOpts) => Promise<boolean>;
};

const Ctx = createContext<FeedbackCtx | null>(null);

export function useFeedback(): FeedbackCtx {
  const ctx = useContext(Ctx);
  if (!ctx) return { toast: () => {}, confirm: async () => false };
  return ctx;
}

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const { t } = useT();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(1);
  const [dialog, setDialog] = useState<
    (ConfirmOpts & { resolve: (v: boolean) => void }) | null
  >(null);

  const toast = useCallback((message: string, kind: ToastKind = "success") => {
    const id = idRef.current++;
    setToasts((ts) => [...ts, { id, message, kind }]);
    setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== id)), 3200);
  }, []);

  const confirm = useCallback((opts: ConfirmOpts) => {
    return new Promise<boolean>((resolve) => setDialog({ ...opts, resolve }));
  }, []);

  function close(v: boolean) {
    dialog?.resolve(v);
    setDialog(null);
  }

  return (
    <Ctx.Provider value={{ toast, confirm }}>
      {children}

      <div className="toast-wrap" aria-live="polite">
        {toasts.map((tst) => (
          <div key={tst.id} className={`toast ${tst.kind}`}>
            {tst.message}
          </div>
        ))}
      </div>

      {dialog && (
        <div className="modal-overlay" onClick={() => close(false)}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="modal-title">{dialog.title}</h3>
            {dialog.body && <p className="modal-body">{dialog.body}</p>}
            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => close(false)}
                autoFocus
              >
                {t("common.cancel")}
              </button>
              <button
                className={dialog.danger ? "btn-danger" : ""}
                onClick={() => close(true)}
              >
                {dialog.confirmLabel ?? t("confirm.confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}

/* ---------------- Offline banner ---------------- */

export function ApiStatusBanner() {
  const { t } = useT();
  const [down, setDown] = useState(false);

  useEffect(() => {
    let active = true;
    async function check() {
      try {
        const res = await fetch(`${API_BASE}/health`, { cache: "no-store" });
        if (active) setDown(!res.ok);
      } catch {
        if (active) setDown(true);
      }
    }
    check();
    const id = setInterval(check, 8000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  if (!down) return null;
  return <div className="offline-banner">{t("banner.offline")}</div>;
}

/* ---------------- Empty state ---------------- */

export function EmptyState({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <svg width="40" height="40" viewBox="0 0 48 48" fill="none" aria-hidden>
        <rect
          x="7"
          y="11"
          width="34"
          height="26"
          rx="4"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path d="M7 19h34" stroke="currentColor" strokeWidth="2" />
        <circle cx="12" cy="15" r="1.2" fill="currentColor" />
        <circle cx="16" cy="15" r="1.2" fill="currentColor" />
      </svg>
      <div className="empty-state-title">{title}</div>
      {action}
    </div>
  );
}

/* ---------------- Skeleton table rows ---------------- */

export function SkeletonRows({ cols, rows = 4 }: { cols: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r}>
          {Array.from({ length: cols }).map((__, c) => (
            <td key={c}>
              <span className="skeleton" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

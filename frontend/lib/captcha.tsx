"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { API_BASE } from "@/lib/api";

// Client-side sitekey for Yandex SmartCaptcha. Read from NEXT_PUBLIC (baked at
// build time) first; if absent, fetched from the backend at runtime so the
// widget works without a frontend rebuild. When it resolves empty the captcha
// is disabled and login proceeds without it.
const ENV_SITE_KEY = process.env.NEXT_PUBLIC_YANDEX_CAPTCHA_SITE_KEY ?? "";

const SCRIPT_SRC = "https://smartcaptcha.yandexcloud.net/captcha.js";

interface SmartCaptcha {
  render: (container: HTMLElement, params: Record<string, unknown>) => number;
  execute: (widgetId?: number) => void;
  reset: (widgetId?: number) => void;
  destroy: (widgetId?: number) => void;
  subscribe: (
    widgetId: number,
    event: string,
    callback: (...args: unknown[]) => void,
  ) => () => void;
}

declare global {
  interface Window {
    smartCaptcha?: SmartCaptcha;
  }
}

let scriptPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.smartCaptcha) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${SCRIPT_SRC}"]`,
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("captcha")));
      if (window.smartCaptcha) resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("captcha script failed"));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

async function resolveSiteKey(): Promise<string> {
  if (ENV_SITE_KEY) return ENV_SITE_KEY;
  try {
    const res = await fetch(`${API_BASE}/auth/config`, { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as { captcha_site_key?: string };
      return data.captcha_site_key ?? "";
    }
  } catch {
    /* backend unreachable — treat captcha as disabled */
  }
  return "";
}

/**
 * Visible Yandex SmartCaptcha. Renders the widget into `containerRef`; when the
 * user passes it, `token` holds the one-time answer to send with login. When no
 * sitekey resolves, `enabled` is false and login proceeds without a captcha.
 */
export function useSmartCaptcha() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<number | null>(null);
  const [siteKey, setSiteKey] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Resolve the sitekey once (build-time env, else backend at runtime).
  useEffect(() => {
    let active = true;
    resolveSiteKey().then((k) => active && setSiteKey(k));
    return () => {
      active = false;
    };
  }, []);

  // Render the widget once the key + container are ready.
  useEffect(() => {
    if (!siteKey) return;
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !window.smartCaptcha || !containerRef.current) return;
        if (widgetIdRef.current !== null) return;
        const id = window.smartCaptcha.render(containerRef.current, {
          sitekey: siteKey,
          hl: "ru",
          callback: (t: string) => setToken(t),
        });
        widgetIdRef.current = id;
        window.smartCaptcha.subscribe(id, "token-expired", () =>
          setToken(null),
        );
      })
      .catch(() => {
        /* script blocked — login falls back to no captcha */
      });
    return () => {
      cancelled = true;
      if (widgetIdRef.current !== null) {
        window.smartCaptcha?.destroy(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [siteKey]);

  const reset = useCallback(() => {
    setToken(null);
    if (widgetIdRef.current !== null) window.smartCaptcha?.reset(widgetIdRef.current);
  }, []);

  // `enabled` is unknown until the key resolves; treat null as "still deciding".
  const enabled = siteKey === null ? undefined : !!siteKey;
  return { enabled, token, containerRef, reset };
}

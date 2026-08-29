"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Client-side sitekey for Yandex SmartCaptcha. When unset, the captcha is
// disabled and login proceeds without it (matches the backend, which only
// enforces the check when its server key is configured).
export const CAPTCHA_SITE_KEY =
  process.env.NEXT_PUBLIC_YANDEX_CAPTCHA_SITE_KEY ?? "";

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

/**
 * Invisible Yandex SmartCaptcha. `execute()` triggers the check (showing a
 * challenge popup when needed) and resolves with a one-time token, or rejects
 * if the user dismisses the challenge. When no sitekey is configured it is a
 * no-op that resolves `null`, so local/dev login keeps working.
 */
export function useSmartCaptcha() {
  const enabled = !!CAPTCHA_SITE_KEY;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<number | null>(null);
  const pendingRef = useRef<{
    resolve: (t: string | null) => void;
    reject: (e: Error) => void;
  } | null>(null);
  const [ready, setReady] = useState(!enabled);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !window.smartCaptcha || !containerRef.current) return;
        if (widgetIdRef.current !== null) return;
        const id = window.smartCaptcha.render(containerRef.current, {
          sitekey: CAPTCHA_SITE_KEY,
          invisible: true,
          hideShield: true,
          callback: (token: string) => {
            pendingRef.current?.resolve(token);
            pendingRef.current = null;
            window.smartCaptcha?.reset(id);
          },
        });
        widgetIdRef.current = id;
        // Fired when the challenge popup closes — if nothing resolved it, the
        // user cancelled.
        window.smartCaptcha.subscribe(id, "challenge-hidden", () => {
          if (pendingRef.current) {
            pendingRef.current.reject(new Error("captcha-cancelled"));
            pendingRef.current = null;
          }
        });
        setReady(true);
      })
      .catch(() => {
        // Script blocked/unavailable — surface as ready so the button isn't
        // stuck; execute() will reject and the UI shows an error.
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
      if (widgetIdRef.current !== null) {
        window.smartCaptcha?.destroy(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [enabled]);

  const execute = useCallback((): Promise<string | null> => {
    if (!enabled) return Promise.resolve(null);
    if (!window.smartCaptcha || widgetIdRef.current === null) {
      return Promise.reject(new Error("captcha not ready"));
    }
    return new Promise<string | null>((resolve, reject) => {
      pendingRef.current = { resolve, reject };
      window.smartCaptcha!.execute(widgetIdRef.current!);
    });
  }, [enabled]);

  return { enabled, ready, execute, containerRef };
}

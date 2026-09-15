"use client";

/**
 * The consent screen for an MCP connector.
 *
 * It lives in the dashboard rather than in the API for one concrete reason:
 * the session token sits in this origin's localStorage, and the API — on
 * another origin — cannot read it. So the API validates the OAuth request,
 * bounces the browser here, and this page attaches the token to the approval
 * call. The decision is still enforced server-side; this is the surface, not
 * the guard.
 */

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { API_BASE } from "@/lib/api";
import { Spinner } from "@/components/ui";

/** The API origin, without the /api/v1 the dashboard client appends. */
const API_ORIGIN = API_BASE.replace(/\/api\/v\d+\/?$/, "");

const TOKEN_KEY = "mevratek.token";

/** Everything the API forwarded, passed straight back on approval. */
const FIELDS = [
  "client_id",
  "redirect_uri",
  "scope",
  "state",
  "code_challenge",
  "code_challenge_method",
  "resource",
] as const;

function AuthorizeInner() {
  const params = useSearchParams();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  const clientName = params.get("client_name") || "Приложение";
  const redirectUri = params.get("redirect_uri") || "";

  useEffect(() => {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) {
      // Not signed in. Come back to this exact request afterwards, so the
      // connector's flow is not lost to the login detour.
      const next = `${window.location.pathname}${window.location.search}`;
      router.replace(`/login?next=${encodeURIComponent(next)}`);
      return;
    }
    setChecked(true);
  }, [router]);

  async function approve() {
    setBusy(true);
    setError(null);
    const token = window.localStorage.getItem(TOKEN_KEY);
    const body: Record<string, string> = {};
    for (const field of FIELDS) body[field] = params.get(field) ?? "";

    try {
      const res = await fetch(`${API_ORIGIN}/oauth/authorize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error_description || data?.message || "Не удалось выдать доступ.");
        setBusy(false);
        return;
      }
      // Hand the browser back to the connector with the code.
      window.location.href = data.redirect_to;
    } catch {
      setError("Сервер недоступен. Попробуйте ещё раз.");
      setBusy(false);
    }
  }

  function deny() {
    if (!redirectUri) {
      router.replace("/");
      return;
    }
    const separator = redirectUri.includes("?") ? "&" : "?";
    const state = params.get("state");
    const query = new URLSearchParams({ error: "access_denied" });
    if (state) query.set("state", state);
    window.location.href = `${redirectUri}${separator}${query.toString()}`;
  }

  if (!checked) {
    return (
      <main className="container">
        <Spinner />
      </main>
    );
  }

  let host = redirectUri;
  try {
    host = new URL(redirectUri).host || redirectUri;
  } catch {
    /* A custom scheme (claudeai://…) has no host; show it as given. */
  }

  return (
    <main className="container" style={{ maxWidth: 560 }}>
      <h1>Доступ для {clientName}</h1>
      <p className="sub">
        Приложение запрашивает доступ к вашей организации в Mevratek.
      </p>

      <div className="panel">
        <div className="kpi-label">Что приложение сможет</div>
        <ul style={{ marginTop: 10, paddingLeft: 20, lineHeight: 1.7 }}>
          <li>Видеть список устройств и их статус</li>
          <li>Читать телеметрию и журнал решений</li>
          <li>Ставить задачи устройствам</li>
          <li>Запускать симулятор</li>
        </ul>

        <div className="kpi-label" style={{ marginTop: 18 }}>
          Чего приложение не сможет
        </div>
        <ul style={{ marginTop: 10, paddingLeft: 20, lineHeight: 1.7 }}>
          <li>Видеть данные других организаций</li>
          <li>Управлять аккаунтом, командой и ключами API</li>
          <li>Удалять устройства или задачи</li>
        </ul>

        <p className="muted" style={{ marginTop: 18, fontSize: 13 }}>
          Доступ вернётся на <strong>{host}</strong>. Отозвать его можно в любой
          момент: Аккаунт → Сессии.
        </p>
      </div>

      {error && (
        <div className="error-box" style={{ marginTop: 14 }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
        <button onClick={approve} disabled={busy}>
          {busy ? <Spinner /> : "Разрешить"}
        </button>
        <button onClick={deny} disabled={busy} className="btn-secondary">
          Отклонить
        </button>
      </div>
    </main>
  );
}

export default function AuthorizePage() {
  // useSearchParams needs a Suspense boundary to prerender.
  return (
    <Suspense
      fallback={
        <main className="container">
          <Spinner />
        </main>
      }
    >
      <AuthorizeInner />
    </Suspense>
  );
}

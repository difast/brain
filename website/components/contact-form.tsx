"use client";

import { useState } from "react";
import { ArrowIcon } from "./ui";

const CONTACT_EMAIL = "info@mevratek.ru";
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.mevratek.ru/api/v1";

const TOPICS = [
  { value: "pilot", label: "Пилотный проект" },
  { value: "partnership", label: "Партнёрство" },
  { value: "press", label: "Пресса" },
  { value: "other", label: "Другое" },
];

const inputCls =
  "w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-muted/70 focus:border-accent/50 focus:ring-2 focus:ring-accent/10";

export function ContactForm() {
  const [sent, setSent] = useState(false);
  const [topic, setTopic] = useState("pilot");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function mailtoFallback(fields: {
    name: string;
    email: string;
    org: string;
    message: string;
  }) {
    const topicLabel =
      TOPICS.find((t) => t.value === topic)?.label ?? "Обращение";
    const subject = `Mevratek — ${topicLabel}${fields.org ? ` · ${fields.org}` : ""}`;
    const body = [
      `Имя: ${fields.name}`,
      `Email: ${fields.email}`,
      fields.org ? `Организация: ${fields.org}` : "",
      `Тема: ${topicLabel}`,
      "",
      fields.message,
    ]
      .filter(Boolean)
      .join("\n");
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const fields = {
      name: String(data.get("name") ?? "").trim(),
      email: String(data.get("email") ?? "").trim(),
      org: String(data.get("org") ?? "").trim(),
      message: String(data.get("message") ?? "").trim(),
    };
    const honeypot = String(data.get("website") ?? "");

    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fields.name,
          email: fields.email,
          organization: fields.org || null,
          topic,
          message: fields.message,
          website: honeypot,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setSent(true);
    } catch {
      // Backend unreachable — don't lose the lead: fall back to the mail client.
      mailtoFallback(fields);
      setError(
        "Не удалось отправить через сайт — мы открыли ваш почтовый клиент. Если он не открылся, напишите на info@mevratek.ru.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-2xl border border-line bg-white p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-signal/10 text-signal">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden>
            <path
              d="M5 12.5l4 4 10-10"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h3 className="mt-4 text-lg font-semibold text-ink">Заявка отправлена</h3>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">
          Спасибо! Мы получили ваше обращение и свяжемся с вами по указанному
          email. При срочном вопросе пишите напрямую:
        </p>
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="mt-3 inline-block text-sm font-semibold text-accent hover:text-ink"
        >
          {CONTACT_EMAIL}
        </a>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-line bg-white p-6 sm:p-8"
    >
      {/* Honeypot — hidden from users, catches naive bots. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="hidden"
        style={{ display: "none" }}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink">Имя *</span>
          <input name="name" required className={inputCls} placeholder="Иван Петров" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink">Email *</span>
          <input
            name="email"
            type="email"
            required
            className={inputCls}
            placeholder="you@company.ru"
          />
        </label>
      </div>

      <label className="mt-5 block">
        <span className="mb-1.5 block text-sm font-medium text-ink">
          Организация
        </span>
        <input name="org" className={inputCls} placeholder="Название компании" />
      </label>

      <div className="mt-5">
        <span className="mb-2 block text-sm font-medium text-ink">Тема</span>
        <div className="flex flex-wrap gap-2">
          {TOPICS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTopic(t.value)}
              className={`rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors ${
                topic === t.value
                  ? "border-accent bg-accent-strong text-white"
                  : "border-line bg-white text-ink-soft hover:border-accent/40"
              }`}
              aria-pressed={topic === t.value}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <label className="mt-5 block">
        <span className="mb-1.5 block text-sm font-medium text-ink">
          Сообщение *
        </span>
        <textarea
          name="message"
          required
          rows={5}
          className={`${inputCls} resize-y`}
          placeholder="Расскажите о вашем устройстве и задаче"
        />
      </label>

      <label className="mt-6 flex items-start gap-3 text-xs leading-relaxed text-muted">
        <input
          type="checkbox"
          name="consent"
          required
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-line text-accent-strong accent-accent-strong focus:ring-2 focus:ring-accent/20"
        />
        <span>
          Я даю{" "}
          <a
            href="/consent"
            target="_blank"
            className="font-medium text-accent underline underline-offset-2 hover:text-ink"
          >
            согласие на обработку персональных данных
          </a>{" "}
          и ознакомлен с{" "}
          <a
            href="/privacy"
            target="_blank"
            className="font-medium text-accent underline underline-offset-2 hover:text-ink"
          >
            Политикой конфиденциальности
          </a>
          . *
        </span>
      </label>

      {error && (
        <p className="mt-4 text-sm leading-relaxed text-muted">{error}</p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent-strong px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-ink disabled:opacity-60 sm:w-auto"
      >
        {busy ? "Отправляем…" : "Отправить обращение"} <ArrowIcon />
      </button>
    </form>
  );
}

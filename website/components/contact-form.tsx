"use client";

import { useState } from "react";
import { ArrowIcon } from "./ui";

const CONTACT_EMAIL = "info@mevratek.ru";

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

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const org = String(data.get("org") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();
    const topicLabel =
      TOPICS.find((t) => t.value === topic)?.label ?? "Обращение";

    const subject = `Mevratek — ${topicLabel}${org ? ` · ${org}` : ""}`;
    const body = [
      `Имя: ${name}`,
      `Email: ${email}`,
      org ? `Организация: ${org}` : "",
      `Тема: ${topicLabel}`,
      "",
      message,
    ]
      .filter(Boolean)
      .join("\n");

    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;
    setSent(true);
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
        <h3 className="mt-4 text-lg font-semibold text-ink">
          Почти готово — подтвердите отправку
        </h3>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">
          Мы открыли ваш почтовый клиент с заполненным письмом. Если он не
          открылся, напишите нам напрямую:
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

      <button
        type="submit"
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent-strong px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-ink sm:w-auto"
      >
        Отправить обращение <ArrowIcon />
      </button>
      <p className="mt-3 text-xs text-muted">
        Нажимая «Отправить», вы соглашаетесь на обработку указанных данных для
        ответа на обращение.
      </p>
    </form>
  );
}

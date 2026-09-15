"use client";

import { useState } from "react";
import { ArrowIcon } from "./ui";
import { localePath, type Dict, type Locale } from "@/i18n/config";

const CONTACT_EMAIL = "info@mevratek.ru";
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.mevratek.ru/api/v1";

/**
 * Only the labels are translated. The `value` of every option is what the
 * backend stores and what the sales team filters on, so it stays identical in
 * both languages — a lead is not a different kind of lead because the form was
 * read in English.
 */
const TOPICS: { value: string; label: Dict }[] = [
  { value: "pilot", label: { ru: "Пилотный проект", en: "Pilot project" } },
  { value: "partnership", label: { ru: "Партнёрство", en: "Partnership" } },
  { value: "press", label: { ru: "Пресса", en: "Press" } },
  { value: "other", label: { ru: "Другое", en: "Something else" } },
];

// Who is writing. The same four audiences as /for-who, so the first reply can
// be the right one instead of a generic acknowledgement.
const SEGMENTS: { value: string; label: Dict }[] = [
  { value: "", label: { ru: "Не указывать", en: "Prefer not to say" } },
  {
    value: "integrator",
    label: { ru: "Интегратор робототехники", en: "Robotics integrator" },
  },
  {
    value: "industry",
    label: { ru: "Промышленное предприятие", en: "Industrial enterprise" },
  },
  { value: "startup", label: { ru: "Стартап / R&D-команда", en: "Startup / R&D team" } },
  {
    value: "research",
    label: { ru: "Университет / лаборатория", en: "University / lab" },
  },
  { value: "other", label: { ru: "Другое", en: "Other" } },
];

// The price depends on the size of the fleet, so asking here saves a round of
// email before anyone can say anything useful about cost.
const FLEET_SIZES: { value: string; label: Dict }[] = [
  { value: "", label: { ru: "Не указывать", en: "Prefer not to say" } },
  { value: "1-5", label: { ru: "1–5 устройств", en: "1–5 devices" } },
  { value: "6-20", label: { ru: "6–20 устройств", en: "6–20 devices" } },
  { value: "21-100", label: { ru: "21–100 устройств", en: "21–100 devices" } },
  { value: "100+", label: { ru: "Больше 100", en: "More than 100" } },
  { value: "planning", label: { ru: "Пока планируем", en: "Still planning" } },
];

const FORM_COPY = {
  ru: {
    mailSubjectFallback: "Обращение",
    fName: "Имя",
    fEmail: "Email",
    fPhone: "Телефон",
    fOrg: "Организация",
    fTopic: "Тема",
    fWho: "Кто вы",
    fFleet: "Парк",
    sentTitle: "Заявка отправлена",
    sentBody:
      "Спасибо! Мы получили ваше обращение и свяжемся с вами по указанному email. При срочном вопросе пишите напрямую:",
    labelName: "Имя *",
    phName: "Иван Петров",
    labelEmail: "Email *",
    phEmail: "you@company.ru",
    labelPhone: "Телефон *",
    phPhone: "+7 900 000-00-00",
    labelOrg: "Организация",
    phOrg: "Название компании",
    labelTopic: "Тема",
    labelSegment: "Кто вы",
    labelFleet: "Размер парка",
    labelMessage: "Сообщение *",
    phMessage: "Расскажите о вашем устройстве и задаче",
    consentBefore: "Я даю ",
    consentLink: "согласие на обработку персональных данных",
    consentMiddle: " и ознакомлен с ",
    privacyLink: "Политикой конфиденциальности",
    consentAfter: ". *",
    sending: "Отправляем…",
    submit: "Отправить обращение",
    networkError:
      "Не удалось отправить через сайт — мы открыли ваш почтовый клиент. Если он не открылся, напишите на info@mevratek.ru.",
  },
  en: {
    mailSubjectFallback: "Enquiry",
    fName: "Name",
    fEmail: "Email",
    fPhone: "Phone",
    fOrg: "Organisation",
    fTopic: "Topic",
    fWho: "Who you are",
    fFleet: "Fleet",
    sentTitle: "Your message has been sent",
    sentBody:
      "Thank you. We have your enquiry and will reply to the email address you gave. If it is urgent, write to us directly:",
    labelName: "Name *",
    phName: "Jane Smith",
    labelEmail: "Email *",
    phEmail: "you@company.com",
    labelPhone: "Phone *",
    phPhone: "+7 900 000-00-00",
    labelOrg: "Organisation",
    phOrg: "Company name",
    labelTopic: "Topic",
    labelSegment: "Who you are",
    labelFleet: "Fleet size",
    labelMessage: "Message *",
    phMessage: "Tell us about your device and what you need it to do",
    consentBefore: "I give my ",
    consentLink: "consent to the processing of personal data",
    consentMiddle: " and have read the ",
    privacyLink: "Privacy Notice",
    consentAfter: ". *",
    sending: "Sending…",
    submit: "Send enquiry",
    networkError:
      "We could not send this through the site, so we opened your mail client. If nothing opened, write to info@mevratek.ru.",
  },
} as const;

const inputCls =
  "w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-muted/70 focus:border-accent/50 focus:ring-2 focus:ring-accent/10";

export function ContactForm({ locale }: { locale: Locale }) {
  const c = FORM_COPY[locale];
  const [sent, setSent] = useState(false);
  const [topic, setTopic] = useState("pilot");
  const [segment, setSegment] = useState("");
  const [fleetSize, setFleetSize] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function mailtoFallback(fields: {
    name: string;
    email: string;
    phone: string;
    org: string;
    message: string;
  }) {
    const topicLabel =
      TOPICS.find((x) => x.value === topic)?.label[locale] ??
      c.mailSubjectFallback;
    const subject = `Mevratek — ${topicLabel}${fields.org ? ` · ${fields.org}` : ""}`;
    const body = [
      `${c.fName}: ${fields.name}`,
      `${c.fEmail}: ${fields.email}`,
      fields.phone ? `${c.fPhone}: ${fields.phone}` : "",
      fields.org ? `${c.fOrg}: ${fields.org}` : "",
      `${c.fTopic}: ${topicLabel}`,
      segment
        ? `${c.fWho}: ${
            SEGMENTS.find((x) => x.value === segment)?.label[locale] ?? segment
          }`
        : "",
      fleetSize
        ? `${c.fFleet}: ${
            FLEET_SIZES.find((x) => x.value === fleetSize)?.label[locale] ??
            fleetSize
          }`
        : "",
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
      phone: String(data.get("phone") ?? "").trim(),
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
          phone: fields.phone,
          organization: fields.org || null,
          topic,
          segment: segment || null,
          fleet_size: fleetSize || null,
          message: fields.message,
          website: honeypot,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setSent(true);
    } catch {
      // Backend unreachable — don't lose the lead: fall back to the mail client.
      mailtoFallback(fields);
      setError(c.networkError);
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
        <h3 className="mt-4 text-lg font-semibold text-ink">{c.sentTitle}</h3>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">
          {c.sentBody}
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
          <span className="mb-1.5 block text-sm font-medium text-ink">
            {c.labelName}
          </span>
          <input name="name" required className={inputCls} placeholder={c.phName} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink">
            {c.labelEmail}
          </span>
          <input
            name="email"
            type="email"
            required
            className={inputCls}
            placeholder={c.phEmail}
          />
        </label>
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink">
            {c.labelPhone}
          </span>
          <input
            name="phone"
            type="tel"
            required
            className={inputCls}
            placeholder={c.phPhone}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink">
            {c.labelOrg}
          </span>
          <input name="org" className={inputCls} placeholder={c.phOrg} />
        </label>
      </div>

      <div className="mt-5">
        <span className="mb-2 block text-sm font-medium text-ink">
          {c.labelTopic}
        </span>
        <div className="flex flex-wrap gap-2">
          {TOPICS.map((x) => (
            <button
              key={x.value}
              type="button"
              onClick={() => setTopic(x.value)}
              className={`rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors ${
                topic === x.value
                  ? "border-accent bg-accent-strong text-white"
                  : "border-line bg-white text-ink-soft hover:border-accent/40"
              }`}
              aria-pressed={topic === x.value}
            >
              {x.label[locale]}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink">
            {c.labelSegment}
          </span>
          <select
            name="segment"
            value={segment}
            onChange={(e) => setSegment(e.target.value)}
            className={inputCls}
          >
            {SEGMENTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label[locale]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink">
            {c.labelFleet}
          </span>
          <select
            name="fleet_size"
            value={fleetSize}
            onChange={(e) => setFleetSize(e.target.value)}
            className={inputCls}
          >
            {FLEET_SIZES.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label[locale]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="mt-5 block">
        <span className="mb-1.5 block text-sm font-medium text-ink">
          {c.labelMessage}
        </span>
        <textarea
          name="message"
          required
          rows={5}
          className={`${inputCls} resize-y`}
          placeholder={c.phMessage}
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
          {c.consentBefore}
          <a
            href={localePath(locale, "/consent")}
            target="_blank"
            className="font-medium text-accent underline underline-offset-2 hover:text-ink"
          >
            {c.consentLink}
          </a>
          {c.consentMiddle}
          <a
            href={localePath(locale, "/privacy")}
            target="_blank"
            className="font-medium text-accent underline underline-offset-2 hover:text-ink"
          >
            {c.privacyLink}
          </a>
          {c.consentAfter}
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
        {busy ? c.sending : c.submit} <ArrowIcon />
      </button>
    </form>
  );
}

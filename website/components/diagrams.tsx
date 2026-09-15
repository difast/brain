import type { ReactNode } from "react";

import { type Locale } from "@/i18n/config";

/* ---------- Small building blocks ---------- */

function Node({
  label,
  sub,
  tone = "default",
}: {
  label: ReactNode;
  sub?: ReactNode;
  tone?: "default" | "accent" | "muted";
}) {
  const tones = {
    default: "border-line bg-white",
    accent: "border-accent/30 bg-accent-strong text-white",
    muted: "border-line bg-surface",
  }[tone];
  return (
    <div
      className={`flex min-w-0 flex-1 flex-col items-center rounded-xl border px-4 py-4 text-center ${tones}`}
    >
      <div className="text-sm font-semibold leading-tight">{label}</div>
      {sub ? (
        <div
          className={`mt-1 text-xs leading-snug ${
            tone === "accent" ? "text-white/70" : "text-muted"
          }`}
        >
          {sub}
        </div>
      ) : null}
    </div>
  );
}

function Connector() {
  return (
    <div
      className="flex shrink-0 items-center justify-center text-muted"
      aria-hidden
    >
      {/* horizontal arrow on wide screens, vertical on narrow */}
      <svg
        viewBox="0 0 24 24"
        className="hidden h-5 w-6 md:block"
        fill="none"
      >
        <path
          d="M3 12h16M15 7l5 5-5 5"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <svg viewBox="0 0 24 24" className="h-6 w-5 md:hidden" fill="none">
        <path
          d="M12 3v16M7 15l5 5 5-5"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

/* ---------- Home: request/response flow ---------- */

const FLOW_STEPS: {
  label: Record<Locale, string>;
  sub: Record<Locale, string>;
  tone?: "default" | "accent";
}[] = [
  {
    label: { ru: "Устройство", en: "Device" },
    sub: { ru: "робот · тележка · дрон", en: "robot · cart · drone" },
  },
  {
    label: { ru: "SDK / API", en: "SDK / API" },
    sub: { ru: "телеметрия + состояние", en: "telemetry + state" },
  },
  {
    label: { ru: "AI-движок", en: "AI engine" },
    sub: { ru: "российские LLM", en: "your own model" },
    tone: "accent",
  },
  {
    label: { ru: "Команды", en: "Commands" },
    sub: { ru: "структурированный JSON", en: "structured JSON" },
  },
];

export function FlowDiagram({ locale }: { locale: Locale }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5 sm:p-7">
      <div className="flex flex-col gap-3 md:flex-row md:items-stretch">
        {FLOW_STEPS.map((s, i) => (
          <div
            key={s.label.ru}
            className="flex flex-col md:flex-1 md:flex-row md:items-center"
          >
            <Node
              label={s.label[locale]}
              sub={s.sub[locale]}
              tone={s.tone ?? "default"}
            />
            {i < FLOW_STEPS.length - 1 ? <Connector /> : null}
          </div>
        ))}
      </div>
      <div className="mt-5 rounded-lg bg-surface px-4 py-3 font-mono text-xs leading-relaxed text-ink-soft">
        {"{ \"goal\": \"approach the object\", \"confidence\": 0.91,"}
        <br />
        {"  \"actions\": [{ \"type\": \"move_forward\", \"value\": 0.5 }] }"}
      </div>
    </div>
  );
}

/* ---------- Platform: layered architecture ---------- */

function Layer({
  tag,
  children,
}: {
  tag: string;
  children: ReactNode;
}) {
  return (
    <div className="relative rounded-xl border border-line bg-white p-4">
      <div className="absolute -top-2.5 left-4 bg-white px-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
        {tag}
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function Pill({ children, strong = false }: { children: ReactNode; strong?: boolean }) {
  return (
    <div
      className={`rounded-lg border px-3 py-2.5 text-center text-sm font-medium ${
        strong
          ? "border-accent/30 bg-accent-strong text-white"
          : "border-line bg-surface text-ink-soft"
      }`}
    >
      {children}
    </div>
  );
}

function DownLink() {
  return (
    <div className="flex justify-center py-1.5 text-muted" aria-hidden>
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
        <path
          d="M12 4v14M6 13l6 6 6-6"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

const ARCH: Record<
  Locale,
  {
    devices: string;
    deviceList: [string, string, string];
    protocol: string;
    protocolList: [string, string];
    services: string;
    models: string;
    modelList: [string, string, string, string];
  }
> = {
  ru: {
    devices: "Устройства",
    deviceList: ["Промышленный робот", "Складская тележка", "Симулятор"],
    protocol: "Единый протокол",
    protocolList: ["SDK (Python)", "REST API · JWT-аутентификация"],
    services: "Сервисы платформы",
    models: "AI-модели (Model Router)",
    modelList: ["YandexGPT", "GigaChat", "Локальные модели", "On-premise"],
  },
  en: {
    devices: "Devices",
    deviceList: ["Industrial robot", "Warehouse cart", "Simulator"],
    protocol: "One protocol",
    protocolList: ["SDK (Python)", "REST API · JWT authentication"],
    services: "Platform services",
    models: "AI models (Model Router)",
    modelList: ["YandexGPT", "GigaChat", "Local models", "On-premise"],
  },
};

export function ArchitectureDiagram({ locale }: { locale: Locale }) {
  const c = ARCH[locale];
  return (
    <div className="rounded-2xl border border-line bg-surface/60 p-4 sm:p-6">
      <Layer tag={c.devices}>
        <div className="grid grid-cols-3 gap-3">
          {c.deviceList.map((d) => (
            <Pill key={d}>{d}</Pill>
          ))}
        </div>
      </Layer>

      <DownLink />

      <Layer tag={c.protocol}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {c.protocolList.map((d) => (
            <Pill key={d}>{d}</Pill>
          ))}
        </div>
      </Layer>

      <DownLink />

      <Layer tag={c.services}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Pill>Robot Registry</Pill>
          <Pill>Task Engine</Pill>
          <Pill strong>Decision Engine</Pill>
          <Pill>Memory Layer</Pill>
          <Pill>Telemetry</Pill>
          <Pill>Action Translator</Pill>
        </div>
      </Layer>

      <DownLink />

      <Layer tag={c.models}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {c.modelList.map((d) => (
            <Pill key={d}>{d}</Pill>
          ))}
        </div>
      </Layer>
    </div>
  );
}

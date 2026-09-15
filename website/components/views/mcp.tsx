import Link from "next/link";

import {
  ArrowIcon,
  Button,
  Container,
  Section,
  SectionHeading,
} from "@/components/ui";
import { BreadcrumbJsonLd, TechArticleJsonLd } from "@/components/schema";
import { t } from "@/content/ui";
import { localePath, type Dict, type Locale } from "@/i18n/config";

const d = (ru: string, en: string): Dict => ({ ru, en });

const SERVER_URL = "https://api.mevratek.ru/mcp";

const DISCOVERY = `GET https://api.mevratek.ru/.well-known/oauth-protected-resource
GET https://api.mevratek.ru/.well-known/oauth-authorization-server`;

/**
 * The six tools, with their parameters.
 *
 * Tool names and parameter names are identifiers the assistant actually sends,
 * so they are never translated — only the prose around them is.
 */
const TOOLS: {
  name: string;
  params: Dict;
  what: Dict;
  readOnly: boolean;
}[] = [
  {
    name: "get_devices",
    params: d("limit (необяз., 1–100, по умолч. 50)", "limit (optional, 1–100, default 50)"),
    what: d(
      "Список всех устройств организации со статусом и временем последнего выхода на связь.",
      "Lists every device in your organization with its status and last-seen time.",
    ),
    readOnly: true,
  },
  {
    name: "get_device_status",
    params: d("device_id (обязателен)", "device_id (required)"),
    what: d(
      "Текущее состояние одного устройства: статус, возможности, заряд, координаты и ошибки.",
      "The current state of one device: status, capabilities, latest battery, position and errors.",
    ),
    readOnly: true,
  },
  {
    name: "get_telemetry",
    params: d(
      "device_id (обязателен), limit (необяз., 1–100, по умолч. 10)",
      "device_id (required), limit (optional, 1–100, default 10)",
    ),
    what: d(
      "Последние показания телеметрии устройства, новые сверху.",
      "Recent telemetry readings for one device, newest first.",
    ),
    readOnly: true,
  },
  {
    name: "get_decision_logs",
    params: d(
      "device_id (необяз., без него — по всему парку), limit (необяз., 1–100, по умолч. 20)",
      "device_id (optional; omit for the whole fleet), limit (optional, 1–100, default 20)",
    ),
    what: d(
      "Журнал решений: задача, ответ модели, уверенность, провайдер и задержка.",
      "The decision journal: task, model output, confidence, provider and latency.",
    ),
    readOnly: true,
  },
  {
    name: "send_task",
    params: d(
      "device_id (обязателен), task_description (обязателен), priority (необяз., 0–100)",
      "device_id (required), task_description (required), priority (optional, 0–100)",
    ),
    what: d(
      "Ставит задачу устройству через движок задач.",
      "Queues a task for a device through the Task Engine.",
    ),
    readOnly: false,
  },
  {
    name: "run_simulator",
    params: d(
      "scenario_description (обязателен), device_type (необяз., по умолч. rover)",
      "scenario_description (required), device_type (optional, default rover)",
    ),
    what: d(
      "Регистрирует виртуальное устройство и запускает на нём сценарий.",
      "Registers a virtual device and queues a scenario against it.",
    ),
    readOnly: false,
  },
];

export const MCP_COPY = {
  ru: {
    metaTitle: "MCP-коннектор",
    metaDescription:
      "Подключите парк устройств Mevratek к Claude или ChatGPT: MCP-сервер по Streamable HTTP с авторизацией OAuth 2.0 и PKCE. Шесть инструментов для состояния устройств, журнала решений, постановки задач и симуляций.",
    ogTitle: "Mevratek MCP-коннектор для Claude и ChatGPT",
    crumb: "MCP-коннектор",
    eyebrow: "Разработчикам · MCP",
    title: "Управляйте парком устройств прямо из Claude или ChatGPT",
    intro:
      "Спрашивайте о состоянии устройств обычным языком, читайте журнал решений, ставьте задачи и запускайте симуляции — не открывая дашборд.",
    factsTitle: "Параметры подключения",
    facts: [
      ["Адрес сервера", SERVER_URL],
      ["Транспорт", "Streamable HTTP"],
      ["Авторизация", "OAuth 2.0 с PKCE (S256), динамическая регистрация клиента"],
    ],
    privacyLink: "Политика конфиденциальности коннектора",
    claudeTitle: "Подключение в Claude",
    claudeSteps: [
      "Откройте «Настройки → Коннекторы → Добавить свой коннектор».",
      `Вставьте адрес сервера: ${SERVER_URL}`,
      "Нажмите «Добавить». Claude сам зарегистрируется и откроет страницу Mevratek в браузере.",
      "Войдите в Mevratek, если ещё не вошли.",
      "Посмотрите, что коннектор сможет делать, и нажмите «Разрешить».",
      "Вы вернётесь в Claude уже подключёнными.",
    ],
    claudeNote:
      "Коннектор работает в Claude в вебе, на десктопе и на телефоне.",
    gptTitle: "Подключение в ChatGPT",
    gptSteps: [
      "Откройте «Settings → Connectors → Create».",
      `Вставьте адрес сервера: ${SERVER_URL}`,
      "Выберите способ авторизации OAuth.",
      "Нажмите «Create». ChatGPT зарегистрируется и откроет страницу Mevratek.",
      "Войдите, проверьте права и подтвердите доступ.",
    ],
    gptNote:
      "В ChatGPT коннектор используется из Developer mode, а после одобрения OpenAI — из каталога приложений.",
    ownTitle: "Подключение из своего клиента",
    ownBody:
      "Сервер публикует стандартные документы обнаружения, поэтому любой MCP-клиент с поддержкой Streamable HTTP и OAuth 2.0 подключается без особых настроек:",
    ownNote:
      "Неавторизованный запрос к /mcp возвращает 401 и заголовок WWW-Authenticate со ссылкой на первый из этих документов.",
    toolsTitle: "Доступные инструменты",
    colTool: "Инструмент",
    colWhat: "Что делает",
    colParams: "Параметры",
    colMode: "Режим",
    readOnly: "только чтение",
    writes: "изменяет данные",
    providerTitle: "Одно поле, о котором стоит знать",
    providerBody:
      "В get_decision_logs каждая запись несёт поле provider. Значение, оканчивающееся на :fallback, — или провайдер mock — означает, что вместо настроенной модели ответила детерминированная заглушка. Устройство разницы не видит: валидное решение оно получает в любом случае. Если разбираетесь, почему парк ведёт себя странно, смотреть нужно сюда в первую очередь.",
    tryTitle: "Что можно спросить",
    tryList: [
      "Какие устройства сейчас офлайн?",
      "Покажи заряд всех роверов.",
      "Что решал scout-01 в последних десяти раундах и отвечала ли модель на самом деле?",
      "Поставь складской тележке задачу «осмотреть восточный проход».",
      "Смоделируй ровер, которому нужно объехать препятствие.",
    ],
    limitsTitle: "Чего коннектор не может",
    limits: [
      "Видеть любую организацию, кроме вашей.",
      "Читать или менять настройки аккаунта, участников команды и API-ключи.",
      "Удалять устройства и задачи.",
      "Получать кадры с камер.",
      "Обращаться к API дашборда — токен ограничен перечисленными инструментами.",
    ],
    revokeTitle: "Как отозвать доступ",
    revokeBody:
      "«Mevratek → Аккаунт → Сессии». Коннектор виден как сессия с именем клиента, например «MCP: Claude». Завершите её — и подключение перестанет работать на следующем же запросе. Также можно удалить коннектор в Claude или ChatGPT либо написать на info@mevratek.ru.",
    behaviourTitle: "Ограничения и поведение",
    behaviour: [
      "Результат одного вызова ограничен 100 записями.",
      "Токен доступа действует 8 часов; клиент обновляет его повторной авторизацией.",
      "Код авторизации живёт 60 секунд и используется один раз. Повторно предъявленный код отклоняется, а выданная по нему сессия отзывается.",
      "Сервер не хранит состояние: Mcp-Session-Id не назначается, возобновлять после перезапуска нечего.",
      "GET /mcp открывает SSE-поток только с keepalive — сервер сам сообщений не инициирует. Поток закрывается через пять минут, клиент переподключается.",
    ],
    ctaTitle: "Нужен доступ к платформе?",
    ctaBody:
      "Коннектор работает с вашей организацией в Mevratek. Если её ещё нет — расскажите о задаче, обсудим пилот.",
    ctaButton: "Связаться с нами",
    docsBefore: "Техническая справка по API и протоколу — в ",
    docsLink: "документации платформы",
    docsAfter: ".",
  },
  en: {
    metaTitle: "MCP connector",
    metaDescription:
      "Connect your Mevratek robot fleet to Claude or ChatGPT: an MCP server over Streamable HTTP, authorised with OAuth 2.0 and PKCE. Six tools for device state, the decision journal, queueing tasks and running simulations.",
    ogTitle: "The Mevratek MCP connector for Claude and ChatGPT",
    crumb: "MCP connector",
    eyebrow: "Developers · MCP",
    title: "Run your device fleet from Claude or ChatGPT",
    intro:
      "Ask about device state in plain language, read the decision journal, queue tasks and run simulations — without opening the dashboard.",
    factsTitle: "Connection details",
    facts: [
      ["Server URL", SERVER_URL],
      ["Transport", "Streamable HTTP"],
      ["Authentication", "OAuth 2.0 with PKCE (S256), dynamic client registration"],
    ],
    privacyLink: "The connector's privacy policy",
    claudeTitle: "Connecting in Claude",
    claudeSteps: [
      "Open Settings → Connectors → Add custom connector.",
      `Paste the server URL: ${SERVER_URL}`,
      "Click Add. Claude registers itself and opens a Mevratek page in your browser.",
      "Sign in to Mevratek if you are not already signed in.",
      "Review what the connector will be able to do, then approve it.",
      "You are returned to Claude, connected.",
    ],
    claudeNote: "The connector is available in Claude on the web, desktop and mobile.",
    gptTitle: "Connecting in ChatGPT",
    gptSteps: [
      "Open Settings → Connectors → Create.",
      `Paste the server URL: ${SERVER_URL}`,
      "Choose OAuth as the authentication method.",
      "Click Create. ChatGPT registers itself and opens a Mevratek page.",
      "Sign in, review the permissions, and approve.",
    ],
    gptNote:
      "In ChatGPT the connector is used from Developer mode or, once approved by OpenAI, from the app directory.",
    ownTitle: "Connecting from your own client",
    ownBody:
      "The server implements the standard discovery documents, so any MCP client that speaks Streamable HTTP and OAuth 2.0 can connect without special-casing:",
    ownNote:
      "An unauthenticated request to /mcp returns 401 with a WWW-Authenticate header pointing at the first of these.",
    toolsTitle: "Available tools",
    colTool: "Tool",
    colWhat: "What it does",
    colParams: "Parameters",
    colMode: "Mode",
    readOnly: "read-only",
    writes: "writes data",
    providerTitle: "One field worth knowing about",
    providerBody:
      "In get_decision_logs, each entry carries a provider. A value ending in :fallback — or a provider of mock — means the deterministic placeholder answered instead of the configured AI model. The device cannot tell the difference: it receives a valid decision either way. If you are asking why a fleet is behaving oddly, this is the first field to look at.",
    tryTitle: "Things to try",
    tryList: [
      "Which of my devices are offline?",
      "Show me the battery level of every rover.",
      "What did scout-01 decide in its last ten rounds, and did the model actually answer?",
      "Queue “inspect the east aisle” for the warehouse cart.",
      "Simulate a rover that has to get around an obstacle.",
    ],
    limitsTitle: "What the connector cannot do",
    limits: [
      "See any organization but your own.",
      "Read or change account settings, team members, or API keys.",
      "Delete devices or tasks.",
      "Access camera frames.",
      "Call the Mevratek dashboard API — the token is scoped to these tools only.",
    ],
    revokeTitle: "Revoking access",
    revokeBody:
      "Mevratek → Account → Sessions. The connector appears as a session named after the client, for example “MCP: Claude”. End it and the connection stops working on its next request. You can also remove the connector in Claude or ChatGPT, or email info@mevratek.ru.",
    behaviourTitle: "Limits and behaviour",
    behaviour: [
      "Results are capped at 100 records per call.",
      "Access tokens are valid for 8 hours; clients refresh by re-authorizing.",
      "Authorization codes are valid for 60 seconds and are single-use. A code presented twice is refused and the session it produced is revoked.",
      "The server is stateless: it assigns no Mcp-Session-Id, so there is no session to resume after a restart.",
      "GET /mcp opens an SSE stream that carries keepalives only; this server never initiates messages. It closes after five minutes and expects the client to reconnect.",
    ],
    ctaTitle: "Need access to the platform?",
    ctaBody:
      "The connector works against your organization in Mevratek. If you do not have one yet, tell us about your task and we will talk through a pilot.",
    ctaButton: "Get in touch",
    docsBefore: "The technical reference for the API and the protocol is in the ",
    docsLink: "platform documentation",
    docsAfter: ".",
  },
} as const;

function Steps({ items }: { items: readonly string[] }) {
  return (
    <ol className="mt-5 space-y-3">
      {items.map((step, i) => (
        <li key={step} className="flex gap-3">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-strong text-xs font-semibold text-white">
            {i + 1}
          </span>
          <span className="text-sm leading-relaxed text-ink-soft">{step}</span>
        </li>
      ))}
    </ol>
  );
}

function Bullets({ items }: { items: readonly string[] }) {
  return (
    <ul className="mt-4 space-y-2.5">
      {items.map((item) => (
        <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-ink-soft">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent/50" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function McpView({ locale }: { locale: Locale }) {
  const c = MCP_COPY[locale];
  const p = (path: string) => localePath(locale, path);

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: t(locale, "home"), url: p("/") },
          { name: c.crumb, url: p("/mcp") },
        ]}
      />
      <TechArticleJsonLd
        title={c.metaTitle}
        description={c.metaDescription}
        path="/mcp"
        locale={locale}
      />

      {/* Hero */}
      <Section className="pt-14 sm:pt-16">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
            <SectionHeading eyebrow={c.eyebrow} title={c.title} intro={c.intro} />
            <div className="rounded-2xl border border-line bg-white p-6">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                {c.factsTitle}
              </div>
              <dl className="mt-4 space-y-3 text-sm">
                {c.facts.map(([k, v]) => (
                  <div key={k} className="min-w-0 border-b border-line pb-3 last:border-0 last:pb-0">
                    <dt className="text-muted">{k}</dt>
                    <dd className="mt-0.5 break-words font-mono text-xs text-ink">{v}</dd>
                  </div>
                ))}
              </dl>
              <Link
                href={p("/privacy-policy")}
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:text-ink"
              >
                {c.privacyLink} <ArrowIcon />
              </Link>
            </div>
          </div>
        </Container>
      </Section>

      {/* Clients */}
      <Section className="bg-surface">
        <Container>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-line bg-white p-7">
              <h2 className="text-xl font-semibold text-ink">{c.claudeTitle}</h2>
              <Steps items={c.claudeSteps} />
              <p className="mt-5 text-sm leading-relaxed text-muted">
                {c.claudeNote}
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-white p-7">
              <h2 className="text-xl font-semibold text-ink">{c.gptTitle}</h2>
              <Steps items={c.gptSteps} />
              <p className="mt-5 text-sm leading-relaxed text-muted">{c.gptNote}</p>
            </div>
          </div>

          <div className="mt-6 min-w-0 rounded-2xl border border-line bg-white p-7">
            <h2 className="text-xl font-semibold text-ink">{c.ownTitle}</h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">{c.ownBody}</p>
            <pre className="mt-4 overflow-x-auto rounded-lg border border-line bg-surface p-4 font-mono text-xs leading-relaxed text-ink-soft">
              {DISCOVERY}
            </pre>
            <p className="mt-4 text-sm leading-relaxed text-muted">{c.ownNote}</p>
          </div>
        </Container>
      </Section>

      {/* Tools */}
      <Section>
        <Container>
          <SectionHeading title={c.toolsTitle} />
          <div className="mt-8 overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                  <th className="py-2.5 pr-4 font-semibold">{c.colTool}</th>
                  <th className="py-2.5 pr-4 font-semibold">{c.colWhat}</th>
                  <th className="py-2.5 pr-4 font-semibold">{c.colParams}</th>
                  <th className="py-2.5 font-semibold">{c.colMode}</th>
                </tr>
              </thead>
              <tbody>
                {TOOLS.map((tool) => (
                  <tr key={tool.name} className="border-b border-line/60 align-top">
                    <td className="py-3 pr-4 font-mono text-xs text-ink">
                      {tool.name}
                    </td>
                    <td className="py-3 pr-4 text-ink-soft">{tool.what[locale]}</td>
                    <td className="py-3 pr-4 font-mono text-xs text-muted">
                      {tool.params[locale]}
                    </td>
                    <td className="py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${
                          tool.readOnly
                            ? "bg-signal/10 text-signal"
                            : "bg-surface text-ink-soft"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            tool.readOnly ? "bg-signal" : "bg-muted"
                          }`}
                        />
                        {tool.readOnly ? c.readOnly : c.writes}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-8 rounded-2xl border border-line bg-surface p-6 sm:p-7">
            <div className="text-base font-semibold text-ink">
              {c.providerTitle}
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-soft">
              {c.providerBody}
            </p>
          </div>
        </Container>
      </Section>

      {/* Try it / limits */}
      <Section className="bg-surface">
        <Container>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-line bg-white p-7">
              <h2 className="text-xl font-semibold text-ink">{c.tryTitle}</h2>
              <ul className="mt-5 space-y-2.5">
                {c.tryList.map((item) => (
                  <li
                    key={item}
                    className="rounded-lg bg-surface px-4 py-3 text-sm leading-relaxed text-ink-soft"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-line bg-white p-7">
              <h2 className="text-xl font-semibold text-ink">{c.limitsTitle}</h2>
              <Bullets items={c.limits} />
            </div>
          </div>
        </Container>
      </Section>

      {/* Revoking and limits */}
      <Section>
        <Container>
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <h2 className="text-xl font-semibold text-ink">{c.revokeTitle}</h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                {c.revokeBody}
              </p>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-ink">{c.behaviourTitle}</h2>
              <Bullets items={c.behaviour} />
            </div>
          </div>

          <p className="mt-10 text-sm text-muted">
            {c.docsBefore}
            <Link
              href={p("/documentation")}
              className="font-semibold text-accent hover:text-ink"
            >
              {c.docsLink}
            </Link>
            {c.docsAfter}
          </p>
        </Container>
      </Section>

      {/* CTA */}
      <Section className="!pt-0">
        <Container>
          <div className="rounded-[72px] border border-line bg-accent-strong px-6 py-12 text-center sm:py-14">
            <h2 className="mx-auto max-w-2xl text-3xl font-semibold text-white sm:text-4xl">
              {c.ctaTitle}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-white/85">{c.ctaBody}</p>
            <div className="mt-8 flex justify-center">
              <Button href={p("/contacts")} variant="secondary">
                {c.ctaButton} <ArrowIcon />
              </Button>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}

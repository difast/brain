import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui";
import { BreadcrumbJsonLd, TechArticleJsonLd } from "@/components/schema";

export const metadata: Metadata = {
  title: "Документация",
  description:
    "Техническая документация Mevratek: архитектура, Device Abstraction Layer, движок решений, задачи, телеметрия, аутентификация и изоляция данных, эндпоинты API, форматы и SDK.",
  alternates: { canonical: "/documentation" },
};

type Block =
  | { t: "p"; text: string }
  | { t: "h3"; text: string }
  | { t: "ul"; items: string[] }
  | { t: "code"; code: string }
  | { t: "table"; head: string[]; rows: string[][] };

interface DocSection {
  id: string;
  title: string;
  group: string;
  blocks: Block[];
}

const SECTIONS: DocSection[] = [
  {
    id: "overview",
    title: "Обзор",
    group: "Начало",
    blocks: [
      {
        t: "p",
        text: "Mevratek — платформа, которая выступает «мозгом» для любого парка устройств. Устройства — тонкие клиенты: они передают кадры с камеры, телеметрию и текущую задачу, а сервер платформы возвращает структурированные команды действий. Всё принятие решений выполняется на сервере через AI Decision Engine с поддержкой YandexGPT, GigaChat, Claude и локальных моделей. Сервер разворачивается в инфраструктуре заказчика — данные не покидают периметр.",
      },
    ],
  },
  {
    id: "architecture",
    title: "Архитектура",
    group: "Начало",
    blocks: [
      { t: "p", text: "Чистая слоистая архитектура. Логические сервисы внутри единого разворачиваемого бэкенда:" },
      {
        t: "ul",
        items: [
          "API-шлюз — аутентификация устройств и пользователей, маршрутизация.",
          "Движок решений — собирает промпт из capabilities устройства, вызывает AI-движок, возвращает строгий JSON.",
          "Реестр устройств — id, тип, доступные команды, статус подключения.",
          "Движок задач — назначение, очередь, выдача и завершение задач.",
          "Память — история решений и задач, результаты выполнения.",
          "Телеметрия — заряд, скорость, координаты, ошибки.",
        ],
      },
      { t: "p", text: "Устройство описывается полностью данными (тип + capabilities), поэтому новые типы устройств не требуют изменений ядра." },
    ],
  },
  {
    id: "quickstart",
    title: "Быстрый старт",
    group: "Начало",
    blocks: [
      { t: "p", text: "Подключите устройство за три вызова (SDK не обязателен). Регистрация авторизуется сессией дашборда или API-ключом организации:" },
      {
        t: "code",
        code: `# 1. Регистрация (один раз) — возвращает bearer-токен устройства
curl -X POST https://api.mevratek.ru/api/v1/robots/register \\
  -H "Authorization: Bearer <API_KEY_ОРГАНИЗАЦИИ>" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"rover-01","robot_type":"rover",
       "capabilities":[{"type":"move_forward"},{"type":"stop"}]}'

# 2. Запросить у мозга следующие действия
curl -X POST https://api.mevratek.ru/api/v1/brain/decision \\
  -H "Authorization: Bearer <ТОКЕН_УСТРОЙСТВА>" \\
  -H "Content-Type: application/json" \\
  -d '{"task":"approach the bottle","state":{"battery":80}}'`,
      },
    ],
  },
  {
    id: "robots",
    title: "Устройства и реестр",
    group: "Концепции",
    blocks: [
      { t: "p", text: "Устройство регистрируется один раз: имя, robot_type и список capabilities — команд, которые оно понимает, каждая с необязательными ограничениями значения." },
      { t: "p", text: "Регистрация возвращает token (bearer) и одноразовый api_key. Мозг возвращает только команды из списка capabilities самого устройства. Присутствие (онлайн/офлайн) отслеживается по heartbeat." },
    ],
  },
  {
    id: "decisions",
    title: "Движок решений",
    group: "Концепции",
    blocks: [
      { t: "p", text: "POST /brain/decision принимает задачу, необязательный кадр (image_b64 или frame_url) и текущее состояние. Мозг собирает промпт из capabilities устройства и недавних решений, вызывает AI-движок со строгой JSON-схемой, валидирует ответ и отбрасывает неподдерживаемые команды. Именно этот вызов разработчик встраивает в код своего устройства — через SDK или обычный HTTP." },
    ],
  },
  {
    id: "tasks",
    title: "Движок задач",
    group: "Концепции",
    blocks: [
      { t: "p", text: "Задачи создаются сверху (оператор или API назначает их устройству с приоритетом) или снизу — из собственного запроса решения устройства. Устройства забирают следующую задачу из очереди и отчитываются о результате." },
    ],
  },
  {
    id: "telemetry",
    title: "Телеметрия",
    group: "Концепции",
    blocks: [
      { t: "p", text: "Устройства шлют показания в POST /telemetry: заряд, скорость, координаты (x/y/z), список ошибок и любые дополнительные сенсоры. Последние значения показываются на странице устройства в дашборде." },
    ],
  },
  {
    id: "accounts",
    title: "Аккаунты и организации",
    group: "Концепции",
    blocks: [
      { t: "p", text: "Дашборд мультитенантный. Каждое устройство, задача, лог, показание телеметрии и API-ключ принадлежат организации, и каждый запрос ограничен организацией вызывающего — одна организация никогда не видит данные другой." },
      { t: "p", text: "Пользователи не регистрируются сами: вы получаете ссылку-приглашение, задаёте свой пароль и затем входите по email и паролю." },
    ],
  },
  {
    id: "auth",
    title: "Аутентификация",
    group: "Концепции",
    blocks: [
      { t: "p", text: "Аутентифицируются два типа вызывающих. Устройства используют bearer-токен из регистрации и действуют «от себя» — robot_id берётся из токена, а не из тела запроса. Пользователи дашборда входят по email + паролю (POST /auth/login) и получают токен сессии, ограниченный их организацией." },
      { t: "code", code: `Authorization: Bearer <token>` },
    ],
  },
  {
    id: "apikeys",
    title: "API-ключи",
    group: "Концепции",
    blocks: [
      { t: "p", text: "Каждая организация может сгенерировать API-ключи в дашборде. Секрет показывается один раз; хранится только хэш и короткий префикс. API-ключ авторизует регистрацию устройства вне дашборда (SDK или прошивка устройства) — передавайте его как bearer-токен. Ключи ограничены своей организацией и отзываются в любой момент." },
      { t: "code", code: `Authorization: Bearer cbk_xxxxxxxx...` },
    ],
  },
  {
    id: "dal",
    title: "Слой абстракции устройств (DAL)",
    group: "Слой абстракции",
    blocks: [
      { t: "p", text: "DAL позволяет облаку управлять любым устройством через единый протокол. LLM никогда не выдаёт аппаратные команды — она выдаёт универсальные действия, а платформа транслирует их в собственные низкоуровневые команды устройства на основе его capabilities." },
      { t: "h3", text: "Универсальные действия" },
      { t: "p", text: "Устройство объявляет низкоуровневые capabilities (например move_forward, arm_grasp, camera_capture). Из них платформа выводит универсальные действия (grasp, release, inspect, say). Мозгу показываются только они." },
      { t: "h3", text: "Транслятор действий" },
      { t: "p", text: "Транслятор сопоставляет каждое универсальное действие с первой поддерживаемой устройством командой, присваивая уникальный action_id для обратной связи. Неподдерживаемые действия отбрасываются." },
      { t: "h3", text: "Профиль устройства" },
      { t: "p", text: "GET /robots/{id}/profile возвращает единое описание устройства: robot_type, capabilities (низкоуровневые команды), supported_commands, supported_actions (универсальные действия), firmware_version и protocol_version." },
      { t: "h3", text: "Обратная связь о выполнении" },
      { t: "p", text: "После выполнения команды устройство сообщает результат в POST /executions (action_id, status: success|failed, duration_ms, error). Свежая обратная связь подаётся в следующее решение — мозг учится на том, что произошло на самом деле." },
    ],
  },
  {
    id: "model-router",
    title: "Выбор модели",
    group: "Слой абстракции",
    blocks: [
      { t: "p", text: "Движок решений не зависит от конкретного вендора: контракт «на входе — задача и возможности устройства, на выходе — строгий JSON с действиями» одинаков для любой модели." },
      {
        t: "ul",
        items: [
          "YandexGPT и GigaChat — российские модели.",
          "Claude и OpenAI — при необходимости.",
          "Локальные модели (Ollama, vLLM, LM Studio) — для закрытого контура, когда данные не должны покидать инфраструктуру.",
        ],
      },
      { t: "p", text: "Модель можно сменить, не меняя код интеграции: бизнес-логика устройства остаётся прежней." },
    ],
  },
  {
    id: "endpoints",
    title: "Эндпоинты API",
    group: "Справочник",
    blocks: [
      {
        t: "table",
        head: ["Метод", "Путь", "Авториз.", "Описание"],
        rows: [
          ["POST", "/auth/login", "—", "Вход (email + пароль)"],
          ["GET", "/auth/me", "сессия", "Текущий пользователь + организация"],
          ["POST", "/robots/register", "сессия / ключ", "Регистрация устройства"],
          ["POST", "/robots/heartbeat", "токен", "Сигнал «жив»"],
          ["GET", "/robots", "сессия", "Список устройств"],
          ["GET", "/robots/{id}", "сессия", "Детали устройства"],
          ["GET", "/robots/{id}/profile", "сессия", "Профиль устройства (DAL)"],
          ["POST", "/robots/{id}/pause", "сессия", "Остановить устройство"],
          ["POST", "/robots/{id}/resume", "сессия", "Запустить устройство"],
          ["POST", "/brain/decision", "токен", "Получить решение"],
          ["POST", "/executions", "токен", "Отправить результат выполнения"],
          ["GET", "/executions", "сессия", "Запросить результаты выполнения"],
          ["POST", "/telemetry", "токен", "Принять телеметрию"],
          ["POST/GET", "/tasks", "сессия", "Назначить / список задач"],
          ["GET", "/tasks/next", "токен", "Забрать следующую задачу"],
          ["POST", "/tasks/{id}/result", "токен", "Отчитаться о задаче"],
          ["GET", "/logs", "сессия", "Логи решений"],
          ["POST/GET/DELETE", "/api-keys", "сессия", "Управление API-ключами"],
        ],
      },
    ],
  },
  {
    id: "decision-format",
    title: "Формат решения",
    group: "Справочник",
    blocks: [
      { t: "p", text: "Мозг всегда возвращает строгий JSON — без свободного текста:" },
      {
        t: "code",
        code: `{
  "goal": "approach the object",
  "thought": "bottle detected on the table",
  "confidence": 0.91,
  "actions": [
    {"type": "move_forward", "value": 0.5},
    {"type": "turn_left", "value": 15}
  ]
}`,
      },
    ],
  },
  {
    id: "sdk",
    title: "SDK",
    group: "Справочник",
    blocks: [
      { t: "p", text: "Официальные SDK оборачивают все эндпоинты и дают одинаковый набор методов на каждом языке: регистрация, heartbeat, телеметрия, запрос решения, движок задач и обратная связь по исполнению. Подходит и любой другой язык с HTTP-клиентом — API остаётся тем же." },
      {
        t: "table",
        head: ["Язык", "Пакет", "Зависимости"],
        rows: [
          ["Python", "sdk/python — pip install mevratek-sdk", "httpx"],
          ["JavaScript / TypeScript", "sdk/javascript — @mevratek/sdk", "нет, используется fetch"],
          ["Go", "sdk/go — go get .../sdk/go/mevratek", "нет, только стандартная библиотека"],
          ["C++", "sdk/cpp — CMake, C++17", "libcurl"],
          ["C", "sdk/c — CMake, C99", "libcurl"],
        ],
      },
      { t: "p", text: "SDK для C и C++ несут собственный минимальный JSON-ридер, чтобы на встраиваемых платформах не тянуть внешнюю библиотеку разбора JSON. Исходники, README и тесты каждого пакета лежат в репозитории в каталоге sdk/." },
    ],
  },
];

const GROUPS = ["Начало", "Концепции", "Слой абстракции", "Справочник"];

function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((b, i) => {
        if (b.t === "p")
          return (
            <p key={i} className="mt-4 text-base leading-relaxed text-ink-soft">
              {b.text}
            </p>
          );
        if (b.t === "h3")
          return (
            <h3 key={i} className="mt-6 text-base font-semibold text-ink">
              {b.text}
            </h3>
          );
        if (b.t === "ul")
          return (
            <ul key={i} className="mt-4 space-y-2 text-base leading-relaxed text-ink-soft">
              {b.items.map((it, j) => (
                <li key={j} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent/50" />
                  <span>{it}</span>
                </li>
              ))}
            </ul>
          );
        if (b.t === "code")
          return (
            <pre
              key={i}
              className="mt-4 overflow-x-auto rounded-lg border border-line bg-surface p-4 font-mono text-xs leading-relaxed text-ink-soft"
            >
              {b.code}
            </pre>
          );
        return (
          <div key={i} className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                  {b.head.map((h) => (
                    <th key={h} className="py-2 pr-4 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {b.rows.map((r, j) => (
                  <tr key={j} className="border-b border-line/60">
                    {r.map((c, k) => (
                      <td
                        key={k}
                        className={`py-2 pr-4 align-top ${k === 1 ? "font-mono text-xs text-ink" : "text-ink-soft"}`}
                      >
                        {c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </>
  );
}

export default function DocumentationPage() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Главная", url: "/" },
          { name: "Документация", url: "/documentation" },
        ]}
      />
      <TechArticleJsonLd
        title="Документация"
        description={metadata.description as string}
        path="/documentation"
      />
      <div className="border-b border-line bg-surface">
        <Container className="py-14 sm:py-16">
          <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            <span className="h-px w-6 bg-accent/50" />
            Документация
          </div>
          <h1 className="max-w-3xl text-3xl font-semibold leading-[1.1] sm:text-4xl">
            Документация
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted">
            Как устроена платформа: архитектура, протокол управления, эндпоинты
            API и форматы. Та же документация доступна внутри дашборда.
          </p>
        </Container>
      </div>

      <Container className="py-14">
        <div className="grid gap-12 lg:grid-cols-[220px_1fr]">
          <nav aria-label="Содержание" className="hidden lg:block">
            <div className="sticky top-24 space-y-6 text-sm">
              {GROUPS.map((g) => (
                <div key={g}>
                  <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                    {g}
                  </div>
                  <ul className="mt-3 space-y-2">
                    {SECTIONS.filter((s) => s.group === g).map((s) => (
                      <li key={s.id}>
                        <a
                          href={`#${s.id}`}
                          className="text-ink-soft transition-colors hover:text-accent"
                        >
                          {s.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </nav>

          <div className="max-w-3xl">
            {SECTIONS.map((s) => (
              <section key={s.id} id={s.id} className="scroll-mt-24 pb-12">
                <h2 className="text-2xl font-semibold text-ink">{s.title}</h2>
                <Blocks blocks={s.blocks} />
              </section>
            ))}

            <div className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
              <div className="text-lg font-semibold text-ink">
                Готовы попробовать?
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Обсудим сценарий пилота и поможем с интеграцией через SDK.{" "}
                <Link
                  href="/contacts"
                  className="font-semibold text-accent hover:text-ink"
                >
                  Связаться с нами
                </Link>{" "}
                или прочитать{" "}
                <Link
                  href="/blog"
                  className="font-semibold text-accent hover:text-ink"
                >
                  статьи в блоге
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </Container>
    </>
  );
}

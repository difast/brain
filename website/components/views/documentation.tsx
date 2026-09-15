import Link from "next/link";

import { Container } from "@/components/ui";
import { BreadcrumbJsonLd, TechArticleJsonLd } from "@/components/schema";
import { t } from "@/content/ui";
import { localePath, type Dict, type Locale } from "@/i18n/config";

type Block =
  | { t: "p"; text: Dict }
  | { t: "h3"; text: Dict }
  | { t: "ul"; items: Dict[] }
  | { t: "code"; code: Dict }
  | { t: "table"; head: Dict[]; rows: Dict[][] };

interface DocSection {
  id: string;
  title: Dict;
  group: Dict;
}

/** `d` keeps the section data readable: one call instead of a nested literal. */
const d = (ru: string, en: string): Dict => ({ ru, en });

const GROUPS: Dict[] = [
  d("Начало", "Getting started"),
  d("Концепции", "Concepts"),
  d("Слой абстракции", "Abstraction layer"),
  d("Интеграции", "Integrations"),
  d("Справочник", "Reference"),
];

const SECTIONS: (DocSection & { blocks: Block[] })[] = [
  {
    id: "overview",
    title: d("Обзор", "Overview"),
    group: GROUPS[0],
    blocks: [
      {
        t: "p",
        text: d(
          "Mevratek — платформа, которая выступает «мозгом» для любого парка устройств. Устройства — тонкие клиенты: они передают кадры с камеры, телеметрию и текущую задачу, а сервер платформы возвращает структурированные команды действий. Всё принятие решений выполняется на сервере через AI Decision Engine с поддержкой YandexGPT, GigaChat, Claude и локальных моделей. Сервер разворачивается в инфраструктуре заказчика — данные не покидают периметр.",
          "Mevratek is the brain for a fleet of devices. The devices are thin clients: they send camera frames, telemetry and their current task, and the platform server returns structured action commands. All decision-making happens on the server, in an AI Decision Engine that supports YandexGPT, GigaChat, Claude and local models. The server is deployed on the customer's own infrastructure, so data never leaves the perimeter.",
        ),
      },
    ],
  },
  {
    id: "architecture",
    title: d("Архитектура", "Architecture"),
    group: GROUPS[0],
    blocks: [
      {
        t: "p",
        text: d(
          "Чистая слоистая архитектура. Логические сервисы внутри единого разворачиваемого бэкенда:",
          "A clean layered architecture. Logical services inside one deployable backend:",
        ),
      },
      {
        t: "ul",
        items: [
          d(
            "API-шлюз — аутентификация устройств и пользователей, маршрутизация.",
            "API gateway — device and user authentication, routing.",
          ),
          d(
            "Движок решений — собирает промпт из capabilities устройства, вызывает AI-движок, возвращает строгий JSON.",
            "Decision engine — builds a prompt from the device's capabilities, calls the AI engine, returns strict JSON.",
          ),
          d(
            "Реестр устройств — id, тип, доступные команды, статус подключения.",
            "Device registry — id, type, available commands, connection status.",
          ),
          d(
            "Движок задач — назначение, очередь, выдача и завершение задач.",
            "Task engine — assignment, queue, hand-out and completion.",
          ),
          d(
            "Память — история решений и задач, результаты выполнения.",
            "Memory — the history of decisions and tasks, and their execution results.",
          ),
          d(
            "Телеметрия — заряд, скорость, координаты, ошибки.",
            "Telemetry — battery, speed, position, errors.",
          ),
        ],
      },
      {
        t: "p",
        text: d(
          "Устройство описывается полностью данными (тип + capabilities), поэтому новые типы устройств не требуют изменений ядра.",
          "A device is described entirely by data (its type plus its capabilities), so a new device type needs no change to the core.",
        ),
      },
    ],
  },
  {
    id: "quickstart",
    title: d("Быстрый старт", "Quick start"),
    group: GROUPS[0],
    blocks: [
      {
        t: "p",
        text: d(
          "Подключите устройство за три вызова (SDK не обязателен). Регистрация авторизуется сессией дашборда или API-ключом организации:",
          "Connect a device in a couple of calls; the SDK is optional. Registration is authorised by a dashboard session or by the organization's API key:",
        ),
      },
      {
        t: "code",
        code: d(
          `# 1. Регистрация (один раз) — возвращает bearer-токен устройства
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
          `# 1. Register once — returns the device's bearer token
curl -X POST https://api.mevratek.ru/api/v1/robots/register \\
  -H "Authorization: Bearer <ORGANIZATION_API_KEY>" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"rover-01","robot_type":"rover",
       "capabilities":[{"type":"move_forward"},{"type":"stop"}]}'

# 2. Ask the brain what to do next
curl -X POST https://api.mevratek.ru/api/v1/brain/decision \\
  -H "Authorization: Bearer <DEVICE_TOKEN>" \\
  -H "Content-Type: application/json" \\
  -d '{"task":"approach the bottle","state":{"battery":80}}'`,
        ),
      },
    ],
  },
  {
    id: "robots",
    title: d("Устройства и реестр", "Devices and the registry"),
    group: GROUPS[1],
    blocks: [
      {
        t: "p",
        text: d(
          "Устройство регистрируется один раз: имя, robot_type и список capabilities — команд, которые оно понимает, каждая с необязательными ограничениями значения.",
          "A device registers once, with a name, a robot_type and a list of capabilities — the commands it understands, each with optional value constraints.",
        ),
      },
      {
        t: "p",
        text: d(
          "Регистрация возвращает token (bearer) и одноразовый api_key. Мозг возвращает только команды из списка capabilities самого устройства. Присутствие (онлайн/офлайн) отслеживается по heartbeat.",
          "Registration returns a bearer token and a one-time api_key. The brain only ever returns commands from that device's own capability list. Presence (online or offline) is tracked from the heartbeat.",
        ),
      },
    ],
  },
  {
    id: "decisions",
    title: d("Движок решений", "Decision engine"),
    group: GROUPS[1],
    blocks: [
      {
        t: "p",
        text: d(
          "POST /brain/decision принимает задачу, необязательный кадр (image_b64 или frame_url) и текущее состояние. Мозг собирает промпт из capabilities устройства и недавних решений, вызывает AI-движок со строгой JSON-схемой, валидирует ответ и отбрасывает неподдерживаемые команды. Именно этот вызов разработчик встраивает в код своего устройства — через SDK или обычный HTTP.",
          "POST /brain/decision takes a task, an optional frame (image_b64 or frame_url) and the current state. The brain builds a prompt from the device's capabilities and its recent decisions, calls the AI engine against a strict JSON schema, validates the answer and drops any unsupported command. This is the call a developer embeds in their device's own code, through the SDK or over plain HTTP.",
        ),
      },
    ],
  },
  {
    id: "tasks",
    title: d("Движок задач", "Task engine"),
    group: GROUPS[1],
    blocks: [
      {
        t: "p",
        text: d(
          "Задачи создаются сверху (оператор или API назначает их устройству с приоритетом) или снизу — из собственного запроса решения устройства. Устройства забирают следующую задачу из очереди и отчитываются о результате.",
          "Tasks are created top-down — an operator or the API assigns one to a device with a priority — or bottom-up, from the device's own decision request. Devices pull the next task from the queue and report the result.",
        ),
      },
    ],
  },
  {
    id: "telemetry",
    title: d("Телеметрия", "Telemetry"),
    group: GROUPS[1],
    blocks: [
      {
        t: "p",
        text: d(
          "Устройства шлют показания в POST /telemetry: заряд, скорость, координаты (x/y/z), список ошибок и любые дополнительные сенсоры. Последние значения показываются на странице устройства в дашборде.",
          "Devices post readings to POST /telemetry: battery, speed, position (x/y/z), a list of errors and any additional sensors. The latest values appear on the device's page in the dashboard.",
        ),
      },
    ],
  },
  {
    id: "accounts",
    title: d("Аккаунты и организации", "Accounts and organizations"),
    group: GROUPS[1],
    blocks: [
      {
        t: "p",
        text: d(
          "Дашборд мультитенантный. Каждое устройство, задача, лог, показание телеметрии и API-ключ принадлежат организации, и каждый запрос ограничен организацией вызывающего — одна организация никогда не видит данные другой.",
          "The dashboard is multi-tenant. Every device, task, log entry, telemetry reading and API key belongs to an organization, and every request is scoped to the caller's organization — one organization never sees another's data.",
        ),
      },
      {
        t: "p",
        text: d(
          "Пользователи не регистрируются сами: вы получаете ссылку-приглашение, задаёте свой пароль и затем входите по email и паролю.",
          "Users do not sign themselves up: you receive an invitation link, set your own password, and then sign in with your email and password.",
        ),
      },
    ],
  },
  {
    id: "auth",
    title: d("Аутентификация", "Authentication"),
    group: GROUPS[1],
    blocks: [
      {
        t: "p",
        text: d(
          "Аутентифицируются два типа вызывающих. Устройства используют bearer-токен из регистрации и действуют «от себя» — robot_id берётся из токена, а не из тела запроса. Пользователи дашборда входят по email + паролю (POST /auth/login) и получают токен сессии, ограниченный их организацией.",
          "There are two kinds of caller. Devices use the bearer token from registration and always act as themselves — the robot_id comes from the token, never from the request body. Dashboard users sign in with an email and password (POST /auth/login) and receive a session token scoped to their organization.",
        ),
      },
      { t: "code", code: d("Authorization: Bearer <token>", "Authorization: Bearer <token>") },
    ],
  },
  {
    id: "apikeys",
    title: d("API-ключи", "API keys"),
    group: GROUPS[1],
    blocks: [
      {
        t: "p",
        text: d(
          "Каждая организация может сгенерировать API-ключи в дашборде. Секрет показывается один раз; хранится только хэш и короткий префикс. API-ключ авторизует регистрацию устройства вне дашборда (SDK или прошивка устройства) — передавайте его как bearer-токен. Ключи ограничены своей организацией и отзываются в любой момент.",
          "Each organization can generate API keys in the dashboard. The secret is shown once; only a hash and a short prefix are stored. An API key authorises device registration outside the dashboard — from the SDK or from device firmware — and is passed as a bearer token. Keys are scoped to their organization and can be revoked at any time.",
        ),
      },
      {
        t: "code",
        code: d("Authorization: Bearer cbk_xxxxxxxx...", "Authorization: Bearer cbk_xxxxxxxx..."),
      },
    ],
  },
  {
    id: "dal",
    title: d("Слой абстракции устройств (DAL)", "Device Abstraction Layer (DAL)"),
    group: GROUPS[2],
    blocks: [
      {
        t: "p",
        text: d(
          "DAL позволяет платформе управлять любым устройством через единый протокол. LLM никогда не выдаёт аппаратные команды — она выдаёт универсальные действия, а платформа транслирует их в собственные низкоуровневые команды устройства на основе его capabilities.",
          "The DAL lets the platform drive any device through one protocol. The language model never emits a hardware command; it emits generic actions, and the platform translates those into the device's own low-level commands using its capability list.",
        ),
      },
      { t: "h3", text: d("Универсальные действия", "Generic actions") },
      {
        t: "p",
        text: d(
          "Устройство объявляет низкоуровневые capabilities (например move_forward, arm_grasp, camera_capture). Из них платформа выводит универсальные действия (grasp, release, inspect, say). Мозгу показываются только они.",
          "A device declares low-level capabilities (move_forward, arm_grasp, camera_capture and so on). From those the platform derives generic actions (grasp, release, inspect, say). Only those are shown to the brain.",
        ),
      },
      { t: "h3", text: d("Транслятор действий", "Action translator") },
      {
        t: "p",
        text: d(
          "Транслятор сопоставляет каждое универсальное действие с первой поддерживаемой устройством командой, присваивая уникальный action_id для обратной связи. Неподдерживаемые действия отбрасываются.",
          "The translator maps each generic action onto the first command the device supports, assigning a unique action_id for the feedback loop. Unsupported actions are dropped.",
        ),
      },
      { t: "h3", text: d("Профиль устройства", "Device profile") },
      {
        t: "p",
        text: d(
          "GET /robots/{id}/profile возвращает единое описание устройства: robot_type, capabilities (низкоуровневые команды), supported_commands, supported_actions (универсальные действия), firmware_version и protocol_version.",
          "GET /robots/{id}/profile returns one description of the device: robot_type, capabilities (its low-level commands), supported_commands, supported_actions (the generic ones), firmware_version and protocol_version.",
        ),
      },
      { t: "h3", text: d("Обратная связь о выполнении", "Execution feedback") },
      {
        t: "p",
        text: d(
          "После выполнения команды устройство сообщает результат в POST /executions (action_id, status: success|failed, duration_ms, error). Свежая обратная связь подаётся в следующее решение — мозг учится на том, что произошло на самом деле.",
          "After running a command the device reports the result to POST /executions (action_id, status: success|failed, duration_ms, error). That feedback is fed into the next decision, so the brain works from what actually happened.",
        ),
      },
    ],
  },
  {
    id: "model-router",
    title: d("Выбор модели", "Choosing a model"),
    group: GROUPS[2],
    blocks: [
      {
        t: "p",
        text: d(
          "Движок решений не зависит от конкретного вендора: контракт «на входе — задача и возможности устройства, на выходе — строгий JSON с действиями» одинаков для любой модели.",
          "The decision engine depends on no particular vendor: the contract — task and device capabilities in, strict JSON actions out — is the same for every model.",
        ),
      },
      {
        t: "ul",
        items: [
          d("YandexGPT и GigaChat — российские модели.", "YandexGPT and GigaChat — Russian models."),
          d("Claude и OpenAI — при необходимости.", "Claude and OpenAI, where they are appropriate."),
          d(
            "Локальные модели (Ollama, vLLM, LM Studio) — для закрытого контура, когда данные не должны покидать инфраструктуру.",
            "Local models (Ollama, vLLM, LM Studio) — for a closed perimeter, where data must not leave the infrastructure.",
          ),
        ],
      },
      {
        t: "p",
        text: d(
          "Модель можно сменить, не меняя код интеграции: бизнес-логика устройства остаётся прежней.",
          "The model can be swapped without touching the integration code: the device's business logic stays as it is.",
        ),
      },
    ],
  },
  {
    id: "mcp",
    title: d("MCP-коннектор", "MCP connector"),
    group: GROUPS[3],
    blocks: [
      {
        t: "p",
        text: d(
          "Парком можно управлять из Claude или ChatGPT: платформа поднимает MCP-сервер по адресу https://api.mevratek.ru/mcp с транспортом Streamable HTTP и авторизацией OAuth 2.0 с PKCE. Ассистент отвечает на вопросы о состоянии устройств, читает журнал решений, ставит задачи и запускает симуляции — без открытия дашборда.",
          "The fleet can be operated from Claude or ChatGPT: the platform exposes an MCP server at https://api.mevratek.ru/mcp over Streamable HTTP, authorised with OAuth 2.0 and PKCE. The assistant answers questions about device state, reads the decision journal, queues tasks and runs simulations — without the dashboard being opened.",
        ),
      },
      {
        t: "ul",
        items: [
          d(
            "Шесть инструментов: get_devices, get_device_status, get_telemetry, get_decision_logs, send_task, run_simulator.",
            "Six tools: get_devices, get_device_status, get_telemetry, get_decision_logs, send_task, run_simulator.",
          ),
          d(
            "Токен коннектора ограничен этими инструментами и не может обращаться к API дашборда.",
            "The connector's token is scoped to those tools and cannot reach the dashboard API.",
          ),
          d(
            "Организация определяется на сервере из аккаунта, подтвердившего подключение, — а не из того, что прислал ассистент.",
            "The organization is resolved server-side from the account that approved the connection, not from anything the assistant sends.",
          ),
          d(
            "Доступ отзывается в разделе «Аккаунт → Сессии»: коннектор виден как отдельная сессия.",
            "Access is revoked under Account → Sessions, where the connector appears as its own session.",
          ),
        ],
      },
      {
        t: "p",
        text: d(
          "Полная инструкция по подключению — на странице MCP-коннектора.",
          "The full connection guide is on the MCP connector page.",
        ),
      },
    ],
  },
  {
    id: "endpoints",
    title: d("Эндпоинты API", "API endpoints"),
    group: GROUPS[4],
    blocks: [
      {
        t: "table",
        head: [
          d("Метод", "Method"),
          d("Путь", "Path"),
          d("Авториз.", "Auth"),
          d("Описание", "Description"),
        ],
        rows: [
          [d("POST", "POST"), d("/auth/login", "/auth/login"), d("—", "—"), d("Вход (email + пароль)", "Sign in (email + password)")],
          [d("GET", "GET"), d("/auth/me", "/auth/me"), d("сессия", "session"), d("Текущий пользователь + организация", "Current user and organization")],
          [d("POST", "POST"), d("/robots/register", "/robots/register"), d("сессия / ключ", "session / key"), d("Регистрация устройства", "Register a device")],
          [d("POST", "POST"), d("/robots/heartbeat", "/robots/heartbeat"), d("токен", "token"), d("Сигнал «жив»", "Liveness signal")],
          [d("GET", "GET"), d("/robots", "/robots"), d("сессия", "session"), d("Список устройств", "List devices")],
          [d("GET", "GET"), d("/robots/{id}", "/robots/{id}"), d("сессия", "session"), d("Детали устройства", "Device details")],
          [d("GET", "GET"), d("/robots/{id}/profile", "/robots/{id}/profile"), d("сессия", "session"), d("Профиль устройства (DAL)", "Device profile (DAL)")],
          [d("POST", "POST"), d("/robots/{id}/pause", "/robots/{id}/pause"), d("сессия", "session"), d("Остановить устройство", "Pause a device")],
          [d("POST", "POST"), d("/robots/{id}/resume", "/robots/{id}/resume"), d("сессия", "session"), d("Запустить устройство", "Resume a device")],
          [d("POST", "POST"), d("/brain/decision", "/brain/decision"), d("токен", "token"), d("Получить решение", "Get a decision")],
          [d("POST", "POST"), d("/executions", "/executions"), d("токен", "token"), d("Отправить результат выполнения", "Report an execution result")],
          [d("GET", "GET"), d("/executions", "/executions"), d("сессия", "session"), d("Запросить результаты выполнения", "Query execution results")],
          [d("POST", "POST"), d("/telemetry", "/telemetry"), d("токен", "token"), d("Принять телеметрию", "Accept telemetry")],
          [d("POST/GET", "POST/GET"), d("/tasks", "/tasks"), d("сессия", "session"), d("Назначить / список задач", "Assign / list tasks")],
          [d("GET", "GET"), d("/tasks/next", "/tasks/next"), d("токен", "token"), d("Забрать следующую задачу", "Take the next task")],
          [d("POST", "POST"), d("/tasks/{id}/result", "/tasks/{id}/result"), d("токен", "token"), d("Отчитаться о задаче", "Report on a task")],
          [d("GET", "GET"), d("/logs", "/logs"), d("сессия", "session"), d("Логи решений", "Decision logs")],
          [d("POST/GET/DELETE", "POST/GET/DELETE"), d("/api-keys", "/api-keys"), d("сессия", "session"), d("Управление API-ключами", "Manage API keys")],
          [d("POST/GET/DELETE", "POST/GET/DELETE"), d("/mcp", "/mcp"), d("MCP-токен", "MCP token"), d("MCP-сервер (Streamable HTTP)", "MCP server (Streamable HTTP)")],
        ],
      },
    ],
  },
  {
    id: "decision-format",
    title: d("Формат решения", "Decision format"),
    group: GROUPS[4],
    blocks: [
      {
        t: "p",
        text: d(
          "Мозг всегда возвращает строгий JSON — без свободного текста:",
          "The brain always returns strict JSON, never free text:",
        ),
      },
      {
        t: "code",
        code: d(
          `{
  "goal": "approach the object",
  "thought": "bottle detected on the table",
  "confidence": 0.91,
  "actions": [
    {"type": "move_forward", "value": 0.5},
    {"type": "turn_left", "value": 15}
  ]
}`,
          `{
  "goal": "approach the object",
  "thought": "bottle detected on the table",
  "confidence": 0.91,
  "actions": [
    {"type": "move_forward", "value": 0.5},
    {"type": "turn_left", "value": 15}
  ]
}`,
        ),
      },
    ],
  },
  {
    id: "sdk",
    title: d("SDK", "SDKs"),
    group: GROUPS[4],
    blocks: [
      {
        t: "p",
        text: d(
          "Официальные SDK оборачивают все эндпоинты и дают одинаковый набор методов на каждом языке: регистрация, heartbeat, телеметрия, запрос решения, движок задач и обратная связь по исполнению. Подходит и любой другой язык с HTTP-клиентом — API остаётся тем же.",
          "The official SDKs wrap every endpoint and offer the same set of methods in each language: registration, heartbeat, telemetry, decision requests, the task engine and execution feedback. Any other language with an HTTP client works just as well — the API is the same.",
        ),
      },
      {
        t: "table",
        head: [d("Язык", "Language"), d("Пакет", "Package"), d("Зависимости", "Dependencies")],
        rows: [
          [d("Python", "Python"), d("sdk/python — pip install mevratek-sdk", "sdk/python — pip install mevratek-sdk"), d("httpx", "httpx")],
          [d("JavaScript / TypeScript", "JavaScript / TypeScript"), d("sdk/javascript — @mevratek/sdk", "sdk/javascript — @mevratek/sdk"), d("нет, используется fetch", "none, it uses fetch")],
          [d("Go", "Go"), d("sdk/go — go get .../sdk/go/mevratek", "sdk/go — go get .../sdk/go/mevratek"), d("нет, только стандартная библиотека", "none, standard library only")],
          [d("C++", "C++"), d("sdk/cpp — CMake, C++17", "sdk/cpp — CMake, C++17"), d("libcurl", "libcurl")],
          [d("C", "C"), d("sdk/c — CMake, C99", "sdk/c — CMake, C99"), d("libcurl", "libcurl")],
        ],
      },
      {
        t: "p",
        text: d(
          "SDK для C и C++ несут собственный минимальный JSON-ридер, чтобы на встраиваемых платформах не тянуть внешнюю библиотеку разбора JSON. Исходники, README и тесты каждого пакета лежат в репозитории в каталоге sdk/.",
          "The C and C++ SDKs carry their own minimal JSON reader so that an embedded target does not have to pull in an external JSON library. The sources, README and tests for each package are in the repository under sdk/.",
        ),
      },
    ],
  },
];

export const DOCS_COPY = {
  ru: {
    metaTitle: "Документация",
    metaDescription:
      "Техническая документация Mevratek: архитектура, Device Abstraction Layer, движок решений, задачи, телеметрия, аутентификация и изоляция данных, MCP-коннектор, эндпоинты API, форматы и SDK.",
    crumb: "Документация",
    eyebrow: "Документация",
    h1: "Документация",
    lede:
      "Как устроена платформа: архитектура, протокол управления, эндпоинты API и форматы. Та же документация доступна внутри дашборда.",
    toc: "Содержание",
    ctaTitle: "Готовы попробовать?",
    ctaBefore: "Обсудим сценарий пилота и поможем с интеграцией через SDK. ",
    ctaContact: "Связаться с нами",
    ctaMiddle: " или прочитать ",
    ctaBlog: "статьи в блоге",
    ctaAfter: ".",
  },
  en: {
    metaTitle: "Documentation",
    metaDescription:
      "Mevratek technical documentation: the architecture, the Device Abstraction Layer, the decision engine, tasks, telemetry, authentication and data isolation, the MCP connector, the API endpoints, formats and SDKs.",
    crumb: "Documentation",
    eyebrow: "Documentation",
    h1: "Documentation",
    lede:
      "How the platform is built: the architecture, the control protocol, the API endpoints and the formats. The same documentation is available inside the dashboard.",
    toc: "Contents",
    ctaTitle: "Ready to try it?",
    ctaBefore: "We will work through a pilot scenario and help with the SDK integration. ",
    ctaContact: "Get in touch",
    ctaMiddle: " or read the ",
    ctaBlog: "articles on the blog",
    ctaAfter: ".",
  },
} as const;

function Blocks({ blocks, locale }: { blocks: Block[]; locale: Locale }) {
  return (
    <>
      {blocks.map((b, i) => {
        if (b.t === "p")
          return (
            <p key={i} className="mt-4 text-base leading-relaxed text-ink-soft">
              {b.text[locale]}
            </p>
          );
        if (b.t === "h3")
          return (
            <h3 key={i} className="mt-6 text-base font-semibold text-ink">
              {b.text[locale]}
            </h3>
          );
        if (b.t === "ul")
          return (
            <ul
              key={i}
              className="mt-4 space-y-2 text-base leading-relaxed text-ink-soft"
            >
              {b.items.map((it, j) => (
                <li key={j} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent/50" />
                  <span>{it[locale]}</span>
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
              {b.code[locale]}
            </pre>
          );
        return (
          <div key={i} className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                  {b.head.map((h) => (
                    <th key={h.ru} className="py-2 pr-4 font-semibold">
                      {h[locale]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {b.rows.map((r, j) => (
                  <tr key={j} className="border-b border-line/60">
                    {r.map((cell, k) => (
                      <td
                        key={k}
                        className={`py-2 pr-4 align-top ${
                          k === 1 ? "font-mono text-xs text-ink" : "text-ink-soft"
                        }`}
                      >
                        {cell[locale]}
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

export function DocumentationView({ locale }: { locale: Locale }) {
  const c = DOCS_COPY[locale];
  const p = (path: string) => localePath(locale, path);

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: t(locale, "home"), url: p("/") },
          { name: c.crumb, url: p("/documentation") },
        ]}
      />
      <TechArticleJsonLd
        title={c.metaTitle}
        description={c.metaDescription}
        path="/documentation"
        locale={locale}
      />
      <div className="border-b border-line bg-surface">
        <Container className="py-14 sm:py-16">
          <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            <span className="h-px w-6 bg-accent/50" />
            {c.eyebrow}
          </div>
          <h1 className="max-w-3xl text-3xl font-semibold leading-[1.1] sm:text-4xl">
            {c.h1}
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted">
            {c.lede}
          </p>
        </Container>
      </div>

      <Container className="py-14">
        <div className="grid gap-12 lg:grid-cols-[220px_1fr]">
          <nav aria-label={c.toc} className="hidden lg:block">
            <div className="sticky top-24 space-y-6 text-sm">
              {GROUPS.map((g) => (
                <div key={g.ru}>
                  <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                    {g[locale]}
                  </div>
                  <ul className="mt-3 space-y-2">
                    {SECTIONS.filter((s) => s.group.ru === g.ru).map((s) => (
                      <li key={s.id}>
                        <a
                          href={`#${s.id}`}
                          className="text-ink-soft transition-colors hover:text-accent"
                        >
                          {s.title[locale]}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </nav>

          {/* min-w-0: a grid child refuses to shrink below its content by
              default, so the widest code block or table here decided the
              column's width and pushed the whole page 132px past a phone
              screen — while the overflow-x-auto meant to catch it never
              engaged, because the element was never constrained. */}
          <div className="min-w-0 max-w-3xl">
            {SECTIONS.map((s) => (
              <section key={s.id} id={s.id} className="scroll-mt-24 pb-12">
                <h2 className="text-2xl font-semibold text-ink">
                  {s.title[locale]}
                </h2>
                <Blocks blocks={s.blocks} locale={locale} />
              </section>
            ))}

            <div className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
              <div className="text-lg font-semibold text-ink">{c.ctaTitle}</div>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {c.ctaBefore}
                <Link
                  href={p("/contacts")}
                  className="font-semibold text-accent hover:text-ink"
                >
                  {c.ctaContact}
                </Link>
                {c.ctaMiddle}
                <Link
                  href={p("/blog")}
                  className="font-semibold text-accent hover:text-ink"
                >
                  {c.ctaBlog}
                </Link>
                {c.ctaAfter}
              </p>
            </div>
          </div>
        </div>
      </Container>
    </>
  );
}

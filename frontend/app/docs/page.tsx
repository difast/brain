"use client";

import { API_BASE } from "@/lib/api";
import { useT } from "@/lib/i18n";

const SWAGGER = API_BASE.replace(/\/api\/v1$/, "/docs");

function Code({ children }: { children: string }) {
  return <pre className="mono">{children}</pre>;
}

interface Endpoint {
  m: string;
  p: string;
  a: string;
  d: string;
}

interface Docs {
  groups: { gs: string; concepts: string; dal: string; ref: string };
  nav: Record<string, string>;
  overview: { title: string; p1: string; baseUrl: string; interactive: string };
  architecture: { title: string; lead: string; items: string[]; note: string };
  quickstart: { title: string; lead: string; afterPre: string; afterSdk: string; afterMid: string; afterSim: string };
  robots: { title: string; p1: string; p2: string };
  decisions: { title: string; p1: string };
  tasks: { title: string; p1: string };
  telemetry: { title: string; p1: string };
  memory: { title: string; p1: string };
  accounts: { title: string; p1: string; p2: string };
  auth: { title: string; p1: string };
  apikeys: { title: string; p1: string };
  dal: { title: string; p1: string };
  universal: { title: string; p1: string };
  translator: { title: string; p1: string; p2: string };
  deviceProfile: { title: string; p1: string; items: string[]; p2: string };
  exec: { title: string; p1: string; p2: string };
  memlearn: { title: string; p1: string };
  router: { title: string; p1: string; items: string[]; ruTitle: string; ruBody: string };
  endpoints: { title: string; colM: string; colP: string; colA: string; colD: string; rows: Endpoint[]; swagger: string };
  decisionFormat: { title: string; p1: string };
  sdk: { title: string; p1: string; sdkLink: string; swaggerLink: string };
  dashboard: { title: string; items: string[] };
  deployment: { title: string; p1: string };
  faq: { title: string; q1: string; a1: string; q2: string; a2: string; q3: string; a3: string };
}

const EN: Docs = {
  groups: { gs: "Getting started", concepts: "Concepts", dal: "Device Abstraction Layer", ref: "Reference" },
  nav: {
    overview: "Overview", architecture: "Architecture", quickstart: "Quick start",
    robots: "Devices & Registry", decisions: "Decision Engine", tasks: "Task Engine",
    telemetry: "Telemetry", memory: "Memory", accounts: "Accounts & Organizations",
    auth: "Authentication", apikeys: "API Keys",
    dal: "DAL overview", "universal-actions": "Universal Actions", translator: "Action Translator",
    "device-profile": "Device Profile", "execution-feedback": "Execution Feedback",
    "memory-learning": "Memory & Learning", "model-router": "Model choice",
    endpoints: "API Endpoints", "decision-format": "Decision Format", sdk: "SDK",
    dashboard: "Dashboard", deployment: "Deployment", faq: "FAQ",
  },
  overview: {
    title: "Overview",
    p1: "Mevratek is a cloud platform that acts as the brain for any fleet of devices. Devices are thin clients: they stream camera frames, telemetry and their current task, and the cloud returns structured action commands. All decision-making runs in the cloud via the AI Decision Engine (supports YandexGPT, GigaChat, Claude and local models).",
    baseUrl: "Base API URL:",
    interactive: "Interactive API:",
  },
  architecture: {
    title: "Architecture",
    lead: "Clean, layered design. Logical services:",
    items: [
      "API Gateway — device authentication, routing.",
      "Decision Engine — builds the prompt from the device's capabilities, calls the AI engine, returns strict JSON.",
      "Device Registry — id, type, available commands, connection status.",
      "Task Engine — assign / queue / pull / complete tasks.",
      "Memory — decision and task history, results.",
      "Telemetry — battery, speed, coordinates, errors.",
    ],
    note: "A device is described entirely by data (its type + capabilities), so new device types need no core changes.",
  },
  quickstart: {
    title: "Quick start",
    lead: "Connect a device in three calls (no SDK required):",
    afterPre: "Or use the ",
    afterSdk: "Python SDK",
    afterMid: ", or try it live in the ",
    afterSim: "Simulator",
  },
  robots: {
    title: "Devices & Registry",
    p1: "A device registers once with a name, robot_type and a list of capabilities — the commands it understands, each with optional value constraints:",
    p2: "Registration returns a token (bearer) and a one-time api_key. The brain only ever returns commands from the device's own capability list. Presence (online/offline) is tracked by heartbeats.",
  },
  decisions: {
    title: "Decision Engine",
    p1: "POST /brain/decision takes the task, an optional camera frame (image_b64 or frame_url) and the current state. The brain assembles a prompt from the device's capabilities and recent decisions, calls the AI engine with a strict JSON schema, validates the output and filters out any unsupported command. This is the call a developer embeds in the device's own code (via the SDK bot.decide(...) or plain HTTP) — the Simulator simply demonstrates it in the UI.",
  },
  tasks: {
    title: "Task Engine",
    p1: "Tasks can be created top-down (operator/API assigns them to a device with a priority) or appear bottom-up from a device's own decision request. Devices pull their next queued task and report the result.",
  },
  telemetry: {
    title: "Telemetry",
    p1: "Devices push readings to POST /telemetry: battery, speed, coordinates (x/y/z), error list and any extra sensor channels. The latest values surface on the device's dashboard page.",
  },
  memory: {
    title: "Memory",
    p1: "Every decision is persisted (goal, thought, confidence, actions, frame, model, latency) along with task history — the full audit trail, available via GET /logs and the dashboard.",
  },
  accounts: {
    title: "Accounts & Organizations",
    p1: "The dashboard is multi-tenant. Every device, task, log, telemetry reading and API key belongs to an organization, and each request is scoped to the caller's organization — one organization never sees another's data. Users do not self-register: you receive an invite link, set your own password, and then sign in with email + password.",
    p2: "Device registration is org-scoped too: it is authorized by a dashboard session or by an organization API key (Authorization: Bearer cbk_…), and the new device is attached to that organization.",
  },
  auth: {
    title: "Authentication",
    p1: "Two kinds of caller authenticate here. Devices use the bearer token from registration and act as themselves — the robot_id comes from the token, never the request body. Dashboard users sign in with email + password (POST /auth/login) and receive a session token scoped to their organization. Send the relevant token on every call: Authorization: Bearer <token>",
  },
  apikeys: {
    title: "API Keys",
    p1: "Each organization can generate API keys from the API tab. The secret is shown once; only a hash and a short prefix are stored. An API key authorizes device registration from outside the dashboard (SDK / device firmware) — send it as a bearer token. Keys are scoped to their organization and can be revoked at any time.",
  },
  dal: {
    title: "Device Abstraction Layer (DAL)",
    p1: "The DAL lets the cloud control any device through one protocol. The LLM never emits hardware commands — it emits universal actions, and the platform translates them into each device's own low-level commands based on its declared capabilities. New device types plug in with no changes to the core.",
  },
  universal: {
    title: "Universal Actions",
    p1: "A device declares low-level capabilities (e.g. move_forward, arm_grasp, camera_capture, speaker_say, light_on). From these the platform derives the universal actions the device can perform (e.g. grasp, release, inspect, say). The brain is shown only these and returns universal actions.",
  },
  translator: {
    title: "Action Translator",
    p1: "The translator maps each universal action to the first device command the device supports, attaching a unique action_id (used for execution feedback). Unsupported actions are dropped.",
    p2: "The device receives only commands it can actually run; the response includes both actions (device commands) and universal_actions (what the brain decided).",
  },
  deviceProfile: {
    title: "Device Profile",
    p1: "GET /robots/{id}/profile returns the unified device description:",
    items: ["robot_type", "capabilities (low-level commands)", "supported_commands", "supported_actions (universal actions)", "firmware_version, protocol_version"],
    p2: "Set firmware_version / protocol_version at registration.",
  },
  exec: {
    title: "Execution Feedback",
    p1: "After running a command, the device reports the outcome to POST /executions (action_id, status: success|failed, duration_ms, error).",
    p2: "Recent feedback is fed back into the next decision so the brain learns from what actually happened.",
  },
  memlearn: {
    title: "Memory & Learning",
    p1: "Every decision is stored with its full context for learning: the input state, the decision (universal + translated device actions), and the linked execution results. This history powers short-term context and adaptation over time.",
  },
  router: {
    title: "Model choice",
    p1: "The Decision Engine is provider-agnostic — it doesn't depend on any single vendor. The contract (task + device capabilities in, strict JSON actions out) is the same for any model:",
    items: [
      "YandexGPT and GigaChat — Russian models",
      "Claude and OpenAI — when needed",
      "Local models (Ollama, vLLM, LM Studio) — for a closed contour where data must not leave your infrastructure",
    ],
    ruTitle: "Russian models & local / on-prem",
    ruBody: "Mevratek is engine-neutral. The same platform works with YandexGPT, GigaChat, Claude, OpenAI or a fully local model — switching engines does not change your integration code, so the device's business logic stays the same.",
  },
  endpoints: {
    title: "API Endpoints",
    colM: "Method", colP: "Path", colA: "Auth", colD: "Description",
    rows: [
      { m: "POST", p: "/auth/login", a: "—", d: "Sign in (email + password)" },
      { m: "GET", p: "/auth/me", a: "session", d: "Current user + organization" },
      { m: "POST", p: "/robots/register", a: "session / key", d: "Register a device" },
      { m: "POST", p: "/robots/heartbeat", a: "token", d: "Report liveness" },
      { m: "GET", p: "/robots", a: "session", d: "List devices" },
      { m: "GET", p: "/robots/{id}", a: "session", d: "Device detail" },
      { m: "GET", p: "/robots/{id}/profile", a: "session", d: "Device profile (DAL)" },
      { m: "POST", p: "/robots/{id}/pause", a: "session", d: "Pause a device" },
      { m: "POST", p: "/robots/{id}/resume", a: "session", d: "Resume a device" },
      { m: "POST", p: "/brain/decision", a: "token", d: "Get a decision" },
      { m: "POST", p: "/executions", a: "token", d: "Report execution feedback" },
      { m: "GET", p: "/executions", a: "session", d: "Query execution feedback" },
      { m: "POST", p: "/telemetry", a: "token", d: "Ingest telemetry" },
      { m: "POST/GET", p: "/tasks", a: "session", d: "Assign / list tasks" },
      { m: "GET", p: "/tasks/next", a: "token", d: "Pull next queued task" },
      { m: "POST", p: "/tasks/{id}/result", a: "token", d: "Report task result" },
      { m: "GET", p: "/logs", a: "session", d: "Decision logs" },
      { m: "POST/GET/DELETE", p: "/api-keys", a: "session", d: "API key management" },
    ],
    swagger: "Full interactive reference:",
  },
  decisionFormat: {
    title: "Decision Format",
    p1: "The brain always returns strict JSON — no free text:",
  },
  sdk: {
    title: "SDK",
    p1: "The official Python SDK wraps every endpoint. See the ",
    sdkLink: "SDK tab",
    swaggerLink: " for install and usage. Any language with an HTTP client works too.",
  },
  dashboard: {
    title: "Dashboard",
    items: [
      "Devices — fleet overview and live status.",
      "Decision Logs — every decision the brain made.",
      "Tasks — assign tasks and watch the queue.",
      "Simulator — register a device and request a decision.",
      "API — generate and revoke API keys.",
      "SDK — install and usage.",
      "Click a device to see its own tasks, decisions, telemetry and a Pause/Resume control.",
    ],
  },
  deployment: {
    title: "Deployment",
    p1: "The platform runs as a single backend service + PostgreSQL (Redis not required; object storage optional). The dashboard is an optional second service. It can be fully self-hosted, including a completely local / air-gapped (on-premise) deployment where no data leaves your infrastructure.",
  },
  faq: {
    title: "FAQ",
    q1: "Do I have to add devices manually?",
    a1: "No. Devices self-register via the API from their own code (the Simulator is only for testing).",
    q2: "What if no AI engine is configured?",
    a2: "The brain runs in deterministic mock mode, so the whole platform works offline. Configure any engine (YandexGPT, GigaChat, Claude, OpenAI or a local model) to get real decisions.",
    q3: "Can different device types connect?",
    a3: "Yes — a device is defined by its capabilities data; the core never changes.",
  },
};

const RU: Docs = {
  groups: { gs: "Начало работы", concepts: "Концепции", dal: "Слой абстракции устройств (DAL)", ref: "Справочник" },
  nav: {
    overview: "Обзор", architecture: "Архитектура", quickstart: "Быстрый старт",
    robots: "Устройства и реестр", decisions: "Движок решений", tasks: "Движок задач",
    telemetry: "Телеметрия", memory: "Память", accounts: "Аккаунты и организации",
    auth: "Аутентификация", apikeys: "API-ключи",
    dal: "Обзор DAL", "universal-actions": "Универсальные действия", translator: "Транслятор действий",
    "device-profile": "Профиль устройства", "execution-feedback": "Обратная связь",
    "memory-learning": "Память и обучение", "model-router": "Выбор модели",
    endpoints: "Эндпоинты API", "decision-format": "Формат решения", sdk: "SDK",
    dashboard: "Дашборд", deployment: "Развёртывание", faq: "Частые вопросы",
  },
  overview: {
    title: "Обзор",
    p1: "Mevratek — облачная платформа, которая выступает «мозгом» для любого парка устройств. Устройства — тонкие клиенты: они передают кадры с камеры, телеметрию и текущую задачу, а облако возвращает структурированные команды действий. Всё принятие решений выполняется в облаке через AI Decision Engine (поддержка YandexGPT, GigaChat, Claude и локальных моделей).",
    baseUrl: "Базовый URL API:",
    interactive: "Интерактивный API:",
  },
  architecture: {
    title: "Архитектура",
    lead: "Чистая слойная архитектура. Логические сервисы:",
    items: [
      "API-шлюз — аутентификация устройств, маршрутизация.",
      "Движок решений — собирает промпт из capabilities устройства, вызывает AI-движок, возвращает строгий JSON.",
      "Реестр устройств — id, тип, доступные команды, статус подключения.",
      "Движок задач — назначение / очередь / выдача / завершение задач.",
      "Память — история решений и задач, результаты.",
      "Телеметрия — заряд, скорость, координаты, ошибки.",
    ],
    note: "Устройство описывается полностью данными (его тип + capabilities), поэтому новые типы устройств не требуют изменений ядра.",
  },
  quickstart: {
    title: "Быстрый старт",
    lead: "Подключите устройство за три вызова (SDK не обязателен):",
    afterPre: "Или используйте ",
    afterSdk: "Python SDK",
    afterMid: ", либо попробуйте вживую в ",
    afterSim: "Симуляторе",
  },
  robots: {
    title: "Устройства и реестр",
    p1: "Устройство регистрируется один раз: имя, robot_type и список capabilities — команд, которые оно понимает, каждая с необязательными ограничениями значения:",
    p2: "Регистрация возвращает token (bearer) и одноразовый api_key. Мозг возвращает только команды из списка capabilities самого устройства. Присутствие (онлайн/офлайн) отслеживается по heartbeat.",
  },
  decisions: {
    title: "Движок решений",
    p1: "POST /brain/decision принимает задачу, необязательный кадр (image_b64 или frame_url) и текущее состояние. Мозг собирает промпт из capabilities устройства и недавних решений, вызывает AI-движок со строгой JSON-схемой, валидирует ответ и отбрасывает неподдерживаемые команды. Именно этот вызов разработчик встраивает в код своего устройства (через SDK bot.decide(...) или обычный HTTP) — Симулятор просто демонстрирует его в интерфейсе.",
  },
  tasks: {
    title: "Движок задач",
    p1: "Задачи создаются сверху (оператор/API назначает их устройству с приоритетом) или снизу — из собственного запроса решения устройства. Устройства забирают следующую задачу из очереди и отчитываются о результате.",
  },
  telemetry: {
    title: "Телеметрия",
    p1: "Устройства шлют показания в POST /telemetry: заряд, скорость, координаты (x/y/z), список ошибок и любые дополнительные сенсоры. Последние значения показываются на странице устройства.",
  },
  memory: {
    title: "Память",
    p1: "Каждое решение сохраняется (цель, мысль, уверенность, действия, кадр, модель, задержка) вместе с историей задач — полный журнал, доступный через GET /logs и в дашборде.",
  },
  accounts: {
    title: "Аккаунты и организации",
    p1: "Дашборд мультитенантный. Каждое устройство, задача, лог, показание телеметрии и API-ключ принадлежат организации, и каждый запрос ограничен организацией вызывающего — одна организация никогда не видит данные другой. Пользователи не регистрируются сами: вы получаете ссылку-приглашение, задаёте свой пароль и затем входите по email и паролю.",
    p2: "Регистрация устройства тоже привязана к организации: она авторизуется сессией дашборда или API-ключом организации (Authorization: Bearer cbk_…), и новое устройство привязывается к этой организации.",
  },
  auth: {
    title: "Аутентификация",
    p1: "Здесь аутентифицируются два типа вызывающих. Устройства используют bearer-токен из регистрации и действуют «от себя» — robot_id берётся из токена, а не из тела запроса. Пользователи дашборда входят по email + паролю (POST /auth/login) и получают токен сессии, ограниченный их организацией. Передавайте нужный токен в каждом вызове: Authorization: Bearer <token>",
  },
  apikeys: {
    title: "API-ключи",
    p1: "Каждая организация может сгенерировать API-ключи на вкладке API. Секрет показывается один раз; хранится только хэш и короткий префикс. API-ключ авторизует регистрацию устройства вне дашборда (SDK / прошивка устройства) — передавайте его как bearer-токен. Ключи ограничены своей организацией и отзываются в любой момент.",
  },
  dal: {
    title: "Слой абстракции устройств (DAL)",
    p1: "DAL позволяет облаку управлять любым устройством через единый протокол. LLM никогда не выдаёт аппаратные команды — она выдаёт универсальные действия, а платформа транслирует их в собственные низкоуровневые команды устройства на основе его capabilities. Новые типы устройств подключаются без изменения ядра.",
  },
  universal: {
    title: "Универсальные действия",
    p1: "Устройство объявляет низкоуровневые capabilities (например move_forward, arm_grasp, camera_capture, speaker_say, light_on). Из них платформа выводит универсальные действия, доступные устройству (например grasp, release, inspect, say). Мозгу показываются только они, и он возвращает универсальные действия.",
  },
  translator: {
    title: "Транслятор действий",
    p1: "Транслятор сопоставляет каждое универсальное действие с первой поддерживаемой устройством командой, присваивая уникальный action_id (для обратной связи о выполнении). Неподдерживаемые действия отбрасываются.",
    p2: "Устройство получает только выполнимые команды; в ответе есть и actions (команды устройства), и universal_actions (что решил мозг).",
  },
  deviceProfile: {
    title: "Профиль устройства",
    p1: "GET /robots/{id}/profile возвращает единое описание устройства:",
    items: ["robot_type", "capabilities (низкоуровневые команды)", "supported_commands", "supported_actions (универсальные действия)", "firmware_version, protocol_version"],
    p2: "Задайте firmware_version / protocol_version при регистрации.",
  },
  exec: {
    title: "Обратная связь о выполнении",
    p1: "После выполнения команды устройство сообщает результат в POST /executions (action_id, status: success|failed, duration_ms, error).",
    p2: "Свежая обратная связь подаётся в следующее решение — мозг учится на том, что произошло на самом деле.",
  },
  memlearn: {
    title: "Память и обучение",
    p1: "Каждое решение сохраняется со всем контекстом для обучения: входное состояние, решение (универсальные + транслированные команды устройства) и связанные результаты выполнения. Эта история питает краткосрочный контекст и адаптацию со временем.",
  },
  router: {
    title: "Выбор модели",
    p1: "Движок решений не зависит от конкретного вендора. Контракт «на входе — задача и возможности устройства, на выходе — строгий JSON с действиями» одинаков для любой модели:",
    items: [
      "YandexGPT и GigaChat — российские модели",
      "Claude и OpenAI — при необходимости",
      "Локальные модели (Ollama, vLLM, LM Studio) — для закрытого контура, когда данные не должны покидать инфраструктуру",
    ],
    ruTitle: "Российские модели и локальный / on-prem",
    ruBody: "Mevratek нейтрален к движку. Одна и та же платформа работает с YandexGPT, GigaChat, Claude, OpenAI или полностью локальной моделью — смена движка не меняет код интеграции, поэтому бизнес-логика устройства остаётся прежней.",
  },
  endpoints: {
    title: "Эндпоинты API",
    colM: "Метод", colP: "Путь", colA: "Авториз.", colD: "Описание",
    rows: [
      { m: "POST", p: "/auth/login", a: "—", d: "Вход (email + пароль)" },
      { m: "GET", p: "/auth/me", a: "сессия", d: "Текущий пользователь + организация" },
      { m: "POST", p: "/robots/register", a: "сессия / ключ", d: "Регистрация устройства" },
      { m: "POST", p: "/robots/heartbeat", a: "токен", d: "Сигнал «жив»" },
      { m: "GET", p: "/robots", a: "сессия", d: "Список устройств" },
      { m: "GET", p: "/robots/{id}", a: "сессия", d: "Детали устройства" },
      { m: "GET", p: "/robots/{id}/profile", a: "сессия", d: "Профиль устройства (DAL)" },
      { m: "POST", p: "/robots/{id}/pause", a: "сессия", d: "Остановить устройство" },
      { m: "POST", p: "/robots/{id}/resume", a: "сессия", d: "Запустить устройство" },
      { m: "POST", p: "/brain/decision", a: "токен", d: "Получить решение" },
      { m: "POST", p: "/executions", a: "токен", d: "Отправить результат выполнения" },
      { m: "GET", p: "/executions", a: "сессия", d: "Запросить результаты выполнения" },
      { m: "POST", p: "/telemetry", a: "токен", d: "Принять телеметрию" },
      { m: "POST/GET", p: "/tasks", a: "сессия", d: "Назначить / список задач" },
      { m: "GET", p: "/tasks/next", a: "токен", d: "Забрать следующую задачу" },
      { m: "POST", p: "/tasks/{id}/result", a: "токен", d: "Отчитаться о задаче" },
      { m: "GET", p: "/logs", a: "сессия", d: "Логи решений" },
      { m: "POST/GET/DELETE", p: "/api-keys", a: "сессия", d: "Управление API-ключами" },
    ],
    swagger: "Полный интерактивный справочник:",
  },
  decisionFormat: {
    title: "Формат решения",
    p1: "Мозг всегда возвращает строгий JSON — без свободного текста:",
  },
  sdk: {
    title: "SDK",
    p1: "Официальный Python SDK оборачивает все эндпоинты. См. ",
    sdkLink: "вкладку SDK",
    swaggerLink: " для установки и примеров. Подходит и любой язык с HTTP-клиентом.",
  },
  dashboard: {
    title: "Дашборд",
    items: [
      "Устройства — обзор парка и статус в реальном времени.",
      "Логи решений — все решения мозга.",
      "Задачи — назначение задач и очередь.",
      "Симулятор — регистрация устройства и запрос решения.",
      "API — генерация и отзыв API-ключей.",
      "SDK — установка и использование.",
      "Клик по устройству — его задачи, решения, телеметрия и кнопка Стоп/Запустить.",
    ],
  },
  deployment: {
    title: "Развёртывание",
    p1: "Платформа работает как один backend-сервис + PostgreSQL (Redis не нужен; объектное хранилище опционально). Дашборд — необязательный второй сервис. Возможно полностью локальное / изолированное (on-premise) развёртывание, при котором данные не покидают вашу инфраструктуру.",
  },
  faq: {
    title: "Частые вопросы",
    q1: "Нужно ли добавлять устройства вручную?",
    a1: "Нет. Устройства сами регистрируются через API из своего кода (Симулятор — только для тестов).",
    q2: "Что если AI-движок не настроен?",
    a2: "Мозг работает в детерминированном mock-режиме, поэтому платформа работает офлайн. Настройте любой движок (YandexGPT, GigaChat, Claude, OpenAI или локальную модель), чтобы получать реальные решения.",
    q3: "Могут ли подключаться разные типы устройств?",
    a3: "Да — устройство определяется данными capabilities; ядро не меняется.",
  },
};

const NAV_GROUPS: { key: keyof Docs["groups"]; ids: string[] }[] = [
  { key: "gs", ids: ["overview", "architecture", "quickstart"] },
  { key: "concepts", ids: ["robots", "decisions", "tasks", "telemetry", "memory", "accounts", "auth", "apikeys"] },
  { key: "dal", ids: ["dal", "universal-actions", "translator", "device-profile", "execution-feedback", "memory-learning", "model-router"] },
  { key: "ref", ids: ["endpoints", "decision-format", "sdk", "dashboard", "deployment", "faq"] },
];

export default function DocsPage() {
  const { lang } = useT();
  const d = lang === "ru" ? RU : EN;

  return (
    <main className="container">
      <div className="docs">
        <nav className="docs-nav">
          {NAV_GROUPS.map((g) => (
            <div key={g.key}>
              <h3>{d.groups[g.key]}</h3>
              {g.ids.map((id) => (
                <a key={id} href={`#${id}`}>
                  {d.nav[id]}
                </a>
              ))}
            </div>
          ))}
        </nav>

        <div className="docs-content">
          <section id="overview">
            <h2>{d.overview.title}</h2>
            <p>{d.overview.p1}</p>
            <p>
              {d.overview.baseUrl} <code>{API_BASE}</code> · {d.overview.interactive}{" "}
              <a href={SWAGGER}>Swagger / OpenAPI</a>
            </p>
          </section>

          <section id="architecture">
            <h2>{d.architecture.title}</h2>
            <p>{d.architecture.lead}</p>
            <ul>
              {d.architecture.items.map((it, i) => (
                <li key={i}>{it}</li>
              ))}
            </ul>
            <p>{d.architecture.note}</p>
          </section>

          <section id="quickstart">
            <h2>{d.quickstart.title}</h2>
            <p>{d.quickstart.lead}</p>
            <Code>{`# 1. Register (once) — returns a bearer token
curl -X POST ${API_BASE}/robots/register \\
  -H "Content-Type: application/json" \\
  -d '{"name":"rover-01","robot_type":"rover",
       "capabilities":[{"type":"move_forward"},{"type":"stop"}]}'

# 2. Ask the brain for the next actions
curl -X POST ${API_BASE}/brain/decision \\
  -H "Authorization: Bearer <TOKEN>" \\
  -H "Content-Type: application/json" \\
  -d '{"task":"approach the bottle","state":{"battery":80}}'`}</Code>
            <p>
              {d.quickstart.afterPre}
              <a href="/sdk">{d.quickstart.afterSdk}</a>
              {d.quickstart.afterMid}
              <a href="/simulator">{d.quickstart.afterSim}</a>.
            </p>
          </section>

          <section id="robots">
            <h2>{d.robots.title}</h2>
            <p>{d.robots.p1}</p>
            <Code>{`{
  "name": "scout-01",
  "robot_type": "rover",
  "capabilities": [
    {"type": "move_forward",
     "value": {"type": "number", "min": 0, "max": 1, "unit": "m"}},
    {"type": "turn_left",
     "value": {"type": "number", "min": 0, "max": 180, "unit": "deg"}},
    {"type": "stop"}
  ]
}`}</Code>
            <p>{d.robots.p2}</p>
          </section>

          <section id="decisions">
            <h2>{d.decisions.title}</h2>
            <p>{d.decisions.p1}</p>
          </section>

          <section id="tasks">
            <h2>{d.tasks.title}</h2>
            <p>{d.tasks.p1}</p>
            <Code>{`# Assign a task (priority: higher is dequeued first)
POST /tasks            {"robot_id":"...","description":"bring the box","priority":5}

# Robot pulls its next queued task (marks it in_progress)
GET  /tasks/next       (Authorization: Bearer <token>)  -> task | 204

# Robot reports the outcome
POST /tasks/{id}/result {"status":"completed","result":"delivered"}`}</Code>
          </section>

          <section id="telemetry">
            <h2>{d.telemetry.title}</h2>
            <p>{d.telemetry.p1}</p>
          </section>

          <section id="memory">
            <h2>{d.memory.title}</h2>
            <p>{d.memory.p1}</p>
          </section>

          <section id="accounts">
            <h2>{d.accounts.title}</h2>
            <p>{d.accounts.p1}</p>
            <p>{d.accounts.p2}</p>
          </section>

          <section id="auth">
            <h2>{d.auth.title}</h2>
            <p>{d.auth.p1}</p>
            <Code>{`Authorization: Bearer <token>`}</Code>
          </section>

          <section id="apikeys">
            <h2>{d.apikeys.title}</h2>
            <p>{d.apikeys.p1}</p>
            <Code>{`Authorization: Bearer cbk_xxxxxxxx...`}</Code>
          </section>

          <section id="dal">
            <h2>{d.dal.title}</h2>
            <p>{d.dal.p1}</p>
          </section>

          <section id="universal-actions">
            <h2>{d.universal.title}</h2>
            <p>{d.universal.p1}</p>
            <Code>{`{
  "goal": "inspect_object",
  "actions": [
    {"type": "grasp"},
    {"type": "inspect"},
    {"type": "release"}
  ]
}`}</Code>
          </section>

          <section id="translator">
            <h2>{d.translator.title}</h2>
            <p>{d.translator.p1}</p>
            <Code>{`grasp    -> arm_grasp       (action_id: a1b2…)
inspect  -> camera_capture  (action_id: c3d4…)
release  -> arm_release     (action_id: e5f6…)`}</Code>
            <p>{d.translator.p2}</p>
          </section>

          <section id="device-profile">
            <h2>{d.deviceProfile.title}</h2>
            <p>{d.deviceProfile.p1}</p>
            <ul>
              {d.deviceProfile.items.map((it, i) => (
                <li key={i}><code>{it}</code></li>
              ))}
            </ul>
            <p>{d.deviceProfile.p2}</p>
          </section>

          <section id="execution-feedback">
            <h2>{d.exec.title}</h2>
            <p>{d.exec.p1}</p>
            <Code>{`{"action_id": "123", "status": "success", "duration_ms": 450}
// or
{"action_id": "123", "status": "failed", "error": "object_not_found"}`}</Code>
            <p>{d.exec.p2}</p>
          </section>

          <section id="memory-learning">
            <h2>{d.memlearn.title}</h2>
            <p>{d.memlearn.p1}</p>
          </section>

          <section id="model-router">
            <h2>{d.router.title}</h2>
            <p>{d.router.p1}</p>
            <ul>
              {d.router.items.map((it, i) => (
                <li key={i}>{it}</li>
              ))}
            </ul>
            <h3>{d.router.ruTitle}</h3>
            <p>{d.router.ruBody}</p>
          </section>

          <section id="endpoints">
            <h2>{d.endpoints.title}</h2>
            <table>
              <thead>
                <tr>
                  <th>{d.endpoints.colM}</th>
                  <th>{d.endpoints.colP}</th>
                  <th>{d.endpoints.colA}</th>
                  <th>{d.endpoints.colD}</th>
                </tr>
              </thead>
              <tbody>
                {d.endpoints.rows.map((r, i) => (
                  <tr key={i}>
                    <td>{r.m}</td>
                    <td className="mono">{r.p}</td>
                    <td>{r.a}</td>
                    <td>{r.d}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p>
              {d.endpoints.swagger} <a href={SWAGGER}>Swagger UI</a>.
            </p>
          </section>

          <section id="decision-format">
            <h2>{d.decisionFormat.title}</h2>
            <p>{d.decisionFormat.p1}</p>
            <Code>{`{
  "goal": "approach the object",
  "thought": "bottle detected on the table",
  "confidence": 0.91,
  "actions": [
    {"type": "move_forward", "value": 0.5},
    {"type": "turn_left", "value": 15}
  ]
}`}</Code>
          </section>

          <section id="sdk">
            <h2>{d.sdk.title}</h2>
            <p>
              {d.sdk.p1}
              <a href="/sdk">{d.sdk.sdkLink}</a>
              {d.sdk.swaggerLink}
            </p>
          </section>

          <section id="dashboard">
            <h2>{d.dashboard.title}</h2>
            <ul>
              {d.dashboard.items.map((it, i) => (
                <li key={i}>{it}</li>
              ))}
            </ul>
          </section>

          <section id="deployment">
            <h2>{d.deployment.title}</h2>
            <p>{d.deployment.p1}</p>
          </section>

          <section id="faq">
            <h2>{d.faq.title}</h2>
            <h3>{d.faq.q1}</h3>
            <p>{d.faq.a1}</p>
            <h3>{d.faq.q2}</h3>
            <p>{d.faq.a2}</p>
            <h3>{d.faq.q3}</h3>
            <p>{d.faq.a3}</p>
          </section>
        </div>
      </div>
    </main>
  );
}

import type { Dict } from "@/i18n/config";

export type PlatformComponent = {
  /** Product name — the same in both languages, it is how the code names it. */
  name: string;
  role: Dict;
  detail: Dict;
};

export const PLATFORM_COMPONENTS: PlatformComponent[] = [
  {
    name: "Robot Registry",
    role: { ru: "Реестр устройств", en: "Device registry" },
    detail: {
      ru: "Регистрация устройств, их тип, доступные команды и статус подключения. Устройство описывается данными — новый тип не требует изменений ядра.",
      en: "Registers devices with their type, available commands and connection status. A device is described by data, so a new type needs no change to the core.",
    },
  },
  {
    name: "Task Engine",
    role: { ru: "Движок задач", en: "Task engine" },
    detail: {
      ru: "Постановка задач с приоритетом, очередь и выборка следующей задачи устройством. Robot-driven и оператор-driven сценарии.",
      en: "Prioritised tasks, a queue, and the device pulling its next task. Supports both robot-driven and operator-driven workflows.",
    },
  },
  {
    name: "Decision Engine",
    role: { ru: "Движок решений", en: "Decision engine" },
    detail: {
      ru: "Собирает промпт из возможностей устройства, вызывает языковую модель и возвращает строгий JSON. Ядро платформы.",
      en: "Builds a prompt from the device's own capabilities, calls the language model and returns strict JSON. The core of the platform.",
    },
  },
  {
    name: "Memory Layer",
    role: { ru: "Память и обучение", en: "Memory and learning" },
    detail: {
      ru: "История действий, задач и результатов исполнения. Недавняя обратная связь подмешивается в следующее решение.",
      en: "A history of actions, tasks and outcomes. Recent feedback is folded into the next decision.",
    },
  },
  {
    name: "Telemetry",
    role: { ru: "Телеметрия", en: "Telemetry" },
    detail: {
      ru: "Заряд, скорость, координаты и ошибки в реальном времени. Присутствие устройства отслеживается в БД — без внешних кэшей.",
      en: "Battery, speed, coordinates and errors in real time. Device presence is tracked in the database — no external cache required.",
    },
  },
  {
    name: "Action Translator",
    role: { ru: "Трансляция команд", en: "Command translation" },
    detail: {
      ru: "Универсальные действия модели отображаются в конкретные команды устройства из его возможностей. Неподдерживаемое отсекается.",
      en: "Maps the model's generic actions onto the concrete commands a device declares. Anything unsupported is rejected before it is sent.",
    },
  },
  {
    name: "Simulator",
    role: { ru: "Симулятор", en: "Simulator" },
    detail: {
      ru: "Виртуальное устройство с живой телеметрией. Тестируйте интеграцию и сценарии без физического железа.",
      en: "A virtual device emitting live telemetry. Test the integration and your scenarios without any physical hardware.",
    },
  },
  {
    name: "SDK / API",
    role: { ru: "Интеграция", en: "Integration" },
    detail: {
      ru: "Устанавливаемый Python-SDK и REST API с JWT-аутентификацией. Устройство действует «как оно само» — id берётся из токена.",
      en: "An installable SDK and a REST API with JWT authentication. A device always acts as itself — its id comes from the token, never from the request body.",
    },
  },
];

export type Segment = {
  title: Dict;
  problem: Dict;
  solution: Dict;
  result: Dict;
};

export const SEGMENTS: Segment[] = [
  {
    title: { ru: "Интеграторы робототехники", en: "Robotics integrators" },
    problem: {
      ru: "Каждый проект требует заново строить слой управления: аутентификацию устройств, очередь задач, логику принятия решений.",
      en: "Every project means rebuilding the control layer from scratch: device authentication, a task queue, decision logic.",
    },
    solution: {
      ru: "Готовая платформа управления «из коробки»: подключение по SDK, единый протокол для любого железа заказчика.",
      en: "A control platform that is ready on day one: connect over the SDK, one protocol for whatever hardware the customer runs.",
    },
    result: {
      ru: "Запуск пилота за дни, а не месяцы. Один слой управления переиспользуется на всех проектах.",
      en: "A pilot in days rather than months, and one control layer reused across every project.",
    },
  },
  {
    title: { ru: "Стартапы и R&D-команды", en: "Startups and R&D teams" },
    problem: {
      ru: "Ограниченные ресурсы уходят на инфраструктуру вместо продукта и уникальной механики устройства.",
      en: "Limited resources go into infrastructure instead of the product and the mechanics that make the device distinctive.",
    },
    solution: {
      ru: "Движок решений и память берут на себя оркестрацию — команда фокусируется на железе и сценариях.",
      en: "The decision engine and the memory layer take over orchestration, so the team can stay on the hardware and the scenarios.",
    },
    result: {
      ru: "Быстрее до прототипа и демо инвесторам. Масштабирование без переписывания бэкенда.",
      en: "A faster route to a prototype and an investor demo, and scale without rewriting the backend.",
    },
  },
  {
    title: { ru: "Промышленные предприятия", en: "Industrial enterprises" },
    problem: {
      ru: "Западные платформы недоступны, а внутренняя разработка системы управления парком — дорого и долго.",
      en: "Western platforms are unavailable, and building a fleet control system in-house is expensive and slow.",
    },
    solution: {
      ru: "On-premise развёртывание на российских LLM, единое управление разнородным парком устройств.",
      en: "An on-premise deployment running the language model of your choice, with one way to control a mixed fleet.",
    },
    result: {
      ru: "Контроль над данными и инфраструктурой, предсказуемая стоимость, отсутствие зависимости от вендора.",
      en: "Control over data and infrastructure, predictable cost, and no vendor lock-in.",
    },
  },
  {
    title: { ru: "Университеты и лаборатории", en: "Universities and labs" },
    problem: {
      ru: "Исследовательским группам нужна среда для экспериментов с автономным поведением без тяжёлой инженерии.",
      en: "Research groups need somewhere to experiment with autonomous behaviour without heavy engineering first.",
    },
    solution: {
      ru: "Симулятор и SDK позволяют ставить задачи и собирать данные о решениях без физического устройства.",
      en: "The simulator and the SDK let them issue tasks and collect decision data with no physical device at all.",
    },
    result: {
      ru: "Быстрый цикл экспериментов, воспроизводимость, лёгкий переход от симулятора к реальному железу.",
      en: "A short experiment cycle, reproducible runs, and an easy step from the simulator to real hardware.",
    },
  },
];

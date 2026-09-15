// Blog content — authored articles on the Mevratek platform. Single source of
// truth for the /blog index, the article pages and their Article JSON-LD.

import { defaultLocale, type Dict, type Locale } from "@/i18n/config";

export interface BlogSection {
  h2: Dict;
  body: Dict[];
}

export interface BlogPost {
  /**
   * One slug for both languages, so /blog/<slug> and /en/blog/<slug> are
   * always a pair. An English-language slug would read better in an English
   * URL, but it would also mean the language switcher could no longer derive
   * the other language's URL from the current one — and a switcher that
   * silently drops you on the index is worse than a transliterated slug.
   */
  slug: string;
  title: Dict;
  description: Dict;
  date: string; // ISO date (published)
  readMinutes: number;
  tag: Dict;
  lead: Dict;
  sections: BlogSection[];
}

export const POSTS: BlogPost[] = [
  {
    slug: "oblachnyy-mozg-dlya-robotov",
    title: {
      ru: "Облачный мозг для роботов: как один протокол управляет любым устройством",
      en: "A shared brain for robots: how one protocol drives any device",
    },
    description: {
      ru: "Как устроена платформа Mevratek: тонкий клиент на устройстве, принятие решений на сервере платформы и Device Abstraction Layer, который позволяет подключить любого робота без изменения ядра.",
      en: "How the Mevratek platform is built: a thin client on the device, decision-making on the platform server, and a Device Abstraction Layer that lets any robot connect without changing the core.",
    },
    date: "2026-07-14",
    readMinutes: 7,
    tag: { ru: "Архитектура", en: "Architecture" },
    lead: {
      ru: "Промышленный робот, складская тележка и учебный симулятор устроены по-разному, но управлять ими можно одинаково — если вынести «мозг» с борта на общий сервер и говорить с железом на едином языке. Разбираем, как это работает в Mevratek.",
      en: "An industrial robot, a warehouse cart and a teaching simulator are built quite differently, yet they can all be driven the same way — if you move the brain off the device onto a shared server and speak to the hardware in one language. Here is how that works in Mevratek.",
    },
    sections: [
      {
        h2: {
          ru: "Устройство — тонкий клиент, решения — на сервере платформы",
          en: "The device is a thin client; decisions happen on the platform server",
        },
        body: [
          {
            ru: "Классический подход к автономным устройствам помещает всю логику на борт: распознавание, планирование, принятие решений. Это дорого, плохо масштабируется и намертво привязывает поведение робота к конкретной прошивке. Mevratek переворачивает схему: устройство становится тонким клиентом, который лишь передаёт на сервер платформы текущую задачу, телеметрию и, при необходимости, кадр с камеры, а в ответ получает готовые структурированные команды. Сам сервер при этом стоит внутри периметра предприятия, а не у внешнего провайдера.",
            en: "The classical approach to autonomous devices puts all the logic on board: perception, planning, decision-making. That is expensive, scales badly, and welds the robot's behaviour to one particular firmware build. Mevratek inverts it. The device becomes a thin client that sends the platform server its current task, its telemetry and, where needed, a camera frame, and receives structured commands in return. The server itself sits inside the enterprise perimeter, not at an external provider.",
          },
          {
            ru: "Такое разделение ответственности даёт сразу несколько преимуществ. Логику можно обновлять централизованно, не выезжая к каждому устройству. Один и тот же «мозг» обслуживает целый парк. А сами устройства становятся проще и дешевле: им достаточно уметь выполнять свой набор низкоуровневых команд и отчитываться о результате.",
            en: "That split pays off several ways at once. Logic is updated centrally, with no trip out to each device. One brain serves an entire fleet. And the devices themselves get simpler and cheaper: all they need is to execute their own low-level commands and report what happened.",
          },
        ],
      },
      {
        h2: {
          ru: "Device Abstraction Layer: единый язык для разного железа",
          en: "The Device Abstraction Layer: one language for different hardware",
        },
        body: [
          {
            ru: "Ключевая идея платформы — слой абстракции устройств (DAL). Устройство при регистрации объявляет свой список capabilities: низкоуровневые команды, которые оно физически умеет выполнять, — например move_forward, turn_left, arm_grasp, camera_capture. Из этого набора платформа выводит универсальные действия, доступные устройству на более высоком уровне: подъехать, осмотреть, захватить, отпустить.",
            en: "The central idea is the Device Abstraction Layer. On registration a device declares its capabilities: the low-level commands it can physically perform — move_forward, turn_left, arm_grasp, camera_capture and so on. From that set the platform derives the higher-level generic actions available to it: approach, inspect, grasp, release.",
          },
          {
            ru: "AI-движок никогда не работает с аппаратными командами напрямую — он оперирует только универсальными действиями. Транслятор действий затем сопоставляет каждое универсальное действие с конкретной командой устройства и присваивает уникальный action_id для обратной связи. Команды, которых устройство не поддерживает, просто отбрасываются — робот физически не может получить то, что не умеет исполнять.",
            en: "The AI engine never touches a hardware command directly; it works only in generic actions. The action translator then maps each generic action onto a concrete device command and assigns a unique action_id for the feedback loop. Commands the device does not support are simply dropped — a robot physically cannot receive something it cannot execute.",
          },
          {
            ru: "Поэтому новый тип устройства подключается без единого изменения в ядре платформы: достаточно описать его capabilities данными. Робот описывается данными, а не кодом.",
            en: "So a new device type is onboarded without a single change to the platform core: you describe its capabilities as data. A robot is described by data, not by code.",
          },
        ],
      },
      {
        h2: {
          ru: "Строгий контракт вместо свободного текста",
          en: "A strict contract instead of free text",
        },
        body: [
          {
            ru: "Движок решений собирает промпт из capabilities устройства и его недавних действий, вызывает языковую модель со строгой JSON-схемой и валидирует ответ. На выходе всегда предсказуемый машинно-читаемый JSON: цель, короткое обоснование, уверенность и список действий — никакого свободного текста, который пришлось бы разбирать эвристиками.",
            en: "The decision engine builds a prompt from the device's capabilities and its recent actions, calls the language model against a strict JSON schema, and validates the answer. What comes out is always predictable machine-readable JSON: a goal, a short rationale, a confidence value and a list of actions — no free text that would have to be parsed with heuristics.",
          },
          {
            ru: "Каждое решение сохраняется целиком: входное состояние, что решил мозг, какие команды получило устройство и чем закончилось выполнение. Эта история и питает краткосрочный контекст следующего решения, и служит полным журналом для аудита.",
            en: "Every decision is stored whole: the input state, what the brain decided, which commands the device received and how execution ended. That history both feeds the short-term context of the next decision and serves as a complete audit journal.",
          },
        ],
      },
      {
        h2: { ru: "Что это даёт на практике", en: "What this means in practice" },
        body: [
          {
            ru: "Интегратор перестаёт писать инфраструктуру управления с нуля под каждый проект. Подключение устройства сводится к регистрации, описанию его команд и одному вызову за решением — через готовый SDK или обычный HTTP. Пилот можно запустить за день, а масштабировать парк — без переписывания логики.",
            en: "An integrator stops writing control infrastructure from scratch for every project. Connecting a device comes down to registering it, describing its commands and making one call for a decision — through the SDK or over plain HTTP. A pilot can start in a day, and the fleet grows without the logic being rewritten.",
          },
          {
            ru: "Подробное техническое описание протокола, эндпоинтов и формата решения собрано в документации платформы.",
            en: "The full technical description of the protocol, the endpoints and the decision format is in the platform documentation.",
          },
        ],
      },
    ],
  },
  {
    slug: "rossiyskie-llm-v-robototehnike",
    title: {
      ru: "Российские языковые модели в робототехнике: YandexGPT и GigaChat как движок решений",
      en: "Russian language models in robotics: YandexGPT and GigaChat as a decision engine",
    },
    description: {
      ru: "Почему движок принятия решений должен быть нейтрален к вендору, как Mevratek подключает YandexGPT и GigaChat через OpenAI-совместимый шлюз и когда стоит выбрать локальную модель.",
      en: "Why a decision engine has to stay vendor-neutral, how Mevratek connects YandexGPT and GigaChat through an OpenAI-compatible gateway, and when a local model is the right answer.",
    },
    date: "2026-07-28",
    readMinutes: 8,
    tag: { ru: "AI Decision Engine", en: "AI Decision Engine" },
    lead: {
      ru: "После ухода западных облаков российским командам нужна не просто «нейросеть для робота», а предсказуемый движок решений, который можно переключить между моделями без переписывания интеграции. Разбираем, как Mevratek остаётся нейтральным к вендору.",
      en: "After the Western clouds left, Russian teams need more than a neural network bolted onto a robot: they need a predictable decision engine that can be pointed at a different model without the integration being rewritten. Here is how Mevratek stays vendor-neutral.",
    },
    sections: [
      {
        h2: { ru: "Движок, а не одна модель", en: "An engine, not one model" },
        body: [
          {
            ru: "AI Decision Engine в Mevratek спроектирован провайдер-независимым. Он не зависит от конкретного поставщика модели: контракт «на входе — задача, состояние и возможности устройства, на выходе — строгий JSON с действиями» остаётся одинаковым, какая бы модель ни стояла под капотом.",
            en: "Mevratek's AI Decision Engine is designed to be provider-independent. It does not depend on any one model vendor: the contract — task, state and device capabilities in, strict JSON actions out — stays the same whichever model is underneath.",
          },
          {
            ru: "Выбор движка задаётся одной настройкой и не затрагивает код интеграции. Это стратегически важно: рынок моделей меняется быстро, и привязка к единственному вендору — это риск, а не удобство.",
            en: "Which engine is used is one setting, and it touches no integration code. That matters strategically: the model market moves fast, and betting on a single vendor is a risk, not a convenience.",
          },
        ],
      },
      {
        h2: {
          ru: "YandexGPT и GigaChat через совместимый шлюз",
          en: "YandexGPT and GigaChat through a compatible gateway",
        },
        body: [
          {
            ru: "Российские модели YandexGPT и GigaChat подключаются через OpenAI-совместимый шлюз: достаточно указать провайдера и адрес шлюза с ключом доступа. Для платформы это выглядит как обычный вызов, а значит переключение между российскими моделями и, например, Claude или OpenAI не требует изменений в бизнес-логике.",
            en: "The Russian models YandexGPT and GigaChat connect through an OpenAI-compatible gateway: you name the provider, the gateway address and an access key. To the platform it looks like an ordinary call, which means switching between a Russian model and, say, Claude or OpenAI needs no change in the business logic.",
          },
          {
            ru: "Такой подход снимает главную головную боль импортозамещения: вы не переписываете систему управления под каждую новую модель, а просто меняете точку назначения запроса.",
            en: "That removes the main headache of replacing an imported system: you do not rewrite the control layer for every new model, you change where the request is sent.",
          },
        ],
      },
      {
        h2: {
          ru: "Когда выбирать локальную модель",
          en: "When to choose a local model",
        },
        body: [
          {
            ru: "Для чувствительных к данным сценариев движок можно направить на локальную OpenAI-совместимую модель — Ollama, vLLM или LM Studio. В этом случае данные не покидают инфраструктуру заказчика, а вся платформа работает в закрытом контуре.",
            en: "For data-sensitive scenarios the engine can be pointed at a local OpenAI-compatible model — Ollama, vLLM or LM Studio. Data then never leaves the customer's infrastructure and the whole platform runs in a closed perimeter.",
          },
          {
            ru: "Если ни один движок не настроен, платформа возвращает детерминированное mock-решение — это удобно для разработки, тестов и демонстраций: система остаётся полностью работоспособной офлайн.",
            en: "If no engine is configured at all, the platform returns a deterministic mock decision. That is useful for development, tests and demos: the system stays fully functional offline.",
          },
        ],
      },
      {
        h2: {
          ru: "Обучение на реальных результатах",
          en: "Learning from what actually happened",
        },
        body: [
          {
            ru: "Модель принимает решение не в вакууме. В контекст попадают недавние действия устройства и обратная связь о том, что реально удалось выполнить, а что закончилось ошибкой. Так движок адаптируется к поведению конкретного устройства и среды, а не повторяет одни и те же ошибки.",
            en: "The model does not decide in a vacuum. Its context includes the device's recent actions and the feedback on what actually succeeded and what failed. The engine therefore adapts to how a particular device and environment behave instead of repeating the same mistakes.",
          },
          {
            ru: "Какую модель выбрать под ваш сценарий — зависит от требований к задержке, приватности и стоимости. Обсудить конфигурацию можно на странице контактов.",
            en: "Which model suits your scenario depends on your latency, privacy and cost requirements. The contact page is the place to talk the configuration through.",
          },
        ],
      },
    ],
  },
  {
    slug: "on-premise-robototehnika",
    title: {
      ru: "On-premise робототехника: управление парком устройств в закрытом контуре",
      en: "On-premise robotics: running a device fleet inside a closed perimeter",
    },
    description: {
      ru: "Когда данные не должны покидать периметр предприятия: как развернуть Mevratek на собственных серверах, что требуется из инфраструктуры и как работает платформа без внешнего интернета.",
      en: "When data must not leave the enterprise perimeter: deploying Mevratek on your own servers, what infrastructure it needs, and how the platform works with no internet at all.",
    },
    date: "2026-08-11",
    readMinutes: 6,
    tag: { ru: "On-Premise", en: "On-Premise" },
    lead: {
      ru: "Оборонные, промышленные и режимные объекты не могут отправлять телеметрию роботов во внешнее облако. Для таких заказчиков Mevratek разворачивается на месте — в изолированном контуре, без выхода данных наружу.",
      en: "Defence, industrial and restricted-access sites cannot send robot telemetry to an external cloud. For those customers Mevratek is deployed on site, in an isolated perimeter, with no data leaving it.",
    },
    sections: [
      {
        h2: { ru: "Почему это важно", en: "Why this matters" },
        body: [
          {
            ru: "Для многих предприятий вопрос не в цене, а в том, что данные о работе устройств в принципе не должны покидать периметр. Кадры с камер, координаты, маршруты и телеметрия — чувствительная информация, а внешний облачный сервис здесь неприемлем по требованиям безопасности. Поэтому Mevratek поставляется только как решение для закрытого контура.",
            en: "For many enterprises the question is not price: data about how the devices operate must simply not leave the perimeter. Camera frames, coordinates, routes and telemetry are sensitive, and an external cloud service is ruled out by the security requirements. That is why Mevratek ships only as a closed-perimeter product.",
          },
          {
            ru: "On-premise развёртывание снимает этот барьер: платформа целиком работает на серверах заказчика, а внешний интернет ей не требуется.",
            en: "An on-premise deployment removes the barrier: the whole platform runs on the customer's own servers and needs no internet access.",
          },
        ],
      },
      {
        h2: { ru: "Что нужно для развёртывания", en: "What a deployment needs" },
        body: [
          {
            ru: "Архитектура намеренно простая: единый бэкенд-сервис и PostgreSQL. Redis не требуется — присутствие устройств (онлайн/офлайн) платформа отслеживает прямо в базе по heartbeat. Объектное хранилище для кадров подключается опционально и тоже может быть локальным (любое S3-совместимое хранилище).",
            en: "The architecture is deliberately plain: one backend service and PostgreSQL. Redis is not required — device presence (online or offline) is tracked in the database from the heartbeat. Object storage for camera frames is optional and can be local too (any S3-compatible store).",
          },
          {
            ru: "Языковую модель для движка решений можно поднять локально — Ollama, vLLM или LM Studio по OpenAI-совместимому протоколу. В результате весь цикл «устройство → решение → команда» замыкается внутри контура, и ни один запрос не уходит наружу.",
            en: "The language model behind the decision engine can be hosted locally — Ollama, vLLM or LM Studio over the OpenAI-compatible protocol. The whole device → decision → command loop then closes inside the perimeter and not one request goes out.",
          },
        ],
      },
      {
        h2: {
          ru: "Изоляция данных по организациям",
          en: "Data isolation between organizations",
        },
        body: [
          {
            ru: "Даже внутри одного развёртывания данные разделены по организациям: устройства, задачи, журналы, телеметрия и ключи доступа привязаны к своей организации, и одна организация никогда не видит данные другой. Аккаунты заводит администратор — самостоятельной регистрации нет, доступ выдаётся по приглашению.",
            en: "Even within one deployment the data is partitioned by organization: devices, tasks, journals, telemetry and access keys all belong to their own organization, and no organization ever sees another's data. Accounts are created by an administrator — there is no self-service sign-up; access is by invitation.",
          },
          {
            ru: "Это позволяет обслуживать несколько подразделений или заказчиков на одной инсталляции без риска смешения данных.",
            en: "That makes it possible to serve several divisions, or several customers, from one installation with no risk of the data mixing.",
          },
        ],
      },
      {
        h2: { ru: "С чего начать", en: "Where to start" },
        body: [
          {
            ru: "Оптимальный путь — пилот на одном-двух устройствах в тестовом контуре, затем масштабирование. Технические детали развёртывания и требования к окружению описаны в документации платформы; конфигурацию под конкретный объект удобнее обсудить напрямую.",
            en: "The best route is a pilot on one or two devices in a test perimeter, then scaling up. The deployment details and environment requirements are in the platform documentation; the configuration for a specific site is easier to work through directly.",
          },
        ],
      },
    ],
  },
];

export const POST_SLUGS = POSTS.map((p) => p.slug);

export function getPost(slug: string): BlogPost | undefined {
  return POSTS.find((p) => p.slug === slug);
}

export function formatDate(iso: string, locale: Locale = defaultLocale): string {
  return new Date(iso).toLocaleDateString(locale === "ru" ? "ru-RU" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

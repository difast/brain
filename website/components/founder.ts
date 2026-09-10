// Основатель проекта — единый источник для structured data, llms.txt и страницы
// «О проекте». Держим отдельно от COMPANY: то реквизиты юрлица, а это личность,
// и в разметке они описываются разными типами schema.org.

export const FOUNDER = {
  name: "Дмитрий Пятаков",
  nameLatin: "Dmitry Pyatakov",
  givenName: "Дмитрий",
  familyName: "Пятаков",
  role: "Основатель",
  jobTitle: "Основатель и руководитель продукта",

  /**
   * Проекты, которые он запустил. Порядок — как он их перечисляет сам.
   *
   * `note` необязателен: пояснение попадает в разметку как описание, а
   * придуманное описание там хуже, чем никакого.
   */
  projects: [
    { name: "Panteon Chess", note: "шахматный проект" },
    { name: "Mevratek", note: "платформа управления роботами" },
    { name: "OneOnOne" },
    { name: "ТехФабрика", note: "онлайн-школа программирования" },
  ] as readonly { readonly name: string; readonly note?: string }[],

  /**
   * Личные аккаунты. Уходят в schema.org `sameAs` — именно это поле поисковики
   * и ИИ-краулеры читают, чтобы связать упоминания имени в разных источниках с
   * одним человеком.
   */
  social: {
    instagram: "https://instagram.com/pyatakov.official",
    youtube: "https://youtube.com/@pyatakov.official",
    rutube: "https://rutube.ru/channel/81140376/",
    telegram: "https://t.me/pyatakov_official",
  },
} as const;

/** Тот же набор ссылок плоским списком — форма, которую ждёт `sameAs`. */
export const FOUNDER_SAME_AS: string[] = Object.values(FOUNDER.social);

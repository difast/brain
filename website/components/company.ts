// Единый источник реквизитов компании — используется в подвале и юр. документах.

export const COMPANY = {
  brand: "Mevratek",
  legalName: "ООО «ИНТЕГРО»",
  // Latin forms for the English pages. The registration numbers are the same
  // document either way, so only the name and the address are translated.
  legalNameEn: "INTEGRO LLC",
  ogrn: "1257700559269",
  inn: "9734021152",
  address:
    "123592, г. Москва, вн. тер. г. муниципальный округ Строгино, ул. Маршала Катукова, д. 22, к. 1",
  addressEn:
    "22/1 Marshala Katukova St., Moscow, 123592, Russian Federation",
  email: "info@mevratek.ru",
  // У компании нет телефона.
  docsUpdatedAt: "28 августа 2026 г.",
  docsUpdatedAtEn: "28 August 2026",
} as const;

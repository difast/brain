import { LegalDoc, Requisites } from "@/components/legal";
import { COMPANY } from "@/components/company";
import { BreadcrumbJsonLd } from "@/components/schema";
import { t } from "@/content/ui";
import { localePath, type Locale } from "@/i18n/config";

export const CONSENT_COPY = {
  ru: {
    metaTitle: "Согласие на обработку персональных данных",
    metaDescription:
      "Соглашение о согласии на обработку персональных данных, предоставляемых через форму обратной связи на сайте mevratek.ru.",
    crumb: "Согласие на обработку данных",
    docTitle: "Согласие на обработку персональных данных",
    updated: COMPANY.docsUpdatedAt,
  },
  en: {
    metaTitle: "Consent to the processing of personal data",
    metaDescription:
      "The consent to the processing of personal data submitted through the contact form on mevratek.ru.",
    crumb: "Consent to data processing",
    docTitle: "Consent to the processing of personal data",
    updated: COMPANY.docsUpdatedAtEn,
  },
} as const;

function RussianBody() {
  return (
    <>
      <p>
        Настоящим, отправляя форму обратной связи на сайте{" "}
        <a href="https://mevratek.ru">mevratek.ru</a>, пользователь (далее —
        «Субъект») свободно, своей волей и в своём интересе даёт согласие на
        обработку своих персональных данных оператору {COMPANY.legalName}
        (далее — «Оператор») в соответствии с Федеральным законом от 27.07.2006
        № 152-ФЗ «О персональных данных».
      </p>

      <Requisites locale="ru" />

      <h2>1. Перечень персональных данных</h2>
      <p>Согласие даётся на обработку следующих персональных данных:</p>
      <ul>
        <li>имя;</li>
        <li>адрес электронной почты;</li>
        <li>наименование организации (при указании);</li>
        <li>содержание обращения.</li>
      </ul>

      <h2>2. Цели обработки</h2>
      <ul>
        <li>рассмотрение обращения и направление ответа Субъекту;</li>
        <li>
          организация взаимодействия по пилотным проектам, партнёрствам и иным
          вопросам, инициированным Субъектом.
        </li>
      </ul>

      <h2>3. Перечень действий с персональными данными</h2>
      <p>
        Согласие даётся на совершение следующих действий: сбор, запись,
        систематизация, накопление, хранение, уточнение (обновление, изменение),
        извлечение, использование, блокирование, удаление и уничтожение
        персональных данных, совершаемых как с использованием средств
        автоматизации, так и без них.
      </p>

      <h2>4. Срок действия согласия и порядок отзыва</h2>
      <p>
        Согласие действует с момента отправки формы и до достижения целей
        обработки либо до его отзыва. Субъект вправе отозвать согласие в любой
        момент, направив письменное обращение на адрес электронной почты{" "}
        <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>. После получения
        отзыва Оператор прекращает обработку и уничтожает персональные данные в
        срок, установленный законодательством, за исключением случаев, когда
        обработка должна быть продолжена в силу закона.
      </p>

      <h2>5. Дополнительные условия</h2>
      <p>
        Порядок обработки и защиты персональных данных определяется{" "}
        <a href="/privacy">Политикой в отношении обработки персональных данных</a>.
        Субъект подтверждает, что ознакомлен с указанной Политикой и настоящим
        Согласием и принимает их условия.
      </p>
    </>
  );
}

function EnglishBody() {
  return (
    <>
      <p>
        By submitting the contact form on{" "}
        <a href="https://mevratek.ru">mevratek.ru</a>, the user (the “Subject”)
        freely, of their own will and in their own interest consents to the
        processing of their personal data by the operator {COMPANY.legalNameEn}{" "}
        (the “Operator”) in accordance with Russian Federal Law No. 152-FZ of
        27 July 2006 “On Personal Data”.
      </p>
      <p>
        This is a translation provided for convenience. The Russian text is the
        operative version; where the two differ, the{" "}
        <a href="/consent">Russian Consent</a> governs.
      </p>

      <Requisites locale="en" />

      <h2>1. Personal data covered</h2>
      <p>Consent is given to the processing of the following personal data:</p>
      <ul>
        <li>name;</li>
        <li>email address;</li>
        <li>organisation name, if given;</li>
        <li>the content of the enquiry.</li>
      </ul>

      <h2>2. Purposes of processing</h2>
      <ul>
        <li>considering the enquiry and replying to the Subject;</li>
        <li>
          arranging engagement on pilot projects, partnerships and other matters
          initiated by the Subject.
        </li>
      </ul>

      <h2>3. Operations covered</h2>
      <p>
        Consent is given to the following operations: collection, recording,
        systematisation, accumulation, storage, rectification (updating,
        amendment), retrieval, use, blocking, deletion and destruction of
        personal data, whether by automated means or not.
      </p>

      <h2>4. Duration and withdrawal</h2>
      <p>
        This consent takes effect when the form is submitted and lasts until the
        purposes of processing are met or until it is withdrawn. The Subject may
        withdraw it at any time by writing to{" "}
        <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>. On receiving a
        withdrawal the Operator stops processing and destroys the personal data
        within the period set by law, except where processing must continue by
        operation of law.
      </p>

      <h2>5. Further terms</h2>
      <p>
        How personal data is processed and protected is set out in the{" "}
        <a href="/en/privacy">Personal data processing policy</a>. The Subject
        confirms that they have read that Policy and this Consent and accept
        their terms.
      </p>
    </>
  );
}

export function ConsentView({ locale }: { locale: Locale }) {
  const c = CONSENT_COPY[locale];
  const p = (path: string) => localePath(locale, path);

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: t(locale, "home"), url: p("/") },
          { name: c.crumb, url: p("/consent") },
        ]}
      />
      <LegalDoc title={c.docTitle} updated={c.updated} locale={locale}>
        {locale === "ru" ? <RussianBody /> : <EnglishBody />}
      </LegalDoc>
    </>
  );
}

import { LegalDoc, Requisites } from "@/components/legal";
import { COMPANY } from "@/components/company";
import { BreadcrumbJsonLd } from "@/components/schema";
import { t } from "@/content/ui";
import { localePath, type Locale } from "@/i18n/config";

export const PRIVACY_COPY = {
  ru: {
    metaTitle: "Политика конфиденциальности",
    metaDescription:
      "Политика в отношении обработки персональных данных на сайте mevratek.ru: цели, правовые основания, состав данных, сроки хранения и права субъекта.",
    crumb: "Конфиденциальность",
    docTitle: "Политика в отношении обработки персональных данных",
    updated: COMPANY.docsUpdatedAt,
  },
  en: {
    metaTitle: "Privacy Notice",
    metaDescription:
      "How personal data is processed on mevratek.ru: purposes, legal basis, what is collected, retention periods and the data subject's rights.",
    crumb: "Privacy",
    docTitle: "Personal data processing policy",
    updated: COMPANY.docsUpdatedAtEn,
  },
} as const;

function RussianBody() {
  return (
    <>
      <p>
        Настоящая Политика определяет порядок обработки и защиты персональных
        данных пользователей сайта{" "}
        <a href="https://mevratek.ru">mevratek.ru</a> (далее — «Сайт»),
        осуществляемой оператором персональных данных {COMPANY.legalName}
        (далее — «Оператор»). Политика разработана в соответствии с Федеральным
        законом от 27.07.2006 № 152-ФЗ «О персональных данных».
      </p>

      <Requisites locale="ru" />

      <h2>1. Основные понятия</h2>
      <p>
        <strong>Персональные данные</strong> — любая информация, относящаяся к
        прямо или косвенно определённому или определяемому физическому лицу
        (субъекту персональных данных). <strong>Обработка</strong> — любое
        действие с персональными данными, совершаемое с использованием средств
        автоматизации или без них.
      </p>

      <h2>2. Состав обрабатываемых данных</h2>
      <p>
        Оператор обрабатывает данные, которые пользователь добровольно
        предоставляет через форму обратной связи на Сайте:
      </p>
      <ul>
        <li>имя;</li>
        <li>адрес электронной почты;</li>
        <li>наименование организации (при указании);</li>
        <li>содержание обращения и иные данные, указанные пользователем.</li>
      </ul>
      <p>
        Оператор не обрабатывает специальные категории персональных данных и
        биометрические персональные данные.
      </p>

      <h2>3. Цели обработки</h2>
      <ul>
        <li>обработка обращений и предоставление ответов на них;</li>
        <li>
          организация пилотных проектов, партнёрств и иного взаимодействия по
          инициативе пользователя;
        </li>
        <li>информирование о продуктах и услугах Оператора по запросу.</li>
      </ul>

      <h2>4. Правовые основания</h2>
      <p>
        Обработка осуществляется на основании согласия субъекта персональных
        данных, выражаемого при отправке формы обратной связи, а также на
        основании положений Федерального закона № 152-ФЗ и иных нормативных
        правовых актов Российской Федерации.
      </p>

      <h2>5. Условия и сроки хранения</h2>
      <p>
        Персональные данные хранятся не дольше, чем этого требуют цели их
        обработки, либо до отзыва субъектом согласия. По достижении целей
        обработки или при отзыве согласия данные подлежат уничтожению или
        обезличиванию в срок, установленный законодательством.
      </p>

      <h2>6. Передача данных третьим лицам</h2>
      <p>
        Оператор не передаёт персональные данные третьим лицам, за исключением
        случаев, предусмотренных законодательством Российской Федерации.
        Трансграничная передача персональных данных не осуществляется.
      </p>

      <h2>7. Защита персональных данных</h2>
      <p>
        Оператор принимает необходимые правовые, организационные и технические
        меры для защиты персональных данных от неправомерного доступа,
        уничтожения, изменения, блокирования, копирования и распространения.
      </p>

      <h2>8. Права субъекта персональных данных</h2>
      <p>Субъект персональных данных вправе:</p>
      <ul>
        <li>получать сведения об обработке своих персональных данных;</li>
        <li>требовать уточнения, блокирования или уничтожения данных;</li>
        <li>отозвать согласие на обработку персональных данных;</li>
        <li>обжаловать действия Оператора в уполномоченном органе или суде.</li>
      </ul>
      <p>
        Для реализации своих прав субъект направляет обращение на адрес
        электронной почты{" "}
        <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>.
      </p>

      <h2>9. Использование файлов cookie</h2>
      <p>
        Сайт может использовать технически необходимые файлы cookie,
        обеспечивающие его корректную работу. Пользователь может настроить
        параметры хранения cookie в своём браузере.
      </p>

      <h2>10. Изменение Политики</h2>
      <p>
        Оператор вправе вносить изменения в настоящую Политику. Актуальная
        редакция всегда доступна на данной странице. Дата последнего обновления
        указана в начале документа.
      </p>
    </>
  );
}

function EnglishBody() {
  return (
    <>
      <p>
        This Policy sets out how personal data of users of the{" "}
        <a href="https://mevratek.ru">mevratek.ru</a> website (the “Site”) is
        processed and protected by the personal data operator{" "}
        {COMPANY.legalNameEn} (the “Operator”). It is drawn up in accordance
        with Russian Federal Law No. 152-FZ of 27 July 2006 “On Personal Data”.
      </p>
      <p>
        This is a translation provided for convenience. The Russian text is the
        operative version; where the two differ, the{" "}
        <a href="/privacy">Russian Policy</a> governs.
      </p>

      <Requisites locale="en" />

      <h2>1. Definitions</h2>
      <p>
        <strong>Personal data</strong> means any information relating to a
        directly or indirectly identified or identifiable natural person (the
        data subject). <strong>Processing</strong> means any operation performed
        on personal data, whether by automated means or not.
      </p>

      <h2>2. What data is processed</h2>
      <p>
        The Operator processes the data a user voluntarily submits through the
        contact form on the Site:
      </p>
      <ul>
        <li>name;</li>
        <li>email address;</li>
        <li>organisation name, if given;</li>
        <li>the content of the enquiry and anything else the user includes.</li>
      </ul>
      <p>
        The Operator does not process special categories of personal data or
        biometric personal data.
      </p>

      <h2>3. Purposes of processing</h2>
      <ul>
        <li>handling enquiries and replying to them;</li>
        <li>
          arranging pilot projects, partnerships and other engagement initiated
          by the user;
        </li>
        <li>
          providing information about the Operator's products and services on
          request.
        </li>
      </ul>

      <h2>4. Legal basis</h2>
      <p>
        Processing is carried out on the basis of the data subject's consent,
        given when the contact form is submitted, and on the basis of Federal
        Law No. 152-FZ and other legislation of the Russian Federation.
      </p>

      <h2>5. Retention</h2>
      <p>
        Personal data is kept no longer than the purposes of its processing
        require, or until the data subject withdraws consent. Once those
        purposes are met, or consent is withdrawn, the data is destroyed or
        anonymised within the period set by law.
      </p>

      <h2>6. Disclosure to third parties</h2>
      <p>
        The Operator does not disclose personal data to third parties except
        where the legislation of the Russian Federation requires it. No
        cross-border transfer of personal data takes place.
      </p>

      <h2>7. Security</h2>
      <p>
        The Operator takes the legal, organisational and technical measures
        necessary to protect personal data against unlawful access, destruction,
        alteration, blocking, copying and distribution.
      </p>

      <h2>8. Rights of the data subject</h2>
      <p>The data subject has the right to:</p>
      <ul>
        <li>obtain information about the processing of their personal data;</li>
        <li>require that it be rectified, blocked or erased;</li>
        <li>withdraw consent to processing;</li>
        <li>
          appeal against the Operator's actions to the supervisory authority or
          the courts.
        </li>
      </ul>
      <p>
        To exercise these rights, write to{" "}
        <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>.
      </p>

      <h2>9. Cookies</h2>
      <p>
        The Site may use strictly necessary cookies required for it to work
        correctly. Cookie storage can be configured in your browser.
      </p>

      <h2>10. Changes to this Policy</h2>
      <p>
        The Operator may amend this Policy. The current version is always
        available on this page, and the date of the last update is shown at the
        top of the document.
      </p>
    </>
  );
}

export function PrivacyView({ locale }: { locale: Locale }) {
  const c = PRIVACY_COPY[locale];
  const p = (path: string) => localePath(locale, path);

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: t(locale, "home"), url: p("/") },
          { name: c.crumb, url: p("/privacy") },
        ]}
      />
      <LegalDoc title={c.docTitle} updated={c.updated} locale={locale}>
        {locale === "ru" ? <RussianBody /> : <EnglishBody />}
      </LegalDoc>
    </>
  );
}

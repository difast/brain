import Link from "next/link";

import { LegalDoc, Requisites } from "@/components/legal";
import { COMPANY } from "@/components/company";
import { BreadcrumbJsonLd } from "@/components/schema";
import { t } from "@/content/ui";
import { localePath, type Locale } from "@/i18n/config";

/**
 * The privacy policy for the MCP connector specifically.
 *
 * Kept separate from /privacy — which covers the site and the dashboard —
 * because a connector directory reviewer (Anthropic's or OpenAI's) needs one
 * URL that describes exactly what the integration touches, and burying that in
 * a general notice is how a submission gets sent back.
 */
export const PRIVACY_POLICY_COPY = {
  ru: {
    metaTitle: "Политика конфиденциальности MCP-коннектора",
    metaDescription:
      "Что MCP-коннектор Mevratek читает и записывает, как ограничен его доступ, что логируется, где хранятся данные и как отозвать доступ.",
    crumb: "Privacy Policy (MCP)",
    docTitle: "Политика конфиденциальности — MCP-интеграция Mevratek",
    updated: "15 сентября 2026 г.",
  },
  en: {
    metaTitle: "Privacy Policy — Mevratek MCP Integration",
    metaDescription:
      "What the Mevratek MCP connector reads and writes, how its access is scoped, what is logged, where data is stored, and how to revoke access.",
    crumb: "Privacy Policy (MCP)",
    docTitle: "Privacy Policy — Mevratek MCP Integration",
    updated: "15 September 2026",
  },
} as const;

function Table({
  head,
  rows,
}: {
  head: [string, string, string];
  rows: [string, string, string][];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
            {head.map((h) => (
              <th key={h} className="py-2.5 pr-4 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r[0]} className="border-b border-line/60 align-top">
              <td className="py-3 pr-4 text-ink-soft">{r[0]}</td>
              <td className="py-3 pr-4 font-mono text-xs text-ink">{r[1]}</td>
              <td className="py-3 pr-4 text-ink-soft">{r[2]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RussianBody({ locale }: { locale: Locale }) {
  const p = (path: string) => localePath(locale, path);
  return (
    <>
      <p>
        Эта политика описывает коннектор Mevratek для MCP-клиентов — Claude,
        ChatGPT и других. Она касается только интеграции. Использование самой
        платформы Mevratek регулируется{" "}
        <Link href={p("/privacy")}>Политикой в отношении обработки персональных
        данных</Link>.
      </p>

      <Requisites locale="ru" />

      <h2>1. К чему имеет доступ интеграция</h2>
      <p>
        У коннектора нет собственного хранилища. Он читает и записывает данные,
        которые уже принадлежат вашей организации в Mevratek, — и только их.
      </p>
      <Table
        head={["Данные", "Инструмент", "Зачем"]}
        rows={[
          [
            "Идентификатор, имя, тип, статус устройства и время последней связи",
            "get_devices, get_device_status",
            "Чтобы ассистент мог назвать и выбрать устройство",
          ],
          [
            "Телеметрия: заряд, скорость, координаты, ошибки",
            "get_telemetry, get_device_status",
            "Чтобы ассистент мог отвечать на вопросы о состоянии устройства",
          ],
          [
            "Журнал решений: задача, ответ модели, уверенность, провайдер, задержка",
            "get_decision_logs",
            "Чтобы ассистент мог объяснить, что устройство сделало и почему",
          ],
          [
            "Задачи, которые вы создаёте через ассистента",
            "send_task",
            "Чтобы поставить устройству задачу",
          ],
          [
            "Виртуальные устройства и сценарии, которые вы запускаете",
            "run_simulator",
            "Чтобы тестировать без физического железа",
          ],
        ]}
      />
      <p>
        <strong>Коннектор никогда не получает доступ</strong> к вашему паролю,
        платёжным данным, данным других организаций, настройкам аккаунта вашей
        команды, API-ключам и кадрам с камер.
      </p>

      <h2>2. Границы доступа</h2>
      <p>
        Доступ ограничен одной организацией — той, к которой принадлежит
        пользователь, подтвердивший подключение. Организация определяется на
        сервере из вашего аккаунта при каждом запросе и не берётся из того, что
        присылает ассистент. Идентификатор устройства другой организации
        возвращается как «не найдено».
      </p>
      <p>
        Токен доступа, выданный коннектору, ограничен перечисленными
        MCP-инструментами. Использовать его для обращения к API дашборда Mevratek
        нельзя.
      </p>

      <h2>3. Как используются данные</h2>
      <p>
        Данные возвращаются тому MCP-клиенту, который вы подключили — Claude
        компании Anthropic или ChatGPT компании OpenAI, — чтобы он ответил на
        ваш вопрос. Что происходит с ними дальше, регулируется{" "}
        <strong>их</strong> политикой конфиденциальности, а не нашей:
      </p>
      <ul>
        <li>
          Anthropic: <a href="https://www.anthropic.com/legal/privacy">anthropic.com/legal/privacy</a>
        </li>
        <li>
          OpenAI: <a href="https://openai.com/policies/privacy-policy">openai.com/policies/privacy-policy</a>
        </li>
      </ul>
      <p>
        Mevratek не продаёт данные, не передаёт их третьим лицам помимо
        выбранного вами MCP-клиента и не использует их для обучения моделей.
      </p>

      <h2>4. Что логирует Mevratek</h2>
      <p>
        По каждому вызову инструмента мы записываем его имя, организацию,
        пользователя и время. Это нужно, чтобы поддерживать работу сервиса,
        разбирать сбои и выявлять злоупотребления. Результаты вызовов в логи не
        попадают. Срок хранения — 90 дней.
      </p>
      <p>
        События авторизации — подтверждение коннектора, выдача и отзыв токена —
        отражаются в журнале действий вашего аккаунта, где вы можете их видеть.
      </p>

      <h2>5. Где хранятся данные</h2>
      <p>
        Платформа Mevratek работает на инфраструктуре в Российской Федерации.
        Заказчики, развернувшие Mevratek в своём контуре, держат данные целиком
        внутри собственного периметра — в этом случае коннектор обращается к их
        установке, а не к нашей.
      </p>

      <h2>6. Как отозвать доступ</h2>
      <p>Любое из этих действий немедленно прекращает подключение:</p>
      <ol>
        <li>
          <strong>В Mevratek:</strong> «Аккаунт → Сессии». Коннектор виден как
          сессия с именем клиента, например «MCP: Claude». Завершите её.
        </li>
        <li>
          <strong>В MCP-клиенте:</strong> удалите коннектор Mevratek из его
          настроек.
        </li>
        <li>
          <strong>Письмом:</strong> напишите на{" "}
          <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>, и мы отзовём
          доступ за вас.
        </li>
      </ol>
      <p>
        Отзыв действует со следующего запроса — кэшированных разрешений нет.
        Данные, уже переданные MCP-клиенту, подчиняются его собственным правилам
        хранения и удаления.
      </p>

      <h2>7. Ваши права</h2>
      <p>
        Вы вправе запросить доступ к своим персональным данным, их исправление
        или удаление, а также отозвать согласие в любой момент. Напишите на{" "}
        <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a> — мы отвечаем в
        течение 30 дней.
      </p>
      <p>
        Удаление аккаунта Mevratek удаляет ваши данные из наших систем, включая
        все выданные вами разрешения любым коннекторам.
      </p>

      <h2>8. Дети</h2>
      <p>
        Mevratek — продукт для бизнеса и не предназначен для детей. Мы осознанно
        не собираем данные лиц младше 18 лет.
      </p>

      <h2>9. Изменения</h2>
      <p>
        При изменении политики мы обновляем дату в начале страницы. Если
        изменение существенно затрагивает то, к чему обращается коннектор, мы
        попросим подтвердить подключение заново.
      </p>

      <h2>10. Контакты</h2>
      <p>
        {COMPANY.legalName}
        <br />
        Email: <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
        <br />
        Сайт: <a href="https://mevratek.ru">mevratek.ru</a>
      </p>
    </>
  );
}

function EnglishBody({ locale }: { locale: Locale }) {
  const p = (path: string) => localePath(locale, path);
  return (
    <>
      <p>
        This policy covers the Mevratek connector for MCP clients such as Claude
        and ChatGPT. It describes only the integration. Use of the Mevratek
        platform itself is covered by the{" "}
        <Link href={p("/privacy")}>privacy notice</Link>.
      </p>

      <Requisites locale="en" />

      <h2>1. What the integration accesses</h2>
      <p>
        The connector does not have its own data store. It reads and writes the
        data that already belongs to your organization in Mevratek, and only
        that data.
      </p>
      <Table
        head={["Data", "Tool", "Why"]}
        rows={[
          [
            "Device identifier, name, type, status, last-seen time",
            "get_devices, get_device_status",
            "So the assistant can name and pick a device",
          ],
          [
            "Telemetry: battery, speed, coordinates, reported errors",
            "get_telemetry, get_device_status",
            "So the assistant can answer questions about device state",
          ],
          [
            "Decision log: task, model output, confidence, provider, latency",
            "get_decision_logs",
            "So the assistant can explain what a device did and why",
          ],
          [
            "Tasks you create through the assistant",
            "send_task",
            "To queue work for a device",
          ],
          [
            "Simulated devices and scenarios you start",
            "run_simulator",
            "To test without physical hardware",
          ],
        ]}
      />
      <p>
        <strong>The connector never accesses:</strong> your password, your
        payment details, other organizations' data, your team's account
        settings, API keys, or camera frames.
      </p>

      <h2>2. Scope of access</h2>
      <p>
        Access is limited to the single organization of the user who approved
        the connection. The organization is resolved server-side from your
        account on every request — it is not taken from anything the assistant
        sends. A device identifier belonging to another organization is reported
        as not found.
      </p>
      <p>
        The access token issued to the connector is scoped to the MCP tools
        listed above. It cannot be used against the Mevratek dashboard API.
      </p>

      <h2>3. How data is used</h2>
      <p>
        Data is returned to the MCP client you connected — Anthropic's Claude or
        OpenAI's ChatGPT — so it can answer your question. What happens to it
        after that is governed by <strong>their</strong> privacy policy, not
        ours:
      </p>
      <ul>
        <li>
          Anthropic:{" "}
          <a href="https://www.anthropic.com/legal/privacy">
            anthropic.com/legal/privacy
          </a>
        </li>
        <li>
          OpenAI:{" "}
          <a href="https://openai.com/policies/privacy-policy">
            openai.com/policies/privacy-policy
          </a>
        </li>
      </ul>
      <p>
        Mevratek does not sell data, does not share it with third parties beyond
        the MCP client you chose to connect, and does not use it to train any
        model.
      </p>

      <h2>4. What Mevratek logs</h2>
      <p>
        For each tool call we record the tool name, the organization, the user,
        and the time. We do this to operate the service, investigate faults, and
        detect abuse. Logs do not contain tool results. They are kept for 90
        days.
      </p>
      <p>
        Authorization events — a connector being approved, a token being issued
        or revoked — are recorded in your account's activity log, where you can
        see them.
      </p>

      <h2>5. Where data is stored</h2>
      <p>
        The Mevratek platform runs on infrastructure in the Russian Federation.
        Customers who deploy Mevratek on premises hold their data entirely
        within their own perimeter; in that case this connector talks to their
        installation, not to ours.
      </p>

      <h2>6. How to revoke access</h2>
      <p>Any of these ends the connection immediately:</p>
      <ol>
        <li>
          <strong>In Mevratek:</strong> Account → Sessions. The connector appears
          as a session named after the client, e.g. “MCP: Claude”. End that
          session.
        </li>
        <li>
          <strong>In the MCP client:</strong> remove the Mevratek connector from
          its settings.
        </li>
        <li>
          <strong>By email:</strong> write to{" "}
          <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a> and we will
          revoke it for you.
        </li>
      </ol>
      <p>
        Revoking takes effect on the next request — there is no cached grant.
        Data already delivered to the MCP client is subject to that client's own
        retention and deletion controls.
      </p>

      <h2>7. Your rights</h2>
      <p>
        You may request access to, correction of, or deletion of your personal
        data, and you may withdraw consent at any time. Write to{" "}
        <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>. We respond
        within 30 days.
      </p>
      <p>
        Deleting your Mevratek account removes your data from our systems,
        including every authorization you granted to any connector.
      </p>

      <h2>8. Children</h2>
      <p>
        Mevratek is a business product and is not directed at children. We do
        not knowingly collect data from anyone under 18.
      </p>

      <h2>9. Changes</h2>
      <p>
        We will update the date at the top of this page when this policy
        changes. If a change materially affects what the connector accesses, we
        will ask you to approve the connection again.
      </p>

      <h2>10. Contact</h2>
      <p>
        {COMPANY.legalNameEn}
        <br />
        Email: <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
        <br />
        Website: <a href="https://mevratek.ru">mevratek.ru</a>
      </p>
    </>
  );
}

export function PrivacyPolicyView({ locale }: { locale: Locale }) {
  const c = PRIVACY_POLICY_COPY[locale];
  const p = (path: string) => localePath(locale, path);

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: t(locale, "home"), url: p("/") },
          { name: c.crumb, url: p("/privacy-policy") },
        ]}
      />
      <LegalDoc title={c.docTitle} updated={c.updated} locale={locale}>
        {locale === "ru" ? (
          <RussianBody locale={locale} />
        ) : (
          <EnglishBody locale={locale} />
        )}
      </LegalDoc>
    </>
  );
}

# Мониторинг

Платформа разворачивается в контуре заказчика, поэтому наблюдаемость тоже
разворачивается там: наружу телеметрия не уходит. Бэкенд отдаёт всё, что нужно
Prometheus, и умеет отправлять ошибки в Sentry — оба канала выключены по
умолчанию и включаются переменными окружения.

Ключевой вопрос, ради которого всё это существует: **какая доля решений
пришла от модели, а какая — от детерминированной заглушки.** Если провайдер
LLM недоступен, устройства продолжают ехать, но едут они на канонической
резервной логике. Без метрики об этом сообщает заказчик; с метрикой — алерт.

## Prometheus

### Эндпоинт

`GET /metrics` — вне префикса `/api/v1` и вне OpenAPI, в формате экспозиции
0.0.4. Он описывает **всю установку**, а не одну организацию (страница
`/metrics` в панели — это другое: она про одну организацию и её видит клиент).

```
METRICS_ENABLED=true
METRICS_TOKEN=<длинная случайная строка>
```

Скрейп обязан прислать `Authorization: Bearer $METRICS_TOKEN`. В production
токен обязателен: без него эндпоинт отвечает 404, а не отдаёт размер парка
всем желающим.

```bash
openssl rand -hex 32     # так генерируется токен
```

### Конфигурация scrape

```yaml
scrape_configs:
  - job_name: mevratek
    scrape_interval: 30s
    metrics_path: /metrics
    scheme: https
    authorization:
      type: Bearer
      credentials: <METRICS_TOKEN>
    static_configs:
      - targets: ["api.mevratek.internal:8000"]
```

### Что отдаётся

| Метрика | Тип | О чём |
|---|---|---|
| `mevratek_build_info{version,environment,provider,model}` | gauge | Всегда 1; в лейблах — версия и какой провайдер выбран |
| `mevratek_http_requests_total{method,route,status}` | counter | Запросы по шаблону маршрута (не по сырому пути) |
| `mevratek_http_request_duration_seconds{method,route}` | histogram | Латентность API |
| `mevratek_http_requests_in_flight` | gauge | Запросов в обработке прямо сейчас |
| `mevratek_http_exceptions_total{route}` | counter | Необработанные исключения |
| `mevratek_decisions_total{provider,outcome}` | counter | Решения; `outcome=fallback` — заглушка |
| `mevratek_decision_duration_seconds{provider,outcome}` | histogram | Сколько думал провайдер |
| `mevratek_decision_confidence{provider,outcome}` | histogram | Уверенность модели |
| `mevratek_dropped_actions_total` | counter | Действия, которые не легли на возможности устройства |
| `mevratek_emails_total{outcome}` | counter | Исходящая почта: `sent` / `failed` / `skipped` |
| `mevratek_organizations`, `mevratek_users` | gauge | Размер установки |
| `mevratek_devices{status}` | gauge | Устройства: `online`, `offline`, `error`, `paused` |
| `mevratek_tasks{status}` | gauge | Очередь задач |
| `mevratek_executions{status}` | gauge | Обратная связь по исполнению действий |
| `mevratek_decision_logs{outcome}` | gauge | Решения за последние 24 часа, из базы |
| `mevratek_decision_latency_ms{quantile}` | gauge | p50 / p95 / p99 за 24 часа, из базы |
| `mevratek_scrape_duration_seconds` | gauge | Во сколько обошёлся сам скрейп |

Счётчики живут в процессе и обнуляются при перезапуске — это нормально,
Prometheus сам обрабатывает сброс счётчика. Gauge-метрики читаются из базы на
каждом скрейпе. Если база недоступна, эндпоинт всё равно отвечает 200 и отдаёт
счётчики: мониторинг обязан пережить ту аварию, о которой он должен сообщить.

Лейбл `route` — это **шаблон** маршрута (`/api/v1/robots/{robot_id}`), а не
сырой путь; идентификаторы устройств в лейблы не попадают. Всё, что не
совпало ни с одним маршрутом, схлопывается в `<unmatched>`, чтобы сканер,
перебирающий URL-ы, не породил по временному ряду на каждый URL.

### Правила алертов

```yaml
groups:
  - name: mevratek
    rules:
      # Главное. Провайдер отвечает ошибками, парк едет на заглушке.
      - alert: MevratekDecisionsFallingBack
        expr: |
          sum(rate(mevratek_decisions_total{outcome="fallback"}[15m]))
          /
          sum(rate(mevratek_decisions_total[15m])) > 0.1
        for: 10m
        labels: {severity: critical}
        annotations:
          summary: "Более 10% решений — заглушка, а не модель"

      # Ни одного решения от модели за сутки при живом парке.
      - alert: MevratekNoModelDecisions
        expr: mevratek_decision_logs{outcome="model"} == 0
              and mevratek_devices{status="online"} > 0
        for: 30m
        labels: {severity: critical}
        annotations:
          summary: "Устройства онлайн, но ни одного решения от модели за 24 часа"

      - alert: MevratekDecisionLatencyHigh
        expr: |
          histogram_quantile(
            0.95,
            sum by (le) (rate(mevratek_decision_duration_seconds_bucket[10m]))
          ) > 5
        for: 10m
        labels: {severity: warning}
        annotations:
          summary: "p95 времени решения выше 5 секунд"

      - alert: MevratekApiErrors
        expr: |
          sum(rate(mevratek_http_requests_total{status=~"5.."}[5m]))
          /
          sum(rate(mevratek_http_requests_total[5m])) > 0.02
        for: 5m
        labels: {severity: warning}
        annotations:
          summary: "Более 2% запросов к API отвечают 5xx"

      - alert: MevratekDevicesInError
        expr: mevratek_devices{status="error"} > 0
        for: 15m
        labels: {severity: warning}
        annotations:
          summary: "Устройства сообщают об ошибке дольше 15 минут"

      - alert: MevratekEmailFailing
        expr: rate(mevratek_emails_total{outcome="failed"}[15m]) > 0
        for: 15m
        labels: {severity: warning}
        annotations:
          summary: "SMTP отклоняет письма — коды подтверждения не доходят"

      - alert: MevratekDown
        expr: up{job="mevratek"} == 0
        for: 2m
        labels: {severity: critical}
        annotations:
          summary: "Бэкенд не отвечает на скрейп"
```

Порог 10% в первом правиле — не догма. На пилоте, где провайдер настроен и
должен отвечать всегда, разумно поставить 1%.

## Sentry

```
SENTRY_DSN=https://…@sentry.example.internal/1
SENTRY_ENVIRONMENT=production      # по умолчанию берётся из ENVIRONMENT
SENTRY_TRACES_SAMPLE_RATE=0.0      # 0 = только ошибки
```

Без `SENTRY_DSN` SDK не инициализируется вообще: ни импорта, ни сетевых
вызовов, ни накладных расходов. С ним в Sentry попадают необработанные
исключения и всё, что залогировано на уровне ERROR, с проставленным
`request_id` — по нему событие находится в логе приложения.

Что **не** уходит в Sentry, даже когда он включён:

* тела запросов — там кадры с камер и телеметрия;
* заголовок `Authorization` и `X-Api-Key` — там токены устройств;
* cookies;
* пробы `/health`, `/ready` и сам `/metrics` — они не трассируются.

Sentry можно поднять в собственном контуре (self-hosted). Для установки, где
данные не должны покидать периметр, это единственный допустимый вариант —
облачный sentry.io отправит события наружу.

## Проверка

```bash
# Эндпоинт отвечает и отдаёт формат экспозиции
curl -sS -H "Authorization: Bearer $METRICS_TOKEN" \
  http://localhost:8000/metrics | head -20

# Доля заглушки прямо сейчас
curl -sS -H "Authorization: Bearer $METRICS_TOKEN" \
  http://localhost:8000/metrics | grep mevratek_decision_logs

# Без токена — 401, а в production без настроенного токена — 404
curl -sS -o /dev/null -w '%{http_code}\n' http://localhost:8000/metrics
```

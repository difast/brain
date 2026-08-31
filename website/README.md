# Mevratek — маркетинговый сайт

Многостраничный сайт Mevratek на Next.js 14 (App Router) + TypeScript + Tailwind CSS.

## Локальный запуск

```bash
cd website
npm install
npm run dev        # http://localhost:3001
```

## Сборка

```bash
npm run build && npm start
```

## Переменные окружения

| Переменная                  | Назначение                                              |
| --------------------------- | -------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`      | Канонический URL сайта (canonical/OG, sitemap, robots)   |
| `NEXT_PUBLIC_API_BASE_URL`  | Базовый URL backend API для формы заявки (`{URL}/leads`) |

Next.js встраивает переменные `NEXT_PUBLIC_*` в клиентский бандл **на этапе сборки**,
а не во время запуска контейнера — значение, заданное только как runtime-переменная
окружения, на уже собранный билд не повлияет. При сборке через Docker
(`website/Dockerfile`) обе переменные передаются как build ARG; при сборке через
Node-buildpack переменные окружения панели доступны `npm run build` напрямую.

## Деплой (Timeweb Cloud Apps)

Отдельное приложение с директорией проекта `website`, автодеплой по пушу в `main`.
Docker (`website/Dockerfile`) или Node-buildpack:

- Зависимости: `npm ci` (или пусто — buildpack ставит сам)
- Команда сборки: `npm run build`
- Команда запуска: `npx next start` (Next читает `PORT` из окружения)
- Внутренний порт: `3000`
- Build-time переменные: `NEXT_PUBLIC_SITE_URL=https://<домен-сайта>`,
  `NEXT_PUBLIC_API_BASE_URL=https://<домен-backend>/api/v1`

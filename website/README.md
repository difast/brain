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

| Переменная            | Назначение                                          |
| --------------------- | --------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`| Канонический URL сайта (canonical/OG, sitemap, robots) |

## Деплой (Timeweb Cloud Apps)

Отдельное приложение с директорией проекта `website`, автодеплой по пушу в `main`.
Docker (`website/Dockerfile`) или Node-buildpack:

- Зависимости: `npm ci` (или пусто — buildpack ставит сам)
- Команда сборки: `npm run build`
- Команда запуска: `npx next start` (Next читает `PORT` из окружения)
- Внутренний порт: `3000`
- Build-time переменная: `NEXT_PUBLIC_SITE_URL=https://<домен-сайта>`

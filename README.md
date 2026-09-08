# RTK Education CRM — frontend prototype

Прототип CRM для контроля взаимодействия с учебными заведениями.

## Стек

- React
- Vite
- TypeScript
- CSS
- Mock API, совместимый с будущим REST API ASP.NET Core

## Запуск

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
npm run preview
```

## Архитектура

```text
src/
├── api/
│   ├── client.ts       # контракты API
│   └── index.ts        # текущая реализация API
├── mock/
│   └── mockApi.ts      # временный backend
├── data/
│   └── mockData.ts     # демо-данные
├── types/
│   └── domain.ts       # доменные модели
├── components/
│   ├── AppShell.tsx
│   └── Icon.tsx
└── pages/
    ├── UniversitiesPage.tsx
    ├── UniversityDetailsPage.tsx
    └── PlaceholderPage.tsx
```

## Маршруты прототипа

- `/` — обзор/список вузов
- `/universities` — список вузов
- `/universities/:id` — CRM-карточка конкретного вуза
- `/programs` — заготовка раздела программ
- `/analytics` — заготовка аналитики
- `/tasks` — заготовка задач
- `/documents` — заготовка документов

Роутинг пока сделан без дополнительной библиотеки: через History API браузера. Это позволяет не добавлять лишнюю зависимость на раннем этапе.

## Подключение ASP.NET Core

UI не должен импортировать `mockData` напрямую. Компоненты работают через `api` из `src/api/index.ts`.

Сейчас:

```ts
export const api = mockApi
```

Позже можно реализовать `httpApi` с REST-запросами к ASP.NET Core и заменить одну строку:

```ts
export const api = httpApi
```

Предполагаемые endpoints:

```text
GET    /api/universities
GET    /api/universities/{id}
GET    /api/universities/{id}/programs
GET    /api/universities/{id}/workflow
GET    /api/universities/{id}/activities
PATCH  /api/workflow/stages/{id}
POST   /api/tasks
PATCH  /api/tasks/{id}
```

Это предварительный контракт для согласования с backend-командой, а не финальная спецификация API.

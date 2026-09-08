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
GET    /api/universities/{id}/programs/{programId}/workflow
GET    /api/universities/{id}/activities
PATCH  /api/universities/{id}/programs/{programId}/workflow/stages/{stageId}
POST   /api/tasks
PATCH  /api/tasks/{id}
```

Это предварительный контракт для согласования с backend-командой, а не финальная спецификация API.

## Цикл взаимодействия по программам

В карточке вуза выберите программу и ИТ-продукт. Каждая программа содержит собственные 14 этапов: выбор и изменение этапа не затрагивают остальные программы. Открыть нужную программу можно также из каталога или по адресу `/universities/1?program=3`.

В панели этапа можно сохранить статус, ответственного, дату начала и комментарий. Сохранение добавляет запись в активность вуза. Изменения живут в памяти mock API до перезагрузки страницы, что явно указано в интерфейсе; backend и постоянное хранение пока не подключены.

Прогресс программы — доля выполненных этапов. Прогресс вуза — доля выполненных этапов всех его программ. Количество программ, обучающихся и потоков рассчитывается по фактическим демо-программам. Активными считаются программы с этапами «В процессе» или «Требует внимания». Статусы этапов редактируются независимо: завершение одного не переводит следующий автоматически. Для краткого названия текущего этапа приоритет имеет заблокированный этап, затем активный, затем первый предстоящий; полностью выполненная программа помечается «Завершено».

`UniversityDetails.programs[].workflow` содержит этапы с уникальным `id`, `programId`, `universityId` и порядковым номером `order`. Метод `ApiClient.updateProgramStage(universityId, programId, stageId, update)` принимает `status`, `owner`, `date` (YYYY-MM-DD), `note` и возвращает обновлённую карточку вуза. Этот контракт предназначен для будущего HTTP-адаптера.

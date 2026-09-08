import type { Activity, Program, University, WorkflowStage } from '../types/domain'

export const universities: University[] = [
  {
    id: 1,
    name: 'Московский государственный технический университет',
    shortName: 'МГТУ',
    city: 'Москва',
    contactPerson: 'Иванов Иван Сергеевич',
    contactRole: 'Заместитель директора по цифровизации',
    status: 'Активное взаимодействие',
    programsCount: 12,
    activePrograms: 8,
    students: 1240,
    streams: 6,
    progress: 64,
  },
  {
    id: 2,
    name: 'Национальный исследовательский университет',
    shortName: 'НИУ',
    city: 'Москва',
    contactPerson: 'Соколова Мария Андреевна',
    contactRole: 'Руководитель образовательных программ',
    status: 'Внедрение',
    programsCount: 8,
    activePrograms: 6,
    students: 860,
    streams: 4,
    progress: 78,
  },
  {
    id: 3,
    name: 'Санкт-Петербургский политехнический университет',
    shortName: 'СПбПУ',
    city: 'Санкт-Петербург',
    contactPerson: 'Кузнецов Алексей Игоревич',
    contactRole: 'Директор центра цифровых компетенций',
    status: 'Коммуникация',
    programsCount: 5,
    activePrograms: 3,
    students: 430,
    streams: 2,
    progress: 21,
  },
  {
    id: 4,
    name: 'Уральский федеральный университет',
    shortName: 'УрФУ',
    city: 'Екатеринбург',
    contactPerson: 'Волкова Елена Олеговна',
    contactRole: 'Координатор ИТ-направлений',
    status: 'Контакт найден',
    programsCount: 4,
    activePrograms: 2,
    students: 280,
    streams: 2,
    progress: 9,
  },
]

const workflowTemplate = [
  ['Поиск контактов', 'Контакт'],
  ['Коммуникация', 'Коммуникация'],
  ['Организация встречи', 'Встреча'],
  ['Обмен документами', 'Документы'],
  ['Корректировка документов', 'Корректировка'],
  ['Подписание документов', 'Подписание'],
  ['Передача материалов', 'Материалы'],
  ['Внедрение ИТ-продуктов', 'Внедрение'],
  ['Обучение преподавателей', 'Обучение'],
  ['Актуализация учебной программы', 'Программа'],
  ['Ведение занятий', 'Занятия'],
  ['Актуализация документации', 'Документация'],
  ['Повышение квалификации', 'Повышение'],
  ['Контроль исполнения', 'Контроль'],
] as const

const basePrograms: Omit<Program, 'workflow'>[] = [
  { id: 1, universityId: 1, name: 'Информационная безопасность', product: 'РТК Security', students: 320, streams: 3, applications: 1480, demand: 91, stage: 'Обучение' },
  { id: 2, universityId: 1, name: 'Анализ данных', product: 'РТК DataLab', students: 180, streams: 2, applications: 760, demand: 78, stage: 'Подписание' },
  { id: 3, universityId: 1, name: 'DevOps и облачные технологии', product: 'РТК Cloud', students: 240, streams: 1, applications: 1120, demand: 87, stage: 'Внедрение' },
  { id: 4, universityId: 1, name: 'Разработка ПО', product: 'РТК DevTools', students: 500, streams: 4, applications: 2050, demand: 95, stage: 'Занятия' },
  { id: 5, universityId: 2, name: 'Инженерия данных', product: 'РТК DataLab', students: 260, streams: 2, applications: 930, demand: 89, stage: 'Внедрение' },
  { id: 6, universityId: 2, name: 'Кибербезопасность', product: 'РТК Security', students: 340, streams: 2, applications: 1250, demand: 93, stage: 'Внедрение' },
  { id: 7, universityId: 3, name: 'Разработка ПО', product: 'РТК DevTools', students: 190, streams: 1, applications: 670, demand: 74, stage: 'Встреча' },
  { id: 8, universityId: 4, name: 'Основы DevOps', product: 'РТК Cloud', students: 110, streams: 1, applications: 390, demand: 68, stage: 'Контакт' },
]

export const programs: Program[] = basePrograms.map(program => {
  const current = workflowTemplate.findIndex(([, shortTitle]) => shortTitle === program.stage)
  return {
    ...program,
    workflow: workflowTemplate.map(([title, shortTitle], index): WorkflowStage => ({
      id: program.id * 100 + index + 1,
      universityId: program.universityId,
      programId: program.id,
      order: index + 1,
      title,
      shortTitle,
      status: index < current ? 'done' : index === current ? 'active' : 'pending',
      ...(index === current ? {
        owner: 'Петров А.А.',
        date: '2026-09-02',
        note: `Текущий этап программы «${program.name}».`,
      } : {}),
    })),
  }
})

export const activities: Activity[] = [
  { id: 1, universityId: 1, time: '14:32', title: 'Изменён статус этапа', description: 'Петров А.А. перевёл «Подписание документов» в работу', type: 'info' },
  { id: 2, universityId: 1, time: '13:15', title: 'Загружен документ', description: 'Дополнительное соглашение №24.pdf', type: 'success' },
  { id: 3, universityId: 1, time: '11:48', title: 'Добавлен преподаватель', description: 'Смирнова Е.В. назначена на программу «DevOps»', type: 'success' },
  { id: 4, universityId: 1, time: 'Вчера', title: 'Проведена встреча', description: 'Встреча с представителями кафедры ИТ', type: 'info' },
  { id: 5, universityId: 1, time: 'Вчера', title: 'Обновлена программа', description: 'Изменены требования к курсу «Информационная безопасность»', type: 'warning' },
  { id: 6, universityId: 2, time: '16:40', title: 'Завершено внедрение', description: 'РТК Security установлен в учебной лаборатории', type: 'success' },
  { id: 7, universityId: 2, time: '12:10', title: 'Назначена встреча', description: 'Обучение преподавателей запланировано на 15.09', type: 'info' },
  { id: 8, universityId: 3, time: '10:05', title: 'Добавлен контакт', description: 'Кузнецов А.И. назначен ответственным от вуза', type: 'success' },
  { id: 9, universityId: 4, time: '09:20', title: 'Создано взаимодействие', description: 'Запущена программа «Основы DevOps»', type: 'info' },
]

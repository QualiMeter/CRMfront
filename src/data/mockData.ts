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

export const workflowByUniversity: Record<number, WorkflowStage[]> = {
  1: [
    { id: 1, universityId: 1, title: 'Поиск контактов', shortTitle: 'Контакт', status: 'done', date: '12.08.2026' },
    { id: 2, universityId: 1, title: 'Коммуникация', shortTitle: 'Коммуникация', status: 'done', date: '14.08.2026' },
    { id: 3, universityId: 1, title: 'Организация встречи', shortTitle: 'Встреча', status: 'done', date: '19.08.2026' },
    { id: 4, universityId: 1, title: 'Обмен документами', shortTitle: 'Документы', status: 'done', date: '22.08.2026' },
    { id: 5, universityId: 1, title: 'Корректировка документов', shortTitle: 'Корректировка', status: 'done', date: '25.08.2026' },
    { id: 6, universityId: 1, title: 'Подписание документов', shortTitle: 'Подписание', status: 'active', date: '02.09.2026', owner: 'Петров А.А.', note: 'Ожидаем финальное согласование юридического отдела.' },
    { id: 7, universityId: 1, title: 'Передача материалов', shortTitle: 'Материалы', status: 'pending' },
    { id: 8, universityId: 1, title: 'Внедрение ИТ-продуктов', shortTitle: 'Внедрение', status: 'pending' },
    { id: 9, universityId: 1, title: 'Обучение преподавателей', shortTitle: 'Обучение', status: 'pending' },
    { id: 10, universityId: 1, title: 'Актуализация учебной программы', shortTitle: 'Программа', status: 'pending' },
    { id: 11, universityId: 1, title: 'Ведение занятий', shortTitle: 'Занятия', status: 'pending' },
    { id: 12, universityId: 1, title: 'Актуализация документации', shortTitle: 'Документация', status: 'pending' },
    { id: 13, universityId: 1, title: 'Повышение квалификации', shortTitle: 'Повышение', status: 'pending' },
    { id: 14, universityId: 1, title: 'Контроль исполнения', shortTitle: 'Контроль', status: 'pending' },
  ],
  2: [
    { id: 1, universityId: 2, title: 'Поиск контактов', shortTitle: 'Контакт', status: 'done', date: '01.07.2026' },
    { id: 2, universityId: 2, title: 'Коммуникация', shortTitle: 'Коммуникация', status: 'done', date: '03.07.2026' },
    { id: 3, universityId: 2, title: 'Организация встречи', shortTitle: 'Встреча', status: 'done', date: '08.07.2026' },
    { id: 4, universityId: 2, title: 'Обмен документами', shortTitle: 'Документы', status: 'done', date: '14.07.2026' },
    { id: 5, universityId: 2, title: 'Корректировка документов', shortTitle: 'Корректировка', status: 'done', date: '20.07.2026' },
    { id: 6, universityId: 2, title: 'Подписание документов', shortTitle: 'Подписание', status: 'done', date: '25.07.2026' },
    { id: 7, universityId: 2, title: 'Передача материалов', shortTitle: 'Материалы', status: 'done', date: '29.07.2026' },
    { id: 8, universityId: 2, title: 'Внедрение ИТ-продуктов', shortTitle: 'Внедрение', status: 'active', date: '05.08.2026', owner: 'Петров А.А.', note: 'Идёт установка и настройка продукта в лаборатории.' },
    { id: 9, universityId: 2, title: 'Обучение преподавателей', shortTitle: 'Обучение', status: 'pending' },
    { id: 10, universityId: 2, title: 'Актуализация учебной программы', shortTitle: 'Программа', status: 'pending' },
    { id: 11, universityId: 2, title: 'Ведение занятий', shortTitle: 'Занятия', status: 'pending' },
    { id: 12, universityId: 2, title: 'Актуализация документации', shortTitle: 'Документация', status: 'pending' },
    { id: 13, universityId: 2, title: 'Повышение квалификации', shortTitle: 'Повышение', status: 'pending' },
    { id: 14, universityId: 2, title: 'Контроль исполнения', shortTitle: 'Контроль', status: 'pending' },
  ],
  3: Array.from({ length: 14 }, (_, index) => ({
    id: index + 1,
    universityId: 3,
    title: ['Поиск контактов', 'Коммуникация', 'Организация встречи', 'Обмен документами', 'Корректировка документов', 'Подписание документов', 'Передача материалов', 'Внедрение ИТ-продуктов', 'Обучение преподавателей', 'Актуализация учебной программы', 'Ведение занятий', 'Актуализация документации', 'Повышение квалификации', 'Контроль исполнения'][index],
    shortTitle: ['Контакт', 'Коммуникация', 'Встреча', 'Документы', 'Корректировка', 'Подписание', 'Материалы', 'Внедрение', 'Обучение', 'Программа', 'Занятия', 'Документация', 'Повышение', 'Контроль'][index],
    status: index < 2 ? 'done' : index === 2 ? 'active' : 'pending',
  })),
  4: Array.from({ length: 14 }, (_, index) => ({
    id: index + 1,
    universityId: 4,
    title: ['Поиск контактов', 'Коммуникация', 'Организация встречи', 'Обмен документами', 'Корректировка документов', 'Подписание документов', 'Передача материалов', 'Внедрение ИТ-продуктов', 'Обучение преподавателей', 'Актуализация учебной программы', 'Ведение занятий', 'Актуализация документации', 'Повышение квалификации', 'Контроль исполнения'][index],
    shortTitle: ['Контакт', 'Коммуникация', 'Встреча', 'Документы', 'Корректировка', 'Подписание', 'Материалы', 'Внедрение', 'Обучение', 'Программа', 'Занятия', 'Документация', 'Повышение', 'Контроль'][index],
    status: index === 0 ? 'active' : 'pending',
  })),
}

const basePrograms: Program[] = [
  { id: 1, universityId: 1, name: 'Информационная безопасность', product: 'РТК Security', students: 320, streams: 3, applications: 1480, demand: 91, stage: 'Обучение' },
  { id: 2, universityId: 1, name: 'Анализ данных', product: 'РТК DataLab', students: 180, streams: 2, applications: 760, demand: 78, stage: 'Подписание' },
  { id: 3, universityId: 1, name: 'DevOps и облачные технологии', product: 'РТК Cloud', students: 240, streams: 1, applications: 1120, demand: 87, stage: 'Внедрение' },
  { id: 4, universityId: 1, name: 'Разработка ПО', product: 'РТК DevTools', students: 500, streams: 4, applications: 2050, demand: 95, stage: 'Занятия' },
  { id: 5, universityId: 2, name: 'Инженерия данных', product: 'РТК DataLab', students: 260, streams: 2, applications: 930, demand: 89, stage: 'Внедрение' },
  { id: 6, universityId: 2, name: 'Кибербезопасность', product: 'РТК Security', students: 340, streams: 2, applications: 1250, demand: 93, stage: 'Внедрение' },
  { id: 7, universityId: 3, name: 'Разработка ПО', product: 'РТК DevTools', students: 190, streams: 1, applications: 670, demand: 74, stage: 'Встреча' },
  { id: 8, universityId: 4, name: 'Основы DevOps', product: 'РТК Cloud', students: 110, streams: 1, applications: 390, demand: 68, stage: 'Контакт' },
]

export const programs = basePrograms

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

// Backward-compatible aliases for the existing detail page.
export const university = universities[0]
export const workflowStages = workflowByUniversity[1]

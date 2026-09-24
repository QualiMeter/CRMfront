import { Icon } from '../components/Icon'
import '../help.css'

type Navigate = (path: string) => void

const roleCards = [
  { title: 'КАМ / менеджер', text: 'Ведёт закреплённые учебные заведения, программы, взаимодействия, документы, задачи и отчётность.' },
  { title: 'Руководитель', text: 'Контролирует работу КАМов, распределяет ответственность и видит сводную аналитику.' },
  { title: 'Администратор', text: 'Управляет доступом, системными настройками и подтверждает изменения статусов workflow.' },
]

export function HelpPage({ navigate }: { navigate: Navigate }) {
  return <div className="content help-page">
    <div className="page-heading">
      <div><div className="eyebrow">ВСТРОЕННАЯ ДОКУМЕНТАЦИЯ</div><h1>Руководство по CRM</h1><p className="muted">Основные сценарии работы с учебными заведениями, workflow, интеграциями и отчётностью.</p></div>
    </div>

    <section className="help-role-grid">
      {roleCards.map(card => <article className="card" key={card.title}><span><Icon name="users" size={19}/></span><div><h2>{card.title}</h2><p>{card.text}</p></div></article>)}
    </section>

    <section className="card help-section">
      <div className="help-section-heading"><span>01</span><div><h2>Работа КАМа с вузом</h2><p>Основной ежедневный сценарий CRM.</p></div></div>
      <ol className="help-steps">
        <li><strong>Откройте «Вузы»</strong><span>Найдите закреплённое учебное заведение и откройте его CRM-карточку.</span></li>
        <li><strong>Выберите ИТ-направление, программу и продукт</strong><span>Эти сущности учитываются отдельно и используются в аналитике и отчётах.</span></li>
        <li><strong>Проверьте карточку взаимодействия</strong><span>Вендор, договор, лицензия, статус передачи ПО, КАМ, ответственный от вуза и комментарий.</span></li>
        <li><strong>Работайте с этапами</strong><span>Добавляйте комментарии, ответственного, дату и вложения. Изменение статуса отправляется администратору на согласование.</span></li>
      </ol>
      <button className="outline-button" onClick={() => navigate('/universities')}>Открыть вузы <Icon name="arrow" size={15}/></button>
    </section>

    <section className="help-two-column">
      <article className="card help-section">
        <div className="help-section-heading"><span>02</span><div><h2>Согласование статуса</h2><p>Контроль изменений workflow.</p></div></div>
        <p>КАМ сохраняет данные этапа, но новый статус не вступает в силу сразу. В разделе «Согласования» создаётся запрос. Администратор подтверждает или отклоняет переход и может оставить комментарий.</p>
        <button className="outline-button" onClick={() => navigate('/approvals')}>Открыть согласования</button>
      </article>
      <article className="card help-section">
        <div className="help-section-heading"><span>03</span><div><h2>Интеграции</h2><p>LMS и сайт ИТ Школы.</p></div></div>
        <p>Демо-контур показывает двусторонний JSON-обмен: предпросмотр данных, импорт в CRM, подготовку выгрузки и журнал запусков. До получения реальных контрактов используются моки.</p>
        <button className="outline-button" onClick={() => navigate('/integrations')}>Открыть интеграции</button>
      </article>
    </section>

    <section className="help-two-column">
      <article className="card help-section">
        <div className="help-section-heading"><span>04</span><div><h2>Отчётность</h2><p>Срезы и экспорт.</p></div></div>
        <p>Фильтруйте данные по периоду, вузу, ИТ-направлению, продукту и ответственному. Набор колонок можно изменить перед выгрузкой. Поддерживаются XLS, XLSX и PDF.</p>
        <button className="outline-button" onClick={() => navigate('/reports')}>Открыть отчёты</button>
      </article>
      <article className="card help-section">
        <div className="help-section-heading"><span>05</span><div><h2>Аналитика</h2><p>Востребованность и контроль рисков.</p></div></div>
        <p>Дашборд показывает заявки, обучающихся, потоки, средний спрос, прогресс, лидирующие программы, состояние workflow и риски. Сводную визуализацию можно выгрузить в PNG или PDF.</p>
        <button className="outline-button" onClick={() => navigate('/analytics')}>Открыть аналитику</button>
      </article>
    </section>

    <section className="card help-section">
      <div className="help-section-heading"><span>06</span><div><h2>Импорт данных</h2><p>Массовая загрузка без ручного ввода.</p></div></div>
      <div className="help-import-grid">
        <div><strong>Учебные заведения</strong><span>XLS/XLSX, автоматическое сопоставление колонок и проверка дублей.</span><button onClick={() => navigate('/import')}>Импорт справочников</button></div>
        <div><strong>Программы</strong><span>Вуз, отдельное ИТ-направление, название программы, ИТ-продукт и показатели спроса.</span><button onClick={() => navigate('/import')}>Импорт программ</button></div>
        <div><strong>Студенты</strong><span>Поимённый реестр: ФИО + email, загрузка CSV/XLS/XLSX и предпросмотр ошибок.</span><button onClick={() => navigate('/student-registry')}>Реестр студентов</button></div>
      </div>
    </section>

    <section className="card help-section help-admin">
      <div className="help-section-heading"><span>07</span><div><h2>Администрирование</h2><p>Роли, процессы и контроль доступа.</p></div></div>
      <div className="help-admin-links">
        <button onClick={() => navigate('/users')}><Icon name="users" size={18}/><span><strong>Пользователи</strong><small>КАМы, руководители, администраторы и области доступа</small></span></button>
        <button onClick={() => navigate('/workflows')}><Icon name="grid" size={18}/><span><strong>Шаблоны процессов</strong><small>Новые версии применяются только к новым взаимодействиям</small></span></button>
        <button onClick={() => navigate('/documents')}><Icon name="file" size={18}/><span><strong>Документы</strong><small>Версии, категории, статусы и привязка к программам</small></span></button>
      </div>
    </section>

    <p className="demo-note">Перед финальной сдачей в руководство будут добавлены актуальные скриншоты интерфейса после фиксации финального дизайна. Текстовая часть уже встроена в платформу и соответствует текущему демонстрационному сценарию.</p>
  </div>
}

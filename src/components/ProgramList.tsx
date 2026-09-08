import type { Program } from '../types/domain'

export function ProgramList({ programs, selectedId, onSelect }: {
  programs: Program[]
  selectedId?: number
  onSelect: (program: Program) => void
}) {
  if (!programs.length) return <p className="empty-state">Программы не найдены.</p>
  return <>
    <div className="table-wrap program-table"><table><thead><tr><th>Программа</th><th>ИТ-продукт</th><th>Обучающиеся</th><th>Потоки</th><th>Востребованность</th><th>Этап</th></tr></thead>
      <tbody>{programs.map(program => <tr key={program.id} className={selectedId === program.id ? 'selected-program-row' : ''}>
        <td><button className="program-link" onClick={() => onSelect(program)}>{program.name}</button><span className="table-secondary">{program.applications.toLocaleString('ru-RU')} заявок</span></td>
        <td>{program.product}</td><td>{program.students}</td><td>{program.streams}</td>
        <td><div className="demand"><div className="demand-bar"><span style={{ width: `${program.demand}%` }} /></div><strong>{program.demand}%</strong></div></td>
        <td><span className="stage-tag">{program.stage}</span></td>
      </tr>)}</tbody>
    </table></div>
    <div className="program-mobile-list">{programs.map(program => <article key={program.id} className={`program-mobile-card ${selectedId === program.id ? 'selected-program-row' : ''}`}>
      <button className="program-link" onClick={() => onSelect(program)}>{program.name}</button>
      <p>{program.product}</p><span className="stage-tag">{program.stage}</span>
      <dl><div><dt>Обучающиеся</dt><dd>{program.students.toLocaleString('ru-RU')}</dd></div><div><dt>Потоки</dt><dd>{program.streams}</dd></div><div><dt>Заявки</dt><dd>{program.applications.toLocaleString('ru-RU')}</dd></div><div><dt>Востребованность</dt><dd>{program.demand}%</dd></div></dl>
    </article>)}</div>
  </>
}

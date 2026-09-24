import { useMemo, useState } from 'react'
import type { TDocumentDefinitions } from 'pdfmake/interfaces'
import { currentStage } from '../domain/workflow'
import type { Program, University } from '../types/domain'
import '../reports.css'

type ColumnKey = 'university' | 'direction' | 'product' | 'status' | 'responsible' | 'applications' | 'students' | 'streams' | 'demand'

const columns: { key: ColumnKey; label: string }[] = [
  { key: 'university', label: 'Учебное заведение' },
  { key: 'direction', label: 'ИТ-направление' },
  { key: 'product', label: 'ИТ-продукт' },
  { key: 'status', label: 'Текущий статус' },
  { key: 'responsible', label: 'Ответственный' },
  { key: 'applications', label: 'Заявки' },
  { key: 'students', label: 'Обучающиеся' },
  { key: 'streams', label: 'Потоки' },
  { key: 'demand', label: 'Спрос, %' },
]

interface ReportsPageProps { universities: University[]; programs: Program[]; onOpenUniversity: (id: number, programId?: number) => void }

function getDate(program: Program) {
  return [...program.workflow].reverse().find(stage => stage.date)?.date ?? ''
}

function xml(value: unknown) {
  return String(value).replace(/[<>&'"]/g, char => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[char] ?? char)
}

function columnName(index: number) {
  let result = ''
  for (let value = index + 1; value; value = Math.floor((value - 1) / 26)) result = String.fromCharCode(65 + (value - 1) % 26) + result
  return result
}

export function ReportsPage({ universities, programs, onOpenUniversity }: ReportsPageProps) {
  const [universityId, setUniversityId] = useState('all')
  const [direction, setDirection] = useState('all')
  const [product, setProduct] = useState('all')
  const [responsible, setResponsible] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedColumns, setSelectedColumns] = useState<ColumnKey[]>(columns.map(column => column.key))
  const [message, setMessage] = useState('')

  const universityById = useMemo(() => new Map(universities.map(item => [item.id, item])), [universities])
  const directions = useMemo(() => [...new Set(programs.map(item => item.direction || 'Не указано'))].sort(), [programs])
  const products = useMemo(() => [...new Set(programs.map(item => item.product))].sort(), [programs])
  const responsibles = useMemo(() => [...new Set(programs.map(item => currentStage(item.workflow)?.owner).filter((item): item is string => Boolean(item)))].sort(), [programs])

  const rows = useMemo(() => programs.map(program => {
    const university = universityById.get(program.universityId)
    const stage = currentStage(program.workflow)
    return {
      id: program.id,
      universityId: program.universityId,
      date: getDate(program),
      university: university?.name ?? '—',
      direction: program.direction || 'Не указано',
      product: program.product,
      status: stage?.title ?? program.stage,
      responsible: stage?.owner ?? university?.contactPerson ?? 'Не назначен',
      applications: program.applications,
      students: program.students,
      streams: program.streams,
      demand: program.demand,
    }
  }).filter(row =>
    (universityId === 'all' || row.universityId === Number(universityId)) &&
    (direction === 'all' || row.direction === direction) &&
    (product === 'all' || row.product === product) &&
    (responsible === 'all' || row.responsible === responsible) &&
    (!dateFrom || !row.date || row.date >= dateFrom) &&
    (!dateTo || !row.date || row.date <= dateTo)
  ), [programs, universityById, universityId, direction, product, responsible, dateFrom, dateTo])

  const activeColumns = columns.filter(column => selectedColumns.includes(column.key))
  const reportData = rows.map(row => Object.fromEntries(activeColumns.map(column => [column.label, row[column.key]])))

  function toggleColumn(key: ColumnKey) {
    setSelectedColumns(current => current.includes(key) ? current.filter(item => item !== key) : [...current, key])
  }

  async function exportXlsx() {
    if (!rows.length || !activeColumns.length) return setMessage('Нет данных или не выбраны колонки для выгрузки.')
    setMessage('Формируем XLSX…')
    const { strToU8, zipSync } = await import('fflate')
    const values = [activeColumns.map(column => column.label), ...reportData.map(row => activeColumns.map(column => row[column.label]))]
    const sheetRows = values.map((row, rowIndex) => `<row r="${rowIndex + 1}">${row.map((value, columnIndex) => {
      const reference = `${columnName(columnIndex)}${rowIndex + 1}`
      return typeof value === 'number'
        ? `<c r="${reference}"${rowIndex === 0 ? ' s="1"' : ''}><v>${value}</v></c>`
        : `<c r="${reference}" t="inlineStr"${rowIndex === 0 ? ' s="1"' : ''}><is><t>${xml(value)}</t></is></c>`
    }).join('')}</row>`).join('')
    const lastCell = `${columnName(activeColumns.length - 1)}${values.length}`
    const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${activeColumns.map((column, index) => `<col min="${index + 1}" max="${index + 1}" width="${Math.max(16, column.label.length + 3)}" customWidth="1"/>`).join('')}</cols><sheetData>${sheetRows}</sheetData><autoFilter ref="A1:${lastCell}"/></worksheet>`
    const files: Record<string, Uint8Array> = {
      '[Content_Types].xml': strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>'),
      '_rels/.rels': strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'),
      'xl/workbook.xml': strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Отчет" sheetId="1" r:id="rId1"/></sheets></workbook>'),
      'xl/_rels/workbook.xml.rels': strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'),
      'xl/worksheets/sheet1.xml': strToU8(sheetXml),
      'xl/styles.xml': strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF344054"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs></styleSheet>'),
    }
    const buffer = zipSync(files, { level: 6 })
    const url = URL.createObjectURL(new Blob([buffer.buffer as ArrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `rtk-crm-report-${new Date().toISOString().slice(0, 10)}.xlsx`
    link.click()
    URL.revokeObjectURL(url)
    setMessage(`XLSX сформирован: ${rows.length} строк.`)
  }

  async function exportPdf() {
    if (!rows.length || !activeColumns.length) return setMessage('Нет данных или не выбраны колонки для выгрузки.')
    setMessage('Формируем PDF…')
    const [{ default: pdfMake }, { default: pdfFonts }] = await Promise.all([
      import('pdfmake/build/pdfmake'),
      import('pdfmake/build/vfs_fonts'),
    ])
    ;(pdfMake as typeof pdfMake & { vfs: Record<string, string> }).vfs = pdfFonts as unknown as Record<string, string>
    const body = [activeColumns.map(column => ({ text: column.label, bold: true, color: '#ffffff' })), ...rows.map(row => activeColumns.map(column => String(row[column.key])))]
    const definition: TDocumentDefinitions = {
      pageOrientation: activeColumns.length > 6 ? 'landscape' : 'portrait',
      pageSize: 'A4',
      content: [
        { text: 'RTK Education CRM', color: '#f04438', bold: true, fontSize: 10 },
        { text: 'Отчет по взаимодействию с учебными заведениями', bold: true, fontSize: 16, margin: [0, 6, 0, 4] },
        { text: `Сформирован: ${new Date().toLocaleString('ru-RU')} · строк: ${rows.length}`, color: '#667085', fontSize: 8, margin: [0, 0, 0, 12] },
        { table: { headerRows: 1, widths: activeColumns.map(() => '*'), body }, layout: { fillColor: rowIndex => rowIndex === 0 ? '#344054' : rowIndex % 2 ? '#f9fafb' : null } },
      ],
      defaultStyle: { font: 'Roboto', fontSize: activeColumns.length > 6 ? 6 : 8 },
    }
    pdfMake.createPdf(definition).download(`rtk-crm-report-${new Date().toISOString().slice(0, 10)}.pdf`)
    setMessage(`PDF сформирован: ${rows.length} строк.`)
  }

  function resetFilters() { setUniversityId('all'); setDirection('all'); setProduct('all'); setResponsible('all'); setDateFrom(''); setDateTo(''); setMessage('') }

  return <div className="content reports-workspace">
    <div className="page-heading reports-heading"><div><div className="eyebrow">ОТЧЕТНОСТЬ</div><h1>Отчеты</h1><p className="muted">Настройте срез данных и выгрузите отчет в XLSX или PDF</p></div><div className="reports-actions"><button className="outline-button reports-button" onClick={exportPdf}>Скачать PDF</button><button className="primary-button" onClick={exportXlsx}>Скачать XLSX</button></div></div>

    <section className="card reports-filter-card">
      <div className="card-header"><div><h2>Параметры отчета</h2><p>Все фильтры применяются к таблице и экспортируемому файлу</p></div><button className="ghost-button" onClick={resetFilters}>Сбросить</button></div>
      <div className="reports-filters">
        <label>Период с<input type="date" value={dateFrom} onChange={event => setDateFrom(event.target.value)} /></label>
        <label>по<input type="date" value={dateTo} min={dateFrom} onChange={event => setDateTo(event.target.value)} /></label>
        <label>Вуз<select value={universityId} onChange={event => setUniversityId(event.target.value)}><option value="all">Все вузы</option>{universities.map(item => <option value={item.id} key={item.id}>{item.shortName}</option>)}</select></label>
        <label>Направление<select value={direction} onChange={event => setDirection(event.target.value)}><option value="all">Все направления</option>{directions.map(item => <option key={item}>{item}</option>)}</select></label>
        <label>ИТ-продукт<select value={product} onChange={event => setProduct(event.target.value)}><option value="all">Все продукты</option>{products.map(item => <option key={item}>{item}</option>)}</select></label>
        <label>Ответственный<select value={responsible} onChange={event => setResponsible(event.target.value)}><option value="all">Все ответственные</option>{responsibles.map(item => <option key={item}>{item}</option>)}</select></label>
      </div>
      <fieldset className="reports-columns"><legend>Колонки отчета</legend>{columns.map(column => <label key={column.key}><input type="checkbox" checked={selectedColumns.includes(column.key)} onChange={() => toggleColumn(column.key)} />{column.label}</label>)}</fieldset>
    </section>

    <section className="card reports-table-card">
      <div className="card-header"><div><h2>Предпросмотр</h2><p>{rows.length} программ · {activeColumns.length} колонок</p></div>{message && <span className="report-message" role="status">{message}</span>}</div>
      <div className="reports-table-wrap"><table><thead><tr>{activeColumns.map(column => <th key={column.key}>{column.label}</th>)}</tr></thead><tbody>{rows.map(row => <tr key={row.id} onClick={() => onOpenUniversity(row.universityId, row.id)}>{activeColumns.map(column => <td key={column.key}>{column.key === 'demand' ? `${row[column.key]}%` : row[column.key]}</td>)}</tr>)}</tbody></table>{(!rows.length || !activeColumns.length) && <p className="empty-state">Измените фильтры или выберите хотя бы одну колонку.</p>}</div>
    </section>
  </div>
}

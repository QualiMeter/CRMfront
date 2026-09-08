export function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return <div className="content"><div className="placeholder-page card"><div className="eyebrow">РАЗДЕЛ CRM</div><h1>{title}</h1><p>{description}</p><span>Раздел подготовлен для следующего этапа разработки.</span></div></div>
}

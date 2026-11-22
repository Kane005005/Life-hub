type PlaceholderPageProps = {
  title: string
}

export function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <section className="lr-section">
      <h1 className="lr-title">{title}</h1>
      <p className="lr-lede">Cet espace s'ouvre dans une prochaine phase.</p>
    </section>
  )
}

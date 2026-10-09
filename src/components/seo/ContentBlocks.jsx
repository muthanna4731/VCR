// Renders the plain-data content blocks from src/seo/content.js.
// scripts/prerender.mjs renders the same blocks to static HTML for crawlers.

export function ContentBlocks({ blocks }) {
  return blocks.map((block, i) => {
    if (block.p) return <p key={i}>{block.p}</p>
    if (block.ul) return <ul key={i} className="seo-list">{block.ul.map(item => <li key={item}>{item}</li>)}</ul>
    if (block.ol) return <ol key={i} className="seo-list">{block.ol.map(item => <li key={item}>{item}</li>)}</ol>
    if (block.table) {
      return (
        <div key={i} className="seo-table-wrap">
          <table className="seo-table">
            <thead><tr>{block.table.head.map(h => <th key={h} scope="col">{h}</th>)}</tr></thead>
            <tbody>
              {block.table.rows.map(row => (
                <tr key={row[0]}>{row.map((cell, j) => j === 0 ? <th key={j} scope="row">{cell}</th> : <td key={j}>{cell}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }
    return null
  })
}

export function Sources({ sources }) {
  if (!sources?.length) return null
  return (
    <p className="seo-sources">
      Sources:{' '}
      {sources.map((s, i) => (
        <span key={s.url}>
          {i > 0 && '; '}
          <a href={s.url} target="_blank" rel="noopener noreferrer">{s.label}</a>
        </span>
      ))}
    </p>
  )
}

export function FaqList({ items }) {
  return (
    <div className="seo-faq">
      {items.map(item => (
        <div key={item.q} className="seo-faq-item">
          <h3 className="seo-faq-q">{item.q}</h3>
          <p className="seo-faq-a">{item.a}</p>
        </div>
      ))}
    </div>
  )
}

import { useState } from 'react'
import { formatINR, formatINRCompact } from '../../../lib/materialLog'

const qtyFormat = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 })

export default function MaterialSummary({ summary, sites = [], isEmpty }) {
  const [stockOpen, setStockOpen] = useState(false)
  const warehouse = sites.find(s => s.kind === 'warehouse' && !s.archived)

  const stock = summary.warehouseStock.filter(line => line.quantity !== 0)
  const nothing = isEmpty ?? (
    summary.todaySpend === 0 && summary.monthSpend === 0 && summary.bySite.length === 0
    && summary.topMaterials.length === 0 && stock.length === 0
  )

  if (nothing) {
    return (
      <p className="ml-summary-empty">
        Nothing logged yet. Once you log a purchase, spend by day, site and material shows up here.
      </p>
    )
  }

  const maxSite = Math.max(...summary.bySite.map(s => s.amount), 0)

  return (
    <section className="ml-summary" aria-label="Material spend summary">
      <div className="ml-tiles">
        <div className="ml-tile" title={formatINR(summary.todaySpend)}>
          <span className="ml-tile-label">Today</span>
          <span className="ml-tile-value">{formatINRCompact(summary.todaySpend)}</span>
        </div>
        <div className="ml-tile" title={formatINR(summary.monthSpend)}>
          <span className="ml-tile-label">This month</span>
          <span className="ml-tile-value">{formatINRCompact(summary.monthSpend)}</span>
        </div>
        <button
          type="button"
          className="ml-tile ml-tile--button"
          aria-expanded={stockOpen}
          aria-controls="ml-stock-list"
          onClick={() => setStockOpen(o => !o)}
        >
          <span className="ml-tile-label">{warehouse?.name ?? 'Warehouse'} stock</span>
          <span className="ml-tile-value">
            {stock.length} {stock.length === 1 ? 'line' : 'lines'}
            <span className={`material-symbols-outlined ml-tile-chevron${stockOpen ? ' is-open' : ''}`} aria-hidden="true">expand_more</span>
          </span>
        </button>
      </div>

      {stockOpen && (
        <ul className="ml-stock" id="ml-stock-list">
          {stock.length === 0 && <li className="ml-stock-empty">No stock recorded in the warehouse.</li>}
          {stock.map(line => (
            <li key={`${line.material}|${line.unit}`} className={line.quantity < 0 ? 'is-negative' : ''}>
              <span>{line.material}</span>
              <span className="ml-stock-qty">{qtyFormat.format(line.quantity)} {line.unit}</span>
            </li>
          ))}
        </ul>
      )}

      {(summary.bySite.length > 0 || summary.topMaterials.length > 0) && (
        <div className="ml-breakdown">
      {summary.bySite.length > 0 && (
        <div className="ml-bysite">
          <h3 className="ml-sub">By site this month</h3>
          <ul className="ml-bars">
            {summary.bySite.map(s => (
              <li key={s.siteId ?? s.name} title={formatINR(s.amount)}>
                <span className="ml-bar-name">{s.name}</span>
                <span className="ml-bar-track" aria-hidden="true">
                  <span className="ml-bar-fill" style={{ width: `${maxSite ? Math.max(4, (s.amount / maxSite) * 100) : 0}%` }} />
                </span>
                <span className="ml-bar-amount">{formatINRCompact(s.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {summary.topMaterials.length > 0 && (
        <div className="ml-top">
          <h3 className="ml-sub">Top materials</h3>
          <ul className="ml-chips">
            {summary.topMaterials.map(m => (
              <li key={m.material} className="ml-chip" title={formatINR(m.amount)}>
                {m.material} <strong>{formatINRCompact(m.amount)}</strong>
              </li>
            ))}
          </ul>
        </div>
      )}
        </div>
      )}
    </section>
  )
}

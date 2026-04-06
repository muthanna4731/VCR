import { STATUS_COLORS } from '../../data/mockData'

export default function PlotChip({ plot, isFilteredOut, onClick }) {
  return (
    <button
      className={`prop-plot-chip${isFilteredOut ? ' prop-filtered-out' : ''}`}
      onClick={() => onClick(plot)}
      tabIndex={isFilteredOut ? -1 : 0}
    >
      <span
        className="prop-plot-chip-dot"
        style={{ backgroundColor: STATUS_COLORS[plot.status] }}
      ></span>
      <span>{plot.plotNumber}</span>
      <span className="prop-plot-chip-dim">{plot.dimensions}</span>
    </button>
  )
}

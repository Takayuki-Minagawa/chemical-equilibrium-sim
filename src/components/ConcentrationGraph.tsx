import { describeEvent, formatNumber, uiText } from '../lib/copy'
import type {
  HistoryPoint,
  Language,
  ReactionDefinition,
  SimulationEvent,
  SimulationSnapshot,
} from '../types'

interface ConcentrationGraphProps {
  events: SimulationEvent[]
  history: HistoryPoint[]
  language: Language
  reaction: ReactionDefinition
  snapshot: SimulationSnapshot
}

export function ConcentrationGraph({
  events,
  history,
  language,
  reaction,
  snapshot,
}: ConcentrationGraphProps) {
  const ui = uiText[language]
  const width = 760
  const height = 340
  const padding = { top: 28, right: 18, bottom: 36, left: 50 }
  const minTime = history[0]?.time ?? 0
  const maxTime = history[history.length - 1]?.time ?? minTime + 1
  const timeSpan = Math.max(1, maxTime - minTime)
  const allValues = history.flatMap((point) =>
    reaction.species.map((species) => point.concentrations[species.id] ?? 0),
  )
  const yMax =
    Math.max(
      0.5,
      ...allValues,
      ...reaction.species.map((species) => snapshot.equilibrium[species.id] ?? 0),
    ) * 1.15

  const plotWidth = width - padding.left - padding.right
  const plotHeight = height - padding.top - padding.bottom
  const toX = (time: number) => padding.left + ((time - minTime) / timeSpan) * plotWidth
  const toY = (value: number) => padding.top + plotHeight - (value / yMax) * plotHeight
  const visibleEvents = events.filter((event) => event.time >= minTime).slice(-4)

  return (
    <section className="panel graph-panel">
      <div className="panel-heading">
        <p className="panel-kicker">{ui.graphKicker}</p>
        <h2>{ui.graphTitle}</h2>
        <p>{ui.graphSubtitle}</p>
      </div>

      <div className="graph-header-metrics">
        <span className="mini-badge">K = {formatNumber(snapshot.k, language, 3)}</span>
        <span className="mini-badge">Q = {formatNumber(snapshot.q, language, 3)}</span>
        <span className="mini-badge">{ui.targetEquilibrium}</span>
        <span className="mini-badge">{ui.operationMarkers}</span>
      </div>

      <div className="graph-surface">
        <svg aria-label={ui.graphTitle} viewBox={`0 0 ${width} ${height}`}>
          {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
            const y = padding.top + plotHeight * fraction
            return (
              <g key={fraction}>
                <line
                  className="graph-grid"
                  x1={padding.left}
                  x2={width - padding.right}
                  y1={y}
                  y2={y}
                />
                <text className="graph-axis-label" x={10} y={y + 4}>
                  {formatNumber(yMax * (1 - fraction), language, 1)}
                </text>
              </g>
            )
          })}

          <line
            className="graph-axis"
            x1={padding.left}
            x2={padding.left}
            y1={padding.top}
            y2={height - padding.bottom}
          />
          <line
            className="graph-axis"
            x1={padding.left}
            x2={width - padding.right}
            y1={height - padding.bottom}
            y2={height - padding.bottom}
          />

          {reaction.species.map((species) => {
            const path = history
              .map((point, index) => {
                const x = toX(point.time)
                const y = toY(point.concentrations[species.id] ?? 0)
                return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
              })
              .join(' ')
            const equilibriumY = toY(snapshot.equilibrium[species.id] ?? 0)

            return (
              <g key={species.id}>
                <line
                  className="graph-equilibrium"
                  stroke={species.color}
                  x1={padding.left}
                  x2={width - padding.right}
                  y1={equilibriumY}
                  y2={equilibriumY}
                />
                <path className="graph-line" d={path} stroke={species.color} />
              </g>
            )
          })}

          {visibleEvents.map((event) => {
            const x = toX(event.time)
            return (
              <g key={event.id}>
                <line
                  className="graph-event-line"
                  x1={x}
                  x2={x}
                  y1={padding.top}
                  y2={height - padding.bottom}
                />
                <text className="graph-event-label" x={x + 4} y={padding.top + 12}>
                  {describeEvent(event, reaction, language, true)}
                </text>
              </g>
            )
          })}

          <text className="graph-axis-label" x={width / 2 - 26} y={height - 8}>
            {ui.time}
          </text>
        </svg>
      </div>

      <div className="graph-legend">
        {reaction.species.map((species) => (
          <div className="legend-chip" key={species.id}>
            <span className="species-swatch" style={{ backgroundColor: species.color }} />
            <strong>{species.formula}</strong>
            <span>
              {formatNumber(
                history[history.length - 1]?.concentrations[species.id] ?? 0,
                language,
                2,
              )}
              {' / '}
              {formatNumber(snapshot.equilibrium[species.id] ?? 0, language, 2)} M
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}

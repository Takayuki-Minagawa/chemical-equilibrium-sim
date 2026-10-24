import { useId } from 'react'
import { describeEvent, formatNumber, uiText } from '../lib/copy'
import { toSubscriptText } from '../lib/formula'
import type {
  HistoryPoint,
  Language,
  ReactionDefinition,
  SimulationEvent,
  SimulationSnapshot,
} from '../types'
import { Formula } from './Formula'

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
  const gradientPrefix = `graph-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const width = 640
  const height = 330
  const padding = { top: 30, right: 22, bottom: 38, left: 52 }
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
  const plotBottom = padding.top + plotHeight
  const toX = (time: number) => padding.left + ((time - minTime) / timeSpan) * plotWidth
  const toY = (value: number) => padding.top + plotHeight - (value / yMax) * plotHeight
  const visibleEvents = events.filter((event) => event.time >= minTime).slice(-4)
  const lastPoint = history[history.length - 1]

  return (
    <section aria-labelledby="graph-title" className="panel graph-panel">
      <div className="panel-heading">
        <p className="panel-kicker">{ui.graphKicker}</p>
        <h2 id="graph-title">{ui.graphTitle}</h2>
        <p>{ui.graphSubtitle}</p>
      </div>

      <div className="graph-header-metrics">
        <span className="mini-badge">
          K = <strong>{formatNumber(snapshot.k, language, 3)}</strong>
        </span>
        <span className="mini-badge">
          Q = <strong>{formatNumber(snapshot.q, language, 3)}</strong>
        </span>
        <span className="line-key">
          <span aria-hidden="true" className="line-sample is-solid" />
          {ui.lineLegendActual}
        </span>
        <span className="line-key">
          <span aria-hidden="true" className="line-sample is-dashed" />
          {ui.targetEquilibrium}
        </span>
        <span className="line-key">
          <span aria-hidden="true" className="line-sample is-event" />
          {ui.operationMarkers}
        </span>
      </div>

      <div className="graph-surface">
        <svg aria-label={ui.graphTitle} role="img" viewBox={`0 0 ${width} ${height}`}>
          <defs>
            {reaction.species.map((species) => (
              <linearGradient
                id={`${gradientPrefix}-${species.id}`}
                key={species.id}
                x1="0"
                x2="0"
                y1="0"
                y2="1"
              >
                <stop offset="0%" stopColor={species.color} stopOpacity="0.22" />
                <stop offset="100%" stopColor={species.color} stopOpacity="0" />
              </linearGradient>
            ))}
          </defs>

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
                <text className="graph-axis-label" textAnchor="end" x={padding.left - 8} y={y + 4}>
                  {formatNumber(yMax * (1 - fraction), language, 1)}
                </text>
              </g>
            )
          })}

          <text className="graph-axis-title" x={padding.left - 8} y={14} textAnchor="start">
            {ui.concentrationAxis}
          </text>

          <line
            className="graph-axis"
            x1={padding.left}
            x2={padding.left}
            y1={padding.top}
            y2={plotBottom}
          />
          <line
            className="graph-axis"
            x1={padding.left}
            x2={width - padding.right}
            y1={plotBottom}
            y2={plotBottom}
          />

          {reaction.species.map((species) => {
            const linePath = history
              .map((point, index) => {
                const x = toX(point.time)
                const y = toY(point.concentrations[species.id] ?? 0)
                return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
              })
              .join(' ')
            const areaPath =
              history.length > 1
                ? `${linePath} L ${toX(maxTime).toFixed(1)} ${plotBottom} L ${toX(minTime).toFixed(1)} ${plotBottom} Z`
                : ''
            const equilibriumY = toY(snapshot.equilibrium[species.id] ?? 0)

            return (
              <g key={species.id}>
                {areaPath ? (
                  <path d={areaPath} fill={`url(#${gradientPrefix}-${species.id})`} />
                ) : null}
                <line
                  className="graph-equilibrium"
                  stroke={species.color}
                  x1={padding.left}
                  x2={width - padding.right}
                  y1={equilibriumY}
                  y2={equilibriumY}
                />
                <path className="graph-line" d={linePath} stroke={species.color} />
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
                  y2={plotBottom}
                />
                <circle className="graph-event-dot" cx={x} cy={padding.top} r={4} />
                <text className="graph-event-label" x={x + 6} y={padding.top + 10}>
                  {toSubscriptText(describeEvent(event, reaction, language, true))}
                </text>
              </g>
            )
          })}

          {lastPoint
            ? reaction.species.map((species) => {
                const cx = toX(lastPoint.time)
                const cy = toY(lastPoint.concentrations[species.id] ?? 0)
                return (
                  <g key={species.id}>
                    <circle className="graph-end-pulse" cx={cx} cy={cy} fill={species.color} r={7} />
                    <circle className="graph-end-dot" cx={cx} cy={cy} fill={species.color} r={4.5} />
                  </g>
                )
              })
            : null}

          <text className="graph-axis-label" x={padding.left} y={height - 12}>
            t = {formatNumber(minTime, language, 1)}
          </text>
          <text className="graph-axis-label" textAnchor="middle" x={padding.left + plotWidth / 2} y={height - 12}>
            {ui.time}
          </text>
          <text className="graph-axis-label" textAnchor="end" x={width - padding.right} y={height - 12}>
            t = {formatNumber(maxTime, language, 1)}
          </text>
        </svg>
      </div>

      <div className="graph-legend">
        {reaction.species.map((species) => (
          <div className="legend-chip" key={species.id}>
            <span className="species-swatch" style={{ backgroundColor: species.color }} />
            <strong>
              <Formula value={species.formula} />
            </strong>
            <span className="legend-values">
              {formatNumber(lastPoint?.concentrations[species.id] ?? 0, language, 2)}
              {' / '}
              {formatNumber(snapshot.equilibrium[species.id] ?? 0, language, 2)} M
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}

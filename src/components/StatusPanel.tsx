import type { CSSProperties } from 'react'
import {
  describeDirection,
  describeEvent,
  formatNumber,
  getLocalizedText,
  uiText,
} from '../lib/copy'
import type {
  ConcentrationMap,
  Language,
  ReactionDefinition,
  ReactionDirection,
  SimulationEvent,
} from '../types'
import { Formula } from './Formula'
import { Icon } from './Icon'

interface StatusPanelProps {
  concentrations: ConcentrationMap
  equilibrium: ConcentrationMap
  events: SimulationEvent[]
  language: Language
  latestEvent?: SimulationEvent
  predictedShift: ReactionDirection
  reaction: ReactionDefinition
}

export function StatusPanel({
  concentrations,
  equilibrium,
  events,
  language,
  latestEvent,
  predictedShift,
  reaction,
}: StatusPanelProps) {
  const ui = uiText[language]
  const scale =
    Math.max(
      0.5,
      ...reaction.species.map((species) =>
        Math.max(concentrations[species.id] ?? 0, equilibrium[species.id] ?? 0),
      ),
    ) * 1.12

  return (
    <section className="status-panel panel">
      <div className="panel-heading">
        <p className="panel-kicker">{ui.statusKicker}</p>
        <h2>{ui.statusTitle}</h2>
        <p>{ui.statusSubtitle}</p>
      </div>

      <div className="status-layout">
        <article
          className={`prediction-card is-${predictedShift}`}
          key={latestEvent?.id ?? 'initial'}
        >
          <span className="prediction-icon">
            <Icon name="bulb" size={20} />
          </span>
          <div>
            <span className="stat-label">{ui.predictedShift}</span>
            <strong className="prediction-value">
              {describeDirection(language, predictedShift)}
            </strong>
            <p className="small-note">
              {latestEvent ? describeEvent(latestEvent, reaction, language) : ui.noEvents}
            </p>
          </div>
        </article>

        <div className="species-bars" aria-label={ui.currentConcentrations} role="list">
          <div className="species-bars-heading" aria-hidden="true">
            <span>{ui.concentrationsTitle}</span>
            <span>{ui.nowVsEquilibrium}</span>
          </div>
          {reaction.species.map((species) => {
            const current = concentrations[species.id] ?? 0
            const target = equilibrium[species.id] ?? 0

            return (
              <div
                className="species-bar"
                key={species.id}
                role="listitem"
                style={{ '--species-color': species.color } as CSSProperties}
              >
                <div className="species-bar-label">
                  <span className="species-swatch" />
                  <strong>
                    <Formula value={species.formula} />
                  </strong>
                  <small>{getLocalizedText(species.label, language)}</small>
                  <span className="species-bar-value">
                    {formatNumber(current, language, 2)}
                    <span className="species-bar-target">
                      {' / '}
                      {formatNumber(target, language, 2)} M
                    </span>
                  </span>
                </div>
                <div aria-hidden="true" className="species-bar-track">
                  <span
                    className="species-bar-fill"
                    style={{ width: `${Math.min(100, (current / scale) * 100)}%` }}
                  />
                  <span
                    className="species-bar-goal"
                    style={{ left: `${Math.min(100, (target / scale) * 100)}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        <div className="event-list-block">
          <h3>
            <Icon name="list" size={16} />
            {ui.operationLog}
          </h3>
          {events.length === 0 ? (
            <p className="small-note">{ui.noEvents}</p>
          ) : (
            <ol className="event-list">
              {[...events]
                .reverse()
                .slice(0, 5)
                .map((event) => (
                  <li className="event-item" key={event.id}>
                    <span className="mini-badge">t = {formatNumber(event.time, language, 1)}</span>
                    <span>{describeEvent(event, reaction, language)}</span>
                  </li>
                ))}
            </ol>
          )}
        </div>
      </div>
    </section>
  )
}

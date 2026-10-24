import { getLocalizedText, uiText } from '../lib/copy'
import { missions, type MissionId } from '../lib/missions'
import type { Language } from '../types'
import { Icon, type IconName } from './Icon'

const missionIcons: Record<MissionId, IconName> = {
  inject: 'plus',
  remove: 'minus',
  heat: 'flame',
  cool: 'snowflake',
  compress: 'compress',
  catalyst: 'sparkle',
  explorer: 'flask',
  quiz: 'trophy',
}

interface MissionPanelProps {
  completed: MissionId[]
  language: Language
  onReset: () => void
  totalReactions: number
  visitedCount: number
}

export function MissionPanel({
  completed,
  language,
  onReset,
  totalReactions,
  visitedCount,
}: MissionPanelProps) {
  const ui = uiText[language]
  const done = completed.length
  const total = missions.length
  const circumference = 2 * Math.PI * 34
  const allDone = done === total

  return (
    <section
      aria-labelledby="missions-title"
      className={`panel mission-panel ${allDone ? 'is-complete' : ''}`}
      id="missions"
      tabIndex={-1}
    >
      <div className="mission-header">
        <div className="panel-heading">
          <p className="panel-kicker">{ui.missionsKicker}</p>
          <h2 id="missions-title">{ui.missionsTitle}</h2>
          <p>{allDone ? ui.missionAllDone : ui.missionsSubtitle}</p>
        </div>
        <div className="mission-score">
          <svg aria-hidden="true" height="84" viewBox="0 0 84 84" width="84">
            <circle className="mission-ring-track" cx="42" cy="42" r="34" />
            <circle
              className={`mission-ring-value ${done === 0 ? 'is-empty' : ''}`}
              cx="42"
              cy="42"
              r="34"
              strokeDasharray={`${(circumference * done) / total} ${circumference}`}
            />
          </svg>
          <span className="mission-score-text">
            <strong>{done}</strong>/{total}
          </span>
        </div>
      </div>

      <ul className="mission-list">
        {missions.map((mission) => {
          const isDone = completed.includes(mission.id)

          return (
            <li className={`mission-item ${isDone ? 'is-done' : ''}`} key={mission.id}>
              <span className="mission-icon">
                <Icon name={isDone ? 'check' : missionIcons[mission.id]} size={16} />
              </span>
              <div>
                <strong>
                  {getLocalizedText(mission.title, language)}
                  {mission.id === 'explorer' && !isDone ? (
                    <span className="mission-count">
                      {' '}
                      {visitedCount}/{totalReactions}
                    </span>
                  ) : null}
                </strong>
                <small>{getLocalizedText(mission.hint, language)}</small>
              </div>
              {isDone ? (
                <span className="sr-only">{language === 'ja' ? '（達成済み）' : '(completed)'}</span>
              ) : null}
            </li>
          )
        })}
      </ul>

      {done > 0 ? (
        <button
          className="button-text"
          onClick={() => {
            if (window.confirm(ui.missionResetConfirm)) {
              onReset()
            }
          }}
          type="button"
        >
          <Icon name="reset" size={14} />
          {ui.missionReset}
        </button>
      ) : null}
    </section>
  )
}

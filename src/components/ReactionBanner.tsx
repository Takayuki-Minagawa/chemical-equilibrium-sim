import { describeDirection, formatNumber, getLocalizedText, uiText } from '../lib/copy'
import type {
  Language,
  ReactionDefinition,
  ReactionDirection,
  SimulationSnapshot,
} from '../types'
import { Equation } from './Formula'
import { Icon } from './Icon'

interface ReactionBannerProps {
  approach: number
  language: Language
  reaction: ReactionDefinition
  snapshot: SimulationSnapshot
}

function DirectionArrows({ direction }: { direction: ReactionDirection }) {
  return (
    <span className={`equilibrium-arrows is-${direction}`}>
      <svg aria-hidden="true" viewBox="0 0 64 28">
        <path className="arrow-forward" d="M4 9h52l-7-6" />
        <path className="arrow-reverse" d="M60 19H8l7 6" />
      </svg>
    </span>
  )
}

export function ReactionBanner({ approach, language, reaction, snapshot }: ReactionBannerProps) {
  const ui = uiText[language]
  const { direction, forwardRate, k, q, reverseRate } = snapshot

  // Q/K on a log scale: centre = equilibrium, ±2 decades at the edges.
  const logRatio = Math.log10(Math.max(q, 1e-12) / Math.max(k, 1e-12))
  const qPosition = 50 + Math.max(-1, Math.min(1, logRatio / 2)) * 50
  const totalRate = forwardRate + reverseRate
  const forwardShare = totalRate > 0 ? (forwardRate / totalRate) * 100 : 50
  const reached = direction === 'balanced'
  const approachPercent = Math.round((reached ? 1 : approach) * 100)

  return (
    <section aria-label={ui.bannerKicker} className={`reaction-banner panel is-${direction}`}>
      <div className="banner-equation-block">
        <p className="panel-kicker">{ui.bannerKicker}</p>
        <Equation
          arrow={<DirectionArrows direction={direction} />}
          className="banner-equation"
          reaction={reaction}
        />
        <p className="banner-note">{getLocalizedText(reaction.note, language)}</p>
        <div className="direction-row">
          <span className={`direction-pill is-${direction}`}>
            <Icon name={reached ? 'check' : 'atom'} size={16} />
            <span className="direction-pill-label">{ui.currentDirection}</span>
            <strong>{describeDirection(language, direction)}</strong>
          </span>
        </div>
      </div>

      <div className="banner-meters">
        <div className="meter-block">
          <div className="meter-heading">
            <span>{ui.approachLabel}</span>
            <strong className={reached ? 'is-reached' : ''}>
              {reached ? ui.equilibriumReached : `${ui.approaching} ${approachPercent}%`}
            </strong>
          </div>
          <div
            aria-label={ui.approachLabel}
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={approachPercent}
            className={`approach-track ${reached ? 'is-reached' : ''}`}
            role="progressbar"
          >
            <span className="approach-fill" style={{ width: `${approachPercent}%` }} />
          </div>
        </div>

        <div className="meter-block">
          <div className="meter-heading">
            <span>{ui.qkMeterLabel}</span>
            <span className="meter-values">
              <span>
                Q = <strong>{formatNumber(q, language, 3)}</strong>
              </span>
              <span>
                K = <strong>{formatNumber(k, language, 3)}</strong>
              </span>
            </span>
          </div>
          <div aria-hidden="true" className="qk-track">
            <span className="qk-center">
              <span>K</span>
            </span>
            <span className="qk-marker" style={{ left: `${qPosition}%` }}>
              <span>Q</span>
            </span>
          </div>
          <div aria-hidden="true" className="meter-scale">
            <span className="tone-forward">{ui.qLessK}</span>
            <span className="tone-reverse">{ui.qGreaterK}</span>
          </div>
        </div>

        <div className="meter-block">
          <div className="meter-heading">
            <span>{ui.rateBalanceLabel}</span>
          </div>
          <div aria-hidden="true" className="tug-track">
            <span className="tug-forward" style={{ width: `${forwardShare}%` }} />
            <span className="tug-knot" style={{ left: `${forwardShare}%` }} />
          </div>
          <div className="meter-scale">
            <span className="tone-forward">
              {ui.forwardRate} <strong>{formatNumber(forwardRate, language, 3)}</strong>
            </span>
            <span className="tone-reverse">
              {ui.reverseRate} <strong>{formatNumber(reverseRate, language, 3)}</strong>
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}

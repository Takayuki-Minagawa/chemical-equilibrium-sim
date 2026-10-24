import { formatNumber, uiText } from '../lib/copy'
import type { Language, SpeedOption } from '../types'
import { Icon } from './Icon'

interface PlaybackBarProps {
  isRunning: boolean
  language: Language
  onReset: () => void
  onSpeedChange: (speed: SpeedOption) => void
  onTogglePlayback: () => void
  speed: SpeedOption
  time: number
}

const SPEED_OPTIONS: SpeedOption[] = [0.5, 1, 2, 4]

export function PlaybackBar({
  isRunning,
  language,
  onReset,
  onSpeedChange,
  onTogglePlayback,
  speed,
  time,
}: PlaybackBarProps) {
  const ui = uiText[language]

  return (
    <div aria-label={ui.playbackLabel} className="playback-bar" role="toolbar">
      <button
        className={`play-button ${isRunning ? 'is-running' : ''}`}
        onClick={onTogglePlayback}
        type="button"
      >
        <Icon name={isRunning ? 'pause' : 'play'} />
        <span>{isRunning ? ui.pause : ui.play}</span>
      </button>

      <div aria-label={ui.speed} className="segment-group compact" role="group">
        {SPEED_OPTIONS.map((option) => (
          <button
            aria-pressed={speed === option}
            className={`segment ${speed === option ? 'is-active' : ''}`}
            key={option}
            onClick={() => onSpeedChange(option)}
            type="button"
          >
            {option}x
          </button>
        ))}
      </div>

      <span className="sim-clock">
        <span>{ui.simulatedTime}</span>
        <strong>t = {formatNumber(time, language, 1)}</strong>
      </span>

      <button
        className="button-ghost"
        onClick={onReset}
        title={ui.resetSimulation}
        type="button"
      >
        <Icon name="reset" size={16} />
        <span>{ui.reset}</span>
      </button>
    </div>
  )
}

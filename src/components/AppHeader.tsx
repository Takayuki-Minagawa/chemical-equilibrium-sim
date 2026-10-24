import { uiText } from '../lib/copy'
import type { Language, Theme } from '../types'
import { Icon } from './Icon'

interface AppHeaderProps {
  completedMissions: number
  language: Language
  onLanguageChange: (language: Language) => void
  onThemeChange: (theme: Theme) => void
  theme: Theme
  totalMissions: number
}

export function AppHeader({
  completedMissions,
  language,
  onLanguageChange,
  onThemeChange,
  theme,
  totalMissions,
}: AppHeaderProps) {
  const ui = uiText[language]
  const progress = totalMissions > 0 ? completedMissions / totalMissions : 0
  const circumference = 2 * Math.PI * 9

  return (
    <header className="app-header">
      <a className="brand" href="#main">
        <span aria-hidden="true" className="brand-mark">
          <span className="brand-dot brand-dot-a" />
          <span className="brand-dot brand-dot-b" />
          <span className="brand-dot brand-dot-c" />
        </span>
        <span className="brand-name">{ui.brandShort}</span>
      </a>

      <div className="header-actions">
        <a
          aria-label={`${ui.missionsTitle}: ${completedMissions} / ${totalMissions}`}
          className="mission-pill"
          href="#missions"
        >
          <svg aria-hidden="true" className="mission-ring" height="24" viewBox="0 0 24 24" width="24">
            <circle className="mission-ring-track" cx="12" cy="12" r="9" />
            <circle
              className={`mission-ring-value ${completedMissions === 0 ? 'is-empty' : ''}`}
              cx="12"
              cy="12"
              r="9"
              strokeDasharray={`${circumference * progress} ${circumference}`}
            />
          </svg>
          <span className="mission-pill-label">{ui.missionsShort}</span>
          <strong>
            {completedMissions}/{totalMissions}
          </strong>
        </a>

        <div aria-label={ui.language} className="segment-group compact" role="group">
          {(['ja', 'en'] as const).map((option) => (
            <button
              aria-pressed={language === option}
              className={`segment ${language === option ? 'is-active' : ''}`}
              key={option}
              lang={option}
              onClick={() => onLanguageChange(option)}
              type="button"
            >
              {option === 'ja' ? '日本語' : 'EN'}
            </button>
          ))}
        </div>

        <button
          aria-label={theme === 'dark' ? ui.switchToLight : ui.switchToDark}
          className="icon-button"
          onClick={() => onThemeChange(theme === 'dark' ? 'light' : 'dark')}
          title={theme === 'dark' ? ui.switchToLight : ui.switchToDark}
          type="button"
        >
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
        </button>
      </div>
    </header>
  )
}

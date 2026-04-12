import { useMemo, useState } from 'react'
import { formatNumber, getLocalizedText, uiText } from '../lib/copy'
import type {
  ConcentrationMap,
  Language,
  ReactionDefinition,
  SpeedOption,
  Theme,
} from '../types'

interface ControlPanelProps {
  catalyst: boolean
  currentConcentrations: ConcentrationMap
  initialConcentrations: ConcentrationMap
  isRunning: boolean
  language: Language
  onLanguageChange: (language: Language) => void
  onReactionChange: (reactionId: string) => void
  onResetSimulation: () => void
  onRestartWithInitials: (values: ConcentrationMap) => void
  onSpeedChange: (speed: SpeedOption) => void
  onSpeciesChange: (speciesId: string, amount: number, type: 'inject' | 'remove') => void
  onTemperatureApply: (temperature: number) => void
  onThemeChange: (theme: Theme) => void
  onToggleCatalyst: () => void
  onTogglePlayback: () => void
  onVolumeApply: (volume: number) => void
  reaction: ReactionDefinition
  reactions: ReactionDefinition[]
  speed: SpeedOption
  temperature: number
  theme: Theme
  volume: number
}

const SPEED_OPTIONS: SpeedOption[] = [0.5, 1, 2, 4]

export function ControlPanel({
  catalyst,
  currentConcentrations,
  initialConcentrations,
  isRunning,
  language,
  onLanguageChange,
  onReactionChange,
  onResetSimulation,
  onRestartWithInitials,
  onSpeedChange,
  onSpeciesChange,
  onTemperatureApply,
  onThemeChange,
  onToggleCatalyst,
  onTogglePlayback,
  onVolumeApply,
  reaction,
  reactions,
  speed,
  temperature,
  theme,
  volume,
}: ControlPanelProps) {
  const ui = uiText[language]
  const [temperatureDraft, setTemperatureDraft] = useState(temperature)
  const [volumeDraft, setVolumeDraft] = useState(volume)
  const [selectedSpeciesId, setSelectedSpeciesId] = useState(reaction.species[0]?.id ?? '')
  const [amountDraft, setAmountDraft] = useState(0.3)
  const [initialDrafts, setInitialDrafts] = useState<ConcentrationMap>(initialConcentrations)

  const currentSpecies = useMemo(
    () => reaction.species.find((species) => species.id === selectedSpeciesId),
    [reaction.species, selectedSpeciesId],
  )

  return (
    <section className="control-panel panel">
      <div className="panel-heading">
        <p className="panel-kicker">{ui.controlKicker}</p>
        <h2>{ui.controlsTitle}</h2>
        <p>{ui.controlsSubtitle}</p>
      </div>

      <div className="control-section">
        <div className="control-row">
          <span className="section-label">{ui.language}</span>
          <div className="segment-group">
            {(['ja', 'en'] as const).map((option) => (
              <button
                className={`segment ${language === option ? 'is-active' : ''}`}
                key={option}
                onClick={() => onLanguageChange(option)}
                type="button"
              >
                {option.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="control-row">
          <span className="section-label">{ui.theme}</span>
          <div className="segment-group">
            {(['light', 'dark'] as const).map((option) => (
              <button
                className={`segment ${theme === option ? 'is-active' : ''}`}
                key={option}
                onClick={() => onThemeChange(option)}
                type="button"
              >
                {option === 'light' ? ui.light : ui.dark}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="control-section">
        <label className="field-block" htmlFor="reaction-select">
          <span className="section-label">{ui.reaction}</span>
          <select
            className="select-input"
            id="reaction-select"
            onChange={(event) => onReactionChange(event.target.value)}
            value={reaction.id}
          >
            {reactions.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.equation} / {getLocalizedText(entry.title, language)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="control-section">
        <div className="control-row">
          <span className="section-label">{ui.playback}</span>
          <button className="button-primary" onClick={onTogglePlayback} type="button">
            {isRunning ? ui.pause : ui.play}
          </button>
        </div>
        <div className="control-row">
          <span className="section-label">{ui.speed}</span>
          <div className="segment-group">
            {SPEED_OPTIONS.map((option) => (
              <button
                className={`segment ${speed === option ? 'is-active' : ''}`}
                key={option}
                onClick={() => onSpeedChange(option)}
                type="button"
              >
                {option}x
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="control-section">
        <h3>{ui.initialConditions}</h3>
        <div className="species-input-grid">
          {reaction.species.map((species) => (
            <label className="species-input-card" key={species.id}>
              <span className="species-title">{species.formula}</span>
              <input
                className="number-input"
                min="0"
                onChange={(event) =>
                  setInitialDrafts((previous) => ({
                    ...previous,
                    [species.id]: Math.max(0, Number(event.target.value) || 0),
                  }))
                }
                step="0.1"
                type="number"
                value={initialDrafts[species.id] ?? 0}
              />
              <small>
                {ui.currentConcentrations}:{' '}
                {formatNumber(currentConcentrations[species.id] ?? 0, language, 2)} M
              </small>
            </label>
          ))}
        </div>
        <div className="button-row">
          <button
            className="button-primary"
            onClick={() => onRestartWithInitials(initialDrafts)}
            type="button"
          >
            {ui.restartWithDraft}
          </button>
          <button className="button-secondary" onClick={onResetSimulation} type="button">
            {ui.resetSimulation}
          </button>
        </div>
      </div>

      <div className="control-section">
        <h3>{ui.temperature}</h3>
        <div className="slider-block">
          <input
            className="range-input"
            max={reaction.temperatureRange[1]}
            min={reaction.temperatureRange[0]}
            onChange={(event) => setTemperatureDraft(Number(event.target.value))}
            step="1"
            type="range"
            value={temperatureDraft}
          />
          <div className="slider-footer">
            <span className="numeric-readout">{temperatureDraft} K</span>
            <button
              className="button-secondary"
              onClick={() => onTemperatureApply(temperatureDraft)}
              type="button"
            >
              {ui.apply}
            </button>
          </div>
        </div>

        <h3>{ui.volume}</h3>
        <div className="slider-block">
          <input
            className="range-input"
            disabled={!reaction.pressureSensitive}
            max={reaction.volumeRange[1]}
            min={reaction.volumeRange[0]}
            onChange={(event) => setVolumeDraft(Number(event.target.value))}
            step="0.05"
            type="range"
            value={volumeDraft}
          />
          <div className="slider-footer">
            <span className="numeric-readout">
              {formatNumber(volumeDraft, language, 2)} L
            </span>
            <button
              className="button-secondary"
              disabled={!reaction.pressureSensitive}
              onClick={() => onVolumeApply(volumeDraft)}
              type="button"
            >
              {ui.apply}
            </button>
          </div>
          {!reaction.pressureSensitive ? (
            <p className="small-note">{ui.pressureLimited}</p>
          ) : null}
        </div>
      </div>

      <div className="control-section">
        <div className="control-row">
          <div>
            <h3>{ui.catalyst}</h3>
            <p className="small-note">{ui.catalystHint}</p>
          </div>
          <button
            className={`button-secondary ${catalyst ? 'is-active' : ''}`}
            onClick={onToggleCatalyst}
            type="button"
          >
            {catalyst ? ui.catalystOn : ui.catalystOff}
          </button>
        </div>
      </div>

      <div className="control-section">
        <h3>{ui.speciesOperation}</h3>
        <label className="field-block" htmlFor="species-select">
          <span className="section-label">{ui.selectedSpecies}</span>
          <select
            className="select-input"
            id="species-select"
            onChange={(event) => setSelectedSpeciesId(event.target.value)}
            value={selectedSpeciesId}
          >
            {reaction.species.map((species) => (
              <option key={species.id} value={species.id}>
                {species.formula} / {getLocalizedText(species.label, language)}
              </option>
            ))}
          </select>
        </label>

        <div className="slider-block">
          <input
            className="range-input"
            max="1.2"
            min="0.05"
            onChange={(event) => setAmountDraft(Number(event.target.value))}
            step="0.05"
            type="range"
            value={amountDraft}
          />
          <div className="slider-footer">
            <span className="numeric-readout">{formatNumber(amountDraft, language, 2)} M</span>
            <span className="mini-badge">
              {currentSpecies?.formula}:{' '}
              {formatNumber(currentConcentrations[selectedSpeciesId] ?? 0, language, 2)} M
            </span>
          </div>
        </div>

        <div className="button-row">
          <button
            className="button-primary"
            onClick={() => onSpeciesChange(selectedSpeciesId, amountDraft, 'inject')}
            type="button"
          >
            {ui.inject}
          </button>
          <button
            className="button-secondary"
            onClick={() => onSpeciesChange(selectedSpeciesId, amountDraft, 'remove')}
            type="button"
          >
            {ui.remove}
          </button>
        </div>
      </div>
    </section>
  )
}

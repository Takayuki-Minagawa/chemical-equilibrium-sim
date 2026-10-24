import { useMemo, useState, type CSSProperties } from 'react'
import { formatNumber, getLocalizedText, uiText } from '../lib/copy'
import type { ConcentrationMap, Language, ReactionDefinition } from '../types'
import { Formula } from './Formula'
import { Icon } from './Icon'

interface ControlPanelProps {
  catalyst: boolean
  currentConcentrations: ConcentrationMap
  initialConcentrations: ConcentrationMap
  language: Language
  onRestartWithInitials: (values: ConcentrationMap) => void
  onSpeciesChange: (speciesId: string, amount: number, type: 'inject' | 'remove') => void
  onTemperatureApply: (temperature: number) => void
  onToggleCatalyst: () => void
  onVolumeApply: (volume: number) => void
  reaction: ReactionDefinition
  temperature: number
  volume: number
}

const VOLUME_STEP = 0.1
const LIMIT_TOLERANCE = 1e-3

function roundVolume(value: number): number {
  return Math.round(value * 100) / 100
}

function getTemperatureStep(reaction: ReactionDefinition): number {
  const span = reaction.temperatureRange[1] - reaction.temperatureRange[0]
  return Math.max(5, Math.round(span / 10 / 5) * 5)
}

function rangeProgress(value: number, [min, max]: [number, number]): string {
  return `${((value - min) / (max - min || 1)) * 100}%`
}

export function ControlPanel({
  catalyst,
  currentConcentrations,
  initialConcentrations,
  language,
  onRestartWithInitials,
  onSpeciesChange,
  onTemperatureApply,
  onToggleCatalyst,
  onVolumeApply,
  reaction,
  temperature,
  volume,
}: ControlPanelProps) {
  const ui = uiText[language]
  const [temperatureDraft, setTemperatureDraft] = useState(temperature)
  const [volumeDraft, setVolumeDraft] = useState(volume)
  const [syncedTemperature, setSyncedTemperature] = useState(temperature)
  const [syncedVolume, setSyncedVolume] = useState(volume)

  // Reset a slider draft whenever its applied value changes (e.g. quick heat/compress),
  // leaving the other slider's unsaved draft alone.
  if (syncedTemperature !== temperature) {
    setSyncedTemperature(temperature)
    setTemperatureDraft(temperature)
  }
  if (syncedVolume !== volume) {
    setSyncedVolume(volume)
    setVolumeDraft(volume)
  }
  const [amountDraft, setAmountDraft] = useState(0.3)
  const [initialDrafts, setInitialDrafts] = useState<ConcentrationMap>(initialConcentrations)
  const [initialError, setInitialError] = useState('')

  const hasAnyInitialConcentration = useMemo(
    () => Object.values(initialDrafts).some((value) => value > 0),
    [initialDrafts],
  )
  const temperatureStep = getTemperatureStep(reaction)
  const [minTemperature, maxTemperature] = reaction.temperatureRange
  const [minVolume, maxVolume] = reaction.volumeRange
  const temperatureDirty = Math.abs(temperatureDraft - temperature) > LIMIT_TOLERANCE
  const volumeDirty = Math.abs(volumeDraft - volume) > LIMIT_TOLERANCE
  const atMinTemperature = temperature - minTemperature < LIMIT_TOLERANCE
  const atMaxTemperature = maxTemperature - temperature < LIMIT_TOLERANCE
  const atMinVolume = volume - minVolume < LIMIT_TOLERANCE
  const atMaxVolume = maxVolume - volume < LIMIT_TOLERANCE
  const heatLevel = (temperature - minTemperature) / (maxTemperature - minTemperature || 1)

  const handleRestartWithInitials = () => {
    if (!hasAnyInitialConcentration) {
      setInitialError(ui.initialValidationError)
      return
    }

    setInitialError('')
    onRestartWithInitials(initialDrafts)
  }

  return (
    <section aria-labelledby="controls-title" className="control-panel panel">
      <div className="panel-heading">
        <p className="panel-kicker">{ui.controlKicker}</p>
        <h2 id="controls-title">{ui.controlsTitle}</h2>
        <p>{ui.controlsSubtitle}</p>
      </div>

      <div className="lever lever-concentration">
        <h3 className="lever-title">
          <span className="lever-icon">
            <Icon name="beaker" size={16} />
          </span>
          {ui.leverConcentration}
        </h3>

        <label className="slider-block" htmlFor="amount-range">
          <span className="slider-label">
            <span>{ui.amountPerClick}</span>
            <span className="numeric-readout">{formatNumber(amountDraft, language, 2)} M</span>
          </span>
          <input
            className="range-input"
            id="amount-range"
            max="1.2"
            min="0.05"
            onChange={(event) => setAmountDraft(Number(event.target.value))}
            step="0.05"
            style={{ '--range-progress': rangeProgress(amountDraft, [0.05, 1.2]) } as CSSProperties}
            type="range"
            value={amountDraft}
          />
        </label>

        <ul className="species-ops">
          {reaction.species.map((species) => {
            const name = `${species.formula} (${getLocalizedText(species.label, language)})`
            const current = currentConcentrations[species.id] ?? 0

            return (
              <li
                className="species-op"
                key={species.id}
                style={{ '--species-color': species.color } as CSSProperties}
              >
                <span className="species-swatch" />
                <span className="species-op-name">
                  <strong>
                    <Formula value={species.formula} />
                  </strong>
                  <small>{getLocalizedText(species.label, language)}</small>
                </span>
                <span className="species-op-value">{formatNumber(current, language, 2)} M</span>
                <span className="species-op-buttons">
                  <button
                    aria-label={`${name}: ${ui.remove} ${formatNumber(amountDraft, language, 2)} M`}
                    aria-disabled={current <= 0.0001}
                    className="round-button"
                    onClick={() => {
                      if (current > 0.0001) {
                        onSpeciesChange(species.id, amountDraft, 'remove')
                      }
                    }}
                    title={ui.remove}
                    type="button"
                  >
                    <Icon name="minus" size={16} />
                  </button>
                  <button
                    aria-label={`${name}: ${ui.inject} ${formatNumber(amountDraft, language, 2)} M`}
                    className="round-button is-add"
                    onClick={() => onSpeciesChange(species.id, amountDraft, 'inject')}
                    title={ui.inject}
                    type="button"
                  >
                    <Icon name="plus" size={16} />
                  </button>
                </span>
              </li>
            )
          })}
        </ul>
      </div>

      <div className="lever lever-temperature">
        <h3 className="lever-title">
          <span className="lever-icon">
            <Icon name="thermometer" size={16} />
          </span>
          {ui.leverTemperature}
        </h3>
        <label className="slider-block" htmlFor="temperature-range">
          <span className="slider-label">
            <span>{ui.temperature}</span>
            <span className="numeric-readout big">
              {temperatureDraft} K
              {temperatureDirty ? <span className="dirty-badge">{ui.notApplied}</span> : null}
            </span>
          </span>
          <input
            className="range-input range-heat"
            id="temperature-range"
            max={maxTemperature}
            min={minTemperature}
            onChange={(event) => setTemperatureDraft(Number(event.target.value))}
            step="1"
            style={
              {
                '--range-progress': rangeProgress(temperatureDraft, reaction.temperatureRange),
                '--heat-level': heatLevel,
              } as CSSProperties
            }
            type="range"
            value={temperatureDraft}
          />
        </label>
        <div className="lever-actions">
          <button
            aria-disabled={atMinTemperature}
            className="chip-button tone-cool"
            onClick={() => {
              if (!atMinTemperature) {
                onTemperatureApply(temperature - temperatureStep)
              }
            }}
            type="button"
          >
            <Icon name="snowflake" size={15} />
            {ui.cool} −{temperatureStep}
          </button>
          <button
            aria-disabled={!temperatureDirty}
            className={`button-apply ${temperatureDirty ? 'is-dirty' : ''}`}
            onClick={() => {
              if (temperatureDirty) {
                onTemperatureApply(temperatureDraft)
              }
            }}
            type="button"
          >
            {ui.apply}
          </button>
          <button
            aria-disabled={atMaxTemperature}
            className="chip-button tone-heat"
            onClick={() => {
              if (!atMaxTemperature) {
                onTemperatureApply(temperature + temperatureStep)
              }
            }}
            type="button"
          >
            <Icon name="flame" size={15} />
            {ui.heat} +{temperatureStep}
          </button>
        </div>
      </div>

      <div className={`lever lever-volume ${reaction.pressureSensitive ? '' : 'is-disabled'}`}>
        <h3 className="lever-title">
          <span className="lever-icon">
            <Icon name="compress" size={16} />
          </span>
          {ui.leverVolume}
        </h3>
        <label className="slider-block" htmlFor="volume-range">
          <span className="slider-label">
            <span>{ui.volume}</span>
            <span className="numeric-readout big">
              {formatNumber(volumeDraft, language, 2)} L
              {volumeDirty ? <span className="dirty-badge">{ui.notApplied}</span> : null}
            </span>
          </span>
          <input
            className="range-input"
            disabled={!reaction.pressureSensitive}
            id="volume-range"
            max={maxVolume}
            min={minVolume}
            onChange={(event) => setVolumeDraft(Number(event.target.value))}
            step="0.05"
            style={{ '--range-progress': rangeProgress(volumeDraft, reaction.volumeRange) } as CSSProperties}
            type="range"
            value={volumeDraft}
          />
        </label>
        {reaction.pressureSensitive ? (
          <div className="lever-actions">
            <button
              aria-disabled={atMinVolume}
              className="chip-button"
              onClick={() => {
                if (!atMinVolume) {
                  onVolumeApply(Math.max(minVolume, roundVolume(volume - VOLUME_STEP)))
                }
              }}
              type="button"
            >
              <Icon name="compress" size={15} />
              {ui.compress}
            </button>
            <button
              aria-disabled={!volumeDirty}
              className={`button-apply ${volumeDirty ? 'is-dirty' : ''}`}
              onClick={() => {
                if (volumeDirty) {
                  onVolumeApply(volumeDraft)
                }
              }}
              type="button"
            >
              {ui.apply}
            </button>
            <button
              aria-disabled={atMaxVolume}
              className="chip-button"
              onClick={() => {
                if (!atMaxVolume) {
                  onVolumeApply(Math.min(maxVolume, roundVolume(volume + VOLUME_STEP)))
                }
              }}
              type="button"
            >
              <Icon name="expand" size={15} />
              {ui.expand}
            </button>
          </div>
        ) : (
          <p className="small-note">{ui.pressureLimited}</p>
        )}
      </div>

      <div className="lever lever-catalyst">
        <div className="lever-row">
          <div>
            <h3 className="lever-title">
              <span className="lever-icon">
                <Icon name="sparkle" size={16} />
              </span>
              {ui.catalyst}
            </h3>
            <p className="small-note">{ui.catalystHint}</p>
          </div>
          <button
            aria-pressed={catalyst}
            className={`switch ${catalyst ? 'is-on' : ''}`}
            onClick={onToggleCatalyst}
            type="button"
          >
            <span aria-hidden="true" className="switch-track">
              <span className="switch-thumb" />
            </span>
            <span className="switch-label">{catalyst ? ui.catalystOn : ui.catalystOff}</span>
          </button>
        </div>
      </div>

      <details className="lever initial-details">
        <summary>
          <span>{ui.initialToggle}</span>
          <Icon className="summary-chevron" name="chevron" size={16} />
        </summary>
        <div className="species-input-grid">
          {reaction.species.map((species) => (
            <label className="species-input-card" key={species.id}>
              <span className="species-title">
                <span className="species-swatch" style={{ backgroundColor: species.color }} />
                <Formula value={species.formula} />
              </span>
              <input
                className="number-input"
                inputMode="decimal"
                min="0"
                onChange={(event) => {
                  setInitialError('')
                  setInitialDrafts((previous) => ({
                    ...previous,
                    [species.id]: Math.max(0, Number(event.target.value) || 0),
                  }))
                }}
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
        <button className="button-primary full" onClick={handleRestartWithInitials} type="button">
          <Icon name="reset" size={16} />
          {ui.restartWithDraft}
        </button>
        <p aria-live="polite" className="error-note">
          {initialError}
        </p>
      </details>
    </section>
  )
}

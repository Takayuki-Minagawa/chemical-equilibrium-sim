import { useEffect, useMemo, useRef, useState } from 'react'
import { ConcentrationGraph } from './components/ConcentrationGraph'
import { ControlPanel } from './components/ControlPanel'
import { LearningPanel } from './components/LearningPanel'
import { VesselCanvas } from './components/VesselCanvas'
import { reactionLookup, reactions } from './data/reactions'
import {
  applyVolumeScaling,
  createInitialConcentrations,
  getPredictedShift,
  getSimulationSnapshot,
  limitList,
  stepConcentrations,
} from './lib/equilibrium'
import {
  describeDirection,
  describeEvent,
  formatNumber,
  getLocalizedText,
  uiText,
} from './lib/copy'
import type {
  ConcentrationMap,
  HistoryPoint,
  Language,
  ReactionDefinition,
  SimulationEvent,
  SpeedOption,
  Theme,
} from './types'

interface RuntimeState {
  reactionId: string
  temperature: number
  volume: number
  catalyst: boolean
  concentrations: ConcentrationMap
  initialConcentrations: ConcentrationMap
  time: number
  isRunning: boolean
  speed: SpeedOption
  history: HistoryPoint[]
  events: SimulationEvent[]
}

const MAX_HISTORY_POINTS = 360
const MAX_EVENTS = 12
const DEFAULT_SPEED: SpeedOption = 1
const LANGUAGE_KEY = 'chemical-equilibrium-language'
const THEME_KEY = 'chemical-equilibrium-theme'

function getSafeStorageItem(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function setSafeStorageItem(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Ignore storage write failures such as private browsing restrictions.
  }
}

function readLanguagePreference(): Language {
  if (typeof window === 'undefined') {
    return 'ja'
  }

  const stored = getSafeStorageItem(LANGUAGE_KEY)
  return stored === 'en' ? 'en' : 'ja'
}

function readThemePreference(): Theme {
  if (typeof window === 'undefined') {
    return 'dark'
  }

  const stored = getSafeStorageItem(THEME_KEY)
  if (stored === 'light' || stored === 'dark') {
    return stored
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function buildHistoryPoint(
  reaction: ReactionDefinition,
  concentrations: ConcentrationMap,
  temperature: number,
  volume: number,
  catalyst: boolean,
  time: number,
): HistoryPoint {
  const snapshot = getSimulationSnapshot({
    reaction,
    concentrations,
    temperature,
    volume,
    catalyst,
  })

  return {
    time,
    concentrations: { ...concentrations },
    equilibrium: snapshot.equilibrium,
    k: snapshot.k,
    q: snapshot.q,
  }
}

function createRuntimeState(
  reaction: ReactionDefinition,
  speed: SpeedOption,
  initialOverrides: ConcentrationMap = reaction.initialConcentrations,
): RuntimeState {
  const initialConcentrations = createInitialConcentrations(reaction, initialOverrides)

  return {
    reactionId: reaction.id,
    temperature: reaction.defaultTemperature,
    volume: reaction.defaultVolume,
    catalyst: false,
    concentrations: initialConcentrations,
    initialConcentrations,
    time: 0,
    isRunning: true,
    speed,
    history: [
      buildHistoryPoint(
        reaction,
        initialConcentrations,
        reaction.defaultTemperature,
        reaction.defaultVolume,
        false,
        0,
      ),
    ],
    events: [],
  }
}

function App() {
  const [language, setLanguage] = useState<Language>(readLanguagePreference)
  const [theme, setTheme] = useState<Theme>(readThemePreference)
  const [panelVersion, setPanelVersion] = useState(0)
  const [runtime, setRuntime] = useState<RuntimeState>(() =>
    createRuntimeState(reactions[0], DEFAULT_SPEED),
  )

  const reaction = reactionLookup[runtime.reactionId] ?? reactions[0]
  const ui = uiText[language]
  const latestEvent = runtime.events[runtime.events.length - 1]
  const eventIdRef = useRef(1)
  const batchAccumulatorRef = useRef(0)
  const historyAccumulatorRef = useRef(0)

  const snapshot = useMemo(
    () =>
      getSimulationSnapshot({
        reaction,
        concentrations: runtime.concentrations,
        temperature: runtime.temperature,
        volume: runtime.volume,
        catalyst: runtime.catalyst,
      }),
    [
      reaction,
      runtime.catalyst,
      runtime.concentrations,
      runtime.temperature,
      runtime.volume,
    ],
  )

  const predictedShift = useMemo(() => {
    if (!latestEvent) {
      return snapshot.direction
    }

    return getPredictedShift(reaction, latestEvent)
  }, [latestEvent, reaction, snapshot.direction])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    setSafeStorageItem(THEME_KEY, theme)
  }, [theme])

  useEffect(() => {
    setSafeStorageItem(LANGUAGE_KEY, language)
  }, [language])

  useEffect(() => {
    if (!runtime.isRunning) {
      return undefined
    }

    let frameId = 0
    let previousTimestamp: number | null = null

    const frame = (timestamp: number) => {
      if (previousTimestamp === null) {
        previousTimestamp = timestamp
      }

      const dtReal = Math.min((timestamp - previousTimestamp) / 1000, 0.12)
      previousTimestamp = timestamp
      batchAccumulatorRef.current += dtReal

      if (batchAccumulatorRef.current >= 1 / 24) {
        const batchedRealTime = batchAccumulatorRef.current
        batchAccumulatorRef.current = 0

        setRuntime((previous) => {
          if (!previous.isRunning) {
            return previous
          }

          const currentReaction = reactionLookup[previous.reactionId] ?? reactions[0]
          const simulatedSpan = batchedRealTime * previous.speed
          const stepCount = Math.max(1, Math.ceil(simulatedSpan / 0.02))
          const dt = simulatedSpan / stepCount
          let concentrations = previous.concentrations
          let time = previous.time

          for (let index = 0; index < stepCount; index += 1) {
            concentrations = stepConcentrations({
              reaction: currentReaction,
              concentrations,
              temperature: previous.temperature,
              catalyst: previous.catalyst,
              dt,
            })
            time += dt
          }

          const nextState: RuntimeState = {
            ...previous,
            concentrations,
            time,
          }

          historyAccumulatorRef.current += simulatedSpan
          if (historyAccumulatorRef.current < 0.18) {
            return nextState
          }

          historyAccumulatorRef.current = 0
          const nextPoint = buildHistoryPoint(
            currentReaction,
            concentrations,
            previous.temperature,
            previous.volume,
            previous.catalyst,
            time,
          )

          return {
            ...nextState,
            history: limitList([...previous.history, nextPoint], MAX_HISTORY_POINTS),
          }
        })
      }

      frameId = window.requestAnimationFrame(frame)
    }

    frameId = window.requestAnimationFrame(frame)

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [runtime.isRunning])

  const resetAccumulators = () => {
    batchAccumulatorRef.current = 0
    historyAccumulatorRef.current = 0
  }

  const appendEventState = (
    previous: RuntimeState,
    nextPartial: Partial<RuntimeState>,
    event: SimulationEvent,
  ): RuntimeState => {
    const currentReaction = reactionLookup[previous.reactionId] ?? reactions[0]
    const nextState: RuntimeState = {
      ...previous,
      ...nextPartial,
    }
    const nextPoint = buildHistoryPoint(
      currentReaction,
      nextState.concentrations,
      nextState.temperature,
      nextState.volume,
      nextState.catalyst,
      nextState.time,
    )

    return {
      ...nextState,
      history: limitList([...previous.history, nextPoint], MAX_HISTORY_POINTS),
      events: limitList([...previous.events, event], MAX_EVENTS),
    }
  }

  const changeReaction = (reactionId: string) => {
    const nextReaction = reactionLookup[reactionId]
    if (!nextReaction) {
      return
    }

    resetAccumulators()
    setPanelVersion((previous) => previous + 1)
    setRuntime((previous) => createRuntimeState(nextReaction, previous.speed))
  }

  const restartSimulation = (initialOverrides?: ConcentrationMap) => {
    resetAccumulators()
    setPanelVersion((previous) => previous + 1)
    setRuntime((previous) => {
      const currentReaction = reactionLookup[previous.reactionId]
      const safeReaction = currentReaction ?? reactions[0]
      return createRuntimeState(
        safeReaction,
        previous.speed,
        initialOverrides ?? previous.initialConcentrations,
      )
    })
  }

  const updateTemperature = (nextTemperature: number) => {
    resetAccumulators()
    setRuntime((previous) => {
      const currentReaction = reactionLookup[previous.reactionId] ?? reactions[0]
      const clampedTemperature = Math.min(
        currentReaction.temperatureRange[1],
        Math.max(currentReaction.temperatureRange[0], nextTemperature),
      )

      if (Math.abs(clampedTemperature - previous.temperature) < 0.001) {
        return previous
      }

      const event: SimulationEvent = {
        id: eventIdRef.current,
        time: previous.time,
        type: 'temperature',
        metadata: {
          from: previous.temperature,
          to: clampedTemperature,
        },
      }
      eventIdRef.current += 1

      return appendEventState(previous, { temperature: clampedTemperature }, event)
    })
  }

  const updateVolume = (nextVolume: number) => {
    resetAccumulators()
    setRuntime((previous) => {
      const currentReaction = reactionLookup[previous.reactionId] ?? reactions[0]
      const clampedVolume = Math.min(
        currentReaction.volumeRange[1],
        Math.max(currentReaction.volumeRange[0], nextVolume),
      )

      if (Math.abs(clampedVolume - previous.volume) < 0.001) {
        return previous
      }

      const event: SimulationEvent = {
        id: eventIdRef.current,
        time: previous.time,
        type: 'volume',
        metadata: {
          from: previous.volume,
          to: clampedVolume,
        },
      }
      eventIdRef.current += 1

      const concentrations = applyVolumeScaling(
        currentReaction,
        previous.concentrations,
        previous.volume,
        clampedVolume,
      )

      return appendEventState(
        previous,
        {
          volume: clampedVolume,
          concentrations,
        },
        event,
      )
    })
  }

  const toggleCatalyst = () => {
    resetAccumulators()
    setRuntime((previous) => {
      const event: SimulationEvent = {
        id: eventIdRef.current,
        time: previous.time,
        type: 'catalyst',
        metadata: {
          active: !previous.catalyst,
        },
      }
      eventIdRef.current += 1

      return appendEventState(previous, { catalyst: !previous.catalyst }, event)
    })
  }

  const changeSpeciesConcentration = (
    speciesId: string,
    amount: number,
    type: 'inject' | 'remove',
  ) => {
    resetAccumulators()
    setRuntime((previous) => {
      const currentValue = previous.concentrations[speciesId] ?? 0
      const nextValue =
        type === 'inject'
          ? currentValue + amount
          : Math.max(0, currentValue - amount)

      if (Math.abs(nextValue - currentValue) < 0.0001) {
        return previous
      }

      const event: SimulationEvent = {
        id: eventIdRef.current,
        time: previous.time,
        type,
        speciesId,
        amount,
      }
      eventIdRef.current += 1

      return appendEventState(
        previous,
        {
          concentrations: {
            ...previous.concentrations,
            [speciesId]: nextValue,
          },
        },
        event,
      )
    })
  }

  const updateSpeed = (speed: SpeedOption) => {
    setRuntime((previous) => ({
      ...previous,
      speed,
    }))
  }

  const togglePlayback = () => {
    resetAccumulators()
    setRuntime((previous) => ({
      ...previous,
      isRunning: !previous.isRunning,
    }))
  }

  return (
    <div className="app-shell">
      <header className="hero-panel">
        <div className="hero-copy">
          <p className="hero-kicker">{ui.heroKicker}</p>
          <h1>{ui.appTitle}</h1>
          <p>{ui.appSubtitle}</p>
        </div>
        <div className="hero-chip-row" aria-label={ui.reactionHighlights}>
          <span className="hero-chip">{reaction.equation}</span>
          <span className="hero-chip">{getLocalizedText(reaction.title, language)}</span>
          <span className="hero-chip">{getLocalizedText(reaction.note, language)}</span>
        </div>
      </header>

      <section className="top-grid">
        <ControlPanel
          catalyst={runtime.catalyst}
          currentConcentrations={runtime.concentrations}
          initialConcentrations={runtime.initialConcentrations}
          isRunning={runtime.isRunning}
          key={`${panelVersion}-${reaction.id}-${runtime.temperature}-${runtime.volume}-${Object.values(
            runtime.initialConcentrations,
          ).join(',')}`}
          language={language}
          onLanguageChange={setLanguage}
          onReactionChange={changeReaction}
          onResetSimulation={restartSimulation}
          onRestartWithInitials={restartSimulation}
          onSpeedChange={updateSpeed}
          onSpeciesChange={changeSpeciesConcentration}
          onTemperatureApply={updateTemperature}
          onThemeChange={setTheme}
          onToggleCatalyst={toggleCatalyst}
          onTogglePlayback={togglePlayback}
          onVolumeApply={updateVolume}
          reaction={reaction}
          reactions={reactions}
          speed={runtime.speed}
          temperature={runtime.temperature}
          theme={theme}
          volume={runtime.volume}
        />

        <aside className="status-panel panel">
          <div className="panel-heading">
            <p className="panel-kicker">{ui.statusKicker}</p>
            <h2>{ui.statusTitle}</h2>
            <p>{ui.statusSubtitle}</p>
          </div>

          <div className="status-grid">
            <div className="stat-card">
              <span className="stat-label">{ui.currentDirection}</span>
              <strong className="stat-value">
                {describeDirection(language, snapshot.direction)}
              </strong>
            </div>
            <div className="stat-card">
              <span className="stat-label">{ui.predictedShift}</span>
              <strong className="stat-value">
                {describeDirection(language, predictedShift)}
              </strong>
            </div>
            <div className="stat-card">
              <span className="stat-label">K</span>
              <strong className="stat-value">{formatNumber(snapshot.k, language, 3)}</strong>
            </div>
            <div className="stat-card">
              <span className="stat-label">Q</span>
              <strong className="stat-value">{formatNumber(snapshot.q, language, 3)}</strong>
            </div>
          </div>

          <div className="rate-balance">
            <div>
              <span>{ui.forwardRate}</span>
              <strong>{formatNumber(snapshot.forwardRate, language, 3)}</strong>
            </div>
            <div>
              <span>{ui.reverseRate}</span>
              <strong>{formatNumber(snapshot.reverseRate, language, 3)}</strong>
            </div>
          </div>

          <div className="species-value-list" aria-label={ui.currentConcentrations}>
            {reaction.species.map((species) => (
              <div className="species-value-item" key={species.id}>
                <span className="species-swatch" style={{ backgroundColor: species.color }} />
                <div>
                  <strong>{species.formula}</strong>
                  <small>{getLocalizedText(species.label, language)}</small>
                </div>
                <span>{formatNumber(runtime.concentrations[species.id] ?? 0, language, 2)} M</span>
              </div>
            ))}
          </div>

          <div className="event-list-block">
            <h3>{ui.operationLog}</h3>
            {runtime.events.length === 0 ? (
              <p className="small-note">{ui.noEvents}</p>
            ) : (
              <ul className="event-list">
                {[...runtime.events]
                  .reverse()
                  .slice(0, 5)
                  .map((event) => (
                    <li className="event-item" key={event.id}>
                      <span className="mini-badge">
                        t = {formatNumber(event.time, language, 1)}
                      </span>
                      <span>{describeEvent(event, reaction, language)}</span>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </aside>
      </section>

      <section className="visual-grid">
        <VesselCanvas
          concentrations={runtime.concentrations}
          direction={snapshot.direction}
          equilibrium={snapshot.equilibrium}
          language={language}
          lastEvent={latestEvent}
          reaction={reaction}
          temperature={runtime.temperature}
          volume={runtime.volume}
        />
        <ConcentrationGraph
          events={runtime.events}
          history={runtime.history}
          language={language}
          reaction={reaction}
          snapshot={snapshot}
        />
      </section>

      <LearningPanel
        catalyst={runtime.catalyst}
        key={`${language}-${reaction.id}-${latestEvent?.id ?? 0}`}
        language={language}
        lastEvent={latestEvent}
        predictedShift={predictedShift}
        reaction={reaction}
        snapshot={snapshot}
        temperature={runtime.temperature}
        volume={runtime.volume}
      />
    </div>
  )
}

export default App

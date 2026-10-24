import { useEffect, useMemo, useRef, useState } from 'react'
import { AppHeader } from './components/AppHeader'
import { ConcentrationGraph } from './components/ConcentrationGraph'
import { ControlPanel } from './components/ControlPanel'
import { Icon } from './components/Icon'
import { LearningPanel } from './components/LearningPanel'
import { MissionPanel } from './components/MissionPanel'
import { PlaybackBar } from './components/PlaybackBar'
import { ReactionBanner } from './components/ReactionBanner'
import { ReactionPicker } from './components/ReactionPicker'
import { StatusPanel } from './components/StatusPanel'
import { ToastStack, type ToastMessage } from './components/ToastStack'
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
import { getLocalizedText, uiText } from './lib/copy'
import { missions, parseProgress, type MissionId, type ProgressState } from './lib/missions'
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
const PROGRESS_KEY = 'chemical-equilibrium-progress'
const TOAST_DURATION_MS = 4200

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

function readProgress(): ProgressState {
  const storedValue = typeof window === 'undefined' ? null : getSafeStorageItem(PROGRESS_KEY)
  return parseProgress(storedValue, reactions[0].id)
}

/**
 * How far the system has travelled from the state right after the latest
 * operation (or the start) toward equilibrium, measured on |ln(Q/K)|.
 */
function getApproachProgress(
  history: HistoryPoint[],
  latestEvent: SimulationEvent | undefined,
  q: number,
  k: number,
): number {
  const anchor =
    (latestEvent
      ? [...history].reverse().find((point) => point.time <= latestEvent.time + 1e-9)
      : undefined) ?? history[0]

  if (!anchor) {
    return 1
  }

  const initialGap = Math.abs(Math.log(Math.max(anchor.q, 1e-12) / Math.max(anchor.k, 1e-12)))
  const currentGap = Math.abs(Math.log(Math.max(q, 1e-12) / Math.max(k, 1e-12)))

  if (initialGap < 0.04) {
    return 1
  }

  return Math.max(0, Math.min(1, 1 - currentGap / initialGap))
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
  const [progress, setProgress] = useState<ProgressState>(readProgress)
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const toastIdRef = useRef(1)
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
    document.documentElement.lang = language
    document.title =
      language === 'ja'
        ? '化学平衡ラボ | ルシャトリエの原理シミュレーター'
        : "Equilibrium Lab | Le Chatelier's Principle Simulator"
  }, [language])

  useEffect(() => {
    setSafeStorageItem(PROGRESS_KEY, JSON.stringify(progress))
  }, [progress])

  const approach = useMemo(
    () => getApproachProgress(runtime.history, latestEvent, snapshot.q, snapshot.k),
    [latestEvent, runtime.history, snapshot.k, snapshot.q],
  )

  const pushToast = (toast: Omit<ToastMessage, 'id'>) => {
    const id = toastIdRef.current
    toastIdRef.current += 1
    setToasts((previous) => [...previous.slice(-2), { ...toast, id }])
    window.setTimeout(() => {
      setToasts((previous) => previous.filter((entry) => entry.id !== id))
    }, TOAST_DURATION_MS)
  }

  const completeMissions = (ids: MissionId[], visited?: string[]) => {
    const newlyCompleted = ids.filter((id) => !progress.completed.includes(id))
    const nextVisited = visited ?? progress.visited

    if (newlyCompleted.length === 0 && nextVisited === progress.visited) {
      return
    }

    const completed = [...progress.completed, ...newlyCompleted]
    setProgress({ completed, visited: nextVisited })

    newlyCompleted.forEach((id) => {
      const mission = missions.find((entry) => entry.id === id)
      if (mission) {
        pushToast({
          icon: 'trophy',
          title: ui.missionUnlocked,
          body: `${getLocalizedText(mission.title, language)} — ${getLocalizedText(mission.hint, language)}`,
        })
      }
    })

    if (newlyCompleted.length > 0 && completed.length === missions.length) {
      pushToast({ icon: 'sparkle', title: ui.missionAllDone, body: ui.quizAllCorrect })
    }
  }

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

    if (!progress.visited.includes(reactionId)) {
      const visited = [...progress.visited, reactionId]
      const allVisited = reactions.every((entry) => visited.includes(entry.id))
      completeMissions(allVisited ? ['explorer'] : [], visited)
    }
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
    if (nextTemperature > runtime.temperature) {
      completeMissions(['heat'])
    } else if (nextTemperature < runtime.temperature) {
      completeMissions(['cool'])
    }

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
    if (reaction.pressureSensitive && nextVolume < runtime.volume) {
      completeMissions(['compress'])
    }

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
    if (!runtime.catalyst) {
      completeMissions(['catalyst'])
    }

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
    if (type === 'inject' || (runtime.concentrations[speciesId] ?? 0) > 0) {
      completeMissions([type])
    }

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
      <a className="skip-link" href="#main">
        {ui.skipToMain}
      </a>

      <AppHeader
        completedMissions={progress.completed.length}
        language={language}
        onLanguageChange={setLanguage}
        onThemeChange={setTheme}
        theme={theme}
        totalMissions={missions.length}
      />

      <section aria-labelledby="app-title" className="hero">
        <div aria-hidden="true" className="hero-orbits">
          {reaction.species.map((species, index) => (
            <span
              className={`hero-orb hero-orb-${index + 1}`}
              key={species.id}
              style={{ backgroundColor: species.color }}
            />
          ))}
        </div>
        <div className="hero-copy">
          <p className="hero-kicker">{ui.heroKicker}</p>
          <h1 id="app-title">{ui.appTitle}</h1>
          <p className="hero-lead">{ui.appSubtitle}</p>
          <ol aria-label={ui.stepsLabel} className="hero-steps">
            {[ui.step1, ui.step2, ui.step3].map((step, index) => (
              <li key={step}>
                <span className="step-number">{index + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        </div>
        <ReactionPicker
          activeId={reaction.id}
          language={language}
          onSelect={changeReaction}
          reactions={reactions}
          visited={progress.visited}
        />
      </section>

      <main className="lab-grid" id="main" tabIndex={-1}>
        <div className="area-banner">
          <ReactionBanner
            approach={approach}
            language={language}
            reaction={reaction}
            snapshot={snapshot}
          />
        </div>

        <div className="area-vessel">
          <VesselCanvas
            catalyst={runtime.catalyst}
            concentrations={runtime.concentrations}
            direction={snapshot.direction}
            isRunning={runtime.isRunning}
            language={language}
            lastEvent={latestEvent}
            reaction={reaction}
            temperature={runtime.temperature}
            theme={theme}
            toolbar={
              <PlaybackBar
                isRunning={runtime.isRunning}
                language={language}
                onReset={() => restartSimulation()}
                onSpeedChange={updateSpeed}
                onTogglePlayback={togglePlayback}
                speed={runtime.speed}
                time={runtime.time}
              />
            }
            volume={runtime.volume}
          />
        </div>

        <div className="area-controls">
          <ControlPanel
            catalyst={runtime.catalyst}
            currentConcentrations={runtime.concentrations}
            initialConcentrations={runtime.initialConcentrations}
            key={`${panelVersion}-${reaction.id}`}
            language={language}
            onRestartWithInitials={restartSimulation}
            onSpeciesChange={changeSpeciesConcentration}
            onTemperatureApply={updateTemperature}
            onToggleCatalyst={toggleCatalyst}
            onVolumeApply={updateVolume}
            reaction={reaction}
            temperature={runtime.temperature}
            volume={runtime.volume}
          />
        </div>

        <div className="area-graph">
          <ConcentrationGraph
            events={runtime.events}
            history={runtime.history}
            language={language}
            reaction={reaction}
            snapshot={snapshot}
          />
        </div>

        <div className="area-status">
          <StatusPanel
            concentrations={runtime.concentrations}
            equilibrium={snapshot.equilibrium}
            events={runtime.events}
            language={language}
            latestEvent={latestEvent}
            predictedShift={predictedShift}
            reaction={reaction}
          />
        </div>

        <div className="area-learning">
          <LearningPanel
            catalyst={runtime.catalyst}
            key={`${language}-${reaction.id}-${latestEvent?.id ?? 0}`}
            language={language}
            lastEvent={latestEvent}
            onQuizComplete={() => completeMissions(['quiz'])}
            predictedShift={predictedShift}
            reaction={reaction}
            snapshot={snapshot}
            temperature={runtime.temperature}
            volume={runtime.volume}
          />
        </div>

        <div className="area-missions">
          <MissionPanel
            completed={progress.completed}
            language={language}
            onReset={() => setProgress({ completed: [], visited: [reaction.id] })}
            totalReactions={reactions.length}
            visitedCount={progress.visited.length}
          />
        </div>
      </main>

      <footer className="app-footer">
        <Icon name="atom" size={16} />
        <span>{ui.appTitle}</span>
      </footer>

      <ToastStack toasts={toasts} />
    </div>
  )
}

export default App

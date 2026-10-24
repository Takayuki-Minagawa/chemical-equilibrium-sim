import {
  useEffect,
  useEffectEvent,
  useMemo,
  useReducer,
  useRef,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { describeDirection, formatNumber, getLocalizedText, uiText } from '../lib/copy'
import type {
  ConcentrationMap,
  Language,
  ReactionDirection,
  ReactionDefinition,
  SimulationEvent,
  Theme,
} from '../types'
import { Formula } from './Formula'
import { Icon } from './Icon'

interface VesselCanvasProps {
  catalyst: boolean
  concentrations: ConcentrationMap
  direction: ReactionDirection
  isRunning: boolean
  language: Language
  lastEvent?: SimulationEvent
  reaction: ReactionDefinition
  temperature: number
  theme: Theme
  toolbar?: ReactNode
  volume: number
}

interface Particle {
  id: number
  speciesId: string
  x: number
  y: number
  vx: number
  vy: number
  radius: number
}

interface Flash {
  color: string
  life: number
  radius: number
  x: number
  y: number
}

const CANVAS_PALETTE = {
  light: {
    chamberFill: 'rgba(255, 255, 255, 0.7)',
    chamberStroke: 'rgba(11, 122, 110, 0.5)',
    piston: '#c9d4db',
    pistonEdge: '#6b7d88',
    rod: 'rgba(90, 107, 118, 0.6)',
    particleEdge: 'rgba(20, 36, 48, 0.32)',
    highlight: 'rgba(255, 255, 255, 0.6)',
    forward: '#0b7a6e',
    reverse: '#c4471f',
    balanced: '#6d5ce8',
    heat: '229, 83, 61',
    cool: '47, 127, 224',
  },
  dark: {
    chamberFill: 'rgba(255, 255, 255, 0.035)',
    chamberStroke: 'rgba(62, 214, 194, 0.5)',
    piston: '#2a3b4f',
    pistonEdge: '#8aa3b8',
    rod: 'rgba(157, 176, 191, 0.5)',
    particleEdge: 'rgba(0, 0, 0, 0.3)',
    highlight: 'rgba(255, 255, 255, 0.42)',
    forward: '#3ed6c2',
    reverse: '#ff8a5c',
    balanced: '#a99bff',
    heat: '255, 122, 92',
    cool: '111, 178, 255',
  },
} as const

const CHAMBER_TOP = 56
const CHAMBER_BOTTOM_GAP = 18
const SIDE_PADDING = 18
const ROD_ROOM = 40

function traceRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath()
  if (typeof context.roundRect === 'function') {
    context.roundRect(x, y, width, height, radius)
  } else {
    context.rect(x, y, width, height)
  }
}

export function VesselCanvas({
  catalyst,
  concentrations,
  direction,
  isRunning,
  language,
  lastEvent,
  reaction,
  temperature,
  theme,
  toolbar,
  volume,
}: VesselCanvasProps) {
  const ui = uiText[language]
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const particleIdRef = useRef(1)
  const particlesRef = useRef<Particle[]>([])
  const flashesRef = useRef<Flash[]>([])
  const sizeRef = useRef({ dpr: 1, height: 340, width: 340 })
  const sceneRef = useRef({
    colors: {} as Record<string, string>,
    direction: 'balanced' as ReactionDirection,
    heat: 0,
    palette: CANVAS_PALETTE.dark as (typeof CANVAS_PALETTE)[Theme],
    pistonVisible: true,
    running: true,
    speedFactor: 1,
    targetRatio: 1,
  })
  const lastEventId = lastEvent?.id

  const targetCounts = useMemo(() => {
    const amountProxy = reaction.species.map((species) => {
      const concentration = concentrations[species.id] ?? 0
      return species.phase === 'gas' ? concentration * volume : concentration
    })
    const totalAmount = amountProxy.reduce((total, value) => total + value, 0)
    const scale = totalAmount > 0 ? 90 / totalAmount : 0

    return Object.fromEntries(
      reaction.species.map((species, index) => {
        const amount = amountProxy[index]
        const desiredCount = Math.max(0, Math.min(56, Math.round(amount * scale)))
        return [species.id, amount > 0 && desiredCount === 0 ? 1 : desiredCount]
      }),
    ) as Record<string, number>
  }, [concentrations, reaction.species, volume])

  const containerRatio =
    0.58 +
    ((volume - reaction.volumeRange[0]) /
      (reaction.volumeRange[1] - reaction.volumeRange[0] || 1)) *
      0.42

  // -1 (coldest) ... 0 (default) ... 1 (hottest), used for tint and thermal motion.
  const heat = Math.max(
    -1,
    Math.min(
      1,
      (temperature - reaction.defaultTemperature) /
        ((reaction.temperatureRange[1] - reaction.temperatureRange[0]) / 2 || 1),
    ),
  )

  const particleSummary = `${ui.particleSummaryPrefix}: ${reaction.species
    .map((species) => `${species.formula} ${targetCounts[species.id] ?? 0}`)
    .join(', ')}`
  const announcementPrefix = describeDirection(language, direction)
  const [liveAnnouncement, announceParticleSummary] = useReducer(
    (_previous: string, next: string) => next,
    `${announcementPrefix}. ${particleSummary}`,
  )
  const getLiveAnnouncement = useEffectEvent(
    () => `${announcementPrefix}. ${particleSummary}`,
  )

  useEffect(() => {
    const scene = sceneRef.current
    scene.colors = Object.fromEntries(reaction.species.map((species) => [species.id, species.color]))
    scene.direction = direction
    scene.heat = heat
    scene.palette = CANVAS_PALETTE[theme]
    scene.pistonVisible = reaction.pressureSensitive
    scene.running = isRunning
    scene.speedFactor = Math.max(0.4, Math.min(2.1, 1 + heat * 0.9))
    scene.targetRatio = containerRatio
  }, [containerRatio, direction, heat, isRunning, reaction, theme])

  useEffect(() => {
    const nextParticles: Particle[] = []
    const grouped = reaction.species.reduce<Record<string, Particle[]>>((accumulator, species) => {
      accumulator[species.id] = []
      return accumulator
    }, {})

    particlesRef.current.forEach((particle) => {
      grouped[particle.speciesId]?.push(particle)
    })

    const { height, width } = sizeRef.current
    const flashColor = CANVAS_PALETTE[theme][direction]

    reaction.species.forEach((species) => {
      const existing = grouped[species.id] ?? []
      const desiredCount = targetCounts[species.id] ?? 0

      for (let index = 0; index < desiredCount; index += 1) {
        const reused = existing[index]
        const angle = Math.random() * Math.PI * 2
        const speed = 22 + Math.random() * 26
        const particle =
          reused ??
          {
            id: particleIdRef.current,
            speciesId: species.id,
            x: SIDE_PADDING + 12 + Math.random() * (width * 0.5),
            y: CHAMBER_TOP + 12 + Math.random() * Math.max(40, height - CHAMBER_TOP - 60),
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            radius: 4 + Math.min(3, species.stoich),
          }

        if (!reused) {
          particleIdRef.current += 1
        }

        particle.speciesId = species.id
        particle.radius = 4 + Math.min(3, species.stoich)
        nextParticles.push(particle)
      }

      if (existing.length !== desiredCount) {
        flashesRef.current.push({
          color: flashColor,
          x: SIDE_PADDING + 40 + Math.random() * Math.max(60, width * 0.45),
          y: CHAMBER_TOP + 30 + Math.random() * Math.max(40, height - CHAMBER_TOP - 90),
          radius: 6 + Math.random() * 12,
          life: 1,
        })
      }
    })

    particlesRef.current = nextParticles
    // Flash colour follows the current direction, but only a count change should spawn one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reaction.species, targetCounts])

  useEffect(() => {
    if (lastEventId === undefined) {
      return
    }

    const { height, width } = sizeRef.current
    flashesRef.current.push({
      color: CANVAS_PALETTE[theme].balanced,
      x: SIDE_PADDING + 60 + Math.random() * Math.max(60, width * 0.4),
      y: CHAMBER_TOP + 40 + Math.random() * Math.max(40, height - CHAMBER_TOP - 110),
      radius: 14 + Math.random() * 18,
      life: 1,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastEventId])

  useEffect(() => {
    announceParticleSummary(getLiveAnnouncement())
  }, [announcementPrefix, lastEventId])

  useEffect(() => {
    const canvas = canvasRef.current
    const stage = stageRef.current
    if (!canvas || !stage) {
      return undefined
    }

    const context = canvas.getContext('2d')
    if (!context) {
      stage.dataset.canvasStatus = 'unsupported'
      console.error('Failed to get 2D canvas context for VesselCanvas')
      return undefined
    }

    stage.dataset.canvasStatus = 'ready'

    const reducedMotion =
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    const motionScale = reducedMotion ? 0.35 : 1

    const updateCanvasSize = (width: number, height: number) => {
      const dpr = window.devicePixelRatio || 1
      const normalizedWidth = Math.max(width, 280)
      const normalizedHeight = Math.max(height, 260)

      sizeRef.current = {
        dpr,
        height: normalizedHeight,
        width: normalizedWidth,
      }

      canvas.width = Math.floor(normalizedWidth * dpr)
      canvas.height = Math.floor(normalizedHeight * dpr)
    }

    updateCanvasSize(stage.clientWidth, stage.clientHeight)

    const ResizeObserverConstructor = window.ResizeObserver
    const handleWindowResize = () => {
      updateCanvasSize(stage.clientWidth, stage.clientHeight)
    }
    const observer = ResizeObserverConstructor
      ? new ResizeObserverConstructor((entries) => {
          for (const entry of entries) {
            updateCanvasSize(entry.contentRect.width, entry.contentRect.height)
          }
        })
      : null

    if (observer) {
      observer.observe(stage)
    } else {
      window.addEventListener('resize', handleWindowResize)
    }

    let frameId = 0
    let previousTimestamp: number | null = null
    let displayedRatio = sceneRef.current.targetRatio

    const render = (timestamp: number) => {
      if (previousTimestamp === null) {
        previousTimestamp = timestamp
      }

      const dt = Math.min((timestamp - previousTimestamp) / 1000, 0.05)
      previousTimestamp = timestamp
      const { dpr, height, width } = sizeRef.current
      const scene = sceneRef.current
      const palette = scene.palette

      // Ease the piston toward its target so compression is visible as motion.
      displayedRatio += (scene.targetRatio - displayedRatio) * Math.min(1, dt * (reducedMotion ? 30 : 6))

      context.setTransform(dpr, 0, 0, dpr, 0, 0)
      context.clearRect(0, 0, width, height)

      const chamberHeight = height - CHAMBER_TOP - CHAMBER_BOTTOM_GAP
      const maxChamberWidth = width - SIDE_PADDING * 2 - (scene.pistonVisible ? ROD_ROOM : 0)
      const chamberWidth = maxChamberWidth * displayedRatio
      const chamberLeft = SIDE_PADDING
      const chamberRight = chamberLeft + chamberWidth
      const chamberBottom = CHAMBER_TOP + chamberHeight

      traceRoundedRect(context, chamberLeft, CHAMBER_TOP, chamberWidth, chamberHeight, 14)
      context.fillStyle = palette.chamberFill
      context.fill()

      if (Math.abs(scene.heat) > 0.02) {
        const tint = scene.heat > 0 ? palette.heat : palette.cool
        const gradient = context.createLinearGradient(0, chamberBottom, 0, CHAMBER_TOP)
        gradient.addColorStop(0, `rgba(${tint}, ${Math.abs(scene.heat) * 0.26})`)
        gradient.addColorStop(1, `rgba(${tint}, 0)`)
        traceRoundedRect(context, chamberLeft, CHAMBER_TOP, chamberWidth, chamberHeight, 14)
        context.fillStyle = gradient
        context.fill()
      }

      traceRoundedRect(context, chamberLeft, CHAMBER_TOP, chamberWidth, chamberHeight, 14)
      context.strokeStyle = palette.chamberStroke
      context.lineWidth = 2
      context.stroke()

      if (scene.pistonVisible) {
        const middle = CHAMBER_TOP + chamberHeight / 2
        const handleX = width - SIDE_PADDING - 8

        context.fillStyle = palette.rod
        context.fillRect(chamberRight + 4, middle - 3, Math.max(0, handleX - chamberRight - 4), 6)

        traceRoundedRect(context, handleX - 2, middle - 22, 10, 44, 4)
        context.fillStyle = palette.piston
        context.fill()
        context.strokeStyle = palette.pistonEdge
        context.lineWidth = 1.5
        context.stroke()

        traceRoundedRect(context, chamberRight - 7, CHAMBER_TOP - 6, 12, chamberHeight + 12, 4)
        context.fillStyle = palette.piston
        context.fill()
        context.stroke()
      }

      const wallInset = scene.pistonVisible ? 8 : 2
      const motionStep = scene.running ? dt * scene.speedFactor * motionScale : 0

      particlesRef.current.forEach((particle) => {
        particle.x += particle.vx * motionStep
        particle.y += particle.vy * motionStep

        const minX = chamberLeft + particle.radius + 2
        const maxX = chamberRight - particle.radius - wallInset
        const minY = CHAMBER_TOP + particle.radius + 2
        const maxY = chamberBottom - particle.radius - 2

        if (particle.x < minX) {
          particle.x = minX
          particle.vx = Math.abs(particle.vx)
        }
        if (particle.x > maxX) {
          particle.x = maxX
          particle.vx = -Math.abs(particle.vx)
        }
        if (particle.y < minY) {
          particle.y = minY
          particle.vy = Math.abs(particle.vy)
        }
        if (particle.y > maxY) {
          particle.y = maxY
          particle.vy = -Math.abs(particle.vy)
        }

        const color = scene.colors[particle.speciesId]
        if (!color) {
          return
        }

        context.beginPath()
        context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2)
        context.fillStyle = color
        context.fill()
        context.strokeStyle = palette.particleEdge
        context.lineWidth = 1
        context.stroke()

        context.beginPath()
        context.fillStyle = palette.highlight
        context.arc(
          particle.x - particle.radius / 3,
          particle.y - particle.radius / 3,
          particle.radius / 2.6,
          0,
          Math.PI * 2,
        )
        context.fill()
      })

      flashesRef.current = flashesRef.current
        .map((flash) => ({
          ...flash,
          life: flash.life - dt * 1.6,
          radius: flash.radius + dt * (reducedMotion ? 6 : 26),
        }))
        .filter((flash) => flash.life > 0)

      flashesRef.current.forEach((flash) => {
        context.beginPath()
        context.globalAlpha = Math.max(0, flash.life * 0.7)
        context.strokeStyle = flash.color
        context.lineWidth = 2
        context.arc(flash.x, flash.y, flash.radius, 0, Math.PI * 2)
        context.stroke()
        context.globalAlpha = 1
      })

      frameId = window.requestAnimationFrame(render)
    }

    frameId = window.requestAnimationFrame(render)

    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', handleWindowResize)
      window.cancelAnimationFrame(frameId)
    }
  }, [])

  const heatTone = heat > 0.05 ? 'is-hot' : heat < -0.05 ? 'is-cold' : ''

  return (
    <section aria-labelledby="vessel-title" className="panel vessel-panel">
      <div className="panel-heading">
        <p className="panel-kicker">{ui.vesselKicker}</p>
        <h2 id="vessel-title">{ui.vesselTitle}</h2>
        <p>{ui.vesselSubtitle}</p>
      </div>

      <div
        className={`vessel-stage ${heatTone}`}
        data-canvas-status="ready"
        ref={stageRef}
        style={{ '--heat': Math.abs(heat) } as CSSProperties}
      >
        <canvas
          aria-label={particleSummary}
          className="vessel-canvas"
          ref={canvasRef}
          role="img"
        />
        <p className="canvas-fallback" role="status">
          {ui.canvasFallback}
        </p>
        <div aria-atomic="true" aria-live="polite" className="sr-only">
          {liveAnnouncement}
        </div>
        <div className="vessel-overlay">
          <span className={`vessel-badge ${heatTone}`}>
            <Icon name="thermometer" size={14} />
            {ui.vesselTemp}: {temperature} K
          </span>
          <span className="vessel-badge">
            <Icon name="beaker" size={14} />
            {ui.vesselVolume}: {formatNumber(volume, language, 2)} L
          </span>
          {catalyst ? (
            <span className="vessel-badge is-catalyst">
              <Icon name="sparkle" size={14} />
              {ui.catalystOn}
            </span>
          ) : null}
          {!isRunning ? (
            <span className="vessel-badge is-paused">
              <Icon name="pause" size={14} />
              {ui.pause}
            </span>
          ) : null}
        </div>
      </div>

      {toolbar}

      <div className="molecule-legend">
        {reaction.species.map((species) => (
          <div className="legend-chip" key={species.id}>
            <span className="species-swatch" style={{ backgroundColor: species.color }} />
            <strong>
              <Formula value={species.formula} />
            </strong>
            <small>{getLocalizedText(species.label, language)}</small>
          </div>
        ))}
      </div>
      <p className="small-note vessel-hint">{ui.vesselHint}</p>
    </section>
  )
}

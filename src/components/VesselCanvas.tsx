import { useEffect, useEffectEvent, useMemo, useReducer, useRef } from 'react'
import { describeDirection, formatNumber, getLocalizedText, uiText } from '../lib/copy'
import type {
  ConcentrationMap,
  Language,
  ReactionDirection,
  ReactionDefinition,
  SimulationEvent,
} from '../types'

interface VesselCanvasProps {
  concentrations: ConcentrationMap
  equilibrium: ConcentrationMap
  language: Language
  lastEvent?: SimulationEvent
  direction: ReactionDirection
  reaction: ReactionDefinition
  temperature: number
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
  life: number
  radius: number
  x: number
  y: number
}

export function VesselCanvas({
  concentrations,
  equilibrium,
  direction,
  language,
  lastEvent,
  reaction,
  temperature,
  volume,
}: VesselCanvasProps) {
  const ui = uiText[language]
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const particleIdRef = useRef(1)
  const particlesRef = useRef<Particle[]>([])
  const flashesRef = useRef<Flash[]>([])
  const sizeRef = useRef({
    dpr: 1,
    height: 320,
    width: 320,
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
    const nextParticles: Particle[] = []
    const grouped = reaction.species.reduce<Record<string, Particle[]>>((accumulator, species) => {
      accumulator[species.id] = []
      return accumulator
    }, {})

    particlesRef.current.forEach((particle) => {
      grouped[particle.speciesId]?.push(particle)
    })

    reaction.species.forEach((species) => {
      const existing = grouped[species.id] ?? []
      const desiredCount = targetCounts[species.id] ?? 0

      for (let index = 0; index < desiredCount; index += 1) {
        const reused = existing[index]
        const particle =
          reused ??
          {
            id: particleIdRef.current,
            speciesId: species.id,
            x: 40 + Math.random() * 300,
            y: 36 + Math.random() * 160,
            vx: (Math.random() - 0.5) * 60,
            vy: (Math.random() - 0.5) * 60,
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
          x: 100 + Math.random() * 220,
          y: 70 + Math.random() * 120,
          radius: 8 + Math.random() * 18,
          life: 1,
        })
      }
    })

    particlesRef.current = nextParticles
  }, [reaction.species, targetCounts])

  useEffect(() => {
    if (lastEventId === undefined) {
      return
    }

    flashesRef.current.push({
      x: 140 + Math.random() * 180,
      y: 60 + Math.random() * 140,
      radius: 14 + Math.random() * 22,
      life: 1,
    })
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

    const updateCanvasSize = (width: number, height: number) => {
      const dpr = window.devicePixelRatio || 1
      const normalizedWidth = Math.max(width, 320)
      const normalizedHeight = Math.max(height, 280)

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

    const render = (timestamp: number) => {
      if (previousTimestamp === null) {
        previousTimestamp = timestamp
      }

      const dt = Math.min((timestamp - previousTimestamp) / 1000, 0.05)
      previousTimestamp = timestamp
      const { dpr, height, width } = sizeRef.current

      context.setTransform(dpr, 0, 0, dpr, 0, 0)
      context.clearRect(0, 0, width, height)

      const padding = 18
      const chamberTop = 20
      const chamberHeight = height - 56
      const chamberWidth = (width - padding * 2) * containerRatio
      const chamberRight = padding + chamberWidth

      context.fillStyle = 'rgba(255, 255, 255, 0.04)'
      context.fillRect(padding, chamberTop, chamberWidth, chamberHeight)

      context.strokeStyle = 'rgba(131, 197, 190, 0.8)'
      context.lineWidth = 2
      context.strokeRect(padding, chamberTop, chamberWidth, chamberHeight)

      context.fillStyle = 'rgba(255, 209, 102, 0.32)'
      context.fillRect(chamberRight - 8, chamberTop - 8, 12, chamberHeight + 16)

      particlesRef.current.forEach((particle) => {
        particle.x += particle.vx * dt
        particle.y += particle.vy * dt

        if (particle.x < padding + particle.radius) {
          particle.x = padding + particle.radius
          particle.vx *= -1
        }
        if (particle.x > chamberRight - particle.radius - 10) {
          particle.x = chamberRight - particle.radius - 10
          particle.vx *= -1
        }
        if (particle.y < chamberTop + particle.radius) {
          particle.y = chamberTop + particle.radius
          particle.vy *= -1
        }
        if (particle.y > chamberTop + chamberHeight - particle.radius) {
          particle.y = chamberTop + chamberHeight - particle.radius
          particle.vy *= -1
        }

        const species = reaction.species.find((entry) => entry.id === particle.speciesId)
        if (!species) {
          return
        }

        context.beginPath()
        context.fillStyle = species.color
        context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2)
        context.fill()

        context.beginPath()
        context.fillStyle = 'rgba(255, 255, 255, 0.35)'
        context.arc(
          particle.x - particle.radius / 3,
          particle.y - particle.radius / 3,
          particle.radius / 2.5,
          0,
          Math.PI * 2,
        )
        context.fill()
      })

      flashesRef.current = flashesRef.current
        .map((flash) => ({
          ...flash,
          life: flash.life - dt * 1.8,
          radius: flash.radius + dt * 18,
        }))
        .filter((flash) => flash.life > 0)

      flashesRef.current.forEach((flash) => {
        context.beginPath()
        context.strokeStyle = `rgba(255, 209, 102, ${flash.life * 0.5})`
        context.lineWidth = 2
        context.arc(flash.x, flash.y, flash.radius, 0, Math.PI * 2)
        context.stroke()
      })

      frameId = window.requestAnimationFrame(render)
    }

    frameId = window.requestAnimationFrame(render)

    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', handleWindowResize)
      window.cancelAnimationFrame(frameId)
    }
  }, [containerRatio, reaction.species])

  return (
    <section className="panel vessel-panel">
      <div className="panel-heading">
        <p className="panel-kicker">{ui.vesselKicker}</p>
        <h2>{ui.vesselTitle}</h2>
        <p>{ui.vesselSubtitle}</p>
      </div>

      <div className="vessel-stage" data-canvas-status="ready" ref={stageRef}>
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
          <span className="vessel-badge">
            {ui.vesselTemp}: {temperature} K
          </span>
          <span className="vessel-badge">
            {ui.vesselVolume}: {formatNumber(volume, language, 2)} L
          </span>
        </div>
      </div>

      <div className="molecule-legend">
        {reaction.species.map((species) => (
          <div className="legend-chip" key={species.id}>
            <span className="species-swatch" style={{ backgroundColor: species.color }} />
            <div>
              <strong>{species.formula}</strong>
              <small>{getLocalizedText(species.label, language)}</small>
            </div>
            <span>
              {formatNumber(concentrations[species.id] ?? 0, language, 2)} M
              {' / '}
              {formatNumber(equilibrium[species.id] ?? 0, language, 2)} M
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}

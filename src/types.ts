export type Language = 'ja' | 'en'
export type Theme = 'light' | 'dark'
export type ReactionDirection = 'forward' | 'reverse' | 'balanced'
export type SpeedOption = 0.5 | 1 | 2 | 4
export type SpeciesRole = 'reactant' | 'product'
export type SpeciesPhase = 'gas' | 'liquid'

export interface LocalizedText {
  ja: string
  en: string
}

export interface SpeciesDefinition {
  id: string
  formula: string
  label: LocalizedText
  color: string
  role: SpeciesRole
  stoich: number
  phase: SpeciesPhase
}

export type ConcentrationMap = Record<string, number>

export interface ReactionDefinition {
  id: string
  title: LocalizedText
  note: LocalizedText
  equation: string
  species: SpeciesDefinition[]
  referenceTemperature: number
  defaultTemperature: number
  temperatureRange: [number, number]
  defaultVolume: number
  volumeRange: [number, number]
  kfBase: number
  krBase: number
  activationEnergy: number
  deltaH: number
  catalystMultiplier: number
  pressureSensitive: boolean
  initialConcentrations: ConcentrationMap
}

export interface HistoryPoint {
  time: number
  concentrations: ConcentrationMap
  equilibrium: ConcentrationMap
  k: number
  q: number
}

export interface SimulationEvent {
  id: number
  time: number
  type: 'inject' | 'remove' | 'temperature' | 'volume' | 'catalyst' | 'reset'
  speciesId?: string
  amount?: number
  metadata?: Record<string, boolean | number | string>
}

export interface SimulationSnapshot {
  equilibrium: ConcentrationMap
  k: number
  q: number
  forwardRate: number
  reverseRate: number
  direction: ReactionDirection
}

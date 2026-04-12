import type {
  ConcentrationMap,
  ReactionDefinition,
  ReactionDirection,
  SimulationEvent,
  SimulationSnapshot,
} from '../types'

const EPSILON = 1e-8
const GAS_CONSTANT = 8.314

function stoichiometricSign(reaction: ReactionDefinition, speciesId: string): number {
  const species = reaction.species.find((entry) => entry.id === speciesId)
  if (!species) {
    return 0
  }

  return species.role === 'product' ? species.stoich : -species.stoich
}

function cloneMap(values: ConcentrationMap): ConcentrationMap {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, value]),
  ) as ConcentrationMap
}

function getLogReactionQuotient(
  reaction: ReactionDefinition,
  concentrations: ConcentrationMap,
): number {
  return reaction.species.reduce((total, species) => {
    const signedStoich = species.role === 'product' ? species.stoich : -species.stoich
    return total + signedStoich * Math.log(Math.max(concentrations[species.id] ?? 0, EPSILON))
  }, 0)
}

function concentrationsAtExtent(
  reaction: ReactionDefinition,
  concentrations: ConcentrationMap,
  extent: number,
): ConcentrationMap {
  const nextConcentrations = cloneMap(concentrations)

  reaction.species.forEach((species) => {
    const signedStoich = species.role === 'product' ? species.stoich : -species.stoich
    nextConcentrations[species.id] = Math.max(
      0,
      (concentrations[species.id] ?? 0) + signedStoich * extent,
    )
  })

  return nextConcentrations
}

export function limitList<T>(items: T[], maxLength: number): T[] {
  if (items.length <= maxLength) {
    return items
  }

  return items.slice(items.length - maxLength)
}

export function createInitialConcentrations(
  reaction: ReactionDefinition,
  overrides: ConcentrationMap = reaction.initialConcentrations,
): ConcentrationMap {
  return reaction.species.reduce<ConcentrationMap>((accumulator, species) => {
    accumulator[species.id] = Math.max(0, overrides[species.id] ?? 0)
    return accumulator
  }, {})
}

export function getEquilibriumConstant(
  reaction: ReactionDefinition,
  temperature: number,
): number {
  const kReference = reaction.kfBase / reaction.krBase
  return (
    kReference *
    Math.exp(
      (-reaction.deltaH / GAS_CONSTANT) *
        (1 / temperature - 1 / reaction.referenceTemperature),
    )
  )
}

export function getReactionQuotient(
  reaction: ReactionDefinition,
  concentrations: ConcentrationMap,
): number {
  return Math.exp(getLogReactionQuotient(reaction, concentrations))
}

function getRateConstants(
  reaction: ReactionDefinition,
  temperature: number,
  catalyst: boolean,
): { k: number; kf: number; kr: number } {
  const thermalFactor = Math.exp(
    (-reaction.activationEnergy / GAS_CONSTANT) *
      (1 / temperature - 1 / reaction.referenceTemperature),
  )
  const catalystFactor = catalyst ? reaction.catalystMultiplier : 1
  const kf = reaction.kfBase * thermalFactor * catalystFactor
  const k = getEquilibriumConstant(reaction, temperature)
  const kr = kf / Math.max(k, EPSILON)

  return { k, kf, kr }
}

function getRates(
  reaction: ReactionDefinition,
  concentrations: ConcentrationMap,
  temperature: number,
  catalyst: boolean,
): {
  direction: ReactionDirection
  forwardRate: number
  k: number
  netRate: number
  q: number
  reverseRate: number
} {
  const { k, kf, kr } = getRateConstants(reaction, temperature, catalyst)
  const q = getReactionQuotient(reaction, concentrations)

  let forwardRate = kf
  let reverseRate = kr

  reaction.species.forEach((species) => {
    const concentration = Math.max(concentrations[species.id] ?? 0, EPSILON)

    if (species.role === 'reactant') {
      forwardRate *= concentration ** species.stoich
    } else {
      reverseRate *= concentration ** species.stoich
    }
  })

  const netRate = forwardRate - reverseRate
  const direction = getDirection(q, k)

  return {
    direction,
    forwardRate,
    k,
    netRate,
    q,
    reverseRate,
  }
}

export function getDirection(q: number, k: number): ReactionDirection {
  const relativeGap = Math.abs(q - k) / Math.max(k, EPSILON)
  if (relativeGap < 0.04) {
    return 'balanced'
  }

  return q < k ? 'forward' : 'reverse'
}

export function solveEquilibrium(
  reaction: ReactionDefinition,
  concentrations: ConcentrationMap,
  temperature: number,
): ConcentrationMap {
  const logK = Math.log(Math.max(getEquilibriumConstant(reaction, temperature), EPSILON))
  let lowerBound = -Infinity
  let upperBound = Infinity

  reaction.species.forEach((species) => {
    const concentration = Math.max(concentrations[species.id] ?? 0, 0)
    const signedStoich = species.role === 'product' ? species.stoich : -species.stoich

    if (signedStoich > 0) {
      lowerBound = Math.max(lowerBound, -concentration / signedStoich)
    } else if (signedStoich < 0) {
      upperBound = Math.min(upperBound, concentration / -signedStoich)
    }
  })

  if (!Number.isFinite(lowerBound)) {
    lowerBound = -8
  }
  if (!Number.isFinite(upperBound)) {
    upperBound = 8
  }

  lowerBound += 1e-6
  upperBound -= 1e-6

  if (lowerBound > upperBound) {
    return cloneMap(concentrations)
  }

  const evaluate = (extent: number) =>
    getLogReactionQuotient(
      reaction,
      concentrationsAtExtent(reaction, concentrations, extent),
    ) - logK

  const lowValue = evaluate(lowerBound)
  const highValue = evaluate(upperBound)

  if (lowValue > 0 && highValue > 0) {
    return concentrationsAtExtent(reaction, concentrations, lowerBound)
  }

  if (lowValue < 0 && highValue < 0) {
    return concentrationsAtExtent(reaction, concentrations, upperBound)
  }

  let left = lowerBound
  let right = upperBound

  for (let iteration = 0; iteration < 72; iteration += 1) {
    const midpoint = (left + right) / 2
    const value = evaluate(midpoint)

    if (Math.abs(value) < 1e-6) {
      return concentrationsAtExtent(reaction, concentrations, midpoint)
    }

    if (value > 0) {
      right = midpoint
    } else {
      left = midpoint
    }
  }

  return concentrationsAtExtent(reaction, concentrations, (left + right) / 2)
}

export function getSimulationSnapshot({
  reaction,
  concentrations,
  temperature,
  volume,
  catalyst,
}: {
  reaction: ReactionDefinition
  concentrations: ConcentrationMap
  temperature: number
  volume: number
  catalyst: boolean
}): SimulationSnapshot {
  const { direction, forwardRate, k, q, reverseRate } = getRates(
    reaction,
    concentrations,
    temperature,
    catalyst,
  )

  return {
    equilibrium: solveEquilibrium(reaction, concentrations, temperature),
    k,
    q,
    forwardRate: forwardRate / Math.max(volume, 0.1),
    reverseRate: reverseRate / Math.max(volume, 0.1),
    direction,
  }
}

export function stepConcentrations({
  reaction,
  concentrations,
  temperature,
  catalyst,
  dt,
}: {
  reaction: ReactionDefinition
  concentrations: ConcentrationMap
  temperature: number
  catalyst: boolean
  dt: number
}): ConcentrationMap {
  const { netRate } = getRates(reaction, concentrations, temperature, catalyst)
  const nextConcentrations = cloneMap(concentrations)

  reaction.species.forEach((species) => {
    const nextValue =
      (concentrations[species.id] ?? 0) + stoichiometricSign(reaction, species.id) * netRate * dt
    nextConcentrations[species.id] = Math.max(0, nextValue)
  })

  return nextConcentrations
}

export function applyVolumeScaling(
  reaction: ReactionDefinition,
  concentrations: ConcentrationMap,
  previousVolume: number,
  nextVolume: number,
): ConcentrationMap {
  if (!reaction.pressureSensitive) {
    return cloneMap(concentrations)
  }

  const scale = previousVolume / nextVolume
  const nextConcentrations = cloneMap(concentrations)

  reaction.species.forEach((species) => {
    if (species.phase === 'gas') {
      nextConcentrations[species.id] = Math.max(
        0,
        (concentrations[species.id] ?? 0) * scale,
      )
    }
  })

  return nextConcentrations
}

export function getPredictedShift(
  reaction: ReactionDefinition,
  event: SimulationEvent,
): ReactionDirection {
  switch (event.type) {
    case 'inject': {
      const species = reaction.species.find((entry) => entry.id === event.speciesId)
      if (!species) {
        return 'balanced'
      }

      return species.role === 'reactant' ? 'forward' : 'reverse'
    }
    case 'remove': {
      const species = reaction.species.find((entry) => entry.id === event.speciesId)
      if (!species) {
        return 'balanced'
      }

      return species.role === 'product' ? 'forward' : 'reverse'
    }
    case 'temperature': {
      const from = Number(event.metadata?.from ?? 0)
      const to = Number(event.metadata?.to ?? 0)
      if (from === to) {
        return 'balanced'
      }

      const warming = to > from
      if (Math.abs(reaction.deltaH) < 1) {
        return 'balanced'
      }

      if (reaction.deltaH > 0) {
        return warming ? 'forward' : 'reverse'
      }

      return warming ? 'reverse' : 'forward'
    }
    case 'volume': {
      if (!reaction.pressureSensitive) {
        return 'balanced'
      }

      const gasReactants = reaction.species
        .filter((species) => species.phase === 'gas' && species.role === 'reactant')
        .reduce((total, species) => total + species.stoich, 0)
      const gasProducts = reaction.species
        .filter((species) => species.phase === 'gas' && species.role === 'product')
        .reduce((total, species) => total + species.stoich, 0)

      if (gasReactants === gasProducts) {
        return 'balanced'
      }

      const compressed = Number(event.metadata?.to ?? 1) < Number(event.metadata?.from ?? 1)
      const productsFavouredWhenCompressed = gasProducts < gasReactants

      if (compressed) {
        return productsFavouredWhenCompressed ? 'forward' : 'reverse'
      }

      return productsFavouredWhenCompressed ? 'reverse' : 'forward'
    }
    case 'catalyst':
      return 'balanced'
    case 'reset':
    default:
      return 'balanced'
  }
}

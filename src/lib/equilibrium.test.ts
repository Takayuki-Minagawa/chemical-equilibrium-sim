import { describe, expect, it } from 'vitest'
import { reactions } from '../data/reactions'
import {
  createInitialConcentrations,
  getDirection,
  getEquilibriumConstant,
  getReactionQuotient,
  solveEquilibrium,
  stepConcentrations,
} from './equilibrium'

describe('equilibrium helpers', () => {
  it('decreases K when an exothermic reaction is heated', () => {
    const reaction = reactions.find((entry) => entry.id === 'haber-bosch')!

    const coldK = getEquilibriumConstant(reaction, 500)
    const hotK = getEquilibriumConstant(reaction, 800)

    expect(hotK).toBeLessThan(coldK)
  })

  it('returns balanced when Q is close enough to K', () => {
    expect(getDirection(1.03, 1)).toBe('balanced')
    expect(getDirection(0.95, 1)).toBe('forward')
    expect(getDirection(1.07, 1)).toBe('reverse')
  })

  it('never produces negative concentrations during a step', () => {
    const reaction = reactions.find((entry) => entry.id === 'nitrogen-dioxide')!
    const next = stepConcentrations({
      reaction,
      concentrations: {
        no2: 0,
        n2o4: 0.2,
      },
      temperature: reaction.defaultTemperature,
      catalyst: false,
      dt: 5,
    })

    expect(next.no2).toBeGreaterThanOrEqual(0)
    expect(next.n2o4).toBeGreaterThanOrEqual(0)
  })

  it('solves an equilibrium state whose Q is close to K', () => {
    const reaction = reactions.find((entry) => entry.id === 'hydrogen-iodine')!
    const initial = createInitialConcentrations(reaction)
    const equilibrium = solveEquilibrium(reaction, initial, reaction.defaultTemperature)
    const q = getReactionQuotient(reaction, equilibrium)
    const k = getEquilibriumConstant(reaction, reaction.defaultTemperature)

    expect(Math.abs(q - k) / k).toBeLessThan(0.001)
  })
})

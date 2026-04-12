import { describe, expect, it } from 'vitest'
import { reactions } from '../data/reactions'
import { buildKExpression, describeEvent, formatNumber } from './copy'

describe('copy helpers', () => {
  it('formats numbers with locale-specific grouping', () => {
    expect(formatNumber(1234.56, 'ja', 1)).toBe('1,234.6')
    expect(formatNumber(0.375, 'en', 2)).toBe('0.38')
  })

  it('builds K expressions with stoichiometric exponents', () => {
    const reaction = reactions.find((entry) => entry.id === 'haber-bosch')!

    expect(buildKExpression(reaction)).toBe('K = [NH3]^2 / [N2][H2]^3')
  })

  it('describes events in both languages', () => {
    const reaction = reactions.find((entry) => entry.id === 'hydrogen-iodine')!
    const injectEvent = {
      id: 1,
      time: 0,
      type: 'inject' as const,
      speciesId: 'h2',
      amount: 0.5,
    }

    expect(describeEvent(injectEvent, reaction, 'ja')).toContain('H2')
    expect(describeEvent(injectEvent, reaction, 'en')).toContain('Injected H2')
  })
})

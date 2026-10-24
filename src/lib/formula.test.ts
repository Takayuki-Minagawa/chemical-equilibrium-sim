import { describe, expect, it } from 'vitest'
import { reactions } from '../data/reactions'
import { getGasMoleChange, toSubscriptText, tokenizeFormula } from './formula'
import { parseProgress } from './missions'

describe('formula helpers', () => {
  it('keeps coefficients and subscripts element counts', () => {
    expect(tokenizeFormula('2NH3')).toEqual([
      { text: '2', subscript: false },
      { text: 'NH', subscript: false },
      { text: '3', subscript: true },
    ])
    expect(toSubscriptText('+ CH3COOC2H5')).toBe('+ CH₃COOC₂H₅')
    expect(toSubscriptText('T 650->700')).toBe('T 650->700')
  })

  it('computes the gas mole change across a reaction', () => {
    const haber = reactions.find((entry) => entry.id === 'haber-bosch')!
    const hydrogenIodine = reactions.find((entry) => entry.id === 'hydrogen-iodine')!

    expect(getGasMoleChange(haber)).toBe(-2)
    expect(getGasMoleChange(hydrogenIodine)).toBe(0)
  })
})

describe('mission progress parsing', () => {
  it('falls back safely on missing or malformed storage', () => {
    expect(parseProgress(null, 'a')).toEqual({ completed: [], visited: ['a'] })
    expect(parseProgress('{not json', 'a')).toEqual({ completed: [], visited: ['a'] })
  })

  it('drops unknown mission ids and duplicates', () => {
    const parsed = parseProgress(
      JSON.stringify({ completed: ['heat', 'heat', 'bogus', 3], visited: ['b', 'a'] }),
      'a',
    )

    expect(parsed).toEqual({ completed: ['heat'], visited: ['a', 'b'] })
  })

  it('ignores visited reaction ids that no longer exist', () => {
    const parsed = parseProgress(JSON.stringify({ visited: ['a', 'removed'] }), 'a', ['a', 'b'])

    expect(parsed.visited).toEqual(['a'])
  })
})

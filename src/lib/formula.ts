import type { ReactionDefinition, SpeciesDefinition } from '../types'

export interface FormulaToken {
  text: string
  subscript: boolean
}

const SUBSCRIPT_DIGITS = '₀₁₂₃₄₅₆₇₈₉'

/**
 * Splits a formula such as "2NH3" into tokens, marking digits that follow an
 * element symbol or a closing bracket as subscripts. Leading digits are kept as
 * stoichiometric coefficients.
 */
export function tokenizeFormula(value: string): FormulaToken[] {
  const tokens: FormulaToken[] = []
  let previousChar = ''

  value
    .split(/(\d+)/)
    .filter(Boolean)
    .forEach((text) => {
      const subscript = /^\d+$/.test(text) && /[A-Za-z)\]]/.test(previousChar)
      tokens.push({ text, subscript })
      previousChar = text[text.length - 1]
    })

  return tokens
}

/** Plain-text version with Unicode subscripts, for SVG labels and similar. */
export function toSubscriptText(value: string): string {
  return tokenizeFormula(value)
    .map((token) =>
      token.subscript
        ? token.text.replace(/\d/g, (digit) => SUBSCRIPT_DIGITS[Number(digit)])
        : token.text,
    )
    .join('')
}

export function getReactionSides(reaction: ReactionDefinition): {
  products: SpeciesDefinition[]
  reactants: SpeciesDefinition[]
} {
  return {
    reactants: reaction.species.filter((species) => species.role === 'reactant'),
    products: reaction.species.filter((species) => species.role === 'product'),
  }
}

export function getGasMoleChange(reaction: ReactionDefinition): number {
  return reaction.species
    .filter((species) => species.phase === 'gas')
    .reduce(
      (total, species) =>
        total + (species.role === 'product' ? species.stoich : -species.stoich),
      0,
    )
}

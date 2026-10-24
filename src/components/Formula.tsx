import { Fragment, type CSSProperties, type ReactNode } from 'react'
import { buildKExpression } from '../lib/copy'
import { getReactionSides, tokenizeFormula } from '../lib/formula'
import type { ReactionDefinition, SpeciesDefinition } from '../types'

export function Formula({ value }: { value: string }) {
  return (
    <span className="formula">
      {tokenizeFormula(value).map((token, index) =>
        token.subscript ? (
          <sub key={index}>{token.text}</sub>
        ) : (
          <Fragment key={index}>{token.text}</Fragment>
        ),
      )}
    </span>
  )
}

function EquationTerm({ species }: { species: SpeciesDefinition }) {
  return (
    <span className="equation-term" style={{ '--species-color': species.color } as CSSProperties}>
      {species.stoich > 1 ? <span className="equation-coefficient">{species.stoich}</span> : null}
      <Formula value={species.formula} />
    </span>
  )
}

function EquationSide({ species }: { species: SpeciesDefinition[] }) {
  return (
    <span className="equation-side">
      {species.map((entry, index) => (
        <Fragment key={entry.id}>
          {index > 0 ? <span className="equation-plus">+</span> : null}
          <EquationTerm species={entry} />
        </Fragment>
      ))}
    </span>
  )
}

interface EquationProps {
  reaction: ReactionDefinition
  arrow?: ReactNode
  className?: string
}

/** Renders a reaction equation with subscripts and colour-coded species. */
export function Equation({ reaction, arrow, className }: EquationProps) {
  const { products, reactants } = getReactionSides(reaction)

  return (
    <span className={`equation ${className ?? ''}`}>
      <span className="sr-only">{reaction.equation.replace('<=>', '⇌')}</span>
      <span aria-hidden="true" className="equation-visual">
        <EquationSide species={reactants} />
        {arrow ?? <span className="equation-arrow">⇌</span>}
        <EquationSide species={products} />
      </span>
    </span>
  )
}

function KTerm({ species }: { species: SpeciesDefinition }) {
  return (
    <span className="k-term">
      [<Formula value={species.formula} />]
      {species.stoich > 1 ? <sup>{species.stoich}</sup> : null}
    </span>
  )
}

/** Equilibrium-constant expression laid out as a fraction. */
export function KFraction({ reaction }: { reaction: ReactionDefinition }) {
  const { products, reactants } = getReactionSides(reaction)

  return (
    <span className="k-fraction">
      <span className="sr-only">{buildKExpression(reaction)}</span>
      <span aria-hidden="true" className="k-fraction-visual">
        <span className="k-label">K =</span>
        <span className="fraction">
          <span className="fraction-top">
            {products.map((species) => (
              <KTerm key={species.id} species={species} />
            ))}
          </span>
          <span className="fraction-bottom">
            {reactants.map((species) => (
              <KTerm key={species.id} species={species} />
            ))}
          </span>
        </span>
      </span>
    </span>
  )
}

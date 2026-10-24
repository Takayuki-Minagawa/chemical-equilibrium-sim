import type { CSSProperties } from 'react'
import { getLocalizedText, uiText } from '../lib/copy'
import { getGasMoleChange } from '../lib/formula'
import type { Language, ReactionDefinition } from '../types'
import { Equation } from './Formula'
import { Icon } from './Icon'

interface ReactionPickerProps {
  activeId: string
  language: Language
  onSelect: (reactionId: string) => void
  reactions: ReactionDefinition[]
  visited: string[]
}

function getTags(reaction: ReactionDefinition, language: Language): string[] {
  const ui = uiText[language]
  const allGas = reaction.species.every((species) => species.phase === 'gas')
  const tags: string[] = [allGas ? ui.tagGas : ui.tagLiquid]
  tags.push(reaction.deltaH < 0 ? ui.tagExothermic : ui.tagEndothermic)

  if (reaction.pressureSensitive) {
    tags.push(getGasMoleChange(reaction) === 0 ? ui.tagPressureNeutral : ui.tagPressure)
  }

  return tags
}

export function ReactionPicker({
  activeId,
  language,
  onSelect,
  reactions,
  visited,
}: ReactionPickerProps) {
  const ui = uiText[language]

  return (
    <div aria-label={ui.reactionPickerLabel} className="reaction-picker" role="group">
      {reactions.map((reaction, index) => {
        const active = reaction.id === activeId
        const tried = visited.includes(reaction.id)

        return (
          <button
            aria-pressed={active}
            className={`reaction-card ${active ? 'is-active' : ''}`}
            key={reaction.id}
            onClick={() => onSelect(reaction.id)}
            style={{ '--card-index': index } as CSSProperties}
            type="button"
          >
            <span aria-hidden="true" className="reaction-card-top">
              <span className="reaction-card-dots">
                {reaction.species.map((species) => (
                  <span
                    className="reaction-card-dot"
                    key={species.id}
                    style={{ backgroundColor: species.color }}
                  />
                ))}
              </span>
              {tried ? (
                <span className="reaction-card-check">
                  <Icon name="check" size={14} />
                </span>
              ) : null}
            </span>
            <Equation className="reaction-card-equation" reaction={reaction} />
            <span className="reaction-card-title">{getLocalizedText(reaction.title, language)}</span>
            <span className="reaction-card-tags">
              {getTags(reaction, language).map((tag) => (
                <span className="tag" key={tag}>
                  {tag}
                </span>
              ))}
            </span>
          </button>
        )
      })}
    </div>
  )
}

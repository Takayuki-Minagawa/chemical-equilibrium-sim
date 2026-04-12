import { useMemo, useState } from 'react'
import {
  buildKExpression,
  describeDirection,
  describeEvent,
  uiText,
} from '../lib/copy'
import { getPredictedShift } from '../lib/equilibrium'
import type {
  Language,
  ReactionDefinition,
  ReactionDirection,
  SimulationEvent,
  SimulationSnapshot,
} from '../types'

interface LearningPanelProps {
  catalyst: boolean
  language: Language
  lastEvent?: SimulationEvent
  predictedShift: ReactionDirection
  reaction: ReactionDefinition
  snapshot: SimulationSnapshot
  temperature: number
  volume: number
}

interface QuizItem {
  explanation: string
  id: string
  options: Array<{ id: string; label: string }>
  prompt: string
  correct: string
}

function buildQuizItems(
  language: Language,
  reaction: ReactionDefinition,
  lastEvent: SimulationEvent | undefined,
  currentDirection: ReactionDirection,
): QuizItem[] {
  const ui = uiText[language]
  const predicted = lastEvent ? getPredictedShift(reaction, lastEvent) : currentDirection
  const directionOptions = [
    { id: 'forward', label: ui.productsSide },
    { id: 'reverse', label: ui.reactantsSide },
    { id: 'balanced', label: ui.noShift },
  ]

  return [
    {
      id: 'context',
      prompt: ui.quizPromptContext,
      options: directionOptions,
      correct: predicted,
      explanation:
        language === 'ja'
          ? `直近の操作 ${lastEvent ? describeEvent(lastEvent, reaction, language) : 'なし'} に対する予測です。`
          : `Prediction based on the latest operation: ${lastEvent ? describeEvent(lastEvent, reaction, language) : 'none'}.`,
    },
    {
      id: 'k-factor',
      prompt: ui.quizPromptK,
      options: [
        { id: 'temperature', label: ui.quizTemperature },
        { id: 'concentration', label: ui.quizConcentration },
        { id: 'catalyst', label: ui.catalyst },
      ],
      correct: 'temperature',
      explanation:
        language === 'ja'
          ? '濃度や触媒は平衡位置の到達経路を変えても、温度以外は K を変えません。'
          : 'Concentration and catalysts can change the path to equilibrium, but only temperature changes K.',
    },
    {
      id: 'catalyst',
      prompt: ui.quizPromptCatalyst,
      options: [
        { id: 'speed', label: ui.quizCatalystOnly },
        { id: 'k-only', label: ui.quizCatalystWrong1 },
        { id: 'composition', label: ui.quizCatalystWrong2 },
      ],
      correct: 'speed',
      explanation:
        language === 'ja'
          ? '触媒は正反応・逆反応の両方を速めるので、平衡位置ではなく到達時間だけを変えます。'
          : 'A catalyst speeds up both forward and reverse reactions, so it changes the time to equilibrium, not its position.',
    },
    {
      id: 'thermal',
      prompt: ui.quizPromptThermal,
      options: directionOptions,
      correct: reaction.deltaH > 0 ? 'forward' : 'reverse',
      explanation:
        reaction.deltaH > 0
          ? language === 'ja'
            ? 'このモデルでは吸熱反応として扱うので、加熱すると生成物側が有利になります。'
            : 'This model treats the reaction as endothermic, so heating favours the product side.'
          : language === 'ja'
            ? 'このモデルでは発熱反応として扱うので、加熱すると反応物側が有利になります。'
            : 'This model treats the reaction as exothermic, so heating favours the reactant side.',
    },
  ]
}

export function LearningPanel({
  catalyst,
  language,
  lastEvent,
  predictedShift,
  reaction,
  snapshot,
}: LearningPanelProps) {
  const ui = uiText[language]
  const [answers, setAnswers] = useState<Record<string, string>>({})

  const quizItems = useMemo(
    () => buildQuizItems(language, reaction, lastEvent, snapshot.direction),
    [language, lastEvent, reaction, snapshot.direction],
  )

  const operationInsight = (() => {
    if (!lastEvent) {
      return language === 'ja'
        ? 'まだ外部操作がないので、いま見えている移動方向は現在の Q と K の差から決まります。'
        : 'No external operation has been applied yet, so the current drift is set only by the gap between Q and K.'
    }

    const eventText = describeEvent(lastEvent, reaction, language)
    const predictedText = describeDirection(language, predictedShift)
    const actualText = describeDirection(language, snapshot.direction)

    return language === 'ja'
      ? `${eventText} の直後は ${predictedText} が予測されます。現在の速度式でも ${actualText} が示されています。`
      : `Right after ${eventText}, the predicted shift is ${predictedText}. The current rate-law state also indicates ${actualText}.`
  })()

  const pressureInsight = reaction.pressureSensitive
    ? reaction.species
        .filter((species) => species.phase === 'gas' && species.role === 'reactant')
        .reduce((total, species) => total + species.stoich, 0) ===
      reaction.species
        .filter((species) => species.phase === 'gas' && species.role === 'product')
        .reduce((total, species) => total + species.stoich, 0)
      ? ui.noteCompressionNeutral
      : ui.noteCompressionActive
    : undefined

  const thermalInsight =
    reaction.deltaH > 0 ? ui.noteTemperatureEndothermic : ui.noteTemperatureExothermic

  return (
    <section className="panel learning-panel">
      <div className="panel-heading">
        <p className="panel-kicker">{ui.learningKicker}</p>
        <h2>{ui.learningTitle}</h2>
        <p>{ui.learningSubtitle}</p>
      </div>

      <div className="learning-grid">
        <div className="insight-stack">
          <article className="insight-card">
            <h3>{ui.insightNow}</h3>
            <p>
              {language === 'ja'
                ? `今は Q と K の比較から ${describeDirection(language, snapshot.direction)} へ移りやすい状態です。正反応速度と逆反応速度が近づくと平衡付近になります。`
                : `The current comparison of Q and K indicates ${describeDirection(language, snapshot.direction)}. As forward and reverse rates converge, the system approaches equilibrium.`}
            </p>
          </article>

          <article className="insight-card">
            <h3>{ui.insightOperation}</h3>
            <p>{operationInsight}</p>
          </article>

          <article className="insight-card">
            <h3>{ui.insightFormula}</h3>
            <div className="formula-box">{buildKExpression(reaction)}</div>
            <p>
              {language === 'ja'
                ? `このモデルでは K は温度だけで変わります。現在、触媒は ${catalyst ? '有効' : '無効'} ですが、K そのものは変えません。`
                : `In this model, only temperature changes K. The catalyst is currently ${catalyst ? 'on' : 'off'}, but it does not alter K itself.`}
            </p>
          </article>

          {pressureInsight ? (
            <article className="insight-card">
              <h3>{ui.pressureLabel}</h3>
              <p>{pressureInsight}</p>
            </article>
          ) : null}

          <article className="insight-card">
            <h3>{ui.changesK}</h3>
            <p>{thermalInsight}</p>
          </article>
        </div>

        <div className="quiz-stack">
          <h3>{ui.quizTitle}</h3>
          {quizItems.map((item) => {
            const selected = answers[item.id]
            const correct = selected === item.correct

            return (
              <article className="quiz-card" key={item.id}>
                <p className="quiz-prompt">{item.prompt}</p>
                <div className="quiz-options">
                  {item.options.map((option) => (
                    <button
                      className={`quiz-option ${selected === option.id ? 'is-selected' : ''}`}
                      key={option.id}
                      onClick={() =>
                        setAnswers((previous) => ({
                          ...previous,
                          [item.id]: option.id,
                        }))
                      }
                      type="button"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                {selected ? (
                  <p className={`answer-state ${correct ? 'is-correct' : 'is-incorrect'}`}>
                    <strong>{correct ? ui.quizCorrect : ui.quizIncorrect}</strong>
                    {' - '}
                    {item.explanation}
                  </p>
                ) : null}
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}

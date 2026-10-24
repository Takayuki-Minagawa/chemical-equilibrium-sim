import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { describeDirection, describeEvent, uiText } from '../lib/copy'
import { getPredictedShift } from '../lib/equilibrium'
import { KFraction } from './Formula'
import { Icon, type IconName } from './Icon'
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
  onQuizComplete: () => void
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
  onQuizComplete,
  predictedShift,
  reaction,
  snapshot,
}: LearningPanelProps) {
  const ui = uiText[language]
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [announcement, setAnnouncement] = useState('')
  const quizCompletedRef = useRef(false)

  const quizItems = useMemo(
    () => buildQuizItems(language, reaction, lastEvent, snapshot.direction),
    [language, lastEvent, reaction, snapshot.direction],
  )
  const correctCount = quizItems.filter((item) => answers[item.id] === item.correct).length
  const allCorrect = correctCount === quizItems.length

  // Q1's correct answer can follow the live direction, so the quiz may become
  // all-correct without a click; award the mission whenever that happens.
  useEffect(() => {
    if (allCorrect && !quizCompletedRef.current) {
      quizCompletedRef.current = true
      onQuizComplete()
    }
  }, [allCorrect, onQuizComplete])

  const handleAnswer = (itemId: string, optionId: string) => {
    const item = quizItems.find((entry) => entry.id === itemId)
    const nextAnswers = { ...answers, [itemId]: optionId }
    setAnswers(nextAnswers)

    if (item) {
      const isCorrect = optionId === item.correct
      const solvedAll = quizItems.every((entry) => nextAnswers[entry.id] === entry.correct)
      setAnnouncement(
        `${isCorrect ? ui.quizCorrect : ui.quizIncorrect}: ${item.explanation}${solvedAll ? ` ${ui.quizAllCorrect}` : ''}`,
      )
    }
  }

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

  const insights: Array<{ body: ReactNode; icon: IconName; id: string; title: string }> = [
    {
      id: 'now',
      icon: 'target',
      title: ui.insightNow,
      body: (
        <p>
          {language === 'ja'
            ? `今は Q と K の比較から ${describeDirection(language, snapshot.direction)} へ移りやすい状態です。正反応速度と逆反応速度が近づくと平衡付近になります。`
            : `The current comparison of Q and K indicates ${describeDirection(language, snapshot.direction)}. As forward and reverse rates converge, the system approaches equilibrium.`}
        </p>
      ),
    },
    {
      id: 'operation',
      icon: 'bulb',
      title: ui.insightOperation,
      body: <p>{operationInsight}</p>,
    },
    {
      id: 'formula',
      icon: 'scale',
      title: ui.insightFormula,
      body: (
        <>
          <div className="formula-box">
            <KFraction reaction={reaction} />
          </div>
          <p>
            {language === 'ja'
              ? `このモデルでは K は温度だけで変わります。現在、触媒は ${catalyst ? '有効' : '無効'} ですが、K そのものは変えません。`
              : `In this model, only temperature changes K. The catalyst is currently ${catalyst ? 'on' : 'off'}, but it does not alter K itself.`}
          </p>
        </>
      ),
    },
    ...(pressureInsight
      ? [
          {
            id: 'pressure',
            icon: 'compress' as const,
            title: ui.pressureLabel,
            body: <p>{pressureInsight}</p>,
          },
        ]
      : []),
    {
      id: 'thermal',
      icon: 'thermometer',
      title: ui.changesK,
      body: <p>{thermalInsight}</p>,
    },
  ]

  return (
    <section aria-labelledby="learning-title" className="panel learning-panel">
      <div className="panel-heading">
        <p className="panel-kicker">{ui.learningKicker}</p>
        <h2 id="learning-title">{ui.learningTitle}</h2>
        <p>{ui.learningSubtitle}</p>
      </div>

      <div className="learning-grid">
        <div className="insight-stack">
          {insights.map((insight) => (
            <article className="insight-card" key={insight.id}>
              <h3>
                <span className="insight-icon">
                  <Icon name={insight.icon} size={16} />
                </span>
                {insight.title}
              </h3>
              {insight.body}
            </article>
          ))}
        </div>

        <div className={`quiz-stack ${allCorrect ? 'is-complete' : ''}`}>
          <div className="quiz-header">
            <h3>
              <Icon name="trophy" size={18} />
              {ui.quizTitle}
            </h3>
            <span className="quiz-score">
              {ui.quizProgress} <strong>{correctCount}</strong> / {quizItems.length}
            </span>
          </div>
          <div
            aria-hidden="true"
            className="quiz-progress"
          >
            {quizItems.map((item) => {
              const selected = answers[item.id]
              const state = !selected ? '' : selected === item.correct ? 'is-correct' : 'is-incorrect'
              return <span className={`quiz-progress-step ${state}`} key={item.id} />
            })}
          </div>
          <p aria-live="polite" className="sr-only">
            {announcement}
          </p>
          {allCorrect ? (
            <p className="quiz-celebration">
              <Icon name="sparkle" size={18} />
              {ui.quizAllCorrect}
            </p>
          ) : null}

          {quizItems.map((item, index) => {
            const selected = answers[item.id]
            const correct = selected === item.correct

            return (
              <article
                className={`quiz-card ${selected ? (correct ? 'is-correct' : 'is-incorrect') : ''}`}
                key={item.id}
              >
                <p className="quiz-prompt">
                  <span className="quiz-number">Q{index + 1}</span>
                  {item.prompt}
                </p>
                <div className="quiz-options">
                  {item.options.map((option) => {
                    const isSelected = selected === option.id
                    const stateClass = isSelected ? (correct ? 'is-correct' : 'is-incorrect') : ''

                    return (
                      <button
                        aria-pressed={isSelected}
                        className={`quiz-option ${isSelected ? 'is-selected' : ''} ${stateClass}`}
                        key={option.id}
                        onClick={() => handleAnswer(item.id, option.id)}
                        type="button"
                      >
                        {isSelected ? <Icon name={correct ? 'check' : 'close'} size={15} /> : null}
                        {option.label}
                      </button>
                    )
                  })}
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

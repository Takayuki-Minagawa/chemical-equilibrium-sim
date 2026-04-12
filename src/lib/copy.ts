import type {
  Language,
  LocalizedText,
  ReactionDefinition,
  ReactionDirection,
  SimulationEvent,
} from '../types'

export const uiText = {
  ja: {
    heroKicker: 'Equilibrium Lab',
    appTitle: '化学平衡・ルシャトリエ シミュレーター',
    appSubtitle:
      '濃度・圧力・温度の操作に対して、粒子運動と濃度グラフがどう応答するかを同時に追跡します。',
    reactionHighlights: '反応ハイライト',
    controlKicker: 'Control Deck',
    controlsTitle: '操作パネル',
    controlsSubtitle: '反応条件を変更し、平衡が新しい位置へ移る様子を観察します。',
    statusKicker: 'State Readout',
    statusTitle: '状態サマリー',
    statusSubtitle: '現在の Q と K、速度バランス、直近の操作をまとめています。',
    vesselKicker: 'Molecular View',
    vesselTitle: '容器ビュー',
    vesselSubtitle: '粒子数は定性表現ですが、反応・圧縮・注入の雰囲気を視覚化します。',
    graphKicker: 'Time Series',
    graphTitle: '濃度-時間グラフ',
    graphSubtitle: '実際の濃度変化は速度式で計算し、現在の平衡値を破線で示します。',
    learningKicker: 'Explain & Quiz',
    learningTitle: '学習パネル',
    learningSubtitle: 'ルシャトリエの予測、K の見方、誤解しやすい点をすぐ確認できます。',
    reaction: '反応',
    language: '言語',
    theme: 'テーマ',
    light: 'ライト',
    dark: 'ダーク',
    playback: '再生',
    play: '再生',
    pause: '停止',
    speed: '速度',
    temperature: '温度',
    volume: '体積',
    catalyst: '触媒',
    catalystHint: '触媒は平衡位置ではなく、到達の速さだけを変えます。',
    apply: '適用',
    initialConditions: '初期濃度',
    currentConcentrations: '現在濃度',
    restartWithDraft: 'この初期値で再開',
    resetSimulation: '現在の初期条件でリセット',
    speciesOperation: '濃度操作',
    selectedSpecies: '対象物質',
    amount: '量',
    inject: '注入',
    remove: '除去',
    pressureLimited: 'この反応では圧力効果は主題ではありません。',
    currentDirection: '現在の移動方向',
    predictedShift: '直近操作の予測',
    operationLog: '操作履歴',
    noEvents: 'まだ操作はありません。',
    forwardRate: '正反応速度',
    reverseRate: '逆反応速度',
    vesselVolume: '容器体積',
    vesselTemp: '温度',
    targetEquilibrium: '予想到達値',
    operationMarkers: '操作点',
    quizTitle: 'クイズ',
    explanationTitle: '解説',
    insightNow: '現在の見方',
    insightOperation: '直近操作の解釈',
    insightFormula: '平衡定数の式',
    catalystOn: '触媒あり',
    catalystOff: '触媒なし',
    pressureLabel: '圧力効果',
    changesK: 'K を変える要因',
    onlyTemperature: '温度だけ',
    quizCorrect: '正解',
    quizIncorrect: '要確認',
    productsSide: '生成物側',
    reactantsSide: '反応物側',
    noShift: 'ほぼ変化しない',
    time: '時間',
    graphEmpty: '履歴を蓄積中です。',
    formulaBox: '式',
    quizPromptContext: '直近の操作のあと、平衡はどちらへ動くか。',
    quizPromptK: '平衡定数 K を変えるのはどれか。',
    quizPromptCatalyst: '触媒の役割として正しいのはどれか。',
    quizPromptThermal: 'この反応を加熱したときに有利になる向きはどれか。',
    quizTemperature: '温度変化',
    quizConcentration: '濃度操作',
    quizCatalystOnly: '到達を速める',
    quizCatalystWrong1: 'K だけを変える',
    quizCatalystWrong2: '平衡組成だけを変える',
    noteCompressionNeutral:
      'この反応は気体モル数が左右で同じなので、圧縮しても平衡位置は大きく変わりません。',
    noteCompressionActive:
      '気体モル数の少ない側が圧力上昇で有利になります。圧縮した直後はそこへ移動しやすくなります。',
    noteTemperatureExothermic:
      '発熱反応では加熱すると反応熱を打ち消す向き、つまり反応物側が有利になります。',
    noteTemperatureEndothermic:
      '吸熱反応では加熱すると熱を取り込む向き、つまり生成物側が有利になります。',
    initialValidationError:
      '少なくとも 1 つの化学種に 0 より大きい初期濃度を設定してください。',
    canvasFallback:
      'このブラウザでは粒子アニメーションを表示できません。下の凡例とグラフで状態を確認してください。',
    particleSummaryPrefix: '粒子の近似数',
  },
  en: {
    heroKicker: 'Equilibrium Lab',
    appTitle: 'Chemical Equilibrium and Le Chatelier Simulator',
    appSubtitle:
      'Track how concentration, pressure, and temperature changes move equilibrium with particles and graphs at the same time.',
    reactionHighlights: 'Reaction highlights',
    controlKicker: 'Control Deck',
    controlsTitle: 'Controls',
    controlsSubtitle: 'Change the reaction conditions and watch the system approach a new equilibrium.',
    statusKicker: 'State Readout',
    statusTitle: 'State Summary',
    statusSubtitle: 'Current Q and K, rate balance, and the latest operation are collected here.',
    vesselKicker: 'Molecular View',
    vesselTitle: 'Vessel View',
    vesselSubtitle: 'Particles are qualitative, but they reflect reaction, compression, and injection events.',
    graphKicker: 'Time Series',
    graphTitle: 'Concentration-Time Graph',
    graphSubtitle: 'Concentrations are computed from the rate law and the current equilibrium is shown as dashed guides.',
    learningKicker: 'Explain & Quiz',
    learningTitle: 'Learning Panel',
    learningSubtitle: 'Check Le Chatelier predictions, how to read K, and common misconceptions.',
    reaction: 'Reaction',
    language: 'Language',
    theme: 'Theme',
    light: 'Light',
    dark: 'Dark',
    playback: 'Playback',
    play: 'Play',
    pause: 'Pause',
    speed: 'Speed',
    temperature: 'Temperature',
    volume: 'Volume',
    catalyst: 'Catalyst',
    catalystHint: 'A catalyst changes only how fast equilibrium is reached, not its position.',
    apply: 'Apply',
    initialConditions: 'Initial concentrations',
    currentConcentrations: 'Current concentrations',
    restartWithDraft: 'Restart with these initials',
    resetSimulation: 'Reset using current initials',
    speciesOperation: 'Concentration operations',
    selectedSpecies: 'Target species',
    amount: 'Amount',
    inject: 'Inject',
    remove: 'Remove',
    pressureLimited: 'Pressure is not the main teaching point for this liquid-phase system.',
    currentDirection: 'Current shift',
    predictedShift: 'Predicted from last move',
    operationLog: 'Operation log',
    noEvents: 'No operations yet.',
    forwardRate: 'Forward rate',
    reverseRate: 'Reverse rate',
    vesselVolume: 'Vessel volume',
    vesselTemp: 'Temperature',
    targetEquilibrium: 'Projected equilibrium',
    operationMarkers: 'Operation markers',
    quizTitle: 'Quiz',
    explanationTitle: 'Explanation',
    insightNow: 'Current reading',
    insightOperation: 'Latest operation',
    insightFormula: 'Equilibrium expression',
    catalystOn: 'Catalyst on',
    catalystOff: 'Catalyst off',
    pressureLabel: 'Pressure effect',
    changesK: 'What changes K',
    onlyTemperature: 'Temperature only',
    quizCorrect: 'Correct',
    quizIncorrect: 'Check again',
    productsSide: 'Toward products',
    reactantsSide: 'Toward reactants',
    noShift: 'Almost no shift',
    time: 'Time',
    graphEmpty: 'History is still building.',
    formulaBox: 'Formula',
    quizPromptContext: 'After the latest operation, which side should equilibrium favour?',
    quizPromptK: 'Which factor changes the equilibrium constant K?',
    quizPromptCatalyst: 'What does a catalyst actually do?',
    quizPromptThermal: 'When this reaction is heated, which direction becomes favoured?',
    quizTemperature: 'Temperature change',
    quizConcentration: 'Concentration change',
    quizCatalystOnly: 'Speeds up approach to equilibrium',
    quizCatalystWrong1: 'Changes only K',
    quizCatalystWrong2: 'Changes only the equilibrium composition',
    noteCompressionNeutral:
      'Gas moles are the same on both sides, so compression barely shifts the equilibrium position.',
    noteCompressionActive:
      'Higher pressure favours the side with fewer gas moles. Compression makes that side more favourable right away.',
    noteTemperatureExothermic:
      'For an exothermic reaction, heating favours the side that absorbs heat, so the reactant side becomes more favourable.',
    noteTemperatureEndothermic:
      'For an endothermic reaction, heating favours the side that absorbs heat, so the product side becomes more favourable.',
    initialValidationError:
      'Set at least one initial concentration above zero before restarting the simulation.',
    canvasFallback:
      'This browser cannot render the particle animation. Use the legend and graph below to inspect the state instead.',
    particleSummaryPrefix: 'Approximate particle counts',
  },
} as const

export function getLocalizedText(text: LocalizedText, language: Language): string {
  return text[language]
}

export function formatNumber(
  value: number,
  language: Language,
  maximumFractionDigits = 2,
): string {
  if (!Number.isFinite(value)) {
    return '--'
  }

  return new Intl.NumberFormat(language === 'ja' ? 'ja-JP' : 'en-US', {
    maximumFractionDigits,
    minimumFractionDigits:
      value !== 0 && Math.abs(value) < 1 ? Math.min(2, maximumFractionDigits) : 0,
  }).format(value)
}

export function describeDirection(
  language: Language,
  direction: ReactionDirection,
): string {
  const copy = uiText[language]

  if (direction === 'forward') {
    return copy.productsSide
  }

  if (direction === 'reverse') {
    return copy.reactantsSide
  }

  return copy.noShift
}

export function buildKExpression(reaction: ReactionDefinition): string {
  const numerator = reaction.species
    .filter((species) => species.role === 'product')
    .map((species) =>
      species.stoich === 1 ? `[${species.formula}]` : `[${species.formula}]^${species.stoich}`,
    )
    .join('')
  const denominator = reaction.species
    .filter((species) => species.role === 'reactant')
    .map((species) =>
      species.stoich === 1 ? `[${species.formula}]` : `[${species.formula}]^${species.stoich}`,
    )
    .join('')

  return `K = ${numerator} / ${denominator}`
}

export function describeEvent(
  event: SimulationEvent,
  reaction: ReactionDefinition,
  language: Language,
  concise = false,
): string {
  const species = reaction.species.find((entry) => entry.id === event.speciesId)
  const formula = species?.formula ?? event.speciesId ?? ''
  const amount = formatNumber(event.amount ?? 0, language, 2)
  const from = formatNumber(Number(event.metadata?.from ?? 0), language, 2)
  const to = formatNumber(Number(event.metadata?.to ?? 0), language, 2)

  if (language === 'ja') {
    switch (event.type) {
      case 'inject':
        return concise ? `+ ${formula}` : `${formula} を +${amount} M 注入`
      case 'remove':
        return concise ? `- ${formula}` : `${formula} を ${amount} M 除去`
      case 'temperature':
        return concise ? `T ${from}->${to}` : `温度を ${from} K から ${to} K に変更`
      case 'volume':
        return concise ? `V ${from}->${to}` : `体積を ${from} L から ${to} L に変更`
      case 'catalyst':
        return concise
          ? '触媒'
          : Number(event.metadata?.active ?? 0)
            ? '触媒を追加'
            : '触媒を解除'
      case 'reset':
      default:
        return concise ? 'reset' : '初期条件を再設定'
    }
  }

  switch (event.type) {
    case 'inject':
      return concise ? `+ ${formula}` : `Injected ${formula} by +${amount} M`
    case 'remove':
      return concise ? `- ${formula}` : `Removed ${formula} by ${amount} M`
    case 'temperature':
      return concise ? `T ${from}->${to}` : `Temperature changed from ${from} K to ${to} K`
    case 'volume':
      return concise ? `V ${from}->${to}` : `Volume changed from ${from} L to ${to} L`
    case 'catalyst':
      return concise
        ? 'Catalyst'
        : Number(event.metadata?.active ?? 0)
          ? 'Catalyst added'
          : 'Catalyst removed'
    case 'reset':
    default:
      return concise ? 'Reset' : 'Initial conditions reset'
  }
}

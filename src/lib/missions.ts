import type { LocalizedText } from '../types'

export type MissionId =
  | 'inject'
  | 'remove'
  | 'heat'
  | 'cool'
  | 'compress'
  | 'catalyst'
  | 'explorer'
  | 'quiz'

export interface MissionDefinition {
  id: MissionId
  title: LocalizedText
  hint: LocalizedText
}

export interface ProgressState {
  completed: MissionId[]
  visited: string[]
}

export const missions: MissionDefinition[] = [
  {
    id: 'inject',
    title: { ja: '物質を加えてみる', en: 'Add a substance' },
    hint: {
      ja: '加えた物質を減らす向きに平衡が動きます。',
      en: 'Equilibrium shifts to use up what you added.',
    },
  },
  {
    id: 'remove',
    title: { ja: '物質を取り除く', en: 'Remove a substance' },
    hint: {
      ja: '取り除いた物質を補う向きに平衡が動きます。',
      en: 'Equilibrium shifts to replace what you removed.',
    },
  },
  {
    id: 'heat',
    title: { ja: '加熱する', en: 'Heat the system' },
    hint: {
      ja: '吸熱の向きへ移動し、K の値も変わります。',
      en: 'It shifts in the heat-absorbing direction, and K changes too.',
    },
  },
  {
    id: 'cool',
    title: { ja: '冷却する', en: 'Cool the system' },
    hint: {
      ja: '発熱の向きへ移動します。K の変化にも注目。',
      en: 'It shifts in the heat-releasing direction. Watch K as well.',
    },
  },
  {
    id: 'compress',
    title: { ja: '気体を圧縮する', en: 'Compress a gas' },
    hint: {
      ja: '気体分子の数が減る向きへ移動します。',
      en: 'It shifts toward the side with fewer gas molecules.',
    },
  },
  {
    id: 'catalyst',
    title: { ja: '触媒を入れる', en: 'Add a catalyst' },
    hint: {
      ja: '到達は速くなりますが、平衡の位置は変わりません。',
      en: 'Equilibrium arrives sooner, but its position stays put.',
    },
  },
  {
    id: 'explorer',
    title: { ja: '4 つの反応をすべて試す', en: 'Try all four reactions' },
    hint: {
      ja: '反応ごとに圧力や温度への応答が違います。',
      en: 'Each reaction responds differently to pressure and heat.',
    },
  },
  {
    id: 'quiz',
    title: { ja: 'クイズに全問正解', en: 'Ace the quiz' },
    hint: {
      ja: 'ルシャトリエの原理を自分の言葉で説明できるかチェック。',
      en: 'Check that you can explain Le Chatelier in your own words.',
    },
  },
]

const missionIds = new Set<string>(missions.map((mission) => mission.id))

export function parseProgress(raw: string | null, initialReactionId: string): ProgressState {
  const fallback: ProgressState = { completed: [], visited: [initialReactionId] }
  if (!raw) {
    return fallback
  }

  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') {
      return fallback
    }

    const { completed, visited } = parsed as Record<string, unknown>
    const safeCompleted = Array.isArray(completed)
      ? completed.filter(
          (entry): entry is MissionId => typeof entry === 'string' && missionIds.has(entry),
        )
      : []
    const safeVisited = Array.isArray(visited)
      ? visited.filter((entry): entry is string => typeof entry === 'string')
      : []

    return {
      completed: [...new Set(safeCompleted)],
      visited: [...new Set([initialReactionId, ...safeVisited])],
    }
  } catch {
    return fallback
  }
}

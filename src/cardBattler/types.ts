import type { VnText } from '../visualNovel/types'

export type CardTarget = 'enemy' | 'self' | 'all-enemies'

export type StatusId = 'vulnerable' | 'weak' | 'strength'

export interface StatusEffect {
  id: StatusId
  amount: number
}

export interface CardEffect {
  type: 'damage' | 'block' | 'draw' | 'heal' | 'addEnergy' | 'applyStatus'
  amount: number
  statusId?: StatusId
  targetSelf?: boolean
}

export interface CardDefinition {
  id: string
  name: VnText
  description: VnText
  cost: number
  effects: CardEffect[]
  target: CardTarget
  exhaust?: boolean
}

export interface EnemyIntent {
  type: 'attack' | 'defend' | 'buff' | 'debuff'
  amount?: number
  statusId?: StatusId
  description: VnText
}

export interface EnemyDefinition {
  id: string
  name: VnText
  maxHp: number
  spriteId?: string
  intents: EnemyIntent[]
  cardRewardPool?: string[]
}

export interface CardBattlerState {
  status: 'active' | 'victory' | 'defeat' | 'reward'
  playerMaxHp: number
  playerHp: number
  playerBlock: number
  playerEnergy: number
  playerMaxEnergy: number
  playerStatuses: StatusEffect[]

  enemyMaxHp: number
  enemyHp: number
  enemyBlock: number
  enemyIntentIndex: number
  enemyStatuses: StatusEffect[]

  deck: string[]
  drawPile: string[]
  discardPile: string[]
  exhaustPile: string[]
  hand: string[]

  turn: number
  activeEnemyId: string
  rewardChoices?: string[]
}

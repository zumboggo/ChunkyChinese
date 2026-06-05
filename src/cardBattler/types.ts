import type { VnText } from '../visualNovel/types'

export type CardTarget = 'enemy' | 'self' | 'all-enemies'

export interface CardEffect {
  type: 'damage' | 'block' | 'draw' | 'heal' | 'addEnergy'
  amount: number
}

export interface CardDefinition {
  id: string
  name: VnText
  description: VnText
  cost: number
  effects: CardEffect[]
  target: CardTarget
  exhaust?: boolean
  // Adaptive mode will tokenize 'name' and 'description'
}

export interface EnemyIntent {
  type: 'attack' | 'defend' | 'buff' | 'debuff'
  amount?: number
  description: VnText
}

export interface EnemyDefinition {
  id: string
  name: VnText
  maxHp: number
  spriteId?: string
  intents: EnemyIntent[]
}

export interface CardBattlerState {
  status: 'active' | 'victory' | 'defeat'
  playerMaxHp: number
  playerHp: number
  playerBlock: number
  playerEnergy: number
  playerMaxEnergy: number
  
  enemyMaxHp: number
  enemyHp: number
  enemyBlock: number
  enemyIntentIndex: number

  deck: string[] // Card IDs
  drawPile: string[]
  discardPile: string[]
  exhaustPile: string[]
  hand: string[]
  
  turn: number
  activeEnemyId: string
}

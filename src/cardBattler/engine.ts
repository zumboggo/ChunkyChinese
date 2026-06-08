import type { CardBattlerState, CardDefinition, EnemyDefinition, EnemyIntent, StatusEffect, StatusId } from './types'

export function createEncounter(
  deck: string[],
  enemyId: string,
  enemyMaxHp: number,
  playerMaxHp: number,
): CardBattlerState {
  const state: CardBattlerState = {
    status: 'active',
    playerMaxHp,
    playerHp: playerMaxHp,
    playerBlock: 0,
    playerMaxEnergy: 3,
    playerEnergy: 3,
    playerStatuses: [],

    enemyMaxHp,
    enemyHp: enemyMaxHp,
    enemyBlock: 0,
    enemyIntentIndex: 0,
    enemyStatuses: [],

    deck: [...deck],
    drawPile: [...deck],
    discardPile: [],
    exhaustPile: [],
    hand: [],

    turn: 1,
    activeEnemyId: enemyId,
  }

  return drawCards(shuffleDrawPile(state), 5)
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export function shuffleDrawPile(state: CardBattlerState): CardBattlerState {
  return {
    ...state,
    drawPile: shuffleArray(state.drawPile),
  }
}

export function drawCards(state: CardBattlerState, count: number): CardBattlerState {
  let next = { ...state }

  for (let i = 0; i < count; i++) {
    if (next.drawPile.length === 0) {
      if (next.discardPile.length === 0) break
      next = {
        ...next,
        drawPile: shuffleArray(next.discardPile),
        discardPile: []
      }
    }

    if (next.drawPile.length > 0) {
      const card = next.drawPile[0]
      next = {
        ...next,
        drawPile: next.drawPile.slice(1),
        hand: [...next.hand, card]
      }
    }
  }

  return next
}

export function getStatusAmount(statuses: StatusEffect[], id: StatusId): number {
  return statuses.find((s) => s.id === id)?.amount ?? 0
}

function setStatus(statuses: StatusEffect[], id: StatusId, amount: number): StatusEffect[] {
  if (amount <= 0) return statuses.filter((s) => s.id !== id)
  const existing = statuses.find((s) => s.id === id)
  if (existing) return statuses.map((s) => s.id === id ? { ...s, amount } : s)
  return [...statuses, { id, amount }]
}

function tickStatuses(statuses: StatusEffect[]): StatusEffect[] {
  return statuses
    .map((s) => (s.id === 'vulnerable' || s.id === 'weak') ? { ...s, amount: s.amount - 1 } : s)
    .filter((s) => s.amount > 0)
}

function applyStatusToEntity(statuses: StatusEffect[], id: StatusId, amount: number): StatusEffect[] {
  const current = getStatusAmount(statuses, id)
  return setStatus(statuses, id, current + amount)
}

function calcDamageWithStrength(base: number, strength: number): number {
  return Math.max(0, base + strength)
}

function calcDamageWithVulnerable(dmg: number, vulnerable: number): number {
  return vulnerable > 0 ? Math.floor(dmg * 1.5) : dmg
}

function calcDamageWithWeak(dmg: number, weak: number): number {
  return weak > 0 ? Math.floor(dmg * 0.75) : dmg
}

export function computeEnemyIntents(
  enemyDef: EnemyDefinition,
  intentIndex: number,
): EnemyIntent[] {
  if (enemyDef.intents.length === 0) return []
  const intent = enemyDef.intents[intentIndex % enemyDef.intents.length]
  return [intent]
}

export function computeEnemyDamagePreview(
  enemyDef: EnemyDefinition,
  intentIndex: number,
  enemyStatuses: StatusEffect[],
): number {
  const intents = computeEnemyIntents(enemyDef, intentIndex)
  let total = 0
  const weak = getStatusAmount(enemyStatuses, 'weak')
  for (const intent of intents) {
    if (intent.type === 'attack') {
      const base = intent.amount ?? 0
      total += calcDamageWithWeak(base, weak)
    }
  }
  return total
}

export function playCard(
  state: CardBattlerState,
  cardIndex: number,
  cardDef: CardDefinition
): CardBattlerState {
  if (state.status !== 'active') return state
  if (cardIndex < 0 || cardIndex >= state.hand.length) return state
  if (state.playerEnergy < cardDef.cost) return state

  let next = {
    ...state,
    playerEnergy: state.playerEnergy - cardDef.cost,
  }

  const cardId = next.hand[cardIndex]
  const newHand = [...next.hand]
  newHand.splice(cardIndex, 1)
  next.hand = newHand

  if (cardDef.exhaust) {
    next.exhaustPile = [...next.exhaustPile, cardId]
  } else {
    next.discardPile = [...next.discardPile, cardId]
  }

  const playerStrength = getStatusAmount(next.playerStatuses, 'strength')
  const playerWeak = getStatusAmount(next.playerStatuses, 'weak')
  const enemyVulnerable = getStatusAmount(next.enemyStatuses, 'vulnerable')

  for (const effect of cardDef.effects) {
    if (effect.type === 'damage') {
      let dmg = calcDamageWithStrength(effect.amount, playerStrength)
      dmg = calcDamageWithWeak(dmg, playerWeak)
      dmg = calcDamageWithVulnerable(dmg, enemyVulnerable)
      if (next.enemyBlock >= dmg) {
        next.enemyBlock -= dmg
      } else {
        dmg -= next.enemyBlock
        next.enemyBlock = 0
        next.enemyHp = Math.max(0, next.enemyHp - dmg)
      }
    } else if (effect.type === 'block') {
      next.playerBlock += effect.amount
    } else if (effect.type === 'heal') {
      next.playerHp = Math.min(next.playerMaxHp, next.playerHp + effect.amount)
    } else if (effect.type === 'draw') {
      next = drawCards(next, effect.amount)
    } else if (effect.type === 'addEnergy') {
      next.playerEnergy += effect.amount
    } else if (effect.type === 'applyStatus' && effect.statusId) {
      const targetSelf = effect.targetSelf === true
      if (targetSelf) {
        next.playerStatuses = applyStatusToEntity(next.playerStatuses, effect.statusId, effect.amount)
      } else {
        next.enemyStatuses = applyStatusToEntity(next.enemyStatuses, effect.statusId, effect.amount)
      }
    }
  }

  if (next.enemyHp <= 0) {
    next.status = 'victory'
  }

  return next
}

export function endTurn(
  state: CardBattlerState,
  enemyDef: EnemyDefinition
): CardBattlerState {
  if (state.status !== 'active') return state

  const next = { ...state }

  // Enemy turn starts — reset block
  next.enemyBlock = 0

  // Execute ALL intents for this turn (statuses active during action)
  const intents = computeEnemyIntents(enemyDef, next.enemyIntentIndex)
  const enemyWeak = getStatusAmount(next.enemyStatuses, 'weak')
  const enemyStrength = getStatusAmount(next.enemyStatuses, 'strength')
  const playerVulnerable = getStatusAmount(next.playerStatuses, 'vulnerable')

  for (const intent of intents) {
    if (intent.type === 'attack') {
      let dmg = calcDamageWithStrength(intent.amount ?? 0, enemyStrength)
      dmg = calcDamageWithWeak(dmg, enemyWeak)
      dmg = calcDamageWithVulnerable(dmg, playerVulnerable)
      if (next.playerBlock >= dmg) {
        next.playerBlock -= dmg
      } else {
        dmg -= next.playerBlock
        next.playerBlock = 0
        next.playerHp = Math.max(0, next.playerHp - dmg)
      }
    } else if (intent.type === 'defend') {
      next.enemyBlock += intent.amount ?? 0
    } else if (intent.type === 'buff' && intent.statusId) {
      next.enemyStatuses = applyStatusToEntity(next.enemyStatuses, intent.statusId, intent.amount ?? 1)
    } else if (intent.type === 'debuff' && intent.statusId) {
      next.playerStatuses = applyStatusToEntity(next.playerStatuses, intent.statusId, intent.amount ?? 1)
    }
  }

  // Tick enemy statuses at end of enemy turn (after action)
  next.enemyStatuses = tickStatuses(next.enemyStatuses)

  // Check defeat
  if (next.playerHp <= 0) {
    next.status = 'defeat'
    return next
  }

  // Player turn starts — reset block and energy
  next.playerBlock = 0
  next.playerEnergy = next.playerMaxEnergy

  // Discard hand
  next.discardPile = [...next.discardPile, ...next.hand]
  next.hand = []

  // Advance state
  next.turn += 1
  next.enemyIntentIndex += 1

  // Draw new hand
  const drawn = drawCards(next, 5)

  // Tick player statuses so debuffs from enemy turn affect this hand
  drawn.playerStatuses = tickStatuses(drawn.playerStatuses)

  return drawn
}

export function pickCardReward(
  state: CardBattlerState,
  rewardPool: string[],
  deck: string[],
  count = 3,
): CardBattlerState {
  const available = rewardPool.filter((id) => !deck.includes(id) || true)
  const shuffled = shuffleArray(available)
  const choices = shuffled.slice(0, count)
  return {
    ...state,
    status: 'reward',
    rewardChoices: choices,
  }
}

export function addCardToDeck(
  state: CardBattlerState,
  cardId: string,
): CardBattlerState {
  return {
    ...state,
    status: 'victory',
    deck: [...state.deck, cardId],
    rewardChoices: undefined,
  }
}

export function skipCardReward(state: CardBattlerState): CardBattlerState {
  return {
    ...state,
    status: 'victory',
    rewardChoices: undefined,
  }
}

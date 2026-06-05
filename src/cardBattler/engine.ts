import type { CardBattlerState, CardDefinition, EnemyDefinition } from './types'

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

    enemyMaxHp,
    enemyHp: enemyMaxHp,
    enemyBlock: 0,
    enemyIntentIndex: 0,

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
      if (next.discardPile.length === 0) break // No cards left anywhere
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

  for (const effect of cardDef.effects) {
    if (effect.type === 'damage') {
      let dmg = effect.amount
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

  let next = { ...state }

  // Enemy turn starts
  next.enemyBlock = 0 

  // Enemy executes intent
  const intent = enemyDef.intents[next.enemyIntentIndex % enemyDef.intents.length]
  if (intent.type === 'attack') {
    let dmg = intent.amount ?? 0
    if (next.playerBlock >= dmg) {
      next.playerBlock -= dmg
    } else {
      dmg -= next.playerBlock
      next.playerBlock = 0
      next.playerHp = Math.max(0, next.playerHp - dmg)
    }
  } else if (intent.type === 'defend') {
    next.enemyBlock += intent.amount ?? 0
  }

  // Check defeat
  if (next.playerHp <= 0) {
    next.status = 'defeat'
    return next
  }

  // Player turn starts
  next.playerBlock = 0
  next.playerEnergy = next.playerMaxEnergy
  
  // Discard hand
  next.discardPile = [...next.discardPile, ...next.hand]
  next.hand = []
  
  // Advance state
  next.turn += 1
  next.enemyIntentIndex += 1

  return drawCards(next, 5)
}

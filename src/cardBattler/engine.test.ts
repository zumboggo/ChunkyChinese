import { describe, it, expect } from 'vitest'
import { createEncounter, playCard, endTurn } from './engine'
import type { CardDefinition, EnemyDefinition } from './types'

describe('Card Battler Engine', () => {
  const mockEnemy: EnemyDefinition = {
    id: 'slime',
    name: { chinese: '史莱姆' },
    maxHp: 20,
    intents: [
      { type: 'attack', amount: 5, description: { chinese: '攻击' } },
      { type: 'defend', amount: 4, description: { chinese: '防守' } }
    ]
  }

  const strikeCard: CardDefinition = {
    id: 'strike',
    name: { chinese: '打击' },
    description: { chinese: '造成6点伤害' },
    cost: 1,
    target: 'enemy',
    effects: [{ type: 'damage', amount: 6 }]
  }

  const defendCard: CardDefinition = {
    id: 'defend',
    name: { chinese: '防御' },
    description: { chinese: '获得5点格挡' },
    cost: 1,
    target: 'self',
    effects: [{ type: 'block', amount: 5 }]
  }

  it('creates an encounter and draws initial hand', () => {
    const deck = ['strike', 'strike', 'strike', 'defend', 'defend', 'defend']
    const state = createEncounter(deck, 'slime', 20, 50)
    
    expect(state.status).toBe('active')
    expect(state.enemyHp).toBe(20)
    expect(state.playerHp).toBe(50)
    expect(state.hand.length).toBe(5)
    expect(state.drawPile.length).toBe(1)
    expect(state.discardPile.length).toBe(0)
    expect(state.playerEnergy).toBe(3)
  })

  it('plays a damage card correctly', () => {
    const deck = ['strike', 'strike', 'strike', 'defend', 'defend', 'defend']
    let state = createEncounter(deck, 'slime', 20, 50)
    
    // Force hand to be strike
    state.hand[0] = 'strike'
    
    state = playCard(state, 0, strikeCard)
    
    expect(state.enemyHp).toBe(14)
    expect(state.playerEnergy).toBe(2)
    expect(state.hand.length).toBe(4)
    expect(state.discardPile.length).toBe(1)
  })

  it('plays a block card correctly', () => {
    const deck = ['strike']
    let state = createEncounter(deck, 'slime', 20, 50)
    state.hand = ['defend']
    
    state = playCard(state, 0, defendCard)
    
    expect(state.playerBlock).toBe(5)
    expect(state.playerEnergy).toBe(2)
  })

  it('respects energy costs', () => {
    let state = createEncounter(['strike'], 'slime', 20, 50)
    state.hand = ['strike']
    state.playerEnergy = 0
    
    const nextState = playCard(state, 0, strikeCard)
    expect(nextState).toBe(state) // Returns same reference if invalid
    expect(nextState.enemyHp).toBe(20)
  })

  it('ends turn and processes enemy attack', () => {
    let state = createEncounter(['strike'], 'slime', 20, 50)
    
    // Player plays block
    state.hand = ['defend']
    state = playCard(state, 0, defendCard)
    expect(state.playerBlock).toBe(5)
    
    // End turn 1 - Enemy uses attack 5
    state = endTurn(state, mockEnemy)
    
    // Enemy attack of 5 hits player block of 5
    expect(state.playerHp).toBe(50)
    expect(state.playerBlock).toBe(0) // resets on player turn start
    expect(state.turn).toBe(2)
    expect(state.playerEnergy).toBe(3)
    
    // End turn 2 - Enemy uses defend 4
    state = endTurn(state, mockEnemy)
    expect(state.enemyBlock).toBe(4)
  })

  it('detects victory', () => {
    let state = createEncounter(['strike'], 'slime', 5, 50)
    state.hand = ['strike']
    
    state = playCard(state, 0, strikeCard)
    expect(state.status).toBe('victory')
    expect(state.enemyHp).toBe(0)
  })

  it('detects defeat', () => {
    let state = createEncounter(['strike'], 'slime', 20, 4)
    // Enemy will attack for 5
    state = endTurn(state, mockEnemy)
    expect(state.status).toBe('defeat')
    expect(state.playerHp).toBe(0)
  })
})

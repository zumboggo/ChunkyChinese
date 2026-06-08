import { describe, it, expect } from 'vitest'
import { createEncounter, playCard, endTurn, pickCardReward, addCardToDeck, skipCardReward, getStatusAmount, computeEnemyDamagePreview } from './engine'
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

  const bashCard: CardDefinition = {
    id: 'bash',
    name: { chinese: '猛击' },
    description: { chinese: '造成6点伤害，施加2层易伤' },
    cost: 1,
    target: 'enemy',
    effects: [
      { type: 'damage', amount: 6 },
      { type: 'applyStatus', statusId: 'vulnerable', amount: 2 }
    ]
  }

  const intimidateCard: CardDefinition = {
    id: 'intimidate',
    name: { chinese: '威吓' },
    description: { chinese: '施加2层虚弱' },
    cost: 1,
    target: 'enemy',
    exhaust: true,
    effects: [
      { type: 'applyStatus', statusId: 'weak', amount: 2 }
    ]
  }

  const heavyStrikeCard: CardDefinition = {
    id: 'heavy-strike',
    name: { chinese: '重击' },
    description: { chinese: '造成14点伤害' },
    cost: 2,
    target: 'enemy',
    effects: [{ type: 'damage', amount: 14 }]
  }

  const focusCard: CardDefinition = {
    id: 'focus',
    name: { chinese: '集中' },
    description: { chinese: '抽1张牌，获得1点能量' },
    cost: 0,
    target: 'self',
    effects: [
      { type: 'draw', amount: 1 },
      { type: 'addEnergy', amount: 1 }
    ]
  }

  const battleCryCard: CardDefinition = {
    id: 'battle-cry',
    name: { chinese: '战吼' },
    description: { chinese: '获得2层力量' },
    cost: 1,
    target: 'self',
    exhaust: true,
    effects: [
      { type: 'applyStatus', statusId: 'strength', amount: 2, targetSelf: true }
    ]
  }

  const weakDebuffEnemy: EnemyDefinition = {
    id: 'debuffer',
    name: { chinese: '减益者' },
    maxHp: 20,
    intents: [
      { type: 'debuff', amount: 1, statusId: 'weak', description: { chinese: '释放粘液' } },
      { type: 'attack', amount: 5, description: { chinese: '攻击' } }
    ]
  }

  const vulnerableDebuffEnemy: EnemyDefinition = {
    id: 'debuffer-vulnerable',
    name: { chinese: '易伤者' },
    maxHp: 20,
    intents: [
      { type: 'debuff', amount: 2, statusId: 'vulnerable', description: { chinese: '施加易伤' } },
      { type: 'attack', amount: 5, description: { chinese: '攻击' } }
    ]
  }

  const pureAttackEnemy: EnemyDefinition = {
    id: 'attacker',
    name: { chinese: '攻击者' },
    maxHp: 20,
    intents: [
      { type: 'attack', amount: 5, description: { chinese: '攻击' } }
    ]
  }

  const buffEnemy: EnemyDefinition = {
    id: 'buffer',
    name: { chinese: '增益者' },
    maxHp: 20,
    intents: [
      { type: 'buff', amount: 2, statusId: 'strength', description: { chinese: '蓄力' } },
      { type: 'attack', amount: 5, description: { chinese: '攻击' } }
    ]
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
    const state = createEncounter(['strike'], 'slime', 20, 50)
    state.hand = ['strike']
    state.playerEnergy = 0

    const nextState = playCard(state, 0, strikeCard)
    expect(nextState).toBe(state)
    expect(nextState.enemyHp).toBe(20)
  })

  it('ends turn and processes enemy attack', () => {
    let state = createEncounter(['strike'], 'slime', 20, 50)

    state.hand = ['defend']
    state = playCard(state, 0, defendCard)
    expect(state.playerBlock).toBe(5)

    state = endTurn(state, mockEnemy)

    expect(state.playerHp).toBe(50)
    expect(state.playerBlock).toBe(0)
    expect(state.turn).toBe(2)
    expect(state.playerEnergy).toBe(3)

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
    state = endTurn(state, mockEnemy)
    expect(state.status).toBe('defeat')
    expect(state.playerHp).toBe(0)
  })

  it('applies vulnerable status to enemy', () => {
    let state = createEncounter(['bash'], 'slime', 20, 50)
    state.hand = ['bash']

    state = playCard(state, 0, bashCard)

    expect(state.enemyHp).toBe(14)
    expect(getStatusAmount(state.enemyStatuses, 'vulnerable')).toBe(2)
  })

  it('vulnerable increases damage by 50%', () => {
    let state = createEncounter(['bash', 'strike'], 'slime', 30, 50)
    state.hand = ['bash', 'strike']

    state = playCard(state, 0, bashCard)
    expect(state.enemyHp).toBe(24)
    expect(getStatusAmount(state.enemyStatuses, 'vulnerable')).toBe(2)

    state = playCard(state, 0, strikeCard)
    expect(state.enemyHp).toBe(15)
  })

  it('weak reduces enemy attack damage', () => {
    let state = createEncounter(['intimidate'], 'slime', 20, 50)
    state.hand = ['intimidate']

    state = playCard(state, 0, intimidateCard)
    expect(getStatusAmount(state.enemyStatuses, 'weak')).toBe(2)

    state = endTurn(state, mockEnemy)
    expect(state.playerHp).toBe(47)
  })

  it('strength adds to damage', () => {
    let state = createEncounter(['battle-cry', 'strike'], 'slime', 20, 50)
    state.hand = ['battle-cry', 'strike']

    state = playCard(state, 0, battleCryCard)
    expect(getStatusAmount(state.playerStatuses, 'strength')).toBe(2)

    state = playCard(state, 0, strikeCard)
    expect(state.enemyHp).toBe(12)
  })

  it('vulnerable and strength stack multiplicatively', () => {
    let state = createEncounter(['battle-cry', 'bash', 'strike'], 'slime', 30, 50)
    state.hand = ['battle-cry', 'bash', 'strike']

    state = playCard(state, 0, battleCryCard)
    state = playCard(state, 0, bashCard)
    expect(state.enemyHp).toBe(22)

    state = playCard(state, 0, strikeCard)
    expect(state.enemyHp).toBe(10)
  })

  it('enemy buff intent grants strength', () => {
    let state = createEncounter(['strike'], 'buffer', 20, 50)
    state.hand = ['strike']

    state = endTurn(state, buffEnemy)
    expect(getStatusAmount(state.enemyStatuses, 'strength')).toBe(2)
  })

  it('enemy debuff intent applies weak to player', () => {
    let state = createEncounter(['strike'], 'debuffer', 20, 50)
    state.hand = ['strike']

    state = endTurn(state, weakDebuffEnemy)
    expect(getStatusAmount(state.playerStatuses, 'weak')).toBe(1)

    state.hand = ['strike']
    state = playCard(state, 0, strikeCard)
    expect(state.enemyHp).toBe(16)
  })

  it('vulnerable and weak tick down each round', () => {
    let state = createEncounter(['bash', 'intimidate'], 'slime', 30, 50)
    state.hand = ['bash', 'intimidate']

    state = playCard(state, 0, bashCard)
    state = playCard(state, 0, intimidateCard)
    expect(getStatusAmount(state.enemyStatuses, 'vulnerable')).toBe(2)
    expect(getStatusAmount(state.enemyStatuses, 'weak')).toBe(2)

    state = endTurn(state, mockEnemy)
    expect(getStatusAmount(state.enemyStatuses, 'vulnerable')).toBe(1)
    expect(getStatusAmount(state.enemyStatuses, 'weak')).toBe(1)

    state = endTurn(state, mockEnemy)
    expect(getStatusAmount(state.enemyStatuses, 'vulnerable')).toBe(0)
    expect(getStatusAmount(state.enemyStatuses, 'weak')).toBe(0)
  })

  it('strength does not tick down', () => {
    let state = createEncounter(['battle-cry'], 'slime', 20, 50)
    state.hand = ['battle-cry']

    state = playCard(state, 0, battleCryCard)
    expect(getStatusAmount(state.playerStatuses, 'strength')).toBe(2)

    state = endTurn(state, mockEnemy)
    expect(getStatusAmount(state.playerStatuses, 'strength')).toBe(2)
  })

  it('0-cost card does not consume energy', () => {
    let state = createEncounter(['focus', 'strike'], 'slime', 20, 50)
    state.hand = ['focus', 'strike']
    state.playerEnergy = 1

    state = playCard(state, 0, focusCard)
    expect(state.playerEnergy).toBe(2)
  })

  it('2-cost card consumes 2 energy', () => {
    let state = createEncounter(['heavy-strike'], 'slime', 20, 50)
    state.hand = ['heavy-strike']

    state = playCard(state, 0, heavyStrikeCard)
    expect(state.playerEnergy).toBe(1)
    expect(state.enemyHp).toBe(6)
  })

  it('exhaust card goes to exhaust pile', () => {
    let state = createEncounter(['intimidate'], 'slime', 20, 50)
    state.hand = ['intimidate']

    state = playCard(state, 0, intimidateCard)
    expect(state.exhaustPile).toContain('intimidate')
    expect(state.discardPile).not.toContain('intimidate')
  })

  it('enemy block resets at start of enemy turn', () => {
    let state = createEncounter(['strike'], 'slime', 20, 50)
    state.hand = ['strike']

    state = endTurn(state, mockEnemy)
    expect(state.enemyBlock).toBe(0)

    state = endTurn(state, mockEnemy)
    expect(state.enemyBlock).toBe(4)
  })

  it('enemy attack is reduced by weak', () => {
    let state = createEncounter(['intimidate'], 'slime', 20, 50)
    state.hand = ['intimidate']
    state = playCard(state, 0, intimidateCard)
    expect(getStatusAmount(state.enemyStatuses, 'weak')).toBe(2)

    state = endTurn(state, pureAttackEnemy)
    expect(state.playerHp).toBe(47)

    state = endTurn(state, pureAttackEnemy)
    expect(state.playerHp).toBe(44)
  })

  it('player attack is reduced by weak', () => {
    let state = createEncounter(['strike'], 'debuffer', 20, 50)
    state.hand = ['strike']
    state = endTurn(state, weakDebuffEnemy)
    expect(getStatusAmount(state.playerStatuses, 'weak')).toBe(1)

    state.hand = ['strike']
    state = playCard(state, 0, strikeCard)
    expect(state.enemyHp).toBe(16)
  })

  it('enemy vulnerable increases player damage', () => {
    let state = createEncounter(['bash', 'strike'], 'slime', 30, 50)
    state.hand = ['bash', 'strike']

    state = playCard(state, 0, bashCard)
    state = playCard(state, 0, strikeCard)
    expect(state.enemyHp).toBe(15)
  })

  it('player vulnerable increases enemy damage', () => {
    let state = createEncounter(['strike'], 'debuffer-vulnerable', 20, 50)
    state.hand = ['strike']
    state = endTurn(state, vulnerableDebuffEnemy)
    expect(getStatusAmount(state.playerStatuses, 'vulnerable')).toBe(2)

    state = endTurn(state, vulnerableDebuffEnemy)
    expect(state.playerHp).toBe(43)
  })

  it('pickCardReward generates choices', () => {
    const state = createEncounter(['strike'], 'slime', 5, 50)
    state.hand = ['strike']
    const wonState = playCard(state, 0, strikeCard)
    expect(wonState.status).toBe('victory')

    const rewardState = pickCardReward(wonState, ['heavy-strike', 'shield-wall', 'bash', 'focus'], wonState.deck)
    expect(rewardState.status).toBe('reward')
    expect(rewardState.rewardChoices?.length).toBeLessThanOrEqual(4)
  })

  it('addCardToDeck adds card and sets victory', () => {
    const state = createEncounter(['strike'], 'slime', 5, 50)
    state.hand = ['strike']
    const wonState = playCard(state, 0, strikeCard)
    const rewardState = pickCardReward(wonState, ['heavy-strike', 'shield-wall', 'bash'], wonState.deck)
    const finalState = addCardToDeck(rewardState, 'heavy-strike')

    expect(finalState.status).toBe('victory')
    expect(finalState.deck).toContain('heavy-strike')
    expect(finalState.rewardChoices).toBeUndefined()
  })

  it('skipCardReward sets victory without adding card', () => {
    const state = createEncounter(['strike'], 'slime', 5, 50)
    state.hand = ['strike']
    const wonState = playCard(state, 0, strikeCard)
    const rewardState = pickCardReward(wonState, ['heavy-strike', 'shield-wall', 'bash'], wonState.deck)
    const finalState = skipCardReward(rewardState)

    expect(finalState.status).toBe('victory')
    expect(finalState.deck).not.toContain('heavy-strike')
  })

  it('computeEnemyDamagePreview accounts for weak', () => {
    const state = createEncounter(['intimidate'], 'slime', 20, 50)
    state.hand = ['intimidate']
    const afterIntimidate = playCard(state, 0, intimidateCard)
    const preview = computeEnemyDamagePreview(mockEnemy, 0, afterIntimidate.enemyStatuses)
    expect(preview).toBe(3)
  })

  it('draw effect draws cards', () => {
    let state = createEncounter(['focus', 'strike', 'defend', 'strike', 'defend', 'strike'], 'slime', 20, 50)
    state.hand = ['focus']
    state.discardPile = ['strike']

    state = playCard(state, 0, focusCard)
    expect(state.hand.length).toBe(1)
  })

  it('addEnergy effect grants energy', () => {
    let state = createEncounter(['focus'], 'slime', 20, 50)
    state.hand = ['focus']
    state.playerEnergy = 0

    state = playCard(state, 0, focusCard)
    expect(state.playerEnergy).toBe(1)
  })
})

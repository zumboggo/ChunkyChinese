import { useCallback, useEffect, useMemo, useState } from 'react'
import { AdaptiveChineseText } from '../AdaptiveChineseText'
import { tokenizeReaderText, type AdaptivePinyinMode } from '../adaptiveText'
import type { VocabWord, ReaderWordToken, HotkeySettings } from '../types'
import type { CardBattlerState, CardDefinition, EnemyDefinition, StatusEffect, StatusId } from './types'
import { playCard, endTurn, pickCardReward, addCardToDeck, skipCardReward, computeEnemyDamagePreview, getStatusAmount } from './engine'

const STATUS_META: Record<StatusId, { icon: string; color: string; label: string }> = {
  vulnerable: { icon: '\u{1F494}', color: '#ef4444', label: 'Vulnerable' },
  weak: { icon: '\u{1F4A9}', color: '#a16207', label: 'Weak' },
  strength: { icon: '\u{1F4AA}', color: '#2563eb', label: 'Strength' },
}

export interface CardBattlerModeProps {
  initialState: CardBattlerState
  enemyDef: EnemyDefinition
  cards: Record<string, CardDefinition>
  words: VocabWord[]
  pinyinMode: AdaptivePinyinMode
  hotkeys: HotkeySettings
  deck?: string[]
  onBattleEnd: (state: CardBattlerState) => void
  onSelectToken: (token: ReaderWordToken | null) => void
}

export function CardBattlerMode({
  initialState,
  enemyDef,
  cards,
  words,
  pinyinMode,
  hotkeys,
  deck,
  onBattleEnd,
  onSelectToken,
}: CardBattlerModeProps) {
  const [state, setState] = useState<CardBattlerState>(initialState)
  const [selectedToken, setSelectedToken] = useState<ReaderWordToken | null>(null)
  const [viewingPile, setViewingPile] = useState<'draw' | 'discard' | null>(null)

  const effectiveDeck = deck ?? initialState.deck

  const handleSelectToken = useCallback((token: ReaderWordToken | null) => {
    setSelectedToken(token)
    onSelectToken(token)
  }, [onSelectToken])

  const handlePlayCard = useCallback((index: number) => {
    const cardId = state.hand[index]
    const cardDef = cards[cardId]
    if (!cardDef) return

    const nextState = playCard(state, index, cardDef)
    if (nextState !== state) {
      setState(nextState)
      if (nextState.status === 'victory') {
        const pool = enemyDef.cardRewardPool
        if (pool && pool.length > 0) {
          const rewardState = pickCardReward(nextState, pool, effectiveDeck)
          setState(rewardState)
        } else {
          onBattleEnd(nextState)
        }
      } else if (nextState.status === 'defeat') {
        onBattleEnd(nextState)
      }
    }
  }, [state, cards, enemyDef, effectiveDeck, onBattleEnd])

  const handleEndTurn = useCallback(() => {
    const nextState = endTurn(state, enemyDef)
    if (nextState !== state) {
      setState(nextState)
      if (nextState.status !== 'active') {
        onBattleEnd(nextState)
      }
    }
  }, [state, enemyDef, onBattleEnd])

  const handlePickReward = useCallback((cardId: string) => {
    const nextState = addCardToDeck(state, cardId)
    setState(nextState)
    onBattleEnd(nextState)
  }, [state, onBattleEnd])

  const handleSkipReward = useCallback(() => {
    const nextState = skipCardReward(state)
    setState(nextState)
    onBattleEnd(nextState)
  }, [state, onBattleEnd])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (state.status === 'reward') return
      if (state.status !== 'active') return

      const key = event.key.toLowerCase()

      if (key === hotkeys.choiceA && state.hand.length > 0) {
        event.preventDefault()
        handlePlayCard(0)
      } else if (key === hotkeys.choiceB && state.hand.length > 1) {
        event.preventDefault()
        handlePlayCard(1)
      } else if (key >= '1' && key <= '5') {
        const index = parseInt(key, 10) - 1
        if (index < state.hand.length) {
          event.preventDefault()
          handlePlayCard(index)
        }
      } else if (key === ' ' || key === 'enter') {
        event.preventDefault()
        handleEndTurn()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [state, handlePlayCard, handleEndTurn, hotkeys])

  const intent = enemyDef.intents.length > 0
    ? enemyDef.intents[state.enemyIntentIndex % enemyDef.intents.length]
    : { type: 'attack' as const, amount: 0, description: { chinese: '等待', english: 'Waiting.' } }
  const intentTokens = useMemo(
    () => scopedTokens(tokenizeReaderText(intent.description.chinese, words), `intent-${state.turn}`),
    [intent.description.chinese, words, state.turn]
  )

  const enemyDmgPreview = computeEnemyDamagePreview(enemyDef, state.enemyIntentIndex, state.enemyStatuses)
  const playerVulnerable = getStatusAmount(state.playerStatuses, 'vulnerable')

  if (state.status === 'reward' && state.rewardChoices) {
    return (
      <div className="card-battler-mode">
        <div className="battler-reward">
          <h2>Choose a card to add to your deck</h2>
          <div className="battler-reward-cards">
            {state.rewardChoices.map((cardId) => (
              <CardView
                key={cardId}
                cardId={cardId}
                cardDef={cards[cardId]}
                index={0}
                words={words}
                pinyinMode={pinyinMode}
                selectedToken={selectedToken}
                onSelectToken={handleSelectToken}
                onPlay={() => handlePickReward(cardId)}
                playable
              />
            ))}
          </div>
          <button type="button" className="battler-skip-reward" onClick={handleSkipReward}>
            Skip reward
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="card-battler-mode">
      <div className="battler-header">
        <div className="player-stats">
          <h2>Player</h2>
          <div className="stat-bar">
            <div className="stat-bar-fill hp-bar" style={{ width: `${(state.playerHp / state.playerMaxHp) * 100}%` }} />
            <span className="stat-bar-text">{state.playerHp} / {state.playerMaxHp}</span>
          </div>
          {state.playerBlock > 0 && <p className="stat-block">Block: {state.playerBlock}</p>}
          <p className="stat-energy">Energy: {state.playerEnergy} / {state.playerMaxEnergy}</p>
          {state.playerStatuses.length > 0 && <StatusRow statuses={state.playerStatuses} />}
        </div>

        <div className="enemy-stats">
          <h2>{enemyDef.name.chinese}</h2>
          <p className="enemy-name-en">{enemyDef.name.english}</p>
          <div className="stat-bar">
            <div className="stat-bar-fill enemy-hp-bar" style={{ width: `${(state.enemyHp / state.enemyMaxHp) * 100}%` }} />
            <span className="stat-bar-text">{state.enemyHp} / {state.enemyMaxHp}</span>
          </div>
          {state.enemyBlock > 0 && <p className="stat-block">Block: {state.enemyBlock}</p>}
          {state.enemyStatuses.length > 0 && <StatusRow statuses={state.enemyStatuses} />}
          <div className="enemy-intent">
            <span className="intent-icon">{intent.type === 'attack' ? '\u2694\uFE0F' : intent.type === 'defend' ? '\u{1F6E1}\uFE0F' : '\u2728'}</span>
            <AdaptiveChineseText
              tokens={intentTokens}
              selectedToken={selectedToken}
              pinyinMode={pinyinMode}
              onSelectToken={handleSelectToken}
              className="intent-text"
            />
            {intent.type === 'attack' && intent.amount != null && (
              <span className="intent-amount">
                {calcPreviewDamage(intent.amount, enemyDmgPreview, playerVulnerable)}
              </span>
            )}
            {intent.type === 'defend' && intent.amount != null && (
              <span className="intent-amount intent-amount-block">+{intent.amount}</span>
            )}
          </div>
        </div>
      </div>

      <div className="battler-board">
        {state.status === 'victory' && <h1>VICTORY!</h1>}
        {state.status === 'defeat' && <h1>DEFEAT...</h1>}
      </div>

      <div className="battler-controls">
        <button type="button" onClick={handleEndTurn} disabled={state.status !== 'active'}>
          End Turn
        </button>
        <div className="deck-stats">
          <button type="button" className="pile-btn" onClick={() => setViewingPile(viewingPile === 'draw' ? null : 'draw')}>
            Draw: {state.drawPile.length}
          </button>
          <button type="button" className="pile-btn" onClick={() => setViewingPile(viewingPile === 'discard' ? null : 'discard')}>
            Discard: {state.discardPile.length}
          </button>
          {state.exhaustPile.length > 0 && <span className="pile-exhaust">Exhaust: {state.exhaustPile.length}</span>}
        </div>
      </div>

      {viewingPile && (
        <PileViewer
          type={viewingPile}
          cards={viewingPile === 'draw' ? state.drawPile : state.discardPile}
          cardDefs={cards}
          words={words}
          pinyinMode={pinyinMode}
          selectedToken={selectedToken}
          onSelectToken={handleSelectToken}
          onClose={() => setViewingPile(null)}
        />
      )}

      <div className="battler-hand">
        {state.hand.map((cardId, index) => (
          <CardView
            key={`${cardId}-${index}`}
            cardId={cardId}
            cardDef={cards[cardId]}
            index={index}
            words={words}
            pinyinMode={pinyinMode}
            selectedToken={selectedToken}
            onSelectToken={handleSelectToken}
            onPlay={() => handlePlayCard(index)}
            playable={state.status === 'active' && (cards[cardId]?.cost ?? 99) <= state.playerEnergy}
          />
        ))}
      </div>
    </div>
  )
}

function calcPreviewDamage(base: number, _enemyDmg: number, playerVulnerable: number): string {
  const afterVuln = playerVulnerable > 0 ? Math.floor(base * 1.5) : base
  return `${afterVuln}`
}

function StatusRow({ statuses }: { statuses: StatusEffect[] }) {
  return (
    <div className="status-row">
      {statuses.map((s) => {
        const meta = STATUS_META[s.id]
        return (
          <span key={s.id} className="status-badge" style={{ borderColor: meta.color }}>
            <span className="status-icon">{meta.icon}</span>
            <span className="status-amount">{s.amount}</span>
          </span>
        )
      })}
    </div>
  )
}

function PileViewer({ type, cards, cardDefs, words, pinyinMode, selectedToken, onSelectToken, onClose }: {
  type: 'draw' | 'discard'
  cards: string[]
  cardDefs: Record<string, CardDefinition>
  words: VocabWord[]
  pinyinMode: AdaptivePinyinMode
  selectedToken: ReaderWordToken | null
  onSelectToken: (token: ReaderWordToken | null) => void
  onClose: () => void
}) {
  const counts = useMemo(() => {
    const map = new Map<string, number>()
    for (const id of cards) map.set(id, (map.get(id) ?? 0) + 1)
    return Array.from(map.entries())
  }, [cards])

  return (
    <div className="pile-viewer-backdrop" onClick={onClose}>
      <div className="pile-viewer" onClick={(e) => e.stopPropagation()}>
        <div className="pile-viewer-header">
          <h3>{type === 'draw' ? 'Draw Pile' : 'Discard Pile'}</h3>
          <button type="button" onClick={onClose}>Close</button>
        </div>
        <div className="pile-viewer-list">
          {counts.length === 0 && <p className="pile-empty">Empty</p>}
          {counts.map(([cardId, count]) => {
            const def = cardDefs[cardId]
            const nameTokens = scopedTokens(tokenizeReaderText(def?.name.chinese ?? cardId, words), `pile-${cardId}`)
            return (
              <div key={cardId} className="pile-entry">
                <span className="pile-count">{count}x</span>
                <span className="pile-card-cost">{def?.cost ?? '?'}</span>
                <AdaptiveChineseText
                  tokens={nameTokens}
                  selectedToken={selectedToken}
                  pinyinMode={pinyinMode}
                  onSelectToken={onSelectToken}
                  className="pile-card-name"
                />
                <span className="pile-card-en">{def?.name.english ?? cardId}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function CardView({ cardId, cardDef, index, words, pinyinMode, selectedToken, onSelectToken, onPlay, playable }: {
  cardId: string
  cardDef: CardDefinition | undefined
  index: number
  words: VocabWord[]
  pinyinMode: AdaptivePinyinMode
  selectedToken: ReaderWordToken | null
  onSelectToken: (token: ReaderWordToken | null) => void
  onPlay: () => void
  playable: boolean
}) {
  const nameTokens = useMemo(
    () => scopedTokens(tokenizeReaderText(cardDef?.name.chinese ?? cardId, words), `card-name-${index}`),
    [cardDef, cardId, words, index]
  )
  const descTokens = useMemo(
    () => scopedTokens(tokenizeReaderText(cardDef?.description.chinese ?? '', words), `card-desc-${index}`),
    [cardDef, words, index]
  )

  if (!cardDef) {
    return <div className="battler-card missing">Missing: {cardId}</div>
  }

  const costClass = cardDef.cost === 0 ? 'card-cost-free' : cardDef.cost >= 2 ? 'card-cost-expensive' : ''

  return (
    <div
      className={`battler-card ${playable ? 'playable' : 'unplayable'} ${cardDef.exhaust ? 'card-exhausts' : ''}`}
      onClick={playable ? onPlay : undefined}
      role="button"
      tabIndex={0}
    >
      <div className={`card-cost ${costClass}`}>{cardDef.cost}</div>
      <div className="card-name">
        <AdaptiveChineseText
          tokens={nameTokens}
          selectedToken={selectedToken}
          pinyinMode={pinyinMode}
          onSelectToken={onSelectToken}
        />
      </div>
      <div className="card-type-badge">
        {getCardTypeLabel(cardDef)}
      </div>
      <div className="card-desc">
        <AdaptiveChineseText
          tokens={descTokens}
          selectedToken={selectedToken}
          pinyinMode={pinyinMode}
          onSelectToken={onSelectToken}
        />
      </div>
      {cardDef.exhaust && <div className="card-keyword">Exhaust</div>}
    </div>
  )
}

function getCardTypeLabel(cardDef: CardDefinition): string {
  const hasDamage = cardDef.effects.some((e) => e.type === 'damage')
  const hasBlock = cardDef.effects.some((e) => e.type === 'block')
  if (hasDamage && hasBlock) return 'Attack / Skill'
  if (hasDamage) return 'Attack'
  if (hasBlock) return 'Skill'
  return 'Power'
}

function scopedTokens(tokens: ReaderWordToken[], prefix: string): ReaderWordToken[] {
  return tokens.map((token) => ({ ...token, id: `${prefix}-${token.id}` }))
}

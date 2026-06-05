import { useCallback, useEffect, useMemo, useState } from 'react'
import { AdaptiveChineseText } from '../AdaptiveChineseText'
import { tokenizeReaderText, type AdaptivePinyinMode } from '../adaptiveText'
import type { VocabWord, ReaderWordToken, HotkeySettings } from '../types'
import type { CardBattlerState, CardDefinition, EnemyDefinition } from './types'
import { playCard, endTurn } from './engine'

export interface CardBattlerModeProps {
  initialState: CardBattlerState
  enemyDef: EnemyDefinition
  cards: Record<string, CardDefinition>
  words: VocabWord[]
  pinyinMode: AdaptivePinyinMode
  hotkeys: HotkeySettings
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
  onBattleEnd,
  onSelectToken,
}: CardBattlerModeProps) {
  const [state, setState] = useState<CardBattlerState>(initialState)
  const [selectedToken, setSelectedToken] = useState<ReaderWordToken | null>(null)

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
      if (nextState.status !== 'active') {
        onBattleEnd(nextState)
      }
    }
  }, [state, cards, onBattleEnd])

  const handleEndTurn = useCallback(() => {
    const nextState = endTurn(state, enemyDef)
    if (nextState !== state) {
      setState(nextState)
      if (nextState.status !== 'active') {
        onBattleEnd(nextState)
      }
    }
  }, [state, enemyDef, onBattleEnd])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
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

  return (
    <div className="card-battler-mode">
      <div className="battler-header">
        <div className="player-stats">
          <h2>Player</h2>
          <p>HP: {state.playerHp} / {state.playerMaxHp}</p>
          <p>Block: {state.playerBlock}</p>
          <p>Energy: {state.playerEnergy} / {state.playerMaxEnergy}</p>
        </div>
        
        <div className="enemy-stats">
          <h2>{enemyDef.name.chinese}</h2>
          <p>HP: {state.enemyHp} / {state.enemyMaxHp}</p>
          <p>Block: {state.enemyBlock}</p>
          <div className="enemy-intent">
            <span className="intent-icon">!</span>
            <AdaptiveChineseText
              tokens={intentTokens}
              selectedToken={selectedToken}
              pinyinMode={pinyinMode}
              onSelectToken={handleSelectToken}
              className="intent-text"
            />
            {intent.amount && <span className="intent-amount"> {intent.amount}</span>}
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
          <span>Draw: {state.drawPile.length}</span>
          <span>Discard: {state.discardPile.length}</span>
          <span>Exhaust: {state.exhaustPile.length}</span>
        </div>
      </div>

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

  return (
    <div 
      className={`battler-card ${playable ? 'playable' : 'unplayable'}`} 
      onClick={playable ? onPlay : undefined}
      role="button"
      tabIndex={0}
    >
      <div className="card-cost">{cardDef.cost}</div>
      <div className="card-name">
        <AdaptiveChineseText
          tokens={nameTokens}
          selectedToken={selectedToken}
          pinyinMode={pinyinMode}
          onSelectToken={onSelectToken}
        />
      </div>
      <div className="card-desc">
        <AdaptiveChineseText
          tokens={descTokens}
          selectedToken={selectedToken}
          pinyinMode={pinyinMode}
          onSelectToken={onSelectToken}
        />
      </div>
    </div>
  )
}

function scopedTokens(tokens: ReaderWordToken[], prefix: string): ReaderWordToken[] {
  return tokens.map((token) => ({ ...token, id: `${prefix}-${token.id}` }))
}

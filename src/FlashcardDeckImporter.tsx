import { useMemo, useState } from 'react'
import { makeWordId } from './csv'
import { getAllWords, updateWordText, upsertWords } from './db'
import { customDeckId, effectiveWordDeckIds } from './flashcardDecks'
import { CsvParser } from './parsers'
import type { VocabDeckId, VocabWord } from './types'

type ImportMode = 'new' | 'add' | 'update'

interface DeckOption {
  id: VocabDeckId
  name: string
}

export function FlashcardDeckImporter({
  decks,
  onComplete,
}: {
  decks: DeckOption[]
  onComplete: (message: string, selectedDeckId?: VocabDeckId) => void | Promise<void>
}) {
  const [mode, setMode] = useState<ImportMode>('new')
  const [deckName, setDeckName] = useState('')
  const [targetDeckId, setTargetDeckId] = useState<VocabDeckId>(decks[0]?.id ?? 'original')
  const [fileName, setFileName] = useState('')
  const [parsedWords, setParsedWords] = useState<Partial<VocabWord>[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const effectiveTargetId = mode === 'new' ? customDeckId(deckName) : targetDeckId
  const duplicateDeck = mode === 'new' && decks.some((deck) => deck.id === effectiveTargetId)
  const ready = parsedWords.length > 0 && !busy && (
    mode === 'new' ? deckName.trim().length > 0 && !duplicateDeck : Boolean(targetDeckId)
  )
  const preview = useMemo(() => parsedWords.slice(0, 5), [parsedWords])

  async function chooseFile(files: FileList | null) {
    const file = files?.[0]
    if (!file) return
    setBusy(true)
    setError('')
    setParsedWords([])
    try {
      const parsed = await new CsvParser().parse(await file.text())
      const words = parsed.words.filter((word) => word.word && word.meaning)
      if (words.length === 0) throw new Error('No cards were found. Include word/hanzi and meaning/English columns.')
      setFileName(file.name)
      setParsedWords(words)
      if (mode === 'new' && !deckName.trim()) setDeckName(file.name.replace(/\.csv$/i, ''))
    } catch (reason) {
      setFileName('')
      setError(reason instanceof Error ? reason.message : 'Could not read that CSV file.')
    } finally {
      setBusy(false)
    }
  }

  async function importCards() {
    if (!ready) return
    setBusy(true)
    setError('')
    try {
      const allWords = await getAllWords()
      const existingById = new Map(allWords.map((word) => [word.id, word]))

      if (mode === 'update') {
        let updated = 0
        let skipped = 0
        for (const incoming of parsedWords) {
          const id = incoming.id ?? makeWordId(incoming.word ?? '')
          const existing = existingById.get(id)
          if (!existing || !effectiveWordDeckIds(existing).includes(targetDeckId)) {
            skipped += 1
            continue
          }
          await updateWordText(existing.id, {
            word: incoming.word || existing.word,
            pinyin: incoming.pinyin || existing.pinyin || '',
            meaning: incoming.meaning || existing.meaning,
            notes: incoming.notes || existing.notes || '',
          })
          updated += 1
        }
        await onComplete(
          `Updated ${updated} matching ${updated === 1 ? 'card' : 'cards'} in this deck without changing FSRS progress.${skipped ? ` Skipped ${skipped} cards that were not already in the deck.` : ''}`,
          targetDeckId,
        )
      } else {
        const now = new Date().toISOString()
        const cards: VocabWord[] = parsedWords.map((word, index) => ({
          id: word.id ?? makeWordId(word.word ?? ''),
          word: word.word ?? '',
          meaning: word.meaning ?? '',
          pinyin: word.pinyin,
          notes: word.notes,
          status: 'new',
          lessonNumber: word.lessonNumber ?? Math.ceil((index + 1) / 5),
          deckIds: [effectiveTargetId],
          createdAt: now,
          updatedAt: now,
          seenCount: 0,
          correctCount: 0,
          wrongCount: 0,
          listenedSeconds: 0,
        }))
        const summary = await upsertWords(cards)
        await onComplete(
          `${mode === 'new' ? 'Created' : 'Added to'} “${mode === 'new' ? deckName.trim() : decks.find((deck) => deck.id === targetDeckId)?.name ?? 'deck'}”: ${summary.created} new and ${summary.updated} existing cards. FSRS progress was preserved.`,
          effectiveTargetId,
        )
      }
      setFileName('')
      setParsedWords([])
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not import that deck.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="flashcard-deck-importer" aria-labelledby="deck-import-title">
      <h3 id="deck-import-title">Import a CSV deck</h3>
      <p>Use columns such as <strong>word</strong>, <strong>pinyin</strong>, and <strong>meaning</strong>. Matching words keep their review history.</p>
      <div className="deck-import-mode" aria-label="CSV import action">
        {([
          ['new', 'New deck'],
          ['add', 'Add cards'],
          ['update', 'Update cards'],
        ] as const).map(([value, label]) => (
          <button type="button" className={mode === value ? 'active' : ''} key={value} onClick={() => setMode(value)}>{label}</button>
        ))}
      </div>
      {mode === 'new' ? (
        <label className="deck-import-field">
          <span>Deck name</span>
          <input value={deckName} onChange={(event) => setDeckName(event.target.value)} placeholder="My vocabulary deck" />
          {duplicateDeck && <small>A deck with this name already exists. Choose “Add cards” instead.</small>}
        </label>
      ) : (
        <label className="deck-import-field">
          <span>{mode === 'add' ? 'Add to deck' : 'Update deck'}</span>
          <select value={targetDeckId} onChange={(event) => setTargetDeckId(event.target.value)}>
            {decks.map((deck) => <option key={deck.id} value={deck.id}>{deck.name}</option>)}
          </select>
        </label>
      )}
      <label className="file-button deck-csv-button">
        {fileName || 'Choose CSV file'}
        <input type="file" accept=".csv,text/csv" onChange={(event) => void chooseFile(event.target.files)} />
      </label>
      {parsedWords.length > 0 && (
        <div className="deck-import-preview">
          <strong>{parsedWords.length} cards ready</strong>
          {preview.map((word) => <span key={word.id}>{word.word} · {word.meaning}</span>)}
          {parsedWords.length > preview.length && <small>and {parsedWords.length - preview.length} more…</small>}
        </div>
      )}
      {error && <p className="deck-import-error" role="alert">{error}</p>}
      <button type="button" className="primary" disabled={!ready} onClick={() => void importCards()}>
        {busy ? 'Importing…' : mode === 'new' ? 'Create deck' : mode === 'add' ? 'Add to deck' : 'Update matching cards'}
      </button>
    </section>
  )
}

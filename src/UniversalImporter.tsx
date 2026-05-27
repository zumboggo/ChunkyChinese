import { useState, useEffect } from 'react'
import { TextParser, CsvParser, type ParsedContent } from './parsers'
import { upsertWords, upsertSentences, getDictionaryCount, downloadDictionary } from './db'
import type { ImportSummary, Sentence, VocabWord } from './types'

export function UniversalImporter({ onComplete }: { onComplete: (summary: string) => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [parsed, setParsed] = useState<ParsedContent | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dictCount, setDictCount] = useState(0)
  const [downloadingDict, setDownloadingDict] = useState(false)
  const [dictProgress, setDictProgress] = useState('')

  useEffect(() => {
    getDictionaryCount().then(setDictCount).catch(console.error)
  }, [])

  async function handleDownloadDict() {
    setDownloadingDict(true)
    setError('')
    setDictProgress('Starting download...')
    try {
      await downloadDictionary((progress) => setDictProgress(progress))
      const count = await getDictionaryCount()
      setDictCount(count)
      onComplete(`Downloaded offline dictionary with ${count} entries.`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error downloading dictionary')
    } finally {
      setDownloadingDict(false)
      setDictProgress('')
    }
  }

  async function handleFileSelect(files: FileList | null) {
    if (!files || files.length === 0) return
    const file = files[0]
    setFile(file)
    setError('')
    setParsed(null)
    setLoading(true)

    try {
      const text = await file.text()
      if (file.name.endsWith('.csv')) {
        const parser = new CsvParser()
        const content = await parser.parse(text)
        setParsed(content)
      } else if (file.name.endsWith('.txt')) {
        const parser = new TextParser()
        const content = await parser.parse(text)
        setParsed(content)
      } else {
        setError('Unsupported file type. Please use .csv or .txt')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error parsing file')
    } finally {
      setLoading(false)
    }
  }

  async function handleImport() {
    if (!parsed) return
    setLoading(true)
    try {
      let wordsSummary: ImportSummary = { created: 0, updated: 0, skipped: 0, warnings: [] }
      let sentencesSummary: ImportSummary = { created: 0, updated: 0, skipped: 0, warnings: [] }
      
      if (parsed.words.length > 0) {
        const now = new Date().toISOString()
        const validWords: VocabWord[] = parsed.words
          .filter(w => w.word && w.id)
          .map((w) => ({
            ...w,
            id: w.id ?? '',
            word: w.word ?? '',
            meaning: w.meaning ?? '',
            status: w.status || 'new',
            createdAt: now,
            updatedAt: now,
            seenCount: 0,
            correctCount: 0,
            wrongCount: 0,
            listenedSeconds: 0,
          }))
        wordsSummary = await upsertWords(validWords)
      }

      if (parsed.sentences.length > 0) {
        const now = new Date().toISOString()
        const validSentences: Sentence[] = parsed.sentences
          .filter(s => s.chinese && s.id)
          .map((s) => ({
            ...s,
            id: s.id ?? '',
            chinese: s.chinese ?? '',
            english: s.english ?? '',
            targetWords: s.targetWords ?? [],
            createdAt: now,
            updatedAt: now,
          }))
        sentencesSummary = await upsertSentences(validSentences)
      }

      onComplete(`Imported ${wordsSummary.created + wordsSummary.updated} words and ${sentencesSummary.created + sentencesSummary.updated} sentences.`)
      setFile(null)
      setParsed(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error importing')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="panel">
      <h2>Universal Importer</h2>
      <p>Upload a .csv or .txt file. The text parser will automatically extract Chinese words.</p>
      
      <div style={{ marginBottom: '1rem', padding: '1rem', background: 'var(--bg-panel-dark)', borderRadius: '8px' }}>
        <h3>Offline Dictionary</h3>
        <p>Current entries: {dictCount}</p>
        {dictCount === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-start' }}>
            <button 
              className="primary" 
              onClick={handleDownloadDict} 
              disabled={downloadingDict}
            >
              {downloadingDict ? 'Downloading...' : 'Download CC-CEDICT (~16MB)'}
            </button>
            {downloadingDict && (
              <span style={{ fontSize: '0.9rem', color: 'var(--accent)', fontWeight: 'bold' }}>
                {dictProgress}
              </span>
            )}
          </div>
        )}
      </div>

      <label className="file-button">
        Choose file
        <input type="file" accept=".csv,.txt" onChange={(e) => handleFileSelect(e.target.files)} />
      </label>

      {loading && <p>Processing...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {parsed && !loading && (
        <div style={{ marginTop: '1rem' }}>
          <h3>Preview: {file?.name}</h3>
          <p>Found {parsed.words.length} words and {parsed.sentences.length} sentences.</p>
          
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button className="primary" onClick={handleImport}>
              Save to Database
            </button>
            <button onClick={() => { setFile(null); setParsed(null) }}>Cancel</button>
          </div>

          <div style={{ marginTop: '1rem', maxHeight: '300px', overflowY: 'auto', background: 'var(--bg-panel)', padding: '1rem' }}>
            {parsed.words.slice(0, 10).map((w, i) => (
              <div key={i}><strong>{w.word}</strong>: {w.meaning || '(no meaning)'} {w.pinyin ? `(${w.pinyin})` : ''}</div>
            ))}
            {parsed.words.length > 10 && <p>...and {parsed.words.length - 10} more words</p>}
          </div>
        </div>
      )}
    </section>
  )
}

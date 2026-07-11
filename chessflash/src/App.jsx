import { useState, useEffect, useRef } from 'react'
import Papa from 'papaparse'
import { Chess } from 'chess.js'
import Home from './components/Home'
import Flashcard from './components/Flashcard'
import AddFlashcard from './components/AddFlashcard'

// ── localStorage ──────────────────────────────────────────────────────────────
const LS_KEY = 'chessflash_cards'
function lsLoad() {
  try { const r = localStorage.getItem(LS_KEY); return r ? JSON.parse(r) : [] }
  catch { return [] }
}
function lsSave(cards) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(cards)) } catch {}
}

// ── FEN diff → UCI (same logic as AddFlashcard modal) ────────────────────────
function fenToMap(fen) {
  try {
    const g = new Chess(fen.trim())
    const map = {}
    g.board().forEach(row => row.forEach(sq => { if (sq) map[sq.square] = { type: sq.type, color: sq.color } }))
    return { map, game: g, ok: true }
  } catch { return { map: {}, game: null, ok: false } }
}

function diffToUci(fenBefore, fenAfter) {
  const { map: bMap, game: bGame, ok: okB } = fenToMap(fenBefore)
  const { map: aMap, ok: okA }              = fenToMap(fenAfter)
  if (!okB || !okA || !bGame) return null

  for (const m of bGame.moves({ verbose: true })) {
    const sim = new Chess(bGame.fen())
    sim.move({ from: m.from, to: m.to, promotion: m.promotion ?? 'q' })
    const simMap = {}
    sim.board().forEach(row => row.forEach(sq => { if (sq) simMap[sq.square] = { type: sq.type, color: sq.color } }))
    const allSq = new Set([...Object.keys(simMap), ...Object.keys(aMap)])
    let match = true
    for (const sq of allSq) {
      const s = simMap[sq], a = aMap[sq]
      if (!s && !a) continue
      if (!s || !a || s.type !== a.type || s.color !== a.color) { match = false; break }
    }
    if (match) return m.from + m.to + (m.promotion ?? '')
  }
  return null
}

// ── Normalise a raw CSV row → card object ─────────────────────────────────────
// Accepts either:
//   bestMove  (already UCI, e.g. "e2e4")        — legacy / app-generated
//   bestMoveFen (FEN after the move)             — manual CSV entry
function normaliseRow(r, fallbackId) {
  const category = r.category?.trim().toLowerCase()
  const fen      = r.fen?.trim()
  const label    = r.label?.trim() || undefined
  const id       = r.id?.trim() || fallbackId

  if (!category || !fen) return null

  // Already has a UCI bestMove (rows saved by the app)
  if (r.bestMove?.trim()) {
    return { id, category, fen, bestMove: r.bestMove.trim(), bestMoveFen: r.bestMoveFen?.trim() || undefined, label, pgn: r.pgn?.trim() || undefined }
  }

  // Has bestMoveFen — derive UCI via diff
  if (r.bestMoveFen?.trim()) {
    const uci = diffToUci(fen, r.bestMoveFen.trim())
    if (!uci) return null
    return { id, category, fen, bestMove: uci, bestMoveFen: r.bestMoveFen.trim(), label, pgn: r.pgn?.trim() || undefined }
  }

  return null  // neither column present
}

// ── CSV download ──────────────────────────────────────────────────────────────
// Always writes bestMove (UCI) so the file round-trips cleanly.
// Also writes bestMoveFen as an empty column so manual editors can fill it in.
function downloadCSV(cards) {
  const rows = cards.map(c => ({
    id:          c.id,
    category:    c.category,
    fen:         c.fen,
    bestMove:    c.bestMove,
    bestMoveFen: c.bestMoveFen ?? '',
    label:       c.label ?? '',
    pgn:         c.pgn ?? '',
  }))
  const csv  = Papa.unparse(rows, { columns: ['id', 'category', 'fen', 'bestMove', 'bestMoveFen', 'label', 'pgn'] })
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url
  a.download = `chessflash_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function parseCSV(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: r => resolve(r.data),
      error:    e => reject(e),
    })
  })
}

// ─────────────────────────────────────────────────────────────────────────────

function App() {
  const [screen,       setScreen]       = useState('home')
  const [category,     setCategory]     = useState(null)
  const [cards,        setCards]        = useState(() => lsLoad())
  const [showAddModal, setShowAddModal] = useState(false)
  const [uploadMsg,    setUploadMsg]    = useState(null)

  const fileInputRef = useRef(null)

  // Persist on every change
  useEffect(() => { lsSave(cards) }, [cards])

  // ── Add card (from modal — already has UCI bestMove) ──────────────────────
  const handleAddCard = (card) => {
    setCards(prev => [...prev, {
      ...card,
      id: String(prev.length > 0 ? Math.max(...prev.map(c => Number(c.id) || 0)) + 1 : 1),
    }])
    setShowAddModal(false)
  }

  // ── Download ──────────────────────────────────────────────────────────────
  const handleDownload = () => {
    if (!cards.length) {
      setUploadMsg({ type: 'error', text: 'No flashcards to download yet.' })
      return
    }
    downloadCSV(cards)
  }

  // ── Upload ────────────────────────────────────────────────────────────────
  const handleUploadClick = () => { setUploadMsg(null); fileInputRef.current?.click() }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    try {
      const rows = await parseCSV(file)
      const normalised = rows
        .map((r, i) => normaliseRow(r, String(i + 1)))
        .filter(Boolean)

      if (!normalised.length) {
        setUploadMsg({ type: 'error', text: 'No valid rows found. Each row needs: id, category, fen, and either bestMove (UCI) or bestMoveFen (FEN after move).' })
        return
      }

      const skipped = rows.length - normalised.length
      setCards(normalised)
      setUploadMsg({
        type: 'success',
        text: `Loaded ${normalised.length} card${normalised.length !== 1 ? 's' : ''}${skipped ? ` (${skipped} row${skipped !== 1 ? 's' : ''} skipped — couldn't parse move)` : ''} from ${file.name}`,
      })
      setTimeout(() => setUploadMsg(null), 5000)
    } catch {
      setUploadMsg({ type: 'error', text: 'Could not read the file. Please upload a valid ChessFlash CSV.' })
    }
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  const handleSelectCategory = (cat) => { setCategory(cat); setScreen('flashcard') }
  const handleGoHome         = ()    => { setScreen('home'); setCategory(null) }

  const filteredCards    = cards.filter(c => c.category?.toLowerCase() === category)
  const countByCategory  = (cat) => cards.filter(c => c.category?.toLowerCase() === cat).length

  return (
    <div className="app">
      <input ref={fileInputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFileChange} />

      {screen === 'home' && (
        <Home
          onSelectCategory={handleSelectCategory}
          onAddCard={() => setShowAddModal(true)}
          onDownload={handleDownload}
          onUpload={handleUploadClick}
          totalCards={cards.length}
          countByCategory={countByCategory}
          uploadMsg={uploadMsg}
          onDismissMsg={() => setUploadMsg(null)}
        />
      )}

      {screen === 'flashcard' && (
        <Flashcard category={category} flashcards={filteredCards} onGoHome={handleGoHome} />
      )}

      {showAddModal && (
        <AddFlashcard onAdd={handleAddCard} onClose={() => setShowAddModal(false)} />
      )}
    </div>
  )
}

export default App

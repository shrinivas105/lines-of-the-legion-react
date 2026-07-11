import { useState, useEffect, useRef } from 'react'
import { Chess } from 'chess.js'

const CATEGORIES = [
  { id: 'opening',  label: 'Opening',  icon: '♟' },
  { id: 'tactics',  label: 'Tactics',  icon: '⚔' },
  { id: 'endgame',  label: 'Endgame',  icon: '♔' },
]

function fenToMap(fen) {
  try {
    const g = new Chess(fen.trim())
    const map = {}
    g.board().forEach((row) =>
      row.forEach((sq) => { if (sq) map[sq.square] = { type: sq.type, color: sq.color } })
    )
    return { map, game: g, ok: true }
  } catch {
    return { map: {}, game: null, ok: false }
  }
}

function diffToMove(beforeMap, afterMap, beforeGame) {
  if (!beforeGame) return null
  for (const m of beforeGame.moves({ verbose: true })) {
    const sim = new Chess(beforeGame.fen())
    sim.move({ from: m.from, to: m.to, promotion: m.promotion ?? 'q' })
    const simMap = {}
    sim.board().forEach((row) =>
      row.forEach((sq) => { if (sq) simMap[sq.square] = { type: sq.type, color: sq.color } })
    )
    const allSq = new Set([...Object.keys(simMap), ...Object.keys(afterMap)])
    let match = true
    for (const sq of allSq) {
      const s = simMap[sq]; const a = afterMap[sq]
      if (!s && !a) continue
      if (!s || !a || s.type !== a.type || s.color !== a.color) { match = false; break }
    }
    if (match) return { from: m.from, to: m.to, uci: m.from + m.to + (m.promotion ?? ''), san: m.san }
  }
  return null
}

function validate(category, fenBefore, fenAfter) {
  const errors = {}
  if (!category) errors.category = 'Please select a category.'

  const before = fenBefore.trim()
  const after  = fenAfter.trim()

  if (!before) {
    errors.fenBefore = 'Paste the starting position FEN here.'
  } else if (!fenToMap(before).ok) {
    errors.fenBefore = 'Invalid FEN — check and try again.'
  }

  if (!after) {
    errors.fenAfter = 'Paste the FEN after the best move is played.'
  } else if (!fenToMap(after).ok) {
    errors.fenAfter = 'Invalid FEN — check and try again.'
  }

  if (!errors.fenBefore && !errors.fenAfter) {
    const { map: bMap, game: bGame } = fenToMap(before)
    const { map: aMap }              = fenToMap(after)
    if (!diffToMove(bMap, aMap, bGame)) {
      errors.fenAfter = "Couldn't detect a single legal move between these two positions. Make sure they're exactly one move apart."
    }
  }

  return errors
}

// ─────────────────────────────────────────────────────────────────────────────

function AddFlashcard({ onAdd, onClose }) {
  const [category,  setCategory]  = useState('')
  const [fenBefore, setFenBefore] = useState('')
  const [fenAfter,  setFenAfter]  = useState('')
  const [label,     setLabel]     = useState('')   // optional
  const [pgn,       setPgn]       = useState('')   // optional
  const [errors,    setErrors]    = useState({})
  const [touched,   setTouched]   = useState({})
  const [derived,   setDerived]   = useState(null)

  const overlayRef = useRef(null)

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const handleOverlayClick = (e) => { if (e.target === overlayRef.current) onClose() }
  const touch = (f) => setTouched((t) => ({ ...t, [f]: true }))

  // Auto-derive move whenever both FENs change
  useEffect(() => {
    const before = fenBefore.trim(); const after = fenAfter.trim()
    if (!before || !after) { setDerived(null); return }
    const { map: bMap, game: bGame, ok: okB } = fenToMap(before)
    const { map: aMap, ok: okA }              = fenToMap(after)
    if (!okB || !okA) { setDerived(null); return }
    setDerived(diffToMove(bMap, aMap, bGame))
  }, [fenBefore, fenAfter])

  // Live validation on touched fields
  useEffect(() => {
    if (Object.keys(touched).length === 0) return
    const errs = validate(category, fenBefore, fenAfter)
    const filtered = {}
    Object.keys(touched).forEach((k) => { if (errs[k]) filtered[k] = errs[k] })
    setErrors(filtered)
  }, [category, fenBefore, fenAfter, touched])

  const handleSubmit = (e) => {
    e.preventDefault()
    setTouched({ category: true, fenBefore: true, fenAfter: true })
    const errs = validate(category, fenBefore, fenAfter)
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    const { map: bMap, game: bGame } = fenToMap(fenBefore.trim())
    const { map: aMap }              = fenToMap(fenAfter.trim())
    const diff = diffToMove(bMap, aMap, bGame)

    onAdd({
      category,
      fen:         fenBefore.trim(),
      bestMove:    diff.uci,
      bestMoveFen: fenAfter.trim(),
      label:       label.trim() || undefined,
      pgn:         pgn.trim()   || undefined,
    })
  }

  const hasError = (f) => touched[f] && errors[f]

  return (
    <div
      className="modal-overlay"
      ref={overlayRef}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label="Add new flashcard"
    >
      <div className="modal">
        {/* Header */}
        <div className="modal-header">
          <h2 className="modal-title">
            <span className="modal-title-icon">➕</span>
            Add New Flashcard
          </h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit} noValidate>

          {/* Category */}
          <div className="form-group">
            <label className="form-label">Category</label>
            <div className="cat-pills">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`cat-pill cat-pill--${c.id}${category === c.id ? ' cat-pill--active' : ''}`}
                  onClick={() => { setCategory(c.id); touch('category') }}
                >
                  {c.icon} {c.label}
                </button>
              ))}
            </div>
            {hasError('category') && <p className="form-error">{errors.category}</p>}
          </div>

          {/* Optional label */}
          <div className="form-group">
            <label className="form-label" htmlFor="card-label">
              Name / Label
              <span className="form-optional-badge">optional</span>
            </label>
            <input
              id="card-label"
              type="text"
              className="form-input"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Alapin Exchange Variation"
              maxLength={80}
              autoComplete="off"
            />
            <p className="form-hint">
              A short name shown above the board — helps you remember the idea.
            </p>
          </div>

          {/* FEN Before */}
          <div className="form-group">
            <label className="form-label" htmlFor="fen-before">
              Starting Position FEN
              <span className="form-step-badge">Step 1</span>
            </label>
            <textarea
              id="fen-before"
              className={`form-input form-textarea${hasError('fenBefore') ? ' form-input--error' : ''}`}
              value={fenBefore}
              onChange={(e) => setFenBefore(e.target.value)}
              onBlur={() => touch('fenBefore')}
              placeholder="Paste FEN here…"
              rows={2}
              spellCheck={false}
              autoComplete="off"
            />
            {hasError('fenBefore')
              ? <p className="form-error">{errors.fenBefore}</p>
              : <p className="form-hint">
                  In Lichess: pause at the puzzle → <strong>Share &amp; export → Copy FEN</strong>
                </p>
            }
          </div>

          {/* FEN After */}
          <div className="form-group">
            <label className="form-label" htmlFor="fen-after">
              FEN After Best Move
              <span className="form-step-badge">Step 2</span>
            </label>
            <textarea
              id="fen-after"
              className={`form-input form-textarea${hasError('fenAfter') ? ' form-input--error' : ''}`}
              value={fenAfter}
              onChange={(e) => setFenAfter(e.target.value)}
              onBlur={() => touch('fenAfter')}
              placeholder="Play the best move on Lichess, then paste the new FEN…"
              rows={2}
              spellCheck={false}
              autoComplete="off"
            />
            {hasError('fenAfter')
              ? <p className="form-error">{errors.fenAfter}</p>
              : <p className="form-hint">
                  Play the correct move on the board, then copy that updated FEN the same way.
                </p>
            }
          </div>

          {/* Optional PGN */}
          <div className="form-group">
            <label className="form-label" htmlFor="card-pgn">
              Full Game PGN
              <span className="form-optional-badge">optional</span>
            </label>
            <textarea
              id="card-pgn"
              className="form-input form-textarea"
              value={pgn}
              onChange={(e) => setPgn(e.target.value)}
              placeholder={'[Event "?"]\n[White "?"]\n[Black "?"]\n\n1.e4 e5 2.Nf3 …'}
              rows={4}
              spellCheck={false}
              autoComplete="off"
            />
            <p className="form-hint">
              Paste the full game PGN — players can step through it after solving the card.
              In Lichess: <strong>Share &amp; export → Copy PGN</strong>
            </p>
          </div>

          {/* Move preview */}
          {derived && !errors.fenAfter && (
            <div className="move-preview">
              <span className="move-preview-check">✅</span>
              <span className="move-preview-label">Move detected:</span>
              <span className="move-preview-san">{derived.san}</span>
              <span className="move-preview-uci">({derived.uci})</span>
            </div>
          )}

          {/* Actions */}
          <div className="modal-actions">
            <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn--primary">Save Flashcard</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddFlashcard

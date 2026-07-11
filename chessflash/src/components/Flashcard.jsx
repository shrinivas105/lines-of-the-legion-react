import { useState, useEffect, useCallback, useRef } from 'react'
import { Chessboard } from 'react-chessboard'
import { Chess } from 'chess.js'
import PgnViewer from './PgnViewer'

// ── Highlight colours (steel blue) ───────────────────────────────────────────
const HL_SELECTED = { background: 'rgba(59,130,246,0.9)',  borderRadius: '6px' }
const HL_LEGAL    = { background: 'radial-gradient(circle, rgba(59,130,246,0.55) 28%, transparent 32%)' }
const HL_CAPTURE  = { background: 'radial-gradient(circle, rgba(59,130,246,0.65) 65%, transparent 70%)', borderRadius: '50%' }
const HL_SOLUTION = { background: 'rgba(34,197,94,0.55)', borderRadius: '4px' }

function legalStyles(game, square) {
  const styles = { [square]: HL_SELECTED }
  game.moves({ square, verbose: true }).forEach(({ to, flags }) => {
    styles[to] = flags.includes('c') || flags.includes('e') ? HL_CAPTURE : HL_LEGAL
  })
  return styles
}

// ── Fisher-Yates shuffle ──────────────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ─────────────────────────────────────────────────────────────────────────────

function Flashcard({ category, flashcards, onGoHome }) {
  const [fen,         setFen]         = useState(null)
  const [status,      setStatus]      = useState('idle')  // idle | correct | wrong | solution
  const [highlights,  setHighlights]  = useState({})
  const [showPgn,     setShowPgn]     = useState(false)
  const [boardWidth,  setBoardWidth]  = useState(() => Math.min(window.innerWidth - 32, 480))

  // Shuffled deck + cursor
  const deckRef     = useRef([])
  const cursorRef   = useRef(0)

  // Mutable interaction refs — no stale-closure issues
  const gameRef     = useRef(null)
  const cardRef     = useRef(null)
  const selectedRef = useRef(null)

  // ── Resize ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const update = () => setBoardWidth(Math.min(window.innerWidth - 32, 480))
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  // ── Build / rebuild shuffled deck ─────────────────────────────────────────
  useEffect(() => {
    deckRef.current   = shuffle(flashcards)
    cursorRef.current = 0
  }, [flashcards])

  // ── Load a card ───────────────────────────────────────────────────────────
  const loadCard = useCallback((card) => {
    const g = new Chess(card.fen)
    gameRef.current     = g
    cardRef.current     = card
    selectedRef.current = null
    setFen(g.fen())
    setStatus('idle')
    setHighlights({})
    setShowPgn(false)
  }, [])

  // ── Advance to next card ──────────────────────────────────────────────────
  const goNext = useCallback(() => {
    const deck = deckRef.current
    if (!deck.length) return
    cursorRef.current += 1
    if (cursorRef.current >= deck.length) {
      deckRef.current   = shuffle(flashcards)
      cursorRef.current = 0
    }
    loadCard(deckRef.current[cursorRef.current])
  }, [flashcards, loadCard])

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (flashcards.length) loadCard(deckRef.current[0])
  }, []) // intentionally once

  // ── UCI → SAN ─────────────────────────────────────────────────────────────
  const uciToSan = (baseFen, uci) => {
    try {
      const g    = new Chess(baseFen)
      const from = uci.slice(0, 2), to = uci.slice(2, 4), promo = uci.slice(4) || undefined
      const m    = g.move({ from, to, promotion: promo ?? 'q' })
      return m ? m.san : uci
    } catch { return uci }
  }

  // ── Attempt move ──────────────────────────────────────────────────────────
  const attemptMove = useCallback((from, to) => {
    const g    = gameRef.current
    const card = cardRef.current
    if (!g || !card) return false

    const piece       = g.get(from)
    const isPawnPromo = piece?.type === 'p' && (to[1] === '8' || to[1] === '1')

    const copy = new Chess(g.fen())
    let move = null
    try { move = copy.move({ from, to, promotion: isPawnPromo ? 'q' : undefined }) }
    catch { return false }
    if (!move) return false

    const played = (from + to + (isPawnPromo ? 'q' : '')).toLowerCase()
    const best   = card.bestMove.trim().toLowerCase()

    selectedRef.current = null
    setHighlights({})

    if (played === best) {
      gameRef.current = copy
      setFen(copy.fen())
      setStatus('correct')
      return true
    } else {
      setStatus('wrong')
      return false
    }
  }, [])

  // ── Square click ──────────────────────────────────────────────────────────
  const onSquareClick = useCallback((square) => {
    const g = gameRef.current
    if (!g) return
    if (status === 'correct' || status === 'wrong' || status === 'solution') return

    const piece    = g.get(square)
    const myColor  = g.turn()
    const selected = selectedRef.current

    if (!selected) {
      if (piece && piece.color === myColor) {
        selectedRef.current = square
        setHighlights(legalStyles(g, square))
      }
      return
    }

    if (square === selected) {
      selectedRef.current = null
      setHighlights({})
      return
    }

    if (piece && piece.color === myColor) {
      selectedRef.current = square
      setHighlights(legalStyles(g, square))
      return
    }

    attemptMove(selected, square)
  }, [status, attemptMove])

  // ── Drag ──────────────────────────────────────────────────────────────────
  const onPieceDrop = useCallback((from, to) => {
    if (status === 'correct' || status === 'wrong' || status === 'solution') return false
    selectedRef.current = null
    setHighlights({})
    return attemptMove(from, to)
  }, [status, attemptMove])

  // ── Retry ─────────────────────────────────────────────────────────────────
  const handleRetry = () => {
    const card = cardRef.current
    if (!card) return
    const g = new Chess(card.fen)
    gameRef.current     = g
    selectedRef.current = null
    setFen(g.fen())
    setStatus('idle')
    setHighlights({})
  }

  // ── Show solution ─────────────────────────────────────────────────────────
  const handleShowSolution = () => {
    const card = cardRef.current
    if (!card) return
    const from = card.bestMove.slice(0, 2)
    const to   = card.bestMove.slice(2, 4)
    selectedRef.current = null
    setHighlights({ [from]: HL_SOLUTION, [to]: HL_SOLUTION })
    setStatus('solution')
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const game        = gameRef.current
  const currentCard = cardRef.current
  const sideToMove  = game ? (game.turn() === 'w' ? 'White to move' : 'Black to move') : ''
  const orientation = currentCard?.fen?.split(' ')[1] === 'b' ? 'black' : 'white'
  const bestMoveSan = currentCard ? uciToSan(currentCard.fen, currentCard.bestMove) : ''
  const catLabel    = category ? category.charAt(0).toUpperCase() + category.slice(1) : ''
  const canInteract = status === 'idle'
  const hasPgn      = !!currentCard?.pgn
  const progress    = deckRef.current.length
    ? `${cursorRef.current + 1} / ${deckRef.current.length}`
    : ''

  // ── Empty / loading ───────────────────────────────────────────────────────
  if (!flashcards.length) {
    return (
      <div className="fc-empty">
        <p>No flashcards in <strong>{catLabel}</strong> yet.</p>
        <p className="fc-empty-hint">Add some from the Home screen first.</p>
        <button className="btn btn--ghost" onClick={onGoHome}>← Back to Home</button>
      </div>
    )
  }

  if (!fen || !game) {
    return <div className="splash"><div className="splash-inner"><p>Loading…</p></div></div>
  }

  // ── PGN button — shown in top-right always when card has PGN ─────────────
  const PgnButton = () => hasPgn ? (
    <button
      className="btn btn--ghost btn--sm pgn-trigger-btn"
      onClick={() => setShowPgn(true)}
      title="View full game"
    >
      📖 Game
    </button>
  ) : null

  return (
    <div className="fc">
      {/* Top bar */}
      <div className="fc-topbar">
        <button className="btn btn--ghost btn--sm" onClick={onGoHome}>← Home</button>
        <span className="fc-progress">{progress}</span>
        <div className="fc-topbar-right">
          <PgnButton />
          <span className={`fc-badge fc-badge--${category}`}>{catLabel}</span>
        </div>
      </div>

      {/* Optional card label */}
      {currentCard?.label && (
        <div className="fc-label">{currentCard.label}</div>
      )}

      {/* Side-to-move */}
      <div className="fc-side">
        <span className={`side-dot side-dot--${game.turn()}`} />
        {sideToMove}
      </div>

      {/* Board */}
      <div className="fc-board">
        <Chessboard
          id="flashcard-board"
          position={fen}
          onPieceDrop={onPieceDrop}
          onSquareClick={onSquareClick}
          boardOrientation={orientation}
          boardWidth={boardWidth}
          customSquareStyles={highlights}
          animationDuration={150}
          areArrowsAllowed={false}
          arePiecesDraggable={canInteract}
          customBoardStyle={{
            borderRadius: '8px',
            boxShadow: '0 12px 48px rgba(0,0,0,0.6)',
          }}
        />
      </div>

      {/* Feedback */}
      <div className="fc-feedback">
        {status === 'idle' && (
          <div className="fc-idle-row">
            <p className="hint">
              {selectedRef.current ? 'Click the destination square' : 'Click a piece to select it'}
            </p>
            <div className="fc-idle-actions">
              {hasPgn && (
                <button className="btn btn--ghost btn--sm" onClick={() => setShowPgn(true)}>
                  📖 Game
                </button>
              )}
              <button className="btn btn--ghost btn--sm skip-btn" onClick={goNext}>
                Skip →
              </button>
            </div>
          </div>
        )}

        {status === 'correct' && (
          <div className="feedback feedback--correct">
            <div className="feedback-row">
              <span>✅ Correct! Well done</span>
              <div className="fc-btn-group">
                {hasPgn && (
                  <button className="btn btn--ghost btn--sm" onClick={() => setShowPgn(true)}>
                    📖 Game
                  </button>
                )}
                <button className="btn btn--primary btn--sm" onClick={goNext}>Next →</button>
              </div>
            </div>
          </div>
        )}

        {status === 'wrong' && (
          <div className="feedback feedback--wrong">
            <p>❌ Wrong move — try again!</p>
            <div className="fc-actions">
              <button className="btn btn--secondary" onClick={handleRetry}>↺ Retry</button>
              <button className="btn btn--ghost"     onClick={handleShowSolution}>💡 Solution</button>
              {hasPgn && (
                <button className="btn btn--ghost" onClick={() => setShowPgn(true)}>📖 Game</button>
              )}
              <button className="btn btn--ghost"     onClick={goNext}>Skip →</button>
            </div>
          </div>
        )}

        {status === 'solution' && (
          <div className="feedback feedback--solution">
            <div className="feedback-row">
              <p>Best move: <strong className="best-move-san">{bestMoveSan}</strong></p>
              <div className="fc-btn-group">
                {hasPgn && (
                  <button className="btn btn--ghost btn--sm" onClick={() => setShowPgn(true)}>
                    📖 Game
                  </button>
                )}
                <button className="btn btn--primary btn--sm" onClick={goNext}>Next →</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* PGN viewer modal */}
      {showPgn && currentCard?.pgn && (
        <PgnViewer
          pgn={currentCard.pgn}
          orientation={currentCard.fen?.split(' ')[1] === 'b' ? 'black' : 'white'}
          onClose={() => setShowPgn(false)}
        />
      )}
    </div>
  )
}

export default Flashcard

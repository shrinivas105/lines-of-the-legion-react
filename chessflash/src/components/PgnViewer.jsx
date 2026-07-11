import { useState, useEffect, useRef, useCallback } from 'react'
import { Chess } from 'chess.js'

// ── Cburnett piece images (same source as Lichess) ────────────────────────────
const PIECE_BASE = 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/cburnett/'
const PIECE_KEYS = ['wK','wQ','wR','wB','wN','wP','bK','bQ','bR','bB','bN','bP']

const pieceImages = {}
let piecesLoaded  = 0
let piecesReady   = false
const onReadyCbs  = []

function preloadPieces() {
  PIECE_KEYS.forEach(key => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    const done = () => {
      piecesLoaded++
      if (piecesLoaded === PIECE_KEYS.length) {
        piecesReady = true
        onReadyCbs.forEach(cb => cb())
        onReadyCbs.length = 0
      }
    }
    img.onload  = done
    img.onerror = done
    img.src = PIECE_BASE + key + '.svg'
    pieceImages[key] = img
  })
}
preloadPieces()

function whenPiecesReady(cb) {
  if (piecesReady) cb()
  else onReadyCbs.push(cb)
}

// ── Board renderer (ported from your PGN printer) ─────────────────────────────
function fenToBoard(fen) {
  return fen.split(' ')[0].split('/').map(rank => {
    const row = []
    for (const ch of rank) {
      if (/\d/.test(ch)) for (let i = 0; i < +ch; i++) row.push(null)
      else row.push(ch)
    }
    return row
  })
}

function drawBoard(ctx, fen, fromSq, toSq, size, orientation = 'white') {
  const PAD    = Math.round(size * 0.07)
  const boardPx = size - PAD
  const sq     = Math.floor(boardPx / 8)
  const board  = fenToBoard(fen)
  const black  = orientation === 'black'

  // Background
  ctx.fillStyle = '#f5f0e8'
  ctx.fillRect(0, 0, size, size)

  // Squares
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const drawFile = black ? 7 - f : f
      const drawRank = black ? 7 - r : r
      const x      = PAD + drawFile * sq
      const y      = PAD + drawRank * sq
      const sqName = String.fromCharCode(97 + f) + (8 - r)
      let fill
      if      (sqName === fromSq) fill = '#c8a84b'
      else if (sqName === toSq)   fill = '#e8c840'
      else fill = (r + f) % 2 === 0 ? '#f0ede0' : '#9e9080'
      ctx.fillStyle = fill
      ctx.fillRect(x, y, sq, sq)
    }
  }

  // Border
  ctx.strokeStyle = '#333'
  ctx.lineWidth   = 0.8
  ctx.strokeRect(PAD, PAD, 8 * sq, 8 * sq)

  // Coordinates
  const fontSize = Math.max(7, Math.round(sq * 0.27))
  ctx.font      = `${fontSize}px monospace`
  ctx.fillStyle = '#666'
  ctx.textAlign = 'center'
  const files = black ? ['h','g','f','e','d','c','b','a'] : ['a','b','c','d','e','f','g','h']
  for (let f = 0; f < 8; f++) {
    ctx.fillText(files[f], PAD + f * sq + sq / 2, PAD + 8 * sq + PAD * 0.8)
  }
  ctx.textAlign = 'right'
  for (let r = 0; r < 8; r++) {
    const rankLabel = black ? String(r + 1) : String(8 - r)
    ctx.fillText(rankLabel, PAD - 2, PAD + r * sq + sq * 0.65)
  }

  // Pieces
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const piece = board[r][f]
      if (!piece) continue
      const color = piece === piece.toUpperCase() ? 'w' : 'b'
      const key   = color + piece.toUpperCase()
      const img   = pieceImages[key]
      if (img && img.complete && img.naturalWidth > 0) {
        const drawFile = black ? 7 - f : f
        const drawRank = black ? 7 - r : r
        ctx.drawImage(img, PAD + drawFile * sq, PAD + drawRank * sq, sq, sq)
      }
    }
  }

  // Arrow from→to
  if (fromSq && toSq && fromSq !== toSq) {
    const fileFrom = fromSq.charCodeAt(0) - 97
    const rankFrom = parseInt(fromSq[1]) - 1
    const fileTo   = toSq.charCodeAt(0) - 97
    const rankTo   = parseInt(toSq[1]) - 1

    const fromFile = black ? 7 - fileFrom : fileFrom
    const fromRank = black ? rankFrom : 7 - rankFrom
    const toFile   = black ? 7 - fileTo   : fileTo
    const toRank   = black ? rankTo   : 7 - rankTo

    const cx = PAD + fromFile * sq + sq / 2
    const cy = PAD + fromRank * sq + sq / 2
    const ex = PAD + toFile   * sq + sq / 2
    const ey = PAD + toRank   * sq + sq / 2

    const dx = ex - cx, dy = ey - cy
    const len = Math.sqrt(dx * dx + dy * dy)
    const nx = dx / len, ny = dy / len
    const arrowW  = Math.max(3, sq * 0.14)
    const headLen = arrowW * 3.5
    const ax = cx + nx * sq * 0.25
    const ay = cy + ny * sq * 0.25
    const bx = ex - nx * headLen * 0.6
    const by = ey - ny * headLen * 0.6
    const px = -ny, py = nx

    ctx.save()
    ctx.globalAlpha  = 0.88
    ctx.strokeStyle  = '#cc1100'
    ctx.fillStyle    = '#cc1100'
    ctx.lineCap      = 'round'
    ctx.lineWidth    = arrowW
    ctx.beginPath()
    ctx.moveTo(ax, ay)
    ctx.lineTo(bx, by)
    ctx.stroke()
    const hw = arrowW * 1.6
    ctx.beginPath()
    ctx.moveTo(ex - nx * headLen + px * hw, ey - ny * headLen + py * hw)
    ctx.lineTo(ex, ey)
    ctx.lineTo(ex - nx * headLen - px * hw, ey - ny * headLen - py * hw)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }
}

// ── Parse PGN → array of { san, from, to, fen } ───────────────────────────────
function parsePgn(pgn) {
  // chess.js v1.x: loadPgn() throws on failure (no return value)
  // header() was renamed to getHeaders() in v1.x but some builds still have header()
  // We try both and fall back gracefully.

  const tryLoad = (text) => {
    const chess = new Chess()
    try {
      chess.loadPgn(text.trim())
      return chess
    } catch {
      return null
    }
  }

  const strip = (text) =>
    text
      .replace(/\{[^}]*\}/g, '')   // remove { comments }
      .replace(/\([^)]*\)/g, '')   // remove (variations)
      .replace(/\$\d+/g, '')       // remove NAG annotations like $1
      .replace(/\s+/g, ' ')
      .trim()

  let chess = tryLoad(pgn) ?? tryLoad(strip(pgn))
  if (!chess) return { moves: [], headers: {}, error: 'Could not parse PGN. Make sure it is a valid Lichess PGN.' }

  // header() API: v0.x = chess.header(), v1.x = chess.getHeaders() — try both
  let headers = {}
  try { headers = typeof chess.getHeaders === 'function' ? chess.getHeaders() : chess.header() }
  catch { headers = {} }

  const history = chess.history({ verbose: true })
  if (!history.length) return { moves: [], headers, error: 'No moves found in PGN.' }

  const replay = new Chess()
  const moves  = []
  for (const m of history) {
    try {
      replay.move(m.san)
      moves.push({ san: m.san, from: m.from, to: m.to, fen: replay.fen() })
    } catch {
      break   // stop at first unparseable move rather than crashing
    }
  }

  if (!moves.length) return { moves: [], headers, error: 'Could not replay moves from PGN.' }
  return { moves, headers, error: null }
}


// ─────────────────────────────────────────────────────────────────────────────

function PgnViewer({ pgn, onClose, orientation = 'white' }) {
  const [moveIndex,   setMoveIndex]   = useState(-1)    // -1 = starting position
  const [moves,       setMoves]       = useState([])
  const [headers,     setHeaders]     = useState({})
  const [parseError,  setParseError]  = useState(null)
  const [boardSize,   setBoardSize]   = useState(320)

  const canvasRef  = useRef(null)
  const overlayRef = useRef(null)
  const moveListRef = useRef(null)

  // ── Parse PGN once ────────────────────────────────────────────────────────
  useEffect(() => {
    const { moves: m, headers: h, error } = parsePgn(pgn)
    if (error) { setParseError(error); return }
    setMoves(m)
    setHeaders(h)
    setMoveIndex(-1)
  }, [pgn])

  // ── Responsive board size ─────────────────────────────────────────────────
  useEffect(() => {
    const update = () => setBoardSize(Math.min(window.innerWidth - 48, 360))
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  // ── Render board to canvas whenever moveIndex changes ────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    canvas.width  = boardSize * dpr
    canvas.height = boardSize * dpr
    canvas.style.width  = boardSize + 'px'
    canvas.style.height = boardSize + 'px'
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)

    const render = () => {
      const current = moveIndex >= 0 ? moves[moveIndex] : null
      const fen     = current ? current.fen : 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
      const from    = current ? current.from : null
      const to      = current ? current.to   : null
      drawBoard(ctx, fen, from, to, boardSize, orientation)
    }

    whenPiecesReady(render)
  }, [moveIndex, moves, boardSize])

  // ── Scroll active move chip into view ─────────────────────────────────────
  useEffect(() => {
    if (!moveListRef.current) return
    const active = moveListRef.current.querySelector('.pgn-chip--active')
    if (active) active.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [moveIndex])

  // ── Keyboard navigation ───────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape')     onClose()
      if (e.key === 'ArrowRight') setMoveIndex(i => Math.min(i + 1, moves.length - 1))
      if (e.key === 'ArrowLeft')  setMoveIndex(i => Math.max(i - 1, -1))
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [moves.length, onClose])

  const handleOverlayClick = (e) => { if (e.target === overlayRef.current) onClose() }

  const prev = () => setMoveIndex(i => Math.max(i - 1, -1))
  const next = () => setMoveIndex(i => Math.min(i + 1, moves.length - 1))

  // ── Header display ────────────────────────────────────────────────────────
  const white   = headers.White   || '?'
  const black   = headers.Black   || '?'
  const event   = headers.Event   || ''
  const result  = headers.Result  || ''
  const opening = headers.Opening || headers.ECO || ''
  const date    = headers.Date    || ''

  const currentMove = moveIndex >= 0 ? moves[moveIndex] : null
  const moveLabel   = currentMove
    ? `${Math.floor(moveIndex / 2) + 1}${moveIndex % 2 === 0 ? '.' : '…'} ${currentMove.san}`
    : 'Starting position'

  return (
    <div
      className="modal-overlay pgn-overlay"
      ref={overlayRef}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label="PGN Game Viewer"
    >
      <div className="modal pgn-modal">
        {/* Header */}
        <div className="modal-header">
          <h2 className="modal-title">
            <span className="modal-title-icon">📖</span>
            Game Viewer
          </h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="pgn-body">
          {parseError ? (
            <div className="pgn-error">
              <p>⚠ Could not parse PGN</p>
              <p className="pgn-error-detail">{parseError}</p>
            </div>
          ) : (
            <>
              {/* Game metadata */}
              <div className="pgn-meta">
                <div className="pgn-players">
                  <span className="pgn-player pgn-player--white">♔ {white}</span>
                  <span className="pgn-vs">vs</span>
                  <span className="pgn-player pgn-player--black">♚ {black}</span>
                  {result && <span className="pgn-result">{result}</span>}
                </div>
                {(opening || event || date) && (
                  <p className="pgn-subline">
                    {[opening, event, date].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>

              {/* Board */}
              <div className="pgn-board-wrap">
                <canvas ref={canvasRef} className="pgn-canvas" />
                <div className="pgn-move-label">{moveLabel}</div>
              </div>

              {/* Nav buttons */}
              <div className="pgn-nav">
                <button
                  className="btn btn--ghost btn--sm pgn-nav-btn"
                  onClick={() => setMoveIndex(-1)}
                  disabled={moveIndex === -1}
                  title="Start"
                >⏮</button>
                <button
                  className="btn btn--ghost btn--sm pgn-nav-btn"
                  onClick={prev}
                  disabled={moveIndex === -1}
                  title="Previous (←)"
                >◀</button>
                <span className="pgn-nav-pos">
                  {moveIndex + 1} / {moves.length}
                </span>
                <button
                  className="btn btn--ghost btn--sm pgn-nav-btn"
                  onClick={next}
                  disabled={moveIndex === moves.length - 1}
                  title="Next (→)"
                >▶</button>
                <button
                  className="btn btn--ghost btn--sm pgn-nav-btn"
                  onClick={() => setMoveIndex(moves.length - 1)}
                  disabled={moveIndex === moves.length - 1}
                  title="End"
                >⏭</button>
              </div>

              {/* Move list */}
              <div className="pgn-movelist" ref={moveListRef}>
                {/* Starting position chip */}
                <span
                  className={`pgn-chip pgn-chip--start${moveIndex === -1 ? ' pgn-chip--active' : ''}`}
                  onClick={() => setMoveIndex(-1)}
                  title="Starting position"
                >start</span>

                {moves.map((m, i) => {
                  const isWhite   = i % 2 === 0
                  const moveNum   = Math.floor(i / 2) + 1
                  const isActive  = i === moveIndex
                  return (
                    <span key={i}>
                      {isWhite && (
                        <span className="pgn-movenum">{moveNum}.</span>
                      )}
                      <span
                        className={`pgn-chip${isWhite ? ' pgn-chip--w' : ' pgn-chip--b'}${isActive ? ' pgn-chip--active' : ''}`}
                        onClick={() => setMoveIndex(i)}
                        title={`${m.from}→${m.to}`}
                      >
                        {m.san}
                      </span>
                    </span>
                  )
                })}
              </div>

              <p className="pgn-kbd-hint">← → arrow keys to step through moves</p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default PgnViewer

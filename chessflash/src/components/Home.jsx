// Home screen

const CATEGORIES = [
  {
    id: 'opening',
    label: 'Opening',
    icon: '♟',
    desc: 'First moves, development & opening principles',
    color: 'amber',
  },
  {
    id: 'tactics',
    label: 'Tactics',
    icon: '⚔',
    desc: 'Pattern recognition, combinations & calculation',
    color: 'crimson',
  },
  {
    id: 'endgame',
    label: 'Endgame',
    icon: '♔',
    desc: 'King activity, pawn races & promotion technique',
    color: 'sapphire',
  },
]

function Home({
  onSelectCategory,
  onAddCard,
  onDownload,
  onUpload,
  totalCards,
  countByCategory,
  uploadMsg,
  onDismissMsg,
}) {
  return (
    <div className="home">
      {/* ── Header ── */}
      <header className="home-header">
        <div className="logo">
          <span className="logo-king">♚</span>
          <span className="logo-text">Chess<em>Flash</em></span>
        </div>
        <p className="tagline">Train your chess pattern recognition</p>
      </header>

      <main className="categories">
        <p className="pick-label">Choose a category to begin</p>

        {/* ── Category buttons ── */}
        {CATEGORIES.map((cat) => {
          const count = countByCategory(cat.id)
          return (
            <button
              key={cat.id}
              className={`cat-btn cat-btn--${cat.color}${count === 0 ? ' cat-btn--empty' : ''}`}
              onClick={() => count > 0 && onSelectCategory(cat.id)}
              aria-label={`Start ${cat.label} flashcards`}
              aria-disabled={count === 0}
            >
              <span className="cat-icon">{cat.icon}</span>
              <div className="cat-text">
                <span className="cat-name">{cat.label}</span>
              </div>
              <span className="cat-count">
                {count > 0 ? `${count} card${count !== 1 ? 's' : ''}` : 'no cards'}
              </span>
            </button>
          )
        })}

        {/* ── Divider ── */}
        <div className="home-divider" />

        {/* ── Add flashcard button ── */}
        <button
          className="cat-btn cat-btn--add"
          onClick={onAddCard}
          aria-label="Add a new flashcard"
        >
          <span className="cat-icon add-icon">➕</span>
          <div className="cat-text">
            <span className="cat-name">Add New Flashcard</span>
            <span className="cat-desc">Create your own position &amp; best-move drill</span>
          </div>
          <span className="cat-arrow">→</span>
        </button>

        {/* ── CSV toolbar ── */}
        <div className="csv-toolbar">
          <p className="csv-toolbar-label">
            Library
            {totalCards > 0 && <span className="csv-total-badge">{totalCards} total</span>}
          </p>
          <div className="csv-toolbar-btns">
            <button className="btn btn--ghost btn--sm csv-btn" onClick={onUpload}>
              📂 Upload CSV
            </button>
            <button
              className={`btn btn--sm csv-btn ${totalCards > 0 ? 'btn--secondary' : 'btn--ghost csv-btn--disabled'}`}
              onClick={onDownload}
              disabled={totalCards === 0}
            >
              💾 Download CSV
            </button>
          </div>

          {uploadMsg && (
            <div className={uploadMsg.type === 'success' ? 'csv-success' : 'csv-error'}>
              <span>{uploadMsg.type === 'success' ? '✅' : '⚠'} {uploadMsg.text}</span>
              <button className="csv-dismiss" onClick={onDismissMsg}>✕</button>
            </div>
          )}

          <p className="csv-hint">
            Cards are saved automatically in this browser.<br />
            Use Download&nbsp;/&nbsp;Upload to back up or move to another device.
          </p>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="home-footer">
        <p>Click a piece, then click a destination square to answer</p>
      </footer>
    </div>
  )
}

export default Home

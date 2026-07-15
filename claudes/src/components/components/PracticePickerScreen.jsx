// components/PracticePickerScreen.jsx — choose an opening to drill.
// Mirrors renderPracticePicker(): clicking a row calls
// app.startPracticeOpening(opening) exactly as before.
//
// ADDITION (UI-only): same Lichess-auth notice as ColorChoiceScreen — see
// that file's comment for the full explanation. Practice mode uses the
// 'lichess' explorer source (PRACTICE_MODE.source in config) and reaches
// the game screen directly without passing through ColorChoiceScreen, so
// it needs its own copy of the notice.
//
// ADDITION: Add / Upload / Download / Remove flashcard management, ported
// from the legacy PracticeOpeningsManager (practice-openings.js) — see
// services/practiceOpeningsStore.js for the persistence layer.
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Panel } from './Panel';
import { Button } from './Button';
import { LichessConnectButton } from './LichessConnectButton';
import { isConnected } from '../services/lichessAuth';
import {
  getEffectiveOpenings,
  addOpening,
  removeOpening,
  downloadCsv,
  uploadCsv,
} from '../services/practiceOpeningsStore';
import './PracticePickerScreen.css';

function AddFlashcardModal({ onClose, onSaved }) {
  const [name, setName] = useState('');
  const [fen, setFen] = useState('');
  const [orientation, setOrientation] = useState('white');
  const [category, setCategory] = useState('');
  const [error, setError] = useState('');

  const handleSave = () => {
    const result = addOpening({ name, fen, orientation, category });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onSaved();
  };

  return createPortal(
    <div className="flashcard-modal" role="dialog" aria-modal="true" aria-labelledby="flashcard-modal-title">
      <div className="flashcard-modal__backdrop" onClick={onClose} />
      <div className="flashcard-modal__panel">
        <h2 id="flashcard-modal-title" className="flashcard-modal__title">Add Practice Flashcard</h2>

        <label className="flashcard-modal__field">
          <span>Name</span>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Ruy Lopez: Closed Defense"
            autoFocus
          />
        </label>

        <label className="flashcard-modal__field">
          <span>FEN</span>
          <input
            type="text"
            value={fen}
            onChange={e => setFen(e.target.value)}
            placeholder="Paste the position's FEN string"
          />
        </label>

        <label className="flashcard-modal__field">
          <span>Category</span>
          <input
            type="text"
            value={category}
            onChange={e => setCategory(e.target.value)}
            placeholder="Optional — defaults to \u201cMy Openings\u201d"
          />
        </label>

        <div className="flashcard-modal__field">
          <span>Play as</span>
          <div className="flashcard-modal__orientation">
            <label>
              <input
                type="radio"
                name="flashcard-orientation"
                value="white"
                checked={orientation === 'white'}
                onChange={() => setOrientation('white')}
              />
              White
            </label>
            <label>
              <input
                type="radio"
                name="flashcard-orientation"
                value="black"
                checked={orientation === 'black'}
                onChange={() => setOrientation('black')}
              />
              Black
            </label>
          </div>
        </div>

        {error && <div className="flashcard-modal__error">{error}</div>}

        <div className="flashcard-modal__actions">
          <Button variant="bronze" size="md" onClick={handleSave}>Save Flashcard</Button>
          <Button variant="ghost" size="md" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function PracticePickerScreen({ app }) {
  const [openings, setOpenings] = useState(() => getEffectiveOpenings());
  const [showAddModal, setShowAddModal] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const fileInputRef = useRef(null);

  const refresh = () => setOpenings(getEffectiveOpenings());

  const grouped = openings.reduce((acc, opening, index) => {
    if (!acc[opening.category]) acc[opening.category] = [];
    acc[opening.category].push({ ...opening, index });
    return acc;
  }, {});

  const categories = Object.keys(grouped).sort();
  const needsLichessAuth = !isConnected();

  const handleRemove = (e, opening) => {
    e.stopPropagation();
    removeOpening(opening.source, opening.originalIndex);
    refresh();
  };

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const result = await uploadCsv(file);
    if (!result.ok) {
      setStatusMessage(result.error);
    } else {
      setStatusMessage(`Loaded ${result.count} practice line${result.count !== 1 ? 's' : ''} from ${file.name}.`);
      refresh();
    }
    setTimeout(() => setStatusMessage(''), 4000);
  };

  return (
    <div className="practice-picker page-transition">
      <header className="practice-picker__hero">
        <h1 className="practice-picker__title">Practice Mode</h1>
        <p className="practice-picker__subtitle">
          Pick an opening and drill the position from a real-game opening book.
        </p>
      </header>

      <div className="practice-picker__toolbar">
        <Button variant="bronze" size="sm" onClick={() => setShowAddModal(true)}>+ Add Flashcard</Button>
        <Button variant="bronze" size="sm" onClick={handleUploadClick}>Upload CSV</Button>
        <Button variant="bronze" size="sm" onClick={() => downloadCsv()}>Download CSV</Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      </div>
      {statusMessage && <div className="practice-picker__status">{statusMessage}</div>}

      {needsLichessAuth && (
        <Panel className="practice-picker__notice">
          <p>
            Practice mode reads live game data from Lichess's opening explorer, which now requires a
            connected account for at least some queries. If a drill ends immediately, connect your
            Lichess account below and try again.
          </p>
          <LichessConnectButton />
        </Panel>
      )}

      {categories.map(category => (
        <Panel key={category} className="practice-picker__category">
          <h3 className="practice-picker__category-title">{category}</h3>
          <div className="practice-picker__rows">
            {grouped[category].map(opening => (
              <div key={opening.index} className="practice-picker__row">
                <button
                  className="practice-picker__row-start"
                  onClick={() => app.startPracticeOpening(opening)}
                >
                  <span className="practice-picker__row-name">{opening.name}</span>
                  <span className={`practice-picker__row-side ${opening.orientation}`}>
                    {opening.orientation === 'white' ? 'White' : 'Black'}
                  </span>
                </button>
                <button
                  className="practice-picker__row-remove"
                  onClick={(e) => handleRemove(e, opening)}
                  aria-label={`Remove ${opening.name}`}
                  title="Remove this flashcard"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        </Panel>
      ))}

      {showAddModal && (
        <AddFlashcardModal
          onClose={() => setShowAddModal(false)}
          onSaved={() => { setShowAddModal(false); refresh(); }}
        />
      )}
    </div>
  );
}

export default PracticePickerScreen;

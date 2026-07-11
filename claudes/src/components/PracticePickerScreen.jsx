// components/PracticePickerScreen.jsx — choose an opening to drill.
// Mirrors renderPracticePicker(): groups PracticeOpenings by category,
// clicking a row calls app.startPracticeOpening(opening) exactly as before.
//
// ADDITION (UI-only): same Lichess-auth notice as ColorChoiceScreen — see
// that file's comment for the full explanation. Practice mode uses the
// 'lichess' explorer source (PRACTICE_MODE.source in config) and reaches
// the game screen directly without passing through ColorChoiceScreen, so
// it needs its own copy of the notice.
import { Panel } from './Panel';
import { LichessConnectButton } from './LichessConnectButton';
import { PracticeOpenings } from '../config/practiceOpenings';
import { isConnected } from '../services/lichessAuth';
import './PracticePickerScreen.css';

export function PracticePickerScreen({ app }) {
  const grouped = PracticeOpenings.reduce((acc, opening, index) => {
    if (!acc[opening.category]) acc[opening.category] = [];
    acc[opening.category].push({ ...opening, index });
    return acc;
  }, {});

  const categories = Object.keys(grouped).sort();
  const needsLichessAuth = !isConnected();

  return (
    <div className="practice-picker page-transition">
      <header className="practice-picker__hero">
        <h1 className="practice-picker__title">Practice Mode</h1>
        <p className="practice-picker__subtitle">
          Pick an opening and drill the position from a real-game opening book.
        </p>
      </header>

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
              <button
                key={opening.index}
                className="practice-picker__row"
                onClick={() => app.startPracticeOpening(opening)}
              >
                <span className="practice-picker__row-name">{opening.name}</span>
                <span className={`practice-picker__row-side ${opening.orientation}`}>
                  {opening.orientation === 'white' ? 'White' : 'Black'}
                </span>
              </button>
            ))}
          </div>
        </Panel>
      ))}
    </div>
  );
}

export default PracticePickerScreen;

// components/ColorChoiceScreen.jsx — campaign confirm screen shown after
// selecting Master/Club, before the battle starts.
//
// Deliberately minimal: the home screen (MenuScreen) already shows full
// Legion status for both campaigns — rank, merit, progress bar, battle
// history. Repeating a LegionCard here was pure duplication of something
// the player just looked at seconds earlier. This screen's only job is to
// confirm the climb ahead (Road to Legatus) and let them start — no
// heading, no restated app name, no repeated stats.
import { Panel } from './Panel';
import { Button } from './Button';
import { LegionPath } from './LegionPath';
import { LichessConnectButton } from './LichessConnectButton';
import { Scoring } from '../logic/scoring';
import { isConnected } from '../services/lichessAuth';
import './ColorChoiceScreen.css';

export function ColorChoiceScreen({ app }) {
  const isMaster = app.aiSource === 'master';
  const merit = isMaster ? (app.legionMerits.master_merit || 0) : (app.legionMerits.lichess_merit || 0);
  const legion = Scoring.getLegionRank(merit);
  const needsLichessAuth = !isConnected();

  return (
    <div className="color-choice page-transition">
      {needsLichessAuth && (
        <Panel className="color-choice__notice">
          <p>
            Lines of the Legion reads live game data from Lichess's opening explorer, which now requires a
            connected account for at least some queries. If the battle ends immediately on the first move,
            connect your Lichess account below and try again.
          </p>
          <LichessConnectButton />
        </Panel>
      )}

      <Panel className="color-choice__path-panel">
        <LegionPath legion={legion} />
      </Panel>

      <div className="color-choice__start">
        <Button variant="primary" size="lg" onClick={() => app.startBattle()}>
          ⚔️ Start Battle
        </Button>
      </div>
    </div>
  );
}

export default ColorChoiceScreen;

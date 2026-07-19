// App.jsx — root component. Implements the exact screen-routing precedence
// from the legacy ChessTheoryApp.render() method:
//   1. mode === 'practice' && !practiceOpening  -> Practice Picker
//   2. !aiSource                                -> Menu
//   3. !playerColor                             -> Color Choice (campaign confirm)
//   4. gameEnded && endGameData                 -> End summary (rendered inside GameScreen, board behind it)
//   5. otherwise                                -> Game (board), with aiMove/queryExplorer
//      side effects already handled inside ChessTheoryApp.render()/queryExplorer()/aiMove()
//
// showingAnalysis is an additional state the legacy app modeled by swapping
// #app's innerHTML directly (see app.showAnalysis()); here it's just another
// branch in the same routing tree.
import { useChessTheoryApp } from './hooks/useChessTheoryApp';
import { MenuScreen } from './components/MenuScreen';
import { PracticePickerScreen } from './components/PracticePickerScreen';
import { ColorChoiceScreen } from './components/ColorChoiceScreen';
import { GameScreen } from './components/GameScreen';
import { AnalysisScreen } from './components/AnalysisScreen';
import { HomeButton } from './components/HomeButton';
import { AuthBar } from './components/AuthBar';
import { PieceStyleToggle } from './components/PieceStyleToggle';
import { Atmosphere } from './components/Atmosphere';
// Light/dark mode toggle is temporarily hidden — dark mode is the only
// mode for now. Re-enable by uncommenting this import and the <ThemeToggle />
// usage below.
// import { ThemeToggle } from './components/ThemeToggle';

function App() {
  const app = useChessTheoryApp();

  if (!app.auth.authInitialized) {
    return (
      <>
        <Atmosphere />
        <div className="app-loading">
          <div className="app-loading__spinner" />
        </div>
      </>
    );
  }

  const showHome = !!(app.mode || app.aiSource);

  let screen;
  if (app.showingAnalysis) {
    screen = <AnalysisScreen app={app} />;
  } else if (app.mode === 'practice' && !app.practiceOpening) {
    screen = <PracticePickerScreen app={app} />;
  } else if (!app.aiSource) {
    screen = <MenuScreen app={app} />;
  } else if (!app.playerColor) {
    screen = <ColorChoiceScreen app={app} />;
  } else {
    screen = <GameScreen app={app} />;
  }

  return (
    <div className="app-shell">
      <Atmosphere />
      <div className="app-shell__topbar">
        {showHome && !app.showingAnalysis && <HomeButton app={app} />}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* <ThemeToggle /> — hidden for now, see import comment above */}
          <PieceStyleToggle app={app} />
          <AuthBar app={app} />
        </div>
      </div>
      {screen}
    </div>
  );
}

export default App;

// hooks/useChessTheoryApp.js - Bridges the ChessTheoryApp class instance into React.
//
// The original app was a singleton class that painted the DOM directly inside
// render(). Here we keep ONE persistent instance (created via a useState lazy
// initializer, so it's constructed exactly once and is rule-compliant with
// React Compiler's "no ref reads during render" check) and use a version
// counter + forceUpdate pattern so that whenever the class calls
// `this.render()` -> `this._notify()`, React re-renders and components read
// the latest fields off the same instance. No game logic is re-implemented
// here — this file only exists to wire the class into React.

import { useEffect, useState } from 'react';
import { ChessTheoryApp } from '../logic/chessTheoryApp';

export function useChessTheoryApp() {
  const [app] = useState(() => new ChessTheoryApp());
  const [, setVersion] = useState(0);

  useEffect(() => {
    app._notify = () => setVersion(v => v + 1);
    app.init();

    // No cleanup needed — single persistent app instance for the lifetime
    // of the React tree, matching the original's single-page singleton.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return app;
}

export default useChessTheoryApp;

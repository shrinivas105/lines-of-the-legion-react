// analysis-board.js - Post-game analysis with move navigation
// FIXED: Proper piece rendering, error handling, eval bar, exit functionality, and move comparison arrows

class AnalysisBoard {
  constructor(app) {
    this.app = app;
    this.analysisGame = null;
    this.moveHistory = [];
    this.currentMoveIndex = -1;
    this.isAnalyzing = false;
    this.topMovesData = {}; // Cache for top moves at each position
    this.evaluationCache = {}; // Cache for all evaluations -- NEW LINE
    this.analysisStartFen = null;
  }

async preloadAllData() {
  const tempGame = this.analysisStartFen ? new Chess(this.analysisStartFen) : new Chess();
  const totalPositions = this.moveHistory.length + 1;
  let processedPositions = 0;
  
  // Helper to update progress
  const updateProgress = () => {
    processedPositions++;
    const percentage = Math.round((processedPositions / totalPositions) * 100);
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const loadingMessage = document.getElementById('loadingMessage');
    
    if (progressBar) progressBar.style.width = percentage + '%';
    if (progressText) progressText.textContent = percentage + '%';
    if (loadingMessage) {
      if (percentage < 30) {
        loadingMessage.textContent = 'Fetching move database...';
      } else if (percentage < 70) {
        loadingMessage.textContent = 'Calculating evaluations...';
      } else {
        loadingMessage.textContent = 'Finalizing analysis...';
      }
    }
  };
  
  // Preload data for each position in the game
  for (let i = 0; i <= this.moveHistory.length; i++) {
    const positionFen = tempGame.fen();
    
    // Fetch and cache top moves for this position
    if (!this.topMovesData[positionFen]) {
      try {
        const data = await ChessAPI.queryExplorer(this.app.aiSource, positionFen);
        this.topMovesData[positionFen] = data.moves || [];
        
        // If there are moves to evaluate and this is a player move position
        if (i < this.moveHistory.length) {
          const isWhiteMove = i % 2 === 0;
          const isPlayerMove = (this.app.playerColor === 'w' && isWhiteMove) || 
                               (this.app.playerColor === 'b' && !isWhiteMove);
          
          const topMoves = this.topMovesData[positionFen].slice(0, 3);
          
          // For player moves, preload evaluations for all top 3 moves
          // For AI moves, only preload evaluation for the move that was actually played
          if (isPlayerMove) {
            // Preload all top 3 move evaluations
            for (const move of topMoves) {
              const evalKey = `${positionFen}_${move.uci}`;
              if (!this.evaluationCache[evalKey]) {
                const evalGame = new Chess(positionFen);
                const moveFrom = move.uci.substring(0, 2);
                const moveTo = move.uci.substring(2, 4);
                const movePromotion = move.uci.length > 4 ? move.uci[4] : undefined;
                
                evalGame.move({ from: moveFrom, to: moveTo, promotion: movePromotion });
                const evalFen = evalGame.fen();
                
                try {
                  const rawEval = await ChessAPI.getEvaluation(evalFen, this.app.evalCache);
                  this.evaluationCache[evalKey] = rawEval;
                } catch (err) {
                  console.error('Error preloading eval:', err);
                  this.evaluationCache[evalKey] = null;
                }
              }
            }
          } else {
            // For AI moves, only preload the actual move played
            const actualMove = this.moveHistory[i];
            const actualMoveUci = actualMove.from + actualMove.to + (actualMove.promotion || '');
            const evalKey = `${positionFen}_${actualMoveUci}`;
            
            if (!this.evaluationCache[evalKey]) {
              // Make the move to get the resulting position
              tempGame.move({
                from: actualMove.from,
                to: actualMove.to,
                promotion: actualMove.promotion
              });
              const evalFen = tempGame.fen();
              
              try {
                const rawEval = await ChessAPI.getEvaluation(evalFen, this.app.evalCache);
                this.evaluationCache[evalKey] = rawEval;
              } catch (err) {
                console.error('Error preloading eval:', err);
                this.evaluationCache[evalKey] = null;
              }
              
              // Undo to continue the loop properly
              tempGame.undo();
            }
          }
        }
      } catch (error) {
        console.error('Error preloading data for position:', error);
        this.topMovesData[positionFen] = [];
      }
    }
    
    // Update progress after processing each position
    updateProgress();
    
    // Make the next move for the next iteration
    if (i < this.moveHistory.length) {
      const move = this.moveHistory[i];
      tempGame.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion
      });
    }
  }
}

  async initializeAnalysis() {
    console.log('🔍 Initializing analysis board...');
    
    if (!this.app.game) {
      console.error('❌ No game available for analysis');
      alert('No game available for analysis');
      return;
    }

    try {
      // Determine the true starting position for analysis.
      // Practice mode may begin from a custom FEN rather than the normal starting position.
      this.analysisStartFen = (this.app.mode === 'practice' && this.app.practiceOpening && this.app.practiceOpening.fen)
        ? this.app.practiceOpening.fen
        : null;

      const currentGameFen = this.app.game.fen();
      const historyVerbose = this.app.game.history({ verbose: true });
      const historySimple = this.app.game.history({ verbose: false });

      console.log('🔍 Analysis initialize debug:', {
        mode: this.app.mode,
        aiSource: this.app.aiSource,
        playerColor: this.app.playerColor,
        currentGameFen,
        practiceOpening: this.app.practiceOpening,
        analysisStartFen: this.analysisStartFen,
        historyVerbose,
        historySimple,
        historyLength: historyVerbose.length
      });

      // Store the current game state from the actual starting position.
      this.analysisGame = this.analysisStartFen ? new Chess(this.analysisStartFen) : new Chess();
      
      // Get move history from the current game
      const history = historyVerbose;
      console.log('📜 Move history:', history);
      
      this.moveHistory = history;
      this.currentMoveIndex = -1;
      this.isAnalyzing = true;

      console.log(`✅ Analysis initialized with ${history.length} moves`);
      
      // Preload all evaluations and move data before rendering -- NEW LINES
      console.log('🔄 Preloading evaluations and move data...');
      await this.preloadAllData();
      console.log('✅ All data preloaded');

      // Render the analysis interface
      this.renderAnalysisBoard();
    } catch (error) {
      console.error('❌ Analysis initialization error:', error);
      alert('Error initializing analysis: ' + error.message);
    }
  }

  renderAnalysisBoard() {
    const app = document.getElementById('app');
    if (!app) {
      console.error('❌ App element not found');
      return;
    }

    const html = `
  <button class="home-button" onclick="app.goHome()">🏠</button>
  
  <div class="game-container analysis-mode">
        <h2 style="text-align: center; color: var(--roman-gold); margin-bottom: 4px; font-size: 1rem;">
          ⚔️ Battle Analysis ⚔️
        </h2>

        <div style="position: relative;">
          <div class="board-wrapper" id="analysisBoard"></div>
          <svg id="arrowLayer" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 10;"></svg>
        </div>

        <div id="moveComparisonTable" style="margin-top: 6px; min-height: 110px; display: flex; flex-direction: column; justify-content: center;">
          <div id="comparisonTableContent"></div>
        </div>

        <div class="analysis-controls" style="margin-top: 6px;">
          <div class="action-buttons" style="justify-content: center; gap: 5px; flex-wrap: wrap;">
            <button class="btn" id="firstMoveBtn" onclick="window.analysisBoard.goToMove(0)" style="padding: 5px 9px; font-size: 0.75rem;">
  ⮜ First
</button>
<button class="btn" id="prevMoveBtn" onclick="window.analysisBoard.previousMove()" style="padding: 5px 9px; font-size: 0.75rem;">
  ◀️ Prev
</button>
<button class="btn" id="nextMoveBtn" onclick="window.analysisBoard.nextMove()" style="padding: 5px 9px; font-size: 0.75rem;">
  Next ▶️
</button>
<button class="btn" id="lastMoveBtn" onclick="window.analysisBoard.goToMove(${this.moveHistory.length})" style="padding: 5px 9px; font-size: 0.75rem;">
  Last ⮞
</button>
          </div>
        </div>

        <div style="margin-top: 6px; padding: 5px; background: rgba(0,0,0,0.3); border-radius: 4px; font-size: 0.65rem;">
          <div style="display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; align-items: center;">
            <span style="font-weight: bold; color: var(--roman-gold); font-size: 0.6rem;">Arrows:</span>
            <div style="display: flex; align-items: center; gap: 2px;">
              <div style="width: 14px; height: 2px; background: #3498db;"></div>
              <span style="font-size: 0.6rem;">You (not top 3)</span>
            </div>
            <div style="display: flex; align-items: center; gap: 2px;">
              <div style="width: 14px; height: 2px; background: #3498db; opacity: 0.6;"></div>
              <span style="font-size: 0.6rem;">AI (not top 3)</span>
            </div>
            <div style="display: flex; align-items: center; gap: 2px;">
              <div style="width: 14px; height: 2px; background: #2ecc71;"></div>
              <span style="font-size: 0.6rem;">Top</span>
            </div>
            <div style="display: flex; align-items: center; gap: 2px;">
              <div style="width: 14px; height: 2px; background: #f1c40f;"></div>
              <span style="font-size: 0.6rem;">2nd</span>
            </div>
            <div style="display: flex; align-items: center; gap: 2px;">
              <div style="width: 14px; height: 2px; background: #e67e22;"></div>
              <span style="font-size: 0.6rem;">3rd</span>
            </div>
          </div>
          <div style="display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; align-items: center; margin-top: 3px;">
            <div style="display: flex; align-items: center; gap: 2px;">
              <div style="width: 14px; height: 4px; background: linear-gradient(to bottom, #3498db 0%, #3498db 40%, #2ecc71 60%, #2ecc71 100%); border-radius: 1px;"></div>
              <span style="font-size: 0.6rem;">You = Top!</span>
            </div>
            <div style="display: flex; align-items: center; gap: 2px;">
              <div style="width: 14px; height: 4px; background: linear-gradient(to bottom, #3498db 0%, #3498db 40%, #f1c40f 60%, #f1c40f 100%); border-radius: 1px;"></div>
              <span style="font-size: 0.6rem;">You = 2nd</span>
            </div>
            <div style="display: flex; align-items: center; gap: 2px;">
              <div style="width: 14px; height: 4px; background: linear-gradient(to bottom, #3498db 0%, #3498db 40%, #e67e22 60%, #e67e22 100%); border-radius: 1px;"></div>
              <span style="font-size: 0.6rem;">You = 3rd</span>
            </div>
          </div>
        </div>

       <div class="action-buttons" style="margin-top: 6px; gap: 5px;">
  <button class="btn" onclick="window.analysisBoard.exitAnalysis()" style="padding: 5px 10px; font-size: 0.75rem;">
    ⬅️ Exit
  </button>
  <button class="btn" onclick="app.downloadPGN()" style="padding: 5px 10px; font-size: 0.75rem;">
    📥 PGN
  </button>
  <button class="btn" onclick="app.copyPGN()" style="padding: 5px 10px; font-size: 0.75rem;">
    📋 Copy
  </button>
</div>
      </div>
    `;

    app.innerHTML = html;
    this.updateBoard();
    this.updateNavigationButtons();
    this.updatePositionInfo(); // Initial eval load
    console.log('✅ Analysis board rendered');
  }

  renderBoard() {
    const board = this.analysisGame.board();
    const boardEl = document.getElementById('analysisBoard');
    if (!boardEl) return;
    
    boardEl.innerHTML = '';
    
    // Check if board should be flipped (player is black)
    const isFlipped = this.app.playerColor === 'b';
    
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        // Flip coordinates if player is black
        const displayRow = isFlipped ? 7 - row : row;
        const displayCol = isFlipped ? 7 - col : col;
        
        const piece = board[displayRow][displayCol];
        const isLight = (row + col) % 2 === 0;
        const square = 'abcdefgh'[displayCol] + (8 - displayRow);
        
        const div = document.createElement('div');
        div.className = `square ${isLight ? 'light' : 'dark'}`;
        div.setAttribute('data-square', square);
        
        if (piece) {
          const pieceKey = piece.color + piece.type;
          const img = document.createElement('img');
          img.src = this.app.pieceImages[pieceKey];
          img.className = 'piece';
          img.alt = piece.type;
          div.appendChild(img);
        }
        
        boardEl.appendChild(div);
      }
    }
  }

  renderMoveList() {
    if (this.moveHistory.length === 0) {
      return '<div style="color: #888; font-style: italic;">No moves yet</div>';
    }

    let html = '<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px; font-size: 0.85rem;">';
    
    for (let i = 0; i < this.moveHistory.length; i += 2) {
      const moveNum = Math.floor(i / 2) + 1;
      const whiteMove = this.moveHistory[i];
      const blackMove = this.moveHistory[i + 1];
      
      const whiteClass = this.currentMoveIndex === i ? 'active' : '';
      const blackClass = this.currentMoveIndex === i + 1 ? 'active' : '';
      
      // Determine if moves are player moves based on player color
      const isWhitePlayer = this.app.playerColor === 'w';
      const whiteIsPlayer = isWhitePlayer;
      const blackIsPlayer = !isWhitePlayer;
      
      html += `
        <div style="display: contents;">
          <div 
            class="move-item ${whiteClass}" 
            onclick="window.analysisBoard.goToMove(${i + 1})"
            style="padding: 4px 8px; cursor: pointer; border-radius: 4px; ${whiteClass ? 'background: var(--roman-gold); color: #000; font-weight: bold;' : 'background: rgba(255,255,255,0.05);'}; ${whiteIsPlayer ? '' : 'opacity: 0.6;'}"
          >
            ${moveNum}. ${whiteMove.san}${whiteIsPlayer ? '' : ' 🤖'}
          </div>
          ${blackMove ? `
            <div 
              class="move-item ${blackClass}" 
              onclick="window.analysisBoard.goToMove(${i + 2})"
              style="padding: 4px 8px; cursor: pointer; border-radius: 4px; ${blackClass ? 'background: var(--roman-gold); color: #000; font-weight: bold;' : 'background: rgba(255,255,255,0.05);'}; ${blackIsPlayer ? '' : 'opacity: 0.6;'}"
            >
              ${blackMove.san}${blackIsPlayer ? '' : ' 🤖'}
            </div>
          ` : '<div></div>'}
        </div>
      `;
    }
    
    html += '</div>';
    return html;
  }

  goToMove(moveIndex) {
    console.log(`Going to move ${moveIndex}`, {
      analysisStartFen: this.analysisStartFen,
      currentMoveIndex: this.currentMoveIndex,
      moveHistoryLength: this.moveHistory.length
    });
    
    // Reset game to the actual analysis starting position
    if (this.analysisStartFen) {
      this.analysisGame = new Chess(this.analysisStartFen);
    } else {
      this.analysisGame.reset();
    }
    
    // Replay moves up to the target index
    for (let i = 0; i < moveIndex && i < this.moveHistory.length; i++) {
      const move = this.moveHistory[i];
      try {
        this.analysisGame.move({
          from: move.from,
          to: move.to,
          promotion: move.promotion
        });
      } catch (error) {
        console.error('Error replaying move:', error, move);
        break;
      }
    }
    
    this.currentMoveIndex = moveIndex - 1;
    this.updateBoard();
    this.updateNavigationButtons();
    this.updatePositionInfo();
  }

  nextMove() {
    if (this.currentMoveIndex < this.moveHistory.length - 1) {
      const nextMove = this.moveHistory[this.currentMoveIndex + 1];
      try {
        this.analysisGame.move({
          from: nextMove.from,
          to: nextMove.to,
          promotion: nextMove.promotion
        });
        this.currentMoveIndex++;
        this.updateBoard();
        this.updateNavigationButtons();
        this.updatePositionInfo();
      } catch (error) {
        console.error('Error making next move:', error, nextMove);
      }
    }
  }

  previousMove() {
    if (this.currentMoveIndex >= 0) {
      try {
        this.analysisGame.undo();
        this.currentMoveIndex--;
        this.updateBoard();
        this.updateNavigationButtons();
        this.updatePositionInfo();
      } catch (error) {
        console.error('Error undoing move:', error);
      }
    }
  }

  updateBoard() {
    this.renderBoard();
    
    // Update move list highlighting
    const moveListContainer = document.querySelector('.move-list');
    if (moveListContainer) {
      const h3 = moveListContainer.querySelector('h3');
      const moveListHTML = this.renderMoveList();
      moveListContainer.innerHTML = '';
      if (h3) moveListContainer.appendChild(h3);
      
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = moveListHTML;
      while (tempDiv.firstChild) {
        moveListContainer.appendChild(tempDiv.firstChild);
      }
    }
  }

  updateNavigationButtons() {
    const firstBtn = document.getElementById('firstMoveBtn');
    const prevBtn = document.getElementById('prevMoveBtn');
    const nextBtn = document.getElementById('nextMoveBtn');
    const lastBtn = document.getElementById('lastMoveBtn');

    if (firstBtn) firstBtn.disabled = this.currentMoveIndex < 0;
    if (prevBtn) prevBtn.disabled = this.currentMoveIndex < 0;
    if (nextBtn) nextBtn.disabled = this.currentMoveIndex >= this.moveHistory.length - 1;
    if (lastBtn) lastBtn.disabled = this.currentMoveIndex >= this.moveHistory.length - 1;
  }

  async updatePositionInfo() {
    // Position info is now displayed in the table header, but we still need to update it
    // for the table rendering to pick it up
    
    // Update evaluation
    await this.updateEvaluation();
    
    // Update move comparison arrows
    await this.updateMoveComparison();
  }

  async updateEvaluation() {
    // Evaluation is now displayed in the table header
    // Just compute it and let the table rendering pick it up
    try {
      const fen = this.analysisGame.fen();
      const rawEval = await ChessAPI.getEvaluation(fen, this.app.evalCache);
      
      // Flip evaluation if player is Black (eval is from White's perspective by default)
      const playerEval = this.app.playerColor === 'b' ? -rawEval : rawEval;
      const displayEval = playerEval > 0 ? '+' + playerEval.toFixed(1) : playerEval.toFixed(1);
      
      // Store for table to use
      this.currentEval = displayEval;
      this.currentEvalColor = playerEval > 1 ? '#2ecc71' : playerEval < -1 ? '#e74c3c' : '#f1c40f';
    } catch (error) {
      console.error('Error updating evaluation:', error);
      this.currentEval = 'N/A';
      this.currentEvalColor = '#888';
    }
  }

 async updateMoveComparison() {
    const arrowLayer = document.getElementById('arrowLayer');
    const comparisonTable = document.getElementById('moveComparisonTable');
    const comparisonTableContent = document.getElementById('comparisonTableContent');
    
    if (!arrowLayer) return;
    
    // Clear arrows
    arrowLayer.innerHTML = '';
    
    // Show placeholder for starting position
    if (this.currentMoveIndex < 0) {
      if (comparisonTableContent) {
        comparisonTableContent.innerHTML = `
          <div style="text-align: center; color: #888; font-size: 0.7rem; padding: 15px;">
            Navigate to a position to see move analysis
          </div>
        `;
      }
      return;
    }
    
    // Get current move info
    const currentMove = this.moveHistory[this.currentMoveIndex];
    const moveNumber = this.currentMoveIndex;
    const isWhiteMove = moveNumber % 2 === 0;
    const isPlayerMove = (this.app.playerColor === 'w' && isWhiteMove) || 
                         (this.app.playerColor === 'b' && !isWhiteMove);
    
    try {
      // Get the position BEFORE the current move
      const tempGame = this.analysisStartFen ? new Chess(this.analysisStartFen) : new Chess();
      for (let i = 0; i < this.currentMoveIndex; i++) {
        const move = this.moveHistory[i];
        tempGame.move({
          from: move.from,
          to: move.to,
          promotion: move.promotion
        });
      }
      
      const positionFen = tempGame.fen();
      
      // Get top moves from cache (preloaded)
      const topMoves = this.topMovesData[positionFen] || [];
      
      if (topMoves.length === 0) {
        if (comparisonTableContent) {
          comparisonTableContent.innerHTML = `
            <div style="text-align: center; color: #888; font-size: 0.7rem; padding: 15px;">
              No database moves available for this position
            </div>
          `;
        }
        return;
      }
      
      // Find current move (player or AI) in top moves
      const currentMoveUci = currentMove.from + currentMove.to + (currentMove.promotion || '');
      const currentMoveIndex = topMoves.findIndex(m => m.uci === currentMoveUci);
      
      // Build comparison table data
      const tableData = [];
      const colors = ['#2ecc71', '#f1c40f', '#e67e22'];
      const labels = ['Top', '2nd', '3rd'];
      const moveLabel = isPlayerMove ? 'Your' : 'AI';
      
      // Add top 3 moves
      for (let idx = 0; idx < Math.min(3, topMoves.length); idx++) {
        const move = topMoves[idx];
        const totalGames = move.white + move.draws + move.black;
        const whiteWin = totalGames > 0 ? ((move.white / totalGames) * 100).toFixed(1) : 0;
        const draws = totalGames > 0 ? ((move.draws / totalGames) * 100).toFixed(1) : 0;
        const blackWin = totalGames > 0 ? ((move.black / totalGames) * 100).toFixed(1) : 0;
        
        const isCurrentMove = move.uci === currentMoveUci;
        
        // Get evaluation from cache (preloaded)
        let moveEval = '-';
        let moveEvalColor = '#888';
        
        const shouldShowEval = isPlayerMove || isCurrentMove;
        
        if (shouldShowEval) {
          const evalKey = `${positionFen}_${move.uci}`;
          const cachedEval = this.evaluationCache[evalKey];
          
          if (cachedEval !== undefined && cachedEval !== null) {
            const playerEval = this.app.playerColor === 'b' ? -cachedEval : cachedEval;
            moveEval = playerEval > 0 ? '+' + playerEval.toFixed(1) : playerEval.toFixed(1);
            moveEvalColor = playerEval > 1 ? '#2ecc71' : playerEval < -1 ? '#e74c3c' : '#f1c40f';
          } else if (cachedEval === null) {
            moveEval = 'N/A';
          }
        }
        
        tableData.push({
          move: move.san,
          color: colors[idx],
          label: labels[idx],
          whiteWin,
          draws,
          blackWin,
          totalGames,
          isCurrentMove,
          moveType: isCurrentMove ? moveLabel : '',
          eval: moveEval,
          evalColor: moveEvalColor
        });
      }
      
      // If current move is not in top 3, add it separately
      if (currentMoveIndex === -1 || currentMoveIndex > 2) {
        const currentMoveData = topMoves.find(m => m.uci === currentMoveUci);
        if (currentMoveData) {
          const totalGames = currentMoveData.white + currentMoveData.draws + currentMoveData.black;
          const whiteWin = totalGames > 0 ? ((currentMoveData.white / totalGames) * 100).toFixed(1) : 0;
          const draws = totalGames > 0 ? ((currentMoveData.draws / totalGames) * 100).toFixed(1) : 0;
          const blackWin = totalGames > 0 ? ((currentMoveData.black / totalGames) * 100).toFixed(1) : 0;
          
          // Get evaluation from cache (preloaded)
          let moveEval = '-';
          let moveEvalColor = '#888';
          
          const evalKey = `${positionFen}_${currentMoveUci}`;
          const cachedEval = this.evaluationCache[evalKey];
          
          if (cachedEval !== undefined && cachedEval !== null) {
            const playerEval = this.app.playerColor === 'b' ? -cachedEval : cachedEval;
            moveEval = playerEval > 0 ? '+' + playerEval.toFixed(1) : playerEval.toFixed(1);
            moveEvalColor = playerEval > 1 ? '#2ecc71' : playerEval < -1 ? '#e74c3c' : '#f1c40f';
          } else if (cachedEval === null) {
            moveEval = 'N/A';
          }
          
          tableData.push({
            move: currentMove.san,
            color: '#3498db',
            label: moveLabel,
            whiteWin,
            draws,
            blackWin,
            totalGames,
            isCurrentMove: true,
            moveType: moveLabel,
            eval: moveEval,
            evalColor: moveEvalColor
          });
        }
      }
      
      // Render comparison table with cached data
      // Get position info first
      let positionText = 'Starting Position';
      
      if (this.currentMoveIndex >= 0) {
        const moveNum = Math.floor(this.currentMoveIndex / 2) + 1;
        const side = this.currentMoveIndex % 2 === 0 ? 'W' : 'B';
        const move = this.moveHistory[this.currentMoveIndex];
        positionText = `Move ${moveNum} (${side}): ${move.san}`;
      }
      
      const evalText = `Eval: ${this.currentEval || '0.0'}`;
      const evalColor = this.currentEvalColor || '#f1c40f';
      
      this.renderComparisonTable(tableData, positionText, evalText, evalColor, comparisonTableContent);
      
      // Draw arrows
      this.drawMoveArrows(currentMove, topMoves.slice(0, 3), currentMoveIndex, isPlayerMove);
      
    } catch (error) {
      console.error('Error updating move comparison:', error);
    }
  }
 renderComparisonTable(tableData, positionText, evalText, evalColor, comparisonTableContent) {
    if (!comparisonTableContent || tableData.length === 0) return;
    
    let tableHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px; font-size: 0.68rem;">
        <span style="font-weight: bold; color: var(--roman-gold);">Move Comparison</span>
        <div style="display: flex; gap: 8px; font-size: 0.63rem;">
          <span style="color: #fff;">${positionText}</span>
          <span style="color: ${evalColor};">${evalText}</span>
        </div>
      </div>
      <table style="width: 100%; border-collapse: collapse; font-size: 0.65rem; background: rgba(0,0,0,0.3); border-radius: 4px; overflow: hidden;">
        <thead>
          <tr style="background: rgba(0,0,0,0.4);">
            <th style="padding: 3px 4px; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.1);">Move</th>
            <th style="padding: 3px 4px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.1);">⚪ Win</th>
            <th style="padding: 3px 4px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.1);">⚫ Win</th>
            <th style="padding: 3px 4px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.1);">🤝 Draw</th>             
            <th style="padding: 3px 4px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.1);">Games</th>
            <th style="padding: 3px 4px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.1);">Eval</th>
          </tr>
        </thead>
        <tbody>
    `;
    
    tableData.forEach(row => {
      const rowStyle = row.isCurrentMove 
        ? `background: linear-gradient(90deg, ${row.color}20, ${row.color}10); border-left: 3px solid ${row.color}; font-weight: bold;`
        : `border-left: 3px solid ${row.color};`;
      
      const moveIcon = row.isCurrentMove ? (row.moveType === 'Your' ? ' ✓' : ' 🤖') : '';
      
      tableHTML += `
        <tr style="${rowStyle}">
          <td style="padding: 3px 4px;">
            <span style="color: ${row.color}; font-weight: bold;">${row.label}:</span> ${row.move}${moveIcon}
          </td>
          <td style="padding: 3px 4px; text-align: center; color: #fff;">${row.whiteWin}%</td>            
          <td style="padding: 3px 4px; text-align: center; color: #bbb;">${row.blackWin}%</td>
          <td style="padding: 3px 4px; text-align: center; color: #f1c40f;">${row.draws}%</td>
          <td style="padding: 3px 4px; text-align: center; color: #888; font-size: 0.58rem;">${row.totalGames.toLocaleString()}</td>
          <td style="padding: 3px 4px; text-align: center; color: ${row.evalColor}; font-weight: bold;">${row.eval}</td>
        </tr>
      `;
    });
    
    tableHTML += `
        </tbody>
      </table>
    `;
    
    comparisonTableContent.innerHTML = tableHTML;
  }
  drawMoveArrows(currentMove, topMoves, currentMoveIndex, isPlayerMove) {
    const arrowLayer = document.getElementById('arrowLayer');
    const boardEl = document.getElementById('analysisBoard');
    if (!arrowLayer || !boardEl) return;
    
    const boardRect = boardEl.getBoundingClientRect();
    const squareSize = boardRect.width / 8;
    const isFlipped = this.app.playerColor === 'b';
    
    // Helper to convert square to coordinates
    const squareToCoords = (square) => {
      const file = square.charCodeAt(0) - 97; // a=0, b=1, etc.
      const rank = 8 - parseInt(square[1]); // 8=0, 7=1, etc.
      
      // Flip coordinates if board is flipped
      const displayFile = isFlipped ? 7 - file : file;
      const displayRank = isFlipped ? 7 - rank : rank;
      
      return {
        x: (displayFile + 0.5) * squareSize,
        y: (displayRank + 0.5) * squareSize
      };
    };
    
    // Set SVG viewBox
    arrowLayer.setAttribute('viewBox', `0 0 ${boardRect.width} ${boardRect.height}`);
    
    // Check if current move is in top 3
    const currentMoveUci = currentMove.from + currentMove.to + (currentMove.promotion || '');
    const isTop3Move = currentMoveIndex >= 0 && currentMoveIndex <= 2;
    
    if (isTop3Move) {
      // Current move is one of the top 3 - draw dual-color arrow
      const moveFrom = squareToCoords(currentMove.from);
      const moveTo = squareToCoords(currentMove.to);
      
      // Determine the color based on ranking
      let innerColor;
      if (currentMoveIndex === 0) {
        innerColor = '#2ecc71'; // Green for top move
      } else if (currentMoveIndex === 1) {
        innerColor = '#f1c40f'; // Yellow for 2nd
      } else {
        innerColor = '#e67e22'; // Orange for 3rd
      }
      
      // Draw dual-color arrow: blue border with colored center for player, or just colored for AI
      if (isPlayerMove) {
        this.drawArrow(arrowLayer, moveFrom, moveTo, '#3498db', 12, innerColor);
      } else {
        // For AI moves in top 3, use dashed style with the ranking color
        this.drawArrow(arrowLayer, moveFrom, moveTo, innerColor, 10, null, true);
      }
      
      // Draw remaining top moves (skip current move)
      const colors = ['#2ecc71', '#f1c40f', '#e67e22'];
      topMoves.forEach((move, idx) => {
        const moveUci = move.uci;
        if (moveUci === currentMoveUci) return; // Skip current move
        
        const from = moveUci.substring(0, 2);
        const to = moveUci.substring(2, 4);
        const fromCoords = squareToCoords(from);
        const toCoords = squareToCoords(to);
        
        this.drawArrow(arrowLayer, fromCoords, toCoords, colors[idx], 6);
      });
    } else {
      // Current move is NOT in top 3 - draw separately
      const moveFrom = squareToCoords(currentMove.from);
      const moveTo = squareToCoords(currentMove.to);
      
      if (isPlayerMove) {
        this.drawArrow(arrowLayer, moveFrom, moveTo, '#3498db', 8);
      } else {
        // AI move outside top 3 - use dashed blue
        this.drawArrow(arrowLayer, moveFrom, moveTo, '#3498db', 8, null, true);
      }
      
      // Draw top 3 moves from database
      const colors = ['#2ecc71', '#f1c40f', '#e67e22'];
      topMoves.forEach((move, idx) => {
        const moveUci = move.uci;
        if (moveUci === currentMoveUci) return; // Should not happen but safety check
        
        const from = moveUci.substring(0, 2);
        const to = moveUci.substring(2, 4);
        const fromCoords = squareToCoords(from);
        const toCoords = squareToCoords(to);
        
        this.drawArrow(arrowLayer, fromCoords, toCoords, colors[idx], 6);
      });
    }
  }

  drawArrow(svg, from, to, color, width, outlineColor = null, dashed = false) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const angle = Math.atan2(dy, dx);
    const length = Math.sqrt(dx * dx + dy * dy);
    
    // Shorten the arrow to not overlap pieces
    const shortenBy = 20;
    const adjustedLength = length - shortenBy;
    const startX = from.x + Math.cos(angle) * (shortenBy / 2);
    const startY = from.y + Math.sin(angle) * (shortenBy / 2);
    const endX = startX + Math.cos(angle) * adjustedLength;
    const endY = startY + Math.sin(angle) * adjustedLength;
    
    // Arrow head
    const headLength = 15;
    const headAngle = Math.PI / 6;
    
    const head1X = endX - headLength * Math.cos(angle - headAngle);
    const head1Y = endY - headLength * Math.sin(angle - headAngle);
    const head2X = endX - headLength * Math.cos(angle + headAngle);
    const head2Y = endY - headLength * Math.sin(angle + headAngle);
    
    // If outline color provided, draw outline first (for dual-color effect)
    if (outlineColor) {
      const outlineWidth = width + 4;
      
      const outlineLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      outlineLine.setAttribute('x1', startX);
      outlineLine.setAttribute('y1', startY);
      outlineLine.setAttribute('x2', endX);
      outlineLine.setAttribute('y2', endY);
      outlineLine.setAttribute('stroke', color);
      outlineLine.setAttribute('stroke-width', outlineWidth);
      outlineLine.setAttribute('stroke-linecap', 'round');
      outlineLine.setAttribute('opacity', '0.8');
      svg.appendChild(outlineLine);
      
      const outlineHead = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      outlineHead.setAttribute('points', `${endX},${endY} ${head1X},${head1Y} ${head2X},${head2Y}`);
      outlineHead.setAttribute('fill', color);
      outlineHead.setAttribute('opacity', '0.8');
      svg.appendChild(outlineHead);
      
      // Now use outline color as main color for the inner arrow
      color = outlineColor;
    }
    
    // Draw line
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', startX);
    line.setAttribute('y1', startY);
    line.setAttribute('x2', endX);
    line.setAttribute('y2', endY);
    line.setAttribute('stroke', color);
    line.setAttribute('stroke-width', width);
    line.setAttribute('stroke-linecap', 'round');
    line.setAttribute('opacity', '0.9');
    if (dashed) {
      line.setAttribute('stroke-dasharray', '8,4');
    }
    svg.appendChild(line);
    
    // Draw arrow head
    const head = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    head.setAttribute('points', `${endX},${endY} ${head1X},${head1Y} ${head2X},${head2Y}`);
    head.setAttribute('fill', color);
    head.setAttribute('opacity', '0.9');
    svg.appendChild(head);
  }

  exitAnalysis() {
    console.log('Exiting analysis mode');
    this.isAnalyzing = false;
    this.analysisGame = null;
    this.currentMoveIndex = -1;
    this.moveHistory = [];
    this.topMovesData = {};
    
    // Clear global reference
    if (window.analysisBoard === this) {
      window.analysisBoard = null;
    }
    
    // Return to main game view
    this.app.render();
  }
}

// Make it globally accessible for onclick handlers
if (typeof window !== 'undefined') {
  window.AnalysisBoard = AnalysisBoard;
  console.log('✅ AnalysisBoard class loaded');
}
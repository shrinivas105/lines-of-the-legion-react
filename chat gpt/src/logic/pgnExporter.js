// pgn-exporter.js - Handles PGN generation and export

class PGNExporter {
  static generatePGN(game, playerColor, aiSource, battleRank, score, moveQuality, finalEval) {
    const now = new Date();
    const date = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    
    // Determine result
    let result = '*';
    if (finalEval <= -3) {
      result = playerColor === 'w' ? '0-1' : '1-0';
    } else if (finalEval >= 3) {
      result = playerColor === 'w' ? '1-0' : '0-1';
    } else {
      result = '1/2-1/2';
    }
    
    // Build headers
    const headers = [
      `[Event "Lines of the Legion - ${aiSource === 'master' ? 'Masters' : 'Club'} Training"]`,
      `[Site "linesofthelegion.vercel.app"]`,
      `[Date "${date}"]`,
      `[Time "${time}"]`,
      `[Round "1"]`,
      `[White "${playerColor === 'w' ? 'Player' : 'Computer'}"]`,
      `[Black "${playerColor === 'b' ? 'Player' : 'Computer'}"]`,
      `[Result "${result}"]`,
      `[BattleRank "${battleRank.title}"]`,
      `[BattleScore "${score}/100"]`,
      `[MoveQuality "${moveQuality}%"]`,
      `[FinalEval "${finalEval > 0 ? '+' : ''}${finalEval.toFixed(1)}"]`,
      `[Variant "Standard"]`,
      `[ECO ""]`,
      `[Opening ""]`
    ];
    
    // Get move history from chess.js
    const history = game.history({ verbose: false });
    
    // Format moves in PGN style
    let moveText = '';
    for (let i = 0; i < history.length; i++) {
      if (i % 2 === 0) {
        // White's move - add move number
        moveText += `${Math.floor(i / 2) + 1}. ${history[i]} `;
      } else {
        // Black's move
        moveText += `${history[i]} `;
      }
      
      // Add line break every 8 moves for readability
      if ((i + 1) % 16 === 0) {
        moveText += '\n';
      }
    }
    
    // Add result at the end
    moveText += result;
    
    // Combine headers and moves
    return headers.join('\n') + '\n\n' + moveText.trim() + '\n';
  }
  
  static downloadPGN(pgnContent, filename = null) {
    if (!filename) {
      const now = new Date();
      const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
      filename = `legion_battle_${timestamp}.pgn`;
    }
    
    const blob = new Blob([pgnContent], { type: 'application/x-chess-pgn' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
  
  static copyPGNToClipboard(pgnContent) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(pgnContent)
        .then(() => {
          alert('✓ PGN copied to clipboard!');
        })
        .catch(err => {
          console.error('Failed to copy:', err);
          this.fallbackCopy(pgnContent);
        });
    } else {
      this.fallbackCopy(pgnContent);
    }
  }
  
  static fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      alert('✓ PGN copied to clipboard!');
    } catch (err) {
      alert('Failed to copy PGN. Please try downloading instead.');
    }
    document.body.removeChild(textarea);
  }
}

export { PGNExporter };
export default PGNExporter;

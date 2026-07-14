(async () => {
  await LichessAuth.init();
  LichessAuth.renderButton();
  window.app = new ChessTheoryApp();
})();
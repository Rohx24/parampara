export default function HUD({
  language,
  setLanguage,
  flashMs,
  setFlashMs,
  hindiMode,
  setHindiMode,
  soundOn,
  setSoundOn,
  score,
  phase,
}) {
  return (
    <aside className="bp-hud">
      <div className="bp-brand">
        <div className="bp-title">BashaPlay</div>
        <div className="bp-subtitle">Build the word, color by color.</div>
      </div>

      <div className="bp-score-card">
        <div className="bp-score-label">Score</div>
        <div className="bp-score-value">{score}</div>
        <div className="bp-phase">{phase === 'SHOW_WORD' ? 'Memorize!' : phase === 'PLAYING' ? 'Play!' : 'Celebration!'}</div>
      </div>

      <div className="bp-panel">
        <div className="bp-panel-title">Settings</div>

        <div className="bp-setting">
          <div className="bp-setting-label">Language</div>
          <div className="bp-toggle">
            <button
              type="button"
              className={language === 'en' ? 'is-selected' : ''}
              onClick={() => setLanguage('en')}
            >
              English
            </button>
            <button
              type="button"
              className={language === 'hi' ? 'is-selected' : ''}
              onClick={() => setLanguage('hi')}
            >
              Hindi
            </button>
            <button
              type="button"
              className={language === 'ta' ? 'is-selected' : ''}
              onClick={() => setLanguage('ta')}
            >
              Tamil
            </button>
            <button
              type="button"
              className={language === 'te' ? 'is-selected' : ''}
              onClick={() => setLanguage('te')}
            >
              Telugu
            </button>
          </div>
        </div>

        <div className="bp-setting">
          <div className="bp-setting-label">Flash Time</div>
          <input
            type="range"
            min="800"
            max="2500"
            step="100"
            value={flashMs}
            onChange={(event) => setFlashMs(Number(event.target.value))}
          />
          <div className="bp-setting-caption">{flashMs} ms</div>
        </div>

        {language === 'hi' && (
          <div className="bp-setting">
            <div className="bp-setting-label">Hindi Mode</div>
            <div className="bp-toggle">
              <button
                type="button"
                className={hindiMode === 'easy' ? 'is-selected' : ''}
                onClick={() => setHindiMode('easy')}
              >
                Easy
              </button>
              <button
                type="button"
                className={hindiMode === 'medium' ? 'is-selected' : ''}
                onClick={() => setHindiMode('medium')}
              >
                Medium
              </button>
            </div>
          </div>
        )}

        <div className="bp-setting">
          <div className="bp-setting-label">Sound</div>
          <button
            type="button"
            className={`bp-sound ${soundOn ? 'is-on' : ''}`}
            onClick={() => setSoundOn((prev) => !prev)}
          >
            {soundOn ? 'On' : 'Off'}
          </button>
        </div>
      </div>

      <div className="bp-tip">
        Tip: Select a tile with arrows or Tab, then place it with Enter.
      </div>
    </aside>
  );
}

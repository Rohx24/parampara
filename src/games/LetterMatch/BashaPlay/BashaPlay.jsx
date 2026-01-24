import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './styles.css';
import { createRound, shuffleArray } from './GameEngine';
import { wordsEn } from './data/words.en';
import { wordsHi } from './data/words.hi';
import { wordsTa } from './data/words.ta';
import { wordsTe } from './data/words.te';
import BoxRow from './ui/BoxRow';
import TileTray from './ui/TileTray';
import HUD from './ui/HUD';

const PHASES = {
  SHOW_WORD: 'SHOW_WORD',
  PLAYING: 'PLAYING',
  COMPLETED: 'COMPLETED',
};

export default function BashaPlay() {
  const [language, setLanguage] = useState('en');
  const [flashMs, setFlashMs] = useState(1500);
  const [hindiMode, setHindiMode] = useState('easy');
  const [soundOn, setSoundOn] = useState(true);

  const [phase, setPhase] = useState(PHASES.SHOW_WORD);
  const [round, setRound] = useState(null);
  const [placements, setPlacements] = useState({});
  const [activeTileId, setActiveTileId] = useState(null);
  const [sparkleBoxId, setSparkleBoxId] = useState(null);
  const [shakeTileId, setShakeTileId] = useState(null);
  const [score, setScore] = useState(0);

  const lastWordRef = useRef('');
  const wordBagRef = useRef([]);
  const audioRef = useRef(null);

  const words = useMemo(() => {
    if (language === 'hi') return wordsHi;
    if (language === 'ta') return wordsTa;
    if (language === 'te') return wordsTe;
    return wordsEn;
  }, [language]);

  const refillWordBag = useCallback(() => {
    const bag = shuffleArray(words);
    if (lastWordRef.current && bag.length > 1 && bag[0].word === lastWordRef.current) {
      [bag[0], bag[1]] = [bag[1], bag[0]];
    }
    wordBagRef.current = bag;
  }, [words]);

  const getNextWord = useCallback(() => {
    if (wordBagRef.current.length === 0) {
      refillWordBag();
    }
    return wordBagRef.current.shift() ?? null;
  }, [refillWordBag]);

  const playTone = useCallback(
    (frequency, duration = 0.18) => {
      if (!soundOn) return;
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      if (!audioRef.current) {
        audioRef.current = new AudioContext();
      }
      const ctx = audioRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    },
    [soundOn]
  );

  const startRound = useCallback(() => {
    const nextWord = getNextWord();
    lastWordRef.current = nextWord?.word ?? '';
    const nextRound = createRound(nextWord, language, hindiMode);
    setRound(nextRound);
    setPlacements({});
    setActiveTileId(null);
    setSparkleBoxId(null);
    setShakeTileId(null);
    setPhase(PHASES.SHOW_WORD);
  }, [getNextWord, hindiMode, language]);

  useEffect(() => {
    wordBagRef.current = [];
    lastWordRef.current = '';
  }, [words]);

  useEffect(() => {
    startRound();
  }, [startRound]);

  useEffect(() => {
    if (phase === PHASES.SHOW_WORD) {
      const timer = setTimeout(() => setPhase(PHASES.PLAYING), flashMs);
      return () => clearTimeout(timer);
    }
    if (phase === PHASES.COMPLETED) {
      const timer = setTimeout(() => startRound(), 800);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [flashMs, phase, startRound]);

  useEffect(() => {
    if (!round) return;
    if (phase !== PHASES.PLAYING) return;
    const filledCount = Object.keys(placements).length;
    if (filledCount === round.boxes.length) {
      setPhase(PHASES.COMPLETED);
      setScore((prev) => prev + 1);
    }
  }, [placements, phase, round]);

  const handleSelectTile = (tileId) => {
    setActiveTileId(tileId);
  };

  const handleAttemptPlace = (tileId, boxId) => {
    if (!round) return;
    if (phase !== PHASES.PLAYING) return;
    if (placements[boxId] !== undefined) return;

    if (tileId === boxId) {
      setPlacements((prev) => ({ ...prev, [boxId]: tileId }));
      setRound((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          tiles: prev.tiles.map((tile) =>
            tile.id === tileId ? { ...tile, locked: true } : tile
          ),
        };
      });
      setSparkleBoxId(boxId);
      setTimeout(() => setSparkleBoxId(null), 450);
      setActiveTileId(null);
      playTone(720, 0.16);
    } else {
      setShakeTileId(tileId);
      setTimeout(() => setShakeTileId(null), 450);
      playTone(200, 0.22);
    }
  };

  const showWord = phase === PHASES.SHOW_WORD && round;
  const isInteractive = phase === PHASES.PLAYING;

  return (
    <div className="bashaplay">
      <div className="bp-sheen" aria-hidden="true" />
      <div className="bp-layout">
        <HUD
          language={language}
          setLanguage={setLanguage}
          flashMs={flashMs}
          setFlashMs={setFlashMs}
          hindiMode={hindiMode}
          setHindiMode={setHindiMode}
          soundOn={soundOn}
          setSoundOn={setSoundOn}
          score={score}
          phase={phase}
        />

        <div className="bp-board">
          {phase === PHASES.COMPLETED && (
            <div className="bp-banner">Brilliant! Next word coming up.</div>
          )}

          <div className={`bp-word-card ${showWord ? 'is-visible' : ''}`}>
            <div className="bp-word-label">Flash Word</div>
            <div className="bp-word-text">{round?.currentWord?.word}</div>
            <div className="bp-word-helper">Memorize fast, then rebuild the puzzle.</div>
          </div>

          <div className={`bp-play-area ${showWord ? 'is-dimmed' : ''}`}>
            <BoxRow
              boxes={round?.boxes ?? []}
              placements={placements}
              onAttemptPlace={handleAttemptPlace}
              activeTileId={activeTileId}
              sparkleBoxId={sparkleBoxId}
              isInteractive={isInteractive}
            />

            {phase !== PHASES.SHOW_WORD && round?.currentWord?.meaning && (
              <div className="bp-meaning" aria-live="polite">
                <span className="bp-meaning-label">Meaning:</span>
                <span className="bp-meaning-text">{round.currentWord.meaning}</span>
              </div>
            )}

            <TileTray
              tiles={round?.tiles ?? []}
              activeTileId={activeTileId}
              onSelectTile={handleSelectTile}
              shakeTileId={shakeTileId}
              isInteractive={isInteractive}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

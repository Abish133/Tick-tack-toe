'use client';
import { useEffect, useState } from 'react';
import { X, Circle, Users, Bot, RefreshCw, WifiOff, Trophy, Sparkles } from 'lucide-react';
import { createGame, applyAction, chooseAIAction } from '@/lib/game-engine/index';
import styles from './OfflineArena.module.css';

const LEVELS = ['Beginner', 'Easy', 'Medium', 'Hard', 'Expert', 'Extreme', 'Nightmare'];
const STORAGE = 'elemental-arena-local-classic-v1';
const DEFAULT_CONFIG = { opponent: 'human', difficulty: 'Hard', humanMark: 'X' };
function fresh(config) {
  return createGame({ mode: 'classic', rounds: 1, now: 0, players: ['X', 'O'].map(mark => ({ id: `local-${mark.toLowerCase()}`, name: config.opponent === 'human' ? `Player ${mark}` : config.humanMark === mark ? 'You' : `${config.difficulty} AI` })) });
}
function restore() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE));
    const game = data?.game;
    const ids = ['local-x', 'local-o'];
    const shapeValid = game && Object.keys(fresh(DEFAULT_CONFIG)).every(key => key in game) && ['revision', 'round', 'turnNumber', 'roundTurns', 'maxRoundActions'].every(key => Number.isInteger(game[key]) && game[key] >= 0) && Array.isArray(game.history) && Array.isArray(game.roundHistory) && ids.every(id => Number.isFinite(game.remainingMs?.[id]) && Number.isFinite(game.roundWins?.[id]) && Number.isFinite(game.energy?.[id]));
    if (shapeValid && game.version === 1 && game.mode === 'classic' && game.maxRounds === 1 && ['active', 'finished'].includes(game.status) && game.board?.length === 9 && game.board.every(cell => cell === null || ids.includes(cell)) && game.players?.length === 2 && game.players.every((player, index) => player.id === ids[index] && player.mark === ['X', 'O'][index]) && ids.includes(game.currentPlayerId) && Number.isFinite(game.turnStartedAt) && game.effects?.length === 9 && game.effects.every(effect => effect && typeof effect === 'object') && Array.isArray(game.winningLines) && ['human', 'ai'].includes(data.config?.opponent) && LEVELS.includes(data.config?.difficulty) && ['X', 'O'].includes(data.config?.humanMark) && ['X', 'O', 'draws'].every(key => Number.isInteger(data.score?.[key]) && data.score[key] >= 0)) return data;
  } catch {}
  return { config: DEFAULT_CONFIG, game: fresh(DEFAULT_CONFIG), score: { X: 0, O: 0, draws: 0 } };
}

async function prepareOffline() {
  if (!('serviceWorker' in navigator)) return false;
  const registration = await navigator.serviceWorker.register('/local-play-sw.js', { scope: '/' });
  await navigator.serviceWorker.ready;
  const worker = registration.active || registration.waiting;
  if (!worker) return false;
  const resources = [...document.querySelectorAll('script[src],link[rel="stylesheet"]')].map(element => element.src || element.href);
  resources.push(...performance.getEntriesByType('resource').map(entry => entry.name));
  return new Promise(resolve => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => resolve(false), 15000);
    channel.port1.onmessage = event => { clearTimeout(timer); resolve(event.data?.ready === true); };
    worker.postMessage({ type: 'CACHE_LOCAL_PLAY', resources }, [channel.port2]);
  });
}

export default function OfflineArena() {
  const [data, setData] = useState(null);
  const [offlineReady, setOfflineReady] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    setData(restore());
    let alive = true;
    prepareOffline().then(ready => { if (alive) setOfflineReady(ready); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  useEffect(() => { if (data) try { localStorage.setItem(STORAGE, JSON.stringify(data)); } catch {} }, [data]);
  const game = data?.game;
  const config = data?.config;
  const current = game?.players.find(player => player.id === game.currentPlayerId);
  const aiTurn = game?.status === 'active' && config.opponent === 'ai' && current?.mark !== config.humanMark;

  function commit(cell, expectedRevision) {
    setData(previous => {
      if (!previous || previous.game.status !== 'active' || previous.game.revision !== expectedRevision) return previous;
      try {
        // Untimed local practice advances a logical clock, without server clocks or rewards.
        const next = applyAction(previous.game, previous.game.currentPlayerId, { type: 'place', cell, revision: expectedRevision }, previous.game.turnStartedAt + 1000);
        const score = { ...previous.score };
        if (next.status === 'finished') { const winner = next.players.find(player => player.id === next.matchWinnerId); score[winner?.mark || 'draws'] += 1; }
        return { ...previous, game: next, score };
      } catch (failure) { setError(failure.message); return previous; }
    });
  }
  useEffect(() => {
    if (!aiTurn) return;
    const timer = setTimeout(() => {
      const action = chooseAIAction(game, config.difficulty.toLowerCase());
      if (action?.type === 'place') commit(action.cell, game.revision);
    }, 450);
    return () => clearTimeout(timer);
  }, [game?.revision, aiTurn, config?.difficulty]);
  function configure(patch) {
    setError('');
    setData(previous => { const next = { ...previous.config, ...patch }; return { config: next, game: fresh(next), score: { X: 0, O: 0, draws: 0 } }; });
  }
  if (!game) return <div className="loading-state">Preparing your local board…</div>;
  const winner = game.players.find(player => player.id === game.matchWinnerId);
  const finished = game.status === 'finished';
  const winningCells = new Set(game.winningLines.flat());
  return <section className={`panel ${styles.root}`} aria-label="Local classic arena">
    <div className={styles.heading}><div><span className="badge violet"><WifiOff size={13} /> SAME DEVICE CLASSIC</span><h2>A rivalry that travels with you.</h2><p>Two players on one device, or a computer opponent. Take your time.</p></div><span className={styles.offline} role="status">{offlineReady ? 'Available offline on this browser' : 'Local play · No account required'}</span></div>
    <div className={styles.layout}>
      <div className={styles.options}><h3>Your local arena</h3><label>Local game opponent<select aria-label="Local game opponent" value={config.opponent} onChange={event => configure({ opponent: event.target.value })}><option value="human">Two players · same device</option><option value="ai">Computer opponent</option></select></label>{config.opponent === 'ai' && <><label>AI difficulty<select aria-label="AI difficulty" value={config.difficulty} onChange={event => configure({ difficulty: event.target.value })}>{LEVELS.map(level => <option key={level}>{level}</option>)}</select></label><label>Play as mark<select aria-label="Play as mark" value={config.humanMark} onChange={event => configure({ humanMark: event.target.value })}><option value="X">X · Play first</option><option value="O">O · Play second</option></select></label><p>Hard and above use complete classic search. Perfect play draws.</p></>}<div className={styles.info}>{config.opponent === 'human' ? <Users size={21} /> : <Bot size={21} />}<p>Settings start a fresh game and reset this local score. Your current game resumes after a reload.</p></div><small>Local games award no cups, coins, XP, missions, or multiplayer results.</small></div>
      <div className={styles.arena}><div className={styles.turn} aria-live="polite">{finished ? winner ? `${winner.name} wins as ${winner.mark}` : 'A draw. Well played, both sides.' : aiTurn ? `${current.name} is thinking…` : `${current.name} · ${current.mark} to move`}</div><div className={`game-board ${styles.board}`} role="group" aria-label="Local three by three classic board">{game.board.map((owner, cell) => { const player = game.players.find(player => player.id === owner); return <button className={`game-cell ${player?.mark?.toLowerCase() || ''} ${winningCells.has(cell) ? styles.winning : ''}`} key={cell} disabled={!!owner || finished || aiTurn} aria-label={`Local row ${Math.floor(cell / 3) + 1}, column ${cell % 3 + 1}: ${player?.mark || 'empty'}`} onClick={() => { setError(''); commit(cell, game.revision); }}>{player && <span className={`mark ${player.mark.toLowerCase()}`}>{player.mark === 'X' ? <X /> : <Circle />}</span>}</button>; })}</div>{error && <p role="alert">{error}</p>}<button className="button primary" onClick={() => { setError(''); setData(previous => ({ ...previous, game: fresh(previous.config) })); }}><RefreshCw size={16} />New local game</button><div className={styles.score} aria-label="Local session score"><span><X size={16} /> {data.score.X}<small>X wins</small></span><span><Sparkles size={16} /> {data.score.draws}<small>Draws</small></span><span><Circle size={16} /> {data.score.O}<small>O wins</small></span></div><p className={styles.caption}><Trophy size={14} /> Three matching marks win. Nine cells. No powers. No timer.</p></div>
    </div>
  </section>;
}

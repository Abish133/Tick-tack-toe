'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Clock3, Crown, LoaderCircle, RefreshCw, Trophy, Users } from 'lucide-react';
import styles from './AdminPanel.module.css';

export default function TournamentView({ api, id, tournamentId, user, onError, onNotice }) {
  const selectedId = tournamentId || id;
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const loadSequence = useRef(0);
  const load = useCallback(async () => {
    if (!selectedId) { setError('A tournament ID is required.'); setLoading(false); return; }
    const sequence = ++loadSequence.current;
    setLoading(true);
    try { const data = await api(`/tournaments/${encodeURIComponent(selectedId)}`); if (sequence === loadSequence.current) { setTournament(data.tournament); setError(''); } }
    catch (problem) { if (sequence === loadSequence.current) { setError(problem.message); onError?.(problem.message); } }
    finally { if (sequence === loadSequence.current) setLoading(false); }
  }, [api, selectedId, onError]);
  useEffect(() => { setTournament(null); load(); return () => { loadSequence.current += 1; }; }, [load]);
  useEffect(() => {
    if (tournament?.status !== 'active') return;
    let active = true;
    const timer = setInterval(async () => {
      if (document.hidden) return;
      try { const data = await api(`/tournaments/${encodeURIComponent(selectedId)}`); if (active) setTournament(data.tournament); } catch { /* Manual refresh reports connection failures. */ }
    }, 10000);
    return () => { active = false; clearInterval(timer); };
  }, [api, selectedId, tournament?.status]);

  async function action(endpoint, message) {
    setBusy(true); setError('');
    try { await api(endpoint, 'POST', {}); setNotice(message); onNotice?.(message); await load(); }
    catch (problem) { setError(problem.message); onError?.(problem.message); }
    finally { setBusy(false); }
  }

  const participants = tournament?.participants ?? [];
  const registered = participants.some(player => player.userId === user?.id);
  const playerName = playerId => participants.find(player => player.userId === playerId)?.user?.name || (playerId ? `Player ${playerId.slice(0, 8)}` : 'Awaiting winner');
  const championId = tournament?.status === 'finished' ? tournament.rounds?.at(-1)?.matches?.[0]?.winnerId : null;

  return <section className={styles.root} aria-label="Tournament details">
    <a className={styles.back} href="/tournaments"><ArrowLeft size={15} /> All tournaments</a>
    {error && <p className={styles.error} role="alert">{error}</p>}
    {notice && <p className={styles.notice} role="status">{notice}</p>}
    {loading && !tournament ? <div className={`panel ${styles.loading}`} role="status"><LoaderCircle size={22} /> Loading tournament…</div> : tournament && <>
      <header className={styles.header}><div><span className={styles.eyebrow}><Trophy size={14} /> TOURNAMENT</span><h1>{tournament.name}</h1><p>{tournament.ruleset === 'classic' ? 'Classic' : 'Elemental Battle'} · Single elimination</p></div><button className="button secondary" onClick={load} disabled={loading || busy}><RefreshCw size={15} /> Refresh</button></header>
      <div className={`panel ${styles.tournamentSummary}`}><div><Clock3 size={17} /><span>Starts<strong>{new Date(tournament.startsAt).toLocaleString()}</strong></span></div><div><Users size={17} /><span>Registered<strong>{participants.length}/{tournament.maxPlayers}</strong></span></div><span className={`${styles.status} ${tournament.status === 'active' ? styles.active : ''}`}>{tournament.status}</span>{tournament.status === 'registration' && <div className={styles.actions}><button className="button primary" disabled={busy || !user || registered || participants.length >= tournament.maxPlayers} onClick={() => action(`/tournaments/${encodeURIComponent(selectedId)}/register`, 'You are registered for this tournament.')}>{registered ? 'You are registered' : !user ? 'Sign in to register' : participants.length >= tournament.maxPlayers ? 'Tournament full' : 'Register'}</button>{user?.role === 'ADMIN' && <button className="button secondary" disabled={busy || ![2, 4, 8, 16, 32].includes(participants.length)} onClick={() => action(`/admin/tournaments/${encodeURIComponent(selectedId)}/start`, 'Tournament started.')}>Start bracket</button>}</div>}</div>
      {championId && <div className={`panel ${styles.champion}`}><Crown size={30} /><div><span>TOURNAMENT CHAMPION</span><h2>{playerName(championId)}</h2></div></div>}
      <div className={`panel ${styles.section}`}><h2>Bracket</h2>{tournament.rounds?.length ? <div className={styles.bracket}>{tournament.rounds.map(round => <section className={styles.round} key={round.id}><h3>{round.matches.length === 1 ? 'Final' : round.matches.length === 2 ? 'Semifinals' : `Round ${round.number}`}</h3>{round.matches.map((match, index) => <article className={styles.bracketMatch} key={match.id}><small>Match {index + 1}</small>{[match.playerAId, match.playerBId].map((playerId, position) => <div key={position} className={`${styles.bracketPlayer} ${match.winnerId === playerId && playerId ? styles.winner : ''}`}><span>{playerName(playerId)}</span>{match.winnerId === playerId && playerId && <Crown size={14} />}</div>)}<div className={styles.matchStatus}>{match.winnerId ? `${playerName(match.winnerId)} advances` : match.match?.status === 'finished' ? 'Draw — replay being prepared' : match.match?.status === 'active' || match.matchId ? 'Match in progress' : 'Waiting for players'}</div>{match.matchId && [match.playerAId, match.playerBId].includes(user?.id) && !match.winnerId && match.match?.status !== 'finished' && <a className="button secondary" href="/battle">Open your match</a>}</article>)}</section>)}</div> : <p className={styles.empty}>The bracket appears when an administrator starts the tournament.</p>}<p className={styles.help}>Draws automatically replay the same pairing until a winner is decided. Previous drawn matches remain in match history. Active brackets refresh every 10 seconds.</p></div>
      <div className={`panel ${styles.section}`}><h2>Registered players</h2>{participants.length ? <div className={styles.participants}>{participants.map(player => <div className={styles.participant} key={player.userId}><span className={styles.seed}>{player.seed ?? '—'}</span><div><strong>{player.user?.name || playerName(player.userId)}</strong><small>{player.eliminated ? 'Eliminated' : tournament.status === 'registration' ? 'Registered' : `${player.wins} ${player.wins === 1 ? 'win' : 'wins'}`}</small></div>{championId === player.userId && <Crown size={18} />}</div>)}</div> : <p className={styles.empty}>No players have registered yet.</p>}</div>
    </>}
  </section>;
}

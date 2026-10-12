'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Activity, ChevronRight, ClipboardList, Flag, Gift, LoaderCircle, Megaphone, RefreshCw, ShieldCheck, ShoppingBag, Swords, Trophy, Users } from 'lucide-react';
import styles from './AdminPanel.module.css';
import {AdminTelemetry,MissionManager,AnnouncementComposer} from './AdminOperations';

const TABS = [['overview', 'Overview', Activity], ['users', 'Players', Users], ['reports', 'Reports', Flag], ['matches', 'Matches', Swords], ['tournaments', 'Tournaments', Trophy], ['seasons', 'Seasons', Trophy], ['missions','Missions',Gift], ['announcements','Announcements',Megaphone], ['catalog', 'Cosmetics', ShoppingBag], ['audit', 'Audit log', ClipboardList]];
const formatDate = value => value ? new Date(value).toLocaleString() : '—';
const number = value => typeof value === 'number' ? value.toLocaleString() : '—';
const shortId = value => value ? `${value.slice(0, 12)}…` : '—';
const localDateTime = value => { if (!value) return ''; const date = new Date(value); return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
function Empty({ children }) { return <p className={styles.empty}>{children}</p>; }
function Status({ children, active = false }) { return <span className={`${styles.status} ${active ? styles.active : ''}`}>{children}</span>; }

/** Role visibility supplements the API's independent administrator check. */
export default function AdminPanel({ api, user, onError, onNotice }) {
  const [tab, setTab] = useState('overview');
  const [overview, setOverview] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [season, setSeason] = useState({ id: '', name: '', startsAt: '', endsAt: '' });
  const loadSequence = useRef(0);
  const isAdmin = user?.role === 'ADMIN';

  const load = useCallback(async () => {
    if (!isAdmin) return;
    const sequence = ++loadSequence.current;
    setLoading(true); setError('');
    try {
      const summary = await api('/admin');
      const endpoints = { users: '/admin/users', matches: '/admin/matches', tournaments: '/tournaments', seasons: '/admin/seasons', missions:'/admin/missions', catalog: '/admin/catalog', audit: '/admin/audit' };
      const section = endpoints[tab] ? await api(endpoints[tab]) : summary;
      if (sequence === loadSequence.current) { setOverview(summary); setData(section); }
    } catch (problem) { if (sequence === loadSequence.current) { setError(problem.message); onError?.(problem.message); } }
    finally { if (sequence === loadSequence.current) setLoading(false); }
  }, [api, isAdmin, tab, onError]);
  useEffect(() => { load(); return () => { loadSequence.current += 1; }; }, [load]);

  async function perform(key, task, notice) {
    setBusy(key); setError(''); setMessage('');
    try { const result=await task();const text=typeof notice==='function'?notice(result):notice;setMessage(text); onNotice?.(text); await load(); return result; }
    catch (problem) { setError(problem.message); onError?.(problem.message); return null; }
    finally { setBusy(''); }
  }

  if (!isAdmin) return null;
  const disabled = Boolean(busy);
  const reports = overview?.reports ?? [];

  return <section className={styles.root} aria-label="Arena administration">
    <header className={styles.header}><div><span className={styles.eyebrow}><ShieldCheck size={14} /> ADMINISTRATOR</span><h1>Arena control</h1><p>Live operations, moderation, and cosmetic economy.</p></div><button className="button secondary" disabled={loading || disabled} onClick={load}><RefreshCw size={15} /> Refresh</button></header>
    <nav className={styles.tabs} aria-label="Administration sections">{TABS.map(([id, label, Icon]) => <button key={id} className={tab === id ? styles.selectedTab : ''} onClick={() => { setTab(id); setData(null); setError(''); setMessage(''); }} aria-current={tab === id ? 'page' : undefined}><Icon size={15} />{label}</button>)}</nav>
    {error && <p className={styles.error} role="alert">{error}</p>}
    {message && <p className={styles.notice} role="status">{message}</p>}
    {loading ? <div className={`panel ${styles.loading}`} role="status"><LoaderCircle size={22} /> Loading live arena data…</div> : <>
      {tab === 'overview' && overview && <><div className={styles.metrics}>{[['Players', overview.users], ['Online players', overview.online], ['Active matches', overview.active], ['Completed matches', overview.completed], ['Players in queue', overview.queued], ['Accepted actions', overview.actions]].map(([label, value]) => <div className={`panel ${styles.metric}`} key={label}><span>{label}</span><strong>{number(value)}</strong></div>)}</div><div className={`panel ${styles.section}`}><h2>Operations snapshot</h2><div className={styles.fact}><span>Open player reports</span><strong>{reports.length}</strong></div><div className={styles.fact}><span>Recorded net currency movement</span><strong>{number(overview.netCurrency)} coins</strong></div><div className={styles.fact}><span>Human-only ranked matchmaking</span><Status active={overview.features?.humanOnlyRanked}>{overview.features?.humanOnlyRanked ? 'Enabled' : 'Unavailable'}</Status></div><div className={styles.fact}><span>Match coordination</span><span>{overview.features?.multiProcess ? 'Distributed' : 'Single server'}</span></div><p className={styles.help}>Refresh reads current database and live server counters. Currency movement is the sum of recorded transactions.</p></div></>}

      {tab==='overview'&&overview&&<AdminTelemetry overview={overview}/>}
      {tab==='missions'&&<MissionManager missions={data?.missions||[]} busy={disabled} onSave={(mission,form)=>perform(`mission:${mission.id}`,async()=>{const result=await api('/admin/missions','PUT',mission);form?.reset();return result;},'Mission configuration saved.')}/>}
      {tab==='announcements'&&<AnnouncementComposer busy={disabled} onSend={(announcement,form)=>perform('announcement',async()=>{const result=await api('/admin/announcements','POST',{message:announcement});form.reset();return result;},result=>`Announcement sent to ${number(result.recipients)} opted-in players.`)}/>}
      {tab === 'users' && <div className={`panel ${styles.section}`}><h2>Players <small>Latest 100 accounts</small></h2>{data?.users?.length ? <div className={styles.tableWrap}><table><thead><tr><th>Player</th><th>Role</th><th>Cups</th><th>Status</th><th>Moderation</th></tr></thead><tbody>{data.users.map(player => <tr key={player.id}><td><strong>{player.name}</strong><small>{player.email || 'Guest account'}</small><small title={player.id}>{shortId(player.id)}</small></td><td>{player.role}</td><td>{number(player.rating?.cups)}</td><td><Status active={!player.suspended}>{player.suspended ? 'Suspended' : 'Active'}</Status></td><td><button className="button secondary" disabled={disabled || player.id === user.id} onClick={() => perform(`suspend:${player.id}`, () => api('/admin/suspend', 'POST', { userId: player.id, suspended: !player.suspended }), `${player.name} ${player.suspended ? 'reinstated' : 'suspended'}.`)}>{player.id === user.id ? 'Your account' : player.suspended ? 'Reinstate' : 'Suspend'}</button></td></tr>)}</tbody></table></div> : <Empty>No player accounts were returned.</Empty>}</div>}

      {tab === 'reports' && <div className={`panel ${styles.section}`}><h2>Open player reports</h2>{reports.length ? <div className={styles.cards}>{reports.map(report => <article className={styles.report} key={report.id}><div className={styles.row}><strong>{report.reporter?.name || shortId(report.reporterId)} <ChevronRight size={13} /> {report.reported?.name || shortId(report.reportedId)}</strong><Status>{report.status}</Status></div><p>{report.reason}</p><small>{formatDate(report.createdAt)}{report.matchId ? ` · Match ${shortId(report.matchId)}` : ''}</small><div className={styles.actions}><button className="button primary" disabled={disabled} onClick={() => perform(`review:${report.id}`, () => api('/admin/reports', 'PATCH', { id: report.id, status: 'reviewed' }), 'Report marked reviewed.')}>Mark reviewed</button><button className="button secondary" disabled={disabled} onClick={() => perform(`dismiss:${report.id}`, () => api('/admin/reports', 'PATCH', { id: report.id, status: 'dismissed' }), 'Report dismissed.')}>Dismiss</button></div></article>)}</div> : <Empty>No open reports.</Empty>}</div>}

      {tab === 'matches' && <div className={`panel ${styles.section}`}><h2>Match monitoring <small>Latest 100 matches</small></h2>{data?.matches?.length ? <div className={styles.tableWrap}><table><thead><tr><th>Players</th><th>Mode</th><th>State</th><th>Result</th><th>Started</th></tr></thead><tbody>{data.matches.map(match => <tr key={match.id}><td><strong>{match.participants.map(player => player.name).join(' vs ')}</strong><small title={match.id}>{shortId(match.id)} · revision {match.sequence}</small></td><td>{match.mode}<small>{match.ruleset}</small></td><td><Status active={match.status === 'active'}>{match.status}</Status><small>{match.settledAt ? 'Rewards settled' : 'Settlement pending'}</small></td><td>{match.status === 'finished' ? match.result?.winnerId ? `${match.participants.find(player => player.engineId === match.result.winnerId)?.name || 'Winner'} won` : 'Draw' : `Round ${match.state?.round ?? '—'}`}<small>{match.result?.reason || ''}</small></td><td>{formatDate(match.createdAt)}</td></tr>)}</tbody></table></div> : <Empty>No matches recorded yet.</Empty>}</div>}

      {tab === 'tournaments' && <><div className={`panel ${styles.section}`}><h2>Create a tournament</h2><form className={styles.formGrid} onSubmit={event => { event.preventDefault(); const form = event.currentTarget; const fields = Object.fromEntries(new FormData(form)); perform('create-tournament', async () => { await api('/admin/tournaments', 'POST', { ...fields, maxPlayers: Number(fields.maxPlayers), startsAt: new Date(fields.startsAt).toISOString() }); form.reset(); }, 'Tournament created.'); }}><label>Name<input name="name" required minLength={3} maxLength={100} placeholder="Tournament name" /></label><label>Start time<input name="startsAt" type="datetime-local" required /></label><label>Bracket size<select name="maxPlayers" defaultValue="8">{[2, 4, 8, 16, 32].map(value => <option key={value} value={value}>{value} players</option>)}</select></label><label>Ruleset<select name="ruleset"><option value="elemental">Elemental Battle</option><option value="classic">Classic</option></select></label><div className={styles.formActions}><button className="button primary" disabled={disabled}>Create tournament</button></div></form></div><div className={`panel ${styles.section}`}><h2>Tournaments</h2>{data?.tournaments?.length ? <div className={styles.cards}>{data.tournaments.map(tournament => <article className={styles.listItem} key={tournament.id}><div><a className={styles.link} href={`/tournaments/${tournament.id}`}><strong>{tournament.name}</strong></a><p>{formatDate(tournament.startsAt)} · {tournament.ruleset} · {tournament._count?.participants ?? '—'}/{tournament.maxPlayers} registered</p><Status active={tournament.status === 'active'}>{tournament.status}</Status></div><div className={styles.actions}><a className="button secondary" href={`/tournaments/${tournament.id}`}>View bracket</a>{tournament.status === 'registration' && <button className="button primary" disabled={disabled || ![2, 4, 8, 16, 32].includes(tournament._count?.participants)} onClick={() => perform(`start:${tournament.id}`, () => api(`/admin/tournaments/${tournament.id}/start`, 'POST', {}), 'Tournament started.')}>Start bracket</button>}</div></article>)}</div> : <Empty>No tournaments have been created.</Empty>}<p className={styles.help}>Start requires 2, 4, 8, 16, or 32 available players. Drawn tournament matches automatically replay until a winner is decided.</p></div></>}

      {tab === 'seasons' && <><div className={`panel ${styles.section}`}><h2>Season configuration</h2><p className={styles.help}>Saving activates this season and deactivates the previous active season.</p><form className={styles.formGrid} onSubmit={event => { event.preventDefault(); perform('season', () => api('/admin/season', 'POST', { ...season, startsAt: new Date(season.startsAt).toISOString(), endsAt: new Date(season.endsAt).toISOString() }), 'Season configuration saved.'); }}><label>Season ID<input required minLength={3} maxLength={80} value={season.id} onChange={event => setSeason(current => ({ ...current, id: event.target.value }))} placeholder="season-identifier" /></label><label>Name<input required minLength={3} maxLength={80} value={season.name} onChange={event => setSeason(current => ({ ...current, name: event.target.value }))} placeholder="Season name" /></label><label>Starts<input type="datetime-local" required value={season.startsAt} onChange={event => setSeason(current => ({ ...current, startsAt: event.target.value }))} /></label><label>Ends<input type="datetime-local" required min={season.startsAt || undefined} value={season.endsAt} onChange={event => setSeason(current => ({ ...current, endsAt: event.target.value }))} /></label><div className={styles.formActions}><button className="button primary" disabled={disabled}>Save and activate season</button></div></form></div><div className={`panel ${styles.section}`}><h2>Configured seasons</h2>{data?.seasons?.length ? data.seasons.map(item => <article className={styles.listItem} key={item.id}><div><strong>{item.name}</strong><p>{formatDate(item.startsAt)} — {formatDate(item.endsAt)}</p><small>{item.id}</small> <Status active={item.active}>{item.active ? 'Active' : 'Inactive'}</Status></div><button className="button secondary" onClick={() => setSeason({ id: item.id, name: item.name, startsAt: localDateTime(item.startsAt), endsAt: localDateTime(item.endsAt) })}>Edit configuration</button></article>) : <Empty>No seasons configured.</Empty>}</div></>}

      {tab === 'catalog' && <div className={`panel ${styles.section}`}><h2>Cosmetic catalog</h2><p className={styles.help}>Prices are in earned coins. These items do not change power strength.</p>{data?.cosmetics?.length ? <div className={styles.cards}>{data.cosmetics.map(item => <form className={styles.catalogRow} key={`${item.id}:${item.price}:${item.enabled}`} onSubmit={event => { event.preventDefault(); const fields = new FormData(event.currentTarget); perform(`cosmetic:${item.id}`, () => api('/admin/catalog', 'PATCH', { id: item.id, price: Number(fields.get('price')), enabled: fields.get('enabled') === 'on' }), `${item.name} updated.`); }}><div><strong>{item.name}</strong><small>{item.type} · {item.rarity} · {item.id}</small></div><label>Coin price<input aria-label={`${item.name} coin price`} name="price" type="number" min={0} max={100000} step={1} required defaultValue={item.price} /></label><label className={styles.checkbox}><input name="enabled" type="checkbox" defaultChecked={item.enabled} /> Available</label><button className="button secondary" disabled={disabled}>Save</button></form>)}</div> : <Empty>No cosmetic items configured.</Empty>}</div>}

      {tab === 'audit' && <div className={`panel ${styles.section}`}><h2>Audit log <small>Latest 100 events</small></h2>{data?.logs?.length ? data.logs.map(log => <article className={styles.audit} key={log.id}><div className={styles.row}><strong>{log.action.replaceAll('_', ' ')}</strong><time>{formatDate(log.createdAt)}</time></div><small>Actor: {log.userId || 'Server'}</small><pre>{JSON.stringify(log.details, null, 2)}</pre></article>) : <Empty>No audit events recorded.</Empty>}</div>}
    </>}
  </section>;
}

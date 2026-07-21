import { api } from '@/api/apiClient';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle2, Mail, Play, RefreshCcw, Repeat, StopCircle, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopNav from '../components/navigation/TopNav';
import ClayCard from '../components/shared/ClayCard';

export default function Organiser() {
  const navigate = useNavigate();
  const url = new URL(window.location.href);
  const tournamentId = url.searchParams.get('tournamentId');
  const accessToken = url.searchParams.get('token');

  const [auth, setAuth] = useState({ valid: false, role: null, email: null, name: null });
  const [tournament, setTournament] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [groupEdits, setGroupEdits] = useState({});

  const [judgeEmail, setJudgeEmail] = useState('');
  const [judgeName, setJudgeName] = useState('');
  const [inviteUrl, setInviteUrl] = useState('');

  const [timeGroup, setTimeGroup] = useState('');
  const [timeCode, setTimeCode] = useState('');
  const [timeWhen, setTimeWhen] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [roomBusy, setRoomBusy] = useState({});
  const [pendingStart, setPendingStart] = useState(null); // { roomId, present, expected }

  const groups = useMemo(() => {
    const map = new Map();
    for (const r of registrations) {
      if (r.group_number != null) {
        const gn = Number(r.group_number);
        if (!map.has(gn)) map.set(gn, []);
        map.get(gn).push(r);
      }
    }
    return Array.from(map.entries()).sort((a,b)=>a[0]-b[0]);
  }, [registrations]);

  useEffect(() => {
    load(true);
     
  }, [tournamentId, accessToken]);

  const load = async (showSpinner = false) => {
    try {
      if (showSpinner) setLoading(true);

      if (accessToken) {
        // Magic-link path: single endpoint returns auth + all data in one shot.
        const panel = await api.tournaments.getPanelData({ tournamentId, accessToken });
        setAuth({ valid: true, role: panel.tokenRole, email: panel.tokenEmail, name: panel.tokenName });
        setTournament(panel.tournament || null);
        setRegistrations(panel.registrations || []);
        setRooms(panel.rooms || []);
      } else {
        // Logged-in host path: validate session then load data with JWT.
        let a = { valid: false };
        try {
          a = await api.tournaments.validateOrganiserSession(tournamentId);
        } catch (e) {
          a = { valid: false };
        }
        setAuth(a);
        const [t] = await api.entities.Tournament.filter({ id: tournamentId });
        setTournament(t || null);
        const regs = await api.entities.TournamentRegistration.filter({ tournament_id: tournamentId });
        setRegistrations(regs);
        const rms = await api.entities.GDRoom.filter({ tournament_id: tournamentId });
        setRooms(rms);
      }
    } catch (e) {
      setAuth({ valid: false, role: null, email: null, name: null });
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  const updateGroupValue = (id, value) => {
    setGroupEdits((m) => ({ ...m, [id]: value }));
  };

  const saveGroup = async (reg) => {
    const raw = groupEdits[reg.id];
    const val = raw === '' || raw === undefined || raw === null ? null : Number(raw);
    await api.entities.TournamentRegistration.update(reg.id, { group_number: val });
    load();
  };

  const clearGroup = async (reg) => {
    await api.entities.TournamentRegistration.update(reg.id, { group_number: null });
    setGroupEdits((m) => ({ ...m, [reg.id]: '' }));
    load();
  };

  const autoAssignGroups = async () => {
    if (!tournament) return;
    const joined = registrations.filter(r => r.status === 'joined' || r.status === 'registered');
    const shuffled = [...joined].sort(() => Math.random() - 0.5);
    const groupSize = tournament.group_size || 4;
    let g = 0;
    for (let i = 0; i < shuffled.length; i++) {
      if (i % groupSize === 0) g++;
      await api.entities.TournamentRegistration.update(shuffled[i].id, { group_number: g });
    }
    load();
  };

  const createLobbies = async () => {
    if (!tournament) return;
    const byGroup = new Map();
    for (const r of registrations) {
      if (r.group_number != null) {
        const gn = Number(r.group_number);
        if (!byGroup.has(gn)) byGroup.set(gn, []);
        byGroup.get(gn).push(r);
      }
    }
    const existing = rooms;
    const existingCodes = new Set(existing.map(r => r.room_code));
    const promises = [];
    let idx = 0;
    for (const [gn, regs] of Array.from(byGroup.entries()).sort((a,b)=>a[0]-b[0])) {
      const roomCode = `T${String(tournament.tournament_id).slice(0,3)}G${gn}`;
      if (existingCodes.has(roomCode)) continue;
      promises.push(api.entities.GDRoom.create({
        room_code: roomCode,
        host_id: tournament.host_id,
        mode: 'tournament',
        team_size: tournament.group_size,
        domain: tournament.domain,
        duration: tournament.duration,
        status: 'lobby',
        participants: regs.map(r => ({ user_id: r.user_id, name: r.user_name })),
        topic: `Tournament Round - ${tournament.domain}`,
        tournament_id: tournamentId,
        group_number: gn,
      }));
      idx++;
    }
    if (promises.length > 0) await Promise.all(promises);
    load();
  };

  const controlRoom = async (room, action) => {
    if (!room) return;
    const fn = {
      start: api.rooms.gd.start,
      stop: api.rooms.gd.stop,
      restart: api.rooms.gd.restart,
      forceClose: api.rooms.gd.forceClose,
    }[action];
    if (!fn) return;

    // For starting, check how many have actually joined the lobby (joined_at present)
    if (action === 'start') {
      try {
        const [fresh] = await api.entities.GDRoom.filter({ id: room.id });
        const present = (fresh?.participants || []).filter(p => p && p.joined_at).length;
        const expected = Number(fresh?.team_size) || Number(tournament?.group_size) || ((fresh?.participants || []).length);
        if (present < expected) {
          setPendingStart({ roomId: room.id, present, expected });
          return; // Wait for user confirmation
        }
      } catch { /* ignore check errors */ }
    }

    setRoomBusy(prev => ({ ...prev, [room.id]: action }));
    try {
      await fn(room.id, { accessToken, host_email: tournament?.host_id });
    } finally {
      setRoomBusy(prev => ({ ...prev, [room.id]: null }));
      load();
    }
  };

  const doInviteJudge = async () => {
    const email = (judgeEmail || '').trim();
    const name = (judgeName || '').trim();
    if (!email) {
      alert('Please enter a judge email.');
      return;
    }
    try {
      const frontendUrl = window.location.origin || undefined;
      const res = await api.tournaments.inviteJudge({
        tournamentId,
        email,
        name,
        host_email: tournament?.host_id,
        frontendUrl,
        accessToken,
      });
      setInviteUrl(res?.inviteUrl || '');
      alert('Judge invite sent successfully.');
    } catch (e) {
      console.error('Error sending judge invite', e);
      alert('Failed to send judge invite. Please try again.');
    }
  };

  const doSendTimeSlot = async () => {
    const when = (timeWhen || '').trim();
    if (!when) {
      alert('Please select a date & time for the slot.');
      return;
    }
    try {
      await api.tournaments.sendTimeSlot({
        tournamentId,
        group_number: timeGroup ? Number(timeGroup) : undefined,
        room_code: timeCode || undefined,
        time_slot: when,
        host_email: tournament?.host_id,
        accessToken,
      });
      alert('Time slot email(s) sent successfully.');
    } catch (e) {
      console.error('Error sending time slot emails', e);
      alert('Failed to send time slot email(s). Please try again.');
    }
  };

  const manualRefresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  const doStartTournament = async () => {
    if (!tournamentId) return;
    setRefreshing(true);
    try {
      await api.tournaments.start({ tournamentId, accessToken });
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  const doRestartTournament = async () => {
    if (!tournamentId) return;
    setRefreshing(true);
    try {
      await api.tournaments.restart({ tournamentId, accessToken });
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  const confirmStartAnyway = async () => {
    if (!pendingStart) return;
    const id = pendingStart.roomId;
    setRoomBusy(prev => ({ ...prev, [id]: 'start' }));
    try {
      await api.rooms.gd.start(id, { accessToken, host_email: tournament?.host_id });
    } finally {
      setRoomBusy(prev => ({ ...prev, [id]: null }));
      setPendingStart(null);
      load();
    }
  };

  const cancelStart = () => setPendingStart(null);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!auth?.valid) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center p-6">
        <div>
          <p className="text-xl font-bold mb-2">Access denied</p>
          <p className="text-gray-600">Invalid or expired link.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <TopNav activePage="Explore" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium mb-4">
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold">Status: {tournament?.status || 'unknown'}</span>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={doStartTournament}
              disabled={refreshing || tournament?.status === 'active'}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Play className="w-4 h-4" />
              Start Tournament
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={doRestartTournament}
              disabled={refreshing || tournament?.status !== 'active'}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-yellow-500 to-amber-600 text-white font-bold flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Repeat className="w-4 h-4" />
              Restart
            </motion.button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={manualRefresh} disabled={refreshing} className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold flex items-center gap-2">
              <RefreshCcw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </motion.button>
          </div>
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl font-black mb-2 gradient-text">Organiser Dashboard</h1>
            <p className="text-gray-600 text-lg">{tournament?.name}</p>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <ClayCard className="text-center">
            <Users className="w-8 h-8 mx-auto mb-2 text-purple-500" />
            <p className="text-sm text-gray-600">Participants</p>
            <p className="text-xl font-bold">{registrations.length}</p>
          </ClayCard>
          <ClayCard className="text-center">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500" />
            <p className="text-sm text-gray-600">Groups</p>
            <p className="text-xl font-bold">{groups.length}</p>
          </ClayCard>
          <ClayCard className="text-center">
            <Play className="w-8 h-8 mx-auto mb-2 text-blue-500" />
            <p className="text-sm text-gray-600">Lobbies</p>
            <p className="text-xl font-bold">{rooms.length}</p>
          </ClayCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <ClayCard>
            <h3 className="font-bold text-lg mb-4">Grouping</h3>
            <div className="flex gap-3">
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={autoAssignGroups} className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-white font-bold">Auto-assign</motion.button>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={createLobbies} className="px-6 py-3 rounded-xl bg-gradient-to-r from-orange-400 to-pink-500 text-white font-bold">Create Lobbies</motion.button>
            </div>
          </ClayCard>

          <ClayCard>
            <h3 className="font-bold text-lg mb-4">Invite Judge</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input className="clay-card h-12 px-3" placeholder="Judge name" value={judgeName} onChange={e=>setJudgeName(e.target.value)} />
              <input className="clay-card h-12 px-3 sm:col-span-2" placeholder="Judge email" value={judgeEmail} onChange={e=>setJudgeEmail(e.target.value)} />
            </div>
            <div className="flex gap-3 mt-3 items-center">
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={doInviteJudge} className="px-6 py-3 rounded-xl bg-gradient-to-r from-green-500 to-teal-500 text-white font-bold flex items-center gap-2"><Mail className="w-5 h-5"/>Send Invite</motion.button>
              {inviteUrl && <a href={inviteUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-600 underline break-all">{inviteUrl}</a>}
            </div>
          </ClayCard>
        </div>

        <ClayCard className="mb-8">
          <h3 className="font-bold text-lg mb-4">Time Slot Email</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input className="clay-card h-12 px-3" type="number" placeholder="Group # (optional)" value={timeGroup} onChange={e=>setTimeGroup(e.target.value)} />
            <input className="clay-card h-12 px-3" placeholder="Lobby code (optional)" value={timeCode} onChange={e=>setTimeCode(e.target.value)} />
            <input className="clay-card h-12 px-3" type="datetime-local" value={timeWhen} onChange={e=>setTimeWhen(e.target.value)} />
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={doSendTimeSlot} className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold">Send</motion.button>
          </div>
        </ClayCard>

        <ClayCard className="mb-8">
          <h3 className="font-bold text-lg mb-4">Manual Group Assignment</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {registrations.map((r) => (
              <div key={r.id} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-white font-bold text-sm">
                  {r.user_name?.charAt(0) || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{r.user_name || r.user_id}</div>
                  <div className="text-xs text-gray-500 truncate">{r.user_email || r.user_id}</div>
                </div>
                <input
                  className="w-20 clay-card h-10 px-2 text-sm"
                  type="number"
                  placeholder="#"
                  value={groupEdits[r.id] !== undefined ? groupEdits[r.id] : (r.group_number ?? '')}
                  onChange={(e)=> updateGroupValue(r.id, e.target.value)}
                />
                <button onClick={()=>saveGroup(r)} className="px-3 py-1.5 rounded-lg bg-green-500 text-white text-sm font-bold">Save</button>
                <button onClick={()=>clearGroup(r)} className="px-3 py-1.5 rounded-lg bg-gray-200 text-gray-700 text-sm font-bold">Clear</button>
              </div>
            ))}
          </div>
        </ClayCard>

        {groups.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Groups</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groups.map(([gn, regs]) => (
                <ClayCard key={gn}>
                  <div className="flex items-start justify-between mb-3 gap-3">
                    <h3 className="text-lg font-bold">Group {gn}</h3>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {rooms.filter(r=>Number(r.group_number)===Number(gn)).map(r => (
                        <div key={r.id} className="flex flex-wrap items-center gap-2 justify-end">
                          <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold whitespace-nowrap">
                            {(r.participants?.filter(p=>p && p.joined_at).length || 0)}/{Number(r.team_size) || Number(tournament?.group_size) || (r.participants?.length || 0)} ready
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${r.status==='active' ? 'bg-green-100 text-green-700' : (r.status==='completed' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700')}`}>{r.status || 'lobby'}</span>
                          <button
                            onClick={()=>controlRoom(r,'start')}
                            disabled={!!roomBusy[r.id] || r.status==='active'}
                            className="px-3 py-1 rounded-full bg-green-500 text-white text-xs font-bold flex items-center gap-1 disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
                          >
                            <Play className="w-3 h-3"/>
                            {roomBusy[r.id]==='start'?'Starting...':'Start'}
                          </button>
                          <button
                            onClick={()=>controlRoom(r,'stop')}
                            disabled={!!roomBusy[r.id] || r.status!=='active'}
                            className="px-3 py-1 rounded-full bg-red-500 text-white text-xs font-bold flex items-center gap-1 disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
                          >
                            <StopCircle className="w-3 h-3"/>
                            {roomBusy[r.id]==='stop'?'Stopping...':'Stop'}
                          </button>
                          <button
                            onClick={()=>controlRoom(r,'restart')}
                            disabled={!!roomBusy[r.id] || r.status==='lobby'}
                            className="px-3 py-1 rounded-full bg-yellow-500 text-white text-xs font-bold flex items-center gap-1 disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
                          >
                            <Repeat className="w-3 h-3"/>
                            {roomBusy[r.id]==='restart'?'Restarting...':'Restart'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    {regs.map((p) => (
                      <div key={p.id} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-white font-bold text-sm">
                          {p.user_name?.charAt(0) || '?'}
                        </div>
                        <span className="font-medium text-sm">{p.user_name}</span>
                      </div>
                    ))}
                  </div>
                </ClayCard>
              ))}
            </div>
          </div>
        )}
      </div>
      {pendingStart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-bold mb-2">Start with missing members?</h3>
            <p className="text-gray-600 mb-4">Only {pendingStart.present}/{pendingStart.expected} members are in the lobby. Do you want to start the session now?</p>
            <div className="flex justify-end gap-3">
              <button onClick={cancelStart} className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 font-bold">Wait</button>
              <button onClick={confirmStartAnyway} className="px-4 py-2 rounded-lg bg-green-500 text-white font-bold">Start anyway</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { api } from '@/api/apiClient';
import { motion } from 'framer-motion';
import { ArrowLeft, Eye, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopNav from '../components/navigation/TopNav';
import ClayCard from '../components/shared/ClayCard';

export default function JudgePanel() {
  const navigate = useNavigate();
  const url = new URL(window.location.href);
  const tournamentId = url.searchParams.get('tournamentId');
  const accessToken = url.searchParams.get('token');

  const [auth, setAuth] = useState({ valid: false, role: null, email: null, name: null });
  const [tournament, setTournament] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

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
    const id = setInterval(() => load(), 5000);
    return () => clearInterval(id);
  }, [tournamentId, accessToken]);


  const load = async (showSpinner = false) => {
    try {
      if (showSpinner) setLoading(true);
      const panel = await api.tournaments.getPanelData({ tournamentId, accessToken });
      setAuth({ valid: true, role: panel.tokenRole, email: panel.tokenEmail, name: panel.tokenName });
      setTournament(panel.tournament || null);
      setRegistrations(panel.registrations || []);
      setRooms(panel.rooms || []);
    } catch (e) {
      setAuth({ valid: false, role: null, email: null, name: null });
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

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
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl font-black mb-2 gradient-text">Judge Panel</h1>
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
            <Eye className="w-8 h-8 mx-auto mb-2 text-blue-500" />
            <p className="text-sm text-gray-600">Active Lobbies</p>
            <p className="text-xl font-bold">{rooms.filter(r=>r.status!=='completed').length}</p>
          </ClayCard>
        </div>

        {groups.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Groups & Lobbies</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groups.map(([gn, regs]) => (
                <ClayCard key={gn}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold">Group {gn}</h3>
                  </div>
                  <div className="space-y-2 mb-3">
                    {regs.map((p) => (
                      <div key={p.id} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-white font-bold text-sm">
                          {p.user_name?.charAt(0) || '?'}
                        </div>
                        <span className="font-medium text-sm">{p.user_name}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    {rooms.filter(r=>Number(r.group_number)===Number(gn)).map((r) => (
                      <span key={r.id} className="px-3 py-1 rounded-lg bg-gray-100 text-gray-700 text-xs font-semibold">
                        Lobby: {r.room_code}
                      </span>
                    ))}
                  </div>
                </ClayCard>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import { api } from '@/api/apiClient';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';

import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, CheckCircle2, Clock, Play, Trophy, Users } from 'lucide-react';
import TopNav from '../components/navigation/TopNav';
import ClayCard from '../components/shared/ClayCard';

export default function TournamentLobby() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const tournamentId = urlParams.get('tournamentId');
  
  const [user, setUser] = useState(null);
  const [tournament, setTournament] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [groups, setGroups] = useState([]);
  const [myGroup, setMyGroup] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [loading, setLoading] = useState(true);
  const [groupsFormed, setGroupsFormed] = useState(false);
  const [myRoomId, setMyRoomId] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [readyLoading, setReadyLoading] = useState(false);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await api.auth.me();

      setUser(currentUser);

      const [tournamentData] = await api.entities.Tournament.filter({ id: tournamentId });

      setTournament(tournamentData);
      setIsHost(tournamentData.host_id === currentUser.email);

      const regs = await api.entities.TournamentRegistration.filter({ tournament_id: tournamentId, status: 'joined' });

      setRegistrations(regs);

      // Check if groups are already formed
      const groupedRegs = regs.filter(r => r.group_number !== undefined && r.group_number !== null);
      if (groupedRegs.length > 0) {
        setGroupsFormed(true);
        organizeIntoGroups(regs, tournamentData.group_size);
        
        // Find my group
        const myReg = regs.find(r => r.user_id === currentUser.email);
        if (myReg && myReg.group_number !== undefined) {
          setMyGroup(() => myReg.group_number);
        }

        try {
          const rooms = await api.entities.GDRoom.filter({ tournament_id: tournamentId });
          const myRoom = myReg
            ? rooms.find(r => Number(r.group_number) === Number(myReg.group_number))
            : null;

          if (myRoom) {
            setMyRoomId(myRoom.id);
            const meInRoom = (myRoom.participants || []).find(
              p => p && (p.user_id === currentUser.email || p.user_id === currentUser.id)
            );
            setIsReady(!!meInRoom?.joined_at);

            if (
              tournamentData.type === 'gd' &&
              (tournamentData.status === 'active' || myRoom.status === 'active')
            ) {
              navigate(createPageUrl(`Lobby?roomId=${myRoom.id}`));
              return;
            }
          } else {
            setMyRoomId(null);
            setIsReady(false);
          }
        } catch (e) {
          console.error('Error loading tournament rooms for user:', e);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const organizeIntoGroups = (regs, groupSize) => {
    const groupsMap = {};
    regs.forEach(reg => {
      if (reg.group_number !== undefined && reg.group_number !== null) {
        if (!groupsMap[reg.group_number]) {
          groupsMap[reg.group_number] = [];
        }
        groupsMap[reg.group_number].push(reg);
      }
    });
    setGroups(Object.values(groupsMap));
  };

  const joinLobby = async () => {
    const myReg = await api.entities.TournamentRegistration.filter({ 
      tournament_id: tournamentId, 
      user_id: user.email 
    });
    
    if (myReg.length > 0) {
      await api.entities.TournamentRegistration.update(myReg[0].id, { status: 'joined' });

      loadData();
    }
  };

  const markReady = async () => {
    if (!user || !myRoomId || isReady || readyLoading) return;
    setReadyLoading(true);
    try {
      const [room] = await api.entities.GDRoom.filter({ id: myRoomId });
      if (!room) return;

      const email = user.email || user.id;
      const participants = Array.isArray(room.participants) ? [...room.participants] : [];
      const idx = participants.findIndex(
        p => p && (p.user_id === email || p.user_id === user.id)
      );
      const now = new Date().toISOString();

      if (idx >= 0) {
        participants[idx] = { ...participants[idx], joined_at: now };
      } else {
        participants.push({
          user_id: email,
          name: user.full_name || email,
          joined_at: now,
        });
      }

      await api.entities.GDRoom.update(room.id, { participants });
      setIsReady(true);
    } catch (error) {
      console.error('Error marking tournament ready:', error);
    } finally {
      setReadyLoading(false);
    }
  };

  const shuffleAndFormGroups = async () => {
    if (!isHost) return;
    
    const joinedRegs = registrations.filter(r => r.status === 'joined');
    const shuffled = [...joinedRegs].sort(() => Math.random() - 0.5);
    
    const groupSize = tournament.group_size;
    let groupNumber = 0;
    
    for (let i = 0; i < shuffled.length; i++) {
      if (i % groupSize === 0) groupNumber++;
      await api.entities.TournamentRegistration.update(shuffled[i].id, {
        group_number: groupNumber
      });

    }
    
    setGroupsFormed(true);
    loadData();
  };

  const startTournament = async () => {
    if (!isHost || !groupsFormed) return;
    
    await api.entities.Tournament.update(tournamentId, { status: 'active' });

    
    // Create rooms for each group
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      const roomCode = `T${tournament.tournament_id.substring(1, 4)}G${i + 1}`;
      
      if (tournament.type === 'gd') {
        await api.entities.GDRoom.create({

          room_code: roomCode,
          host_id: tournament.host_id,
          mode: 'tournament',
          team_size: tournament.group_size,
          domain: tournament.domain,
          duration: tournament.duration,
          status: 'lobby',
          participants: group.map(r => ({
            user_id: r.user_id,
            name: r.user_name,
            joined_at: new Date().toISOString()
          })),
          topic: `Tournament Round - ${tournament.domain}`,
          tournament_id: tournamentId
        });
      } else if (tournament.type === 'debate') {
        await api.entities.DebateRoom.create({

          room_code: roomCode,
          host_id: tournament.host_id,
          mode: 'tournament',
          team_size: tournament.group_size,
          domain: tournament.domain,
          duration: tournament.duration,
          status: 'lobby',
          participants: group.map(r => ({
            user_id: r.user_id,
            name: r.user_name,
            joined_at: new Date().toISOString()
          })),
          topic: `Debate Tournament - ${tournament.domain}`,
          tournament_id: tournamentId
        });
      }
    }
    
    // Navigate to the room
    if (tournament.type === 'gd') {
      const rooms = await api.entities.GDRoom.filter({ tournament_id: tournamentId });

      const myRoom = rooms.find(r => r.participants.some(p => p.user_id === user.email));
      if (myRoom) {
        navigate(createPageUrl(`Lobby?roomId=${myRoom.id}`));
      }
    }
  };

  const myRegistration = registrations.find(r => r.user_id === user?.email);
  const hasJoined = myRegistration?.status === 'joined';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <TopNav activePage="Explore" />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl font-black mb-2 gradient-text">{tournament?.name}</h1>
            <p className="text-gray-600 text-lg">{tournament?.organizer}</p>
          </div>
        </motion.div>

        {/* Tournament Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <ClayCard className="text-center">
            <Trophy className="w-8 h-8 mx-auto mb-2 text-orange-500" />
            <p className="text-sm text-gray-600">Tournament ID</p>
            <p className="text-xl font-bold">{tournament?.tournament_id}</p>
          </ClayCard>
          <ClayCard className="text-center">
            <Users className="w-8 h-8 mx-auto mb-2 text-purple-500" />
            <p className="text-sm text-gray-600">Participants Joined</p>
            <p className="text-xl font-bold">{registrations.filter(r => r.status === 'joined').length}</p>
          </ClayCard>
          <ClayCard className="text-center">
            <Clock className="w-8 h-8 mx-auto mb-2 text-blue-500" />
            <p className="text-sm text-gray-600">Duration</p>
            <p className="text-xl font-bold">{tournament?.duration} mins</p>
          </ClayCard>
        </div>

        {/* Join Button (hidden for organiser/host) */}
        {!hasJoined && !isHost && (
          <ClayCard className="mb-8 text-center bg-gradient-to-r from-purple-50 to-blue-50">
            <h3 className="text-xl font-bold mb-4">Ready to join the tournament?</h3>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={joinLobby}
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold text-lg shadow-xl"
            >
              Join Tournament Lobby
            </motion.button>
          </ClayCard>
        )}

        {/* Organiser hint (host should manage from Organiser panel) */}
        {isHost && (
          <ClayCard className="mb-8 bg-gradient-to-r from-orange-50 to-pink-50">
            <h3 className="text-xl font-bold mb-2">Organiser Panel</h3>
            <p className="text-sm text-gray-700 mb-4">Use the organiser dashboard to manage groups and lobbies. You are not placed into any lobby.</p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(createPageUrl(`Organiser?tournamentId=${tournamentId}`))}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-orange-400 to-pink-500 text-white font-bold flex items-center gap-2"
            >
              <Play className="w-5 h-5" />
              Open Organiser Panel
            </motion.button>
          </ClayCard>
        )}

        {/* Groups Display */}
        {groupsFormed && groups.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Tournament Groups</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groups.map((group, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <ClayCard className={`${myGroup === index + 1 ? 'border-2 border-green-400 bg-green-50' : ''}`}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold">Group {index + 1}</h3>
                      <div className="flex items-center gap-2">
                        {myGroup === index + 1 && (
                          <span className="px-3 py-1 rounded-full bg-green-500 text-white text-xs font-bold">
                            Your Group
                          </span>
                        )}
                        {myGroup === index + 1 && !isHost && (
                          <button
                            type="button"
                            onClick={markReady}
                            disabled={isReady || readyLoading || !myRoomId}
                            className={`px-3 py-1 rounded-full text-xs font-bold border ${
                              isReady
                                ? 'bg-green-100 text-green-700 border-green-300'
                                : 'bg-blue-500 text-white border-blue-600'
                            }`}
                          >
                            {isReady ? 'Ready' : (readyLoading ? 'Marking...' : 'Ready?')}
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      {group.map((participant, pIndex) => (
                        <div key={pIndex} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-white font-bold text-sm">
                            {participant.user_name?.charAt(0) || '?'}
                          </div>
                          <span className="font-medium text-sm">{participant.user_name}</span>
                          {participant.user_id === user?.email && (
                            <CheckCircle2 className="w-4 h-4 text-green-500 ml-auto" />
                          )}
                        </div>
                      ))}
                    </div>
                  </ClayCard>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Participants Waiting */}
        {!groupsFormed && (
          <ClayCard>
            <h2 className="text-xl font-bold mb-4">Participants in Lobby</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <AnimatePresence>
                {registrations.filter(r => r.status === 'joined').map((reg, index) => (
                  <motion.div
                    key={reg.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="clay-card p-4 text-center"
                  >
                    <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-white font-bold">
                      {reg.user_name?.charAt(0) || '?'}
                    </div>
                    <p className="text-sm font-medium truncate">{reg.user_name}</p>
                    {reg.user_id === user?.email && (
                      <span className="text-xs text-green-500 font-bold">You</span>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            
            {registrations.filter(r => r.status === 'joined').length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>Waiting for participants to join...</p>
              </div>
            )}
          </ClayCard>
        )}
      </div>
    </div>
  );
}
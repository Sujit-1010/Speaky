import { api } from '@/api/apiClient';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';

import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { ArrowRight, Building2, Calendar, Globe, GraduationCap, Lock, Plus, Search, Trophy, Users } from 'lucide-react';
import TopNav from '../components/navigation/TopNav';
import ClayCard from '../components/shared/ClayCard';

export default function TournamentHub() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const tournamentType = urlParams.get('type') || 'gd';
  
  const [user, setUser] = useState(null);
  const [searchId, setSearchId] = useState('');
  const [tournaments, setTournaments] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchResult, setSearchResult] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Registration modal state
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [acceptRules, setAcceptRules] = useState(false);
  const [registerError, setRegisterError] = useState('');

  useEffect(() => {
    loadData();
  }, [tournamentType]);

  const loadData = async () => {
    setLoading(true);
    try {
      const currentUser = await api.auth.me();

      setUser(currentUser);

      const [tournamentsData, registrationsData] = await Promise.all([
        api.entities.Tournament.filter({ type: tournamentType, visibility: 'public', status: 'registering' }),
        api.entities.TournamentRegistration.filter({ user_id: currentUser.email })
      ]);

      setTournaments(tournamentsData);
      setRegistrations(registrationsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statusLabels = {
    registering: 'Open',
    active: 'Ongoing',
    completed: 'Closed',
  };

  const handleSearch = async () => {
    if (!searchId.trim()) return;
    
    try {
      const results = await api.entities.Tournament.filter({ tournament_id: searchId.trim() });

      if (results.length > 0) {
        setSearchResult(results[0]);
      } else {
        setSearchResult(null);
        alert('Tournament not found');
      }
    } catch (error) {
      console.error('Error searching:', error);
    }
  };

  const isRegistered = (tournamentId) => {
    return registrations.some(r => r.tournament_id === tournamentId);
  };

  const getRegistration = (tournamentId) => {
    return registrations.find(r => r.tournament_id === tournamentId);
  };

  const registerForTournament = (tournament) => {
    if (!user) return;
    setSelectedTournament(tournament);
    setRegName(user?.full_name || '');
    setRegEmail(user?.email || '');
    setAcceptRules(false);
    setRegisterError('');
    setShowRegisterModal(true);
  };

  const submitRegistration = async () => {
    if (!selectedTournament) return;
    if (!regName.trim()) {
      setRegisterError('Please enter your full name.');
      return;
    }
    if (!regEmail.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(regEmail.trim())) {
      setRegisterError('Please enter a valid email address.');
      return;
    }
    if (!acceptRules) {
      setRegisterError('You must accept the tournament rules to proceed.');
      return;
    }

    try {
      await api.tournaments.register({
        tournamentId: selectedTournament.id,
        user_id: regEmail.trim(),
        user_name: regName.trim(),
        user_email: regEmail.trim(),
        accepted_rules: true,
      });
      setShowRegisterModal(false);
      alert(`Registered successfully! A confirmation email has been sent to ${regEmail.trim()}`);
      loadData();
    } catch (error) {
      const status = Number(error?.status || 0);
      if (status === 409) {
        setShowRegisterModal(false);
        alert('You are already registered for this tournament.');
        loadData();
      } else if (status === 400) {
        setRegisterError(error.message || 'Registration for this tournament is closed or full.');
      } else {
        console.error('Error registering:', error);
        setRegisterError('Unable to register for this tournament right now.');
      }
    }
  };

  const handleJoinTournament = (tournament, registration) => {
    if (registration) {
      setSelectedTournament(tournament);
      setShowPasswordModal(true);
    }
  };

  const verifyAndJoin = async () => {
    const registration = getRegistration(selectedTournament.id);
    if (registration && registration.password === password.toUpperCase()) {
      navigate(createPageUrl(`TournamentLobby?tournamentId=${selectedTournament.id}`));
    } else {
      setPasswordError('Invalid password. Check your email for the correct password.');
    }
  };

  const typeLabels = {
    gd: 'Group Discussion',
    extempore: 'Extempore',
    debate: 'Debate'
  };

  return (
    <div className="min-h-screen pb-20">
      <TopNav activePage="Explore" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <h1 className="text-4xl sm:text-5xl font-black mb-3 gradient-text">
            {typeLabels[tournamentType]} Tournaments
          </h1>
          <p className="text-gray-600 text-lg">Compete in organized tournaments and win prizes</p>
        </motion.div>

        {/* Search and Create Section */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex-1 flex gap-2">
            <Input
              placeholder="Search by Tournament ID..."
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              className="clay-card border-none h-14 text-lg"
            />
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSearch}
              className="px-6 h-14 rounded-2xl bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold flex items-center gap-2 shadow-lg"
            >
              <Search className="w-5 h-5" />
              Search
            </motion.button>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate(createPageUrl(`CreateTournament?type=${tournamentType}`))}
            className="px-6 h-14 rounded-2xl bg-gradient-to-r from-orange-400 to-pink-500 text-white font-bold flex items-center gap-2 shadow-lg"
          >
            <Plus className="w-5 h-5" />
            Create Tournament
          </motion.button>
        </div>

        {/* Search Result */}
        {searchResult && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <ClayCard className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                    <Trophy className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{searchResult.name}</h3>
                    <p className="text-gray-600">{searchResult.organizer}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {searchResult.visibility === 'private' ? (
                        <Lock className="w-4 h-4 text-orange-500" />
                      ) : (
                        <Globe className="w-4 h-4 text-green-500" />
                      )}
                      <span className="text-sm capitalize">{searchResult.visibility}</span>
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      <span className="mr-3">ID: {searchResult.tournament_id}</span>
                      <span>
                        Date &amp; Time:{' '}
                        {searchResult.start_date ? new Date(searchResult.start_date).toLocaleString() : 'TBA'}
                      </span>
                    </div>
                    <div className="mt-1 text-xs font-semibold text-gray-700">
                      Status: {statusLabels[searchResult.status] || searchResult.status}
                    </div>
                  </div>
                </div>
                {(user && searchResult.host_id === user.email) ? (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate(createPageUrl(`Organiser?tournamentId=${searchResult.id}`))}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-orange-400 to-pink-500 text-white font-bold"
                  >
                    Open Organiser Panel
                  </motion.button>
                ) : isRegistered(searchResult.id) ? (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleJoinTournament(searchResult, getRegistration(searchResult.id))}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-green-400 to-teal-500 text-white font-bold"
                  >
                    Join Tournament
                  </motion.button>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => registerForTournament(searchResult)}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold"
                  >
                    Register
                  </motion.button>
                )}
              </div>
            </ClayCard>
          </motion.div>
        )}

        {/* Sample Tournament Registration Card */}
        <ClayCard className="mb-8 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                <Trophy className="w-10 h-10 text-white" />
              </div>
              <div>
                <span className="px-3 py-1 rounded-full bg-yellow-200 text-yellow-800 text-xs font-bold">FEATURED</span>
                <h3 className="text-2xl font-bold mt-2">National {typeLabels[tournamentType]} Championship 2025</h3>
                <p className="text-gray-600">Organized by GDHub • Open for all participants</p>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                  <span className="flex items-center gap-1"><Users className="w-4 h-4" /> Groups of 5</span>
                  <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> Jan 15, 2025</span>
                  <span className="flex items-center gap-1"><Globe className="w-4 h-4" /> Public</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => alert('This is a sample tournament. Create your own or search for real tournaments!')}
                className="px-8 py-4 rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold shadow-xl flex items-center gap-2"
              >
                <Trophy className="w-5 h-5" />
                Register Now
              </motion.button>
              <p className="text-xs text-gray-400 text-center">Sample registration card</p>
            </div>
          </div>
        </ClayCard>

        {/* Public Tournaments */}
        <h2 className="text-2xl font-bold mb-4">Public Tournaments</h2>
        
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="clay-card p-6 animate-pulse">
                <div className="h-8 bg-gray-200 rounded mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : tournaments.length === 0 ? (
          <ClayCard className="text-center py-12">
            <Trophy className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg">No public tournaments available</p>
            <p className="text-gray-400">Be the first to create one!</p>
          </ClayCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tournaments.map((tournament, index) => {
              const registered = isRegistered(tournament.id);
              const isHost = user && tournament.host_id === user.email;
              const registration = getRegistration(tournament.id);
              
              return (
                <motion.div
                  key={tournament.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <ClayCard className="h-full">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center">
                        <Trophy className="w-7 h-7 text-white" />
                      </div>
                      <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                        {statusLabels[tournament.status] || tournament.status}
                      </span>
                    </div>
                    
                    <h3 className="text-xl font-bold mb-2">{tournament.name}</h3>
                    <p className="text-gray-600 text-sm mb-4">{tournament.description}</p>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        {tournament.organizer?.includes('College') || tournament.organizer?.includes('University') ? (
                          <GraduationCap className="w-4 h-4" />
                        ) : (
                          <Building2 className="w-4 h-4" />
                        )}
                        {tournament.organizer}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Users className="w-4 h-4" />
                        Group Size: {tournament.group_size}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        {tournament.start_date ? new Date(tournament.start_date).toLocaleString() : 'TBA'}
                      </div>
                    </div>

                    <div className="text-xs text-gray-400 mb-4">
                      ID: {tournament.tournament_id}
                    </div>

                    {isHost ? (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => navigate(createPageUrl(`Organiser?tournamentId=${tournament.id}`))}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-400 to-pink-500 text-white font-bold flex items-center justify-center gap-2"
                      >
                        Open Organiser Panel
                        <ArrowRight className="w-5 h-5" />
                      </motion.button>
                    ) : registered ? (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleJoinTournament(tournament, registration)}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-green-400 to-teal-500 text-white font-bold flex items-center justify-center gap-2"
                      >
                        Join Tournament
                        <ArrowRight className="w-5 h-5" />
                      </motion.button>
                    ) : (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => registerForTournament(tournament)}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold"
                      >
                        Register Now
                      </motion.button>
                    )}
                  </ClayCard>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Password Modal */}
      <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enter Tournament Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Enter the password sent to your email when you registered.
            </p>
            <Input
              type="text"
              placeholder="Enter password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value.toUpperCase());
                setPasswordError('');
              }}
              className="text-center text-lg tracking-widest"
            />
            {passwordError && (
              <p className="text-red-500 text-sm">{passwordError}</p>
            )}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={verifyAndJoin}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-green-400 to-teal-500 text-white font-bold"
            >
              Join Tournament
            </motion.button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Registration Modal */}
      <Dialog open={showRegisterModal} onOpenChange={setShowRegisterModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Register for {selectedTournament?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedTournament?.rules && (
              <div className="clay-card p-3 max-h-40 overflow-auto text-sm text-gray-700">
                <p className="font-semibold mb-1">Tournament Rules</p>
                <p className="whitespace-pre-wrap">{selectedTournament.rules}</p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1 block">Full Name</label>
                <Input
                  type="text"
                  placeholder="Your full name"
                  value={regName}
                  onChange={(e) => { setRegName(e.target.value); setRegisterError(''); }}
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1 block">Email</label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={regEmail}
                  onChange={(e) => { setRegEmail(e.target.value); setRegisterError(''); }}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox id="acceptRules" checked={acceptRules} onCheckedChange={(v) => { setAcceptRules(!!v); setRegisterError(''); }} />
              <label htmlFor="acceptRules" className="text-sm text-gray-700 select-none">
                I have read and agree to the tournament rules
              </label>
            </div>

            {registerError && (
              <p className="text-red-500 text-sm">{registerError}</p>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={submitRegistration}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold"
            >
              Confirm Registration
            </motion.button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
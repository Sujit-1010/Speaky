import { api } from '@/api/apiClient';
import { motion } from 'framer-motion';
import { ArrowLeft, Building2, Calendar, Clock, Globe, Lock, Trophy, Upload, Users, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';

import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import TopNav from '../components/navigation/TopNav';
import ClayCard from '../components/shared/ClayCard';

export default function CreateTournament() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const tournamentType = urlParams.get('type') || 'gd';
  
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [csvParticipants, setCsvParticipants] = useState([]);
  const [groupsCount, setGroupsCount] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    organizer: '',
    description: '',
    visibility: 'public',
    group_size: 4,
    max_participants: 100,
    domain: 'general',
    duration: 15,
    start_date: '',
    prize: '',
    rules: '',
    password: ''
  });

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const currentUser = await api.auth.me();
    setUser(currentUser);
  };

  const generateTournamentId = () => {
    const length = 8 + Math.floor(Math.random() * 5); // 8-12 digits
    let id = '';
    for (let i = 0; i < length; i++) {
      const digit = i === 0 ? (1 + Math.floor(Math.random() * 9)) : Math.floor(Math.random() * 10);
      id += String(digit);
    }
    return id;
  };

  const generateTournamentPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let pwd = '';
    for (let i = 0; i < 8; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pwd.toUpperCase();
  };

  const handleCreate = async () => {
    if (!user || !formData.name || !formData.organizer) {
      alert('Please fill in all required fields');
      return;
    }
    
    setLoading(true);
    try {
      const tournamentId = generateTournamentId();
      const manualPassword = (formData.password || '').trim().toUpperCase();
      const tournamentPassword = manualPassword || generateTournamentPassword();
      
      const tournament = await api.entities.Tournament.create({
        name: formData.name,
        tournament_id: tournamentId,
        type: tournamentType,
        organizer: formData.organizer,
        description: formData.description,
        visibility: formData.visibility,
        group_size: formData.group_size,
        max_participants: formData.max_participants,
        domain: formData.domain,
        duration: formData.duration,
        start_date: formData.start_date || null,
        status: 'registering',
        host_id: user.email,
        host_name: user.full_name,
        prize: formData.prize,
        rules: formData.rules,
        password: tournamentPassword
      });

      // If CSV participants provided, create registrations and assign groups
      if (csvParticipants.length > 0) {
        // Shuffle participants
        const shuffled = [...csvParticipants].sort(() => Math.random() - 0.5);
        const groupSize = formData.group_size || 4;
        const total = shuffled.length;
        const groups = Math.max(1, groupsCount ? parseInt(groupsCount) : Math.ceil(total / groupSize));
        // Assign group numbers 1..groups in round-robin
        const creations = shuffled.map((p, idx) => {
          const group_number = (idx % groups) + 1;
          const user_id = p.email || p.user_id || p.id || String(idx);
          const user_name = p.name || p.full_name || p.user_name || '';
          const payload = { tournament_id: tournament.id, user_id, user_name, status: 'registered', group_number };
          return api.entities.TournamentRegistration.create(payload);
        });
        await Promise.all(creations);
      }

      alert(`Tournament created successfully!\nTournament ID: ${tournamentId}\nTournament Password: ${tournamentPassword}\n${csvParticipants.length > 0 ? `${csvParticipants.length} participants registered.` : 'Share this ID and password with participants or let them discover it in the Tournament section.'}`);
      navigate(createPageUrl(`TournamentHub?type=${tournamentType}`));
    } catch (error) {
      console.error('Error creating tournament:', error);
    } finally {
      setLoading(false);
    }
  };

  const parseCSV = async (file) => {
    const text = await file.text();
    // Basic CSV parse: header first row: name,email,phone (any order)
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (lines.length === 0) { setCsvParticipants([]); return; }
    const header = lines[0].split(',').map(h => h.trim().toLowerCase());
    const nameIdx = header.findIndex(h => ['name','full_name','student_name'].includes(h));
    const emailIdx = header.findIndex(h => ['email','mail','email_id'].includes(h));
    const phoneIdx = header.findIndex(h => ['phone','phone_number','mobile','mobile_number'].includes(h));
    const rows = lines.slice(1).map((line) => line.split(',')).filter(r => r.some(x => x && x.trim() !== ''));
    const participants = rows.map(cols => ({
      name: nameIdx >= 0 ? (cols[nameIdx] || '').trim() : '',
      email: emailIdx >= 0 ? (cols[emailIdx] || '').trim() : '',
      phone: phoneIdx >= 0 ? (cols[phoneIdx] || '').trim() : ''
    })).filter(p => p.email);
    setCsvParticipants(participants);
  };

  const domains = ['General', 'Technology', 'Business', 'Education', 'Healthcare', 'Environment', 'Politics', 'Sports'];

  const typeLabels = {
    gd: 'Group Discussion',
    extempore: 'Extempore',
    debate: 'Debate'
  };

  return (
    <div className="min-h-screen pb-20">
      <TopNav activePage="Explore" />
      
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28">
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
          <h1 className="text-4xl font-black mb-2 gradient-text">Create {typeLabels[tournamentType]} Tournament</h1>
          <p className="text-gray-600">Set up a tournament for your organization</p>
        </motion.div>

        <ClayCard className="mb-6">
          <div className="space-y-6">
            {/* Tournament Name */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <Trophy className="w-5 h-5 text-orange-500" />
                Tournament Name *
              </label>
              <Input
                placeholder="e.g., Annual GD Championship 2025"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="clay-card border-none h-12"
              />
            </div>

            {/* Organizer */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <Building2 className="w-5 h-5 text-blue-500" />
                Organization / College / Company *
              </label>
              <Input
                placeholder="e.g., ABC University, XYZ Corp"
                value={formData.organizer}
                onChange={(e) => setFormData({...formData, organizer: e.target.value})}
                className="clay-card border-none h-12"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">
                Description
              </label>
              <Textarea
                placeholder="Describe your tournament..."
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="clay-card border-none min-h-24"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Visibility */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                  {formData.visibility === 'public' ? (
                    <Globe className="w-5 h-5 text-green-500" />
                  ) : (
                    <Lock className="w-5 h-5 text-orange-500" />
                  )}
                  Visibility
                </label>
                <Select value={formData.visibility} onValueChange={(val) => setFormData({...formData, visibility: val})}>
                  <SelectTrigger className="clay-card border-none h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Group Size */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                  <Users className="w-5 h-5 text-purple-500" />
                  Group Size
                </label>
                <Select value={formData.group_size.toString()} onValueChange={(val) => setFormData({...formData, group_size: parseInt(val)})}>
                  <SelectTrigger className="clay-card border-none h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2 per group</SelectItem>
                    <SelectItem value="3">3 per group</SelectItem>
                    <SelectItem value="4">4 per group</SelectItem>
                    <SelectItem value="5">5 per group</SelectItem>
                    <SelectItem value="6">6 per group</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Domain */}
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Topic Domain
                </label>
                <Select value={formData.domain} onValueChange={(val) => setFormData({...formData, domain: val})}>
                  <SelectTrigger className="clay-card border-none h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {domains.map((d) => (
                      <SelectItem key={d} value={d.toLowerCase()}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Duration */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                  <Clock className="w-5 h-5 text-cyan-500" />
                  Duration (mins)
                </label>
                <Select value={formData.duration.toString()} onValueChange={(val) => setFormData({...formData, duration: parseInt(val)})}>
                  <SelectTrigger className="clay-card border-none h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 minutes</SelectItem>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="20">20 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Start Date */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <Calendar className="w-5 h-5 text-pink-500" />
                Start Date (Optional)
              </label>
              <Input
                type="datetime-local"
                value={formData.start_date}
                onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                className="clay-card border-none h-12"
              />
            </div>

            {/* Max Participants */}
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">
                Max Participants
              </label>
              <Input
                type="number"
                value={formData.max_participants}
                onChange={(e) => setFormData({...formData, max_participants: parseInt(e.target.value)})}
                className="clay-card border-none h-12"
              />
            </div>

            {/* Bulk Upload Students */}
            <div className="clay-card p-4">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <Upload className="w-5 h-5 text-green-600" />
                Bulk Upload Students (CSV)
              </label>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) parseCSV(file);
                }}
                className="block w-full text-sm text-gray-600"
              />
              {csvParticipants.length > 0 && (
                <div className="mt-3 p-3 rounded-xl bg-green-50 border border-green-200 text-sm text-green-700 flex items-center justify-between">
                  <span>{csvParticipants.length} students parsed from CSV</span>
                  <button onClick={() => setCsvParticipants([])} className="flex items-center gap-1 text-green-800 hover:underline"><X className="w-4 h-4" /> Clear</button>
                </div>
              )}
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-700">Group Size (people per group)</label>
                  <Input type="number" value={formData.group_size} onChange={(e) => setFormData({ ...formData, group_size: parseInt(e.target.value || '0') })} className="clay-card border-none h-10 mt-1" />
                </div>
                <div>
                  <label className="text-sm text-gray-700">Or Number of Groups (optional)</label>
                  <Input type="number" value={groupsCount} onChange={(e) => setGroupsCount(e.target.value)} placeholder="e.g., 10" className="clay-card border-none h-10 mt-1" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">We will randomly assign uploaded students into groups based on the group size or groups count.</p>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCreate}
            disabled={loading}
            className="mt-8 w-full py-5 rounded-3xl bg-gradient-to-r from-orange-400 to-pink-500 text-white font-bold text-lg shadow-xl disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Tournament'}
          </motion.button>
        </ClayCard>

        <ClayCard className="bg-gradient-to-br from-orange-50 to-pink-50">
          <h3 className="font-bold text-lg mb-3">Tournament Tips:</h3>
          <ul className="space-y-2 text-gray-700 text-sm">
            <li className="flex items-start gap-2">
              <span className="w-2 h-2 bg-orange-500 rounded-full mt-2"></span>
              Public tournaments are visible to everyone and can be joined with the tournament ID
            </li>
            <li className="flex items-start gap-2">
              <span className="w-2 h-2 bg-pink-500 rounded-full mt-2"></span>
              Private tournaments require the exact ID to find and register
            </li>
            <li className="flex items-start gap-2">
              <span className="w-2 h-2 bg-purple-500 rounded-full mt-2"></span>
              Participants will receive a unique password via email upon registration
            </li>
          </ul>
        </ClayCard>
      </div>
    </div>
  );
}
import { api } from '@/api/apiClient';
import { motion } from 'framer-motion';
import { ArrowLeft, Building2, Calendar as CalendarIcon, Clock, Globe, Lock, Trophy, Upload, Users, X, Info } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import TopNav from '../components/navigation/TopNav';

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

  // Helper to show selected date as dd-mm-yyyy
  const formatDate = (value) => {
    if (!value) return '';
    try {
      const d = new Date(value);
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${dd}-${mm}-${yyyy}`;
    } catch {
      return '';
    }
  };

  return (
    <div className="min-h-screen pb-24">
      <TopNav activePage="Explore" />
      <TooltipProvider>
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28">
          {/* Header card */}
          <Card className="mb-8 border-none bg-gradient-to-br from-orange-50 to-pink-50 shadow-md animate-fadeIn duration-700">
            <CardHeader className="py-6">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium mb-3"
              >
                <ArrowLeft className="w-5 h-5" />
                Back
              </button>
              <CardTitle className="text-3xl sm:text-4xl font-black tracking-tight flex items-center gap-2">
                <span className="text-2xl"></span>
                Create {typeLabels[tournamentType]} Tournament
                <Badge className="ml-2" variant="secondary">{typeLabels[tournamentType]}</Badge>
              </CardTitle>
              <CardDescription className="mt-2">Set up a tournament for your organization</CardDescription>
            </CardHeader>
          </Card>

          {/* Two-column grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Main form fields */}
            <Card className="lg:col-span-7 border border-gray-100/70 shadow-sm hover:shadow-md transition-shadow animate-fadeIn duration-700">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Trophy className="w-5 h-5 text-orange-500" />
                  Tournament details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Tournament Name */}
                <div>
                  <Label className="text-sm text-gray-600 flex items-center gap-2 mb-2">
                    <Trophy className="w-4 h-4 text-orange-500" />
                    Tournament Name *
                  </Label>
                  <Input
                    placeholder="e.g., Annual GD Championship 2025"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="h-12 text-base text-gray-800 hover:shadow-sm transition-shadow"
                  />
                </div>

                {/* Organizer */}
                <div>
                  <Label className="text-sm text-gray-600 flex items-center gap-2 mb-2">
                    <Building2 className="w-4 h-4 text-blue-500" />
                    Organization / College / Company *
                  </Label>
                  <Input
                    placeholder="e.g., ABC University, XYZ Corp"
                    value={formData.organizer}
                    onChange={(e) => setFormData({ ...formData, organizer: e.target.value })}
                    className="h-12 text-base text-gray-800 hover:shadow-sm transition-shadow"
                  />
                </div>

                {/* Description */}
                <div>
                  <Label className="text-sm text-gray-600 mb-2 block">Description</Label>
                  <Textarea
                    placeholder="Describe your tournament..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="min-h-24 text-base text-gray-800 hover:shadow-sm transition-shadow"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Right: Settings */}
            <Card className="lg:col-span-5 border border-gray-100/70 shadow-sm hover:shadow-md transition-shadow animate-fadeIn duration-700">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Users className="w-5 h-5 text-purple-500" />
                  Settings & Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Visibility */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    {formData.visibility === 'public' ? (
                      <Globe className="w-4 h-4 text-green-500" />
                    ) : (
                      <Lock className="w-4 h-4 text-orange-500" />
                    )}
                    <Label className="text-sm text-gray-600">Visibility</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className="ml-1 inline-flex items-center text-gray-400 hover:text-gray-600">
                          <Info className="w-4 h-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Public tournaments are discoverable. Private require the exact ID.</TooltipContent>
                    </Tooltip>
                  </div>
                  <Select value={formData.visibility} onValueChange={(val) => setFormData({ ...formData, visibility: val })}>
                    <SelectTrigger className="h-12 text-base text-gray-800">
                      <SelectValue placeholder="Select visibility" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Group Size */}
                <div>
                  <Label className="text-sm text-gray-600 flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-purple-500" />
                    Group Size
                  </Label>
                  <Select value={formData.group_size.toString()} onValueChange={(val) => setFormData({ ...formData, group_size: parseInt(val) })}>
                    <SelectTrigger className="h-12 text-base text-gray-800">
                      <SelectValue placeholder="Select group size" />
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

                {/* Domain & Duration */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-gray-600 mb-2 block">Topic Domain</Label>
                    <Select value={formData.domain} onValueChange={(val) => setFormData({ ...formData, domain: val })}>
                      <SelectTrigger className="h-12 text-base text-gray-800">
                        <SelectValue placeholder="Select a domain" />
                      </SelectTrigger>
                      <SelectContent>
                        {domains.map((d) => (
                          <SelectItem key={d} value={d.toLowerCase()}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-cyan-500" />
                      <Label className="text-sm text-gray-600">Duration (mins)</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button className="ml-1 inline-flex items-center text-gray-400 hover:text-gray-600">
                            <Info className="w-4 h-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>Set the speaking round duration per group.</TooltipContent>
                      </Tooltip>
                    </div>
                    <Select value={formData.duration.toString()} onValueChange={(val) => setFormData({ ...formData, duration: parseInt(val) })}>
                      <SelectTrigger className="h-12 text-base text-gray-800">
                        <SelectValue placeholder="Select duration" />
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
                  <div className="flex items-center gap-2 mb-2">
                    <CalendarIcon className="w-4 h-4 text-pink-500" />
                    <Label className="text-sm text-gray-600">Start Date (Optional)</Label>
                  </div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal h-12 text-base">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.start_date ? formatDate(formData.start_date) : <span className="text-muted-foreground">Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.start_date ? new Date(formData.start_date) : undefined}
                        onSelect={(d) => setFormData({ ...formData, start_date: d ? d.toISOString() : '' })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Max Participants */}
                <div>
                  <Label className="text-sm text-gray-600 mb-2 block">Max Participants</Label>
                  <Input
                    type="number"
                    value={formData.max_participants}
                    onChange={(e) => setFormData({ ...formData, max_participants: parseInt(e.target.value || '0') })}
                    className="h-12 text-base text-gray-800 hover:shadow-sm transition-shadow"
                  />
                </div>

                {/* Bulk Upload Students */}
                <div className="rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-2">
                    <Upload className="w-4 h-4 text-green-600" />
                    <Label className="text-sm text-gray-600">Bulk Upload Students (CSV)</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className="ml-1 inline-flex items-center text-gray-400 hover:text-gray-600">
                          <Info className="w-4 h-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Upload a CSV with columns like name,email[,phone]</TooltipContent>
                    </Tooltip>
                  </div>
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
                      <Label className="text-sm text-gray-600">Group Size (people per group)</Label>
                      <Input type="number" value={formData.group_size} onChange={(e) => setFormData({ ...formData, group_size: parseInt(e.target.value || '0') })} className="h-10 mt-1 text-base text-gray-800" />
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">Or Number of Groups (optional)</Label>
                      <Input type="number" value={groupsCount} onChange={(e) => setGroupsCount(e.target.value)} placeholder="e.g., 10" className="h-10 mt-1 text-base text-gray-800" />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">We will randomly assign uploaded students into groups based on the group size or groups count.</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Primary CTA */}
          <div className="mt-8 flex justify-center">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCreate}
              disabled={loading}
              className="px-10 py-5 rounded-3xl bg-gradient-to-r from-orange-400 to-pink-500 text-white font-bold text-lg shadow-xl disabled:opacity-50 hover:shadow-[0_0_25px_rgba(236,72,153,0.45)]"
            >
              {loading ? 'Creating...' : 'Create Tournament'}
            </motion.button>
          </div>
        </div>
      </TooltipProvider>
    </div>
  );
}

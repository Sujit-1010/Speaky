import About from './pages/About';
import AIInterviewAI from './pages/AIInterviewAI';
import AIInterviewAnalysis from './pages/AIInterviewAnalysis';
import AIInterviewHub from './pages/AIInterviewHub';
import AIInterviewRoom from './pages/AIInterviewRoom';
import BrowseRooms from './pages/BrowseRooms';
import Call from './pages/Call';

import Chat from './pages/Chat';
import Contact from './pages/Contact';
import CreateDebateRoom from './pages/CreateDebateRoom';
import CreateRoom from './pages/CreateRoom';
import CreateTournament from './pages/CreateTournament';
import Dashboard from './pages/Dashboard';
import DebateArena from './pages/DebateArena';
import DebateLobby from './pages/DebateLobby';
import DebateRoom from './pages/DebateRoom';
import Explore from './pages/Explore';
import ExtemporeFeedback from './pages/ExtemporeFeedback';
import ExtemporePractice from './pages/ExtemporePractice';
import ExtemporeRoom from './pages/ExtemporeRoom';
import GDArena from './pages/GDArena';
import GDModes from './pages/GDModes';
import GDPrepare from './pages/GDPrepare';
import GDAnalysis from './pages/GDAnalysis';
import GDRoom from './pages/GDRoom';

import HumanInterviewRoom from './pages/HumanInterviewRoom';
import JoinDebateRoom from './pages/JoinDebateRoom';
import JoinRoom from './pages/JoinRoom';
import JudgePanel from './pages/JudgePanel';
import Landing from './pages/Landing';
import Leaderboard from './pages/Leaderboard';
import Lobby from './pages/Lobby';
import Login from './pages/Login';
import Organiser from './pages/Organiser';
import Privacy from './pages/Privacy';
import Profile from './pages/Profile';
import Progress from './pages/Progress';
import Register from './pages/Register';
import SoloPractice from './pages/SoloPractice';
import Terms from './pages/Terms';
import TournamentHub from './pages/TournamentHub';
import TournamentLobby from './pages/TournamentLobby';

import UserProfile from './pages/UserProfile';

export const PAGES = {
    "Landing": Landing,
    "Dashboard": Dashboard,
    "Explore": Explore,
    "GDModes": GDModes,
    "CreateRoom": CreateRoom,
    "JoinRoom": JoinRoom,
    "Lobby": Lobby,
    "GDRoom": GDRoom,
    "ExtemporePractice": ExtemporePractice,
    "ExtemporeRoom": ExtemporeRoom,
    "ExtemporeFeedback": ExtemporeFeedback,

    "Leaderboard": Leaderboard,
    "Profile": Profile,
    "GDArena": GDArena,
    "SoloPractice": SoloPractice,
    "GDPrepare": GDPrepare,
    "GDAnalysis": GDAnalysis,
    "TournamentHub": TournamentHub,
    "CreateTournament": CreateTournament,

    "TournamentLobby": TournamentLobby,
    "DebateArena": DebateArena,
    "AIInterviewHub": AIInterviewHub,
    "AIInterviewRoom": AIInterviewRoom,
    "CreateDebateRoom": CreateDebateRoom,
    "JoinDebateRoom": JoinDebateRoom,
    "DebateLobby": DebateLobby,
    "DebateRoom": DebateRoom,
    "About": About,
    "AIInterviewAI": AIInterviewAI,
    "AIInterviewAnalysis": AIInterviewAnalysis,
    "BrowseRooms": BrowseRooms,
    "HumanInterviewRoom": HumanInterviewRoom,
    "UserProfile": UserProfile,

    "Chat": Chat,
    "Progress": Progress,
    "Call": Call,
    "Login": Login,
    "Register": Register,
    "Contact": Contact,
    "Terms": Terms,
    "Privacy": Privacy,
    "Organiser": Organiser,
    "JudgePanel": JudgePanel,
}

export const pagesConfig = {
    mainPage: "Landing",
    Pages: PAGES,
};
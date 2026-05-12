import { Toaster } from "@/components/ui/toaster"
import UserNotRegisteredError from '@/components/UserNotRegisteredError'
import { AuthProvider, useAuth } from '@/lib/AuthContext'
import NavigationTracker from '@/lib/NavigationTracker'
import PushNotificationsManager from '@/lib/PushNotificationsManager'
import { queryClientInstance } from '@/lib/query-client'
import { SocketProvider } from '@/lib/SocketContext'
import VisualEditAgent from '@/lib/VisualEditAgent'
import { QueryClientProvider } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { Route, BrowserRouter as Router, Routes, useLocation } from 'react-router-dom'
import './App.css'
import AppFooter from './components/navigation/AppFooter'
import PageNotFound from './lib/PageNotFound'
import { pagesConfig } from './pages.config'
import FindingParticipants from './pages/FindingParticipants'
import Global from './pages/Global'
import GlobalLobby from './pages/GlobalLobby'

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

// Smooth page transition wrapper
const PageTransition = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -6 }}
    transition={{ duration: 0.18, ease: 'easeInOut' }}
    style={{ width: '100%' }}
  >
    {children}
  </motion.div>
);

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated, navigateToLogin } = useAuth();
  const location = useLocation();
  const pathname = location.pathname;
  const p = pathname?.toLowerCase?.() || pathname;
  const isPublicPage = (
    p === '/' ||
    p === '/about' ||
    p === '/contact' ||
    p === '/terms' ||
    p === '/privacy' ||
    p === '/login' ||
    p === '/register' ||
    p === '/organiser' ||
    p === '/judgepanel'
  );

  // Only show a blocking spinner on the very first load (no location yet established)
  // After that, auth state is known — don't block page renders
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white z-[9999]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-purple-100 border-t-purple-500 rounded-full animate-spin" />
          <p className="text-sm text-gray-400 font-medium">Loading…</p>
        </div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      if (!isPublicPage) {
        navigateToLogin();
        return null;
      }
      // allow public pages without redirect
    }
  }

  // Guard: if fully loaded and not authenticated, block protected pages
  if (!isAuthenticated && !isPublicPage) {
    navigateToLogin();
    return null;
  }

  // Render the main app with smooth page transitions
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={
          <PageTransition>
            <LayoutWrapper currentPageName={isAuthenticated ? 'Dashboard' : mainPageKey}>
              {isAuthenticated ? <pagesConfig.Pages.Dashboard /> : <MainPage />}
            </LayoutWrapper>
          </PageTransition>
        } />
        <Route
          path="/global"
          element={
            <PageTransition>
              <LayoutWrapper currentPageName="Global">
                <Global />
              </LayoutWrapper>
            </PageTransition>
          }
        />
        <Route
          path="/finding"
          element={
            <PageTransition>
              <LayoutWrapper currentPageName="Global">
                <FindingParticipants />
              </LayoutWrapper>
            </PageTransition>
          }
        />
        <Route
          path="/lobby/:roomId"
          element={
            <PageTransition>
              <LayoutWrapper currentPageName="Global">
                <GlobalLobby />
              </LayoutWrapper>
            </PageTransition>
          }
        />
        {Object.entries(Pages).map(([path, Page]) => (
          <Route
            key={path}
            path={`/${path}`}
            element={
              <PageTransition>
                <LayoutWrapper currentPageName={path}>
                  <Page />
                </LayoutWrapper>
              </PageTransition>
            }
          />
        ))}
        <Route path="*" element={<PageTransition><PageNotFound /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
};


function App() {

  return (
    <AuthProvider>
      <SocketProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <NavigationTracker />
            <PushNotificationsManager />
            <AuthenticatedApp />
            <AppFooter />
          </Router>
          <Toaster />
          <VisualEditAgent />
        </QueryClientProvider>
      </SocketProvider>
    </AuthProvider>
  )
}

export default App

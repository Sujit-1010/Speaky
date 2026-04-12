import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '../../utils';

export default function AppFooter() {
  const location = useLocation();
  const [atBottom, setAtBottom] = useState(false);

  const p = (location.pathname || '').toLowerCase();
  const shouldHide = (
    p === '/createroom' ||
    p === '/createdebateroom' ||
    p === '/createtournament' ||
    p === '/lobby' ||
    p.startsWith('/lobby/') ||
    p === '/debatelobby' ||
    p === '/debateroom' ||
    p === '/gdprepare' ||
    p === '/gdroom' ||
    p === '/aiinterviewroom' ||
    p === '/humaninterviewroom'
  );

  useEffect(() => {
    const onScroll = () => {
      const threshold = 8; // px from bottom
      const scrolledToBottom = window.innerHeight + window.scrollY >= (document.documentElement.scrollHeight - threshold);
      setAtBottom(scrolledToBottom);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [location.pathname]);

  const isAbout = p === '/about';
  const showFooter = !shouldHide;

  return (
    <>
      {isAbout && (
        <section className="mt-12">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="rounded-3xl border-2 border-indigo-100 bg-gradient-to-br from-gray-50 to-indigo-50 p-6 sm:p-8">
              <h2 className="text-2xl font-black mb-2">Contact Us</h2>
              <p className="text-gray-700 mb-2">We'd love to hear from you.</p>
              <div className="space-y-1 text-sm text-gray-600">
                <p>Email: support@gdhub.app</p>
                <p>Twitter/X: @gdhub</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {showFooter && (
        <footer className="bg-white border-t border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-12 flex items-center justify-between text-sm text-gray-600">
            <div className="font-semibold"> {new Date().getFullYear()} SpeakUp</div>
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('Terms')} className="hover:text-gray-900">Terms</Link>
              <Link to={createPageUrl('Privacy')} className="hover:text-gray-900">Privacy</Link>
              <Link to={createPageUrl('Contact')} className="hover:text-gray-900">Contact</Link>
            </div>
          </div>
        </footer>
      )}
    </>
  );
}

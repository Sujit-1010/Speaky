import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';

export default function AppFooter() {
  return (
    <footer className="bg-white border-t border-gray-200 py-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-sm text-gray-600 gap-2">
        <div className="font-semibold">© {new Date().getFullYear()} SpeakUp</div>
        <div className="flex items-center gap-4">
          <Link to={createPageUrl('Terms')} className="hover:text-gray-900">Terms</Link>
          <Link to={createPageUrl('Privacy')} className="hover:text-gray-900">Privacy</Link>
          <Link to={createPageUrl('Contact')} className="hover:text-gray-900">Contact</Link>
        </div>
      </div>
    </footer>
  );
}


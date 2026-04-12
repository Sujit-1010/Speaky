import TopNav from '../components/navigation/TopNav';
import ClayCard from '../components/shared/ClayCard';

export default function Contact() {
  return (
    <div className="min-h-screen pb-20">
      <TopNav activePage="Contact" user={null} />
      <div className="max-w-4xl mx-auto px-6 pt-28 space-y-6">
        <h1 className="text-4xl font-black gradient-text mb-2">Contact Us</h1>
        <ClayCard>
          <p className="text-gray-700 mb-2">We'd love to hear from you.</p>
          <div className="space-y-1 text-sm text-gray-600">
            <p>Email: support@gdhub.app</p>
            <p>Twitter/X: @gdhub</p>
          </div>
        </ClayCard>
      </div>
    </div>
  );
}

import TopNav from '../components/navigation/TopNav';
import ClayCard from '../components/shared/ClayCard';

export default function Privacy() {
  return (
    <div className="min-h-screen pb-20">
      <TopNav activePage="Privacy" user={null} />
      <div className="max-w-4xl mx-auto px-6 pt-28 space-y-6">
        <h1 className="text-4xl font-black gradient-text mb-2">Privacy Policy</h1>
        <ClayCard>
          <p className="text-gray-700 text-sm">
            Your privacy matters. This is a placeholder for the Privacy Policy. Provide your official policy text to ship.
          </p>
        </ClayCard>
      </div>
    </div>
  );
}

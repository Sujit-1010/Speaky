import TopNav from '../components/navigation/TopNav';
import ClayCard from '../components/shared/ClayCard';

export default function Terms() {
  return (
    <div className="min-h-screen pb-20">
      <TopNav activePage="Terms" user={null} />
      <div className="max-w-4xl mx-auto px-6 pt-28 space-y-6">
        <h1 className="text-4xl font-black gradient-text mb-2">Terms and Conditions</h1>
        <ClayCard>
          <p className="text-gray-700 text-sm">
            By using GDHub, you agree to our platform rules and community guidelines. This page is a placeholder. Please provide your legal copy for production.
          </p>
        </ClayCard>
      </div>
    </div>
  );
}

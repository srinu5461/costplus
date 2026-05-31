import { useCMS } from '../context/CMSContext';
import { useAdmin } from '../context/AdminContext';

export function ProviderTest() {
  console.log('ProviderTest component rendering');
  
  try {
    const cms = useCMS();
    console.log('✅ CMSProvider is working!', cms);
  } catch (e) {
    console.error('❌ CMSProvider error:', e);
    return <div className="p-8 bg-red-50 text-red-900">CMSProvider Error: {String(e)}</div>;
  }

  try {
    const admin = useAdmin();
    console.log('✅ AdminProvider is working!', admin);
  } catch (e) {
    console.error('❌ AdminProvider error:', e);
    return <div className="p-8 bg-red-50 text-red-900">AdminProvider Error: {String(e)}</div>;
  }

  return (
    <div className="p-8 bg-green-50 text-green-900">
      <h1 className="text-2xl font-bold mb-4">✅ All Providers Working!</h1>
      <p>Both CMSProvider and AdminProvider are accessible.</p>
    </div>
  );
}

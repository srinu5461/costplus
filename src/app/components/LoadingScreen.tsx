import logoImage from 'figma:asset/1cd922824a5418f9ad0358d3fe1d474395d2a7ff.png';
import { useLocation } from 'react-router';

export function LoadingScreen() {
  const location = useLocation();
  const isAdminPage = location?.pathname?.startsWith('/admin');
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        {/* Logo - INSTANT LOADING REAL LOGO */}
        <div className="mb-8">
          <img 
            src={logoImage}
            alt="Costplus100 - Total Transparency - No Catch" 
            className="h-20 w-auto mx-auto"
          />
        </div>
        {/* Spinner */}
        <div className="relative w-16 h-16 mx-auto mb-6">
          <div className="absolute inset-0 rounded-full border-4 border-slate-200"></div>
          <div className="absolute inset-0 rounded-full border-4 border-[#E31837] border-t-transparent animate-spin"></div>
        </div>
        <p className="text-lg font-medium text-[#2D3748] mb-2">
          {isAdminPage ? 'Loading Admin Panel' : 'Loading Costplus100'}
        </p>
        <p className="text-sm text-slate-500">Please wait while we prepare your experience...</p>
      </div>
    </div>
  );
}
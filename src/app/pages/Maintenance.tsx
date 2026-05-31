import { AlertTriangle, Wrench } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';

interface MaintenanceProps {
  message?: string;
}

export function Maintenance({ message }: MaintenanceProps) {
  const defaultMessage = 'We are currently performing scheduled maintenance. Please check back soon!';
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardContent className="p-12 text-center">
          {/* Icon */}
          <div className="mb-6 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 animate-ping bg-amber-400 rounded-full opacity-20"></div>
              <div className="relative bg-amber-100 rounded-full p-6">
                <Wrench className="size-16 text-amber-600" />
              </div>
            </div>
          </div>
          
          {/* Title */}
          <h1 className="text-4xl mb-4 text-slate-900">
            Under Maintenance
          </h1>
          
          {/* Message */}
          <p className="text-lg text-slate-600 mb-8 leading-relaxed">
            {message || defaultMessage}
          </p>
          
          {/* Additional Info */}
          <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
            <div className="flex items-center justify-center gap-2 text-slate-700 mb-3">
              <AlertTriangle className="size-5" />
              <p className="font-medium">What's Happening?</p>
            </div>
            <p className="text-sm text-slate-600">
              Our team is working hard to improve your experience. 
              This maintenance is necessary to bring you better features and performance.
            </p>
          </div>
          
          {/* Contact Info */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <p className="text-sm text-slate-600">
              Need urgent assistance? Contact us at{' '}
              <a 
                href="mailto:info@costplus100.com.au" 
                className="text-[#E31837] hover:underline font-medium"
              >
                info@costplus100.com.au
              </a>
            </p>
          </div>
          
          {/* Brand Footer */}
          <div className="mt-8">
            <p className="text-2xl font-bold text-[#2D3748]">
              COSTPLUS<span className="text-[#E31837]">100</span>
            </p>
            <p className="text-xs text-slate-500 mt-2">Professional Catering Equipment</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

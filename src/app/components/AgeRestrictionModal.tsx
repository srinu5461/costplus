import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from './ui/button';

interface AgeRestrictionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  productName?: string;
}

export function AgeRestrictionModal({ isOpen, onClose, onConfirm, productName }: AgeRestrictionModalProps) {
  const [isChecked, setIsChecked] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (isChecked) {
      onConfirm();
      setIsChecked(false); // Reset for next time
    }
  };

  const handleClose = () => {
    setIsChecked(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="size-6" />
        </button>

        {/* Content */}
        <div className="p-8 text-center">
          {/* Heading */}
          <h2 className="text-3xl font-bold text-slate-900 mb-6">
            Your basket contains age restricted products.
          </h2>

          {/* 18+ Icon */}
          <div className="flex justify-center mb-8">
            <div className="w-24 h-24 rounded-full border-4 border-[#E31837] flex items-center justify-center">
              <span className="text-5xl font-bold text-[#E31837]">18</span>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-4 text-left mb-8">
            <p className="text-slate-700 text-lg leading-relaxed">
              One or more items in your basket are age restricted 'controlled items' and cannot be 
              purchased by, or delivered to minors. We have introduced additional age verification checks:
            </p>
            
            <ul className="space-y-2 text-slate-600">
              <li className="flex gap-2">
                <span className="text-[#E31837] font-bold">-</span>
                <span>At time of purchase – for online orders our team will call you back to complete age verification checks</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[#E31837] font-bold">-</span>
                <span>At point of delivery, our couriers will age check, where required.</span>
              </li>
            </ul>
          </div>

          {/* Checkbox */}
          <div className="mb-8">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={isChecked}
                onChange={(e) => setIsChecked(e.target.checked)}
                className="mt-1 w-5 h-5 text-[#E31837] rounded border-slate-300 focus:ring-[#E31837] cursor-pointer"
              />
              <span className="text-left text-base text-[#E31837] font-semibold leading-snug group-hover:text-[#C01530] transition-colors">
                Please tick the box to confirm that you are over 18 years of age and that delivery 
                will be accepted by a person over 18 years of age.
              </span>
            </label>
          </div>

          {/* Buttons */}
          <div className="flex gap-4">
            <Button
              onClick={handleClose}
              variant="outline"
              className="flex-1 h-12 text-base border-slate-300 hover:bg-slate-50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!isChecked}
              className="flex-1 h-12 text-base bg-[#4CAF50] hover:bg-[#45A049] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              CHECKOUT
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

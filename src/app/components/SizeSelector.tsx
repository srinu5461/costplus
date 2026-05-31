import { SizeVariant } from '../types/product';
import { useState } from 'react';

interface SizeSelectorProps {
  variants: SizeVariant[];
  selectedSize: string | null;
  onSizeChange: (size: string, price: number) => void;
}

export function SizeSelector({ variants, selectedSize, onSizeChange }: SizeSelectorProps) {
  const [showSizeGuide, setShowSizeGuide] = useState(false);

  if (!variants || variants.length === 0) {
    return null;
  }

  // Check if any variant has measurement data
  const hasMeasurements = variants.some(v => v.inches || v.cm || v.waist || v.chest);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block font-semibold text-[#2D3748]">
          Select Size
        </label>
        {hasMeasurements && (
          <button
            type="button"
            onClick={() => setShowSizeGuide(!showSizeGuide)}
            className="text-xs text-[#E31837] hover:underline font-medium"
          >
            {showSizeGuide ? 'Hide' : 'View'} Size Guide
          </button>
        )}
      </div>

      <div className="relative">
        <select
          value={selectedSize || ''}
          onChange={(e) => {
            const selectedVariant = variants.find(v => v.size === e.target.value);
            if (selectedVariant) {
              onSizeChange(selectedVariant.size, selectedVariant.price);
            }
          }}
          className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white text-[#2D3748] font-medium focus:outline-none focus:ring-2 focus:ring-[#E31837] focus:border-transparent appearance-none cursor-pointer"
        >
          <option value="">Choose a size...</option>
          {variants.map((variant) => (
            <option
              key={variant.size}
              value={variant.size}
              disabled={variant.inStock === false}
            >
              {variant.size} - ${variant.price.toFixed(2)}
              {variant.inStock === false ? ' (Out of Stock)' : ''}
            </option>
          ))}
        </select>
        {/* Custom dropdown arrow */}
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-600">
          <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {selectedSize && (
        <p className="text-sm text-slate-600">
          Selected: <span className="font-semibold text-[#2D3748]">{selectedSize}</span>
        </p>
      )}

      {/* Size Guide Table */}
      {showSizeGuide && hasMeasurements && (
        <div className="border border-slate-200 rounded-lg overflow-hidden mt-3">
          <div className="bg-slate-100 px-3 py-2 border-b border-slate-200">
            <h4 className="text-sm font-semibold text-[#2D3748]">Size Guide</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left py-2 px-3 font-semibold text-slate-700">Size</th>
                  {variants.some(v => v.inches) && (
                    <th className="text-left py-2 px-3 font-semibold text-slate-700">Inches</th>
                  )}
                  {variants.some(v => v.cm) && (
                    <th className="text-left py-2 px-3 font-semibold text-slate-700">CM</th>
                  )}
                  {variants.some(v => v.waist) && (
                    <th className="text-left py-2 px-3 font-semibold text-slate-700">Waist</th>
                  )}
                  {variants.some(v => v.chest) && (
                    <th className="text-left py-2 px-3 font-semibold text-slate-700">Chest</th>
                  )}
                  <th className="text-right py-2 px-3 font-semibold text-slate-700">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {variants.map((variant) => (
                  <tr
                    key={variant.size}
                    className={`${
                      variant.size === selectedSize ? 'bg-red-50' : 'hover:bg-slate-50'
                    } ${variant.inStock === false ? 'opacity-50' : ''}`}
                  >
                    <td className="py-2 px-3 font-medium text-[#2D3748]">
                      {variant.size}
                      {variant.inStock === false && (
                        <span className="text-xs text-red-600 ml-1">(Out)</span>
                      )}
                    </td>
                    {variants.some(v => v.inches) && (
                      <td className="py-2 px-3 text-slate-600">{variant.inches || '-'}</td>
                    )}
                    {variants.some(v => v.cm) && (
                      <td className="py-2 px-3 text-slate-600">{variant.cm || '-'}</td>
                    )}
                    {variants.some(v => v.waist) && (
                      <td className="py-2 px-3 text-slate-600">{variant.waist || '-'}</td>
                    )}
                    {variants.some(v => v.chest) && (
                      <td className="py-2 px-3 text-slate-600">{variant.chest || '-'}</td>
                    )}
                    <td className="py-2 px-3 text-right font-semibold text-[#E31837]">
                      ${variant.price.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

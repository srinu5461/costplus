// Trust Badges Component - Display key benefits and guarantees
import { ShieldCheck, DollarSign, Tag, Phone } from 'lucide-react';
import { SquareLogoBlack } from './SquareLogo';

export function TrustBadges() {
  // Fixed phone number - never changes regardless of CMS
  const phoneNumber = '1-800-151-654';

  const badges = [
    {
      icon: ShieldCheck,
      title: 'Best Price',
      subtitle: 'Guaranteed',
      bgColor: 'bg-red-50',
      iconColor: 'text-[#E31837]',
      type: 'icon',
    },
    ...(phoneNumber ? [{
      icon: Phone,
      title: phoneNumber,
      subtitle: 'Call for Costplus $100 prices',
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
      type: 'icon',
    }] : []),
    {
      title: 'Secure Payment',
      type: 'square',
    },
    {
      icon: Tag,
      title: 'Nisbets',
      subtitle: 'Wholesale Range',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
      type: 'icon',
    },
    {
      icon: DollarSign,
      title: 'Total',
      subtitle: 'Transparency',
      bgColor: 'bg-purple-50',
      iconColor: 'text-[#2D3748]',
      type: 'icon',
    },
  ];

  return (
    <>
      {/* Desktop Version */}
      <div className="bg-gradient-to-b from-slate-50 to-white border-b w-full hidden md:block relative z-0">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-3">
          <div className={`grid ${phoneNumber ? 'grid-cols-5' : 'grid-cols-4'} gap-4 lg:gap-8`}>
            {badges.map((badge, index) => {
              if (badge.type === 'square') {
                return (
                  <div
                    key={index}
                    className="flex items-center justify-center gap-3 hover:scale-105 transition-transform duration-200"
                  >
                    {/* Square Payment Logo */}
                    <div className="flex items-center justify-center shrink-0">
                      <SquareLogoBlack className="h-8 lg:h-10 w-auto" />
                    </div>
                  </div>
                );
              }
              
              const Icon = badge.icon!;
              const isPhoneBadge = badge.icon === Phone;
              return (
                <div
                  key={index}
                  className={`flex items-center justify-center gap-3 hover:scale-105 transition-transform duration-200 ${isPhoneBadge ? 'min-w-[200px]' : ''}`}
                >
                  <div className={`${badge.bgColor} p-2 rounded-full shrink-0`}>
                    <Icon className={`size-6 ${badge.iconColor}`} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm lg:text-base font-bold text-[#2D3748] leading-tight whitespace-nowrap">
                      {badge.title}
                    </p>
                    {badge.subtitle && (
                      <p className="text-xs lg:text-sm text-slate-600 whitespace-nowrap">
                        {badge.subtitle}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mobile Version - Horizontal Scroll */}
      <div className="bg-gradient-to-b from-slate-50 to-white border-b w-full md:hidden overflow-x-auto">
        <div className="px-4 py-3">
          <div className="flex gap-6 min-w-max">
            {badges.map((badge, index) => {
              if (badge.type === 'square') {
                return (
                  <div
                    key={index}
                    className="flex items-center gap-3 min-w-[140px]"
                  >
                    {/* Square Payment Logo */}
                    <div className="flex items-center justify-center shrink-0">
                      <SquareLogoBlack className="h-7 w-auto" />
                    </div>
                  </div>
                );
              }
              
              const Icon = badge.icon!;
              const isPhoneBadge = badge.icon === Phone;
              return (
                <div
                  key={index}
                  className={`flex items-center gap-3 ${isPhoneBadge ? 'min-w-[200px]' : 'min-w-[160px]'}`}
                >
                  <div className={`${badge.bgColor} p-2 rounded-full shrink-0`}>
                    <Icon className={`size-5 ${badge.iconColor}`} />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-[#2D3748] leading-tight whitespace-nowrap">
                      {badge.title}
                    </p>
                    {badge.subtitle && (
                      <p className="text-xs text-slate-600 whitespace-nowrap">
                        {badge.subtitle}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
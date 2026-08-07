import { Link } from 'react-router';
import { useCMS } from '../context/CMSContext';
import { Facebook, Twitter, Instagram, Linkedin, Lock, Mail, Phone, MapPin, Shield, Truck } from 'lucide-react';
import { SquareLogoWhite } from './SquareLogo';

// Google Pay Logo Component - Inline SVG with proper Google colors
function GooglePayLogo({ className = "h-12" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 200 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Google "G" - Four colored segments */}
      <g transform="translate(5, 5)">
        {/* Blue (top-right quarter) */}
        <path d="M25 0 C38.8 0 50 11.2 50 25 L 25 25 L 25 0 Z" fill="#4285F4"/>

        {/* Red (top-left quarter) */}
        <path d="M25 0 C11.2 0 0 11.2 0 25 L 25 25 L 25 0 Z" fill="#EA4335"/>

        {/* Yellow (bottom-left quarter) */}
        <path d="M0 25 C0 38.8 11.2 50 25 50 L 25 25 L 0 25 Z" fill="#FBBC05"/>

        {/* Green (bottom-right quarter) */}
        <path d="M25 25 L 25 50 C38.8 50 50 38.8 50 25 Z" fill="#34A853"/>

        {/* White circle in center to create "G" opening */}
        <circle cx="25" cy="25" r="15" fill="white"/>

        {/* Blue bar on right to complete "G" */}
        <rect x="25" y="22" width="25" height="6" fill="#4285F4"/>
      </g>

      {/* "Pay" text */}
      <text x="70" y="40" fontSize="28" fontWeight="500" fill="#5F6368" fontFamily="Arial, Helvetica, sans-serif">Pay</text>
    </svg>
  );
}

// COPE Sensitive Freight Logo - Inline SVG
function COPELogo({ className = "h-20" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 600 203" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
      {/* Red arrow background */}
      <path d="M0 50 L30 0 L380 0 L414 50 L380 100 L30 100 Z" fill="#D72027"/>

      {/* White divider lines */}
      <rect x="105" y="10" width="3" height="80" fill="white"/>
      <rect x="175" y="10" width="3" height="80" fill="white"/>
      <rect x="245" y="10" width="3" height="80" fill="white"/>

      {/* C */}
      <text x="67" y="68" fontSize="54" fontWeight="900" fill="white" fontFamily="Arial, Helvetica, sans-serif" textAnchor="middle">C</text>

      {/* O */}
      <text x="140" y="68" fontSize="54" fontWeight="900" fill="white" fontFamily="Arial, Helvetica, sans-serif" textAnchor="middle">O</text>

      {/* P */}
      <text x="210" y="68" fontSize="54" fontWeight="900" fill="white" fontFamily="Arial, Helvetica, sans-serif" textAnchor="middle">P</text>

      {/* E */}
      <text x="280" y="68" fontSize="54" fontWeight="900" fill="white" fontFamily="Arial, Helvetica, sans-serif" textAnchor="middle">E</text>

      {/* SENSITIVE FREIGHT */}
      <text x="300" y="150" fontSize="40" fontWeight="900" fill="#1A1A1A" fontFamily="Arial, Helvetica, sans-serif" textAnchor="middle" letterSpacing="2">SENSITIVE FREIGHT</text>
    </svg>
  );
}

// StarTrack Logo - Inline SVG
function StarTrackLogo({ className = "h-16" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 420 120" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
      {/* Red circle with half-circle cutout */}
      <circle cx="60" cy="60" r="45" fill="#D72027"/>
      <path d="M60 15 A45 45 0 0 1 60 105 L60 60 Z" fill="white"/>

      {/* STAR text in dark blue */}
      <text x="120" y="62" fontSize="38" fontWeight="900" fill="#003F7F" fontFamily="Arial, Helvetica, sans-serif" letterSpacing="1">STAR</text>

      {/* TRACK text in cyan */}
      <text x="220" y="62" fontSize="38" fontWeight="900" fill="#00AEEF" fontFamily="Arial, Helvetica, sans-serif" letterSpacing="1">TRACK</text>
    </svg>
  );
}

// Logo Component - Same as Header, with text positioned lower and closer to circle
function Logo({ className = "h-10 w-auto" }: { className?: string }) {
  return (
    <svg 
      className={className}
      viewBox="0 0 350 80" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Costplus100 Logo"
    >
      {/* Main Circle Background */}
      <circle cx="40" cy="40" r="34" fill="#2D3748"/>
      
      {/* C+ Text in Circle */}
      <text 
        x="40" 
        y="52" 
        fontSize="34" 
        fontWeight="900" 
        fill="white" 
        textAnchor="middle" 
        fontFamily="Arial, Helvetica, sans-serif"
        letterSpacing="-2"
      >
        C+
      </text>

      {/* 100 Badge */}
      <rect x="52" y="16" width="40" height="22" rx="11" fill="#E31837"/>
      <text
        x="72"
        y="32"
        fontSize="14"
        fontWeight="900"
        fill="white"
        textAnchor="middle"
        fontFamily="Arial, Helvetica, sans-serif"
      >
        100
      </text>

      {/* COSTPLUS100 Text - moved down and closer to circle */}
      <text 
        x="85" 
        y="54" 
        fontSize="28" 
        fontWeight="900" 
        fill="#2D3748" 
        fontFamily="Arial, Helvetica, sans-serif"
        letterSpacing="1"
      >
        COST
      </text>
      <text 
        x="170" 
        y="54" 
        fontSize="28" 
        fontWeight="900" 
        fill="#E31837" 
        fontFamily="Arial, Helvetica, sans-serif"
        letterSpacing="1"
      >
        PLUS
      </text>
      <text 
        x="255" 
        y="54" 
        fontSize="28" 
        fontWeight="900" 
        fill="#2D3748" 
        fontFamily="Arial, Helvetica, sans-serif"
        letterSpacing="1"
      >
        100
      </text>
      
      {/* Tagline */}
      <text 
        x="85" 
        y="70" 
        fontSize="9" 
        fontWeight="700" 
        fill="#E31837" 
        fontFamily="Arial, Helvetica, sans-serif"
        letterSpacing="2"
      >
        TOTAL TRANSPARENCY - NO CATCH
      </text>
    </svg>
  );
}

export function Footer() {
  // ✅ Safely handle cases where CMSProvider might not be available (e.g., Figma preview)
  let data;
  try {
    const cms = useCMS();
    data = cms.data;
  } catch (e) {
    // Fallback for preview/development environments without provider
    data = {
      footer: {
        about: 'Costplus100 - Your trusted commercial equipment supplier',
        email: 'info@costplus100.com.au',
        phone: '1-800-CATER-PRO',
        address: '123 Commercial Street, Sydney, NSW 2000',
        logoUrl: '',
        socialMedia: {},
      },
      header: {
        logoUrl: '',
      },
    };
    console.warn('Footer: CMSProvider not available, using fallback data');
  }
  
  const { footer, header } = data;

  return (
    <footer className="bg-[#2D3748] text-white w-full">
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-12 w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* About */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-lg p-3 inline-block mb-4">
              {/* INSTANT LOADING: Inline SVG logo - NO database dependency! */}
              <Logo />
            </div>
            <p className="text-slate-300 mb-4 leading-relaxed">
              {footer.about}
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="mb-4 font-semibold text-lg">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/products" className="text-slate-300 hover:text-[#E31837] transition-colors">
                  All Products
                </Link>
              </li>
              <li>
                <Link to="/delivery-information" className="text-slate-300 hover:text-[#E31837] transition-colors">
                  Delivery Information
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-slate-300 hover:text-[#E31837] transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-slate-300 hover:text-[#E31837] transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Policies */}
          <div>
            <h4 className="mb-4 font-semibold text-lg">Legal & Policies</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/terms-and-conditions" className="text-slate-300 hover:text-[#E31837] transition-colors">
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link to="/return-refund-policy" className="text-slate-300 hover:text-[#E31837] transition-colors">
                  Return & Refund Policy
                </Link>
              </li>
              <li>
                <Link to="/privacy-policy" className="text-slate-300 hover:text-[#E31837] transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/admin/login" className="text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-2 text-sm mt-4">
                  <Lock className="size-3" />
                  Admin Login
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="mb-4 font-semibold text-lg">Contact Us</h4>
            <ul className="space-y-3 text-slate-300">
              {footer.email && (
                <li className="flex items-center gap-2">
                  <Mail className="size-4 text-[#E31837] shrink-0" />
                  <a href={`mailto:${footer.email}`} className="hover:text-[#E31837] transition-colors">
                    {footer.email}
                  </a>
                </li>
              )}
              {footer.phone && (
                <li className="flex items-center gap-2">
                  <Phone className="size-4 text-[#E31837] shrink-0" />
                  <a href={`tel:${footer.phone}`} className="hover:text-[#E31837] transition-colors">
                    {footer.phone}
                  </a>
                </li>
              )}
              {footer.address && (
                <li className="flex items-start gap-2">
                  <MapPin className="size-4 text-[#E31837] shrink-0 mt-0.5" />
                  <span className="text-sm">{footer.address}</span>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Social Media */}
        <div className="border-t border-slate-600 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-slate-400 text-sm">
            © {new Date().getFullYear()} Costplus100. All rights reserved.
          </p>
          <div className="flex gap-4">
            {footer.socialMedia.facebook && (
              <a
                href={footer.socialMedia.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="size-10 bg-slate-700 rounded-full flex items-center justify-center hover:bg-[#E31837] transition-colors"
              >
                <Facebook className="size-5" />
              </a>
            )}
            {footer.socialMedia.twitter && (
              <a
                href={footer.socialMedia.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="size-10 bg-slate-700 rounded-full flex items-center justify-center hover:bg-[#E31837] transition-colors"
              >
                <Twitter className="size-5" />
              </a>
            )}
            {footer.socialMedia.instagram && (
              <a
                href={footer.socialMedia.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="size-10 bg-slate-700 rounded-full flex items-center justify-center hover:bg-[#E31837] transition-colors"
              >
                <Instagram className="size-5" />
              </a>
            )}
            {footer.socialMedia.linkedin && (
              <a
                href={footer.socialMedia.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="size-10 bg-slate-700 rounded-full flex items-center justify-center hover:bg-[#E31837] transition-colors"
              >
                <Linkedin className="size-5" />
              </a>
            )}
          </div>
        </div>

        {/* Shipping & Payment Section */}
        <div className="border-t border-slate-600 mt-8 pt-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* Shipping Partners */}
            <div className="flex flex-col items-center lg:items-end lg:pr-8 lg:border-r lg:border-slate-600">
              <div className="flex items-center gap-2 mb-4">
                <Truck className="size-5 text-[#E31837]" />
                <h4 className="text-base font-semibold text-slate-300">Shipping Partners</h4>
              </div>
              <div className="flex items-center gap-6">
                <div className="bg-white rounded-md p-4 flex items-center justify-center min-w-[280px]">
                  <COPELogo className="h-20 w-full" />
                </div>
                <div className="bg-white rounded-md p-4 flex items-center justify-center min-w-[200px]">
                  <StarTrackLogo className="h-16 w-full" />
                </div>
              </div>
            </div>

            {/* Payment Methods */}
            <div className="flex flex-col items-center lg:items-start lg:pl-8">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="size-5 text-[#E31837]" />
                <h4 className="text-base font-semibold text-slate-300">Secure Payments</h4>
              </div>

              {/* Payment Processors */}
              <div className="flex items-center gap-2 flex-wrap">
                <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Visa_Logo.png/120px-Visa_Logo.png" alt="Visa" className="h-7 object-contain bg-white border border-slate-200 rounded px-1.5" />
                <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Mastercard-logo.svg/120px-Mastercard-logo.svg.png" alt="Mastercard" className="h-7 object-contain bg-white border border-slate-200 rounded px-1.5" />
                <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/American_Express_logo.svg/120px-American_Express_logo.svg.png" alt="Amex" className="h-7 object-contain bg-white border border-slate-200 rounded px-1.5" />
                <SquareLogoWhite className="h-9 w-auto" />
                <div className="bg-white rounded-md px-3 py-1.5 flex items-center justify-center">
                  <GooglePayLogo className="h-10 w-auto" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
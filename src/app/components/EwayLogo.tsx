// eWay Logo Component - Reusable eWay payment logo
interface EwayLogoProps {
  className?: string;
  height?: number;
  withBackground?: boolean;
}

export function EwayLogo({ className = '', height = 24, withBackground = true }: EwayLogoProps) {
  const logo = (
    <svg 
      className={className} 
      height={height} 
      viewBox="0 0 120 40" 
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: 'auto' }}
    >
      <text 
        x="10" 
        y="28" 
        fontFamily="Arial, sans-serif" 
        fontSize="24" 
        fontWeight="bold" 
        fill="#E31837"
      >
        e
      </text>
      <text 
        x="32" 
        y="28" 
        fontFamily="Arial, sans-serif" 
        fontSize="24" 
        fontWeight="bold" 
        fill="#2D3748"
      >
        Way
      </text>
    </svg>
  );

  if (withBackground) {
    return (
      <div className="bg-white px-4 py-2 rounded-md border border-slate-300 inline-flex items-center justify-center">
        {logo}
      </div>
    );
  }

  return logo;
}
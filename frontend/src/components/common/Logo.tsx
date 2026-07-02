import React from 'react';
import { Link } from 'react-router-dom';

interface LogoProps {
  compact?: boolean;
  full?: boolean;
  showText?: boolean;
  className?: string;
  iconSize?: number;
  textSize?: string;
}

const Logo: React.FC<LogoProps> = ({
  compact = false,
  full = false,
  showText = true,
  className = '',
  iconSize = 24,
  textSize = 'text-lg',
}) => {
  // compact: only icon, full: always show text, otherwise use showText
  const displayLabel = compact ? false : (full ? true : showText);

  return (
    <Link
      to="/"
      className={`flex items-center gap-2 font-bold tracking-tight select-none focus:outline-none ${className}`}
    >
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0 text-reddit-orange transition-transform duration-300 hover:scale-105"
      >
        {/* Node connections forming a subtle K shape */}
        {/* Left vertical line */}
        <line x1="6" y1="5" x2="6" y2="19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        {/* Branch connection to center node */}
        <line x1="6" y1="12" x2="12" y2="12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        {/* Top diagonal */}
        <line x1="12" y1="12" x2="18" y2="5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        {/* Bottom diagonal */}
        <line x1="12" y1="12" x2="18" y2="19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />

        {/* Nodes (Circles) with clean design and premium orange accent color */}
        <circle cx="6" cy="5" r="3" fill="#FF6B35" stroke="currentColor" strokeWidth="1" />
        <circle cx="6" cy="12" r="3" fill="#FF6B35" stroke="currentColor" strokeWidth="1" />
        <circle cx="6" cy="19" r="3" fill="#FF6B35" stroke="currentColor" strokeWidth="1" />
        <circle cx="12" cy="12" r="3" fill="#FF6B35" stroke="currentColor" strokeWidth="1" />
        <circle cx="18" cy="5" r="3" fill="#FF6B35" stroke="currentColor" strokeWidth="1" />
        <circle cx="18" cy="19" r="3" fill="#FF6B35" stroke="currentColor" strokeWidth="1" />
      </svg>

      {displayLabel && (
        <span className={`${textSize} font-extrabold tracking-tight text-reddit-text dark:text-[#F5F5F5]`}>
          Kindred
        </span>
      )}
    </Link>
  );
};

export default Logo;

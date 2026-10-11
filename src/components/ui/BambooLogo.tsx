import React from 'react';

interface BambooLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export const BambooLogo: React.FC<BambooLogoProps> = ({
  className = '',
  size = 24,
  showText = false,
}) => {
  return (
    <div className={`inline-flex items-center gap-2 select-none ${className}`}>
      {/* Restrained bamboo SVG emblem */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
        aria-hidden="true"
      >
        {/* Left stalk */}
        <path
          d="M10 26V18M10 16V8M10 6V4"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        {/* Left stalk node rings */}
        <line x1="8" y1="17" x2="12" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="8" y1="7" x2="12" y2="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />

        {/* Central main stalk */}
        <path
          d="M16 28V20M16 18V10M16 8V3"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        {/* Central stalk node rings */}
        <line x1="13.5" y1="19" x2="18.5" y2="19" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        <line x1="13.5" y1="9" x2="18.5" y2="9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />

        {/* Right stalk */}
        <path
          d="M22 26V19M22 17V11M22 9V5"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        {/* Right stalk node rings */}
        <line x1="20" y1="18" x2="24" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="20" y1="10" x2="24" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />

        {/* Delicate shoot leaf curving from node */}
        <path
          d="M16 9C19 6 25 7 25 7C25 7 24 13 18 11"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M10 17C7 15 4 17 4 17C4 17 6 21 11 18.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {showText && (
        <span className="font-serif font-semibold text-lg tracking-tight text-foreground lowercase">
          bamboo
        </span>
      )}
    </div>
  );
};

export function PsychelyticsLogo({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="mainGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#0EA5E9', stopOpacity: 1 }} />
          <stop offset="50%" style={{ stopColor: '#6366F1', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#7C3AED', stopOpacity: 1 }} />
        </linearGradient>
        
        <linearGradient id="accentGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#3B82F6', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#8B5CF6', stopOpacity: 1 }} />
        </linearGradient>
      </defs>

      {/* Main chat bubble shape that morphs into data wave */}
      <path
        d="M 50 70 
           Q 50 40, 80 40
           L 140 40
           Q 170 40, 170 70
           L 170 110
           Q 170 130, 155 135
           L 155 140
           Q 155 145, 150 145
           Q 145 145, 145 140
           L 145 135
           
           Q 140 137, 135 132
           Q 130 127, 125 132
           Q 120 137, 115 130
           Q 110 123, 105 130
           Q 100 137, 95 128
           Q 90 119, 85 128
           Q 80 137, 75 132
           Q 70 127, 65 132
           Q 60 137, 55 135
           
           L 50 135
           Q 50 130, 50 110
           Z"
        fill="url(#mainGradient)"
      />
      
      {/* Inner wave/chart bars accent */}
      <g opacity="0.9">
        <rect x="70" y="85" width="10" height="25" rx="2" fill="white" />
        <rect x="85" y="75" width="10" height="35" rx="2" fill="white" />
        <rect x="100" y="70" width="10" height="40" rx="2" fill="white" />
        <rect x="115" y="80" width="10" height="30" rx="2" fill="white" />
        <rect x="130" y="65" width="10" height="45" rx="2" fill="white" />
      </g>
    </svg>
  );
}
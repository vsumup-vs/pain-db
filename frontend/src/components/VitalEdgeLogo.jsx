import React from 'react'

const VitalEdgeLogo = ({ className = "w-20 h-20", animated = false }) => {
  return (
    <svg
      className={className}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#9333EA" />
        </linearGradient>
        {animated && (
          <style>
            {`
              @keyframes pulse-animation {
                0%, 100% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.8; transform: scale(1.05); }
              }
              .pulse-node {
                animation: pulse-animation 2s ease-in-out infinite;
              }
              .pulse-line {
                stroke-dasharray: 300;
                stroke-dashoffset: 300;
                animation: draw-line 2s ease-in-out forwards;
              }
              @keyframes draw-line {
                to { stroke-dashoffset: 0; }
              }
            `}
          </style>
        )}
      </defs>

      {/* Background circle with gradient */}
      <circle
        cx="100"
        cy="100"
        r="95"
        fill="url(#logoGradient)"
        opacity="0.1"
      />

      {/* Main pulse line (ECG/heartbeat style) */}
      <path
        d="M 30 100 L 60 100 L 70 80 L 80 120 L 90 60 L 100 100 L 110 100 L 130 100 L 140 85 L 150 115 L 160 100 L 170 100"
        stroke="url(#logoGradient)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        className={animated ? "pulse-line" : ""}
      />

      {/* Data nodes (circles along the pulse line) */}
      <g className={animated ? "pulse-node" : ""}>
        {/* Left node */}
        <circle cx="60" cy="100" r="6" fill="url(#logoGradient)" opacity="0.8" />
        <circle cx="60" cy="100" r="3" fill="white" />

        {/* Center spike node */}
        <circle cx="90" cy="60" r="8" fill="url(#logoGradient)" />
        <circle cx="90" cy="60" r="4" fill="white" />

        {/* Right spike node */}
        <circle cx="150" cy="115" r="6" fill="url(#logoGradient)" opacity="0.8" />
        <circle cx="150" cy="115" r="3" fill="white" />

        {/* End node */}
        <circle cx="170" cy="100" r="6" fill="url(#logoGradient)" opacity="0.8" />
        <circle cx="170" cy="100" r="3" fill="white" />
      </g>

      {/* Subtle outer glow effect */}
      <circle
        cx="100"
        cy="100"
        r="95"
        stroke="url(#logoGradient)"
        strokeWidth="2"
        fill="none"
        opacity="0.3"
      />

      {/* Inner connection lines (subtle) */}
      <line x1="60" y1="100" x2="90" y2="60" stroke="url(#logoGradient)" strokeWidth="1" opacity="0.2" />
      <line x1="90" y1="60" x2="150" y2="115" stroke="url(#logoGradient)" strokeWidth="1" opacity="0.2" />
      <line x1="150" y1="115" x2="170" y2="100" stroke="url(#logoGradient)" strokeWidth="1" opacity="0.2" />
    </svg>
  )
}

export default VitalEdgeLogo

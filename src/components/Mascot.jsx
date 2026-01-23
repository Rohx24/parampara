import React from "react";
import { motion } from "framer-motion";

const moods = {
  neutral: {
    mouth: "M66 78c6 6 20 6 26 0",
    eyeOffset: 0,
  },
  happy: {
    mouth: "M62 76c8 12 26 12 34 0",
    eyeOffset: -1,
  },
  surprised: {
    mouth: "M82 76c0 10 16 10 16 0",
    eyeOffset: 1,
  },
};

export default function Mascot({ mood = "neutral", className = "", reducedMotion }) {
  const config = moods[mood] || moods.neutral;

  return (
    <motion.div
      className={`relative ${className}`}
      animate={reducedMotion ? undefined : { y: [0, -6, 0] }}
      transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
    >
      <svg width="180" height="180" viewBox="0 0 180 180" fill="none">
        <defs>
          <linearGradient id="buddyGlow" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFD8CC" />
            <stop offset="100%" stopColor="#FFC0AE" />
          </linearGradient>
        </defs>
        <path
          d="M90 16c36 0 64 26 64 62s-24 80-64 80-64-44-64-80 28-62 64-62z"
          fill="url(#buddyGlow)"
        />
        <motion.path
          d="M42 96c-16 10-20 26-14 40"
          stroke="#FFB3A7"
          strokeWidth="10"
          strokeLinecap="round"
          animate={
            reducedMotion
              ? { rotate: 0, y: 0 }
              : { rotate: [0, -14, 0], y: [0, -6, 0] }
          }
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformBox: "fill-box", transformOrigin: "0% 0%" }}
        />
        <motion.path
          d="M136 96c18 10 22 28 12 42"
          stroke="#FF7D6B"
          strokeWidth="10"
          strokeLinecap="round"
          animate={
            reducedMotion
              ? { rotate: 0, y: 0 }
              : { rotate: [0, 18, 0], y: [0, -8, 0] }
          }
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformBox: "fill-box", transformOrigin: "0% 0%" }}
        />
        <circle cx="72" cy={64 + config.eyeOffset} r="6" fill="#4A3B36" />
        <circle cx="108" cy={64 + config.eyeOffset} r="6" fill="#4A3B36" />
        <motion.path
          d={config.mouth}
          stroke="#4A3B36"
          strokeWidth="5"
          strokeLinecap="round"
          animate={{ d: config.mouth }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
        <circle cx="140" cy="42" r="6" fill="#FFE8A6" />
        <circle cx="48" cy="38" r="4" fill="#FFE8A6" />
      </svg>
      <div className="absolute -bottom-6 left-1/2 h-4 w-20 -translate-x-1/2 rounded-full bg-buddy-peach/40 blur-lg" />
    </motion.div>
  );
}

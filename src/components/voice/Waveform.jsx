import React from "react";
import { motion } from "framer-motion";

export default function Waveform({ isActive }) {
  const bars = 10;
  return (
    <div className="flex h-10 items-end gap-[3px]">
      {Array.from({ length: bars }).map((_, i) => (
        <motion.span
          key={i}
          className={`w-1.5 rounded-full transition-colors ${
            isActive ? "bg-buddy-coral" : "bg-slate-200"
          }`}
          animate={
            isActive
              ? {
                  height: ["30%", `${40 + Math.sin(i * 0.9) * 60}%`, "30%"],
                  opacity: [0.7, 1, 0.7],
                }
              : { height: "20%", opacity: 0.4 }
          }
          transition={
            isActive
              ? {
                  duration: 0.6 + i * 0.07,
                  repeat: Infinity,
                  delay: i * 0.08,
                  ease: "easeInOut",
                }
              : { duration: 0.3 }
          }
          style={{ minHeight: 4 }}
        />
      ))}
    </div>
  );
}

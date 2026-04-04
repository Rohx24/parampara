import React from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function MicButton({ isListening, disabled, onStart, onStop }) {
  const handleClick = () => {
    if (disabled) return;
    if (isListening) {
      onStop?.();
    } else {
      onStart?.();
    }
  };

  return (
    <div className="relative flex items-center justify-center">
      {/* Pulse rings when listening */}
      <AnimatePresence>
        {isListening && (
          <>
            <motion.span
              key="ring1"
              className="absolute rounded-full bg-buddy-coral/30"
              initial={{ width: 56, height: 56, opacity: 0.8 }}
              animate={{ width: 88, height: 88, opacity: 0 }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
            />
            <motion.span
              key="ring2"
              className="absolute rounded-full bg-buddy-coral/20"
              initial={{ width: 56, height: 56, opacity: 0.6 }}
              animate={{ width: 110, height: 110, opacity: 0 }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut", delay: 0.4 }}
            />
          </>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        aria-label={isListening ? "Stop listening" : "Start listening"}
        onClick={handleClick}
        whileTap={{ scale: 0.92 }}
        whileHover={!disabled ? { scale: 1.06 } : {}}
        className={`relative z-10 flex h-14 w-14 flex-col items-center justify-center rounded-full text-white shadow-card transition ${
          disabled
            ? "cursor-not-allowed bg-slate-300"
            : isListening
            ? "bg-buddy-coral"
            : "bg-buddy-grape"
        }`}
      >
        {isListening ? (
          <motion.span
            className="text-xl"
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 0.6, repeat: Infinity }}
          >
            ⏹
          </motion.span>
        ) : (
          <span className="text-xl">🎤</span>
        )}
      </motion.button>
    </div>
  );
}

import React from "react";
import { motion } from "framer-motion";

export default function SpeechBubble({ text, className = "" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={`relative inline-flex max-w-[320px] rounded-3xl bg-white/85 px-5 py-3 text-sm font-semibold text-buddy-cocoa shadow-soft ${className}`}
    >
      <span>{text}</span>
      <span className="absolute -bottom-3 left-7 h-0 w-0 border-l-[10px] border-r-[10px] border-t-[14px] border-l-transparent border-r-transparent border-t-white/85" />
    </motion.div>
  );
}

import React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

const sceneVariants = {
  enter: { opacity: 0, y: 18 },
  center: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
};

export default function SceneController({ sceneIndex, children }) {
  const reducedMotion = useReducedMotion();
  const scenes = React.Children.toArray(children);
  const scene = scenes[sceneIndex];

  return (
    <AnimatePresence mode="wait">
      {scene ? (
        <motion.div
          key={sceneIndex}
          variants={sceneVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            duration: reducedMotion ? 0.01 : 0.4,
            ease: "easeInOut",
          }}
          className="w-full"
        >
          {scene}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

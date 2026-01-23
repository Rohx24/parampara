import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import "@google/model-viewer";

export default function Mascot3D({ className = "" }) {
  const modelRef = useRef(null);
  const [isHovering, setIsHovering] = useState(false);
  const clickTimer = useRef(null);
  const rafRef = useRef(null);
  const targetOrbit = useRef({ yaw: 90, pitch: 75, radius: "105%" });
  const targetFocus = useRef({ x: 0, y: 0.1 });

  useEffect(() => {
    const model = modelRef.current;
    if (!model) return;

    const handleLoad = () => {
      model.orientation = "0deg 0deg 0deg";
      model.cameraOrbit = "90deg 75deg 105%";
      targetOrbit.current = { yaw: 90, pitch: 75, radius: "105%" };
    };

    model.addEventListener("load", handleLoad);

    if (model.availableAnimations?.length) {
      model.animationName = model.availableAnimations[0];
      model.pause();
    }

    return () => {
      model.removeEventListener("load", handleLoad);
    };
  }, []);

  useEffect(() => {
    const model = modelRef.current;
    if (!model) return;

    const handleMove = (event) => {
      const x = event.clientX / window.innerWidth;
      const y = event.clientY / window.innerHeight;
      const yaw = 90 - (x - 0.5) * 40;
      const pitch = 75 + (0.5 - y) * 14;
      targetOrbit.current = { yaw, pitch, radius: "105%" };
      targetFocus.current = { x: (0.5 - x) * 0.2, y: 0.1 + (0.5 - y) * 0.1 };

      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          const next = targetOrbit.current;
          const focus = targetFocus.current;
          model.cameraOrbit = `${next.yaw}deg ${next.pitch}deg ${next.radius}`;
          model.cameraTarget = `${focus.x}m ${focus.y}m 0m`;
        });
      }
    };

    const reset = () => {
      targetOrbit.current = { yaw: 90, pitch: 75, radius: "105%" };
      targetFocus.current = { x: 0, y: 0.1 };
      model.cameraOrbit = "90deg 75deg 105%";
      model.cameraTarget = "0m 0.1m 0m";
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("blur", reset);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("blur", reset);
    };
  }, []);

  useEffect(() => {
    const model = modelRef.current;
    if (!model || !model.availableAnimations?.length) return;

    if (isHovering) {
      model.play();
    } else {
      model.pause();
    }
  }, [isHovering]);

  const handleClick = () => {
    const model = modelRef.current;
    if (!model || !model.availableAnimations?.length) return;
    model.currentTime = 0;
    model.play();
    if (clickTimer.current) clearTimeout(clickTimer.current);
    const duration = Number.isFinite(model.duration) ? model.duration : 1.2;
    clickTimer.current = setTimeout(() => model.pause(), duration * 1000);
  };

  return (
    <motion.div
      className={`relative ${className}`}
      onHoverStart={() => setIsHovering(true)}
      onHoverEnd={() => setIsHovering(false)}
      onClick={handleClick}
      role="button"
      aria-label="3D Buddy mascot"
      whileTap={{ scale: 0.98 }}
    >
      <div className="rounded-[2.25rem] bg-white/60 p-3 shadow-soft">
        <model-viewer
          ref={modelRef}
          src="/cute.glb"
          alt="Buddy mascot"
          exposure="1"
          shadow-intensity="0.5"
          interaction-prompt="auto"
          camera-orbit="90deg 75deg 105%"
          camera-target="0m 0.1m 0m"
          disable-zoom
          camera-controls={false}
          auto-rotate={false}
          style={{ width: "180px", height: "200px" }}
        />
      </div>
      <div className="absolute -bottom-5 left-1/2 h-4 w-24 -translate-x-1/2 rounded-full bg-buddy-peach/40 blur-lg" />
    </motion.div>
  );
}

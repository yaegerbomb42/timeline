"use client";

import { AnimatePresence, motion, useMotionValue } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

// Black hole visual component (more dramatic multi-ring vortex + lensing shadow)
function BlackHole({ x, y, isActive }: { x: number; y: number; isActive: boolean }) {
  const rotation = useMotionValue(0);

  useEffect(() => {
    if (!isActive) return;
    let frame: number;
    const loop = () => {
      rotation.set(rotation.get() + 0.9);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [isActive, rotation]);

  return (
    <motion.div
      className="fixed pointer-events-none z-40"
      style={{
        left: `${x}px`,
        top: `${y}px`,
        transform: "translate(-50%, -50%)",
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={isActive ? { scale: 1.1, opacity: 1 } : { scale: 0.7, opacity: 0 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Gravitational lens shadow */}
      <div
        className="absolute rounded-full bg-black/20 blur-2xl"
        style={{
          width: 120,
          height: 40,
          left: "50%",
          top: "75%",
          transform: "translate(-50%, -50%)",
          boxShadow: "0 32px 50px rgba(0,0,0,0.55)",
        }}
      />

      {/* Outer vortex rings */}
      {[1, 0.74, 0.5].map((scale, idx) => (
        <motion.div
          key={idx}
          className="absolute rounded-full border border-[color:var(--ink)]/30"
          style={{
            width: 70 + idx * 12,
            height: 70 + idx * 12,
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            rotate: rotation,
          }}
          animate={{
            rotate: [0, idx % 2 === 0 ? 360 : -360],
            opacity: [0.4, 0.8, 0.4],
          }}
          transition={{
            duration: 3 + idx,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}

      {/* Inner spinning core */}
      <motion.div
        className="absolute rounded-full bg-gradient-radial from-transparent via-[color:var(--ink)]/35 to-black"
        style={{
          width: 40,
          height: 40,
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
        }}
        animate={{
          scale: [0.9, 0.7, 0.95],
          opacity: [0.7, 1, 0.7],
        }}
        transition={{
          duration: 1.2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      {/* Event horizon disc */}
      <div
        className="absolute rounded-full bg-black"
        style={{
          width: 26,
          height: 26,
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          boxShadow: "0 0 35px rgba(0,0,0,0.75)",
        }}
      />
    </motion.div>
  );
}

// Portal emergence point (more intense multi-ring shimmer)
function Portal({ x, y, isActive }: { x: number; y: number; isActive: boolean }) {
  return (
    <motion.div
      className="fixed pointer-events-none z-40"
      style={{
        left: `${x}px`,
        top: `${y}px`,
        transform: "translate(-50%, -50%)",
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={isActive ? { scale: 1, opacity: 1 } : { scale: 0.7, opacity: 0 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Outer halo */}
      <motion.div
        className="absolute rounded-full border border-[color:var(--brass-2)]/50"
        style={{ width: 60, height: 60 }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.7, 1, 0.7],
        }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Inner pulses */}
      {[1, 0.7].map((scale, idx) => (
        <motion.div
          key={idx}
          className="absolute rounded-full bg-[color:var(--brass-2)]/20 blur-lg"
          style={{ width: 40 - idx * 8, height: 40 - idx * 8, left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}
          animate={{
            scale: [scale, scale * 1.4, scale],
            opacity: [0.4, 0.9, 0.4],
          }}
          transition={{ duration: 1.1 + idx * 0.3, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
      {/* Central spark */}
      <div
        className="absolute left-1/2 top-1/2 h-2.5 w-2.5 rounded-full bg-[color:var(--brass-2)] shadow-[0_0_22px_rgba(176,141,87,0.9)]"
        style={{ transform: "translate(-50%, -50%)" }}
      />
    </motion.div>
  );
}

// Word traveling through the void (deeper 3D arc + trailing glow)
function WordInVoid({
  word,
  startPos,
  blackHolePos,
  portalPos,
  endPos,
  delay = 0,
  onComplete,
}: {
  word: string;
  startPos: { x: number; y: number };
  blackHolePos: { x: number; y: number };
  portalPos: { x: number; y: number };
  endPos: { x: number; y: number };
  delay?: number;
  onComplete?: () => void;
}) {
  const [phase, setPhase] = useState<"to-hole" | "in-hole" | "from-portal" | "to-final" | "complete">("to-hole");

  // Phase 1: Suck into black hole (3D vacuum effect)
  useEffect(() => {
    const t1 = setTimeout(() => setPhase("in-hole"), 400 + delay);
    const t2 = setTimeout(() => setPhase("from-portal"), 700 + delay);
    const t3 = setTimeout(() => setPhase("to-final"), 750 + delay);
    const t4 = setTimeout(() => {
      setPhase("complete");
      onComplete?.();
    }, 1100 + delay);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [delay, onComplete]);

  const phase1Props = {
    x: [startPos.x, (startPos.x + blackHolePos.x) / 2, blackHolePos.x],
    y: [startPos.y, startPos.y - 40, blackHolePos.y],
    scale: [1, 0.7, 0.08],
    rotateZ: [0, 240],
    rotateY: [0, 480],
    z: [0, -900],
    opacity: [1, 0.8, 0.1],
  };

  const phase2Props = {
    x: portalPos.x,
    y: portalPos.y,
    scale: 0.06,
    opacity: 0,
    z: -900,
  };

  const phase3Props = {
    x: [portalPos.x, (portalPos.x + endPos.x) / 2, endPos.x],
    y: [portalPos.y, portalPos.y - 32, endPos.y],
    scale: [0.06, 0.85, 1],
    rotateZ: [220, 0],
    rotateY: [420, 0],
    z: [-900, 0],
    opacity: [0, 1, 1],
  };

  const getAnimateProps = () => {
    switch (phase) {
      case "to-hole":
        return phase1Props;
      case "in-hole":
      case "from-portal":
        return phase2Props;
      case "to-final":
        return phase3Props;
      default:
        return { x: endPos.x, y: endPos.y, scale: 1, opacity: 0, z: 0 };
    }
  };

  const getTransition = () => {
    switch (phase) {
      case "to-hole":
        return { duration: 0.4, delay, ease: [0.55, 0, 0.1, 1] as any };
      case "in-hole":
      case "from-portal":
        return { duration: 0.1 };
      case "to-final":
        return { duration: 0.35, ease: [0.22, 1, 0.36, 1] as any };
      default:
        return { duration: 0 };
    }
  };

  if (phase === "complete") return null;

  return (
    <motion.div
      className="fixed pointer-events-none z-40 font-serif text-[15px] leading-7 text-[color:var(--ink)] whitespace-nowrap"
      style={{
        perspective: "1000px",
        transformStyle: "preserve-3d",
      }}
      initial={{
        x: startPos.x,
        y: startPos.y,
        scale: 1,
        opacity: 1,
        rotateZ: 0,
        rotateY: 0,
        z: 0,
      }}
      animate={getAnimateProps()}
      transition={getTransition()}
    >
      <span
        className="inline-block relative"
        style={{
          transform: "translateZ(0)",
          textShadow: "0 0 8px rgba(0,0,0,0.25)",
        }}
      >
        {word}
        {/* trailing glow */}
        <span className="pointer-events-none absolute -inset-1 rounded-full bg-[color:var(--brass-2)]/10 blur-[6px]" />
      </span>
    </motion.div>
  );
}

// Main orchestrator: tracks words and their journey
export function WordVacuum({
  value,
  textareaRef,
  isActive,
}: {
  value: string;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  isActive: boolean;
}) {
  const [wordJourneys, setWordJourneys] = useState<
    Array<{
      id: number;
      word: string;
      startPos: { x: number; y: number };
      blackHolePos: { x: number; y: number };
      portalPos: { x: number; y: number };
      endPos: { x: number; y: number };
      delay: number;
    }>
  >([]);
  const [completedIds, setCompletedIds] = useState<Set<number>>(new Set());
  const prevValueRef = useRef("");
  const wordIdCounter = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Lazily create a shared canvas context for measurement
  const measureText = (text: string, rectWidth: number) => {
    if (!canvasRef.current) {
      canvasRef.current = document.createElement("canvas");
    }
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return 0;
    ctx.font = "15px serif";
    const { width } = ctx.measureText(text || " ");
    return Math.min(width, rectWidth);
  };

  // Calculate word positions in the textarea (approximate for dramatic visual, not precise layout engine)
  const calculateWordPositions = useMemo(() => {
    if (!textareaRef.current || !value) return [];
    const textarea = textareaRef.current;
    const rect = textarea.getBoundingClientRect();
    const tokens = value.split(/(\s+)/);
    const positions: Array<{ word: string; x: number; y: number }> = [];

    let currentX = 8; // padding
    let currentY = 20; // baseline
    const lineHeight = 26;
    const maxWidth = Math.max(120, rect.width - 24); // guard narrow widths

    for (const token of tokens) {
      if (!token) continue;
      const w = measureText(token, maxWidth);
      if (currentX + w > maxWidth && currentX > 8) {
        currentX = 8;
        currentY += lineHeight;
      }
      positions.push({
        word: token,
        x: rect.left + currentX,
        y: rect.top + currentY,
      });
      currentX += w;
    }

    return positions;
  }, [value, textareaRef]);

  // Detect new words and trigger vacuum
  useEffect(() => {
    if (!isActive || !textareaRef.current) return;

    const prevWords = prevValueRef.current.trim().split(/\s+/).filter((w) => w);
    const currentWords = value.trim().split(/\s+/).filter((w) => w);

    // Find newly added words
    if (currentWords.length > prevWords.length) {
      const newWords = currentWords.slice(prevWords.length);
      const textarea = textareaRef.current;
      const rect = textarea.getBoundingClientRect();

      // Black hole position (center of textarea, slightly below)
      const blackHoleX = rect.left + rect.width / 2;
      const blackHoleY = rect.top + rect.height / 2 + 56;

      // Portal position (above textarea, center)
      const portalX = rect.left + rect.width / 2;
      const portalY = rect.top - 72;

      // Approximate cursor area (right side midline)
      const cursorX = rect.left + rect.width - 80;
      const cursorY = rect.top + rect.height / 2;

      const offset = calculateWordPositions.length - newWords.length;
      const newJourneys = newWords.map((word, idx) => {
        const posIndex = offset + idx;
        const wordPos = calculateWordPositions[posIndex];
        return {
          id: wordIdCounter.current++,
          word,
          startPos: { x: cursorX, y: cursorY },
          blackHolePos: { x: blackHoleX, y: blackHoleY },
          portalPos: { x: portalX, y: portalY },
          endPos: wordPos ? { x: wordPos.x, y: wordPos.y } : { x: cursorX, y: cursorY },
          delay: idx * 0.12, // a bit more stagger for drama
        };
      });

      setWordJourneys((prev) => [...prev, ...newJourneys]);
    }

    prevValueRef.current = value;
  }, [value, isActive, textareaRef, calculateWordPositions]);

  const handleWordComplete = (id: number) => {
    setCompletedIds((prev) => new Set([...prev, id]));
    setTimeout(() => {
      setWordJourneys((prev) => prev.filter((j) => j.id !== id));
    }, 200);
  };

  const activeJourneys = wordJourneys.filter((j) => !completedIds.has(j.id));
  const hasActiveHole = activeJourneys.some((j) => j.id === activeJourneys[0]?.id);
  const holePos = activeJourneys[0]?.blackHolePos;
  const hasActivePortal = activeJourneys.some((j) => j.id === activeJourneys[0]?.id);
  const portalPos = activeJourneys[0]?.portalPos;

  return (
    <>
      {/* Black hole */}
      {holePos && hasActiveHole ? <BlackHole x={holePos.x} y={holePos.y} isActive={true} /> : null}

      {/* Portal */}
      {portalPos && hasActivePortal ? <Portal x={portalPos.x} y={portalPos.y} isActive={true} /> : null}

      {/* Words in transit */}
      <AnimatePresence>
        {activeJourneys.map((journey) => (
          <WordInVoid
            key={journey.id}
            word={journey.word}
            startPos={journey.startPos}
            blackHolePos={journey.blackHolePos}
            portalPos={journey.portalPos}
            endPos={journey.endPos}
            delay={journey.delay}
            onComplete={() => handleWordComplete(journey.id)}
          />
        ))}
      </AnimatePresence>
    </>
  );
}


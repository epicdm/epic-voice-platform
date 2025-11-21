"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";

interface VoiceWaveformProps {
  audioLevel: number;
  isSpeaking: boolean;
  isActive: boolean;
  className?: string;
  barCount?: number;
  color?: "user" | "agent";
}

/**
 * VoiceWaveform Component
 * Linear waveform visualizer for voice activity
 */
export function VoiceWaveform({
  audioLevel,
  isSpeaking,
  isActive,
  className = "",
  barCount = 40,
  color = "agent",
}: VoiceWaveformProps) {
  const baseHeight = 20;
  const activeHeight =
    isActive && isSpeaking ? audioLevel * 80 + 20 : baseHeight;

  const gradientColors =
    color === "agent"
      ? "from-primary-600 via-primary-500 to-primary-400"
      : "from-secondary-600 via-secondary-500 to-secondary-400";

  return (
    <div className={`flex items-center justify-center gap-1 ${className}`}>
      {Array.from({ length: barCount }).map((_, i) => {
        const delay = (i / barCount) * 0.3;
        const heightPercent =
          isActive && isSpeaking ? `${activeHeight}%` : `${baseHeight}%`;

        return (
          <motion.div
            key={i}
            className={`w-1 rounded-full bg-gradient-to-t ${gradientColors}`}
            animate={{
              height: [`${baseHeight}%`, heightPercent, `${baseHeight}%`],
            }}
            transition={{
              duration: 1.5,
              ease: "easeInOut",
              repeat: isActive && isSpeaking ? Infinity : 0,
              delay,
            }}
            style={{
              minHeight: "4px",
              maxHeight: "100%",
            }}
          />
        );
      })}
    </div>
  );
}

/**
 * Circular waveform visualizer
 */
interface CircularWaveformProps {
  audioLevel: number;
  isSpeaking: boolean;
  isActive: boolean;
  className?: string;
  size?: number;
  barCount?: number;
  color?: "user" | "agent";
}

export function CircularWaveform({
  audioLevel,
  isSpeaking,
  isActive,
  className = "",
  size = 200,
  barCount = 60,
  color = "agent",
}: CircularWaveformProps) {
  const radius = size / 2 - 20;
  const centerX = size / 2;
  const centerY = size / 2;

  const bars = useMemo(() => {
    return Array.from({ length: barCount }, (_, i) => {
      const angle = (i / barCount) * Math.PI * 2;

      const baseHeight = 8;
      const activeHeight =
        isActive && isSpeaking ? audioLevel * 30 + baseHeight : baseHeight;

      const innerRadius = radius - baseHeight / 2;
      const outerRadius = radius + baseHeight / 2;

      const innerX = centerX + Math.cos(angle) * innerRadius;
      const innerY = centerY + Math.sin(angle) * innerRadius;
      const outerX = centerX + Math.cos(angle) * outerRadius;
      const outerY = centerY + Math.sin(angle) * outerRadius;

      return { innerX, innerY, outerX, outerY, baseHeight, activeHeight, angle };
    });
  }, [audioLevel, isSpeaking, isActive, barCount, radius, centerX, centerY]);

  const strokeColor =
    color === "agent" ? "rgb(99, 102, 241)" : "rgb(34, 211, 238)";
  const glowColor =
    color === "agent" ? "rgba(99, 102, 241, 0.6)" : "rgba(34, 211, 238, 0.6)";

  return (
    <svg
      width={size}
      height={size}
      className={className}
      style={{ filter: `drop-shadow(0 0 20px ${glowColor})` }}
    >
      {/* Background circle */}
      <circle
        cx={centerX}
        cy={centerY}
        r={radius}
        fill="none"
        stroke="rgba(148, 163, 184, 0.1)"
        strokeWidth="2"
      />

      {/* Waveform bars */}
      {bars.map((bar, i) => {
        const heightVariation = isActive && isSpeaking ? audioLevel * 20 : 0;
        const dynamicInnerRadius = radius - (bar.baseHeight + heightVariation) / 2;
        const dynamicOuterRadius = radius + (bar.baseHeight + heightVariation) / 2;

        const dynamicInnerX = centerX + Math.cos(bar.angle) * dynamicInnerRadius;
        const dynamicInnerY = centerY + Math.sin(bar.angle) * dynamicInnerRadius;
        const dynamicOuterX = centerX + Math.cos(bar.angle) * dynamicOuterRadius;
        const dynamicOuterY = centerY + Math.sin(bar.angle) * dynamicOuterRadius;

        return (
          <motion.line
            key={i}
            x1={bar.innerX}
            y1={bar.innerY}
            x2={bar.outerX}
            y2={bar.outerY}
            stroke={strokeColor}
            strokeWidth="3"
            strokeLinecap="round"
            animate={{
              x1: dynamicInnerX,
              y1: dynamicInnerY,
              x2: dynamicOuterX,
              y2: dynamicOuterY,
              opacity: isActive ? [0.4, 1, 0.4] : 0.3,
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: (i / barCount) * 0.5,
            }}
          />
        );
      })}

      {/* Center indicator */}
      <motion.circle
        cx={centerX}
        cy={centerY}
        r={12}
        fill={strokeColor}
        animate={{
          scale: isActive && isSpeaking ? [1, 1.2, 1] : 1,
          opacity: isActive ? [0.6, 1, 0.6] : 0.4,
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
        }}
      />
    </svg>
  );
}

/**
 * Simple pulse indicator (minimal style)
 */
interface VoicePulseProps {
  audioLevel: number;
  isSpeaking: boolean;
  isActive: boolean;
  className?: string;
  size?: number;
  color?: "user" | "agent";
}

export function VoicePulse({
  audioLevel,
  isSpeaking,
  isActive,
  className = "",
  size = 80,
  color = "agent",
}: VoicePulseProps) {
  const bgColor =
    color === "agent" ? "bg-primary-600" : "bg-secondary-600";
  const ringColor =
    color === "agent" ? "ring-primary-500/30" : "ring-secondary-500/30";

  return (
    <div
      className={`relative ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Outer pulse rings */}
      {isActive && isSpeaking && (
        <>
          <motion.div
            className={`absolute inset-0 rounded-full ${bgColor} opacity-20`}
            animate={{
              scale: [1, 1.5, 1.8],
              opacity: [0.3, 0.1, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeOut",
            }}
          />
          <motion.div
            className={`absolute inset-0 rounded-full ${bgColor} opacity-20`}
            animate={{
              scale: [1, 1.3, 1.6],
              opacity: [0.4, 0.2, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeOut",
              delay: 0.3,
            }}
          />
        </>
      )}

      {/* Main circle */}
      <motion.div
        className={`absolute inset-0 rounded-full ${bgColor} ring-4 ${ringColor}`}
        animate={{
          scale: isActive && isSpeaking ? 1 + audioLevel * 0.3 : 1,
        }}
        transition={{
          duration: 0.15,
          ease: "easeOut",
        }}
      />

      {/* Inner glow */}
      <motion.div
        className={`absolute inset-2 rounded-full ${bgColor} opacity-60 blur-md`}
        animate={{
          opacity: isActive && isSpeaking ? [0.6, 1, 0.6] : 0.3,
        }}
        transition={{
          duration: 1,
          repeat: Infinity,
        }}
      />
    </div>
  );
}

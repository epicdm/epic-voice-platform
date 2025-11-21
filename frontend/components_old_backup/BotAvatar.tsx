'use client'

import { motion } from 'framer-motion'
import { Bot, Mic, MicOff, Volume2 } from 'lucide-react'

interface BotAvatarProps {
  isSpeaking: boolean
  isListening: boolean
  isConnected: boolean
  audioLevel?: number
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'default' | 'minimal' | 'detailed'
}

const sizeClasses = {
  sm: 'w-16 h-16',
  md: 'w-24 h-24',
  lg: 'w-32 h-32',
  xl: 'w-48 h-48',
}

const iconSizes = {
  sm: 'h-8 w-8',
  md: 'h-12 w-12',
  lg: 'h-16 w-16',
  xl: 'h-24 w-24',
}

export default function BotAvatar({
  isSpeaking,
  isListening,
  isConnected,
  audioLevel = 0,
  className = '',
  size = 'lg',
  variant = 'default',
}: BotAvatarProps) {
  if (variant === 'minimal') {
    return (
      <MinimalAvatar
        isSpeaking={isSpeaking}
        isListening={isListening}
        isConnected={isConnected}
        size={size}
        className={className}
      />
    )
  }

  if (variant === 'detailed') {
    return (
      <DetailedAvatar
        isSpeaking={isSpeaking}
        isListening={isListening}
        isConnected={isConnected}
        audioLevel={audioLevel}
        size={size}
        className={className}
      />
    )
  }

  return (
    <DefaultAvatar
      isSpeaking={isSpeaking}
      isListening={isListening}
      isConnected={isConnected}
      audioLevel={audioLevel}
      size={size}
      className={className}
    />
  )
}

/**
 * Default avatar with pulse animations
 */
function DefaultAvatar({
  isSpeaking,
  isListening,
  isConnected,
  audioLevel,
  size,
  className,
}: Omit<BotAvatarProps, 'variant'>) {
  const state = isSpeaking ? 'speaking' : isListening ? 'listening' : 'idle'

  return (
    <div className={`relative ${sizeClasses[size!]} ${className}`}>
      {/* Outer pulse rings */}
      {isConnected && (isSpeaking || isListening) && (
        <>
          <motion.div
            className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-600 to-indigo-500 opacity-20"
            animate={{
              scale: [1, 1.4, 1.6],
              opacity: [0.3, 0.15, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeOut',
            }}
          />
          <motion.div
            className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-600 to-indigo-500 opacity-20"
            animate={{
              scale: [1, 1.3, 1.5],
              opacity: [0.4, 0.2, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeOut',
              delay: 0.5,
            }}
          />
        </>
      )}

      {/* Main avatar circle */}
      <motion.div
        className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-600 to-indigo-500 shadow-2xl ring-4 ring-indigo-500/30"
        animate={{
          scale: isSpeaking ? 1 + (audioLevel || 0) * 0.15 : 1,
          boxShadow: isSpeaking
            ? '0 0 60px rgba(79, 70, 229, 0.8)'
            : isListening
            ? '0 0 40px rgba(79, 70, 229, 0.5)'
            : '0 0 20px rgba(79, 70, 229, 0.3)',
        }}
        transition={{
          duration: 0.2,
          ease: 'easeOut',
        }}
      />

      {/* Inner glow */}
      <motion.div
        className="absolute inset-2 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 opacity-60 blur-xl"
        animate={{
          opacity: isSpeaking ? [0.6, 1, 0.6] : 0.4,
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
        }}
      />

      {/* Icon */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          animate={{
            scale: isSpeaking ? [1, 1.1, 1] : 1,
          }}
          transition={{
            duration: 0.5,
            repeat: isSpeaking ? Infinity : 0,
          }}
        >
          <Bot className={`${iconSizes[size!]} text-white`} />
        </motion.div>
      </div>

      {/* State indicator */}
      <div className="absolute -bottom-2 -right-2">
        <motion.div
          className={`rounded-full p-2 ${
            isSpeaking
              ? 'bg-gradient-to-br from-green-500 to-green-600'
              : isListening
              ? 'bg-gradient-to-br from-cyan-500 to-cyan-600'
              : 'bg-gradient-to-br from-slate-500 to-slate-600'
          } shadow-lg`}
          animate={{
            scale: isSpeaking || isListening ? [1, 1.2, 1] : 1,
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
          }}
        >
          {isSpeaking ? (
            <Volume2 className="h-3 w-3 text-white" />
          ) : isListening ? (
            <Mic className="h-3 w-3 text-white" />
          ) : (
            <MicOff className="h-3 w-3 text-white" />
          )}
        </motion.div>
      </div>

      {/* Connection status dot */}
      {!isConnected && (
        <div className="absolute top-0 right-0">
          <div className="h-3 w-3 rounded-full bg-red-500 ring-2 ring-slate-900" />
        </div>
      )}
    </div>
  )
}

/**
 * Minimal avatar (simple circle with state colors)
 */
function MinimalAvatar({
  isSpeaking,
  isListening,
  isConnected,
  size,
  className,
}: Omit<BotAvatarProps, 'variant' | 'audioLevel'>) {
  return (
    <div className={`relative ${sizeClasses[size!]} ${className}`}>
      <motion.div
        className={`absolute inset-0 rounded-full ${
          isSpeaking
            ? 'bg-gradient-to-br from-indigo-600 to-indigo-500'
            : isListening
            ? 'bg-gradient-to-br from-cyan-600 to-cyan-500'
            : 'bg-gradient-to-br from-slate-700 to-slate-600'
        }`}
        animate={{
          scale: isConnected && (isSpeaking || isListening) ? [1, 1.05, 1] : 1,
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
        }}
      />

      <div className="absolute inset-0 flex items-center justify-center">
        <Bot className={`${iconSizes[size!]} text-white`} />
      </div>
    </div>
  )
}

/**
 * Detailed avatar with multiple layers and effects
 */
function DetailedAvatar({
  isSpeaking,
  isListening,
  isConnected,
  audioLevel,
  size,
  className,
}: Omit<BotAvatarProps, 'variant'>) {
  return (
    <div className={`relative ${sizeClasses[size!]} ${className}`}>
      {/* Background orbiting particles */}
      {isConnected && isSpeaking && (
        <>
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-indigo-400"
              style={{
                top: '50%',
                left: '50%',
              }}
              animate={{
                x: [0, Math.cos((i / 6) * Math.PI * 2) * 60],
                y: [0, Math.sin((i / 6) * Math.PI * 2) * 60],
                opacity: [0, 1, 0],
                scale: [0, 1, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: (i / 6) * 2,
                ease: 'easeOut',
              }}
            />
          ))}
        </>
      )}

      {/* Outer glow ring */}
      <motion.div
        className="absolute inset-0 rounded-full"
        animate={{
          boxShadow: isSpeaking
            ? [
                '0 0 20px rgba(79, 70, 229, 0.4), 0 0 40px rgba(79, 70, 229, 0.3)',
                '0 0 40px rgba(79, 70, 229, 0.6), 0 0 80px rgba(79, 70, 229, 0.4)',
                '0 0 20px rgba(79, 70, 229, 0.4), 0 0 40px rgba(79, 70, 229, 0.3)',
              ]
            : isListening
            ? [
                '0 0 20px rgba(34, 211, 238, 0.4)',
                '0 0 30px rgba(34, 211, 238, 0.5)',
                '0 0 20px rgba(34, 211, 238, 0.4)',
              ]
            : ['0 0 10px rgba(79, 70, 229, 0.2)'],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
        }}
      />

      {/* Main avatar */}
      <motion.div
        className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-600 via-indigo-500 to-purple-600 ring-4 ring-indigo-500/30"
        animate={{
          scale: isSpeaking ? 1 + (audioLevel || 0) * 0.2 : 1,
          rotate: isSpeaking ? [0, 5, -5, 0] : 0,
        }}
        transition={{
          scale: { duration: 0.1 },
          rotate: { duration: 2, repeat: Infinity },
        }}
      />

      {/* Gradient overlay */}
      <motion.div
        className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/10 to-white/20"
        animate={{
          opacity: [0.5, 1, 0.5],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
        }}
      />

      {/* Icon with breathing effect */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          animate={{
            scale: isSpeaking ? [1, 1.15, 1] : isListening ? [1, 1.05, 1] : 1,
            rotate: isSpeaking ? [0, -10, 10, 0] : 0,
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <Bot className={`${iconSizes[size!]} text-white drop-shadow-lg`} />
        </motion.div>
      </div>

      {/* Bottom state bar */}
      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full bg-slate-900/90 px-3 py-1 backdrop-blur-sm">
        <motion.div
          className={`h-2 w-2 rounded-full ${
            isSpeaking ? 'bg-green-500' : isListening ? 'bg-cyan-500' : 'bg-slate-500'
          }`}
          animate={{
            scale: isSpeaking || isListening ? [1, 1.5, 1] : 1,
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
          }}
        />
        <span className="text-xs text-slate-400 font-medium">
          {isSpeaking ? 'Speaking' : isListening ? 'Listening' : 'Idle'}
        </span>
      </div>
    </div>
  )
}

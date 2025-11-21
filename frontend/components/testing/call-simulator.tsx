"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Card, CardBody, CardHeader, Divider, Button } from "@heroui/react";
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX } from "lucide-react";

interface CallSimulatorProps {
  agentId: string;
  agentName: string;
}

interface TranscriptLine {
  speaker: "agent" | "user";
  text: string;
}

// Simulated conversation transcript
const simulatedConversation: Array<TranscriptLine & { timestamp: number }> = [
  {
    speaker: "agent",
    text: "Hello! Thank you for calling. How can I help you today?",
    timestamp: 2000,
  },
  {
    speaker: "user",
    text: "Hi, I need help with my account.",
    timestamp: 5000,
  },
  {
    speaker: "agent",
    text: "Of course! I'd be happy to help you with your account. Could you please provide me with your account number or email address?",
    timestamp: 8000,
  },
  {
    speaker: "user",
    text: "Sure, it's john@example.com",
    timestamp: 11000,
  },
  {
    speaker: "agent",
    text: "Perfect! I've found your account. What specific issue can I help you with today?",
    timestamp: 14000,
  },
  {
    speaker: "user",
    text: "I'm having trouble accessing my dashboard.",
    timestamp: 17000,
  },
  {
    speaker: "agent",
    text: "I understand. Let me check your account permissions. One moment please.",
    timestamp: 20000,
  },
];

/**
 * CallSimulator Component
 * Simulates a phone call with an AI agent for testing purposes
 */
export function CallSimulator({ agentId, agentName }: CallSimulatorProps) {
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [callDuration, setCallDuration] = useState(0);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Handle call duration timer
  useEffect(() => {
    let durationInterval: NodeJS.Timeout;
    if (isCallActive) {
      durationInterval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
      setTranscript([]);
    }
    return () => clearInterval(durationInterval);
  }, [isCallActive]);

  // Simulate conversation when call is active
  useEffect(() => {
    if (!isCallActive) return;

    const timeouts: NodeJS.Timeout[] = [];

    simulatedConversation.forEach((line) => {
      const timeout = setTimeout(() => {
        if (line.speaker === "agent") {
          setIsAgentSpeaking(true);
          setTimeout(() => setIsAgentSpeaking(false), 2000);
        }
        setTranscript((prev) => [
          ...prev,
          { speaker: line.speaker, text: line.text },
        ]);
      }, line.timestamp);
      timeouts.push(timeout);
    });

    return () => {
      timeouts.forEach((timeout) => clearTimeout(timeout));
    };
  }, [isCallActive]);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleStartCall = () => {
    setIsCallActive(true);
  };

  const handleEndCall = () => {
    setIsCallActive(false);
  };

  return (
    <Card className="max-w-3xl mx-auto">
      <CardHeader className="flex flex-col gap-2 pb-0">
        <div className="flex items-center justify-between w-full">
          <div>
            <h3 className="text-lg font-semibold">Call Simulator</h3>
            <p className="text-sm text-gray-500">
              {isCallActive ? `Connected to ${agentName}` : "Test your AI agent"}
            </p>
          </div>
          {isCallActive && (
            <div className="text-right">
              <div className="text-2xl font-mono font-bold">
                {formatDuration(callDuration)}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-green-500 justify-end mt-1">
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                Live
              </div>
            </div>
          )}
        </div>
      </CardHeader>

      <Divider className="my-4" />

      <CardBody className="gap-6">
        {/* Waveform Visualization */}
        <div className="rounded-lg bg-default-100 p-6">
          <div className="flex items-center justify-center gap-1 h-24">
            {[...Array(40)].map((_, i) => {
              const isActive = isCallActive && (isAgentSpeaking || i % 3 === 0);
              const randomHeight = isActive ? Math.random() * 100 : 20;
              return (
                <motion.div
                  key={i}
                  className={`w-1 rounded-full ${
                    isAgentSpeaking
                      ? "bg-gradient-to-t from-primary-600 to-primary-400"
                      : "bg-gradient-to-t from-secondary-600 to-secondary-400"
                  }`}
                  animate={{
                    height: isActive ? `${randomHeight}%` : "20%",
                  }}
                  transition={{
                    duration: 0.2,
                    repeat: isActive ? Infinity : 0,
                    repeatType: "reverse",
                  }}
                />
              );
            })}
          </div>
          <div className="text-center mt-4">
            <p className="text-xs text-gray-500">
              {isAgentSpeaking
                ? "🤖 Agent is speaking..."
                : isCallActive
                ? "👤 Listening..."
                : "Press start to begin call"}
            </p>
          </div>
        </div>

        {/* Transcript */}
        {isCallActive && transcript.length > 0 && (
          <div className="rounded-lg bg-default-100 p-4 max-h-60 overflow-y-auto">
            <h4 className="text-xs font-medium text-gray-500 uppercase mb-3">
              Live Transcript
            </h4>
            <div className="space-y-3">
              {transcript.map((line, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${
                    line.speaker === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 ${
                      line.speaker === "agent"
                        ? "bg-primary-100 dark:bg-primary-900/30 text-primary-900 dark:text-primary-100"
                        : "bg-secondary-100 dark:bg-secondary-900/30 text-secondary-900 dark:text-secondary-100"
                    }`}
                  >
                    <p className="text-xs font-medium mb-1">
                      {line.speaker === "agent" ? "🤖 Agent" : "👤 You"}
                    </p>
                    <p className="text-sm">{line.text}</p>
                  </div>
                </motion.div>
              ))}
              <div ref={transcriptEndRef} />
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          {/* Mute */}
          {isCallActive && (
            <Button
              isIconOnly
              radius="full"
              size="lg"
              color={isMuted ? "danger" : "default"}
              variant="flat"
              onPress={() => setIsMuted(!isMuted)}
              aria-label={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
            </Button>
          )}

          {/* Call Button */}
          {!isCallActive ? (
            <Button
              isIconOnly
              radius="full"
              size="lg"
              className="bg-gradient-to-r from-green-600 to-green-500 text-white shadow-lg hover:scale-110 transition-transform"
              onPress={handleStartCall}
              aria-label="Start call"
            >
              <Phone size={24} />
            </Button>
          ) : (
            <Button
              isIconOnly
              radius="full"
              size="lg"
              className="bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg hover:scale-110 transition-transform"
              onPress={handleEndCall}
              aria-label="End call"
            >
              <PhoneOff size={24} />
            </Button>
          )}

          {/* Speaker */}
          {isCallActive && (
            <Button
              isIconOnly
              radius="full"
              size="lg"
              color={!isSpeakerOn ? "danger" : "default"}
              variant="flat"
              onPress={() => setIsSpeakerOn(!isSpeakerOn)}
              aria-label={isSpeakerOn ? "Mute speaker" : "Unmute speaker"}
            >
              {isSpeakerOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </Button>
          )}
        </div>

        {/* Status Bar */}
        {isCallActive && (
          <div className="pt-4 border-t border-divider flex items-center justify-center gap-6 text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <Mic
                size={14}
                className={isMuted ? "text-danger" : "text-success"}
              />
              <span>{isMuted ? "Muted" : "Mic On"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Volume2
                size={14}
                className={isSpeakerOn ? "text-success" : "text-danger"}
              />
              <span>{isSpeakerOn ? "Speaker On" : "Speaker Off"}</span>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

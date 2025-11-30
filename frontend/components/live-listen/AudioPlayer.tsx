"use client";

import { useRef, useState } from "react";
import { Button } from "@heroui/react";

interface AudioPlayerProps {
  roomName: string;
  audioUrl?: string;
  token?: string;
  serverUrl?: string;
  onDisconnect?: () => void;
}

export function AudioPlayer({ roomName, audioUrl, token, serverUrl, onDisconnect }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="font-semibold mb-3">Audio Player - {roomName}</h3>
      {audioUrl && <audio ref={audioRef} src={audioUrl} />}
      <Button onClick={togglePlay}>
        {isPlaying ? "Pause" : "Play"}
      </Button>
    </div>
  );
}

'use client'

import { useState, useEffect } from 'react'
import { Card, CardBody } from '@heroui/card'
import { Button } from '@heroui/button'
import { Slider } from '@heroui/slider'
import {
  Headphones,
  Volume2,
  VolumeX,
  PhoneOff,
  Radio,
  Mic,
  MicOff
} from 'lucide-react'
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useRemoteParticipants,
  useTracks,
  TrackRefContext
} from '@livekit/components-react'
import { Track, Room } from 'livekit-client'
import '@livekit/components-styles'

interface AudioPlayerProps {
  token: string
  serverUrl: string
  roomName: string
  onDisconnect: () => void
}

function ParticipantAudioTracks() {
  const participants = useRemoteParticipants()
  const audioTracks = useTracks([Track.Source.Microphone], {
    onlySubscribed: true,
  })

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground mb-2">
        Connected to {participants.length} participant{participants.length !== 1 ? 's' : ''}
      </p>
      {audioTracks.map((trackRef) => (
        <div key={trackRef.participant.sid} className="flex items-center gap-2 text-sm">
          <Mic className="h-4 w-4 text-success" />
          <span className="text-foreground">
            {trackRef.participant.identity}
          </span>
        </div>
      ))}
      {audioTracks.length === 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MicOff className="h-4 w-4" />
          <span>No active audio tracks</span>
        </div>
      )}
    </div>
  )
}

export function AudioPlayer({ token, serverUrl, roomName, onDisconnect }: AudioPlayerProps) {
  const [volume, setVolume] = useState(100)
  const [muted, setMuted] = useState(false)
  const [connected, setConnected] = useState(false)

  const handleVolumeChange = (value: number | number[]) => {
    const vol = Array.isArray(value) ? value[0] : value
    setVolume(vol)
    setMuted(vol === 0)
  }

  const toggleMute = () => {
    setMuted(!muted)
  }

  return (
    <Card className="border-success-200 bg-success-50/50 dark:bg-success-900/10">
      <CardBody className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-success-100 dark:bg-success-900/30 flex items-center justify-center">
              <Headphones className="h-6 w-6 text-success" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                {connected ? (
                  <>
                    <Radio className="h-4 w-4 text-success animate-pulse" />
                    Connected to Call
                  </>
                ) : (
                  <>
                    <Radio className="h-4 w-4 text-muted-foreground" />
                    Connecting...
                  </>
                )}
              </h3>
              <p className="text-sm text-muted-foreground font-mono">
                {roomName}
              </p>
            </div>
          </div>

          <Button
            color="danger"
            variant="flat"
            size="sm"
            startContent={<PhoneOff className="h-4 w-4" />}
            onClick={onDisconnect}
          >
            Disconnect
          </Button>
        </div>

        <LiveKitRoom
          token={token}
          serverUrl={serverUrl}
          connect={true}
          audio={true}
          video={false}
          onConnected={() => setConnected(true)}
          onDisconnected={() => {
            setConnected(false)
            onDisconnect()
          }}
          options={{
            publishDefaults: {
              audioPreset: {
                maxBitrate: 0, // Don't publish audio (observer mode)
              },
            },
          }}
        >
          {/* Hidden audio renderer */}
          <RoomAudioRenderer volume={muted ? 0 : volume / 100} />

          {/* Participant list */}
          <ParticipantAudioTracks />

          {/* Volume Controls */}
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center gap-4">
              <Button
                isIconOnly
                variant="flat"
                size="sm"
                onClick={toggleMute}
              >
                {muted ? (
                  <VolumeX className="h-4 w-4 text-danger" />
                ) : (
                  <Volume2 className="h-4 w-4 text-foreground" />
                )}
              </Button>

              <Slider
                label="Volume"
                size="sm"
                step={5}
                minValue={0}
                maxValue={100}
                value={volume}
                onChange={handleVolumeChange}
                className="flex-1"
                classNames={{
                  label: "text-sm text-muted-foreground",
                  value: "text-sm text-foreground",
                }}
              />

              <span className="text-sm font-medium text-foreground min-w-[3rem] text-right">
                {volume}%
              </span>
            </div>
          </div>

          {/* Status Info */}
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-xs text-muted-foreground">
              <strong>Listening Mode:</strong> You are connected as a silent observer.
              Audio from all participants will be streamed to you.
            </p>
          </div>
        </LiveKitRoom>
      </CardBody>
    </Card>
  )
}

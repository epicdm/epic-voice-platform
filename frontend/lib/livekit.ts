'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import {
  Room,
  RoomEvent,
  Track,
  LocalParticipant,
  RemoteParticipant,
  RemoteTrackPublication,
  LocalAudioTrack,
} from 'livekit-client'

export interface LiveKitConfig {
  url: string
  token: string
  room: string
}

export interface UseLiveKitRoomOptions {
  autoConnect?: boolean
  onConnected?: () => void
  onDisconnected?: () => void
  onError?: (error: Error) => void
}

/**
 * Hook for managing LiveKit room connection
 */
export function useLiveKitRoom(options: UseLiveKitRoomOptions = {}) {
  const [room, setRoom] = useState<Room | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [participants, setParticipants] = useState<RemoteParticipant[]>([])

  const roomRef = useRef<Room | null>(null)

  // Fetch LiveKit token from backend
  const fetchToken = async (roomName: string, participantName: string) => {
    const response = await fetch('http://localhost:5001/api/livekit/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        room_name: roomName,
        participant_name: participantName,
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to fetch LiveKit token')
    }

    return await response.json()
  }

  // Connect to LiveKit room
  const connect = useCallback(async (roomName: string, participantName: string) => {
    try {
      setIsConnecting(true)
      setError(null)

      // Fetch token
      const config = await fetchToken(roomName, participantName)

      // Create room instance
      const newRoom = new Room({
        audioCaptureDefaults: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })

      // Set up event listeners
      newRoom.on(RoomEvent.Connected, () => {
        console.log('Connected to LiveKit room')
        setIsConnected(true)
        setIsConnecting(false)
        options.onConnected?.()
      })

      newRoom.on(RoomEvent.Disconnected, () => {
        console.log('Disconnected from LiveKit room')
        setIsConnected(false)
        options.onDisconnected?.()
      })

      newRoom.on(RoomEvent.ParticipantConnected, (participant) => {
        console.log('Participant connected:', participant.identity)
        setParticipants((prev) => [...prev, participant])
      })

      newRoom.on(RoomEvent.ParticipantDisconnected, (participant) => {
        console.log('Participant disconnected:', participant.identity)
        setParticipants((prev) => prev.filter((p) => p.sid !== participant.sid))
      })

      newRoom.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        console.log('Track subscribed:', track.kind, participant.identity)
      })

      // Connect to room
      await newRoom.connect(config.url, config.token)

      roomRef.current = newRoom
      setRoom(newRoom)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to connect to room')
      console.error('Error connecting to LiveKit room:', error)
      setError(error)
      setIsConnecting(false)
      options.onError?.(error)
    }
  }, [options])

  // Disconnect from room
  const disconnect = useCallback(async () => {
    if (roomRef.current) {
      await roomRef.current.disconnect()
      roomRef.current = null
      setRoom(null)
      setIsConnected(false)
      setParticipants([])
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (roomRef.current) {
        roomRef.current.disconnect()
      }
    }
  }, [])

  return {
    room,
    isConnecting,
    isConnected,
    error,
    participants,
    connect,
    disconnect,
  }
}

/**
 * Hook for managing microphone input
 */
export function useMicrophone(room: Room | null) {
  const [isMuted, setIsMuted] = useState(true)
  const [isEnabled, setIsEnabled] = useState(false)
  const [audioTrack, setAudioTrack] = useState<LocalAudioTrack | null>(null)

  // Enable/disable microphone
  const toggleMicrophone = useCallback(async () => {
    if (!room) return

    try {
      if (isEnabled) {
        // Disable microphone
        await room.localParticipant.setMicrophoneEnabled(false)
        setIsEnabled(false)
        setAudioTrack(null)
      } else {
        // Enable microphone
        await room.localParticipant.setMicrophoneEnabled(true)
        setIsEnabled(true)

        // Get audio track
        const tracks = Array.from(room.localParticipant.audioTrackPublications.values())
        const audioPublication = tracks.find((pub) => pub.kind === Track.Kind.Audio)
        if (audioPublication?.track) {
          setAudioTrack(audioPublication.track as LocalAudioTrack)
        }
      }
    } catch (err) {
      console.error('Error toggling microphone:', err)
    }
  }, [room, isEnabled])

  // Mute/unmute microphone
  const toggleMute = useCallback(async () => {
    if (!room || !isEnabled) return

    try {
      const newMutedState = !isMuted
      await room.localParticipant.setMicrophoneEnabled(!newMutedState)
      setIsMuted(newMutedState)
    } catch (err) {
      console.error('Error toggling mute:', err)
    }
  }, [room, isMuted, isEnabled])

  return {
    isMuted,
    isEnabled,
    audioTrack,
    toggleMicrophone,
    toggleMute,
  }
}

/**
 * Hook for analyzing audio levels for visualization
 */
export function useVoiceVisualizer(audioTrack: MediaStreamTrack | null) {
  const [audioLevel, setAudioLevel] = useState(0)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const analyzerRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number>()

  useEffect(() => {
    if (!audioTrack) {
      setAudioLevel(0)
      setIsSpeaking(false)
      return
    }

    try {
      // Create audio context
      const audioContext = new AudioContext()
      const analyzer = audioContext.createAnalyser()
      analyzer.fftSize = 256
      analyzer.smoothingTimeConstant = 0.8

      // Create media stream source
      const stream = new MediaStream([audioTrack])
      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyzer)

      analyzerRef.current = analyzer

      // Analyze audio levels
      const dataArray = new Uint8Array(analyzer.frequencyBinCount)

      const updateAudioLevel = () => {
        if (!analyzerRef.current) return

        analyzer.getByteFrequencyData(dataArray)

        // Calculate average volume
        const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length
        const normalized = Math.min(average / 128, 1) // Normalize to 0-1

        setAudioLevel(normalized)
        setIsSpeaking(normalized > 0.1) // Threshold for speaking detection

        animationFrameRef.current = requestAnimationFrame(updateAudioLevel)
      }

      updateAudioLevel()

      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current)
        }
        audioContext.close()
      }
    } catch (err) {
      console.error('Error setting up audio analyzer:', err)
    }
  }, [audioTrack])

  return { audioLevel, isSpeaking }
}

/**
 * Hook for listening to remote audio tracks
 */
export function useRemoteAudio(room: Room | null) {
  const [remoteAudioTracks, setRemoteAudioTracks] = useState<RemoteTrackPublication[]>([])
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false)

  useEffect(() => {
    if (!room) return

    const updateRemoteTracks = () => {
      const tracks: RemoteTrackPublication[] = []

      room.remoteParticipants.forEach((participant) => {
        participant.audioTrackPublications.forEach((publication) => {
          if (publication.track) {
            tracks.push(publication)
          }
        })
      })

      setRemoteAudioTracks(tracks)
    }

    // Initial update
    updateRemoteTracks()

    // Listen for track events
    room.on(RoomEvent.TrackSubscribed, updateRemoteTracks)
    room.on(RoomEvent.TrackUnsubscribed, updateRemoteTracks)

    return () => {
      room.off(RoomEvent.TrackSubscribed, updateRemoteTracks)
      room.off(RoomEvent.TrackUnsubscribed, updateRemoteTracks)
    }
  }, [room])

  // Monitor agent speaking state
  useEffect(() => {
    const speaking = remoteAudioTracks.some((pub) => pub.track && !pub.isMuted)
    setIsAgentSpeaking(speaking)
  }, [remoteAudioTracks])

  return { remoteAudioTracks, isAgentSpeaking }
}

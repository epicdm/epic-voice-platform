'use client'

import { useState, useEffect } from 'react'
import { Card, CardBody, CardHeader } from '@heroui/card'
import { Chip } from '@heroui/chip'
import { Button } from '@heroui/button'
import { Headphones, Phone, Users, Clock, Radio } from 'lucide-react'
import { api } from '@/lib/api-client'
import { Skeleton } from '@/components/ui/skeleton'
import { AudioPlayer } from '@/components/live-listen/AudioPlayer'

interface ActiveRoom {
  roomName: string
  roomSid: string
  numParticipants: number
  numPublishers: number
  creationTime: number
  phoneNumber?: string
  callerNumber?: string
  activeRecording: boolean
}

interface JoinData {
  token: string
  livekitUrl: string
  roomName: string
}

export default function LiveListenPage() {
  const [rooms, setRooms] = useState<ActiveRoom[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [listeningTo, setListeningTo] = useState<JoinData | null>(null)

  // Auto-refresh every 3 seconds
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        setLoading(true)
        setError(null)

        const data = await api.get<any>('/api/live-listen/rooms')

        console.log('Live Listen rooms loaded:', data)

        // Parse rooms - handle different response structures
        const roomsList = data?.rooms || data?.data?.rooms || []
        setRooms(roomsList)
      } catch (err) {
        console.error('Failed to load active rooms:', err)
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    fetchRooms()

    // Refresh every 3 seconds
    const interval = setInterval(fetchRooms, 3000)

    return () => clearInterval(interval)
  }, [])

  const handleJoinRoom = async (roomName: string) => {
    try {
      const data = await api.post<{
        success: boolean
        token: string
        livekitUrl: string
        roomName: string
      }>(`/api/live-listen/rooms/${encodeURIComponent(roomName)}/join`, {})

      setListeningTo({
        token: data.token,
        livekitUrl: data.livekitUrl,
        roomName: data.roomName
      })
    } catch (err) {
      console.error('Failed to join room:', err)
      alert('Failed to join room: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  const handleDisconnect = () => {
    setListeningTo(null)
  }

  const formatDuration = (creationTime: number): string => {
    const now = Math.floor(Date.now() / 1000)
    const duration = now - creationTime
    const mins = Math.floor(duration / 60)
    const secs = duration % 60
    return `${mins}m ${secs}s`
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card className="border-danger-200 bg-danger-50">
          <CardBody className="p-8 text-center">
            <p className="text-danger-900 font-semibold mb-2">Failed to Load Active Calls</p>
            <p className="text-danger-800 text-sm mb-4">{error.message}</p>
            <Button color="danger" variant="flat" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </CardBody>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Headphones className="h-8 w-8 text-primary" />
            Live Listen - Call Monitoring
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor active calls in real-time
          </p>
        </div>

        <div className="flex items-center gap-2 px-4 py-2 bg-success-50 dark:bg-success-900/20 rounded-lg">
          <Radio className="h-5 w-5 text-success animate-pulse" />
          <span className="font-medium text-success">
            {rooms.length} Active {rooms.length === 1 ? 'Call' : 'Calls'}
          </span>
        </div>
      </div>

      {/* Audio Player - Show when listening */}
      {listeningTo && (
        <div className="mb-6">
          <AudioPlayer
            token={listeningTo.token}
            serverUrl={listeningTo.livekitUrl}
            roomName={listeningTo.roomName}
            onDisconnect={handleDisconnect}
          />
        </div>
      )}

      {/* Active Calls List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : rooms.length === 0 ? (
        <Card>
          <CardBody className="p-12 text-center">
            <Headphones className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-30" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              No Active Calls
            </h3>
            <p className="text-muted-foreground">
              Active calls will appear here when they start.
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-4">
          {rooms.map((room) => (
            <Card key={room.roomSid} className="border-success-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-success-100 dark:bg-success-900/30 flex items-center justify-center">
                      <Phone className="h-6 w-6 text-success" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-foreground">
                        {room.phoneNumber || 'Unknown Number'}
                      </h3>
                      {room.callerNumber && (
                        <p className="text-sm text-muted-foreground">
                          Caller: {room.callerNumber}
                        </p>
                      )}
                    </div>
                    <Chip color="success" variant="dot" size="sm">
                      Live
                    </Chip>
                  </div>

                  <Button
                    color="primary"
                    size="sm"
                    startContent={<Headphones className="h-4 w-4" />}
                    onClick={() => handleJoinRoom(room.roomName)}
                  >
                    Listen
                  </Button>
                </div>
              </CardHeader>
              <CardBody className="p-6 pt-0">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Duration */}
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Duration</p>
                      <p className="font-mono font-semibold text-foreground">
                        {formatDuration(room.creationTime)}
                      </p>
                    </div>
                  </div>

                  {/* Participants */}
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Participants</p>
                      <p className="font-semibold text-foreground">
                        {room.numParticipants}
                      </p>
                    </div>
                  </div>

                  {/* Recording */}
                  <div className="flex items-center gap-2">
                    <Radio className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Recording</p>
                      <p className="font-semibold text-foreground">
                        {room.activeRecording ? 'Yes' : 'No'}
                      </p>
                    </div>
                  </div>

                  {/* Room ID */}
                  <div>
                    <p className="text-xs text-muted-foreground">Room SID</p>
                    <p className="font-mono text-xs text-foreground truncate">
                      {room.roomSid}
                    </p>
                  </div>
                </div>

                {/* Room Name */}
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-1">Room Name</p>
                  <p className="font-mono text-sm text-muted-foreground">
                    {room.roomName}
                  </p>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Info Card - Only show when not listening */}
      {!listeningTo && (
        <Card className="mt-6 border-blue-200 bg-blue-50/50 dark:bg-blue-900/10">
          <CardBody className="p-6">
            <div className="flex items-start gap-3">
              <Headphones className="h-6 w-6 text-blue-600 dark:text-blue-400 mt-1" />
              <div>
                <h4 className="font-semibold text-foreground mb-2">About Live Listen</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Live Listen allows you to monitor active calls in real-time. Click "Listen" on any
                  active call to join as a silent observer and hear the conversation in real-time.
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Features:</strong> Volume control, participant tracking, and instant connection
                  to any active call.
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  )
}

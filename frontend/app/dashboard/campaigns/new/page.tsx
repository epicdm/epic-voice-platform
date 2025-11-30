'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardBody, CardHeader } from '@heroui/card'
import { Button } from '@heroui/button'
import { Input } from '@heroui/input'
import { Textarea } from '@heroui/input'
import { Select, SelectItem } from '@heroui/select'
import { Chip } from '@heroui/chip'
import { Bot, Clock, Phone, Calendar, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react'
import { api } from '@/lib/api-client'

interface Agent {
  id: string
  name: string
  description: string
  voice: string
  isActive: boolean
}

export default function NewCampaignPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [agents, setAgents] = useState<Agent[]>([])

  // Form state
  const [campaignName, setCampaignName] = useState('')
  const [campaignDescription, setCampaignDescription] = useState('')
  const [selectedAgent, setSelectedAgent] = useState('')
  const [maxRetries, setMaxRetries] = useState('3')
  const [retryDelayHours, setRetryDelayHours] = useState('24')
  const [callWindowStart, setCallWindowStart] = useState('09:00')
  const [callWindowEnd, setCallWindowEnd] = useState('17:00')
  const [timezone, setTimezone] = useState('America/New_York')

  useEffect(() => {
    loadAgents()
  }, [])

  const loadAgents = async () => {
    try {
      const response = await api.get('/api/user/agents')
      setAgents(response.agents || [])
    } catch (error) {
      console.error('Failed to load agents:', error)
    }
  }

  const handleCreateCampaign = async () => {
    if (!campaignName.trim()) {
      alert('Please enter a campaign name')
      return
    }

    setIsSubmitting(true)

    try {
      const callConfig = {
        max_retries: parseInt(maxRetries),
        retry_delay_hours: parseInt(retryDelayHours),
        call_window_start: callWindowStart,
        call_window_end: callWindowEnd,
        timezone: timezone
      }

      const response = await api.post('/api/user/campaigns', {
        name: campaignName,
        description: campaignDescription,
        agent_id: selectedAgent || null,
        call_config: callConfig
      })

      if (response.success) {
        router.push(`/dashboard/campaigns/${response.campaign_id}`)
      } else {
        alert('Failed to create campaign: ' + (response.error || 'Unknown error'))
      }
    } catch (error: any) {
      console.error('Campaign creation error:', error)
      alert('Failed to create campaign: ' + (error.response?.data?.error || error.message))
    } finally {
      setIsSubmitting(false)
    }
  }

  const canProceedToStep2 = campaignName.trim().length > 0
  const canProceedToStep3 = selectedAgent !== ''

  const steps = [
    { number: 1, title: 'Campaign Details', icon: Calendar },
    { number: 2, title: 'Select Agent', icon: Bot },
    { number: 3, title: 'Call Configuration', icon: Phone },
    { number: 4, title: 'Review & Create', icon: CheckCircle }
  ]

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Create Campaign</h1>
        <p className="text-muted-foreground mt-2">
          Set up a new outbound calling campaign in 4 easy steps
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const Icon = step.icon
            const isActive = currentStep === step.number
            const isCompleted = currentStep > step.number

            return (
              <div key={step.number} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div
                    className={`
                      w-12 h-12 rounded-full flex items-center justify-center
                      ${isCompleted ? 'bg-success text-white' : ''}
                      ${isActive ? 'bg-primary text-white' : ''}
                      ${!isActive && !isCompleted ? 'bg-muted text-muted-foreground' : ''}
                    `}
                  >
                    {isCompleted ? (
                      <CheckCircle className="h-6 w-6" />
                    ) : (
                      <Icon className="h-6 w-6" />
                    )}
                  </div>
                  <p className={`text-sm mt-2 text-center ${isActive ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>
                    {step.title}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-1 mx-4 ${currentStep > step.number ? 'bg-success' : 'bg-muted'}`} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Step Content */}
      <Card>
        <CardBody className="p-8">
          {/* Step 1: Campaign Details */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Campaign Details</h2>
                <p className="text-muted-foreground">
                  Give your campaign a name and description
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Campaign Name <span className="text-danger">*</span>
                  </label>
                  <Input
                    placeholder="e.g., Q1 2025 Product Launch"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    size="lg"
                    isRequired
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Description (Optional)
                  </label>
                  <Textarea
                    placeholder="Describe the purpose of this campaign..."
                    value={campaignDescription}
                    onChange={(e) => setCampaignDescription(e.target.value)}
                    rows={4}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="flat"
                  onClick={() => router.push('/dashboard/campaigns')}
                >
                  Cancel
                </Button>
                <Button
                  color="primary"
                  onClick={() => setCurrentStep(2)}
                  isDisabled={!canProceedToStep2}
                  endContent={<ArrowRight className="h-4 w-4" />}
                >
                  Next: Select Agent
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Agent Selection */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Select AI Agent</h2>
                <p className="text-muted-foreground">
                  Choose which AI agent will handle the calls
                </p>
              </div>

              <div className="space-y-4">
                {agents.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">
                      No agents found. Create an agent first.
                    </p>
                    <Button
                      color="primary"
                      onClick={() => router.push('/dashboard/agents/new')}
                    >
                      Create Agent
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {agents.map((agent) => (
                      <Card
                        key={agent.id}
                        isPressable
                        isHoverable
                        className={`cursor-pointer ${selectedAgent === agent.id ? 'border-2 border-primary' : ''}`}
                        onClick={() => setSelectedAgent(agent.id)}
                      >
                        <CardBody className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Bot className="h-5 w-5 text-primary" />
                              <h3 className="font-semibold text-foreground">{agent.name}</h3>
                            </div>
                            {selectedAgent === agent.id && (
                              <CheckCircle className="h-5 w-5 text-success" />
                            )}
                          </div>
                          {agent.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {agent.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-3">
                            {agent.voice && (
                              <Chip size="sm" variant="flat">
                                {agent.voice}
                              </Chip>
                            )}
                            {agent.isActive && (
                              <Chip size="sm" color="success" variant="flat">
                                Active
                              </Chip>
                            )}
                          </div>
                        </CardBody>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-between gap-3 pt-4">
                <Button
                  variant="flat"
                  startContent={<ArrowLeft className="h-4 w-4" />}
                  onClick={() => setCurrentStep(1)}
                >
                  Back
                </Button>
                <Button
                  color="primary"
                  onClick={() => setCurrentStep(3)}
                  isDisabled={!canProceedToStep3}
                  endContent={<ArrowRight className="h-4 w-4" />}
                >
                  Next: Configure Calls
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Call Configuration */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Call Configuration</h2>
                <p className="text-muted-foreground">
                  Set up retry logic and calling hours
                </p>
              </div>

              <div className="space-y-6">
                {/* Retry Configuration */}
                <div className="bg-muted/50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Retry Logic</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Maximum Retries
                      </label>
                      <Input
                        type="number"
                        min="0"
                        max="10"
                        value={maxRetries}
                        onChange={(e) => setMaxRetries(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Number of times to retry failed calls
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Retry Delay (hours)
                      </label>
                      <Input
                        type="number"
                        min="1"
                        max="168"
                        value={retryDelayHours}
                        onChange={(e) => setRetryDelayHours(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Wait time between retry attempts
                      </p>
                    </div>
                  </div>
                </div>

                {/* Call Window */}
                <div className="bg-muted/50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Calling Hours</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        <Clock className="inline h-4 w-4 mr-1" />
                        Start Time
                      </label>
                      <Input
                        type="time"
                        value={callWindowStart}
                        onChange={(e) => setCallWindowStart(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        <Clock className="inline h-4 w-4 mr-1" />
                        End Time
                      </label>
                      <Input
                        type="time"
                        value={callWindowEnd}
                        onChange={(e) => setCallWindowEnd(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Timezone
                      </label>
                      <Select
                        selectedKeys={[timezone]}
                        onSelectionChange={(keys) => {
                          const selected = Array.from(keys)[0] as string
                          setTimezone(selected)
                        }}
                      >
                        <SelectItem key="America/New_York">
                          Eastern (ET)
                        </SelectItem>
                        <SelectItem key="America/Chicago">
                          Central (CT)
                        </SelectItem>
                        <SelectItem key="America/Denver">
                          Mountain (MT)
                        </SelectItem>
                        <SelectItem key="America/Los_Angeles">
                          Pacific (PT)
                        </SelectItem>
                      </Select>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    Calls will only be made during these hours in the selected timezone
                  </p>
                </div>
              </div>

              <div className="flex justify-between gap-3 pt-4">
                <Button
                  variant="flat"
                  startContent={<ArrowLeft className="h-4 w-4" />}
                  onClick={() => setCurrentStep(2)}
                >
                  Back
                </Button>
                <Button
                  color="primary"
                  onClick={() => setCurrentStep(4)}
                  endContent={<ArrowRight className="h-4 w-4" />}
                >
                  Next: Review
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Review Campaign</h2>
                <p className="text-muted-foreground">
                  Verify your settings before creating the campaign
                </p>
              </div>

              <div className="space-y-4">
                {/* Campaign Details */}
                <div className="bg-muted/50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-3">Campaign Details</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Name:</span>
                      <span className="text-foreground font-medium">{campaignName}</span>
                    </div>
                    {campaignDescription && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Description:</span>
                        <span className="text-foreground max-w-md text-right">{campaignDescription}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Agent */}
                <div className="bg-muted/50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-3">AI Agent</h3>
                  <div className="flex items-center gap-3">
                    <Bot className="h-5 w-5 text-primary" />
                    <span className="text-foreground font-medium">
                      {agents.find(a => a.id === selectedAgent)?.name || 'No agent selected'}
                    </span>
                  </div>
                </div>

                {/* Call Configuration */}
                <div className="bg-muted/50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-3">Call Configuration</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Max Retries</p>
                      <p className="text-foreground font-medium">{maxRetries}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Retry Delay</p>
                      <p className="text-foreground font-medium">{retryDelayHours} hours</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Call Window</p>
                      <p className="text-foreground font-medium">{callWindowStart} - {callWindowEnd}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Timezone</p>
                      <p className="text-foreground font-medium">{timezone.split('/')[1]}</p>
                    </div>
                  </div>
                </div>

                {/* Next Steps Info */}
                <div className="bg-primary/10 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-2">Next Steps</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Upload leads or assign existing leads to this campaign</li>
                    <li>• Schedule the campaign to start calling</li>
                    <li>• Monitor call progress and metrics in real-time</li>
                  </ul>
                </div>
              </div>

              <div className="flex justify-between gap-3 pt-4">
                <Button
                  variant="flat"
                  startContent={<ArrowLeft className="h-4 w-4" />}
                  onClick={() => setCurrentStep(3)}
                >
                  Back
                </Button>
                <Button
                  color="primary"
                  size="lg"
                  onClick={handleCreateCampaign}
                  isLoading={isSubmitting}
                  endContent={<CheckCircle className="h-5 w-5" />}
                >
                  Create Campaign
                </Button>
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}

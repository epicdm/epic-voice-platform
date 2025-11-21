'use client'

import { useState, useEffect } from 'react'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Textarea,
  RadioGroup,
  Radio,
  Checkbox,
  Select,
  SelectItem,
  Card,
  CardHeader,
  CardBody,
  Progress,
  Chip,
  Spinner,
} from '@heroui/react'
import {
  X,
  ChevronRight,
  ChevronLeft,
  Target,
  Phone,
  Globe,
  MessageSquare,
  Mail,
  Smartphone,
  Bot,
  Check,
  Settings as SettingsIcon,
  Zap,
  Calendar,
  Briefcase,
} from 'lucide-react'
import { getIndustryList, getTemplateForIndustry } from '@/lib/funnel-industry-templates'

interface AdvancedFunnelWizardProps {
  isOpen: boolean
  onClose: () => void
  onFunnelCreated?: (funnel: any) => void
}

const STEPS = [
  { id: 1, title: 'Type & Industry', icon: Target },
  { id: 2, title: 'Entry Points', icon: Phone },
  { id: 3, title: 'AI Agent', icon: Bot },
  { id: 4, title: 'Qualification', icon: Zap },
  { id: 5, title: 'Integrations', icon: SettingsIcon },
]

export function AdvancedFunnelWizard({
  isOpen,
  onClose,
  onFunnelCreated,
}: AdvancedFunnelWizardProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [creating, setCreating] = useState(false)
  const [loadingPhoneNumbers, setLoadingPhoneNumbers] = useState(false)
  const [loadingAgents, setLoadingAgents] = useState(false)

  // Available data from API
  const [availablePhoneNumbers, setAvailablePhoneNumbers] = useState<any[]>([])
  const [availableAgents, setAvailableAgents] = useState<any[]>([])

  // Industry templates
  const industries = getIndustryList()

  // Form state
  const [formData, setFormData] = useState({
    // Step 1
    name: '',
    type: 'lead_generation',
    industry: '',
    description: '',

    // Step 2
    entryPoints: [] as string[],
    phoneNumber: '',

    // Step 3
    agentId: '',
    createNewAgent: false,
    newAgentName: '',

    // Step 4
    qualificationQuestions: [] as string[],
    hotLeadThreshold: 70,
    warmLeadThreshold: 40,

    // Step 5
    calendarIntegration: '',
    crmIntegration: '',
    emailNotifications: true,
    smsNotifications: false,
    slackNotifications: false,
  })

  const updateFormData = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  // Fetch available phone numbers when wizard opens or Step 2 is reached
  useEffect(() => {
    if (isOpen && currentStep >= 2 && availablePhoneNumbers.length === 0) {
      fetchAvailablePhoneNumbers()
    }
  }, [isOpen, currentStep])

  // Fetch available agents when Step 3 is reached
  useEffect(() => {
    if (isOpen && currentStep >= 3 && availableAgents.length === 0) {
      fetchAvailableAgents()
    }
  }, [isOpen, currentStep])

  // Update qualification questions when industry changes
  useEffect(() => {
    if (formData.industry) {
      const template = getTemplateForIndustry(formData.industry)
      updateFormData('qualificationQuestions', [])
      updateFormData('hotLeadThreshold', template.hotLeadThreshold)
      updateFormData('warmLeadThreshold', template.warmLeadThreshold)
    }
  }, [formData.industry])

  const fetchAvailablePhoneNumbers = async () => {
    setLoadingPhoneNumbers(true)
    try {
      const response = await fetch('/api/user/phone-numbers')
      if (response.ok) {
        const data = await response.json()
        // Filter for available (unassigned) phone numbers
        const available = data.data?.filter(
          (pn: any) => pn.status === 'available' || !pn.assignedToAgentId
        ) || []
        setAvailablePhoneNumbers(available)
      }
    } catch (error) {
      console.error('Failed to fetch phone numbers:', error)
    } finally {
      setLoadingPhoneNumbers(false)
    }
  }

  const fetchAvailableAgents = async () => {
    setLoadingAgents(true)
    try {
      const response = await fetch('/api/user/agents')
      if (response.ok) {
        const data = await response.json()
        // Filter for deployed agents only
        const deployed = data.data?.filter(
          (agent: any) => agent.status === 'deployed'
        ) || []
        setAvailableAgents(deployed)
      }
    } catch (error) {
      console.error('Failed to fetch agents:', error)
    } finally {
      setLoadingAgents(false)
    }
  }

  const toggleEntryPoint = (point: string) => {
    setFormData((prev) => ({
      ...prev,
      entryPoints: prev.entryPoints.includes(point)
        ? prev.entryPoints.filter((p) => p !== point)
        : [...prev.entryPoints, point],
    }))
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.name.length > 0 && formData.type && formData.industry
      case 2:
        return formData.entryPoints.length > 0 &&
               (!formData.entryPoints.includes('phone') || formData.phoneNumber)
      case 3:
        return formData.agentId || (formData.createNewAgent && formData.newAgentName)
      case 4:
        return formData.qualificationQuestions.length > 0
      case 5:
        return true
      default:
        return false
    }
  }

  const handleNext = () => {
    if (canProceed()) {
      setCurrentStep((prev) => Math.min(prev + 1, 5))
    } else {
      alert('Please fill in all required fields')
    }
  }

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1))
  }

  const handleCreate = async () => {
    setCreating(true)
    try {
      // Call actual API to create funnel
      const response = await fetch('/api/user/funnels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          status: 'active',
          settings: {
            trigger_type: formData.entryPoints[0] || 'manual',
            entry_points: formData.entryPoints,
            phone_number: formData.phoneNumber,
            agent_id: formData.agentId || null,
            funnel_type: formData.type,
            industry: formData.industry,
            qualification: {
              questions: formData.qualificationQuestions,
              hot_threshold: formData.hotLeadThreshold,
              warm_threshold: formData.warmLeadThreshold,
            },
            integrations: {
              calendar: formData.calendarIntegration,
              crm: formData.crmIntegration,
              notifications: {
                email: formData.emailNotifications,
                sms: formData.smsNotifications,
                slack: formData.slackNotifications,
              },
            },
          },
        }),
      })

      if (response.ok) {
        const newFunnel = await response.json()
        onFunnelCreated?.(newFunnel)
        onClose()
      } else {
        throw new Error('Failed to create funnel')
      }
    } catch (error) {
      console.error('Failed to create funnel:', error)
      alert('Failed to create funnel. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <label className="text-sm font-medium mb-2 block">Funnel Name *</label>
        <Input
          value={formData.name}
          onChange={(e) => updateFormData('name', e.target.value)}
          placeholder="e.g., Home Buyer Qualification"
          size="lg"
        />
      </div>

      <div>
        <label className="text-sm font-medium mb-3 block">Industry / Use Case *</label>
        <Select
          placeholder="Select your industry..."
          selectedKeys={formData.industry ? [formData.industry] : []}
          onSelectionChange={(keys) => {
            const value = Array.from(keys)[0] as string
            updateFormData('industry', value)
          }}
          startContent={<Briefcase className="h-4 w-4" />}
          description="Choose your industry to get customized qualification questions"
        >
          {industries.map((industry) => (
            <SelectItem key={industry.id} value={industry.id}>
              <div className="flex items-center gap-2">
                <span>{industry.icon}</span>
                <div>
                  <div className="font-medium">{industry.name}</div>
                  <div className="text-xs text-default-500">{industry.description}</div>
                </div>
              </div>
            </SelectItem>
          ))}
        </Select>
      </div>

      <div>
        <label className="text-sm font-medium mb-3 block">Funnel Goal *</label>
        <RadioGroup value={formData.type} onValueChange={(v) => updateFormData('type', v)}>
          <div className="grid grid-cols-2 gap-4">
            <Card
              isPressable
              className={`cursor-pointer transition-all ${
                formData.type === 'lead_generation' ? 'border-primary bg-primary-50' : ''
              }`}
              onPress={() => updateFormData('type', 'lead_generation')}
            >
              <CardBody className="p-4">
                <Radio value="lead_generation">
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    <span className="font-medium">Lead Generation</span>
                  </div>
                </Radio>
                <p className="text-xs text-default-500 mt-2 ml-6">
                  Capture & qualify new leads
                </p>
              </CardBody>
            </Card>

            <Card
              isPressable
              className={`cursor-pointer transition-all ${
                formData.type === 'appointments' ? 'border-primary bg-primary-50' : ''
              }`}
              onPress={() => updateFormData('type', 'appointments')}
            >
              <CardBody className="p-4">
                <Radio value="appointments">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    <span className="font-medium">Appointments</span>
                  </div>
                </Radio>
                <p className="text-xs text-default-500 mt-2 ml-6">
                  Schedule meetings automatically
                </p>
              </CardBody>
            </Card>

            <Card
              isPressable
              className={`cursor-pointer transition-all ${
                formData.type === 'sales' ? 'border-primary bg-primary-50' : ''
              }`}
              onPress={() => updateFormData('type', 'sales')}
            >
              <CardBody className="p-4">
                <Radio value="sales">
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    <span className="font-medium">Sales</span>
                  </div>
                </Radio>
                <p className="text-xs text-default-500 mt-2 ml-6">Close deals with AI closer</p>
              </CardBody>
            </Card>

            <Card
              isPressable
              className={`cursor-pointer transition-all ${
                formData.type === 'followup' ? 'border-primary bg-primary-50' : ''
              }`}
              onPress={() => updateFormData('type', 'followup')}
            >
              <CardBody className="p-4">
                <Radio value="followup">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    <span className="font-medium">Follow-up</span>
                  </div>
                </Radio>
                <p className="text-xs text-default-500 mt-2 ml-6">Nurture existing leads</p>
              </CardBody>
            </Card>
          </div>
        </RadioGroup>
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Description</label>
        <Textarea
          value={formData.description}
          onChange={(e) => updateFormData('description', e.target.value)}
          placeholder="Describe what this funnel does..."
          minRows={3}
        />
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-medium mb-4">How will leads enter this funnel? *</h3>
        <div className="space-y-4">
          {/* Phone Entry */}
          <Card
            isPressable
            className={`cursor-pointer transition-all ${
              formData.entryPoints.includes('phone') ? 'border-primary bg-primary-50' : ''
            }`}
            onPress={() => toggleEntryPoint('phone')}
          >
            <CardBody className="p-4">
              <div className="flex items-start space-x-3">
                <Checkbox
                  isSelected={formData.entryPoints.includes('phone')}
                  onValueChange={() => toggleEntryPoint('phone')}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Phone className="h-5 w-5" />
                    <label className="text-base cursor-pointer font-medium">
                      Voice Call (Inbound Phone Number)
                    </label>
                  </div>
                  <p className="text-sm text-default-500 mb-3">
                    Assign a phone number for inbound calls
                  </p>
                  {formData.entryPoints.includes('phone') && (
                    <div onClick={(e) => e.stopPropagation()}>
                      {loadingPhoneNumbers ? (
                        <div className="flex items-center gap-2 p-3 bg-default-100 rounded">
                          <Spinner size="sm" />
                          <span className="text-sm">Loading available numbers...</span>
                        </div>
                      ) : availablePhoneNumbers.length > 0 ? (
                        <Select
                          placeholder="Select a phone number..."
                          selectedKeys={formData.phoneNumber ? [formData.phoneNumber] : []}
                          onSelectionChange={(keys) => {
                            const value = Array.from(keys)[0] as string
                            updateFormData('phoneNumber', value)
                          }}
                          startContent={<Phone className="h-4 w-4" />}
                        >
                          {availablePhoneNumbers.map((pn) => (
                            <SelectItem key={pn.phoneNumber} value={pn.phoneNumber}>
                              {pn.phoneNumber} {pn.friendlyName ? `(${pn.friendlyName})` : ''}
                            </SelectItem>
                          ))}
                        </Select>
                      ) : (
                        <div className="p-3 bg-warning-50 border border-warning-200 rounded text-sm text-warning-800">
                          No available phone numbers. Please provision a number first from the Phone
                          Numbers page.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Web Form */}
          <Card
            isPressable
            className={`cursor-pointer transition-all ${
              formData.entryPoints.includes('web_form') ? 'border-primary bg-primary-50' : ''
            }`}
            onPress={() => toggleEntryPoint('web_form')}
          >
            <CardBody className="p-4">
              <div className="flex items-start space-x-3">
                <Checkbox
                  isSelected={formData.entryPoints.includes('web_form')}
                  onValueChange={() => toggleEntryPoint('web_form')}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Globe className="h-5 w-5" />
                    <label className="text-base cursor-pointer font-medium">
                      Web Form (Embeddable Widget)
                    </label>
                  </div>
                  <p className="text-sm text-default-500">Embed a form on your website</p>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Chat Widget */}
          <Card
            isPressable
            className={`cursor-pointer transition-all ${
              formData.entryPoints.includes('chat') ? 'border-primary bg-primary-50' : ''
            }`}
            onPress={() => toggleEntryPoint('chat')}
          >
            <CardBody className="p-4">
              <div className="flex items-start space-x-3">
                <Checkbox
                  isSelected={formData.entryPoints.includes('chat')}
                  onValueChange={() => toggleEntryPoint('chat')}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <MessageSquare className="h-5 w-5" />
                    <label className="text-base cursor-pointer font-medium">
                      Chat Widget (Website)
                    </label>
                  </div>
                  <p className="text-sm text-default-500">Live chat on your website</p>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* SMS/WhatsApp */}
          <Card
            isPressable
            className={`cursor-pointer transition-all ${
              formData.entryPoints.includes('sms') ? 'border-primary bg-primary-50' : ''
            }`}
            onPress={() => toggleEntryPoint('sms')}
          >
            <CardBody className="p-4">
              <div className="flex items-start space-x-3">
                <Checkbox
                  isSelected={formData.entryPoints.includes('sms')}
                  onValueChange={() => toggleEntryPoint('sms')}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Smartphone className="h-5 w-5" />
                    <label className="text-base cursor-pointer font-medium">
                      SMS/WhatsApp (Text-to-Voice)
                    </label>
                  </div>
                  <p className="text-sm text-default-500">Text messages trigger voice calls</p>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Email */}
          <Card
            isPressable
            className={`cursor-pointer transition-all ${
              formData.entryPoints.includes('email') ? 'border-primary bg-primary-50' : ''
            }`}
            onPress={() => toggleEntryPoint('email')}
          >
            <CardBody className="p-4">
              <div className="flex items-start space-x-3">
                <Checkbox
                  isSelected={formData.entryPoints.includes('email')}
                  onValueChange={() => toggleEntryPoint('email')}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Mail className="h-5 w-5" />
                    <label className="text-base cursor-pointer font-medium">
                      Email Response
                    </label>
                  </div>
                  <p className="text-sm text-default-500">Respond to email inquiries</p>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )

  const renderStep3 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-medium mb-4">Choose or create your AI agent *</h3>

        {loadingAgents ? (
          <div className="flex items-center justify-center p-8">
            <Spinner size="lg" />
            <span className="ml-3">Loading agents...</span>
          </div>
        ) : availableAgents.length > 0 ? (
          <div className="mb-6">
            <label className="text-sm font-medium mb-3 block">Existing Agents</label>
            <Select
              placeholder="Select an agent..."
              selectedKeys={formData.agentId ? [formData.agentId] : []}
              onSelectionChange={(keys) => {
                const value = Array.from(keys)[0] as string
                updateFormData('agentId', value)
                if (value) {
                  updateFormData('createNewAgent', false)
                }
              }}
              startContent={<Bot className="h-4 w-4" />}
            >
              {availableAgents.map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4" />
                    <div>
                      <div className="font-medium">{agent.name}</div>
                      <div className="text-xs text-default-500">
                        {agent.llmModel} • {agent.voice || 'Default voice'}
                      </div>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </Select>
          </div>
        ) : (
          <div className="mb-6 p-4 bg-warning-50 border border-warning-200 rounded">
            <p className="text-sm text-warning-800">
              No deployed agents available. Create a new agent below or deploy an existing agent
              first.
            </p>
          </div>
        )}

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-divider" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-content1 px-2 text-default-500">Or</span>
          </div>
        </div>

        <div className="mt-6">
          <div className="flex items-center space-x-2 mb-4">
            <Checkbox
              isSelected={formData.createNewAgent}
              onValueChange={(checked) => {
                updateFormData('createNewAgent', checked)
                if (checked) {
                  updateFormData('agentId', '')
                }
              }}
            >
              <span className="text-sm font-medium">Create New Agent</span>
            </Checkbox>
          </div>

          {formData.createNewAgent && (
            <div className="space-y-4 p-4 border border-divider rounded-lg bg-default-50">
              <div>
                <label className="text-sm font-medium mb-2 block">Agent Name</label>
                <Input
                  value={formData.newAgentName}
                  onChange={(e) => updateFormData('newAgentName', e.target.value)}
                  placeholder="e.g., Lead Qualifier Agent"
                />
              </div>
              <p className="text-sm text-default-500">
                You'll be able to configure voice, model, and instructions after creating the
                funnel
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  const renderStep4 = () => {
    const template = formData.industry ? getTemplateForIndustry(formData.industry) : null
    const questions = template?.qualificationQuestions || []

    return (
      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-medium">Lead Qualification & Routing *</h3>
            {template && (
              <Chip size="sm" color="primary" variant="flat">
                {template.icon} {template.name}
              </Chip>
            )}
          </div>

          <div className="mb-6">
            <label className="text-sm font-medium mb-3 block">
              Qualification Questions
              {template && (
                <span className="text-xs text-default-500 ml-2">
                  (Customized for {template.name})
                </span>
              )}
            </label>
            <div className="grid grid-cols-2 gap-3">
              {questions.map((question) => (
                <Checkbox
                  key={question}
                  isSelected={formData.qualificationQuestions.includes(question)}
                  onValueChange={(checked) => {
                    if (checked) {
                      updateFormData('qualificationQuestions', [
                        ...formData.qualificationQuestions,
                        question,
                      ])
                    } else {
                      updateFormData(
                        'qualificationQuestions',
                        formData.qualificationQuestions.filter((q) => q !== question)
                      )
                    }
                  }}
                >
                  <span className="text-sm">{question}</span>
                </Checkbox>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Hot Lead Threshold: {formData.hotLeadThreshold} points
              </label>
              <input
                type="range"
                min="50"
                max="100"
                step="5"
                value={formData.hotLeadThreshold}
                onChange={(e) => updateFormData('hotLeadThreshold', parseInt(e.target.value))}
                className="w-full h-2 bg-default-200 rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <p className="text-sm text-default-500 mt-1">
                Leads scoring {formData.hotLeadThreshold}+ points will be marked as hot leads
              </p>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Warm Lead Threshold: {formData.warmLeadThreshold} points
              </label>
              <input
                type="range"
                min="20"
                max="70"
                step="5"
                value={formData.warmLeadThreshold}
                onChange={(e) => updateFormData('warmLeadThreshold', parseInt(e.target.value))}
                className="w-full h-2 bg-default-200 rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <p className="text-sm text-default-500 mt-1">
                Leads scoring {formData.warmLeadThreshold}-{formData.hotLeadThreshold} points
                will be marked as warm leads
              </p>
            </div>
          </div>

          <Card className="mt-6">
            <CardHeader>
              <h4 className="text-sm font-semibold">Routing Rules</h4>
            </CardHeader>
            <CardBody className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Hot Leads (≥{formData.hotLeadThreshold} points)</span>
                <Chip color="primary" size="sm">
                  Book appointment immediately
                </Chip>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>
                  Warm Leads ({formData.warmLeadThreshold}-{formData.hotLeadThreshold} points)
                </span>
                <Chip color="secondary" size="sm">
                  Add to nurture sequence
                </Chip>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Cold Leads (&lt;{formData.warmLeadThreshold} points)</span>
                <Chip variant="bordered" size="sm">
                  Long-term follow-up
                </Chip>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    )
  }

  const renderStep5 = () => {
    const template = formData.industry ? getTemplateForIndustry(formData.industry) : null

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-base font-medium mb-4">Connect your tools & automate actions</h3>

          <div className="space-y-6">
            {/* Calendar Integration */}
            <div>
              <label className="text-sm font-medium mb-3 block">
                Calendar Integration
                {template?.recommendedIntegrations.calendar &&
                  template.recommendedIntegrations.calendar.length > 0 && (
                    <span className="text-xs text-default-500 ml-2">(Recommended)</span>
                  )}
              </label>
              <Select
                placeholder="Select calendar..."
                selectedKeys={formData.calendarIntegration ? [formData.calendarIntegration] : []}
                onSelectionChange={(keys) => {
                  const value = Array.from(keys)[0] as string
                  updateFormData('calendarIntegration', value)
                }}
              >
                <SelectItem key="calendly" value="calendly">
                  Calendly
                </SelectItem>
                <SelectItem key="google" value="google">
                  Google Calendar
                </SelectItem>
                <SelectItem key="outlook" value="outlook">
                  Office 365
                </SelectItem>
                <SelectItem key="none" value="none">
                  None
                </SelectItem>
              </Select>
            </div>

            {/* CRM Integration */}
            <div>
              <label className="text-sm font-medium mb-3 block">
                CRM Integration
                {template?.recommendedIntegrations.crm &&
                  template.recommendedIntegrations.crm.length > 0 && (
                    <span className="text-xs text-default-500 ml-2">(Recommended)</span>
                  )}
              </label>
              <Select
                placeholder="Select CRM..."
                selectedKeys={formData.crmIntegration ? [formData.crmIntegration] : []}
                onSelectionChange={(keys) => {
                  const value = Array.from(keys)[0] as string
                  updateFormData('crmIntegration', value)
                }}
              >
                <SelectItem key="salesforce" value="salesforce">
                  Salesforce
                </SelectItem>
                <SelectItem key="hubspot" value="hubspot">
                  HubSpot
                </SelectItem>
                <SelectItem key="pipedrive" value="pipedrive">
                  Pipedrive
                </SelectItem>
                <SelectItem key="followupboss" value="followupboss">
                  Follow Up Boss
                </SelectItem>
                <SelectItem key="none" value="none">
                  None
                </SelectItem>
              </Select>
            </div>

            {/* Notifications */}
            <div>
              <label className="text-sm font-medium mb-3 block">Notifications</label>
              <div className="space-y-3">
                <Checkbox
                  isSelected={formData.emailNotifications}
                  onValueChange={(checked) => updateFormData('emailNotifications', checked)}
                >
                  Email me when hot lead is qualified
                </Checkbox>
                <Checkbox
                  isSelected={formData.smsNotifications}
                  onValueChange={(checked) => updateFormData('smsNotifications', checked)}
                >
                  SMS alert for booked appointments
                </Checkbox>
                <Checkbox
                  isSelected={formData.slackNotifications}
                  onValueChange={(checked) => updateFormData('slackNotifications', checked)}
                >
                  Post to Slack channel
                </Checkbox>
              </div>
            </div>

            {/* Summary Card */}
            <Card className="bg-primary-50 border-primary-200">
              <CardHeader>
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Check className="h-5 w-5 text-primary" />
                  Ready to Launch
                </h4>
              </CardHeader>
              <CardBody>
                <p className="text-sm text-default-700">
                  Your {template?.name || 'funnel'} will be created and activated immediately. You
                  can pause or edit it anytime from the dashboard.
                </p>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  const progress = (currentStep / 5) * 100

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="3xl"
      scrollBehavior="inside"
      classNames={{
        base: 'max-h-[90vh]',
      }}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xl font-semibold">
                  Create Sales Funnel - Step {currentStep}/5
                </span>
                <Button isIconOnly variant="light" onPress={onClose} size="sm">
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm font-normal text-default-500">
                Set up your automated sales funnel with AI-powered lead qualification
              </p>
            </ModalHeader>

            <ModalBody>
              {/* Progress */}
              <div className="mb-6">
                <Progress value={progress} color="primary" className="mb-4" />
                <div className="flex justify-between">
                  {STEPS.map((step) => {
                    const Icon = step.icon
                    const isActive = currentStep === step.id
                    const isCompleted = currentStep > step.id

                    return (
                      <div key={step.id} className="flex flex-col items-center gap-1">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                            isCompleted
                              ? 'bg-success text-white'
                              : isActive
                              ? 'bg-primary text-white'
                              : 'bg-default-200 text-default-400'
                          }`}
                        >
                          {isCompleted ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                        </div>
                        <span
                          className={`text-xs text-center max-w-[80px] ${
                            isActive ? 'text-foreground font-medium' : 'text-default-500'
                          }`}
                        >
                          {step.title}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Content */}
              <div className="py-4">
                {currentStep === 1 && renderStep1()}
                {currentStep === 2 && renderStep2()}
                {currentStep === 3 && renderStep3()}
                {currentStep === 4 && renderStep4()}
                {currentStep === 5 && renderStep5()}
              </div>
            </ModalBody>

            <ModalFooter>
              <Button
                variant="bordered"
                onPress={handleBack}
                isDisabled={currentStep === 1 || creating}
                startContent={<ChevronLeft className="h-4 w-4" />}
              >
                Back
              </Button>

              {currentStep < 5 ? (
                <Button
                  color="primary"
                  onPress={handleNext}
                  isDisabled={!canProceed()}
                  endContent={<ChevronRight className="h-4 w-4" />}
                >
                  Next
                </Button>
              ) : (
                <Button color="primary" onPress={handleCreate} isLoading={creating}>
                  {creating ? 'Creating...' : 'Create Funnel & Go Live!'}
                </Button>
              )}
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  )
}

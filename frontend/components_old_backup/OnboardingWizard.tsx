"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, Check, ArrowRight, Bot, Phone, PhoneCall, Sparkles } from 'lucide-react'
import { useSession } from 'next-auth/react'

interface OnboardingWizardProps {
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
}

type OnboardingStep = 'welcome' | 'create-agent' | 'get-phone' | 'test-call' | 'complete'

export default function OnboardingWizard({ isOpen, onClose, onComplete }: OnboardingWizardProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome')
  const [completedSteps, setCompletedSteps] = useState<Set<OnboardingStep>>(new Set())

  useEffect(() => {
    // Check if user has already completed onboarding steps
    const checkProgress = async () => {
      try {
        // Check if user has agents
        const agentsRes = await fetch('/api/user/agents', { credentials: 'include' })
        if (agentsRes.ok) {
          const agents = await agentsRes.json()
          if (agents.length > 0) {
            setCompletedSteps(prev => new Set(prev).add('create-agent'))
          }
        }

        // Check if user has phone numbers
        const phonesRes = await fetch('/api/user/phone-numbers', { credentials: 'include' })
        if (phonesRes.ok) {
          const phones = await phonesRes.json()
          if (phones?.phone_numbers?.length > 0) {
            setCompletedSteps(prev => new Set(prev).add('get-phone'))
          }
        }

        // Check if user has made calls
        const callsRes = await fetch('/api/user/call-logs', { credentials: 'include' })
        if (callsRes.ok) {
          const calls = await callsRes.json()
          if (calls.length > 0) {
            setCompletedSteps(prev => new Set(prev).add('test-call'))
          }
        }
      } catch (error) {
        console.error('Failed to check onboarding progress:', error)
      }
    }

    if (isOpen) {
      checkProgress()
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSkip = () => {
    onComplete()
    onClose()
  }

  const handleStepAction = (step: OnboardingStep, path: string) => {
    onClose()
    router.push(path)
  }

  const markStepComplete = (step: OnboardingStep) => {
    setCompletedSteps(prev => new Set(prev).add(step))
  }

  const renderWelcome = () => (
    <div className="text-center">
      <div className="mx-auto w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center mb-6">
        <Sparkles className="w-10 h-10 text-white" />
      </div>
      <h2 className="text-3xl font-bold mb-4">Welcome to Epic Voice! 🎉</h2>
      <p className="text-gray-600 text-lg mb-6">
        Let's get you set up in just 3 quick steps
      </p>
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-lg mb-6">
        <p className="text-purple-900 font-semibold mb-2">
          🎁 Your 14-day free trial is active!
        </p>
        <p className="text-purple-700 text-sm">
          No credit card required. Full access to all features.
        </p>
      </div>
      <button
        onClick={() => setCurrentStep('create-agent')}
        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all flex items-center justify-center gap-2"
      >
        Get Started
        <ArrowRight className="w-5 h-5" />
      </button>
      <button
        onClick={handleSkip}
        className="w-full mt-3 text-gray-500 hover:text-gray-700 py-2"
      >
        I'll explore on my own
      </button>
    </div>
  )

  const renderCreateAgent = () => (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
          completedSteps.has('create-agent') 
            ? 'bg-green-100 text-green-600' 
            : 'bg-purple-100 text-purple-600'
        }`}>
          {completedSteps.has('create-agent') ? (
            <Check className="w-6 h-6" />
          ) : (
            <Bot className="w-6 h-6" />
          )}
        </div>
        <div>
          <div className="text-sm text-gray-500">Step 1 of 3</div>
          <h3 className="text-2xl font-bold">Create Your First Agent</h3>
        </div>
      </div>

      {completedSteps.has('create-agent') ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <Check className="w-6 h-6 text-green-600" />
            <span className="font-semibold text-green-900">Agent Created! ✓</span>
          </div>
          <p className="text-green-700 text-sm">
            Great job! You've created your first AI voice agent. Let's connect it to a phone number.
          </p>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <p className="text-gray-700 mb-4">
            AI voice agents are the heart of Epic Voice. They can:
          </p>
          <ul className="space-y-2 text-gray-600 mb-4">
            <li className="flex items-start gap-2">
              <Check className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
              <span>Answer calls 24/7 with human-like conversations</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
              <span>Handle bookings, support, sales, and more</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
              <span>Use custom prompts and voices</span>
            </li>
          </ul>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => handleStepAction('create-agent', '/agents')}
          className="flex-1 bg-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
        >
          {completedSteps.has('create-agent') ? 'View Agents' : 'Create Agent'}
          <ArrowRight className="w-5 h-5" />
        </button>
        <button
          onClick={() => setCurrentStep('get-phone')}
          className="px-6 py-3 text-gray-600 hover:text-gray-800"
        >
          {completedSteps.has('create-agent') ? 'Next' : 'Skip'}
        </button>
      </div>
    </div>
  )

  const renderGetPhone = () => (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
          completedSteps.has('get-phone') 
            ? 'bg-green-100 text-green-600' 
            : 'bg-blue-100 text-blue-600'
        }`}>
          {completedSteps.has('get-phone') ? (
            <Check className="w-6 h-6" />
          ) : (
            <Phone className="w-6 h-6" />
          )}
        </div>
        <div>
          <div className="text-sm text-gray-500">Step 2 of 3</div>
          <h3 className="text-2xl font-bold">Get a Phone Number</h3>
        </div>
      </div>

      {completedSteps.has('get-phone') ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <Check className="w-6 h-6 text-green-600" />
            <span className="font-semibold text-green-900">Phone Number Added! ✓</span>
          </div>
          <p className="text-green-700 text-sm">
            Perfect! Your agent now has a phone number. Time to make a test call!
          </p>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <p className="text-gray-700 mb-4">
            Connect your agent to a phone number to:
          </p>
          <ul className="space-y-2 text-gray-600 mb-4">
            <li className="flex items-start gap-2">
              <Check className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <span>Receive incoming calls from customers</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <span>Make outbound calls</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <span>Choose local or toll-free numbers</span>
            </li>
          </ul>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => handleStepAction('get-phone', '/phone-numbers')}
          className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
        >
          {completedSteps.has('get-phone') ? 'Manage Numbers' : 'Get Phone Number'}
          <ArrowRight className="w-5 h-5" />
        </button>
        <button
          onClick={() => setCurrentStep('test-call')}
          className="px-6 py-3 text-gray-600 hover:text-gray-800"
        >
          {completedSteps.has('get-phone') ? 'Next' : 'Skip'}
        </button>
      </div>
    </div>
  )

  const renderTestCall = () => (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
          completedSteps.has('test-call') 
            ? 'bg-green-100 text-green-600' 
            : 'bg-green-100 text-green-600'
        }`}>
          {completedSteps.has('test-call') ? (
            <Check className="w-6 h-6" />
          ) : (
            <PhoneCall className="w-6 h-6" />
          )}
        </div>
        <div>
          <div className="text-sm text-gray-500">Step 3 of 3</div>
          <h3 className="text-2xl font-bold">Make a Test Call</h3>
        </div>
      </div>

      {completedSteps.has('test-call') ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <Check className="w-6 h-6 text-green-600" />
            <span className="font-semibold text-green-900">Test Call Complete! ✓</span>
          </div>
          <p className="text-green-700 text-sm">
            Amazing! You've experienced your AI agent in action. You're all set!
          </p>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <p className="text-gray-700 mb-4">
            Experience the magic yourself:
          </p>
          <ul className="space-y-2 text-gray-600 mb-4">
            <li className="flex items-start gap-2">
              <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <span>Call your agent's phone number</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <span>Have a natural conversation</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <span>See the call log and transcript</span>
            </li>
          </ul>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => setCurrentStep('complete')}
          className="flex-1 bg-green-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
        >
          {completedSteps.has('test-call') ? 'Finish Setup' : 'I Made a Test Call'}
          <Check className="w-5 h-5" />
        </button>
        <button
          onClick={() => setCurrentStep('complete')}
          className="px-6 py-3 text-gray-600 hover:text-gray-800"
        >
          Skip
        </button>
      </div>
    </div>
  )

  const renderComplete = () => (
    <div className="text-center">
      <div className="mx-auto w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mb-6">
        <Check className="w-10 h-10 text-white" />
      </div>
      <h2 className="text-3xl font-bold mb-4">You're All Set! 🎉</h2>
      <p className="text-gray-600 text-lg mb-6">
        {completedSteps.size === 3 
          ? "You've completed all onboarding steps!"
          : "You can complete the remaining steps anytime from your dashboard."
        }
      </p>
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-lg mb-6">
        <h3 className="font-semibold text-purple-900 mb-3">What's Next?</h3>
        <ul className="text-left text-purple-700 space-y-2 text-sm">
          <li>• Customize your agent's voice and personality</li>
          <li>• Add tools and integrations</li>
          <li>• Monitor calls and analytics</li>
          <li>• Scale with more agents and numbers</li>
        </ul>
      </div>
      <button
        onClick={() => {
          onComplete()
          onClose()
          router.push('/dashboard')
        }}
        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all flex items-center justify-center gap-2"
      >
        Go to Dashboard
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  )

  const renderStepContent = () => {
    switch (currentStep) {
      case 'welcome':
        return renderWelcome()
      case 'create-agent':
        return renderCreateAgent()
      case 'get-phone':
        return renderGetPhone()
      case 'test-call':
        return renderTestCall()
      case 'complete':
        return renderComplete()
      default:
        return renderWelcome()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">👋</span>
            <div>
              <h2 className="font-semibold text-gray-900">Welcome {session?.user?.name?.split(' ')[0] || 'to Epic Voice'}!</h2>
              <p className="text-sm text-gray-500">Quick setup to get you started</p>
            </div>
          </div>
          {currentStep !== 'welcome' && (
            <button
              onClick={handleSkip}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Close"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          )}
        </div>

        {/* Progress Bar */}
        {currentStep !== 'welcome' && currentStep !== 'complete' && (
          <div className="px-6 py-4 bg-gray-50">
            <div className="flex gap-2">
              {['create-agent', 'get-phone', 'test-call'].map((step, idx) => (
                <div
                  key={step}
                  className={`flex-1 h-2 rounded-full transition-all ${
                    completedSteps.has(step as OnboardingStep) || 
                    ['create-agent', 'get-phone', 'test-call'].indexOf(currentStep) > idx
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600'
                      : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-8">
          {renderStepContent()}
        </div>
      </div>
    </div>
  )
}

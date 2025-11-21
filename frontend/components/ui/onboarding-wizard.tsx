"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  Button,
  Progress,
} from "@heroui/react";
import {
  X,
  Check,
  ArrowRight,
  Bot,
  Phone,
  PhoneCall,
  Sparkles,
} from "lucide-react";
import { useSession } from "next-auth/react";

interface OnboardingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

type OnboardingStep =
  | "welcome"
  | "create-agent"
  | "get-phone"
  | "test-call"
  | "complete";

/**
 * OnboardingWizard Component
 * Multi-step wizard to guide new users through initial setup
 */
export function OnboardingWizard({
  isOpen,
  onClose,
  onComplete,
}: OnboardingWizardProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("welcome");
  const [completedSteps, setCompletedSteps] = useState<Set<OnboardingStep>>(
    new Set()
  );

  useEffect(() => {
    const checkProgress = async () => {
      try {
        // Check if user has agents
        const agentsRes = await fetch("/api/user/agents", {
          credentials: "include",
        });
        if (agentsRes.ok) {
          const data = await agentsRes.json();
          if (data?.agents?.length > 0) {
            setCompletedSteps((prev) => new Set(prev).add("create-agent"));
          }
        }

        // Check if user has phone numbers
        const phonesRes = await fetch("/api/user/phone-numbers", {
          credentials: "include",
        });
        if (phonesRes.ok) {
          const data = await phonesRes.json();
          if (data?.phone_numbers?.length > 0) {
            setCompletedSteps((prev) => new Set(prev).add("get-phone"));
          }
        }

        // Check if user has made calls
        const callsRes = await fetch("/api/user/call-logs", {
          credentials: "include",
        });
        if (callsRes.ok) {
          const calls = await callsRes.json();
          if (calls.length > 0) {
            setCompletedSteps((prev) => new Set(prev).add("test-call"));
          }
        }
      } catch (error) {
        console.error("Failed to check onboarding progress:", error);
      }
    };

    if (isOpen) {
      checkProgress();
    }
  }, [isOpen]);

  const handleSkip = () => {
    onComplete();
    onClose();
  };

  const handleStepAction = (step: OnboardingStep, path: string) => {
    onClose();
    router.push(path);
  };

  const renderWelcome = () => (
    <div className="text-center py-8">
      <div className="mx-auto w-20 h-20 bg-gradient-to-br from-primary-500 to-secondary-600 rounded-full flex items-center justify-center mb-6">
        <Sparkles size={40} className="text-white" />
      </div>
      <h2 className="text-3xl font-bold mb-4">Welcome to Epic Voice! 🎉</h2>
      <p className="text-gray-600 text-lg mb-6">
        Let's get you set up in just 3 quick steps
      </p>
      <div className="bg-gradient-to-r from-primary-50 to-secondary-50 dark:from-primary-900/20 dark:to-secondary-900/20 p-6 rounded-lg mb-6">
        <p className="text-primary-900 dark:text-primary-100 font-semibold mb-2">
          🎁 Your 14-day free trial is active!
        </p>
        <p className="text-primary-700 dark:text-primary-300 text-sm">
          No credit card required. Full access to all features.
        </p>
      </div>
      <Button
        color="primary"
        size="lg"
        className="w-full"
        endContent={<ArrowRight size={20} />}
        onPress={() => setCurrentStep("create-agent")}
      >
        Get Started
      </Button>
      <Button
        variant="light"
        className="w-full mt-3"
        onPress={handleSkip}
      >
        I'll explore on my own
      </Button>
    </div>
  );

  const renderCreateAgent = () => {
    const isComplete = completedSteps.has("create-agent");
    return (
      <div className="py-4">
        <div className="flex items-center gap-3 mb-6">
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center ${
              isComplete
                ? "bg-success-100 dark:bg-success-900/30 text-success-600"
                : "bg-primary-100 dark:bg-primary-900/30 text-primary-600"
            }`}
          >
            {isComplete ? <Check size={24} /> : <Bot size={24} />}
          </div>
          <div>
            <div className="text-sm text-gray-500">Step 1 of 3</div>
            <h3 className="text-2xl font-bold">Create Your First Agent</h3>
          </div>
        </div>

        {isComplete ? (
          <div className="bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 rounded-lg p-6 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <Check size={24} className="text-success-600" />
              <span className="font-semibold text-success-900 dark:text-success-100">
                Agent Created! ✓
              </span>
            </div>
            <p className="text-success-700 dark:text-success-300 text-sm">
              Great job! You've created your first AI voice agent. Let's connect
              it to a phone number.
            </p>
          </div>
        ) : (
          <div className="bg-default-100 rounded-lg p-6 mb-6">
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              AI voice agents are the heart of Epic Voice. They can:
            </p>
            <ul className="space-y-2 text-gray-600 dark:text-gray-400 mb-4">
              <li className="flex items-start gap-2">
                <Check size={20} className="text-primary-600 mt-0.5 flex-shrink-0" />
                <span>Answer calls 24/7 with human-like conversations</span>
              </li>
              <li className="flex items-start gap-2">
                <Check size={20} className="text-primary-600 mt-0.5 flex-shrink-0" />
                <span>Handle bookings, support, sales, and more</span>
              </li>
              <li className="flex items-start gap-2">
                <Check size={20} className="text-primary-600 mt-0.5 flex-shrink-0" />
                <span>Use custom prompts and voices</span>
              </li>
            </ul>
          </div>
        )}

        <div className="flex gap-3">
          <Button
            color="primary"
            className="flex-1"
            endContent={<ArrowRight size={20} />}
            onPress={() => handleStepAction("create-agent", "/dashboard/agents")}
          >
            {isComplete ? "View Agents" : "Create Agent"}
          </Button>
          <Button
            variant="light"
            onPress={() => setCurrentStep("get-phone")}
          >
            {isComplete ? "Next" : "Skip"}
          </Button>
        </div>
      </div>
    );
  };

  const renderGetPhone = () => {
    const isComplete = completedSteps.has("get-phone");
    return (
      <div className="py-4">
        <div className="flex items-center gap-3 mb-6">
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center ${
              isComplete
                ? "bg-success-100 dark:bg-success-900/30 text-success-600"
                : "bg-secondary-100 dark:bg-secondary-900/30 text-secondary-600"
            }`}
          >
            {isComplete ? <Check size={24} /> : <Phone size={24} />}
          </div>
          <div>
            <div className="text-sm text-gray-500">Step 2 of 3</div>
            <h3 className="text-2xl font-bold">Get a Phone Number</h3>
          </div>
        </div>

        {isComplete ? (
          <div className="bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 rounded-lg p-6 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <Check size={24} className="text-success-600" />
              <span className="font-semibold text-success-900 dark:text-success-100">
                Phone Number Added! ✓
              </span>
            </div>
            <p className="text-success-700 dark:text-success-300 text-sm">
              Perfect! Your agent now has a phone number. Time to make a test call!
            </p>
          </div>
        ) : (
          <div className="bg-default-100 rounded-lg p-6 mb-6">
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Connect your agent to a phone number to:
            </p>
            <ul className="space-y-2 text-gray-600 dark:text-gray-400 mb-4">
              <li className="flex items-start gap-2">
                <Check size={20} className="text-secondary-600 mt-0.5 flex-shrink-0" />
                <span>Receive incoming calls from customers</span>
              </li>
              <li className="flex items-start gap-2">
                <Check size={20} className="text-secondary-600 mt-0.5 flex-shrink-0" />
                <span>Make outbound calls</span>
              </li>
              <li className="flex items-start gap-2">
                <Check size={20} className="text-secondary-600 mt-0.5 flex-shrink-0" />
                <span>Choose local or toll-free numbers</span>
              </li>
            </ul>
          </div>
        )}

        <div className="flex gap-3">
          <Button
            color="secondary"
            className="flex-1"
            endContent={<ArrowRight size={20} />}
            onPress={() =>
              handleStepAction("get-phone", "/dashboard/phone-numbers")
            }
          >
            {isComplete ? "Manage Numbers" : "Get Phone Number"}
          </Button>
          <Button
            variant="light"
            onPress={() => setCurrentStep("test-call")}
          >
            {isComplete ? "Next" : "Skip"}
          </Button>
        </div>
      </div>
    );
  };

  const renderTestCall = () => {
    const isComplete = completedSteps.has("test-call");
    return (
      <div className="py-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-success-100 dark:bg-success-900/30 text-success-600">
            {isComplete ? <Check size={24} /> : <PhoneCall size={24} />}
          </div>
          <div>
            <div className="text-sm text-gray-500">Step 3 of 3</div>
            <h3 className="text-2xl font-bold">Make a Test Call</h3>
          </div>
        </div>

        {isComplete ? (
          <div className="bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 rounded-lg p-6 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <Check size={24} className="text-success-600" />
              <span className="font-semibold text-success-900 dark:text-success-100">
                Test Call Complete! ✓
              </span>
            </div>
            <p className="text-success-700 dark:text-success-300 text-sm">
              Amazing! You've experienced your AI agent in action. You're all set!
            </p>
          </div>
        ) : (
          <div className="bg-default-100 rounded-lg p-6 mb-6">
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Experience the magic yourself:
            </p>
            <ul className="space-y-2 text-gray-600 dark:text-gray-400 mb-4">
              <li className="flex items-start gap-2">
                <Check size={20} className="text-success-600 mt-0.5 flex-shrink-0" />
                <span>Call your agent's phone number</span>
              </li>
              <li className="flex items-start gap-2">
                <Check size={20} className="text-success-600 mt-0.5 flex-shrink-0" />
                <span>Have a natural conversation</span>
              </li>
              <li className="flex items-start gap-2">
                <Check size={20} className="text-success-600 mt-0.5 flex-shrink-0" />
                <span>See the call log and transcript</span>
              </li>
            </ul>
          </div>
        )}

        <div className="flex gap-3">
          <Button
            color="success"
            className="flex-1"
            endContent={<Check size={20} />}
            onPress={() => setCurrentStep("complete")}
          >
            {isComplete ? "Finish Setup" : "I Made a Test Call"}
          </Button>
          <Button
            variant="light"
            onPress={() => setCurrentStep("complete")}
          >
            Skip
          </Button>
        </div>
      </div>
    );
  };

  const renderComplete = () => (
    <div className="text-center py-8">
      <div className="mx-auto w-20 h-20 bg-gradient-to-br from-success-500 to-success-600 rounded-full flex items-center justify-center mb-6">
        <Check size={40} className="text-white" />
      </div>
      <h2 className="text-3xl font-bold mb-4">You're All Set! 🎉</h2>
      <p className="text-gray-600 dark:text-gray-400 text-lg mb-6">
        {completedSteps.size === 3
          ? "You've completed all onboarding steps!"
          : "You can complete the remaining steps anytime from your dashboard."}
      </p>
      <div className="bg-gradient-to-r from-primary-50 to-secondary-50 dark:from-primary-900/20 dark:to-secondary-900/20 p-6 rounded-lg mb-6">
        <h3 className="font-semibold text-primary-900 dark:text-primary-100 mb-3">
          What's Next?
        </h3>
        <ul className="text-left text-primary-700 dark:text-primary-300 space-y-2 text-sm">
          <li>• Customize your agent's voice and personality</li>
          <li>• Add tools and integrations</li>
          <li>• Monitor calls and analytics</li>
          <li>• Scale with more agents and numbers</li>
        </ul>
      </div>
      <Button
        color="primary"
        size="lg"
        className="w-full"
        endContent={<ArrowRight size={20} />}
        onPress={() => {
          onComplete();
          onClose();
          router.push("/dashboard");
        }}
      >
        Go to Dashboard
      </Button>
    </div>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case "welcome":
        return renderWelcome();
      case "create-agent":
        return renderCreateAgent();
      case "get-phone":
        return renderGetPhone();
      case "test-call":
        return renderTestCall();
      case "complete":
        return renderComplete();
      default:
        return renderWelcome();
    }
  };

  const progressValue =
    currentStep === "welcome"
      ? 0
      : currentStep === "create-agent"
      ? 33
      : currentStep === "get-phone"
      ? 66
      : 100;

  return (
    <Modal
      isOpen={isOpen}
      onClose={currentStep === "welcome" ? onClose : handleSkip}
      size="2xl"
      scrollBehavior="inside"
      isDismissable={false}
      hideCloseButton={currentStep === "welcome"}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">👋</span>
              <div>
                <h2 className="font-semibold">
                  Welcome {session?.user?.name?.split(" ")[0] || "to Epic Voice"}!
                </h2>
                <p className="text-sm text-gray-500 font-normal">
                  Quick setup to get you started
                </p>
              </div>
            </div>
            {currentStep !== "welcome" && (
              <Button
                isIconOnly
                variant="light"
                size="sm"
                onPress={handleSkip}
                aria-label="Close"
              >
                <X size={20} />
              </Button>
            )}
          </div>

          {/* Progress Bar */}
          {currentStep !== "welcome" && currentStep !== "complete" && (
            <Progress
              value={progressValue}
              color="primary"
              className="mt-4"
              size="sm"
            />
          )}
        </ModalHeader>

        <ModalBody className="pb-6">{renderStepContent()}</ModalBody>
      </ModalContent>
    </Modal>
  );
}

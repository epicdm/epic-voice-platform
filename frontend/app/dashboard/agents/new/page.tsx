"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@heroui/react";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { AgentWizardStep1New } from "@/components/agents/agent-wizard-step1-new";
import { AgentWizardStep2 } from "@/components/agents/agent-wizard-step2";
import { AgentWizardStep3 } from "@/components/agents/agent-wizard-step3";
import { AgentWizardStep4 } from "@/components/agents/agent-wizard-step4";
import { AgentWizardStep5 } from "@/components/agents/agent-wizard-step5";
import { agentCreateSchema, agentWizardDefaults, type AgentCreate } from "@/lib/schemas/agent-schema";
import { api, isApiError } from "@/lib/api-client";
import { Agent } from "@/types/agent";

/**
 * Agent Creation Wizard Page (T023 + T024)
 * Implements 5-step wizard with form state management
 *
 * Features:
 * - Step navigation with progress indicator (FR-UX-008)
 * - Form validation with Zod
 * - API integration with loading states (FR-UX-009)
 * - Success toast and redirect (FR-API-004)
 * - Error handling with retry (FR-UX-006, FR-API-005)
 */
export default function AgentWizardPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const totalSteps = 5;

  // React Hook Form with Zod validation
  const methods = useForm<AgentCreate>({
    resolver: zodResolver(agentCreateSchema),
    defaultValues: agentWizardDefaults,
    mode: "onBlur", // Validate on blur for better UX
  });

  const { handleSubmit, trigger, formState: { errors } } = methods;

  /**
   * Navigate to next step
   * Validates current step before proceeding
   *
   * CRITICAL: Prevents form submission with event.preventDefault()
   */
  const handleNext = async (e?: React.MouseEvent<HTMLButtonElement>) => {
    // CRITICAL: Prevent form submission when clicking Next button
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    let isValid = false;

    // Validate current step fields
    if (currentStep === 1) {
      isValid = await trigger(["name", "description"]);
    } else if (currentStep === 2) {
      isValid = await trigger(["instructions", "llm_model", "voice", "temperature"]);
    } else if (currentStep === 3) {
      isValid = await trigger(["vad_enabled", "turn_detection", "noise_cancellation"]);
    } else if (currentStep === 4) {
      // Step 4 is optional (phone number assignment)
      isValid = true;
    } else if (currentStep === 5) {
      // Step 5 is optional (tools configuration)
      isValid = true;
    }

    console.log('Step validation:', { currentStep, isValid, errors });

    if (isValid && currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else if (!isValid) {
      // Show validation errors via toast
      toast.error("Please fix the errors before continuing", {
        description: "Check the highlighted fields above",
      });
    }
  };

  /**
   * Navigate to previous step
   */
  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  /**
   * T024: Submit agent creation to API
   * Implements FR-API-003, FR-API-004, FR-API-005
   *
   * CRITICAL FIX: Only submit on final step (step 4)
   * This prevents Enter key in inputs from submitting prematurely
   */
  const onSubmit = async (data: AgentCreate) => {
    // Prevent submission if not on final step
    if (currentStep < totalSteps) {
      // User pressed Enter in an input field - navigate instead
      await handleNext();
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Call POST /api/user/agents
      const newAgent = await api.post<Agent>("/api/user/agents", data);

      // Success! Show celebration toast (FR-UX-003, FR-API-004)
      const agentName = newAgent.name || "Your agent";
      const assignedNumbers = newAgent.assigned_phone_numbers || [];
      const phoneNumber = assignedNumbers.length > 0 ? assignedNumbers[0] : newAgent.did_number;

      toast.success("🎉 Agent created successfully!", {
        description: phoneNumber
          ? `${agentName} is now ready to handle calls. Call ${phoneNumber} to test it!`
          : `${agentName} has been created. Assign a phone number to start receiving calls.`,
        duration: 6000,
      });

      // Redirect to agents list (FR-API-004)
      router.push("/dashboard/agents");
    } catch (error) {
      // Handle error (FR-UX-006, FR-API-005)
      const errorMessage = isApiError(error)
        ? error.message
        : "Failed to create agent. Please try again.";

      setSubmitError(errorMessage);

      toast.error("Failed to create agent", {
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Retry submission after error
   */
  const handleRetry = () => {
    setSubmitError(null);
    handleSubmit(onSubmit)();
  };

  /**
   * Render current step component
   */
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <AgentWizardStep1New />;
      case 2:
        return <AgentWizardStep2 />;
      case 3:
        return <AgentWizardStep3 />;
      case 4:
        return <AgentWizardStep4 />;
      case 5:
        return <AgentWizardStep5 />;
      default:
        return null;
    }
  };

  const getStepTitle = (step: number) => {
    switch (step) {
      case 1: return "Select Type";
      case 2: return "Instructions";
      case 3: return "Settings";
      case 4: return "Phone Numbers";
      case 5: return "Tools";
      default: return "";
    }
  };

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Create New Agent</h1>
        <p className="text-gray-600">
          Set up your AI voice agent in just 5 simple steps
        </p>
      </div>

      {/* Visual Progress Indicator with Checkmarks */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Step {currentStep} of {totalSteps}: {getStepTitle(currentStep)}
          </span>
          <span className="text-sm text-gray-500">
            {Math.round((currentStep / totalSteps) * 100)}% Complete
          </span>
        </div>

        {/* Step Indicators */}
        <div className="flex items-center justify-center gap-2">
          {[1, 2, 3, 4, 5].map((step) => (
            <div key={step} className="flex items-center">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 ${
                  step < currentStep
                    ? 'bg-success text-white'
                    : step === currentStep
                    ? 'bg-primary text-white ring-4 ring-primary/20'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`}
              >
                {step < currentStep ? (
                  <CheckCircle2 className="h-6 w-6" />
                ) : (
                  <span className="font-semibold">{step}</span>
                )}
              </div>
              {step < 5 && (
                <div
                  className={`w-16 h-1 mx-1 rounded transition-all duration-300 ${
                    step < currentStep ? 'bg-success' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Labels */}
        <div className="flex justify-between mt-3 text-xs">
          {[1, 2, 3, 4, 5].map((step) => (
            <span
              key={step}
              className={`flex-1 text-center transition-colors ${
                step <= currentStep
                  ? 'text-primary font-medium'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {getStepTitle(step)}
            </span>
          ))}
        </div>
      </div>

      {/* Form */}
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Current Step */}
          <div className="bg-white rounded-lg border p-6 mb-6">
            {renderStep()}
          </div>

          {/* Error Message (FR-UX-006) */}
          {submitError && (
            <div className="mb-6 p-4 bg-danger-50 border border-danger-200 rounded-lg">
              <div className="flex items-start">
                <svg
                  className="h-5 w-5 text-danger-500 mt-0.5 mr-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div className="flex-1">
                  <h3 className="font-semibold text-danger-900">Error Creating Agent</h3>
                  <p className="text-sm text-danger-800 mt-1">{submitError}</p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between">
            <div>
              {currentStep > 1 && (
                <Button
                  variant="bordered"
                  type="button"
                  onClick={handleBack}
                  isDisabled={isSubmitting}
                >
                  Back
                </Button>
              )}
            </div>

            <div className="flex gap-3">
              {submitError && (
                <Button
                  color="warning"
                  variant="bordered"
                  type="button"
                  onClick={handleRetry}
                  isLoading={isSubmitting}
                  isDisabled={isSubmitting}
                >
                  Retry
                </Button>
              )}

              {currentStep < totalSteps ? (
                <Button
                  color="primary"
                  type="button"
                  onClick={handleNext}
                  isDisabled={isSubmitting}
                >
                  Next
                </Button>
              ) : (
                <Button
                  color="primary"
                  type="submit"
                  isLoading={isSubmitting}
                  isDisabled={isSubmitting}
                >
                  {isSubmitting ? "Creating..." : "Create Agent"}
                </Button>
              )}
            </div>
          </div>
        </form>
      </FormProvider>

      {/* Cancel Link */}
      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={() => router.push("/dashboard/agents")}
          className="text-sm text-gray-500 hover:text-gray-700"
          disabled={isSubmitting}
        >
          Cancel and go back
        </button>
      </div>
    </div>
  );
}

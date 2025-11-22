"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Progress, Spinner } from "@heroui/react";
import { toast } from "sonner";
import { AgentWizardStep1 } from "@/components/agents/agent-wizard-step1";
import { AgentWizardStep2 } from "@/components/agents/agent-wizard-step2";
import { AgentWizardStep3 } from "@/components/agents/agent-wizard-step3";
import { AgentWizardStep4 } from "@/components/agents/agent-wizard-step4";
import { AgentWizardStep5 } from "@/components/agents/agent-wizard-step5";
import { agentCreateSchema, agentWizardDefaults } from "@/lib/schemas/agent-schema";
import { api, isApiError } from "@/lib/api-client";
import { Agent, AgentCreate } from "@/types/agent";

/**
 * Agent Edit Page
 * Reuses the same wizard components but pre-populates with existing agent data
 */
export default function AgentEditPage() {
  const router = useRouter();
  const params = useParams();
  const agentId = params.id as string;

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const totalSteps = 5;

  // React Hook Form with Zod validation
  const methods = useForm<AgentCreate>({
    resolver: zodResolver(agentCreateSchema),
    defaultValues: agentWizardDefaults,
    mode: "onBlur",
  });

  const { handleSubmit, trigger, reset, formState: { errors } } = methods;

  /**
   * Load existing agent data
   */
  useEffect(() => {
    const fetchAgent = async () => {
      try {
        setIsLoading(true);
        const agent = await api.get<Agent>(`/api/user/agents/${agentId}`);
        
        // Reset form with agent data
        // Map turn_detection_model to valid schema values
        let turnDetection: "semantic" | "vad_based" = "semantic";
        if (agent.turn_detection_model === "vad_based") {
          turnDetection = "vad_based";
        }
        // "multilingual" and other values default to "semantic"

        // Use realtime_voice if voice is null (for realtime models)
        const voiceValue = agent.voice || agent.realtime_voice || "echo";

        reset({
          name: agent.name,
          description: agent.description || "",
          instructions: agent.instructions,
          llm_model: agent.llm_model || "gpt-4o-mini",
          voice: voiceValue,
          temperature: agent.temperature || 0.7,
          vad_enabled: agent.vad_enabled ?? true,
          turn_detection: turnDetection,
          noise_cancellation: agent.noise_cancellation_enabled ?? true,
          phone_number_ids: (agent as any).phone_number_ids || [],
          tools_config: (agent as any).tools_config || {},
        });
        
        setLoadError(null);
      } catch (error) {
        const errorMessage = isApiError(error)
          ? error.message
          : "Failed to load agent";
        setLoadError(errorMessage);
        toast.error("Failed to load agent", {
          description: errorMessage,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchAgent();
  }, [agentId, reset]);

  /**
   * Navigate to next step
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

    if (isValid && currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else if (!isValid) {
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
   * Jump directly to a specific step
   * Allows free navigation in edit mode since data is already loaded
   */
  const handleJumpToStep = (step: number) => {
    if (step >= 1 && step <= totalSteps && step !== currentStep) {
      setCurrentStep(step);
    }
  };

  /**
   * Submit agent update to API
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
      // Call PUT /api/user/agents/{id}
      const updatedAgent = await api.put<Agent>(`/api/user/agents/${agentId}`, data);

      toast.success("Agent updated successfully!", {
        description: `${updatedAgent.name} has been updated.`,
      });

      router.push("/dashboard/agents");
    } catch (error) {
      const errorMessage = isApiError(error)
        ? error.message
        : "Failed to update agent. Please try again.";

      setSubmitError(errorMessage);

      toast.error("Failed to update agent", {
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
        return <AgentWizardStep1 />;
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

  // Loading state
  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center h-64">
          <Spinner size="lg" color="primary" />
          <p className="mt-4 text-gray-600">Loading agent...</p>
        </div>
      </div>
    );
  }

  // Load error state
  if (loadError) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="bg-danger-50 border border-danger-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-danger-900 mb-2">Failed to Load Agent</h2>
          <p className="text-danger-800 mb-4">{loadError}</p>
          <div className="flex gap-3">
            <Button
              color="primary"
              variant="bordered"
              onPress={() => router.push("/dashboard/agents")}
            >
              Back to Agents
            </Button>
            <Button
              color="primary"
              onPress={() => window.location.reload()}
            >
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary-600 via-purple-600 to-pink-600 dark:from-primary-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
          Edit Agent
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Update your AI voice agent configuration
        </p>
      </div>

      {/* Progress Indicator with Clickable Tabs */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            Step {currentStep} of {totalSteps}
          </span>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {Math.round((currentStep / totalSteps) * 100)}% Complete
          </span>
        </div>
        <Progress
          value={(currentStep / totalSteps) * 100}
          color="primary"
          size="sm"
          className="mb-4"
          aria-label="Agent update progress"
        />
        <div className="grid grid-cols-5 gap-2 text-xs sm:text-sm">
          <button
            type="button"
            onClick={() => handleJumpToStep(1)}
            className={`text-center px-2 py-1 rounded-md transition-all cursor-pointer hover:scale-105 ${
              currentStep === 1
                ? "text-primary-600 dark:text-primary-400 font-bold bg-primary-100 dark:bg-primary-900/30 ring-2 ring-primary-500"
                : currentStep > 1
                ? "text-primary-600 dark:text-primary-400 font-semibold bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100"
                : "text-gray-500 dark:text-gray-400 hover:bg-gray-100"
            }`}
            disabled={isSubmitting}
          >
            Basic Info
          </button>
          <button
            type="button"
            onClick={() => handleJumpToStep(2)}
            className={`text-center px-2 py-1 rounded-md transition-all cursor-pointer hover:scale-105 ${
              currentStep === 2
                ? "text-primary-600 dark:text-primary-400 font-bold bg-primary-100 dark:bg-primary-900/30 ring-2 ring-primary-500"
                : currentStep > 2
                ? "text-primary-600 dark:text-primary-400 font-semibold bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100"
                : "text-gray-500 dark:text-gray-400 hover:bg-gray-100"
            }`}
            disabled={isSubmitting}
          >
            Instructions
          </button>
          <button
            type="button"
            onClick={() => handleJumpToStep(3)}
            className={`text-center px-2 py-1 rounded-md transition-all cursor-pointer hover:scale-105 ${
              currentStep === 3
                ? "text-primary-600 dark:text-primary-400 font-bold bg-primary-100 dark:bg-primary-900/30 ring-2 ring-primary-500"
                : currentStep > 3
                ? "text-primary-600 dark:text-primary-400 font-semibold bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100"
                : "text-gray-500 dark:text-gray-400 hover:bg-gray-100"
            }`}
            disabled={isSubmitting}
          >
            Settings
          </button>
          <button
            type="button"
            onClick={() => handleJumpToStep(4)}
            className={`text-center px-2 py-1 rounded-md transition-all cursor-pointer hover:scale-105 ${
              currentStep === 4
                ? "text-primary-600 dark:text-primary-400 font-bold bg-primary-100 dark:bg-primary-900/30 ring-2 ring-primary-500"
                : currentStep > 4
                ? "text-primary-600 dark:text-primary-400 font-semibold bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100"
                : "text-gray-500 dark:text-gray-400 hover:bg-gray-100"
            }`}
            disabled={isSubmitting}
          >
            Phone Numbers
          </button>
          <button
            type="button"
            onClick={() => handleJumpToStep(5)}
            className={`text-center px-2 py-1 rounded-md transition-all cursor-pointer hover:scale-105 ${
              currentStep === 5
                ? "text-primary-600 dark:text-primary-400 font-bold bg-primary-100 dark:bg-primary-900/30 ring-2 ring-primary-500"
                : currentStep > 5
                ? "text-primary-600 dark:text-primary-400 font-semibold bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100"
                : "text-gray-500 dark:text-gray-400 hover:bg-gray-100"
            }`}
            disabled={isSubmitting}
          >
            Tools
          </button>
        </div>
      </div>

      {/* Form */}
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Current Step */}
          <div className="bg-white rounded-lg border p-6 mb-6">
            {renderStep()}
          </div>

          {/* Error Message */}
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
                  <h3 className="font-semibold text-danger-900">Error Updating Agent</h3>
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
                  {isSubmitting ? "Updating..." : "Update Agent"}
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

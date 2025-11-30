"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Button,
  Input,
  Textarea,
  Select,
  SelectItem,
  Card,
  CardBody,
} from "@heroui/react";
import {
  ArrowLeft,
  Save,
  Play,
  Pause,
  Settings,
  Circle,
  Copy,
  ExternalLink,
  Eye,
  Palette,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { getFunnel, updateFunnel } from "@/lib/api/funnels";
import {
  Funnel,
  FunnelStatus,
  getFunnelStatusLabel,
} from "@/types/funnel";
import FunnelEditor from "@/components/funnels/FunnelEditor";

/**
 * Funnel Visual Editor
 */
function FunnelEditorContent() {
  const router = useRouter();
  const params = useParams();
  const funnelId = params.id as string;

  const [funnel, setFunnel] = useState<Funnel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<FunnelStatus>(FunnelStatus.DRAFT);
  const [triggerType, setTriggerType] = useState("manual");
  const [landingPageConfig, setLandingPageConfig] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);

  /**
   * Load funnel data
   */
  const loadFunnel = async () => {
    try {
      setIsLoading(true);
      const data = await getFunnel(funnelId);
      setFunnel(data);
      setName(data.name);
      setDescription(data.description || "");
      setStatus(data.status);
      setTriggerType((data as any).settings?.trigger_type || "manual");
      setLandingPageConfig((data as any).settings?.landing_page || null);
    } catch (err) {
      console.error("Failed to load funnel:", err);
      setError(new Error("Failed to load funnel"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFunnel();
  }, [funnelId]);

  /**
   * Handle funnel updated (called by FunnelEditor when nodes/edges change)
   */
  const handleFunnelUpdated = async () => {
    // Reload funnel data to get latest nodes/edges
    await loadFunnel();
  };

  /**
   * Save funnel settings
   */
  const handleSave = async () => {
    if (!funnel) return;

    setIsSaving(true);

    try {
      const settings: any = {
        ...((funnel as any).settings || {}),
        trigger_type: triggerType as any,
      };

      // Add landing page config if it exists
      if (landingPageConfig) {
        settings.landing_page = landingPageConfig;
      }

      await updateFunnel(funnel.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        status,
        settings,
      });

      setIsDirty(false);
      alert("Funnel saved successfully!");
    } catch (err) {
      console.error("Failed to save funnel:", err);
      alert("Failed to save funnel. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Toggle funnel status
   */
  const handleToggleStatus = async () => {
    if (!funnel) return;

    const newStatus =
      status === FunnelStatus.ACTIVE
        ? FunnelStatus.PAUSED
        : FunnelStatus.ACTIVE;

    try {
      await updateFunnel(funnel.id, { status: newStatus });
      setStatus(newStatus);
      alert(
        `Funnel ${
          newStatus === FunnelStatus.ACTIVE ? "activated" : "paused"
        }!`
      );
    } catch (err) {
      console.error("Failed to toggle status:", err);
      alert("Failed to update status. Please try again.");
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col h-screen">
        <div className="p-6 border-b border-border">
          <Skeleton className="w-48 h-8 mb-2" />
          <Skeleton className="w-96 h-4" />
        </div>
        <div className="flex-1 p-6">
          <Skeleton className="w-full h-full" />
        </div>
      </div>
    );
  }

  // Error state
  if (error || !funnel) {
    return (
      <div className="flex flex-col h-screen">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Edit Funnel</h1>
            <p className="text-sm text-gray-600">Funnel not found</p>
          </div>
          <Button
            variant="flat"
            startContent={<ArrowLeft className="h-4 w-4" />}
            onPress={() => router.push("/dashboard/funnels")}
          >
            Back to Funnels
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <p className="text-danger-600 mb-4">
              {error?.message || "Funnel not found"}
            </p>
            <Button
              color="primary"
              onPress={() => router.push("/dashboard/funnels")}
            >
              Go to Funnels
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Page Header */}
      <div className="p-6 border-b border-border flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{funnel.name}</h1>
          <p className="text-sm text-gray-600">{getFunnelStatusLabel(funnel.status)}</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="flat"
            startContent={<ArrowLeft className="h-4 w-4" />}
            onPress={() => router.push("/dashboard/funnels")}
          >
            Back
          </Button>

          {(status === FunnelStatus.ACTIVE ||
            status === FunnelStatus.PAUSED) && (
            <Button
              variant="flat"
              color={
                status === FunnelStatus.ACTIVE ? "warning" : "success"
              }
              startContent={
                status === FunnelStatus.ACTIVE ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )
              }
              onPress={handleToggleStatus}
            >
              {status === FunnelStatus.ACTIVE ? "Pause" : "Activate"}
            </Button>
          )}

          <Button
            color="primary"
            startContent={
              <>
                <Save className="h-4 w-4" />
                {isDirty && (
                  <Circle className="h-2 w-2 fill-current ml-1" />
                )}
              </>
            }
            onPress={handleSave}
            isLoading={isSaving}
          >
            Save Changes
          </Button>
        </div>
      </div>

      {/* Settings Section */}
      <div className="p-6 border-b border-border bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <Card>
            <CardBody className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Settings className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Basic Settings</h2>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Input
                  label="Funnel Name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setIsDirty(true);
                  }}
                  isRequired
                />

                <Select
                  label="Trigger Type"
                  selectedKeys={[triggerType]}
                  onChange={(e) => {
                    setTriggerType(e.target.value);
                    setIsDirty(true);
                  }}
                >
                  <SelectItem key="manual">
                    Manual
                  </SelectItem>
                  <SelectItem key="lead_created">
                    Lead Created
                  </SelectItem>
                  <SelectItem key="landing_page">
                    Landing Page
                  </SelectItem>
                  <SelectItem key="campaign">
                    Campaign
                  </SelectItem>
                  <SelectItem key="webhook">
                    Webhook
                  </SelectItem>
                </Select>

                <Select
                  label="Status"
                  selectedKeys={[status]}
                  onChange={(e) => {
                    setStatus(e.target.value as FunnelStatus);
                    setIsDirty(true);
                  }}
                >
                  <SelectItem key={FunnelStatus.DRAFT}>
                    Draft
                  </SelectItem>
                  <SelectItem key={FunnelStatus.ACTIVE}>
                    Active
                  </SelectItem>
                  <SelectItem key={FunnelStatus.PAUSED}>
                    Paused
                  </SelectItem>
                  <SelectItem key={FunnelStatus.ARCHIVED}>
                    Archived
                  </SelectItem>
                </Select>
              </div>

              <Textarea
                label="Description"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setIsDirty(true);
                }}
                minRows={2}
              />
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Landing Page Configuration Section */}
      {(triggerType === "landing_page" || triggerType === "lead_created") && (
        <div className="p-6 border-b border-border bg-muted/30">
          <div className="max-w-6xl mx-auto">
            <Card className="border-2 border-blue-200">
              <CardBody className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ExternalLink className="h-5 w-5 text-blue-600" />
                    <h2 className="text-lg font-semibold">Landing Page Configuration</h2>
                  </div>
                  {landingPageConfig?.enabled && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="flat"
                        startContent={<Eye className="h-4 w-4" />}
                        onPress={() => setShowPreview(!showPreview)}
                      >
                        {showPreview ? "Hide Preview" : "Show Preview"}
                      </Button>
                      <Button
                        size="sm"
                        color="primary"
                        variant="flat"
                        startContent={<ExternalLink className="h-4 w-4" />}
                        onPress={() => window.open(`https://ai.epic.dm/l/${funnel.id}`, "_blank")}
                      >
                        Open Live Page
                      </Button>
                    </div>
                  )}
                </div>

                {landingPageConfig?.enabled ? (
                  <>
                    {/* Public URL Display */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200">
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                        Public Landing Page URL
                      </p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-sm font-mono bg-white dark:bg-gray-800 px-3 py-2 rounded border">
                          {`https://ai.epic.dm/l/${funnel.id}`}
                        </code>
                        <Button
                          size="sm"
                          color="primary"
                          startContent={<Copy className="h-4 w-4" />}
                          onPress={() => {
                            navigator.clipboard.writeText(`https://ai.epic.dm/l/${funnel.id}`);
                            alert("URL copied to clipboard!");
                          }}
                        >
                          Copy
                        </Button>
                      </div>
                    </div>

                    {/* Edit Form */}
                    <div className="grid grid-cols-1 gap-4">
                      <Input
                        label="Headline"
                        value={landingPageConfig.headline || ""}
                        onChange={(e) => {
                          setLandingPageConfig({ ...landingPageConfig, headline: e.target.value });
                          setIsDirty(true);
                        }}
                        placeholder="Get Your Free Consultation"
                      />

                      <Input
                        label="Subheadline"
                        value={landingPageConfig.subheadline || ""}
                        onChange={(e) => {
                          setLandingPageConfig({ ...landingPageConfig, subheadline: e.target.value });
                          setIsDirty(true);
                        }}
                        placeholder="Talk to an expert in minutes, not days"
                      />

                      <Textarea
                        label="Description"
                        value={landingPageConfig.description || ""}
                        onChange={(e) => {
                          setLandingPageConfig({ ...landingPageConfig, description: e.target.value });
                          setIsDirty(true);
                        }}
                        placeholder="Our AI assistant will call you within 60 seconds..."
                        minRows={3}
                      />

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Benefits (3 bullet points)</label>
                        {(landingPageConfig.benefits || ["", "", ""]).map((benefit: string, index: number) => (
                          <Input
                            key={index}
                            value={benefit}
                            onChange={(e) => {
                              const newBenefits = [...(landingPageConfig.benefits || ["", "", ""])];
                              newBenefits[index] = e.target.value;
                              setLandingPageConfig({ ...landingPageConfig, benefits: newBenefits });
                              setIsDirty(true);
                            }}
                            placeholder={`Benefit ${index + 1}`}
                            startContent={<span className="text-green-600">✓</span>}
                          />
                        ))}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <Input
                          label="CTA Button Text"
                          value={landingPageConfig.cta_text || ""}
                          onChange={(e) => {
                            setLandingPageConfig({ ...landingPageConfig, cta_text: e.target.value });
                            setIsDirty(true);
                          }}
                          placeholder="Get My Free Call"
                        />

                        <Input
                          label="Success Message"
                          value={landingPageConfig.success_message || ""}
                          onChange={(e) => {
                            setLandingPageConfig({ ...landingPageConfig, success_message: e.target.value });
                            setIsDirty(true);
                          }}
                          placeholder="We'll call you in 60 seconds!"
                        />
                      </div>

                      {/* Theme Colors */}
                      <Card className="border border-gray-200">
                        <CardBody className="space-y-3 p-4">
                          <div className="flex items-center gap-2">
                            <Palette className="h-4 w-4 text-gray-600" />
                            <span className="font-semibold text-sm">Theme</span>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-xs text-gray-600 mb-1 block">Primary Color</label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="color"
                                  value={landingPageConfig.theme?.primary_color || "#0066FF"}
                                  onChange={(e) => {
                                    setLandingPageConfig({
                                      ...landingPageConfig,
                                      theme: { ...landingPageConfig.theme, primary_color: e.target.value },
                                    });
                                    setIsDirty(true);
                                  }}
                                  className="h-10 w-16 rounded border cursor-pointer"
                                />
                                <Input
                                  value={landingPageConfig.theme?.primary_color || "#0066FF"}
                                  onChange={(e) => {
                                    setLandingPageConfig({
                                      ...landingPageConfig,
                                      theme: { ...landingPageConfig.theme, primary_color: e.target.value },
                                    });
                                    setIsDirty(true);
                                  }}
                                  size="sm"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="text-xs text-gray-600 mb-1 block">Accent Color</label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="color"
                                  value={landingPageConfig.theme?.accent_color || "#10B981"}
                                  onChange={(e) => {
                                    setLandingPageConfig({
                                      ...landingPageConfig,
                                      theme: { ...landingPageConfig.theme, accent_color: e.target.value },
                                    });
                                    setIsDirty(true);
                                  }}
                                  className="h-10 w-16 rounded border cursor-pointer"
                                />
                                <Input
                                  value={landingPageConfig.theme?.accent_color || "#10B981"}
                                  onChange={(e) => {
                                    setLandingPageConfig({
                                      ...landingPageConfig,
                                      theme: { ...landingPageConfig.theme, accent_color: e.target.value },
                                    });
                                    setIsDirty(true);
                                  }}
                                  size="sm"
                                />
                              </div>
                            </div>
                          </div>
                        </CardBody>
                      </Card>
                    </div>

                    {/* Preview */}
                    {showPreview && landingPageConfig && (
                      <Card className="border-2 border-blue-200">
                        <CardBody className="p-0">
                          <div className="bg-gray-100 dark:bg-gray-800 p-3 border-b flex items-center justify-between">
                            <span className="text-sm font-medium">Landing Page Preview</span>
                          </div>
                          <div
                            className="p-8"
                            style={{
                              background: `linear-gradient(135deg, ${landingPageConfig.theme?.primary_color || "#0066FF"} 0%, ${landingPageConfig.theme?.accent_color || "#10B981"} 100%)`,
                              minHeight: "400px",
                              color: "white",
                            }}
                          >
                            <div className="max-w-2xl">
                              <h1 className="text-4xl font-bold mb-4">{landingPageConfig.headline}</h1>
                              <p className="text-xl mb-4 opacity-90">{landingPageConfig.subheadline}</p>
                              <p className="text-base mb-6 opacity-85">{landingPageConfig.description}</p>
                              <ul className="space-y-2 mb-6">
                                {(landingPageConfig.benefits || []).map((benefit: string, index: number) => (
                                  <li key={index} className="flex items-start gap-2">
                                    <span className="text-xl">✓</span>
                                    <span>{benefit}</span>
                                  </li>
                                ))}
                              </ul>
                              <button
                                className="px-6 py-3 bg-white rounded-lg font-semibold shadow-lg"
                                style={{ color: landingPageConfig.theme?.primary_color || "#0066FF" }}
                              >
                                {landingPageConfig.cta_text}
                              </button>
                            </div>
                          </div>
                        </CardBody>
                      </Card>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-600 mb-4">
                      No landing page configured for this funnel yet.
                    </p>
                    <p className="text-sm text-gray-500">
                      Landing pages are created during funnel setup using the creation wizard.
                    </p>
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {/* Funnel Editor (Visual Builder) */}
      <div className="flex-1 overflow-hidden p-6">
        <FunnelEditor funnelId={funnel.id} />
      </div>
    </div>
  );
}

/**
 * Funnel Editor Page with Error Boundary
 */
export default function FunnelEditorPage() {
  return (
    <ErrorBoundary>
      <FunnelEditorContent />
    </ErrorBoundary>
  );
}

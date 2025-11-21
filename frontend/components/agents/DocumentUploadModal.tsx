"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Card,
  CardBody,
  Progress,
  Chip,
  Divider,
} from "@heroui/react";
import {
  Upload,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
} from "lucide-react";
import { api, apiClient, isApiError } from "@/lib/api-client";
import { toast } from "sonner";

/**
 * Document Upload Modal
 *
 * Features:
 * - Drag-and-drop file upload
 * - Multi-file support
 * - File type validation (PDF, DOCX, TXT, CSV)
 * - File size limits (10MB per file)
 * - Upload progress tracking
 * - Document list with status
 * - Delete functionality
 */

interface Document {
  id: string;
  filename: string;
  filetype: string;
  filesize: number;
  status: "pending" | "processing" | "completed" | "failed";
  chunkcount: number;
  created_at: string;
}

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  agentId: string;
}

const ACCEPTED_FILE_TYPES = [".pdf", ".docx", ".txt", ".csv"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function DocumentUploadModal({
  isOpen,
  onClose,
  agentId,
}: DocumentUploadModalProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  // Load existing documents when modal opens
  useEffect(() => {
    if (isOpen && agentId) {
      loadDocuments();
    }
  }, [isOpen, agentId]);

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      // apiClient already unwraps the { success, data } response - we get Document[] directly
      const documents = await api.get<Document[]>(
        `/api/user/agents/${agentId}/knowledge-base/documents`
      );
      setDocuments(documents || []);
    } catch (error) {
      console.error("Failed to load documents:", error);
      toast.error("Failed to load documents");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    handleFileSelection(files);
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      handleFileSelection(files);
    }
  };

  const handleFileSelection = async (files: File[]) => {
    // Validate files
    const validFiles: File[] = [];
    for (const file of files) {
      // Check file type
      const fileExt = `.${file.name.split(".").pop()?.toLowerCase()}`;
      if (!ACCEPTED_FILE_TYPES.includes(fileExt)) {
        toast.error(`File type not supported: ${file.name}`, {
          description: `Accepted types: ${ACCEPTED_FILE_TYPES.join(", ")}`,
        });
        continue;
      }

      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`File too large: ${file.name}`, {
          description: `Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
        });
        continue;
      }

      validFiles.push(file);
    }

    // Upload valid files
    if (validFiles.length > 0) {
      await uploadFiles(validFiles);
    }
  };

  const uploadFiles = async (files: File[]) => {
    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);

      try {
        setUploadProgress((prev) => ({ ...prev, [file.name]: 0 }));

        // Upload file (progress tracking simplified for now)
        setUploadProgress((prev) => ({ ...prev, [file.name]: 50 }));

        // Use apiClient directly for FormData uploads (api.post would JSON.stringify the FormData)
        const document = await apiClient<Document>(
          `/api/user/agents/${agentId}/knowledge-base/documents`,
          {
            method: "POST",
            body: formData,
            // Don't set Content-Type - browser will set it automatically with boundary
          }
        );

        // Add to documents list
        setDocuments((prev) => [document, ...prev]);
        setUploadProgress((prev) => {
          const newProgress = { ...prev };
          delete newProgress[file.name];
          return newProgress;
        });

        toast.success(`Uploaded: ${file.name}`, {
          description: "Document is being processed",
        });
      } catch (error) {
        const errorMessage = isApiError(error)
          ? error.message
          : "Failed to upload file";

        toast.error(`Upload failed: ${file.name}`, {
          description: errorMessage,
        });

        setUploadProgress((prev) => {
          const newProgress = { ...prev };
          delete newProgress[file.name];
          return newProgress;
        });
      }
    }

    // Reload documents to get updated statuses
    await loadDocuments();
  };

  const handleDeleteDocument = async (documentId: string) => {
    try {
      await api.delete(
        `/api/user/agents/${agentId}/knowledge-base/documents/${documentId}`
      );

      setDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
      toast.success("Document deleted");
    } catch (error) {
      const errorMessage = isApiError(error)
        ? error.message
        : "Failed to delete document";

      toast.error("Delete failed", { description: errorMessage });
    }
  };

  const getStatusIcon = (status: Document["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case "processing":
      case "pending":
        return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
      case "failed":
        return <AlertCircle className="h-4 w-4 text-danger" />;
    }
  };

  const getStatusColor = (status: Document["status"]) => {
    switch (status) {
      case "completed":
        return "success";
      case "processing":
      case "pending":
        return "primary";
      case "failed":
        return "danger";
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="3xl"
      scrollBehavior="inside"
    >
      <ModalContent>
        <ModalHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Knowledge Base Documents
          </div>
        </ModalHeader>

        <ModalBody>
          {/* Upload Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging
                ? "border-primary bg-primary/5"
                : "border-gray-300 dark:border-gray-700 hover:border-primary"
            }`}
          >
            <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium mb-2">
              Drop files here or click to upload
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Supported formats: PDF, DOCX, TXT, CSV (Max 10MB per file)
            </p>
            <input
              type="file"
              id="file-upload"
              multiple
              accept={ACCEPTED_FILE_TYPES.join(",")}
              onChange={handleFileInputChange}
              className="hidden"
            />
            <Button
              as="label"
              htmlFor="file-upload"
              color="primary"
              variant="flat"
            >
              Select Files
            </Button>
          </div>

          {/* Upload Progress */}
          {Object.entries(uploadProgress).length > 0 && (
            <div className="space-y-2 mt-4">
              {Object.entries(uploadProgress).map(([filename, progress]) => (
                <div key={filename}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="truncate">{filename}</span>
                    <span className="text-gray-500">{progress}%</span>
                  </div>
                  <Progress value={progress} color="primary" size="sm" />
                </div>
              ))}
            </div>
          )}

          <Divider className="my-4" />

          {/* Documents List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                Uploaded Documents ({documents.length})
              </h3>
              {isLoading && (
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              )}
            </div>

            {documents.length === 0 ? (
              <Card>
                <CardBody className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500">No documents uploaded yet</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Upload documents to create your knowledge base
                  </p>
                </CardBody>
              </Card>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {documents.map((doc) => (
                  <Card key={doc.id} className="hover:border-primary transition-colors">
                    <CardBody>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          {getStatusIcon(doc.status)}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{doc.filename}</p>
                            <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                              <span className="uppercase">{doc.filetype}</span>
                              <span>•</span>
                              <span>{formatFileSize(doc.filesize)}</span>
                              {doc.chunkcount > 0 && (
                                <>
                                  <span>•</span>
                                  <span>{doc.chunkcount} chunks</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Chip
                            size="sm"
                            color={getStatusColor(doc.status)}
                            variant="flat"
                          >
                            {doc.status}
                          </Chip>
                          <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                            color="danger"
                            onClick={() => handleDeleteDocument(doc.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Statistics */}
          {documents.length > 0 && (
            <div className="grid grid-cols-3 gap-3 mt-4">
              <Card>
                <CardBody className="text-center py-3">
                  <p className="text-2xl font-bold text-success">
                    {documents.filter((d) => d.status === "completed").length}
                  </p>
                  <p className="text-xs text-gray-600">Completed</p>
                </CardBody>
              </Card>
              <Card>
                <CardBody className="text-center py-3">
                  <p className="text-2xl font-bold text-primary">
                    {documents.filter((d) => d.status === "processing" || d.status === "pending").length}
                  </p>
                  <p className="text-xs text-gray-600">Processing</p>
                </CardBody>
              </Card>
              <Card>
                <CardBody className="text-center py-3">
                  <p className="text-2xl font-bold text-danger">
                    {documents.filter((d) => d.status === "failed").length}
                  </p>
                  <p className="text-xs text-gray-600">Failed</p>
                </CardBody>
              </Card>
            </div>
          )}
        </ModalBody>

        <ModalFooter>
          <Button variant="light" onPress={onClose}>
            Close
          </Button>
          <Button color="primary" onPress={loadDocuments}>
            Refresh
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

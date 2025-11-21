"use client";

import { useState, useEffect } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Card,
  CardBody,
  Input,
  Textarea,
  Chip,
  Divider,
  Select,
  SelectItem,
} from "@heroui/react";
import {
  HelpCircle,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Upload,
  Search,
} from "lucide-react";
import { api, isApiError } from "@/lib/api-client";
import { toast } from "sonner";

/**
 * FAQ Manager Modal
 *
 * Features:
 * - Create/Edit/Delete FAQ entries
 * - Category management
 * - Search and filter
 * - Bulk import from CSV
 * - Usage statistics
 */

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category?: string;
  timesused: number;
  createdat: string;
  updatedat: string;
}

interface FAQManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  agentId: string;
}

export function FAQManagerModal({
  isOpen,
  onClose,
  agentId,
}: FAQManagerModalProps) {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Form state for create/edit
  const [formQuestion, setFormQuestion] = useState("");
  const [formAnswer, setFormAnswer] = useState("");
  const [formCategory, setFormCategory] = useState("");

  // Load FAQs when modal opens
  useEffect(() => {
    if (isOpen && agentId) {
      loadFAQs();
    }
  }, [isOpen, agentId]);

  const loadFAQs = async () => {
    setIsLoading(true);
    try {
      // apiClient already unwraps the { success, data } response - we get FAQ[] directly
      const faqs = await api.get<FAQ[]>(
        `/api/user/agents/${agentId}/knowledge-base/faqs`
      );
      setFaqs(faqs || []);
    } catch (error) {
      console.error("Failed to load FAQs:", error);
      toast.error("Failed to load FAQs");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateFAQ = async () => {
    if (!formQuestion.trim() || !formAnswer.trim()) {
      toast.error("Question and answer are required");
      return;
    }

    try {
      // apiClient already unwraps the { success, data } response - we get FAQ directly
      const newFaq = await api.post<FAQ>(
        `/api/user/agents/${agentId}/knowledge-base/faqs`,
        {
          question: formQuestion.trim(),
          answer: formAnswer.trim(),
          category: formCategory.trim() || undefined,
        }
      );

      setFaqs((prev) => [newFaq, ...prev]);
      toast.success("FAQ created successfully");
      resetForm();
      setIsCreating(false);
    } catch (error) {
      const errorMessage = isApiError(error)
        ? error.message
        : "Failed to create FAQ";
      toast.error("Create failed", { description: errorMessage });
    }
  };

  const handleUpdateFAQ = async () => {
    if (!editingFaq || !formQuestion.trim() || !formAnswer.trim()) {
      toast.error("Question and answer are required");
      return;
    }

    try {
      // apiClient already unwraps the { success, data } response - we get FAQ directly
      const updatedFaq = await api.put<FAQ>(
        `/api/user/agents/${agentId}/knowledge-base/faqs/${editingFaq.id}`,
        {
          question: formQuestion.trim(),
          answer: formAnswer.trim(),
          category: formCategory.trim() || undefined,
        }
      );

      setFaqs((prev) =>
        prev.map((faq) => (faq.id === editingFaq.id ? updatedFaq : faq))
      );
      toast.success("FAQ updated successfully");
      resetForm();
      setEditingFaq(null);
    } catch (error) {
      const errorMessage = isApiError(error)
        ? error.message
        : "Failed to update FAQ";
      toast.error("Update failed", { description: errorMessage });
    }
  };

  const handleDeleteFAQ = async (faqId: string) => {
    if (!confirm("Are you sure you want to delete this FAQ?")) {
      return;
    }

    try {
      await api.delete(
        `/api/user/agents/${agentId}/knowledge-base/faqs/${faqId}`
      );

      setFaqs((prev) => prev.filter((faq) => faq.id !== faqId));
      toast.success("FAQ deleted successfully");
    } catch (error) {
      const errorMessage = isApiError(error)
        ? error.message
        : "Failed to delete FAQ";
      toast.error("Delete failed", { description: errorMessage });
    }
  };

  const handleEditFAQ = (faq: FAQ) => {
    setEditingFaq(faq);
    setFormQuestion(faq.question);
    setFormAnswer(faq.answer);
    setFormCategory(faq.category || "");
    setIsCreating(false);
  };

  const handleStartCreate = () => {
    resetForm();
    setIsCreating(true);
    setEditingFaq(null);
  };

  const resetForm = () => {
    setFormQuestion("");
    setFormAnswer("");
    setFormCategory("");
  };

  const handleCancelEdit = () => {
    resetForm();
    setIsCreating(false);
    setEditingFaq(null);
  };

  // Get unique categories from FAQs
  const categories = Array.from(
    new Set(faqs.map((faq) => faq.category).filter(Boolean))
  ) as string[];

  // Filter FAQs based on search and category
  const filteredFAQs = faqs.filter((faq) => {
    const matchesSearch =
      !searchQuery ||
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === "all" || faq.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="5xl"
      scrollBehavior="inside"
    >
      <ModalContent>
        <ModalHeader>
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Knowledge Base FAQs
          </div>
        </ModalHeader>

        <ModalBody>
          <div className="flex flex-col gap-4">
            {/* Header Actions */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1">
                {/* Search */}
                <Input
                  placeholder="Search FAQs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  startContent={<Search className="h-4 w-4 text-gray-400" />}
                  className="max-w-xs"
                  size="sm"
                />

                {/* Category Filter */}
                <Select
                  placeholder="All Categories"
                  selectedKeys={[selectedCategory]}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="max-w-xs"
                  size="sm"
                >
                  <SelectItem key="all">
                    All Categories
                  </SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category}>
                      {category}
                    </SelectItem>
                  ))}
                </Select>
              </div>

              {/* Add New Button */}
              {!isCreating && !editingFaq && (
                <Button
                  color="primary"
                  startContent={<Plus className="h-4 w-4" />}
                  onClick={handleStartCreate}
                  size="sm"
                >
                  Add FAQ
                </Button>
              )}
            </div>

            {/* Create/Edit Form */}
            {(isCreating || editingFaq) && (
              <Card className="border-2 border-primary">
                <CardBody className="gap-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">
                      {editingFaq ? "Edit FAQ" : "Create New FAQ"}
                    </h3>
                    <Button
                      isIconOnly
                      size="sm"
                      variant="light"
                      onClick={handleCancelEdit}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <Input
                    label="Question"
                    placeholder="What is your refund policy?"
                    value={formQuestion}
                    onChange={(e) => setFormQuestion(e.target.value)}
                    isRequired
                  />

                  <Textarea
                    label="Answer"
                    placeholder="We offer a 30-day money-back guarantee..."
                    value={formAnswer}
                    onChange={(e) => setFormAnswer(e.target.value)}
                    minRows={3}
                    isRequired
                  />

                  <Input
                    label="Category (Optional)"
                    placeholder="Policies, Pricing, Support, etc."
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                  />

                  <div className="flex gap-2">
                    <Button
                      color="primary"
                      startContent={<Save className="h-4 w-4" />}
                      onClick={editingFaq ? handleUpdateFAQ : handleCreateFAQ}
                    >
                      {editingFaq ? "Update FAQ" : "Create FAQ"}
                    </Button>
                    <Button variant="light" onClick={handleCancelEdit}>
                      Cancel
                    </Button>
                  </div>
                </CardBody>
              </Card>
            )}

            <Divider />

            {/* FAQs List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  FAQs ({filteredFAQs.length})
                </h3>
                {faqs.length > 0 && (
                  <p className="text-sm text-gray-500">
                    Total: {faqs.length} | Filtered: {filteredFAQs.length}
                  </p>
                )}
              </div>

              {isLoading ? (
                <Card>
                  <CardBody className="text-center py-8">
                    <p className="text-gray-500">Loading FAQs...</p>
                  </CardBody>
                </Card>
              ) : filteredFAQs.length === 0 ? (
                <Card>
                  <CardBody className="text-center py-8">
                    <HelpCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500">
                      {faqs.length === 0
                        ? "No FAQs yet"
                        : "No FAQs match your search"}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      {faqs.length === 0
                        ? "Click 'Add FAQ' to create your first FAQ"
                        : "Try adjusting your search or filters"}
                    </p>
                  </CardBody>
                </Card>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {filteredFAQs.map((faq) => (
                    <Card
                      key={faq.id}
                      className="hover:border-primary transition-colors"
                    >
                      <CardBody>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold">{faq.question}</h4>
                              {faq.category && (
                                <Chip size="sm" color="primary" variant="flat">
                                  {faq.category}
                                </Chip>
                              )}
                              {faq.timesused > 0 && (
                                <Chip size="sm" variant="flat">
                                  {faq.timesused} uses
                                </Chip>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">
                              {faq.answer}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              isIconOnly
                              size="sm"
                              variant="light"
                              color="primary"
                              onClick={() => handleEditFAQ(faq)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              isIconOnly
                              size="sm"
                              variant="light"
                              color="danger"
                              onClick={() => handleDeleteFAQ(faq.id)}
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
            {faqs.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                <Card>
                  <CardBody className="text-center py-3">
                    <p className="text-2xl font-bold text-primary">
                      {faqs.length}
                    </p>
                    <p className="text-xs text-gray-600">Total FAQs</p>
                  </CardBody>
                </Card>
                <Card>
                  <CardBody className="text-center py-3">
                    <p className="text-2xl font-bold text-success">
                      {categories.length}
                    </p>
                    <p className="text-xs text-gray-600">Categories</p>
                  </CardBody>
                </Card>
                <Card>
                  <CardBody className="text-center py-3">
                    <p className="text-2xl font-bold text-warning">
                      {faqs.reduce((sum, faq) => sum + faq.timesused, 0)}
                    </p>
                    <p className="text-xs text-gray-600">Total Uses</p>
                  </CardBody>
                </Card>
              </div>
            )}
          </div>
        </ModalBody>

        <ModalFooter>
          <Button variant="light" onPress={onClose}>
            Close
          </Button>
          <Button color="primary" onPress={loadFAQs}>
            Refresh
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

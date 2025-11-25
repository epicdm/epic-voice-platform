'use client'

import { useState } from 'react'
import { Card, CardBody, Input, Chip, Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Tabs, Tab } from '@heroui/react'
import { Search, Star, Download, Clock, TrendingUp, Filter, ArrowRight, Check } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AGENT_TEMPLATES, TEMPLATE_CATEGORIES, getTemplatesByCategory, getPopularTemplates, type AgentTemplate } from '@/lib/agent-templates'
import { toast } from 'sonner'
import { api } from '@/lib/api'

export default function MarketplacePage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedTemplate, setSelectedTemplate] = useState<AgentTemplate | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [isDeploying, setIsDeploying] = useState(false)

  // Filter templates
  const filteredTemplates = AGENT_TEMPLATES.filter(template => {
    const matchesSearch = 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory
    
    return matchesSearch && matchesCategory
  })

  const popularTemplates = getPopularTemplates()

  const handleUseTemplate = (template: AgentTemplate) => {
    setSelectedTemplate(template)
    setShowModal(true)
  }

  const handleDeploy = async () => {
    if (!selectedTemplate) return
    
    setIsDeploying(true)
    
    try {
      // Create agent from template
      const agentData = {
        name: selectedTemplate.name,
        description: selectedTemplate.description,
        instructions: selectedTemplate.config.instructions,
        llm_model: selectedTemplate.config.llm_model,
        voice: selectedTemplate.config.voice,
        voice_id: selectedTemplate.config.voice_id,
        stt_provider: selectedTemplate.config.stt_provider,
        tts_provider: selectedTemplate.config.tts_provider,
        vad_enabled: selectedTemplate.config.vad_enabled,
        greeting_enabled: selectedTemplate.config.greeting_enabled,
        greeting_message: selectedTemplate.config.greeting_message || '',
      }
      
      await api.createAgent(agentData)
      
      toast.success('Agent created!', {
        description: `${selectedTemplate.name} has been created successfully.`,
        duration: 3000,
      })

      setShowModal(false)

      // Redirect to agents page
      router.push('/dashboard/agents')
    } catch (error) {
      console.error('Failed to create agent:', error)
      toast.error('Failed to create agent', {
        description: error instanceof Error ? error.message : 'Please try again',
      })
    } finally {
      setIsDeploying(false)
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'success'
      case 'intermediate': return 'warning'
      case 'advanced': return 'danger'
      default: return 'default'
    }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Agent Marketplace
        </h1>
        <p className="text-muted-foreground">
          Pre-built agent templates to get started in minutes
        </p>
      </div>

      {/* Popular Templates Banner */}
      <Card className="mb-8 border border-primary/20 bg-gradient-to-r from-primary/10 to-secondary/10">
        <CardBody className="p-6">
          <div className="flex items-start gap-4">
            <TrendingUp className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Most Popular Templates
              </h3>
              <div className="flex flex-wrap gap-3">
                {popularTemplates.slice(0, 3).map(template => (
                  <Button
                    key={template.id}
                    variant="bordered"
                    size="sm"
                    startContent={<span className="text-lg">{template.icon}</span>}
                    onPress={() => handleUseTemplate(template)}
                  >
                    {template.name}
                    <Chip size="sm" variant="flat" className="ml-2">
                      {template.downloads} uses
                    </Chip>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Search and Filter */}
      <div className="flex gap-4 mb-8">
        <Input
          placeholder="Search templates..."
          value={searchQuery}
          onValueChange={setSearchQuery}
          startContent={<Search className="h-4 w-4 text-muted-foreground" />}
          className="flex-1"
          size="lg"
        />
      </div>

      {/* Category Tabs */}
      <Tabs
        selectedKey={selectedCategory}
        onSelectionChange={(key) => setSelectedCategory(key as string)}
        className="mb-8"
        size="lg"
      >
        {TEMPLATE_CATEGORIES.map(category => (
          <Tab
            key={category.id}
            title={
              <div className="flex items-center gap-2">
                <span className="text-lg">{category.icon}</span>
                <span>{category.name}</span>
                <Chip size="sm" variant="flat">{category.count}</Chip>
              </div>
            }
          />
        ))}
      </Tabs>

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <Card className="border border-border">
          <CardBody className="p-12 text-center">
            <Filter className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No templates found
            </h3>
            <p className="text-muted-foreground">
              Try adjusting your search or filters
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map(template => (
            <Card key={template.id} className="border border-border hover:border-primary/50 transition-all cursor-pointer group">
              <CardBody className="p-6">
                {/* Template Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-lg ${template.color} flex items-center justify-center text-2xl`}>
                      {template.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {template.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Chip size="sm" variant="flat" color={getDifficultyColor(template.difficulty)}>
                          {template.difficulty}
                        </Chip>
                        {template.popular && (
                          <Chip size="sm" variant="flat" color="warning" startContent={<Star className="h-3 w-3" />}>
                            Popular
                          </Chip>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                  {template.description}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {template.tags.slice(0, 3).map(tag => (
                    <Chip key={tag} size="sm" variant="flat">
                      {tag}
                    </Chip>
                  ))}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{template.estimatedSetupTime}</span>
                  </div>
                  {template.downloads && (
                    <div className="flex items-center gap-1">
                      <Download className="h-4 w-4" />
                      <span>{template.downloads} uses</span>
                    </div>
                  )}
                </div>

                {/* Action Button */}
                <Button
                  color="primary"
                  className="w-full"
                  endContent={<ArrowRight className="h-4 w-4" />}
                  onPress={() => handleUseTemplate(template)}
                >
                  Use Template
                </Button>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Template Details Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        size="3xl"
        scrollBehavior="inside"
        backdrop="blur"
      >
        <ModalContent>
          <ModalHeader className="border-b border-border">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-lg ${selectedTemplate?.color} flex items-center justify-center text-2xl`}>
                {selectedTemplate?.icon}
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">{selectedTemplate?.name}</h2>
                <p className="text-sm text-muted-foreground font-normal">
                  {selectedTemplate?.category.replace('_', ' ')}
                </p>
              </div>
            </div>
          </ModalHeader>
          <ModalBody>
            {selectedTemplate && (
              <div className="space-y-6">
                {/* Description */}
                <div>
                  <h3 className="font-semibold text-foreground mb-2">About</h3>
                  <p className="text-muted-foreground">{selectedTemplate.description}</p>
                </div>

                {/* Metadata */}
                <div className="flex flex-wrap gap-4">
                  <Chip variant="flat" color={getDifficultyColor(selectedTemplate.difficulty)}>
                    {selectedTemplate.difficulty}
                  </Chip>
                  <Chip variant="flat" startContent={<Clock className="h-4 w-4" />}>
                    {selectedTemplate.estimatedSetupTime}
                  </Chip>
                  {selectedTemplate.downloads && (
                    <Chip variant="flat" startContent={<Download className="h-4 w-4" />}>
                      {selectedTemplate.downloads} uses
                    </Chip>
                  )}
                </div>

                {/* Features */}
                <div>
                  <h3 className="font-semibold text-foreground mb-3">Features</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {selectedTemplate.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-foreground">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Use Cases */}
                <div>
                  <h3 className="font-semibold text-foreground mb-3">Perfect For</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedTemplate.useCases.map((useCase, idx) => (
                      <Chip key={idx} variant="bordered">
                        {useCase}
                      </Chip>
                    ))}
                  </div>
                </div>

                {/* Requirements */}
                <div>
                  <h3 className="font-semibold text-foreground mb-3">Requirements</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    {selectedTemplate.requirements.map((req, idx) => (
                      <li key={idx}>{req}</li>
                    ))}
                  </ul>
                </div>

                {/* Instructions Preview */}
                <div>
                  <h3 className="font-semibold text-foreground mb-3">Agent Instructions</h3>
                  <div className="p-4 bg-default-100 rounded-lg">
                    <pre className="text-xs text-foreground whitespace-pre-wrap font-mono">
                      {selectedTemplate.config.instructions}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </ModalBody>
          <ModalFooter className="border-t border-border">
            <Button 
              variant="light" 
              onPress={() => setShowModal(false)}
              isDisabled={isDeploying}
            >
              Cancel
            </Button>
            <Button 
              color="primary" 
              onPress={handleDeploy}
              isLoading={isDeploying}
            >
              {isDeploying ? 'Creating Agent...' : 'Deploy Agent'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}

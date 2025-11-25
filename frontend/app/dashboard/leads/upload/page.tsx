'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardBody, CardHeader } from '@heroui/card'
import { Button } from '@heroui/button'
import { Select, SelectItem } from '@heroui/select'
import { Progress } from '@heroui/progress'
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, X } from 'lucide-react'
import { api } from '@/lib/api-client'

interface UploadSummary {
  total_rows: number
  successful_imports: number
  duplicates_skipped: number
  validation_errors: number
}

interface UploadError {
  row?: number
  phone?: string
  error: string
}

export default function LeadUploadPage() {
  const router = useRouter()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedCampaign, setSelectedCampaign] = useState<string>('')
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadSummary, setUploadSummary] = useState<UploadSummary | null>(null)
  const [uploadErrors, setUploadErrors] = useState<UploadError[]>([])
  const [showResults, setShowResults] = useState(false)

  // Load campaigns on mount
  useState(() => {
    const loadCampaigns = async () => {
      try {
        const response = await api.get('/api/user/campaigns')
        setCampaigns(response.campaigns || [])
      } catch (error) {
        console.error('Failed to load campaigns:', error)
      }
    }
    loadCampaigns()
  })

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file type
      const ext = file.name.split('.').pop()?.toLowerCase()
      if (!['csv', 'xlsx', 'xls'].includes(ext || '')) {
        alert('Please select a CSV or Excel file')
        return
      }
      setSelectedFile(file)
      setShowResults(false)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      alert('Please select a file')
      return
    }

    setIsUploading(true)
    setUploadProgress(0)
    setShowResults(false)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      if (selectedCampaign) {
        formData.append('campaign_id', selectedCampaign)
      }

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      const response = await api.post('/api/user/leads/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (response.success) {
        setUploadSummary(response.summary)
        setUploadErrors(response.errors || [])
        setShowResults(true)
      } else {
        alert('Upload failed: ' + (response.error || 'Unknown error'))
      }
    } catch (error: any) {
      console.error('Upload error:', error)
      alert('Upload failed: ' + (error.response?.data?.error || error.message))
    } finally {
      setIsUploading(false)
    }
  }

  const resetUpload = () => {
    setSelectedFile(null)
    setSelectedCampaign('')
    setUploadProgress(0)
    setUploadSummary(null)
    setUploadErrors([])
    setShowResults(false)
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Upload Leads</h1>
        <p className="text-muted-foreground mt-2">
          Import leads from CSV or Excel files to start calling campaigns
        </p>
      </div>

      {!showResults ? (
        <>
          {/* File Upload Card */}
          <Card className="mb-6">
            <CardHeader>
              <h2 className="text-xl font-semibold">Select File</h2>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                {/* File Input */}
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors">
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    {selectedFile ? (
                      <>
                        <FileSpreadsheet className="h-16 w-16 text-primary mb-4" />
                        <p className="text-lg font-medium text-foreground">{selectedFile.name}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {(selectedFile.size / 1024).toFixed(2)} KB
                        </p>
                        <Button
                          size="sm"
                          variant="flat"
                          className="mt-4"
                          onClick={(e) => {
                            e.preventDefault()
                            setSelectedFile(null)
                          }}
                        >
                          Change File
                        </Button>
                      </>
                    ) : (
                      <>
                        <Upload className="h-16 w-16 text-muted-foreground mb-4" />
                        <p className="text-lg font-medium text-foreground">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          CSV or Excel files (.csv, .xlsx, .xls)
                        </p>
                      </>
                    )}
                  </label>
                </div>

                {/* Campaign Selection */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Assign to Campaign (Optional)
                  </label>
                  <Select
                    placeholder="Select a campaign"
                    selectedKeys={selectedCampaign ? [selectedCampaign] : []}
                    onSelectionChange={(keys) => {
                      const selected = Array.from(keys)[0] as string
                      setSelectedCampaign(selected)
                    }}
                  >
                    {campaigns.map((campaign) => (
                      <SelectItem key={campaign.id} value={campaign.id}>
                        {campaign.name}
                      </SelectItem>
                    ))}
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    If not selected, leads will be uploaded without a campaign assignment
                  </p>
                </div>

                {/* File Format Requirements */}
                <div className="bg-muted/50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-foreground mb-2">
                    File Format Requirements:
                  </h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• <strong>Required:</strong> phone_number or phone column</li>
                    <li>• <strong>Optional:</strong> first_name, last_name, email, company</li>
                    <li>• <strong>Custom fields:</strong> Any additional columns will be saved as metadata</li>
                    <li>• Phone numbers will be automatically formatted (add +1 for US if missing)</li>
                  </ul>
                </div>

                {/* Upload Progress */}
                {isUploading && (
                  <div className="space-y-2">
                    <Progress
                      value={uploadProgress}
                      className="w-full"
                      color="primary"
                    />
                    <p className="text-sm text-center text-muted-foreground">
                      Uploading... {uploadProgress}%
                    </p>
                  </div>
                )}

                {/* Upload Button */}
                <div className="flex gap-3">
                  <Button
                    color="primary"
                    size="lg"
                    className="flex-1"
                    onClick={handleUpload}
                    isDisabled={!selectedFile || isUploading}
                    isLoading={isUploading}
                  >
                    Upload Leads
                  </Button>
                  <Button
                    variant="flat"
                    size="lg"
                    onClick={() => router.push('/dashboard/leads')}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        </>
      ) : (
        <>
          {/* Upload Results */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Upload Complete</h2>
                <Button
                  variant="light"
                  size="sm"
                  onClick={resetUpload}
                  startContent={<X className="h-4 w-4" />}
                >
                  Upload Another File
                </Button>
              </div>
            </CardHeader>
            <CardBody>
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-primary/10 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-primary">
                      {uploadSummary?.total_rows || 0}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">Total Rows</p>
                  </div>
                  <div className="bg-success/10 rounded-lg p-4 text-center">
                    <div className="flex items-center justify-center mb-1">
                      <CheckCircle2 className="h-5 w-5 text-success mr-1" />
                      <p className="text-3xl font-bold text-success">
                        {uploadSummary?.successful_imports || 0}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Imported</p>
                  </div>
                  <div className="bg-warning/10 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-warning">
                      {uploadSummary?.duplicates_skipped || 0}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">Duplicates</p>
                  </div>
                  <div className="bg-danger/10 rounded-lg p-4 text-center">
                    <div className="flex items-center justify-center mb-1">
                      <AlertCircle className="h-5 w-5 text-danger mr-1" />
                      <p className="text-3xl font-bold text-danger">
                        {uploadSummary?.validation_errors || 0}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Errors</p>
                  </div>
                </div>

                {/* Errors List */}
                {uploadErrors.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-3">
                      Validation Errors ({uploadErrors.length})
                    </h3>
                    <div className="bg-danger/5 rounded-lg p-4 max-h-96 overflow-y-auto">
                      <div className="space-y-2">
                        {uploadErrors.map((error, index) => (
                          <div
                            key={index}
                            className="flex items-start gap-2 text-sm"
                          >
                            <AlertCircle className="h-4 w-4 text-danger mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-foreground">
                                {error.row && <strong>Row {error.row}:</strong>} {error.error}
                              </p>
                              {error.phone && (
                                <p className="text-muted-foreground text-xs">
                                  Phone: {error.phone}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button
                    color="primary"
                    size="lg"
                    className="flex-1"
                    onClick={() => router.push('/dashboard/leads')}
                  >
                    View All Leads
                  </Button>
                  {selectedCampaign && (
                    <Button
                      color="secondary"
                      size="lg"
                      className="flex-1"
                      onClick={() => router.push(`/dashboard/campaigns/${selectedCampaign}`)}
                    >
                      View Campaign
                    </Button>
                  )}
                  <Button
                    variant="flat"
                    size="lg"
                    onClick={resetUpload}
                  >
                    Upload More
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        </>
      )}

      {/* Sample CSV Template */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">Sample CSV Template</h2>
        </CardHeader>
        <CardBody>
          <div className="bg-muted rounded-lg p-4 font-mono text-sm overflow-x-auto">
            <pre className="text-foreground">
phone_number,first_name,last_name,email,company
+17675551234,John,Doe,john@example.com,Acme Corp
+17675555678,Jane,Smith,jane@example.com,Tech Inc
+14155559012,Bob,Johnson,bob@example.com,StartupXYZ
            </pre>
          </div>
          <Button
            variant="flat"
            size="sm"
            className="mt-4"
            onClick={() => {
              const csvContent = `phone_number,first_name,last_name,email,company
+17675551234,John,Doe,john@example.com,Acme Corp
+17675555678,Jane,Smith,jane@example.com,Tech Inc
+14155559012,Bob,Johnson,bob@example.com,StartupXYZ`
              const blob = new Blob([csvContent], { type: 'text/csv' })
              const url = window.URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = 'leads_template.csv'
              a.click()
              window.URL.revokeObjectURL(url)
            }}
          >
            Download Template
          </Button>
        </CardBody>
      </Card>
    </div>
  )
}

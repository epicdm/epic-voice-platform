'use client'

import ComprehensiveAmiDashboard from '@/components/ami/ComprehensiveAmiDashboard'

export default function AmiPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Call Center Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Real-time monitoring, call control, and supervisor tools powered by Asterisk AMI
        </p>
      </div>

      <ComprehensiveAmiDashboard />
    </div>
  )
}

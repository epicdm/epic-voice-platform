export interface CallOutcome {
  id: string
  callLogId: string
  outcome: 'answered' | 'voicemail' | 'no_answer' | 'busy' | 'failed'
  summary?: string
  sentiment?: 'positive' | 'neutral' | 'negative'
  actionItems?: string[]
  nextSteps?: string
  createdAt?: Date
}

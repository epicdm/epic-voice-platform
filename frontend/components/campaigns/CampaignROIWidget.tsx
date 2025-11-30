import { CallOutcome } from '@/types/call-outcome'

interface CampaignROIWidgetProps {
  campaignId?: string;
  spent?: number;
  revenue?: number;
  outcomes?: CallOutcome[];
  loading?: boolean;
}

export function CampaignROIWidget({
  campaignId,
  spent = 0,
  revenue = 0,
  outcomes = [],
  loading = false
}: CampaignROIWidgetProps) {
  // Calculate ROI from outcomes if provided
  if (outcomes.length > 0) {
    // TODO: Calculate spent and revenue from outcomes
    // For now, use defaults
  }
  const roi = spent > 0 ? ((revenue - spent) / spent) * 100 : 0;

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="font-semibold mb-3">ROI Analysis</h3>
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">Spent:</span>
          <span className="font-medium">${spent.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">Revenue:</span>
          <span className="font-medium">${revenue.toFixed(2)}</span>
        </div>
        <div className="flex justify-between pt-2 border-t">
          <span className="text-sm font-semibold">ROI:</span>
          <span className={`font-bold ${roi >= 0 ? "text-green-600" : "text-red-600"}`}>
            {roi.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}

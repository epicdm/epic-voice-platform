interface CampaignROIWidgetProps {
  campaignId: string;
  spent?: number;
  revenue?: number;
}

export function CampaignROIWidget({ campaignId, spent = 0, revenue = 0 }: CampaignROIWidgetProps) {
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

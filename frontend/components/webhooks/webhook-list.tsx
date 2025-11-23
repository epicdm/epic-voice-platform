interface WebhookListProps {
  webhooks: any[];
  onEdit?: (webhook: any) => void;
  onDelete?: (id: string) => void;
  onViewLogs?: (webhook: any) => void;
  onRefetch?: () => void;
}

export function WebhookList({ webhooks, onEdit, onDelete, onViewLogs, onRefetch }: WebhookListProps) {
  return (
    <div className="space-y-3">
      {webhooks.map((webhook) => (
        <div key={webhook.id} className="p-4 border rounded-lg">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold">{webhook.url}</h3>
              <p className="text-sm text-gray-600">{webhook.events?.join(", ")}</p>
            </div>
            <div className="flex gap-2">
              {onEdit && (
                <button onClick={() => onEdit(webhook)} className="text-blue-600 text-sm">
                  Edit
                </button>
              )}
              {onDelete && (
                <button onClick={() => onDelete(webhook.id)} className="text-red-600 text-sm">
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

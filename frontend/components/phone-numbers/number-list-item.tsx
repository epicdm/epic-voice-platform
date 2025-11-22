interface NumberListItemProps {
  number: any;
  onAssign?: (number: string) => void;
  onUnassign?: (number: string) => void;
  onDelete?: (number: string) => void;
}

export function NumberListItem({ number, onAssign, onUnassign, onDelete }: NumberListItemProps) {
  return (
    <div className="p-4 border rounded-lg flex justify-between items-center">
      <div>
        <p className="font-medium">{number.phoneNumber}</p>
        <p className="text-sm text-gray-500">
          {number.assignedToAgentId ? "Assigned" : "Available"}
        </p>
      </div>
      <div className="flex gap-2">
        {!number.assignedToAgentId && onAssign && (
          <button
            onClick={() => onAssign(number.phoneNumber)}
            className="text-blue-600 text-sm"
          >
            Assign
          </button>
        )}
        {number.assignedToAgentId && onUnassign && (
          <button
            onClick={() => onUnassign(number.phoneNumber)}
            className="text-orange-600 text-sm"
          >
            Unassign
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => onDelete(number.phoneNumber)}
            className="text-red-600 text-sm"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

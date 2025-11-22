interface BrandKitPreviewCardProps {
  brandKit: any;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function BrandKitPreviewCard({ brandKit, onEdit, onDelete }: BrandKitPreviewCardProps) {
  return (
    <div className="p-4 border rounded-lg">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold">{brandKit.name}</h3>
          <p className="text-sm text-gray-500 mt-1">{brandKit.description}</p>
        </div>
        <div className="flex gap-2">
          {onEdit && (
            <button onClick={onEdit} className="text-blue-600 text-sm">
              Edit
            </button>
          )}
          {onDelete && (
            <button onClick={onDelete} className="text-red-600 text-sm">
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

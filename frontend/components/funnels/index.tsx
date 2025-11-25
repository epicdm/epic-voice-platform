import FunnelEditorComponent from "./FunnelEditor";
export { FunnelEditorComponent as FunnelEditor };

export function FunnelList() {
  return <div>Funnel List</div>;
}

export function FunnelCard({ funnel }: { funnel: any }) {
  return (
    <div className="p-4 border rounded-lg">
      <h3 className="font-semibold">{funnel.name}</h3>
    </div>
  );
}

export function FunnelGrid({ funnels, onSelect }: { funnels: any[]; onSelect?: (id: string) => void }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {funnels.map((funnel) => (
        <div
          key={funnel.id}
          className="p-4 border rounded-lg cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onSelect?.(funnel.id)}
        >
          <h3 className="font-semibold">{funnel.name}</h3>
          {funnel.description && <p className="text-sm text-gray-600 mt-1">{funnel.description}</p>}
        </div>
      ))}
    </div>
  );
}

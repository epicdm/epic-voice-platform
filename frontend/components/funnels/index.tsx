export { FunnelEditor } from "./FunnelEditor";

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

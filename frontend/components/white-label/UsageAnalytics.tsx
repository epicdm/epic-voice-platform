export default function UsageAnalytics() {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Usage Analytics</h3>
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 border rounded">
          <p className="text-sm text-gray-600">API Calls</p>
          <p className="text-2xl font-bold">0</p>
        </div>
        <div className="p-4 border rounded">
          <p className="text-sm text-gray-600">Active Users</p>
          <p className="text-2xl font-bold">0</p>
        </div>
        <div className="p-4 border rounded">
          <p className="text-sm text-gray-600">Bandwidth</p>
          <p className="text-2xl font-bold">0 GB</p>
        </div>
      </div>
    </div>
  );
}

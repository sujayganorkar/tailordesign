import * as React from "react";

export function DataTable({ rows, loading, error, onRetry }: any) {
  if (loading) return <div className="animate-pulse h-40 bg-gray-100 rounded" aria-busy="true" />;
  if (error) return <div role="alert" className="text-red-600">Failed <button onClick={onRetry} className="underline">retry</button></div>;
  if (!rows?.length) return <div className="text-gray-500 py-8 text-center">No rows</div>;
  return (
    <table className="w-full">
      <thead><tr><th>Name</th><th>Value</th></tr></thead>
      <tbody>
        {rows.map((r: any) => (
          <tr key={r.id} className="hover:bg-gray-50">
            <td>{r.name}</td><td>{r.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

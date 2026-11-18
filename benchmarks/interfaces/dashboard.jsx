import React, { useState, useEffect } from 'react';

export default function Dashboard() {
  const [data, setData] = useState(null);
  useEffect(() => { fetch('/api/data').then(r=>r.json()).then(setData); }, []);
  return (
    <div>
      <nav><a href="/dash">Dashboard</a></nav>
      <div onClick={() => console.log('click')} className="card">Stat 1</div>
      <div className="grid grid-cols-4">
        {data ? data.map(d => <div key={d.id}>{d.name}</div>) : <div>Loading...</div>}
      </div>
    </div>
  );
}

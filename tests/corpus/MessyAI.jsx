import React, { useState, useEffect } from "react";

export default function MessyAI() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch("/api/data").then(r => r.json()).then(setData);
  }, []);

  return (
    <div style={{ width: "100%", height: "400px", margin: "20px", top: "10px" }} className="animate-[width_0.8s_ease]">
      <div onClick={() => alert("hi")} className="cursor-pointer">
        Click me
      </div>
      <button className="bg-blue-500 text-white px-4 py-2">Submit</button>
      <div className="grid grid-cols-3 gap-4">
        <div className="card">Card 1</div>
        <div className="card">Card 2</div>
        <div className="card">Card 3</div>
      </div>
      {data && data.map((x) => <div key={x.id}>{x.name}</div>)}
    </div>
  );
}

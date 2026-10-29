// tests/fixtures/BadComponent.jsx - A typical "AI slop" component

import React, { useState, useEffect } from 'react';

export default function ProductCard({ product }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch('/api/products')
      .then(r => r.json())
      .then(setData);
  }, []);

  return (
    <div onClick={() => console.log('clicked')} className="card">
      <div className="hero grid grid-cols-3 gap-4">
        {data && data.map(p => (
          <div key={p.id} className="card bg-white rounded-lg shadow p-4">
            <img src={p.image} alt={p.name} />
            <h3>{p.name}</h3>
            <p>{p.price}</p>
            <button className="bg-blue-500 text-white px-4 py-2 rounded"
              onClick={() => addToCart(p.id)}>
              Add to Cart
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function addToCart(id) {
  console.log('added', id);
}

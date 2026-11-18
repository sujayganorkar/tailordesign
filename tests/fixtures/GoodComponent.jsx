// tests/fixtures/GoodComponent.jsx - A well-crafted component

import React, { useState, useEffect } from 'react';
import { useReducedMotion } from 'framer-motion';

export default function ProductCard({ product }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    fetch('/api/products')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e); setLoading(false); });
  }, []);

  if (loading) return <div className="skeleton" aria-busy="true" aria-live="polite">Loading...</div>;
  if (error) return <div role="alert">Failed to load products.</div>;
  if (!data || data.length === 0) return <div>No products found.</div>;

  return (
    <nav aria-label="Products">
      <ul className="grid gap-4">
        {data.map(p => (
          <li key={p.id}>
            <article className="transition-transform duration-200 ease-out hover:scale-105 focus-visible:ring-2">
              <img src={p.image} alt={p.name} className="w-full" />
              <h3>{p.name}</h3>
              <p>{p.price}</p>
              <button
                className="bg-brand-500 text-white px-4 py-2 rounded min-h-[44px] min-w-[44px] hover:bg-brand-600 focus-visible:ring-2"
                disabled={false}
                aria-label={`Add ${p.name} to cart`}
                onClick={() => addToCart(p.id)}
              >
                Add to Cart
              </button>
            </article>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function addToCart(id) {
  console.log('added', id);
}

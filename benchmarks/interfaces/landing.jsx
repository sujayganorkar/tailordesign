import React from 'react';

export default function Landing() {
  return (
    <div>
      <nav>
        <a href="/">Home</a>
        <a href="/about">About</a>
      </nav>
      <section className="hero">
        <h1>Welcome</h1>
        <p>Tagline here</p>
        <button className="bg-blue-500 text-white px-4 py-2">Get Started</button>
      </section>
      <section className="grid grid-cols-3">
        <div className="card rounded shadow">Feature 1</div>
        <div className="card rounded shadow">Feature 2</div>
        <div className="card rounded shadow">Feature 3</div>
      </section>
    </div>
  );
}

import React, { useState } from 'react';

export default function ContactForm() {
  const [email, setEmail] = useState('');
  const handleSubmit = (e) => { e.preventDefault(); fetch('/api/contact', { method: 'POST' }); };
  return (
    <form onSubmit={handleSubmit}>
      <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" />
      <button type="submit" className="bg-indigo-600 text-white">Submit</button>
    </form>
  );
}

import React, { useState } from "react";

export function LoginForm({ onSubmit }: any) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  return (
    <form onSubmit={(e) => { e.preventDefault(); setSubmitting(true); onSubmit?.({ email, password }); }} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium">Email</label>
        <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded border px-3 py-2 focus-visible:ring-2" required />
      </div>
      <div>
        <label htmlFor="pwd" className="block text-sm font-medium">Password</label>
        <input id="pwd" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded border px-3 py-2 focus-visible:ring-2" required />
      </div>
      <button type="submit" disabled={submitting} className="w-full rounded bg-blue-600 text-white py-2 hover:bg-blue-700 focus-visible:ring-2 disabled:opacity-50">
        {submitting ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

// Reusable full-screen loading component for game sync states
import React from 'react';

export default function Loading({ message = 'Loading…' }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-base-300 text-base-content gap-4 py-8">
      {/* DaisyUI/Tailwind spinner */}
      <span className="loading loading-spinner loading-lg text-primary" />
      <p className="text-lg font-semibold animate-pulse">{message}</p>
    </div>
  );
} 
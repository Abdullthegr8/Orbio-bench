"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <>
      <h1 className="font-display text-3xl font-bold">Something went wrong</h1>
      <p className="mt-3 max-w-prose leading-relaxed text-slate">The page failed to load. Try again, and if it keeps happening the results file may be missing or damaged.</p>
      <button type="button" onClick={reset} className="mt-5 min-h-11 rounded-md bg-ink px-4 font-display text-sm font-semibold text-white">
        Try again
      </button>
    </>
  );
}

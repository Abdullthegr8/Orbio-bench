"use client";

export default function ShareBar({ text, demo }: { text: string; demo: boolean }) {
  const post = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(window.location.origin)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };
  return (
    <div className="flex flex-wrap items-center gap-3">
      <a
        href="/card"
        download="orbio-bench.png"
        className="inline-flex min-h-11 items-center rounded-md border border-ink bg-white px-4 font-display text-sm font-semibold hover:bg-fog"
      >
        {demo ? "Download preview card" : "Download result card"}
      </a>
      {!demo && (
        <button
          type="button"
          onClick={post}
          className="min-h-11 rounded-md bg-ink px-4 font-display text-sm font-semibold text-white"
        >
          Post on X
        </button>
      )}
      <p className="text-sm text-slate">{demo ? "Demo data, so posting is switched off." : "Attach the card to your post."}</p>
    </div>
  );
}

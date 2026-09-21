import Link from "next/link";

export default function NotFound() {
  return (
    <>
      <h1 className="font-display text-3xl font-bold">Page not found</h1>
      <p className="mt-3 max-w-prose leading-relaxed text-slate">That page does not exist, or that model has no recorded runs yet.</p>
      <Link href="/" className="mt-5 inline-flex min-h-11 items-center rounded-md bg-ink px-4 font-display text-sm font-semibold text-white">
        Back to model status
      </Link>
    </>
  );
}

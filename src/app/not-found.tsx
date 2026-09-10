import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cocoa-100 text-2xl">
        🧭
      </span>
      <h1 className="heading mt-5 text-2xl font-semibold">We couldn&rsquo;t find that</h1>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-cocoa-600">
        The page or item you were after doesn&rsquo;t exist — it may have been deleted.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex h-11 items-center rounded-xl bg-grad-ember px-5 text-sm font-semibold text-white shadow-soft"
      >
        Back to dashboard
      </Link>
    </div>
  );
}

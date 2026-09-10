"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] render error", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-caramel-100 text-2xl">
        ⚠️
      </span>
      <h1 className="heading mt-5 text-2xl font-semibold">Something went wrong</h1>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-cocoa-600">
        This page couldn&rsquo;t load. Nothing you&rsquo;ve saved is affected — your workouts and
        meals are safe in the database.
      </p>
      <div className="mt-6 flex gap-2.5">
        <Button onClick={reset}>Try again</Button>
        <Button variant="secondary" onClick={() => (window.location.href = "/")}>
          Go to dashboard
        </Button>
      </div>
      {error.digest && (
        <p className="mt-5 text-[11px] text-cocoa-400">Reference: {error.digest}</p>
      )}
    </div>
  );
}

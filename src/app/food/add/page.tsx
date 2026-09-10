import { Suspense } from "react";
import { AddMealClient } from "@/components/food/AddMealClient";
import { LoadingCard } from "@/components/ui/States";

export const dynamic = "force-dynamic";

export default function AddMealPage() {
  return (
    <Suspense fallback={<LoadingCard lines={6} />}>
      <AddMealClient />
    </Suspense>
  );
}

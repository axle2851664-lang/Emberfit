"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

/**
 * Connection notice. Most of EmberFit works offline — the local food table,
 * every workout feature — so this reassures rather than alarms.
 */
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return (
    <AnimatePresence>
      {offline && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="safe-top sticky top-0 z-[80] overflow-hidden bg-cocoa-800 text-cream"
        >
          <p className="px-4 py-2 text-center text-[12.5px] font-medium">
            You&rsquo;re offline. Workouts and the built-in food list still work — product
            lookups and photo scanning will come back when you reconnect.
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

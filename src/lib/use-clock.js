"use client";

import { useEffect, useState } from "react";

/** The current time, re-rendering only the component that shows it, every `rate` ms. */
export function useClock(rate = 1000, active = true) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active || !rate) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), rate);
    return () => clearInterval(id);
  }, [rate, active]);
  return now;
}

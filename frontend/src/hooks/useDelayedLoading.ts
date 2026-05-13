import { useEffect, useState } from "react";

export function useDelayedLoading(isLoading: boolean, options?: { delay?: number; minDuration?: number }) {
  const delay = options?.delay ?? 120;
  const minDuration = options?.minDuration ?? 220;
  const [show, setShow] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);

  useEffect(() => {
    let delayTimer: ReturnType<typeof setTimeout> | null = null;
    let hideTimer: ReturnType<typeof setTimeout> | null = null;

    if (isLoading) {
      if (!show) {
        delayTimer = setTimeout(() => {
          setShow(true);
          setStartTime(Date.now());
        }, delay);
      }
    } else {
      if (show && startTime !== null) {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, minDuration - elapsed);
        hideTimer = setTimeout(() => setShow(false), remaining);
      } else {
        setShow(false);
      }
    }

    return () => {
      if (delayTimer) clearTimeout(delayTimer);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, [isLoading, delay, minDuration, show, startTime]);

  return show;
}

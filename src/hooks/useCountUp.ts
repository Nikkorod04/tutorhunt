/**
 * Count-up tween for money figures.
 *
 * Implemented with a plain animation frame loop rather than a Reanimated
 * worklet: animating a *string* through a worklet requires a TextInput hack,
 * and this keeps the value readable by ordinary React and testable.
 *
 * When reduce-motion is on the value is rendered immediately (DESIGN_PLAN
 * section 3.6).
 */

import { useEffect, useRef, useState } from 'react';

export interface UseCountUpOptions {
  durationMs: number;
  /** Set false to jump straight to the target. */
  enabled?: boolean;
}

export function useCountUp(target: number, { durationMs, enabled = true }: UseCountUpOptions): number {
  const [value, setValue] = useState(enabled ? 0 : target);
  const frame = useRef<number | null>(null);
  const fromRef = useRef(0);

  useEffect(() => {
    if (!enabled || durationMs <= 0) {
      fromRef.current = target;
      setValue(target);
      return;
    }

    const from = fromRef.current;
    const startedAt = Date.now();

    const tick = () => {
      const elapsed = Date.now() - startedAt;
      const progress = Math.min(1, elapsed / durationMs);
      // easeOutCubic: fast start, gentle settle.
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(from + (target - from) * eased);

      if (progress < 1) {
        frame.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    };

    frame.current = requestAnimationFrame(tick);

    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [target, durationMs, enabled]);

  return value;
}

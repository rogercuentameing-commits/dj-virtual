/**
 * useVuMeter — samples the master analyser on an animation frame and returns
 * a smoothed 0..1 level for the VU meter.
 */

import { audioEngine } from "@/audio/engine";
import { useEffect, useRef, useState } from "react";

export function useVuMeter(active: boolean): number {
  const [level, setLevel] = useState(0);
  const smoothedRef = useRef(0);

  useEffect(() => {
    if (!active) {
      smoothedRef.current = 0;
      setLevel(0);
      return;
    }
    let frame = 0;
    const tick = () => {
      const raw = audioEngine.getLevel();
      // Attack fast, release slow for a natural meter feel.
      const previous = smoothedRef.current;
      const next = raw > previous ? raw : previous * 0.85 + raw * 0.15;
      smoothedRef.current = next;
      setLevel(next);
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [active]);

  return level;
}

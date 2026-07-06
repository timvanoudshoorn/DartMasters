import React, { useEffect, useRef, useState } from 'react';
import { StyleProp, Text, TextStyle } from 'react-native';

interface CountUpProps {
  /** Final value. Non-numeric strings render as-is without animating. */
  value: number | string;
  duration?: number;
  delay?: number;
  /** Formats the in-flight number, e.g. (n) => n.toFixed(1). */
  format?: (n: number) => string;
  style?: StyleProp<TextStyle>;
}

/** Eased count-up for stat reveals — numbers land, they don't just appear. */
export function CountUp({ value, duration = 700, delay = 0, format, style }: CountUpProps) {
  const target = typeof value === 'number' ? value : NaN;
  const animatable = Number.isFinite(target);
  const [display, setDisplay] = useState(animatable ? 0 : value);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (!animatable) {
      setDisplay(value);
      return;
    }
    let start: number | null = null;
    const fmt = format ?? ((n: number) => String(Math.round(n)));

    const step = (now: number) => {
      if (start === null) start = now;
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(fmt(target * eased));
      if (t < 1) raf.current = requestAnimationFrame(step);
    };

    const timer = setTimeout(() => {
      raf.current = requestAnimationFrame(step);
    }, delay);

    return () => {
      clearTimeout(timer);
      if (raf.current !== null) cancelAnimationFrame(raf.current);
    };
  }, [value]);

  return <Text style={style}>{display}</Text>;
}

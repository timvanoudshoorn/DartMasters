import React, { useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { colors, fonts, radius, spacing } from '../../theme';
import { COLORS } from '../../theme/colors';

export interface TrendChartPoint {
  /** X position driver — typically a timestamp (ms). */
  x: number;
  y: number;
  /** Short label for the x-axis / tooltip, e.g. "Jul 12". */
  label: string;
}

interface TrendLineChartProps {
  data: TrendChartPoint[];
  height?: number;
  /** Formats the y value for axis labels and the tooltip. Defaults to 1 decimal. */
  valueFormat?: (n: number) => string;
  /** Accessible name for screen readers — describe what the chart shows. */
  accessibilityLabel: string;
}

const PADDING = { top: 20, right: 14, bottom: 26, left: 14 };

/**
 * Small reusable SVG line/area chart — one ember line over a low-opacity
 * ember fill, charcoal gridlines, warm neutral axis labels. Tap or drag along
 * the line to scrub a tooltip across points. No dual axes, no gradients.
 */
export function TrendLineChart({ data, height = 180, valueFormat, accessibilityLabel }: TrendLineChartProps) {
  const [width, setWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const fmt = valueFormat ?? ((n: number) => n.toFixed(1));

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const geometry = useMemo(() => {
    if (width <= 0 || data.length === 0) return null;
    const innerW = Math.max(1, width - PADDING.left - PADDING.right);
    const innerH = Math.max(1, height - PADDING.top - PADDING.bottom);

    const ys = data.map((d) => d.y);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    // Give the line breathing room instead of touching the frame edges.
    const span = maxY - minY || 1;
    const padY = span * 0.15;
    const lo = minY - padY;
    const hi = maxY + padY;

    const scaleX = (i: number) => PADDING.left + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
    const scaleY = (v: number) => PADDING.top + (1 - (v - lo) / (hi - lo)) * innerH;

    const points = data.map((d, i) => ({ px: scaleX(i), py: scaleY(d.y), d, i }));

    const linePath = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.px.toFixed(2)} ${p.py.toFixed(2)}`)
      .join(' ');

    const areaPath =
      `${linePath} ` +
      `L ${points[points.length - 1].px.toFixed(2)} ${(PADDING.top + innerH).toFixed(2)} ` +
      `L ${points[0].px.toFixed(2)} ${(PADDING.top + innerH).toFixed(2)} Z`;

    const gridY = [lo + (hi - lo) * 0.25, lo + (hi - lo) * 0.75].map(scaleY);

    return { points, linePath, areaPath, innerW, innerH, minY, maxY, gridY };
  }, [data, width, height]);

  const handleTouch = (evt: { nativeEvent: { locationX: number } }) => {
    if (!geometry || geometry.points.length === 0) return;
    const x = evt.nativeEvent.locationX;
    let nearest = 0;
    let nearestDist = Infinity;
    geometry.points.forEach((p) => {
      const dist = Math.abs(p.px - x);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = p.i;
      }
    });
    setActiveIndex(nearest);
  };

  const active = geometry && activeIndex !== null ? geometry.points[activeIndex] : null;

  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
      style={{ width: '100%' }}
    >
      <View
        onLayout={onLayout}
        style={{ height }}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={handleTouch}
        onResponderMove={handleTouch}
        onResponderRelease={() => setActiveIndex(null)}
      >
        {geometry && (
          <Svg width={width} height={height}>
            {geometry.gridY.map((gy, i) => (
              <Line
                key={i}
                x1={PADDING.left}
                x2={width - PADDING.right}
                y1={gy}
                y2={gy}
                stroke={COLORS.border}
                strokeWidth={1}
              />
            ))}
            <Path d={geometry.areaPath} fill={COLORS.accent} fillOpacity={0.14} stroke="none" />
            <Path
              d={geometry.linePath}
              fill="none"
              stroke={COLORS.accent}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {geometry.points.map((p) => {
              const isActive = p.i === activeIndex;
              const isLast = p.i === geometry.points.length - 1;
              const emphasize = isActive || isLast;
              return (
                <Circle
                  key={p.i}
                  cx={p.px}
                  cy={p.py}
                  r={emphasize ? 5 : 3}
                  fill={emphasize ? COLORS.accentHot : COLORS.card}
                  stroke={COLORS.accent}
                  strokeWidth={emphasize ? 2 : 1.5}
                />
              );
            })}
          </Svg>
        )}
      </View>

      {geometry && (
        <View style={styles.axisRow}>
          <Text style={styles.axisLabel}>{data[0]?.label}</Text>
          <Text style={styles.axisLabel}>{data[data.length - 1]?.label}</Text>
        </View>
      )}

      {active && (
        <View style={styles.tooltip} pointerEvents="none">
          <Text style={styles.tooltipLabel}>{active.d.label}</Text>
          <Text style={styles.tooltipValue}>{fmt(active.d.y)}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  axisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: PADDING.left,
    marginTop: -spacing.sm,
  },
  axisLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    color: colors.textFaint,
  },
  tooltip: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
    backgroundColor: COLORS.card2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: COLORS.accentBorder,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  tooltipLabel: {
    fontFamily: fonts.bodySemibold,
    fontSize: 11,
    color: colors.textSecondary,
  },
  tooltipValue: {
    fontFamily: fonts.bodyExtraBold,
    fontSize: 13,
    color: colors.primaryHot,
  },
});

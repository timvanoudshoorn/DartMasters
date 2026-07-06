import React from 'react';
import { Circle, Line, Path, Svg } from 'react-native-svg';

interface DartboardLogoProps {
  size?: number;
}

const SECTOR_ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
const SECTOR_DEG = 18;

function point(angleDeg: number, r: number): [number, number] {
  const rad = (angleDeg * Math.PI) / 180;
  return [50 + r * Math.sin(rad), 50 - r * Math.cos(rad)];
}

function wedgePath(index: number, rInner: number, rOuter: number): string {
  const startAngle = index * SECTOR_DEG - SECTOR_DEG / 2;
  const endAngle = startAngle + SECTOR_DEG;
  const [x1o, y1o] = point(startAngle, rOuter);
  const [x2o, y2o] = point(endAngle, rOuter);
  if (rInner <= 0) {
    return `M 50 50 L ${x1o} ${y1o} A ${rOuter} ${rOuter} 0 0 1 ${x2o} ${y2o} Z`;
  }
  const [x1i, y1i] = point(startAngle, rInner);
  const [x2i, y2i] = point(endAngle, rInner);
  return `M ${x1i} ${y1i} L ${x1o} ${y1o} A ${rOuter} ${rOuter} 0 0 1 ${x2o} ${y2o} L ${x2i} ${y2i} A ${rInner} ${rInner} 0 0 0 ${x1i} ${y1i} Z`;
}

function Ring({ rInner, rOuter, altColors }: { rInner: number; rOuter: number; altColors: [string, string] }) {
  return (
    <>
      {SECTOR_ORDER.map((_, i) => (
        <Path key={i} d={wedgePath(i, rInner, rOuter)} fill={altColors[i % 2]} />
      ))}
    </>
  );
}

export function DartboardLogo({ size = 44 }: DartboardLogoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Circle cx={50} cy={50} r={49} fill="#111" />
      <Ring rInner={34} rOuter={42} altColors={['#1a1a1a', '#e8d9b0']} />
      <Ring rInner={38} rOuter={42} altColors={['#CC2222', '#1A6B1A']} />
      <Ring rInner={22} rOuter={34} altColors={['#1a1a1a', '#e8d9b0']} />
      <Ring rInner={22} rOuter={26} altColors={['#CC2222', '#1A6B1A']} />
      <Ring rInner={10} rOuter={22} altColors={['#1a1a1a', '#e8d9b0']} />
      <Circle cx={50} cy={50} r={9} fill="#1A6B1A" />
      <Circle cx={50} cy={50} r={5} fill="#CC2222" />
      <Circle cx={50} cy={50} r={2} fill="#ffffff" opacity={0.9} />
      <Circle cx={50} cy={50} r={42} stroke="#2a2a2a" strokeWidth={0.6} fill="none" />
      <Circle cx={50} cy={50} r={34} stroke="#2a2a2a" strokeWidth={0.6} fill="none" />
      <Circle cx={50} cy={50} r={22} stroke="#2a2a2a" strokeWidth={0.6} fill="none" />
      <Circle cx={50} cy={50} r={10} stroke="#2a2a2a" strokeWidth={0.6} fill="none" />
      {SECTOR_ORDER.map((_, i) => {
        const angle = i * SECTOR_DEG - SECTOR_DEG / 2;
        const [x, y] = point(angle, 42);
        return <Line key={i} x1={50} y1={50} x2={x} y2={y} stroke="#2a2a2a" strokeWidth={0.5} />;
      })}
    </Svg>
  );
}

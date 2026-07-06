import React from 'react';
import { Circle, Line, Path, Polygon, Rect, Svg } from 'react-native-svg';

export type IconName =
  | 'back'
  | 'close'
  | 'add'
  | 'addCircle'
  | 'edit'
  | 'chevronRight'
  | 'undo'
  | 'checkmark'
  | 'trophy'
  | 'dartboard'
  | 'grid'
  | 'clock'
  | 'skull'
  | 'bolt'
  | 'pulse'
  | 'play'
  | 'users'
  | 'history'
  | 'stats'
  | 'inbox'
  | 'userAdd'
  | 'dartLogo'
  | 'flame'
  | 'delete'
  | 'settings'
  | 'home'
  | 'bell'
  | 'person'
  | 'robot'
  | 'medal'
  | 'camera';

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function Icon({ name, size = 24, color = '#FFFFFF', strokeWidth = 2 }: IconProps) {
  const common = {
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none' as const,
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {renderIcon(name, common, color)}
    </Svg>
  );
}

function renderIcon(
  name: IconName,
  common: { stroke: string; strokeWidth: number; strokeLinecap: 'round'; strokeLinejoin: 'round'; fill: 'none' },
  color: string
) {
  switch (name) {
    case 'back':
      return <Path d="M15 5 L8 12 L15 19" {...common} />;
    case 'close':
      return (
        <>
          <Line x1={6} y1={6} x2={18} y2={18} {...common} />
          <Line x1={18} y1={6} x2={6} y2={18} {...common} />
        </>
      );
    case 'add':
      return (
        <>
          <Line x1={12} y1={5} x2={12} y2={19} {...common} />
          <Line x1={5} y1={12} x2={19} y2={12} {...common} />
        </>
      );
    case 'addCircle':
      return (
        <>
          <Circle cx={12} cy={12} r={9} {...common} />
          <Line x1={12} y1={8.5} x2={12} y2={15.5} {...common} />
          <Line x1={8.5} y1={12} x2={15.5} y2={12} {...common} />
        </>
      );
    case 'edit':
      return (
        <>
          <Path d="M4 20 L4 16.5 L15.5 5 L19 8.5 L7.5 20 Z" {...common} />
          <Line x1={13} y1={7} x2={16.5} y2={10.5} {...common} />
        </>
      );
    case 'chevronRight':
      return <Path d="M9 5 L16 12 L9 19" {...common} />;
    case 'camera':
      return (
        <>
          <Path d="M4 8 L8 8 L9.5 5.5 L14.5 5.5 L16 8 L20 8 C20.5 8 21 8.5 21 9 L21 18 C21 18.5 20.5 19 20 19 L4 19 C3.5 19 3 18.5 3 18 L3 9 C3 8.5 3.5 8 4 8 Z" {...common} />
          <Circle cx={12} cy={13} r={3.5} {...common} />
        </>
      );
    case 'undo':
      return (
        <>
          <Path d="M6 9 L6 4 M6 9 L11 9" {...common} />
          <Path d="M6 9 C9 5 15 4 18 8 C21 12 19 18 13 19 C9.5 19.6 7 18 6 16" {...common} />
        </>
      );
    case 'checkmark':
      return <Path d="M5 13 L10 18 L19 6" {...common} />;
    case 'trophy':
      return (
        <>
          <Path d="M7 4 H17 V10 C17 13.5 14.5 16 12 16 C9.5 16 7 13.5 7 10 Z" {...common} />
          <Path d="M7 5.5 H4 C4 9 5.5 11 7.5 11" {...common} />
          <Path d="M17 5.5 H20 C20 9 18.5 11 16.5 11" {...common} />
          <Line x1={12} y1={16} x2={12} y2={19} {...common} />
          <Line x1={8.5} y1={20.5} x2={15.5} y2={20.5} {...common} />
        </>
      );
    case 'dartboard':
      return (
        <>
          <Circle cx={12} cy={12} r={9} {...common} />
          <Circle cx={12} cy={12} r={5.5} {...common} />
          <Circle cx={12} cy={12} r={2} fill={color} stroke="none" />
        </>
      );
    case 'grid':
      return (
        <>
          <Rect x={4} y={4} width={6.5} height={6.5} {...common} />
          <Rect x={13.5} y={4} width={6.5} height={6.5} {...common} />
          <Rect x={4} y={13.5} width={6.5} height={6.5} {...common} />
          <Rect x={13.5} y={13.5} width={6.5} height={6.5} {...common} />
        </>
      );
    case 'clock':
      return (
        <>
          <Circle cx={12} cy={12} r={9} {...common} />
          <Path d="M12 7 L12 12 L16 14.5" {...common} />
        </>
      );
    case 'skull':
      return (
        <>
          <Path d="M12 4 C7 4 5 7.5 5 11 C5 13.2 6 14.8 7 15.8 V18.5 H9.2 V16.5 H10.8 V18.5 H13.2 V16.5 H14.8 V18.5 H17 V15.8 C18 14.8 19 13.2 19 11 C19 7.5 17 4 12 4 Z" {...common} />
          <Circle cx={9} cy={11} r={1.4} fill={color} stroke="none" />
          <Circle cx={15} cy={11} r={1.4} fill={color} stroke="none" />
        </>
      );
    case 'bolt':
      return <Polygon points="13,3 6,14 11,14 9.5,21 18,10 12.5,10" {...common} />;
    case 'pulse':
      return <Path d="M3 12 H7 L9.5 5 L14 19 L16.5 12 H21" {...common} />;
    case 'play':
      return <Polygon points="6,4 20,12 6,20" fill={color} stroke="none" />;
    case 'users':
      return (
        <>
          <Circle cx={9} cy={8} r={3} {...common} />
          <Path d="M3 20 C3 16 5.5 14 9 14 C12.5 14 15 16 15 20" {...common} />
          <Circle cx={17} cy={9} r={2.4} {...common} />
          <Path d="M15.5 14.2 C18.5 14.5 21 16.3 21 20" {...common} />
        </>
      );
    case 'history':
      return (
        <>
          <Circle cx={12} cy={13} r={8} {...common} />
          <Path d="M12 9 L12 13 L15 15" {...common} />
          <Path d="M7 3 L4 6 M17 3 L20 6" {...common} />
        </>
      );
    case 'stats':
      return (
        <>
          <Line x1={5} y1={20} x2={5} y2={12} {...common} />
          <Line x1={12} y1={20} x2={12} y2={6} {...common} />
          <Line x1={19} y1={20} x2={19} y2={15} {...common} />
        </>
      );
    case 'inbox':
      return (
        <>
          <Path d="M4 12 L7 4 H17 L20 12" {...common} />
          <Path d="M4 12 V18 H20 V12 H15.5 C15.5 14 14 15.5 12 15.5 C10 15.5 8.5 14 8.5 12 Z" {...common} />
        </>
      );
    case 'userAdd':
      return (
        <>
          <Circle cx={10} cy={8} r={3.5} {...common} />
          <Path d="M3 20 C3 15.5 6 13 10 13 C12 13 13.7 13.7 15 15" {...common} />
          <Line x1={18} y1={9} x2={18} y2={15} {...common} />
          <Line x1={15} y1={12} x2={21} y2={12} {...common} />
        </>
      );
    case 'dartLogo':
      return (
        <>
          <Circle cx={12} cy={12} r={9.5} stroke={color} strokeWidth={1.4} fill="none" />
          <Circle cx={12} cy={12} r={6} stroke={color} strokeWidth={1.4} fill="none" />
          <Circle cx={12} cy={12} r={2.4} fill={color} stroke="none" />
          <Line x1={12} y1={1} x2={12} y2={4} {...common} strokeWidth={1.4} />
          <Line x1={12} y1={20} x2={12} y2={23} {...common} strokeWidth={1.4} />
          <Line x1={1} y1={12} x2={4} y2={12} {...common} strokeWidth={1.4} />
          <Line x1={20} y1={12} x2={23} y2={12} {...common} strokeWidth={1.4} />
        </>
      );
    case 'flame':
      return (
        <Path
          d="M12 2 C12 6 8 8 8 13 C8 16.5 10 19 12 19 C8 14 13 13 13 9 C16 11 17 14 17 16 C17 18.5 14.7 20.5 12 20.5 C8.5 20.5 6 17.5 6 14 C6 9 9 7 12 2 Z"
          {...common}
        />
      );
    case 'settings':
      return (
        <>
          <Circle cx={12} cy={12} r={5.2} {...common} />
          <Line x1={17.3} y1={12} x2={19.4} y2={12} {...common} strokeWidth={3} strokeLinecap="butt" />
          <Line x1={15.8} y1={15.8} x2={17.2} y2={17.2} {...common} strokeWidth={3} strokeLinecap="butt" />
          <Line x1={12} y1={17.3} x2={12} y2={19.4} {...common} strokeWidth={3} strokeLinecap="butt" />
          <Line x1={8.2} y1={15.8} x2={6.8} y2={17.2} {...common} strokeWidth={3} strokeLinecap="butt" />
          <Line x1={6.7} y1={12} x2={4.6} y2={12} {...common} strokeWidth={3} strokeLinecap="butt" />
          <Line x1={8.2} y1={8.2} x2={6.8} y2={6.8} {...common} strokeWidth={3} strokeLinecap="butt" />
          <Line x1={12} y1={6.7} x2={12} y2={4.6} {...common} strokeWidth={3} strokeLinecap="butt" />
          <Line x1={15.8} y1={8.2} x2={17.2} y2={6.8} {...common} strokeWidth={3} strokeLinecap="butt" />
        </>
      );
    case 'delete':
      return (
        <>
          <Line x1={5} y1={7} x2={19} y2={7} {...common} />
          <Path d="M8 7 V4.5 H16 V7" {...common} />
          <Path d="M7 7 L8 20 H16 L17 7" {...common} />
          <Line x1={10} y1={11} x2={10} y2={16} {...common} />
          <Line x1={14} y1={11} x2={14} y2={16} {...common} />
        </>
      );
    case 'home':
      return (
        <>
          <Path d="M4 11.5 L12 4.5 L20 11.5" {...common} />
          <Path d="M6 10 V19.5 H18 V10" {...common} />
          <Path d="M10 19.5 V14.5 H14 V19.5" {...common} />
        </>
      );
    case 'bell':
      return (
        <>
          <Path d="M7 10 C7 6 9 4 12 4 C15 4 17 6 17 10 C17 13.5 18 15 19 16.5 H5 C6 15 7 13.5 7 10 Z" {...common} />
          <Path d="M9.5 18.5 C9.5 19.9 10.6 21 12 21 C13.4 21 14.5 19.9 14.5 18.5" {...common} />
        </>
      );
    case 'person':
      return (
        <>
          <Circle cx={12} cy={8} r={4} {...common} />
          <Path d="M4 20 C4 15.5 7.5 13 12 13 C16.5 13 20 15.5 20 20" {...common} />
        </>
      );
    case 'medal':
      return (
        <>
          <Path d="M8 3 L5 10 L9.5 9 Z" {...common} />
          <Path d="M16 3 L19 10 L14.5 9 Z" {...common} />
          <Circle cx={12} cy={14} r={6} {...common} />
          <Circle cx={12} cy={14} r={2.6} {...common} />
        </>
      );
    case 'robot':
      return (
        <>
          <Rect x={5} y={9} width={14} height={11} rx={2.5} {...common} />
          <Line x1={12} y1={9} x2={12} y2={5} {...common} />
          <Circle cx={12} cy={3.5} r={1.4} fill={color} stroke="none" />
          <Circle cx={9} cy={14} r={1.4} fill={color} stroke="none" />
          <Circle cx={15} cy={14} r={1.4} fill={color} stroke="none" />
          <Line x1={9} y1={18} x2={15} y2={18} {...common} />
          <Line x1={2.5} y1={12} x2={5} y2={12} {...common} />
          <Line x1={19} y1={12} x2={21.5} y2={12} {...common} />
        </>
      );
    default:
      return null;
  }
}

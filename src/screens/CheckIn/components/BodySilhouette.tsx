import Svg, { Circle, Rect } from 'react-native-svg';
import type { BodyRegion } from '../CheckInContext';

const ACCENT = '#1D9E75';
const BASE = '#e2e8f0';
const STROKE = '#94a3b8';
const STROKE_SEL = '#15724f';

type Props = {
  view: 'front' | 'back';
  selected: BodyRegion[];
  onToggle: (r: BodyRegion) => void;
};

type RegionShape =
  | { kind: 'rect'; x: number; y: number; w: number; h: number; rx: number }
  | { kind: 'circle'; cx: number; cy: number; r: number };

function RegionEl({
  shape,
  selected,
  onPress,
}: {
  shape: RegionShape;
  selected: boolean;
  onPress: () => void;
}) {
  const fill = selected ? ACCENT : BASE;
  const stroke = selected ? STROKE_SEL : STROKE;
  const sw = selected ? 1.5 : 1;
  if (shape.kind === 'rect') {
    return (
      <Rect
        x={shape.x}
        y={shape.y}
        width={shape.w}
        height={shape.h}
        rx={shape.rx}
        fill={fill}
        stroke={stroke}
        strokeWidth={sw}
        onPress={onPress}
      />
    );
  }
  return (
    <Circle
      cx={shape.cx}
      cy={shape.cy}
      r={shape.r}
      fill={fill}
      stroke={stroke}
      strokeWidth={sw}
      onPress={onPress}
    />
  );
}

// Shared limb shapes — same coordinates for both views.
// `mirrored` is true when patient-left should be on the viewer's left
// (i.e. the back view), false for the front view.
function buildLimbs(mirrored: boolean): Record<string, RegionShape> {
  // Patient-left (viewer's right in front, viewer's left in back)
  const lx = mirrored ? 'low' : 'high';
  // viewer-left x-block: x=16..48
  // viewer-right x-block: x=152..184
  const VL = { ua: 16, e: 16, fa: 16, w: 16, hand: 11 };
  const VR = { ua: 152, e: 152, fa: 152, w: 152, hand: 157 };

  const leftBlock = lx === 'low' ? VL : VR;
  const rightBlock = lx === 'low' ? VR : VL;

  // Hand has wider tap target
  return {
    left_shoulder: { kind: 'circle', cx: lx === 'low' ? 50 : 150, cy: 88, r: 16 },
    right_shoulder: { kind: 'circle', cx: lx === 'low' ? 150 : 50, cy: 88, r: 16 },
    left_upper_arm: { kind: 'rect', x: leftBlock.ua, y: 96, w: 26, h: 56, rx: 13 },
    right_upper_arm: { kind: 'rect', x: rightBlock.ua, y: 96, w: 26, h: 56, rx: 13 },
    left_elbow: { kind: 'rect', x: leftBlock.e, y: 154, w: 26, h: 18, rx: 9 },
    right_elbow: { kind: 'rect', x: rightBlock.e, y: 154, w: 26, h: 18, rx: 9 },
    left_forearm: { kind: 'rect', x: leftBlock.fa, y: 174, w: 26, h: 54, rx: 13 },
    right_forearm: { kind: 'rect', x: rightBlock.fa, y: 174, w: 26, h: 54, rx: 13 },
    left_wrist: { kind: 'rect', x: leftBlock.w, y: 230, w: 26, h: 14, rx: 7 },
    right_wrist: { kind: 'rect', x: rightBlock.w, y: 230, w: 26, h: 14, rx: 7 },
    left_hand: { kind: 'rect', x: leftBlock.hand, y: 246, w: 36, h: 38, rx: 10 },
    right_hand: { kind: 'rect', x: rightBlock.hand, y: 246, w: 36, h: 38, rx: 10 },
    // Legs — viewer-left x = 56, viewer-right x = 104
    left_thigh: { kind: 'rect', x: lx === 'low' ? 104 : 56, y: 208, w: 40, h: 80, rx: 14 },
    right_thigh: { kind: 'rect', x: lx === 'low' ? 56 : 104, y: 208, w: 40, h: 80, rx: 14 },
    left_knee: { kind: 'rect', x: lx === 'low' ? 104 : 56, y: 290, w: 40, h: 22, rx: 11 },
    right_knee: { kind: 'rect', x: lx === 'low' ? 56 : 104, y: 290, w: 40, h: 22, rx: 11 },
    left_lower_leg: { kind: 'rect', x: lx === 'low' ? 104 : 56, y: 314, w: 40, h: 86, rx: 14 },
    right_lower_leg: { kind: 'rect', x: lx === 'low' ? 56 : 104, y: 314, w: 40, h: 86, rx: 14 },
    left_foot: { kind: 'rect', x: lx === 'low' ? 100 : 50, y: 402, w: 50, h: 26, rx: 12 },
    right_foot: { kind: 'rect', x: lx === 'low' ? 50 : 100, y: 402, w: 50, h: 26, rx: 12 },
  };
}

export function BodySilhouette({ view, selected, onToggle }: Props) {
  const isSel = (r: BodyRegion) => selected.includes(r);

  const limbs = buildLimbs(view === 'back');

  // Common shapes
  const head: RegionShape = { kind: 'circle', cx: 100, cy: 38, r: 28 };
  const neck: RegionShape = { kind: 'rect', x: 86, y: 62, w: 28, h: 16, rx: 8 };

  // Front torso (chest + abdomen) and back torso (upper + lower back)
  const torsoUpper: RegionShape = { kind: 'rect', x: 56, y: 80, w: 88, h: 60, rx: 13 };
  const torsoLower: RegionShape = { kind: 'rect', x: 60, y: 142, w: 80, h: 60, rx: 11 };

  // Order matters — draw torso first, then shoulders on top so shoulders are tappable.
  const limbOrder: BodyRegion[] = [
    'left_shoulder',
    'right_shoulder',
    'left_upper_arm',
    'right_upper_arm',
    'left_elbow',
    'right_elbow',
    'left_forearm',
    'right_forearm',
    'left_wrist',
    'right_wrist',
    'left_hand',
    'right_hand',
    'left_thigh',
    'right_thigh',
    'left_knee',
    'right_knee',
    'left_lower_leg',
    'right_lower_leg',
    'left_foot',
    'right_foot',
  ];

  return (
    <Svg viewBox="0 0 200 440" width="100%" height="100%">
      <RegionEl
        shape={head}
        selected={isSel('head')}
        onPress={() => onToggle('head')}
      />
      <RegionEl
        shape={neck}
        selected={isSel('neck')}
        onPress={() => onToggle('neck')}
      />
      {view === 'front' ? (
        <>
          <RegionEl
            shape={torsoUpper}
            selected={isSel('chest')}
            onPress={() => onToggle('chest')}
          />
          <RegionEl
            shape={torsoLower}
            selected={isSel('abdomen')}
            onPress={() => onToggle('abdomen')}
          />
        </>
      ) : (
        <>
          <RegionEl
            shape={torsoUpper}
            selected={isSel('upper_back')}
            onPress={() => onToggle('upper_back')}
          />
          <RegionEl
            shape={torsoLower}
            selected={isSel('lower_back')}
            onPress={() => onToggle('lower_back')}
          />
        </>
      )}
      {limbOrder.map((r) => (
        <RegionEl
          key={r}
          shape={limbs[r]}
          selected={isSel(r)}
          onPress={() => onToggle(r)}
        />
      ))}
    </Svg>
  );
}

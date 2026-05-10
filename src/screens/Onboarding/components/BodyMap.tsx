import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Ellipse, G, Path, Rect, Text as SvgText } from 'react-native-svg';
import {
  COLORS,
  type BodyRegion,
  type BodyView,
  type RegionSensations,
} from '../../../types/onboarding';

type RegionShape =
  | { kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number }
  | { kind: 'rect'; x: number; y: number; width: number; height: number; rx?: number };

interface RegionDef {
  name: BodyRegion;
  shape: RegionShape;
}

const VIEWBOX_W = 200;
const VIEWBOX_H = 320;

const FRONT_REGIONS: RegionDef[] = [
  { name: 'head', shape: { kind: 'ellipse', cx: 100, cy: 28, rx: 18, ry: 22 } },
  { name: 'neck', shape: { kind: 'rect', x: 92, y: 48, width: 16, height: 12, rx: 4 } },
  { name: 'right shoulder', shape: { kind: 'ellipse', cx: 73, cy: 68, rx: 13, ry: 11 } },
  { name: 'left shoulder', shape: { kind: 'ellipse', cx: 127, cy: 68, rx: 13, ry: 11 } },
  { name: 'chest', shape: { kind: 'rect', x: 82, y: 64, width: 36, height: 38, rx: 10 } },
  { name: 'abdomen', shape: { kind: 'rect', x: 82, y: 104, width: 36, height: 40, rx: 8 } },
  { name: 'right upper arm', shape: { kind: 'rect', x: 58, y: 78, width: 12, height: 36, rx: 5 } },
  { name: 'left upper arm', shape: { kind: 'rect', x: 130, y: 78, width: 12, height: 36, rx: 5 } },
  { name: 'right elbow', shape: { kind: 'ellipse', cx: 64, cy: 118, rx: 8, ry: 6 } },
  { name: 'left elbow', shape: { kind: 'ellipse', cx: 136, cy: 118, rx: 8, ry: 6 } },
  { name: 'right forearm', shape: { kind: 'rect', x: 58, y: 126, width: 12, height: 32, rx: 5 } },
  { name: 'left forearm', shape: { kind: 'rect', x: 130, y: 126, width: 12, height: 32, rx: 5 } },
  { name: 'right wrist', shape: { kind: 'ellipse', cx: 64, cy: 162, rx: 7, ry: 5 } },
  { name: 'left wrist', shape: { kind: 'ellipse', cx: 136, cy: 162, rx: 7, ry: 5 } },
  { name: 'right hand', shape: { kind: 'ellipse', cx: 62, cy: 178, rx: 10, ry: 12 } },
  { name: 'left hand', shape: { kind: 'ellipse', cx: 138, cy: 178, rx: 10, ry: 12 } },
  { name: 'right thigh', shape: { kind: 'rect', x: 80, y: 148, width: 18, height: 56, rx: 8 } },
  { name: 'left thigh', shape: { kind: 'rect', x: 102, y: 148, width: 18, height: 56, rx: 8 } },
  { name: 'right knee', shape: { kind: 'ellipse', cx: 89, cy: 212, rx: 9, ry: 7 } },
  { name: 'left knee', shape: { kind: 'ellipse', cx: 111, cy: 212, rx: 9, ry: 7 } },
  { name: 'right lower leg', shape: { kind: 'rect', x: 81, y: 222, width: 16, height: 50, rx: 6 } },
  { name: 'left lower leg', shape: { kind: 'rect', x: 103, y: 222, width: 16, height: 50, rx: 6 } },
  { name: 'right foot', shape: { kind: 'ellipse', cx: 89, cy: 282, rx: 11, ry: 8 } },
  { name: 'left foot', shape: { kind: 'ellipse', cx: 111, cy: 282, rx: 11, ry: 8 } },
];

const BACK_REGIONS: RegionDef[] = [
  { name: 'head', shape: { kind: 'ellipse', cx: 100, cy: 28, rx: 18, ry: 22 } },
  { name: 'neck', shape: { kind: 'rect', x: 92, y: 48, width: 16, height: 12, rx: 4 } },
  { name: 'left shoulder', shape: { kind: 'ellipse', cx: 73, cy: 68, rx: 13, ry: 11 } },
  { name: 'right shoulder', shape: { kind: 'ellipse', cx: 127, cy: 68, rx: 13, ry: 11 } },
  { name: 'upper back', shape: { kind: 'rect', x: 82, y: 64, width: 36, height: 38, rx: 10 } },
  { name: 'lower back', shape: { kind: 'rect', x: 82, y: 104, width: 36, height: 40, rx: 8 } },
  { name: 'left upper arm', shape: { kind: 'rect', x: 58, y: 78, width: 12, height: 36, rx: 5 } },
  { name: 'right upper arm', shape: { kind: 'rect', x: 130, y: 78, width: 12, height: 36, rx: 5 } },
  { name: 'left elbow', shape: { kind: 'ellipse', cx: 64, cy: 118, rx: 8, ry: 6 } },
  { name: 'right elbow', shape: { kind: 'ellipse', cx: 136, cy: 118, rx: 8, ry: 6 } },
  { name: 'left forearm', shape: { kind: 'rect', x: 58, y: 126, width: 12, height: 32, rx: 5 } },
  { name: 'right forearm', shape: { kind: 'rect', x: 130, y: 126, width: 12, height: 32, rx: 5 } },
  { name: 'left wrist', shape: { kind: 'ellipse', cx: 64, cy: 162, rx: 7, ry: 5 } },
  { name: 'right wrist', shape: { kind: 'ellipse', cx: 136, cy: 162, rx: 7, ry: 5 } },
  { name: 'left hand', shape: { kind: 'ellipse', cx: 62, cy: 178, rx: 10, ry: 12 } },
  { name: 'right hand', shape: { kind: 'ellipse', cx: 138, cy: 178, rx: 10, ry: 12 } },
  { name: 'left thigh', shape: { kind: 'rect', x: 80, y: 148, width: 18, height: 56, rx: 8 } },
  { name: 'right thigh', shape: { kind: 'rect', x: 102, y: 148, width: 18, height: 56, rx: 8 } },
  { name: 'left knee', shape: { kind: 'ellipse', cx: 89, cy: 212, rx: 9, ry: 7 } },
  { name: 'right knee', shape: { kind: 'ellipse', cx: 111, cy: 212, rx: 9, ry: 7 } },
  { name: 'left lower leg', shape: { kind: 'rect', x: 81, y: 222, width: 16, height: 50, rx: 6 } },
  { name: 'right lower leg', shape: { kind: 'rect', x: 103, y: 222, width: 16, height: 50, rx: 6 } },
  { name: 'left foot', shape: { kind: 'ellipse', cx: 89, cy: 282, rx: 11, ry: 8 } },
  { name: 'right foot', shape: { kind: 'ellipse', cx: 111, cy: 282, rx: 11, ry: 8 } },
];

const SILHOUETTE_PATH =
  'M100 8 ' +
  'C 113 8, 122 18, 122 30 ' +
  'C 122 42, 113 50, 100 50 ' +
  'C 87 50, 78 42, 78 30 ' +
  'C 78 18, 87 8, 100 8 ' +
  'Z ' +
  'M 90 50 L 110 50 L 112 60 L 88 60 Z ' +
  'M 60 60 ' +
  'L 140 60 ' +
  'C 148 62, 150 70, 148 78 ' +
  'L 144 110 ' +
  'L 144 160 ' +
  'C 144 164, 142 168, 138 170 ' +
  'L 130 195 ' +
  'L 130 75 ' +
  'L 70 75 ' +
  'L 70 195 ' +
  'L 62 170 ' +
  'C 58 168, 56 164, 56 160 ' +
  'L 56 110 ' +
  'L 52 78 ' +
  'C 50 70, 52 62, 60 60 ' +
  'Z';

function getCenter(shape: RegionShape): { x: number; y: number } {
  if (shape.kind === 'ellipse') return { x: shape.cx, y: shape.cy };
  return { x: shape.x + shape.width / 2, y: shape.y + shape.height / 2 };
}

function getBadgeAnchor(shape: RegionShape): { x: number; y: number } {
  if (shape.kind === 'ellipse') {
    return {
      x: shape.cx + shape.rx * 0.65,
      y: shape.cy - shape.ry * 0.65,
    };
  }
  return { x: shape.x + shape.width - 2, y: shape.y + 2 };
}

interface Props {
  view: BodyView;
  selections: RegionSensations;
  onRegionPress: (region: BodyRegion) => void;
}

export function BodyMap({ view, selections, onRegionPress }: Props) {
  const regions = view === 'front' ? FRONT_REGIONS : BACK_REGIONS;

  return (
    <View style={styles.wrap}>
      <Svg
        viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
      >
        <Path
          d={SILHOUETTE_PATH}
          fill={COLORS.surface}
          stroke={COLORS.border}
          strokeWidth={1.5}
        />

        {regions.map((region) => {
          const sens = selections[region.name];
          const isSelected = !!sens && sens.length > 0;
          const fill = isSelected ? COLORS.primary : 'rgba(203,213,225,0.35)';
          const stroke = isSelected ? COLORS.primary : COLORS.border;
          const strokeWidth = isSelected ? 1.5 : 1;
          const onPress = () => onRegionPress(region.name);

          if (region.shape.kind === 'ellipse') {
            return (
              <Ellipse
                key={region.name}
                cx={region.shape.cx}
                cy={region.shape.cy}
                rx={region.shape.rx}
                ry={region.shape.ry}
                fill={fill}
                stroke={stroke}
                strokeWidth={strokeWidth}
                onPress={onPress}
              />
            );
          }
          return (
            <Rect
              key={region.name}
              x={region.shape.x}
              y={region.shape.y}
              width={region.shape.width}
              height={region.shape.height}
              rx={region.shape.rx ?? 4}
              ry={region.shape.rx ?? 4}
              fill={fill}
              stroke={stroke}
              strokeWidth={strokeWidth}
              onPress={onPress}
            />
          );
        })}

        {regions.map((region) => {
          const sens = selections[region.name];
          if (!sens || sens.length === 0) return null;
          const anchor = getBadgeAnchor(region.shape);
          return (
            <G key={`badge-${region.name}`} pointerEvents="none">
              <Ellipse
                cx={anchor.x}
                cy={anchor.y}
                rx={6}
                ry={6}
                fill="#ffffff"
                stroke={COLORS.primary}
                strokeWidth={1.5}
              />
              <SvgText
                x={anchor.x}
                y={anchor.y + 3}
                fontSize={8}
                fontWeight="700"
                fill={COLORS.primary}
                textAnchor="middle"
              >
                {sens.length}
              </SvgText>
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

export { getCenter };

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    aspectRatio: VIEWBOX_W / VIEWBOX_H,
    alignSelf: 'center',
  },
});

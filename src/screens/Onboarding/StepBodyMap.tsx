import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, { Image, Polygon, G } from 'react-native-svg';
import { COLORS } from '../../types/onboarding';
import { type CategoryCode } from '../../data/questionBank';
import { useOnboarding } from './OnboardingContext';
import { StepLayout } from './components/StepLayout';

// ─── Original image dimensions (px) ────────────────────────────────────────
const IMG_W = 720;
const IMG_H = 789;

// ─── Body part definitions ──────────────────────────────────────────────────
interface BodyPart {
  key: string;
  label: string;
  coords: number[]; // flat [x0,y0, x1,y1, ...]
}

const BODY_PARTS: BodyPart[] = [
  // ── FRONT ──────────────────────────────────────────────────────────────
  { key: '2',  label: 'Head',                 coords: [198,23,175,31,165,78,188,112,212,113,234,72,224,28] },
  { key: '1',  label: 'Maxillofacial',         coords: [220,58,180,58,182,84,199,107,218,82] },
  { key: '3',  label: 'Neck',                  coords: [219,105,225,125,245,135,153,137,175,124,179,103,189,112,206,115] },
  { key: '20', label: 'Right Shoulder',        coords: [153,136,122,145,121,174,146,184] },
  { key: '26', label: 'Left Shoulder',         coords: [246,134,273,144,279,173,253,182] },
  { key: '4',  label: 'Chest',                 coords: [154,138,244,135,253,184,249,267,199,226,152,264,147,182] },
  { key: '10', label: 'Abdominal',             coords: [250,268,254,292,199,312,145,290,149,268,199,230] },
  { key: '9',  label: 'Pelvis',                coords: [254,293,256,313,201,367,140,315,145,291,199,311] },
  { key: '14', label: 'Left Hip',              coords: [258,313,260,344,204,368,215,353] },
  { key: '15', label: 'Right Hip',             coords: [141,316,139,349,196,370,185,354] },
  { key: '27', label: 'Left Femur/Thigh',      coords: [202,369,260,345,259,443,215,457] },
  { key: '21', label: 'Right Femur/Thigh',     coords: [197,371,183,453,140,441,136,348] },
  { key: '39', label: 'Left Knee',             coords: [213,457,225,507,263,498,258,444] },
  { key: '33', label: 'Right Knee',            coords: [187,455,142,442,136,496,174,505] },
  { key: '34', label: 'Right Tib/Fib',         coords: [174,505,137,497,128,533,144,604,161,605,172,548] },
  { key: '38', label: 'Left Tib/Fib',          coords: [226,506,226,544,237,597,257,598,268,544,265,498,244,504] },
  { key: '42', label: 'Left Ankle',            coords: [238,598,255,598,256,631,231,633] },
  { key: '35', label: 'Right Ankle',           coords: [163,604,145,605,143,634,167,634] },
  { key: '36', label: 'Right Foot',            coords: [143,633,136,680,156,697,173,692,168,636] },
  { key: '37', label: 'Left Foot',             coords: [230,633,225,692,246,698,261,680,257,631] },
  { key: '32', label: 'Right Humerus',         coords: [146,185,148,222,142,250,115,240,123,196,120,175] },
  { key: '22', label: 'Right Elbow',           coords: [117,240,142,250,140,275,110,263] },
  { key: '23', label: 'Right Forearm',         coords: [140,276,123,317,103,308,106,292,109,264] },
  { key: '24', label: 'Right Wrist',           coords: [124,319,117,337,95,323,103,309] },
  { key: '25', label: 'Right Hand',            coords: [117,337,107,378,89,388,75,377,85,343,71,346,80,330,94,323] },
  { key: '40', label: 'Left Humerus',          coords: [278,174,279,194,283,237,256,249,253,218,254,180] },
  { key: '29', label: 'Left Elbow',            coords: [290,261,281,240,256,249,258,274] },
  { key: '28', label: 'Left Forearm',          coords: [261,274,290,261,297,308,276,320] },
  { key: '31', label: 'Left Wrist',            coords: [284,340,279,319,296,309,305,321] },
  { key: '30', label: 'Left Hand',             coords: [285,341,304,322,317,327,333,351,317,342,324,379,309,389,291,377] },
  // ── BACK ───────────────────────────────────────────────────────────────
  { key: '19', label: 'Skull/Brain',           coords: [462,29,454,73,469,93,515,92,527,74,515,29,491,13] },
  { key: '41', label: 'Spine',                 coords: [480,101,481,313,498,312,499,100] },
  { key: '17', label: 'Right Shoulder (Back)', coords: [566,141,541,195,498,196,500,106] },
  { key: '18', label: 'Left Shoulder (Back)',  coords: [480,109,415,140,438,197,480,196] },
  { key: '5',  label: 'Back',                  coords: [542,196,539,244,549,312,432,311,439,249,438,197] },
  { key: '16', label: 'Buttocks',              coords: [548,312,430,313,426,366,554,366] },
  { key: '11', label: 'Right Arm (Back)',      coords: [566,143,545,189,543,207,550,269,574,329,584,372,607,385,615,374,622,338,597,315,585,288,576,238,569,190] },
  { key: '8',  label: 'Left Arm (Back)',       coords: [398,373,377,383,368,376,360,343,371,324,392,311,397,269,405,238,410,193,408,160,416,141,437,197,430,240,429,263,408,320,399,352] },
  { key: '7',  label: 'Right Leg (Back)',      coords: [494,366,494,387,506,428,505,464,517,500,517,536,528,590,518,665,524,695,553,682,546,607,562,529,552,475,550,435,555,365] },
  { key: '12', label: 'Left Leg (Back)',       coords: [486,367,426,367,427,442,428,475,417,527,433,602,432,634,425,675,446,695,464,684,459,629,450,596,464,539,463,497,474,472,478,423] },
];

// Convert flat coord array → SVG points string, scaled to display size
function toPoints(coords: number[], scale: number): string {
  const pairs: string[] = [];
  for (let i = 0; i < coords.length; i += 2) {
    pairs.push(`${coords[i] * scale},${coords[i + 1] * scale}`);
  }
  return pairs.join(' ');
}

const BODY_PART_CATEGORY_MAP: Record<string, CategoryCode> = {
  '1': 'ENT',
  '2': 'NEUROLOGICAL',
  '3': 'NEUROLOGICAL',
  '4': 'CARDIOVASCULAR',
  '5': 'MUSCULOSKELETAL',
  '9': 'GASTROINTESTINAL',
  '10': 'GASTROINTESTINAL',
  '11': 'MUSCULOSKELETAL',
  '14': 'MUSCULOSKELETAL',
  '15': 'MUSCULOSKELETAL',
  '16': 'GASTROINTESTINAL',
  '17': 'MUSCULOSKELETAL',
  '18': 'MUSCULOSKELETAL',
  '19': 'NEUROLOGICAL',
  '20': 'MUSCULOSKELETAL',
  '21': 'MUSCULOSKELETAL',
  '22': 'MUSCULOSKELETAL',
  '23': 'MUSCULOSKELETAL',
  '24': 'MUSCULOSKELETAL',
  '25': 'MUSCULOSKELETAL',
  '26': 'MUSCULOSKELETAL',
  '27': 'MUSCULOSKELETAL',
  '28': 'MUSCULOSKELETAL',
  '29': 'MUSCULOSKELETAL',
  '30': 'MUSCULOSKELETAL',
  '31': 'MUSCULOSKELETAL',
  '32': 'MUSCULOSKELETAL',
  '33': 'MUSCULOSKELETAL',
  '34': 'MUSCULOSKELETAL',
  '35': 'MUSCULOSKELETAL',
  '36': 'MUSCULOSKELETAL',
  '37': 'MUSCULOSKELETAL',
  '38': 'MUSCULOSKELETAL',
  '39': 'MUSCULOSKELETAL',
  '40': 'MUSCULOSKELETAL',
  '41': 'MUSCULOSKELETAL',
  '42': 'MUSCULOSKELETAL',
};

// Maps body part keys → which chief complaint option IDs are relevant
const BODY_PART_TO_CHIEF_OPTIONS: Record<string, string[]> = {
  '2':  ['g'],           // Head → Neurological
  '1':  ['l'],           // Maxillofacial → ENT
  '3':  ['l', 'g'],      // Neck → ENT, Neurological
  '19': ['g'],           // Skull/Brain → Neurological
  '4':  ['a', 'b', 'c'], // Chest → Cardiovascular, Respiratory, Pain
  '20': ['m', 'd'],      // Right Shoulder → Musculoskeletal, Trauma
  '26': ['m', 'd'],      // Left Shoulder → Musculoskeletal, Trauma
  '32': ['m', 'd'],      // Right Humerus → Musculoskeletal, Trauma
  '40': ['m', 'd'],      // Left Humerus → Musculoskeletal, Trauma
  '22': ['m', 'd'],      // Right Elbow → Musculoskeletal, Trauma
  '29': ['m', 'd'],      // Left Elbow → Musculoskeletal, Trauma
  '23': ['m', 'd'],      // Right Forearm → Musculoskeletal, Trauma
  '28': ['m', 'd'],      // Left Forearm → Musculoskeletal, Trauma
  '24': ['m', 'd'],      // Right Wrist → Musculoskeletal, Trauma
  '31': ['m', 'd'],      // Left Wrist → Musculoskeletal, Trauma
  '25': ['m', 'd'],      // Right Hand → Musculoskeletal, Trauma
  '30': ['m', 'd'],      // Left Hand → Musculoskeletal, Trauma
  '10': ['f', 'c'],      // Abdominal → Gastrointestinal, Pain
  '9':  ['f', 'k'],      // Pelvis → Gastrointestinal, Reproductive
  '14': ['m', 'k'],      // Left Hip → Musculoskeletal, Reproductive
  '15': ['m'],           // Right Hip → Musculoskeletal
  '27': ['m', 'd'],      // Left Femur/Thigh → Musculoskeletal, Trauma
  '21': ['m', 'd'],      // Right Femur/Thigh → Musculoskeletal, Trauma
  '39': ['m', 'd'],      // Left Knee → Musculoskeletal, Trauma
  '33': ['m', 'd'],      // Right Knee → Musculoskeletal, Trauma
  '38': ['m', 'd'],      // Left Tib/Fib → Musculoskeletal, Trauma
  '34': ['m', 'd'],      // Right Tib/Fib → Musculoskeletal, Trauma
  '42': ['m', 'd'],      // Left Ankle → Musculoskeletal, Trauma
  '35': ['m', 'd'],      // Right Ankle → Musculoskeletal, Trauma
  '37': ['m', 'd'],      // Left Foot → Musculoskeletal, Trauma
  '36': ['m', 'd'],      // Right Foot → Musculoskeletal, Trauma
  '41': ['m', 'd', 'c'], // Spine → Musculoskeletal, Trauma, Pain
  '5':  ['m', 'd', 'c'], // Back → Musculoskeletal, Trauma, Pain
  '16': ['f', 'm'],      // Buttocks → Gastrointestinal, Musculoskeletal
  '17': ['m', 'd'],      // Right Shoulder (Back) → Musculoskeletal, Trauma
  '18': ['m', 'd'],      // Left Shoulder (Back) → Musculoskeletal, Trauma
  '11': ['m', 'd'],      // Right Arm (Back) → Musculoskeletal, Trauma
  '8':  ['m', 'd'],      // Left Arm (Back) → Musculoskeletal, Trauma
  '7':  ['m', 'd'],      // Right Leg (Back) → Musculoskeletal, Trauma
  '12': ['m', 'd'],      // Left Leg (Back) → Musculoskeletal, Trauma
};

function getFilteredChiefOptions(selection: string[]): string[] {
  // Collect all relevant option IDs across selected body parts
  const relevant = new Set<string>();
  for (const key of selection) {
    const optIds = BODY_PART_TO_CHIEF_OPTIONS[key] ?? [];
    optIds.forEach(id => relevant.add(id));
  }
  // Always include 'o' (Other / not sure) as escape hatch
  relevant.add('o');
  return Array.from(relevant);
}

function inferCategoryFromBodyMap(selection: string[]): CategoryCode | null {
  const counts: Record<CategoryCode, number> = {} as Record<CategoryCode, number>;
  for (const key of selection) {
    const category = BODY_PART_CATEGORY_MAP[key];
    if (category) {
      counts[category] = (counts[category] ?? 0) + 1;
    }
  }
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return top ? (top[0] as CategoryCode) : null;
}

export function Step2bBodyMap() {
  const { state, updateBodyMap, setTriageCategory, setStep } = useOnboarding();
  const { width: screenWidth } = useWindowDimensions();

  // Scale SVG to fill available width
  const svgWidth = screenWidth - 32; // 16px padding each side
  const scale = svgWidth / IMG_W;
  const svgHeight = IMG_H * scale;

  const [selections, setSelections] = useState<Set<string>>(
    new Set(state.bodyMap ?? []),
  );

  const toggle = (key: string) => {
    setSelections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      updateBodyMap(Array.from(next));
      return next;
    });
  };

  const handleContinue = () => {
    const arr = Array.from(selections);
    updateBodyMap(arr);

    // Infer the primary category from selected body parts
    const category = inferCategoryFromBodyMap(arr);
    if (category) {
      setTriageCategory(category);
    }

    // Move to symptom questions (step 4)
    setStep(4);
  };

  const selectedLabels = BODY_PARTS
    .filter((p) => selections.has(p.key))
    .map((p) => p.label);

  return (
    <StepLayout
      step={3}
      title="Where does it hurt?"
      subtitle="Tap all the areas that are bothering you."
      onBack={() => setStep(2)}
      onContinue={handleContinue}
      continueDisabled={false}
      continueLabel={
        selections.size > 0
          ? `Continue (${selections.size} selected)`
          : 'Continue — nothing selected'
      }
    >
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* SVG body map: image + polygon overlays */}
        <Svg width={svgWidth} height={svgHeight}>
          <Image
            href={require('../../../assets/bodymap/img/males-1859518_960_720.jpg')}
            x={0}
            y={0}
            width={svgWidth}
            height={svgHeight}
            preserveAspectRatio="xMidYMid meet"
          />
          <G>
            {BODY_PARTS.map((part) => {
              const selected = selections.has(part.key);
              return (
                <Polygon
                  key={part.key}
                  points={toPoints(part.coords, scale)}
                  fill={selected ? COLORS.primary : '#00AAFF'}
                  fillOpacity={selected ? 0.45 : 0}
                  stroke={COLORS.primary}
                  strokeOpacity={selected ? 1 : 0}
                  strokeWidth={2 * scale}
                  onPress={() => toggle(part.key)}
                />
              );
            })}
          </G>
        </Svg>

        {/* Live selection chips */}
        {selectedLabels.length > 0 && (
          <View style={styles.chipsSection}>
            <Text style={styles.chipsLabel}>Selected areas:</Text>
            <View style={styles.chipsRow}>
              {selectedLabels.map((label) => (
                <View key={label} style={styles.chip}>
                  <Text style={styles.chipText}>{label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </StepLayout>
  );
}

const styles = StyleSheet.create({
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
    paddingBottom: 16,
    gap: 16,
  },
  chipsSection: {
    width: '100%',
    gap: 8,
  },
  chipsLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: COLORS.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
});

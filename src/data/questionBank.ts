// Local triage question bank. Transcribed from the hospital triage spec.
// All scoring is deterministic and runs on-device — no API calls.
// Section 17 (paediatric) and Section 20 (vitals — measured by staff) are
// intentionally omitted from the patient-facing flow.

export type CategoryCode =
  | 'CARDIOVASCULAR'
  | 'RESPIRATORY'
  | 'NEUROLOGICAL'
  | 'TRAUMA'
  | 'GASTROINTESTINAL'
  | 'INFECTIOUS'
  | 'PAIN'
  | 'MENTAL_HEALTH'
  | 'ALLERGIC'
  | 'DERMATOLOGICAL'
  | 'UROLOGICAL'
  | 'REPRODUCTIVE'
  | 'ENT'
  | 'MUSCULOSKELETAL'
  | 'OPHTHALMOLOGICAL'
  | 'ENDOCRINE'
  | 'PHARMACY'
  | 'GENERAL';

export type QuestionType = 'single' | 'multi' | 'scale';

export interface QuestionOption {
  id: string; // 'a', 'b', etc.
  label: string;
  weight: number; // 1-10
  route?: CategoryCode; // only on Q001 chief-complaint options
}

export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  options: QuestionOption[];
}

// ---------- SELF-RATED SEVERITY (always asked second) ----------
// Stored separately in triage state and only lightly weighted in the score
// (see src/lib/triage.ts). Each option carries weight 0 so it does not
// pollute max/mean signal weights drawn from the bank.

export const SEVERITY_QUESTION: Question = {
  id: 'QSEV',
  text: 'How severe does this feel right now?',
  type: 'scale',
  options: Array.from({ length: 10 }, (_, i) => ({
    id: String(i + 1),
    label: String(i + 1),
    weight: 0,
  })),
};

// ---------- SECTION 1: CHIEF COMPLAINT ----------

export const CHIEF_COMPLAINT: Question = {
  id: 'Q001',
  text: 'What is your main reason for coming in today?',
  type: 'single',
  options: [
    { id: 'a', label: 'Chest pain or heart concern', weight: 9, route: 'CARDIOVASCULAR' },
    { id: 'b', label: 'Difficulty breathing', weight: 9, route: 'RESPIRATORY' },
    { id: 'c', label: 'Severe pain', weight: 7, route: 'PAIN' },
    { id: 'd', label: 'Injury or trauma', weight: 8, route: 'TRAUMA' },
    { id: 'e', label: 'Fever or infection', weight: 5, route: 'INFECTIOUS' },
    { id: 'f', label: 'Stomach or digestive issue', weight: 5, route: 'GASTROINTESTINAL' },
    {
      id: 'g',
      label: 'Neurological symptom (headache, dizziness, confusion)',
      weight: 7,
      route: 'NEUROLOGICAL',
    },
    { id: 'h', label: 'Mental health concern', weight: 6, route: 'MENTAL_HEALTH' },
    { id: 'i', label: 'Skin, rash, or eye issue', weight: 3, route: 'DERMATOLOGICAL' },
    { id: 'j', label: 'Urinary or kidney concern', weight: 4, route: 'UROLOGICAL' },
    { id: 'k', label: 'Reproductive or pregnancy concern', weight: 6, route: 'REPRODUCTIVE' },
    { id: 'l', label: 'Ear, nose, or throat concern', weight: 3, route: 'ENT' },
    { id: 'm', label: 'Bone, joint, or muscle issue', weight: 4, route: 'MUSCULOSKELETAL' },
    { id: 'n', label: 'Medication or prescription need', weight: 2, route: 'PHARMACY' },
    { id: 'o', label: 'Other / not sure', weight: 3, route: 'GENERAL' },
  ],
};

// ---------- SECTION 2: CARDIOVASCULAR ----------

const CARDIOVASCULAR: Question[] = [
  {
    id: 'Q101',
    text: 'Where exactly is the chest pain located?',
    type: 'single',
    options: [
      { id: 'a', label: 'Centre of chest', weight: 9 },
      { id: 'b', label: 'Left side of chest', weight: 9 },
      { id: 'c', label: 'Right side of chest', weight: 7 },
      { id: 'd', label: 'Radiating to left arm', weight: 10 },
      { id: 'e', label: 'Radiating to jaw or neck', weight: 10 },
      { id: 'f', label: 'Radiating to back (between shoulders)', weight: 9 },
      { id: 'g', label: 'Upper abdomen / epigastric', weight: 7 },
    ],
  },
  {
    id: 'Q102',
    text: 'How would you describe the chest pain?',
    type: 'single',
    options: [
      { id: 'a', label: 'Crushing or squeezing', weight: 10 },
      { id: 'b', label: 'Sharp or stabbing', weight: 7 },
      { id: 'c', label: 'Burning or pressure', weight: 8 },
      { id: 'd', label: 'Tearing or ripping', weight: 10 },
      { id: 'e', label: 'Dull ache', weight: 6 },
      { id: 'f', label: 'Tightness', weight: 8 },
    ],
  },
  {
    id: 'Q103',
    text: 'How long has the chest pain been present?',
    type: 'single',
    options: [
      { id: 'a', label: 'Started right now (< 5 minutes)', weight: 10 },
      { id: 'b', label: 'Less than 1 hour', weight: 10 },
      { id: 'c', label: '1–6 hours', weight: 9 },
      { id: 'd', label: '6–24 hours', weight: 8 },
      { id: 'e', label: 'More than 24 hours', weight: 6 },
    ],
  },
  {
    id: 'Q104',
    text: 'Are you experiencing any of these alongside the chest pain?',
    type: 'multi',
    options: [
      { id: 'a', label: 'Sweating / diaphoresis', weight: 10 },
      { id: 'b', label: 'Nausea or vomiting', weight: 8 },
      { id: 'c', label: 'Shortness of breath', weight: 10 },
      { id: 'd', label: 'Light-headedness or dizziness', weight: 9 },
      { id: 'e', label: 'Feeling of impending doom', weight: 10 },
      { id: 'f', label: 'Palpitations / racing heart', weight: 8 },
      { id: 'g', label: 'Fainting or near-fainting', weight: 9 },
      { id: 'h', label: 'None of the above', weight: 4 },
    ],
  },
  {
    id: 'Q105',
    text: 'Do you have a history of any of these?',
    type: 'multi',
    options: [
      { id: 'a', label: 'Previous heart attack', weight: 9 },
      { id: 'b', label: 'Angina', weight: 8 },
      { id: 'c', label: 'Coronary artery disease', weight: 8 },
      { id: 'd', label: 'Heart failure', weight: 8 },
      { id: 'e', label: 'Blood clot (DVT / PE)', weight: 8 },
      { id: 'f', label: 'High blood pressure', weight: 6 },
      { id: 'g', label: 'Diabetes', weight: 6 },
      { id: 'h', label: 'High cholesterol', weight: 5 },
      { id: 'i', label: 'None', weight: 1 },
    ],
  },
  {
    id: 'Q106',
    text: 'Is your heart beating irregularly right now?',
    type: 'single',
    options: [
      { id: 'a', label: 'Yes — racing (very fast)', weight: 8 },
      { id: 'b', label: 'Yes — very slow', weight: 8 },
      { id: 'c', label: 'Yes — skipping beats', weight: 7 },
      { id: 'd', label: 'Yes — fluttering feeling', weight: 7 },
      { id: 'e', label: 'No — seems normal', weight: 1 },
    ],
  },
  {
    id: 'Q107',
    text: 'Have you fainted or lost consciousness?',
    type: 'single',
    options: [
      { id: 'a', label: 'Yes — currently unresponsive', weight: 10 },
      { id: 'b', label: 'Yes — regained consciousness', weight: 9 },
      { id: 'c', label: 'Nearly fainted', weight: 8 },
      { id: 'd', label: 'No', weight: 1 },
    ],
  },
  {
    id: 'Q108',
    text: 'Do you have swelling in your legs or ankles?',
    type: 'single',
    options: [
      { id: 'a', label: 'Yes — both legs, severe', weight: 8 },
      { id: 'b', label: 'Yes — one leg, sudden onset', weight: 9 },
      { id: 'c', label: 'Yes — mild, gradual onset', weight: 5 },
      { id: 'd', label: 'No', weight: 1 },
    ],
  },
  {
    id: 'Q109',
    text: 'Are you currently short of breath while sitting still?',
    type: 'single',
    options: [
      { id: 'a', label: 'Yes — severely, cannot speak full sentences', weight: 10 },
      { id: 'b', label: 'Yes — moderately', weight: 8 },
      { id: 'c', label: 'Only on exertion', weight: 6 },
      { id: 'd', label: 'No', weight: 1 },
    ],
  },
];

// ---------- SECTION 3: RESPIRATORY ----------

const RESPIRATORY: Question[] = [
  {
    id: 'Q201',
    text: 'How severe is your difficulty breathing right now?',
    type: 'single',
    options: [
      { id: 'a', label: 'Cannot breathe at all', weight: 10 },
      { id: 'b', label: 'Very severe — can only say a few words', weight: 10 },
      { id: 'c', label: 'Moderate — short sentences', weight: 8 },
      { id: 'd', label: 'Mild — present but manageable', weight: 6 },
    ],
  },
  {
    id: 'Q202',
    text: 'When did the breathing difficulty start?',
    type: 'single',
    options: [
      { id: 'a', label: 'Sudden onset (seconds to minutes)', weight: 10 },
      { id: 'b', label: 'Within the last hour', weight: 9 },
      { id: 'c', label: 'Gradually over hours', weight: 7 },
      { id: 'd', label: 'Over days', weight: 5 },
    ],
  },
  {
    id: 'Q203',
    text: 'What does your breathing sound like?',
    type: 'single',
    options: [
      { id: 'a', label: 'High-pitched wheezing', weight: 8 },
      { id: 'b', label: 'Low-pitched wheeze or rattling', weight: 7 },
      { id: 'c', label: 'Stridor (noisy, high-pitched inhale)', weight: 10 },
      { id: 'd', label: 'Gurgling or wet sound', weight: 9 },
      { id: 'e', label: 'Silent (no air movement)', weight: 10 },
      { id: 'f', label: 'Normal sounds, just feel short of breath', weight: 6 },
    ],
  },
  {
    id: 'Q204',
    text: 'Are you coughing? If yes, what are you coughing up?',
    type: 'single',
    options: [
      { id: 'a', label: 'Blood (bright red)', weight: 10 },
      { id: 'b', label: 'Blood (dark or rusty)', weight: 9 },
      { id: 'c', label: 'Green or yellow phlegm', weight: 6 },
      { id: 'd', label: 'Clear or white phlegm', weight: 4 },
      { id: 'e', label: 'Dry cough, nothing coming up', weight: 4 },
      { id: 'f', label: 'Not coughing', weight: 1 },
    ],
  },
  {
    id: 'Q205',
    text: 'Are your lips or fingertips turning blue or grey?',
    type: 'single',
    options: [
      { id: 'a', label: 'Yes', weight: 10 },
      { id: 'b', label: 'No', weight: 1 },
    ],
  },
  {
    id: 'Q206',
    text: 'Have you recently inhaled or swallowed something?',
    type: 'single',
    options: [
      { id: 'a', label: 'Yes — object may be stuck', weight: 10 },
      { id: 'b', label: 'Yes — chemical or smoke', weight: 9 },
      { id: 'c', label: 'Yes — food (possible aspiration)', weight: 9 },
      { id: 'd', label: 'No', weight: 1 },
    ],
  },
  {
    id: 'Q207',
    text: 'Do you have a history of asthma or COPD?',
    type: 'single',
    options: [
      { id: 'a', label: 'Yes — asthma, currently having attack', weight: 9 },
      { id: 'b', label: 'Yes — COPD, worse than usual', weight: 8 },
      { id: 'c', label: 'Yes — currently stable', weight: 4 },
      { id: 'd', label: 'No history', weight: 2 },
    ],
  },
  {
    id: 'Q208',
    text: 'Are you using accessory muscles to breathe (neck, shoulders working hard)?',
    type: 'single',
    options: [
      { id: 'a', label: 'Yes', weight: 9 },
      { id: 'b', label: 'No', weight: 1 },
    ],
  },
  {
    id: 'Q210',
    text: 'Have you recently had surgery, a long flight, or been immobile for a long time?',
    type: 'single',
    options: [
      { id: 'a', label: 'Yes — and now short of breath with leg pain', weight: 10 },
      { id: 'b', label: 'Yes — but no other symptoms', weight: 6 },
      { id: 'c', label: 'No', weight: 1 },
    ],
  },
  {
    id: 'Q211',
    text: 'Do you have a fever along with your breathing difficulty?',
    type: 'single',
    options: [
      { id: 'a', label: 'Yes — high fever (>39°C / 102°F)', weight: 8 },
      { id: 'b', label: 'Yes — mild fever', weight: 6 },
      { id: 'c', label: 'No', weight: 3 },
    ],
  },
];

// ---------- SECTION 4: NEUROLOGICAL ----------

const NEUROLOGICAL: Question[] = [
  {
    id: 'Q301',
    text: 'What neurological symptom brings you in?',
    type: 'multi',
    options: [
      { id: 'a', label: 'Severe headache', weight: 8 },
      { id: 'b', label: 'Sudden confusion or disorientation', weight: 9 },
      { id: 'c', label: 'Weakness on one side of body', weight: 10 },
      { id: 'd', label: 'Facial drooping', weight: 10 },
      { id: 'e', label: 'Slurred or lost speech', weight: 10 },
      { id: 'f', label: 'Vision loss (one or both eyes)', weight: 10 },
      { id: 'g', label: 'Seizure', weight: 10 },
      { id: 'h', label: 'Loss of consciousness', weight: 10 },
      { id: 'i', label: 'Numbness or tingling', weight: 7 },
      { id: 'j', label: 'Dizziness or vertigo', weight: 6 },
      { id: 'k', label: 'Memory loss', weight: 7 },
      { id: 'l', label: 'Balance problems / falling', weight: 7 },
      { id: 'm', label: 'Severe sensitivity to light', weight: 7 },
    ],
  },
  {
    id: 'Q302',
    text: 'Describe the headache, if present.',
    type: 'single',
    options: [
      { id: 'a', label: 'Worst headache of my life (thunderclap)', weight: 10 },
      { id: 'b', label: 'Sudden and explosive onset', weight: 10 },
      { id: 'c', label: 'Gradually worsening over hours', weight: 7 },
      { id: 'd', label: 'Throbbing, one-sided (migraine-like)', weight: 5 },
      { id: 'e', label: 'Pressure behind the eyes', weight: 5 },
      { id: 'f', label: 'Band-like around the head', weight: 4 },
      { id: 'g', label: 'With neck stiffness and fever', weight: 10 },
      { id: 'h', label: 'After a head injury', weight: 9 },
      { id: 'i', label: 'Chronic, similar to usual headaches', weight: 3 },
    ],
  },
  {
    id: 'Q303',
    text: 'Is there neck stiffness (difficulty bending chin to chest)?',
    type: 'single',
    options: [
      { id: 'a', label: 'Yes — severe, with fever and/or rash', weight: 10 },
      { id: 'b', label: 'Yes — moderate', weight: 7 },
      { id: 'c', label: 'Mild stiffness', weight: 4 },
      { id: 'd', label: 'No', weight: 1 },
    ],
  },
  {
    id: 'Q305',
    text: 'Are you showing FAST signs (Facial droop, Arm weakness, Speech)?',
    type: 'single',
    options: [
      { id: 'a', label: 'Yes — one or more FAST signs present', weight: 10 },
      { id: 'b', label: 'No', weight: 1 },
    ],
  },
  {
    id: 'Q306',
    text: 'Did the neurological symptoms come on suddenly?',
    type: 'single',
    options: [
      { id: 'a', label: 'Yes — within seconds to minutes', weight: 10 },
      { id: 'b', label: 'Yes — within 1 hour', weight: 9 },
      { id: 'c', label: 'Gradually over hours or days', weight: 6 },
      { id: 'd', label: 'Chronic / longstanding', weight: 3 },
    ],
  },
  {
    id: 'Q308',
    text: 'Have you had a recent head injury or fall?',
    type: 'single',
    options: [
      { id: 'a', label: 'Yes — lost consciousness afterward', weight: 10 },
      { id: 'b', label: 'Yes — did not lose consciousness', weight: 8 },
      { id: 'c', label: 'Yes — minor bump, no symptoms', weight: 4 },
      { id: 'd', label: 'No', weight: 1 },
    ],
  },
  {
    id: 'Q309',
    text: 'Are you confused about where you are or what day it is?',
    type: 'single',
    options: [
      { id: 'a', label: 'Severe confusion — cannot state name or date', weight: 10 },
      { id: 'b', label: 'Moderate confusion', weight: 8 },
      { id: 'c', label: 'Mildly confused / foggy', weight: 6 },
      { id: 'd', label: 'Alert and oriented', weight: 1 },
    ],
  },
  {
    id: 'Q310',
    text: 'Do you have weakness or paralysis?',
    type: 'single',
    options: [
      { id: 'a', label: 'Cannot move arm or leg at all', weight: 10 },
      { id: 'b', label: 'Significant weakness one side', weight: 10 },
      { id: 'c', label: 'Mild weakness', weight: 7 },
      { id: 'd', label: 'Weakness in both legs', weight: 9 },
      { id: 'e', label: 'No weakness', weight: 1 },
    ],
  },
];

// ---------- SECTION 5: TRAUMA ----------

const TRAUMA: Question[] = [
  {
    id: 'Q401',
    text: 'What type of injury occurred?',
    type: 'single',
    options: [
      { id: 'a', label: 'Gunshot wound', weight: 10 },
      { id: 'b', label: 'Stab wound', weight: 10 },
      { id: 'c', label: 'Motor vehicle accident', weight: 9 },
      { id: 'd', label: 'Fall from height (> 2 metres)', weight: 9 },
      { id: 'e', label: 'Fall at ground level', weight: 6 },
      { id: 'f', label: 'Blunt trauma / assault', weight: 8 },
      { id: 'g', label: 'Sports injury', weight: 5 },
      { id: 'h', label: 'Burn', weight: 7 },
      { id: 'i', label: 'Crush injury', weight: 9 },
      { id: 'j', label: 'Drowning or near-drowning', weight: 10 },
      { id: 'k', label: 'Electrical injury', weight: 9 },
      { id: 'l', label: 'Animal bite or sting', weight: 5 },
    ],
  },
  {
    id: 'Q402',
    text: 'Is there active uncontrolled bleeding?',
    type: 'single',
    options: [
      { id: 'a', label: 'Yes — heavy, cannot be controlled', weight: 10 },
      { id: 'b', label: 'Yes — slowing with pressure', weight: 8 },
      { id: 'c', label: 'Yes — minor, controlled', weight: 5 },
      { id: 'd', label: 'No bleeding', weight: 2 },
    ],
  },
  {
    id: 'Q403',
    text: 'Where is the injury?',
    type: 'multi',
    options: [
      { id: 'a', label: 'Head / skull', weight: 9 },
      { id: 'b', label: 'Face', weight: 7 },
      { id: 'c', label: 'Neck', weight: 10 },
      { id: 'd', label: 'Chest / thorax', weight: 9 },
      { id: 'e', label: 'Abdomen', weight: 9 },
      { id: 'f', label: 'Spine / back', weight: 9 },
      { id: 'g', label: 'Pelvis', weight: 9 },
      { id: 'h', label: 'Upper arm', weight: 6 },
      { id: 'i', label: 'Forearm / wrist', weight: 5 },
      { id: 'j', label: 'Hand / fingers', weight: 4 },
      { id: 'k', label: 'Thigh', weight: 7 },
      { id: 'l', label: 'Knee', weight: 5 },
      { id: 'm', label: 'Lower leg', weight: 5 },
      { id: 'n', label: 'Ankle / foot', weight: 4 },
    ],
  },
  {
    id: 'Q404',
    text: 'Do you have bone deformity or suspected fracture?',
    type: 'single',
    options: [
      { id: 'a', label: 'Yes — open fracture (bone visible)', weight: 10 },
      { id: 'b', label: 'Yes — severe deformity', weight: 8 },
      { id: 'c', label: 'Suspected, swollen and very painful', weight: 7 },
      { id: 'd', label: 'Possible — painful but walking', weight: 5 },
      { id: 'e', label: 'No', weight: 1 },
    ],
  },
  {
    id: 'Q405',
    text: 'After the injury, did you lose consciousness?',
    type: 'single',
    options: [
      { id: 'a', label: 'Yes — still unresponsive', weight: 10 },
      { id: 'b', label: 'Yes — brief, now alert', weight: 9 },
      { id: 'c', label: 'No', weight: 3 },
    ],
  },
  {
    id: 'Q406',
    text: 'Numbness, tingling, or inability to move limbs after the injury?',
    type: 'single',
    options: [
      { id: 'a', label: 'Yes — cannot feel or move legs', weight: 10 },
      { id: 'b', label: 'Yes — cannot feel or move an arm', weight: 9 },
      { id: 'c', label: 'Tingling only', weight: 6 },
      { id: 'd', label: 'No', weight: 1 },
    ],
  },
  {
    id: 'Q410',
    text: 'Can you bear weight on the injured limb?',
    type: 'single',
    options: [
      { id: 'a', label: 'No — cannot stand at all', weight: 8 },
      { id: 'b', label: 'Partially — with significant pain', weight: 6 },
      { id: 'c', label: 'Yes — but painful', weight: 4 },
      { id: 'd', label: 'Yes — comfortable', weight: 2 },
    ],
  },
];

// ---------- SECTION 6: GASTROINTESTINAL ----------

const GASTROINTESTINAL: Question[] = [
  {
    id: 'Q501',
    text: 'What is your main digestive complaint?',
    type: 'single',
    options: [
      { id: 'a', label: 'Severe abdominal pain', weight: 8 },
      { id: 'b', label: 'Vomiting blood', weight: 10 },
      { id: 'c', label: 'Black or tarry stools', weight: 9 },
      { id: 'd', label: 'Blood in stool (bright red)', weight: 8 },
      { id: 'e', label: 'Cannot keep any fluids down', weight: 7 },
      { id: 'f', label: 'Suspected bowel obstruction', weight: 9 },
      { id: 'g', label: 'Swallowed a foreign object', weight: 8 },
      { id: 'h', label: 'Nausea and vomiting', weight: 5 },
      { id: 'i', label: 'Diarrhoea', weight: 4 },
      { id: 'j', label: 'Constipation', weight: 3 },
      { id: 'k', label: 'Heartburn / reflux', weight: 2 },
      { id: 'l', label: 'Bloating', weight: 2 },
    ],
  },
  {
    id: 'Q502',
    text: 'Where is the abdominal pain?',
    type: 'single',
    options: [
      { id: 'a', label: 'Right upper quadrant', weight: 7 },
      { id: 'b', label: 'Left upper quadrant', weight: 7 },
      { id: 'c', label: 'Right lower quadrant', weight: 8 },
      { id: 'd', label: 'Left lower quadrant', weight: 7 },
      { id: 'e', label: 'Central / umbilical', weight: 7 },
      { id: 'f', label: 'Diffuse (entire abdomen)', weight: 8 },
      { id: 'g', label: 'Epigastric (just below sternum)', weight: 7 },
    ],
  },
  {
    id: 'Q503',
    text: 'How would you describe the abdominal pain?',
    type: 'single',
    options: [
      { id: 'a', label: 'Severe, constant, board-like rigidity', weight: 10 },
      { id: 'b', label: 'Severe cramping or colicky', weight: 8 },
      { id: 'c', label: 'Sharp and sudden', weight: 8 },
      { id: 'd', label: 'Dull and aching', weight: 5 },
      { id: 'e', label: 'Comes and goes in waves', weight: 6 },
    ],
  },
  {
    id: 'Q504',
    text: 'Is the pain worse when you move or press on it?',
    type: 'single',
    options: [
      { id: 'a', label: 'Yes — extreme tenderness on light touch', weight: 9 },
      { id: 'b', label: 'Yes — rebound tenderness', weight: 9 },
      { id: 'c', label: 'Yes — moderate pain on palpation', weight: 6 },
      { id: 'd', label: 'No change with movement', weight: 3 },
    ],
  },
  {
    id: 'Q505',
    text: 'Are you vomiting? If so, what?',
    type: 'single',
    options: [
      { id: 'a', label: 'Bright red blood', weight: 10 },
      { id: 'b', label: 'Coffee-ground appearance', weight: 9 },
      { id: 'c', label: 'Bile (green/yellow)', weight: 6 },
      { id: 'd', label: 'Faecal matter', weight: 10 },
      { id: 'e', label: 'Undigested food', weight: 4 },
      { id: 'f', label: 'Clear fluid', weight: 3 },
      { id: 'g', label: 'Not vomiting', weight: 1 },
    ],
  },
  {
    id: 'Q507',
    text: 'Do you have signs of dehydration?',
    type: 'single',
    options: [
      { id: 'a', label: 'Severe — dizzy, not urinating, dry mouth', weight: 8 },
      { id: 'b', label: 'Moderate — thirsty, dark urine', weight: 6 },
      { id: 'c', label: 'Mild', weight: 4 },
      { id: 'd', label: 'No', weight: 1 },
    ],
  },
  {
    id: 'Q508',
    text: 'Is there jaundice (yellowing of skin or eyes)?',
    type: 'single',
    options: [
      { id: 'a', label: 'Yes — severe, dark urine, pale stools', weight: 9 },
      { id: 'b', label: 'Yes — mild yellowing', weight: 7 },
      { id: 'c', label: 'No', weight: 1 },
    ],
  },
];

// ---------- SECTION 7: INFECTIOUS ----------

const INFECTIOUS: Question[] = [
  {
    id: 'Q601',
    text: 'What is your current temperature, if known?',
    type: 'single',
    options: [
      { id: 'a', label: 'Above 40°C / 104°F', weight: 9 },
      { id: 'b', label: '39–40°C / 102–104°F', weight: 7 },
      { id: 'c', label: '38–39°C / 100–102°F', weight: 5 },
      { id: 'd', label: '37.5–38°C / 99–100°F', weight: 3 },
      { id: 'e', label: 'Normal / not sure', weight: 1 },
    ],
  },
  {
    id: 'Q602',
    text: 'How long have you had the fever?',
    type: 'single',
    options: [
      { id: 'a', label: 'Less than 24 hours', weight: 5 },
      { id: 'b', label: '1–3 days', weight: 6 },
      { id: 'c', label: '3–7 days', weight: 7 },
      { id: 'd', label: 'More than 1 week', weight: 7 },
      { id: 'e', label: 'Comes and goes for weeks', weight: 6 },
    ],
  },
  {
    id: 'Q604',
    text: 'Do you have a rash along with the fever?',
    type: 'single',
    options: [
      {
        id: 'a',
        label: "Yes — purple or red spots that don't fade with pressure",
        weight: 10,
      },
      { id: 'b', label: 'Yes — spreading blistering rash', weight: 8 },
      { id: 'c', label: 'Yes — generalised red rash', weight: 6 },
      { id: 'd', label: 'Yes — localised rash', weight: 4 },
      { id: 'e', label: 'No rash', weight: 2 },
    ],
  },
  {
    id: 'Q605',
    text: 'Are you experiencing rigors (severe shaking chills)?',
    type: 'single',
    options: [
      { id: 'a', label: 'Yes — severe, teeth chattering', weight: 8 },
      { id: 'b', label: 'Yes — mild chills', weight: 5 },
      { id: 'c', label: 'No', weight: 1 },
    ],
  },
  {
    id: 'Q606',
    text: 'Any of the following signs of serious infection?',
    type: 'multi',
    options: [
      { id: 'a', label: 'Confusion or altered mental state', weight: 10 },
      { id: 'b', label: 'Extremely fast heart rate', weight: 9 },
      { id: 'c', label: 'Breathing very rapidly', weight: 9 },
      { id: 'd', label: 'Skin is mottled or has blue tinge', weight: 10 },
      { id: 'e', label: 'Feeling faint or blood pressure low', weight: 9 },
      { id: 'f', label: 'None of the above', weight: 1 },
    ],
  },
  {
    id: 'Q607',
    text: 'Do you have a compromised immune system?',
    type: 'single',
    options: [
      { id: 'a', label: 'Yes — on chemotherapy', weight: 9 },
      { id: 'b', label: 'Yes — HIV/AIDS', weight: 8 },
      { id: 'c', label: 'Yes — organ transplant recipient', weight: 8 },
      { id: 'd', label: 'Yes — on long-term steroids', weight: 7 },
      { id: 'e', label: 'Yes — diabetes', weight: 6 },
      { id: 'f', label: 'No', weight: 1 },
    ],
  },
  {
    id: 'Q609',
    text: 'Any respiratory symptoms with the fever?',
    type: 'single',
    options: [
      { id: 'a', label: 'Coughing up blood or rust-coloured sputum', weight: 9 },
      { id: 'b', label: 'Difficulty breathing / chest pain on breathing', weight: 8 },
      { id: 'c', label: 'Severe productive cough', weight: 6 },
      { id: 'd', label: 'Mild cough', weight: 3 },
      { id: 'e', label: 'No respiratory symptoms', weight: 1 },
    ],
  },
];

// ---------- SECTION 8: PAIN ----------

const PAIN: Question[] = [
  {
    id: 'Q701',
    text: 'On a scale of 1–10, how severe is your pain right now?',
    type: 'single',
    options: [
      { id: 'a', label: '10 — worst pain imaginable', weight: 10 },
      { id: 'b', label: '8–9 — very severe', weight: 8 },
      { id: 'c', label: '6–7 — severe', weight: 7 },
      { id: 'd', label: '4–5 — moderate', weight: 5 },
      { id: 'e', label: '2–3 — mild', weight: 3 },
      { id: 'f', label: '1 — very mild', weight: 1 },
    ],
  },
  {
    id: 'Q702',
    text: 'How long have you been in this level of pain?',
    type: 'single',
    options: [
      { id: 'a', label: 'Just started (minutes)', weight: 8 },
      { id: 'b', label: 'Less than 1 hour', weight: 7 },
      { id: 'c', label: '1–6 hours', weight: 6 },
      { id: 'd', label: '6–24 hours', weight: 5 },
      { id: 'e', label: '1–7 days', weight: 4 },
      { id: 'f', label: 'More than 1 week', weight: 3 },
    ],
  },
  {
    id: 'Q703',
    text: 'What does the pain feel like?',
    type: 'single',
    options: [
      { id: 'a', label: 'Tearing or ripping', weight: 10 },
      { id: 'b', label: 'Crushing or pressure', weight: 9 },
      { id: 'c', label: 'Stabbing or sharp', weight: 7 },
      { id: 'd', label: 'Burning', weight: 6 },
      { id: 'e', label: 'Throbbing', weight: 5 },
      { id: 'f', label: 'Cramping', weight: 5 },
      { id: 'g', label: 'Aching or dull', weight: 3 },
      { id: 'h', label: 'Shooting / electric', weight: 6 },
    ],
  },
  {
    id: 'Q704',
    text: 'Does the pain radiate or travel anywhere?',
    type: 'single',
    options: [
      { id: 'a', label: 'Yes — to chest or jaw', weight: 9 },
      { id: 'b', label: 'Yes — down left arm', weight: 10 },
      { id: 'c', label: 'Yes — down the back', weight: 8 },
      { id: 'd', label: 'Yes — into groin (from back/flank)', weight: 7 },
      { id: 'e', label: 'Yes — down one leg (sciatica-like)', weight: 5 },
      { id: 'f', label: 'No — stays in one spot', weight: 3 },
    ],
  },
  {
    id: 'Q705',
    text: 'What makes the pain worse?',
    type: 'single',
    options: [
      { id: 'a', label: 'Any movement', weight: 7 },
      { id: 'b', label: 'Deep breathing', weight: 7 },
      { id: 'c', label: 'Eating', weight: 5 },
      { id: 'd', label: 'Pressing on area', weight: 6 },
      { id: 'e', label: 'Nothing in particular', weight: 2 },
    ],
  },
  {
    id: 'Q707',
    text: 'Have you taken any pain medication? If so, has it helped?',
    type: 'single',
    options: [
      { id: 'a', label: 'No medication taken', weight: 4 },
      { id: 'b', label: 'Yes — no relief at all', weight: 7 },
      { id: 'c', label: 'Yes — partial relief', weight: 4 },
      { id: 'd', label: 'Yes — significant relief', weight: 2 },
    ],
  },
  {
    id: 'Q708',
    text: 'Is this pain new or recurring?',
    type: 'single',
    options: [
      { id: 'a', label: 'Brand new, never felt this before', weight: 7 },
      { id: 'b', label: 'Similar to previous episodes', weight: 4 },
      { id: 'c', label: 'Chronic pain, worse than usual', weight: 5 },
      { id: 'd', label: 'Chronic pain, same as usual', weight: 2 },
    ],
  },
];

// ---------- SECTION 9: MENTAL HEALTH ----------

const MENTAL_HEALTH: Question[] = [
  {
    id: 'Q801',
    text: 'What mental health concern brings you in today?',
    type: 'single',
    options: [
      { id: 'a', label: 'Thoughts of ending my life', weight: 10 },
      { id: 'b', label: 'I have a plan to hurt myself', weight: 10 },
      { id: 'c', label: 'I have harmed myself (physical injury)', weight: 10 },
      { id: 'd', label: 'Thoughts of harming someone else', weight: 10 },
      { id: 'e', label: 'Severe psychotic episode (hallucinations, delusions)', weight: 9 },
      { id: 'f', label: 'Severe panic attack / cannot calm down', weight: 7 },
      { id: 'g', label: 'Extreme anxiety', weight: 6 },
      { id: 'h', label: 'Severe depression, cannot function', weight: 6 },
      { id: 'i', label: 'Manic episode / not sleeping for days', weight: 7 },
      { id: 'j', label: 'Substance-related crisis', weight: 8 },
      { id: 'k', label: 'Feeling overwhelmed, need support', weight: 4 },
    ],
  },
  {
    id: 'Q802',
    text: 'Do you currently have a plan to harm yourself?',
    type: 'single',
    options: [
      { id: 'a', label: 'Yes — specific plan and means', weight: 10 },
      { id: 'b', label: 'Yes — plan but no means', weight: 10 },
      { id: 'c', label: 'Thoughts but no plan', weight: 8 },
      { id: 'd', label: 'No', weight: 1 },
    ],
  },
  {
    id: 'Q803',
    text: 'Have you taken any substances (alcohol, drugs, medication) today?',
    type: 'single',
    options: [
      { id: 'a', label: 'Yes — overdose (intentional)', weight: 10 },
      { id: 'b', label: 'Yes — overdose (accidental)', weight: 10 },
      { id: 'c', label: 'Yes — significant amount', weight: 8 },
      { id: 'd', label: 'Yes — small amount', weight: 5 },
      { id: 'e', label: 'No', weight: 1 },
    ],
  },
  {
    id: 'Q804',
    text: 'Are you currently hearing or seeing things others cannot?',
    type: 'single',
    options: [
      { id: 'a', label: 'Yes — threatening voices or visions', weight: 9 },
      { id: 'b', label: 'Yes — non-threatening', weight: 7 },
      { id: 'c', label: 'Not sure', weight: 5 },
      { id: 'd', label: 'No', weight: 1 },
    ],
  },
  {
    id: 'Q805',
    text: 'Do you feel safe right now in this environment?',
    type: 'single',
    options: [
      { id: 'a', label: 'No — I am in danger from someone', weight: 10 },
      { id: 'b', label: 'No — I am a danger to myself', weight: 10 },
      { id: 'c', label: 'Unsure', weight: 7 },
      { id: 'd', label: 'Yes', weight: 1 },
    ],
  },
  {
    id: 'Q807',
    text: 'Are you currently on psychiatric medication?',
    type: 'single',
    options: [
      { id: 'a', label: 'Yes — and I stopped taking it', weight: 7 },
      { id: 'b', label: 'Yes — and I may have taken too much', weight: 10 },
      { id: 'c', label: 'Yes — taking as prescribed', weight: 3 },
      { id: 'd', label: 'No', weight: 1 },
    ],
  },
  {
    id: 'Q808',
    text: 'How long have you been feeling this way?',
    type: 'single',
    options: [
      { id: 'a', label: 'Acute onset — hours', weight: 8 },
      { id: 'b', label: 'Days', weight: 6 },
      { id: 'c', label: 'Weeks', weight: 5 },
      { id: 'd', label: 'Months (chronic)', weight: 4 },
    ],
  },
];

// ---------- SECTION 10: ALLERGIC / TOXIC ----------

const ALLERGIC: Question[] = [
  {
    id: 'Q901',
    text: 'Are you having an allergic reaction?',
    type: 'single',
    options: [
      { id: 'a', label: 'Yes — throat swelling / cannot swallow', weight: 10 },
      { id: 'b', label: 'Yes — difficulty breathing', weight: 10 },
      { id: 'c', label: 'Yes — rash, hives and vomiting', weight: 9 },
      { id: 'd', label: 'Yes — widespread hives, no breathing issues', weight: 7 },
      { id: 'e', label: 'Yes — localised rash only', weight: 4 },
      { id: 'f', label: 'No', weight: 1 },
    ],
  },
  {
    id: 'Q902',
    text: 'What triggered the reaction (if known)?',
    type: 'single',
    options: [
      { id: 'a', label: 'Medication / drug', weight: 9 },
      { id: 'b', label: 'Insect sting (bee, wasp)', weight: 8 },
      { id: 'c', label: 'Food (e.g. peanuts, shellfish)', weight: 8 },
      { id: 'd', label: 'Latex', weight: 7 },
      { id: 'e', label: 'Unknown', weight: 7 },
      { id: 'f', label: 'Known allergen, usual reaction', weight: 4 },
    ],
  },
  {
    id: 'Q903',
    text: 'Have you used an EpiPen / adrenaline auto-injector?',
    type: 'single',
    options: [
      { id: 'a', label: 'Yes — used, symptoms returning', weight: 10 },
      { id: 'b', label: 'Yes — used, currently improving', weight: 7 },
      { id: 'c', label: 'No — have one but have not used it', weight: 7 },
      { id: 'd', label: 'No — do not have one', weight: 6 },
    ],
  },
  {
    id: 'Q904',
    text: 'Did you ingest, inhale, or inject a toxic substance?',
    type: 'single',
    options: [
      { id: 'a', label: 'Yes — prescription medication overdose', weight: 10 },
      { id: 'b', label: 'Yes — recreational drug overdose', weight: 10 },
      { id: 'c', label: 'Yes — household chemical', weight: 9 },
      { id: 'd', label: 'Yes — alcohol (severe)', weight: 8 },
      { id: 'e', label: 'Yes — carbon monoxide (or suspected)', weight: 10 },
      { id: 'f', label: 'Yes — unknown substance', weight: 9 },
      { id: 'g', label: 'No', weight: 1 },
    ],
  },
  {
    id: 'Q906',
    text: 'Current level of consciousness after the exposure?',
    type: 'single',
    options: [
      { id: 'a', label: 'Unconscious / unresponsive', weight: 10 },
      { id: 'b', label: 'Very drowsy / cannot stay awake', weight: 10 },
      { id: 'c', label: 'Confused but responding', weight: 9 },
      { id: 'd', label: 'Alert', weight: 6 },
    ],
  },
  {
    id: 'Q907',
    text: 'Any of the following after the exposure?',
    type: 'multi',
    options: [
      { id: 'a', label: 'Seizure', weight: 10 },
      { id: 'b', label: 'Irregular heartbeat', weight: 10 },
      { id: 'c', label: 'Difficulty breathing', weight: 10 },
      { id: 'd', label: 'Severe vomiting', weight: 7 },
      { id: 'e', label: 'Burns in mouth or throat', weight: 9 },
      { id: 'f', label: 'Pinpoint pupils', weight: 9 },
      { id: 'g', label: 'Very large pupils', weight: 8 },
      { id: 'h', label: 'Sweating profusely', weight: 7 },
    ],
  },
];

// ---------- SECTION 11: DERMATOLOGICAL ----------

const DERMATOLOGICAL: Question[] = [
  {
    id: 'Q1001',
    text: 'Describe your skin concern:',
    type: 'single',
    options: [
      { id: 'a', label: 'Rapidly spreading rash with fever', weight: 9 },
      { id: 'b', label: "Purple / red spots that don't fade", weight: 10 },
      { id: 'c', label: 'Blistering over large area', weight: 8 },
      { id: 'd', label: 'Infected wound with red streaking', weight: 8 },
      { id: 'e', label: 'Severe burn', weight: 9 },
      { id: 'f', label: 'Spreading redness / cellulitis', weight: 7 },
      { id: 'g', label: 'Hives (urticaria)', weight: 5 },
      { id: 'h', label: 'Localised rash or irritation', weight: 3 },
      { id: 'i', label: 'Skin tag, mole concern', weight: 2 },
      { id: 'j', label: 'Minor cut or abrasion', weight: 3 },
    ],
  },
  {
    id: 'Q1002',
    text: 'Does the rash itch, burn, or hurt?',
    type: 'single',
    options: [
      { id: 'a', label: 'Extremely painful (shingles-like)', weight: 7 },
      { id: 'b', label: 'Intensely itchy', weight: 5 },
      { id: 'c', label: 'Burning', weight: 6 },
      { id: 'd', label: 'Mild irritation', weight: 3 },
      { id: 'e', label: 'No sensation', weight: 2 },
    ],
  },
  {
    id: 'Q1003',
    text: 'Is there pus, discharge, or warmth from the area?',
    type: 'single',
    options: [
      { id: 'a', label: 'Yes — red streaks extending outward', weight: 9 },
      { id: 'b', label: 'Yes — significant pus', weight: 7 },
      { id: 'c', label: 'Yes — warmth and swelling', weight: 6 },
      { id: 'd', label: 'No', weight: 1 },
    ],
  },
  {
    id: 'Q1004',
    text: 'How long has the skin issue been present?',
    type: 'single',
    options: [
      { id: 'a', label: 'Appeared within hours', weight: 7 },
      { id: 'b', label: '1–3 days', weight: 5 },
      { id: 'c', label: '4–7 days', weight: 4 },
      { id: 'd', label: 'More than 1 week', weight: 3 },
    ],
  },
];

// ---------- SECTION 12: UROLOGICAL ----------

const UROLOGICAL: Question[] = [
  {
    id: 'Q1101',
    text: 'What is your urinary complaint?',
    type: 'single',
    options: [
      { id: 'a', label: 'Cannot urinate at all (retention)', weight: 8 },
      { id: 'b', label: 'Blood in urine (significant)', weight: 8 },
      { id: 'c', label: 'Severe flank / back pain with blood', weight: 9 },
      { id: 'd', label: 'Burning and frequency', weight: 5 },
      { id: 'e', label: 'Urinary incontinence (sudden onset)', weight: 7 },
      { id: 'f', label: 'Cloudy or foul-smelling urine', weight: 4 },
      { id: 'g', label: 'Mild urinary discomfort', weight: 3 },
    ],
  },
  {
    id: 'Q1102',
    text: 'Is there pain in your flank (side, below ribs)?',
    type: 'single',
    options: [
      { id: 'a', label: 'Yes — severe, waves of pain', weight: 9 },
      { id: 'b', label: 'Yes — constant, moderate', weight: 7 },
      { id: 'c', label: 'Yes — mild', weight: 4 },
      { id: 'd', label: 'No', weight: 1 },
    ],
  },
  {
    id: 'Q1104',
    text: 'Do you have a fever along with urinary symptoms?',
    type: 'single',
    options: [
      { id: 'a', label: 'Yes — high fever and rigors', weight: 9 },
      { id: 'b', label: 'Yes — mild fever', weight: 6 },
      { id: 'c', label: 'No', weight: 3 },
    ],
  },
  {
    id: 'Q1105',
    text: 'For male patients — scrotal pain or swelling?',
    type: 'single',
    options: [
      { id: 'a', label: 'Yes — sudden severe scrotal pain', weight: 10 },
      { id: 'b', label: 'Yes — swelling and dull ache', weight: 7 },
      { id: 'c', label: 'No / not applicable', weight: 1 },
    ],
  },
];

// ---------- SECTION 13: REPRODUCTIVE ----------

const REPRODUCTIVE: Question[] = [
  {
    id: 'Q1201',
    text: 'Are you currently pregnant?',
    type: 'single',
    options: [
      { id: 'a', label: 'Yes — and severe abdominal pain', weight: 10 },
      { id: 'b', label: 'Yes — and heavy vaginal bleeding', weight: 10 },
      { id: 'c', label: 'Yes — and think I may be in labour', weight: 8 },
      { id: 'd', label: 'Yes — and sudden severe headache', weight: 10 },
      { id: 'e', label: 'Yes — and reduced foetal movement', weight: 9 },
      { id: 'f', label: 'Yes — and leaking fluid', weight: 8 },
      { id: 'g', label: 'Yes — no alarming symptoms', weight: 5 },
      { id: 'h', label: 'Not pregnant / not sure', weight: 1 },
    ],
  },
  {
    id: 'Q1203',
    text: 'Are you experiencing vaginal bleeding?',
    type: 'single',
    options: [
      { id: 'a', label: 'Heavy bleeding (soaking pad in < 1 hour)', weight: 10 },
      { id: 'b', label: 'Moderate bleeding with clots', weight: 9 },
      { id: 'c', label: 'Light spotting', weight: 6 },
      { id: 'd', label: 'No bleeding', weight: 1 },
    ],
  },
  {
    id: 'Q1204',
    text: 'Severe lower abdominal pain with a missed period?',
    type: 'single',
    options: [
      { id: 'a', label: 'Yes — sudden onset, one-sided', weight: 10 },
      { id: 'b', label: 'Yes — gradual', weight: 8 },
      { id: 'c', label: 'Mild cramps', weight: 4 },
      { id: 'd', label: 'No', weight: 1 },
    ],
  },
  {
    id: 'Q1205',
    text: 'Non-pregnancy gynaecological concern?',
    type: 'single',
    options: [
      { id: 'a', label: 'Sudden severe pelvic pain', weight: 8 },
      { id: 'b', label: 'Possible sexual assault (within 72 hrs)', weight: 10 },
      { id: 'c', label: 'Abnormal discharge with fever', weight: 7 },
      { id: 'd', label: 'Painful intercourse', weight: 4 },
      { id: 'e', label: 'Irregular periods', weight: 2 },
    ],
  },
];

// ---------- SECTION 14: ENT ----------

const ENT: Question[] = [
  {
    id: 'Q1301',
    text: 'What ENT symptom brings you in?',
    type: 'single',
    options: [
      { id: 'a', label: 'Complete airway obstruction', weight: 10 },
      { id: 'b', label: 'Throat swelling / difficulty swallowing', weight: 9 },
      { id: 'c', label: 'Severe ear pain', weight: 5 },
      { id: 'd', label: 'Sudden hearing loss', weight: 7 },
      { id: 'e', label: "Nosebleed that won't stop", weight: 7 },
      { id: 'f', label: 'Foreign object in ear/nose/throat', weight: 7 },
      { id: 'g', label: 'Sore throat', weight: 3 },
      { id: 'h', label: 'Hoarseness', weight: 4 },
      { id: 'i', label: 'Sinus pain / congestion', weight: 2 },
    ],
  },
  {
    id: 'Q1302',
    text: 'Is there swelling in the throat or neck?',
    type: 'single',
    options: [
      { id: 'a', label: 'Yes — rapidly expanding, difficulty breathing', weight: 10 },
      { id: 'b', label: 'Yes — difficulty swallowing solids', weight: 7 },
      { id: 'c', label: 'Yes — visible lump, no breathing issues', weight: 5 },
      { id: 'd', label: 'No', weight: 1 },
    ],
  },
  {
    id: 'Q1304',
    text: 'Severe difficulty swallowing (dysphagia)?',
    type: 'single',
    options: [
      { id: 'a', label: 'Yes — cannot swallow saliva', weight: 10 },
      { id: 'b', label: 'Yes — cannot swallow solids', weight: 7 },
      { id: 'c', label: 'Yes — difficulty with liquids', weight: 8 },
      { id: 'd', label: 'Mild difficulty', weight: 4 },
      { id: 'e', label: 'No', weight: 1 },
    ],
  },
  {
    id: 'Q1305',
    text: 'Stiff neck with a sore throat?',
    type: 'single',
    options: [
      { id: 'a', label: 'Yes — with high fever and severe headache', weight: 10 },
      { id: 'b', label: 'Yes — moderate stiffness', weight: 7 },
      { id: 'c', label: 'Mild stiffness', weight: 4 },
      { id: 'd', label: 'No', weight: 1 },
    ],
  },
];

// ---------- SECTION 15: MUSCULOSKELETAL ----------

const MUSCULOSKELETAL: Question[] = [
  {
    id: 'Q1401',
    text: 'What musculoskeletal issue are you experiencing?',
    type: 'single',
    options: [
      { id: 'a', label: 'Traumatic injury (fall, accident)', weight: 7 },
      { id: 'b', label: 'Sudden joint swelling — hot and red', weight: 7 },
      { id: 'c', label: 'Inability to move a limb', weight: 7 },
      { id: 'd', label: 'Severe back pain with leg weakness', weight: 9 },
      { id: 'e', label: 'Back pain after trauma', weight: 8 },
      { id: 'f', label: 'Muscle weakness (new onset)', weight: 7 },
      { id: 'g', label: 'Joint pain — arthritis flare', weight: 4 },
      { id: 'h', label: 'Sports injury / sprain', weight: 4 },
      { id: 'i', label: 'Chronic pain, worse today', weight: 3 },
    ],
  },
  {
    id: 'Q1402',
    text: 'Back pain associated with any of the following?',
    type: 'multi',
    options: [
      { id: 'a', label: 'Loss of bladder or bowel control', weight: 10 },
      { id: 'b', label: 'Numbness in groin / inner thighs', weight: 10 },
      { id: 'c', label: 'Weakness in both legs', weight: 9 },
      { id: 'd', label: 'After a fall or trauma', weight: 8 },
      { id: 'e', label: 'None of the above', weight: 3 },
    ],
  },
  {
    id: 'Q1403',
    text: 'Joint hot, red, and swollen with fever?',
    type: 'single',
    options: [
      { id: 'a', label: 'Yes — all of the above', weight: 8 },
      { id: 'b', label: 'Yes — swollen but no fever', weight: 5 },
      { id: 'c', label: 'Red and warm but no swelling', weight: 4 },
      { id: 'd', label: 'No', weight: 2 },
    ],
  },
];

// ---------- SECTION 19: PHARMACY ----------

const PHARMACY: Question[] = [
  {
    id: 'Q1801',
    text: 'What is your pharmacy concern?',
    type: 'single',
    options: [
      {
        id: 'a',
        label: 'Running out of life-critical medication today (insulin, heart, seizure)',
        weight: 8,
      },
      { id: 'b', label: 'Possible medication overdose (accidental)', weight: 10 },
      { id: 'c', label: 'Suspected drug interaction', weight: 7 },
      { id: 'd', label: 'Side effect causing significant distress', weight: 6 },
      { id: 'e', label: 'Regular prescription refill', weight: 1 },
      { id: 'f', label: 'Advice on over-the-counter product', weight: 1 },
    ],
  },
  {
    id: 'Q1802',
    text: 'Which category of medication do you need urgently?',
    type: 'single',
    options: [
      { id: 'a', label: 'Insulin', weight: 9 },
      { id: 'b', label: 'Anti-seizure medication', weight: 9 },
      { id: 'c', label: 'Cardiac medication (digoxin, warfarin, anti-arrhythmic)', weight: 9 },
      { id: 'd', label: 'Immunosuppressant (transplant)', weight: 8 },
      { id: 'e', label: 'Blood pressure medication', weight: 6 },
      { id: 'f', label: 'Inhaler / respiratory medication', weight: 7 },
      { id: 'g', label: 'Psychiatric medication', weight: 6 },
      { id: 'h', label: 'Other prescription', weight: 3 },
    ],
  },
  {
    id: 'Q1803',
    text: 'Have you missed doses because you ran out?',
    type: 'single',
    options: [
      { id: 'a', label: 'Yes — multiple days without critical medication', weight: 9 },
      { id: 'b', label: 'Yes — one dose missed', weight: 5 },
      { id: 'c', label: 'No', weight: 1 },
    ],
  },
];

// ---------- SECTION 21: GENERAL FLAGS ----------

const GENERAL: Question[] = [
  {
    id: 'Q2001',
    text: 'Any of the following that may affect your care?',
    type: 'multi',
    options: [
      { id: 'a', label: 'Known drug allergy', weight: 6 },
      { id: 'b', label: 'On blood thinners (warfarin, rivaroxaban, heparin)', weight: 7 },
      { id: 'c', label: 'Pacemaker or implanted device', weight: 6 },
      { id: 'd', label: 'Currently pregnant', weight: 7 },
      { id: 'e', label: 'Immunocompromised', weight: 7 },
      { id: 'f', label: 'Recent surgery (within 2 weeks)', weight: 6 },
      { id: 'g', label: 'Recent international travel', weight: 5 },
      { id: 'h', label: 'Do not resuscitate (DNR) order', weight: 8 },
      { id: 'i', label: 'None of the above', weight: 1 },
    ],
  },
  {
    id: 'Q2003',
    text: 'Have your symptoms been getting better, worse, or staying the same?',
    type: 'single',
    options: [
      { id: 'a', label: 'Rapidly getting worse', weight: 8 },
      { id: 'b', label: 'Gradually getting worse', weight: 6 },
      { id: 'c', label: 'Staying the same', weight: 4 },
      { id: 'd', label: 'Slightly improving', weight: 2 },
    ],
  },
];

// ---------- DISPATCH TABLE ----------

export const SECTIONS: Record<CategoryCode, Question[]> = {
  CARDIOVASCULAR,
  RESPIRATORY,
  NEUROLOGICAL,
  TRAUMA,
  GASTROINTESTINAL,
  INFECTIOUS,
  PAIN,
  MENTAL_HEALTH,
  ALLERGIC,
  DERMATOLOGICAL,
  UROLOGICAL,
  REPRODUCTIVE,
  ENT,
  MUSCULOSKELETAL,
  OPHTHALMOLOGICAL: [], // covered via DERMATOLOGICAL route per bank
  ENDOCRINE: [], // not patient-self-reportable in MVP
  PHARMACY,
  GENERAL,
};

export const CATEGORY_LABEL: Record<CategoryCode, string> = {
  CARDIOVASCULAR: 'Cardiovascular',
  RESPIRATORY: 'Respiratory',
  NEUROLOGICAL: 'Neurological',
  TRAUMA: 'Trauma / injury',
  GASTROINTESTINAL: 'Gastrointestinal',
  INFECTIOUS: 'Infectious / fever',
  PAIN: 'General pain',
  MENTAL_HEALTH: 'Mental health',
  ALLERGIC: 'Allergic / toxic',
  DERMATOLOGICAL: 'Skin',
  UROLOGICAL: 'Urological',
  REPRODUCTIVE: 'Reproductive',
  ENT: 'Ear, nose, throat',
  MUSCULOSKELETAL: 'Musculoskeletal',
  OPHTHALMOLOGICAL: 'Eye',
  ENDOCRINE: 'Endocrine',
  PHARMACY: 'Pharmacy',
  GENERAL: 'General',
};

export const GENERAL_FLAG_QUESTIONS = GENERAL;

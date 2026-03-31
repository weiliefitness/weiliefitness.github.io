// ============================================
// WEILIE FITNESS HUB — CONFIG v2
// ============================================

const CONFIG = {
  SHEET_ID: '1uU2uFo_uzorT_H8owkM6EGPpVBwwpoaf9AaLKePmamQ',
  SHEETS_API_KEY: 'AIzaSyCU38vWB3y0CwFEtqwOAMNar3Eq93J4llw',
  TABS: {
    dailyHealth: 'Daily Health',
    activities:  'Activities',
    dailyLog:    'Daily Log'
  },
  TARGETS: {
    calories: 1850, protein: 155, steps: 8000,
    water: 2500, weight: 80, bodyFat: 20,
    visceralFat: 9, bodyAge: 38
  },
  START: {
    weight: 102.6, bodyFat: 35.5,
    visceralFat: 15, bodyAge: 56
  },
  REFRESH_INTERVAL: 60
};

const MEALS = [
  { name: 'Chicken Rice',       cal: 380, protein: 32, rating: '🟡' },
  { name: 'Mee Pok Dry',        cal: 450, protein: 22, rating: '🟡' },
  { name: 'Nasi Lemak',         cal: 700, protein: 18, rating: '🔴' },
  { name: 'Fish Soup Ee Mian',  cal: 480, protein: 35, rating: '🟢' },
  { name: 'Duck Porridge',      cal: 380, protein: 24, rating: '🟢' },
  { name: 'Pork Porridge',      cal: 350, protein: 22, rating: '🟢' },
  { name: 'Minced Meat Noodle', cal: 420, protein: 26, rating: '🟢' },
  { name: 'YTF Soup (Koo Kee)', cal: 380, protein: 30, rating: '🟢' },
  { name: 'Kuay Chap',          cal: 550, protein: 28, rating: '🟡' },
  { name: 'Chicken Chop',       cal: 620, protein: 45, rating: '🟡' },
  { name: 'Lasagna',            cal: 580, protein: 28, rating: '🟡' },
  { name: 'Carbonara',          cal: 650, protein: 24, rating: '🔴' },
  { name: 'Ramen',              cal: 580, protein: 30, rating: '🟡' },
  { name: 'Nasi Briyani',       cal: 720, protein: 28, rating: '🔴' },
  { name: 'Mee Soto',           cal: 420, protein: 22, rating: '🟢' }
];

const EXERCISES = {
  upper_push: [
    { name: 'Push-ups',         sets: '4 × 12-15', note: 'Slow 3s down',        url: 'https://youtu.be/IODxDxX7oi4' },
    { name: 'Pike Push-up',     sets: '3 × 8-10',  note: 'Shoulder focus',      url: 'https://youtu.be/sposDXWEB0A' },
    { name: 'KB Floor Press',   sets: '3 × 10 ea', note: '12kg KB',             url: 'https://youtu.be/uSFtxFHBHEA' },
    { name: 'Band Chest Press', sets: '3 × 12',    note: 'Anchor at shoulder',  url: 'https://youtu.be/gReFI-hBqZg' }
  ],
  upper_pull: [
    { name: 'Band Pull-Apart',  sets: '4 × 15',    note: 'Rear delt focus',     url: 'https://youtu.be/wlpJC8MBcpQ' },
    { name: 'Dead Hang',        sets: '3 × 25s',   note: 'Grip + decompress',   url: 'https://youtu.be/RRKB_dIhqVw' },
    { name: 'Chin-up Negative', sets: '3 × 5',     note: '5s lowering phase',   url: 'https://youtu.be/RJ8ceiK6gLE' },
    { name: 'Band Row',         sets: '4 × 12',    note: 'Squeeze at peak',     url: 'https://youtu.be/xQNrFHEMhI4' }
  ],
  lower: [
    { name: 'Glute Bridge',     sets: '4 × 15',    note: 'Hold 2s at top',      url: 'https://youtu.be/8bbE64NuDTU' },
    { name: 'Side Hip Abduct',  sets: '3 × 15 ea', note: 'No ankle stress',     url: 'https://youtu.be/Th8pqOxXlUM' },
    { name: 'Seated Band Curl', sets: '3 × 12',    note: 'Band under bench',    url: 'https://youtu.be/ELOCsoDSmrg' },
    { name: 'Seated Calf Raise',sets: '3 × 20',    note: 'Ankle-safe',          url: 'https://youtu.be/JbyjNymZOt0' }
  ],
  core: [
    { name: 'Dead Bug',         sets: '3 × 8 ea',  note: 'Back flat always',    url: 'https://youtu.be/4XLEnwUr1d8' },
    { name: 'Ab Wheel Rollout', sets: '3 × 8-10',  note: 'Core braced',         url: 'https://youtu.be/cB_UQrHCHtM' },
    { name: 'Plank',            sets: '3 × 40s',   note: 'Breathe normally',    url: 'https://youtu.be/ASdvN_XEl_c' },
    { name: 'Bird Dog',         sets: '3 × 10 ea', note: 'Controlled',          url: 'https://youtu.be/wiFNA3sqjCA' }
  ],
  mobility: [
    { name: 'Ankle Circles',    sets: '2 × 10 ea', note: 'Post-surgery care',   url: 'https://youtu.be/KSJicrXnTyA' },
    { name: 'Hip Flexor Str.',  sets: '2 × 30s ea',note: 'Lunge position',      url: 'https://youtu.be/YqF8GJjGXl0' },
    { name: 'Cat-Cow',          sets: '2 × 10',    note: 'Breathe with motion', url: 'https://youtu.be/kqnua4rHVVA' },
    { name: 'Shoulder CARs',    sets: '2 × 5 ea',  note: 'Full range circles',  url: 'https://youtu.be/GWCVmESSAXQ' }
  ]
};

const PERIODIZATION = {
  weights: { bb: 0.30, sleep: 0.25, hrv: 0.25, stress: 0.20 },
  thresholds: { high: 80, moderate: 60, low: 40 },
  levels: {
    high:     { label: '💪 Full Strength Session', tag: 'HIGH RECOVERY',     cls: 'tag-green',  color: '#00ff9d' },
    moderate: { label: '🔄 Moderate Session',       tag: 'MODERATE RECOVERY', cls: 'tag-blue',   color: '#4d9fff' },
    low:      { label: '🚶 Walk + Mobility',         tag: 'LOW RECOVERY',      cls: 'tag-yellow', color: '#ffd700' },
    rest:     { label: '😴 Rest Day',                tag: 'REST NEEDED',        cls: 'tag-red',    color: '#ff4545' }
  },
  weeklyPlan: {
    1: { type: 'upper', label: 'Upper Body Strength' },
    2: { type: 'walk',  label: 'Walk + Recovery'     },
    3: { type: 'lower', label: 'Lower Body + Core'   },
    4: { type: 'walk',  label: 'Walk + Core'         },
    5: { type: 'full',  label: 'Full Body'           },
    6: { type: 'walk',  label: 'Long Walk / Swim'    },
    0: { type: 'rest',  label: 'Rest Day'            }
  }
};

const BEVERAGES = [
  { name: 'Kopi-O',          cal:  80, protein: 0, rating: '☕' },
  { name: 'Kopi (w milk)',   cal: 130, protein: 3, rating: '☕' },
  { name: 'Teh-O',           cal:  70, protein: 0, rating: '🍵' },
  { name: 'Teh Tarik',       cal: 150, protein: 4, rating: '🍵' },
  { name: '100 Plus',        cal:  70, protein: 0, rating: '🥤' },
  { name: 'Milo (hot)',      cal: 120, protein: 3, rating: '🥛' },
  { name: 'Coconut Water',   cal:  60, protein: 1, rating: '🥥' },
  { name: 'Protein Shake',   cal: 130, protein:25, rating: '💪' },
  { name: 'Water',           cal:   0, protein: 0, rating: '💧' },
  { name: 'Soy Milk',        cal: 100, protein: 7, rating: '🥛' },
];

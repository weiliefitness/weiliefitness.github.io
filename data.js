// ============================================
// WEILIE FITNESS HUB — DATA LAYER v2
// ============================================

const SHEET_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';
let _cache = {}, _lastFetch = {};

async function fetchSheet(tab, useCache = true) {
  const now = Date.now();
  const TTL = CONFIG.REFRESH_INTERVAL * 60000;
  if (useCache && _cache[tab] && (now - (_lastFetch[tab]||0)) < TTL) return _cache[tab];
  try {
    const url = `${SHEET_BASE}/${CONFIG.SHEET_ID}/values/${encodeURIComponent(tab)}?key=${CONFIG.SHEETS_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.status);
    const json = await res.json();
    _cache[tab] = json.values || [];
    _lastFetch[tab] = now;
    return _cache[tab];
  } catch(e) {
    console.warn('Sheet fetch failed:', tab, e);
    return _cache[tab] || [];
  }
}

function parseRows(rows) {
  if (!rows || rows.length < 2) return [];
  const headers = rows[0];
  return rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((h,i) => obj[h.trim()] = (row[i]||'').toString().trim());
    return obj;
  }).filter(r => r['Date']);
}

async function getDailyHealth()  { return parseRows(await fetchSheet(CONFIG.TABS.dailyHealth)); }
async function getLatestHealth() { const d = await getDailyHealth(); return d[d.length-1] || null; }
async function getLastN(n=14)    { const d = await getDailyHealth(); return d.slice(-n); }

async function getDailyLog() {
  const rows = await fetchSheet(CONFIG.TABS.dailyLog);
  return parseRows(rows);
}

async function getLatestBrief() {
  const logs = await getDailyLog();
  return logs[logs.length-1] || null;
}

// ---- RECOVERY SCORE ----
function calcRecoveryScore(row) {
  if (!row) return null;
  const bb    = Math.min(parseFloat(row['Body Battery (AM)'])||0, 100);
  const sleep = Math.min(parseFloat(row['Sleep Score'])||0, 100);
  const hrv   = Math.min(((parseFloat(row['Avg Overnight HRV (ms)'])||0)/80)*100, 100);
  const stress= Math.max(0, 100-(parseFloat(row['Stress Score'])||50));
  const w = PERIODIZATION.weights;
  return Math.round(bb*w.bb + sleep*w.sleep + hrv*w.hrv + stress*w.stress);
}

function getLevel(score) {
  if (score === null) return 'rest';
  const t = PERIODIZATION.thresholds;
  if (score >= t.high)     return 'high';
  if (score >= t.moderate) return 'moderate';
  if (score >= t.low)      return 'low';
  return 'rest';
}

function buildPrescription(score, row) {
  const level  = getLevel(score);
  const cfg    = PERIODIZATION.levels[level];
  const dow    = new Date().getDay();
  const plan   = PERIODIZATION.weeklyPlan[dow];
  const ex     = EXERCISES;
  let exercises = [];

  if (level === 'rest') {
    exercises = [
      { name:'Complete Rest', sets:'No training', note:'Focus on sleep & nutrition', url:'' },
      ...ex.mobility.slice(0,2)
    ];
  } else if (level === 'low') {
    exercises = [
      { name:'30-45 min Walk', sets:'Easy pace', note:'Keep HR below 120 bpm', url:'' },
      ...ex.mobility, ex.core[0]
    ];
  } else if (level === 'moderate') {
    exercises = plan.type === 'lower'
      ? [ex.lower[0], ex.lower[1], ex.core[0], ex.core[2], ex.mobility[0]]
      : [ex.upper_push[0], ex.upper_pull[0], ex.core[0], ex.core[2], ex.mobility[0]];
  } else {
    if (plan.type === 'upper')
      exercises = [...ex.upper_push.slice(0,2), ...ex.upper_pull.slice(0,2), ex.core[1], ex.mobility[0]];
    else if (plan.type === 'lower')
      exercises = [...ex.lower, ...ex.core.slice(0,2), ex.mobility[1]];
    else if (plan.type === 'full')
      exercises = [ex.upper_push[0], ex.upper_pull[0], ex.lower[0], ex.lower[2], ex.core[1], ex.mobility[0]];
    else
      exercises = [{ name:'45-60 min Walk', sets:'Brisk pace', note:'Target 8,000+ steps', url:'' }, ...ex.mobility];
  }

  const parts = [];
  const bb=row?.['Body Battery (AM)'], sl=row?.['Sleep Score'], hv=row?.['Avg Overnight HRV (ms)'], st=row?.['Stress Score'];
  if(bb) parts.push(`BB ${bb}`);
  if(sl) parts.push(`Sleep ${sl}/100`);
  if(hv) parts.push(`HRV ${hv}ms`);
  if(st) parts.push(`Stress ${st}`);

  return {
    score, level, label: cfg.label, tag: cfg.tag, cls: cfg.cls, color: cfg.color,
    exercises, planDay: plan.label,
    reason: parts.length ? `${parts.join(' · ')} → Score ${score}/100` : `Score ${score}/100`
  };
}

// ---- FOOD LOG (localStorage, resets daily) ----
const _todayKey = () => `food_${new Date().toISOString().split('T')[0]}`;
function getFoodLog()       { try { return JSON.parse(localStorage.getItem(_todayKey())||'[]'); } catch(e){ return []; } }
function saveFoodLog(log)   { localStorage.setItem(_todayKey(), JSON.stringify(log)); }
function addFoodItem(item)  { const log=getFoodLog(); log.push({...item, id:Date.now(), time:new Date().toLocaleTimeString('en-SG',{hour:'2-digit',minute:'2-digit'})}); saveFoodLog(log); return log; }
function removeFoodItem(id) { const log=getFoodLog().filter(m=>m.id!==id); saveFoodLog(log); return log; }
function clearFood()        { localStorage.removeItem(_todayKey()); }
function getFoodTotals()    { return getFoodLog().reduce((a,m)=>({cal:a.cal+(parseInt(m.cal)||0), protein:a.protein+(parseInt(m.protein)||0)}),{cal:0,protein:0}); }

// ---- WATER (localStorage, ml) ----
const _waterKey = () => `water_${new Date().toISOString().split('T')[0]}`;
function getWaterMl()    { return parseInt(localStorage.getItem(_waterKey())||'0'); }
function setWaterMl(ml)  { localStorage.setItem(_waterKey(), Math.max(0, ml)); }
function addWaterMl(ml)  { setWaterMl(getWaterMl() + ml); }

// ---- STREAKS ----
async function calcStreaks() {
  const data = await getLastN(30);
  let steps=0, checkin=0;
  for (let i=data.length-1; i>=0; i--) {
    if (parseInt(data[i]['Steps']||0) >= CONFIG.TARGETS.steps) steps++;
    else break;
  }
  for (let i=data.length-1; i>=0; i--) {
    if (data[i]['Sleep Score']) checkin++;
    else break;
  }
  return { steps, checkin };
}

// ---- CHART HELPERS ----
function chartData(rows, field) {
  return rows.map(r => ({
    x: (r['Date']||'').toString().slice(5,10),
    y: parseFloat(r[field])||null
  })).filter(d => d.y !== null);
}

// ---- REPORT CARD ----
async function calcReportCard() {
  const data = await getLastN(7);
  const avg = f => data.reduce((a,r)=>a+(parseFloat(r[f])||0),0)/(data.length||1);
  const grade = (v,a,b) => v>=a?'A':v>=b?'B':v>=b*.7?'C':'D';
  return [
    { label:'Sleep Quality',  grade: grade(avg('Sleep Score'),80,65) },
    { label:'Daily Steps',    grade: grade(avg('Steps'),8000,6000) },
    { label:'Stress Control', grade: grade(100-avg('Stress Score'),70,55) },
    { label:'Recovery (BB)',  grade: grade(avg('Body Battery (AM)'),65,45) }
  ];
}

// ---- BADGES ----
const BADGES = [
  { icon:'🌱', name:'Day One',      desc:'First check-in',         check: d=>d.length>=1 },
  { icon:'📅', name:'Week Warrior', desc:'7 days of data',          check: d=>d.length>=7 },
  { icon:'🗓️', name:'Month Strong', desc:'30 days of data',         check: d=>d.length>=30 },
  { icon:'👣', name:'Step Master',  desc:'Hit 8k steps in a day',   check: d=>d.some(r=>parseInt(r['Steps']||0)>=8000) },
  { icon:'😴', name:'Deep Sleeper', desc:'Sleep score 90+',         check: d=>d.some(r=>parseFloat(r['Sleep Score']||0)>=90) },
  { icon:'⚡', name:'Full Charge',  desc:'Body Battery 80+',        check: d=>d.some(r=>parseFloat(r['Body Battery (AM)']||0)>=80) },
  { icon:'🧘', name:'Zen Master',   desc:'Stress below 20',         check: d=>d.some(r=>parseFloat(r['Stress Score']||99)<20) },
  { icon:'🎯', name:'Fat Fighter',  desc:'Visceral fat reduced',    check: d=>d.length>=2&&parseFloat(d[d.length-1]['Visceral Fat']||99)<parseFloat(d[0]['Visceral Fat']||99) },
  { icon:'⚖️', name:'First Kilo',   desc:'Lost first 1kg',          check: d=>d.length>=2&&(parseFloat(d[0]['Weight (kg)']||0)-parseFloat(d[d.length-1]['Weight (kg)']||0))>=1 },
  { icon:'🏆', name:'Five Down',    desc:'Lost 5kg from start',     check: d=>CONFIG.START.weight-(parseFloat((d[d.length-1]||{})['Weight (kg)'])||CONFIG.START.weight)>=5 },
  { icon:'💓', name:'HRV Hero',     desc:'HRV above 50ms',          check: d=>d.some(r=>parseFloat(r['Avg Overnight HRV (ms)']||0)>=50) },
  { icon:'🔥', name:'On Fire',      desc:'7-day steps streak',      check: d=>{let s=0;for(let i=d.length-1;i>=0;i--){if(parseInt(d[i]['Steps']||0)>=8000)s++;else break;}return s>=7;} }
];

// ============================================
// WEILIE FITNESS HUB — APP v3
// ============================================

Chart.defaults.color = '#6b6b80';
Chart.defaults.borderColor = '#252535';
Chart.defaults.font.family = "'Space Mono',monospace";
Chart.defaults.font.size = 10;

const CHARTS = {};

function mkChart(id, type, labels, datasets, opts={}) {
  if (CHARTS[id]) CHARTS[id].destroy();
  const ctx = document.getElementById(id);
  if (!ctx) return;
  CHARTS[id] = new Chart(ctx, {
    type, data: { labels, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: '#1a1a24' }, ticks: { maxTicksLimit: 7 } },
        y: { grid: { color: '#1a1a24' } }
      },
      ...opts
    }
  });
}

function line(data, color, label='') {
  return { label, data, borderColor: color, backgroundColor: color+'18',
    borderWidth: 2, pointRadius: 3, pointBackgroundColor: color, tension: 0.4, fill: true };
}

// ---- NAV ----
function nav(name, el) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('pg-'+name).classList.add('active');
  document.querySelectorAll('.nav-links a, .mob-item').forEach(a => a.classList.remove('active'));
  if (el) el.classList.add('active');
  loadPage(name);
  return false;
}

async function loadPage(name) {
  const map = { home: loadHome, progress: loadProgress, recovery: loadRecovery,
                food: loadFood, training: loadTraining, goals: loadGoals };
  if (map[name]) await map[name]();
}

// ---- UTILS ----
function $(id) { return document.getElementById(id); }
function set(id, val, html=false) { const e=$(id); if(e){ html ? e.innerHTML=val : e.textContent=val; } }
function setw(id, pct) { const e=$(id); if(e) e.style.width=Math.min(pct||0,100)+'%'; }
function fmtMin(m) { const mins=parseInt(m)||0; return `${Math.floor(mins/60)}h ${mins%60}m`; }
function stepsColor(s) { return s>=8000?'var(--green)':s>=6000?'var(--yellow)':'var(--red)'; }
function greet() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-SG',{day:'numeric',month:'short',year:'numeric'});
}

// ---- DATE SELECTOR HELPERS ----
function getDateNDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}
function activateDateBtn(btn) {
  if (!btn) return;
  btn.closest('.date-bar')?.querySelectorAll('.date-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

// ---- HOME ----
async function loadHome() {
  const now = new Date();
  set('hGreet', `${greet()}, Weilie 👋`);
  set('hDate', now.toLocaleDateString('en-SG',{weekday:'long',year:'numeric',month:'long',day:'numeric'}));
  const wk = Math.ceil(((now-new Date(now.getFullYear(),0,1))/86400000+1)/7);
  set('hWeek', `WEEK ${wk}`);

  const latest = await getLatestHealth();
  const score  = calcRecoveryScore(latest);
  const px     = buildPrescription(score, latest);

  // Recovery ring
  const ring = $('recRing');
  if (ring) {
    ring.style.strokeDashoffset = 251 - (251 * Math.min((score||0)/100, 1));
    ring.style.stroke = px.color;
  }
  set('recScore', score !== null ? score : '—');
  $('recScore') && ($('recScore').style.color = px.color);
  set('recTitle', px.label);
  set('recReason', px.reason);
  set('recTag', `<span class="tag ${px.cls}">${px.tag}</span>`, true);

  if (latest) {
    const bb=latest['Body Battery (AM)'], sl=latest['Sleep Score'];
    const hv=latest['Avg Overnight HRV (ms)'], st=latest['Stress Score'];
    set('mBB', bb||'—'); setw('mBBbar', parseFloat(bb)||0);
    set('mSleep', sl||'—'); setw('mSleepbar', parseFloat(sl)||0);
    set('mHRV', hv||'—'); setw('mHRVbar', Math.min(((parseFloat(hv)||0)/80)*100, 100));
    const stPct = Math.max(0, 100-(parseFloat(st)||50));
    set('mStress', st||'—'); setw('mStressbar', stPct);

    // Body stats strip
    const d = latest['Date'];
    set('statsDate', d ? `as at ${fmtDate(d)}` : 'as at —');
    set('sWeight', latest['Weight (kg)']||'—');
    set('sBF', latest['Body Fat %']||'—');
    set('sVF', latest['Visceral Fat']||'—');
    set('sMu', latest['Muscle (kg)'] ? parseFloat(latest['Muscle (kg)']).toFixed(1) : '—');
    set('sBMR', latest['BMR (kcal)']||'—');
    set('sAge', latest['Body Age']||'—');

    // Steps
    const steps = parseInt(latest['Steps'])||0;
    const goal  = parseInt(latest['Step Goal'])||CONFIG.TARGETS.steps;
    const sc = stepsColor(steps);
    set('stBig', steps.toLocaleString());
    $('stBig') && ($('stBig').style.color = sc);
    set('stGoal', goal.toLocaleString());
    set('stDist', latest['Steps Distance (km)'] ? latest['Steps Distance (km)']+'km' : '—');
    set('stCal', latest['Steps Calories']||'—');
    const stTag = steps>=8000?'<span class="tag tg">✅ TARGET HIT</span>':steps>=6000?'<span class="tag ty">⚡ CLOSE</span>':'<span class="tag tr">⚠️ KEEP MOVING</span>';
    set('stTag', stTag, true);
    const stRing = $('stepsRing');
    if (stRing) {
      stRing.style.strokeDashoffset = 195 - (195*Math.min(steps/goal,1));
      stRing.style.stroke = sc;
    }
  }

  // Today's workout mini list
  renderHomeWorkout(px);

  // Nutrition
  const t = getFoodTotals();
  renderNutritionHome(t);

  // Brief
  const brief = await getLatestBrief();
  if (brief && brief['Claude Brief']) {
    set('briefDate', brief['Date']||'');
    set('briefWorkout', brief['Claude Brief']);
    set('briefNutrition', brief['Food Summary']||'Log your meals in the Food tab to track nutrition.');
    set('briefMotivation', brief["Today's Advice"]||'Stay consistent — every day counts.');
  }

  // Streaks
  const streaks = await calcStreaks();
  set('strCheckin', streaks.checkin);
  set('strSteps', streaks.steps);
}

function renderHomeWorkout(px) {
  const el = $('homeWorkoutList');
  if (!el || !px) return;
  const key = getTodayKey();
  const done = getCompletedExercises(key);
  const exercises = px.exercises.filter(e => e.sets && e.sets !== 'No training').slice(0, 5);
  if (!exercises.length) { el.innerHTML = '<div style="color:var(--muted);font-size:12px;padding:6px 0">Rest day — no exercises prescribed.</div>'; return; }
  el.innerHTML = exercises.map(e => {
    const checked = done.includes(e.name);
    return `<div class="workout-item-mini ${checked?'done':''}" onclick="toggleExercise('${e.name.replace(/'/g,"\\'")}');renderHomeWorkout(_currentPx)">
      <span class="wcheck">${checked?'✅':'⬜'}</span>
      <span class="wname" style="${checked?'text-decoration:line-through;color:var(--muted)':''}"> ${e.name}</span>
      <span class="wsets">${e.sets}</span>
    </div>`;
  }).join('');
  const doneCount = done.filter(n => exercises.some(e => e.name === n)).length;
  set('homeExProgress', `${doneCount}/${exercises.length}`);
  setw('homeExProgressBar', exercises.length ? (doneCount/exercises.length)*100 : 0);
}

function renderNutritionHome(t) {
  set('hCal', t.cal.toLocaleString());
  set('hProt', t.protein);
  set('hCalRem', Math.max(0,CONFIG.TARGETS.calories-t.cal).toLocaleString());
  set('hProtRem', Math.max(0,CONFIG.TARGETS.protein-t.protein)+'g');
  setw('hCalBar', (t.cal/CONFIG.TARGETS.calories)*100);
  setw('hProtBar', (t.protein/CONFIG.TARGETS.protein)*100);
}

// ---- PROGRESS ----
let _progressData = null;
async function loadProgress(targetDate=null) {
  const data = await getLastN(30);
  _progressData = data;
  let l = data[data.length-1];
  if (targetDate) {
    const match = data.find(r => (r['Date']||'').toString().startsWith(targetDate));
    if (match) l = match;
  }
  if (!l) return;

  const w=parseFloat(l['Weight (kg)'])||null, bf=parseFloat(l['Body Fat %'])||null;
  const vf=parseFloat(l['Visceral Fat'])||null, mu=parseFloat(l['Muscle (kg)'])||null;
  const ba=parseFloat(l['Body Age'])||null;

  set('pW', w?w.toFixed(1):'—'); set('pBF', bf?bf.toFixed(1):'—');
  set('pVF', vf||'—'); set('pMu', mu?mu.toFixed(2):'—');

  if (ba) {
    set('cdNow', ba); set('cdGap', Math.max(0, ba-38));
    setw('cdBar', Math.max(0,Math.min(((56-ba)/(56-38))*100,100)));
  }

  const S = CONFIG.START, T = CONFIG.TARGETS;
  if(w)  setw('pWbar', Math.max(0,((S.weight-w)/(S.weight-T.weight))*100));
  if(bf) setw('pBFbar', Math.max(0,((S.bodyFat-bf)/(S.bodyFat-T.bodyFat))*100));
  if(vf) setw('pVFbar', Math.max(0,((S.visceralFat-vf)/(S.visceralFat-T.visceralFat))*100));

  if (data.length >= 2) {
    const f = data[0];
    chg('pWch', parseFloat(f['Weight (kg)']), w, true);
    chg('pBFch', parseFloat(f['Body Fat %']), bf, true);
    chg('pVFch', parseFloat(f['Visceral Fat']), vf, true);
    chg('pMuch', parseFloat(f['Muscle (kg)']), mu, false);
  }

  const lbl = data.map(r=>(r['Date']||'').toString().slice(5,10));
  mkChart('cW',  'line', lbl, [line(data.map(r=>parseFloat(r['Weight (kg)'])||null), '#4d9fff')]);
  mkChart('cBF', 'line', lbl, [line(data.map(r=>parseFloat(r['Body Fat %'])||null), '#ff6b35')]);
  mkChart('cVF', 'line', lbl, [line(data.map(r=>parseFloat(r['Visceral Fat'])||null), '#ff4545')]);
  mkChart('cMu', 'line', lbl, [line(data.map(r=>parseFloat(r['Muscle (kg)'])||null), '#00e87a')]);
}

function setProgressDate(mode, btn) {
  activateDateBtn(btn);
  if (mode === 'latest') loadProgress(null);
  else if (mode === '7d')  loadProgress(getDateNDaysAgo(7));
  else if (mode === '30d') loadProgress(getDateNDaysAgo(30));
}
function setProgressDateCustom(val) {
  document.querySelectorAll('#pg-progress .date-btn').forEach(b=>b.classList.remove('active'));
  loadProgress(val);
}

function chg(id, from, to, lowerBetter) {
  if (!from||!to) return;
  const diff = to-from, improved = lowerBetter ? diff<0 : diff>0;
  const el=$(id); if(!el) return;
  el.textContent = `${diff>0?'+':''}${diff.toFixed(1)} from start`;
  el.className = improved?'chg-dn mono':'chg-up mono';
  if(diff===0) el.className='chg-n mono';
}

// ---- RECOVERY ----
async function loadRecovery(targetDate=null) {
  const data = await getLastN(14);
  let l = data[data.length-1];
  if (targetDate) {
    const match = data.find(r => (r['Date']||'').toString().startsWith(targetDate));
    if (match) l = match;
  }
  if (l) {
    set('rSl', l['Sleep Score']||'—');
    set('rDur', l['Sleep Duration (hrs)']?parseFloat(l['Sleep Duration (hrs)']).toFixed(1):'—');
    set('rHRV', l['Avg Overnight HRV (ms)']||'—');
    set('rHR', l['Resting HR']||'—');
    set('rDeep', l['Deep Sleep (min)']||'—');
    set('rLight', l['Light Sleep (min)']||'—');
    set('rREM', l['REM Sleep (min)']||'—');
    set('rAwake', l['Awake (min)']||'0');
    const tot = 1440;
    const sf = (id, bid, v) => { set(id, v?fmtMin(v):'—'); setw(bid, v?(parseInt(v)/tot)*100:0); };
    sf('rSRest','rSRestB',l['Stress Rest (min)']);
    sf('rSLow','rSLowB',l['Stress Low (min)']);
    sf('rSMed','rSMedB',l['Stress Med (min)']);
    sf('rSHigh','rSHighB',l['Stress High (min)']);
  }
  const lbl = data.map(r=>(r['Date']||'').toString().slice(5,10));
  mkChart('cSl',  'line', lbl, [line(data.map(r=>parseFloat(r['Sleep Score'])||null), '#4d9fff')]);
  mkChart('cHRV', 'line', lbl, [line(data.map(r=>parseFloat(r['Avg Overnight HRV (ms)'])||null), '#ff6bca')]);
  mkChart('cBB',  'line', lbl, [line(data.map(r=>parseFloat(r['Body Battery (AM)'])||null), '#00e87a')]);
  mkChart('cHR',  'line', lbl, [line(data.map(r=>parseFloat(r['Resting HR'])||null), '#ff6b35')]);
}

function setRecoveryDate(mode, btn) {
  activateDateBtn(btn);
  if (mode === 'latest')    loadRecovery(null);
  else if (mode === 'yesterday') loadRecovery(getDateNDaysAgo(1));
  else if (mode === '7d')   loadRecovery(getDateNDaysAgo(7));
}
function setRecoveryDateCustom(val) {
  document.querySelectorAll('#pg-recovery .date-btn').forEach(b=>b.classList.remove('active'));
  loadRecovery(val);
}

// ---- FOOD ----
let _foodMode = 'today'; // today | yesterday | history | custom

function loadFood(mode=null) {
  if (mode) _foodMode = mode;
  buildHawkerGrid();
  buildBevGrid();
  const isToday = _foodMode === 'today';
  const ql = $('foodQuickLog');
  if (ql) ql.style.display = isToday ? 'block' : 'none';
  const cb = $('clearFoodBtn');
  if (cb) cb.style.display = isToday ? '' : 'none';
  renderLog();
  renderWater();
}

function setFoodDate(mode, btn) {
  activateDateBtn(btn);
  _foodMode = mode;
  const dp = $('foodDatePicker');
  if (dp) dp.value = '';
  loadFood();
}

function setFoodDateCustom(val) {
  document.querySelectorAll('#pg-food .date-btn').forEach(b=>b.classList.remove('active'));
  _foodMode = val;
  loadFood();
}

function buildHawkerGrid() {
  const g = $('hawkerGrid');
  if (!g || g.dataset.built) return;
  g.innerHTML = MEALS.map((m,i) => `
    <button class="meal-btn" onclick="logMeal(${i})">
      <div class="meal-name">${m.name}</div>
      <div class="meal-info">
        <span style="color:var(--orange)">🔥${m.cal}</span>
        <span style="color:var(--blue)">💪${m.protein}g</span>
        <span>${m.rating}</span>
      </div>
    </button>`).join('');
  g.dataset.built = '1';
}

function buildBevGrid() {
  const g = $('bevGrid');
  if (!g || g.dataset.built) return;
  g.innerHTML = BEVERAGES.map((b,i) => `
    <button class="bev-btn" onclick="logBev(${i})">
      <div style="font-weight:500;margin-bottom:3px">${b.name}</div>
      <div style="font-family:var(--fm);font-size:9px;color:var(--blue)">🔥${b.cal} · 💪${b.protein}g</div>
    </button>`).join('');
  g.dataset.built = '1';
}

function logMeal(i) { addFoodItem(MEALS[i]); renderLog(); renderNutritionHome(getFoodTotals()); syncFoodBars(); }
function logBev(i)  { addFoodItem(BEVERAGES[i]); renderLog(); renderNutritionHome(getFoodTotals()); syncFoodBars(); }

function manualAdd() {
  const name = $('manName')?.value?.trim();
  const cal  = parseInt($('manCal')?.value)||0;
  const prot = parseInt($('manProt')?.value)||0;
  if (!name) { alert('Please enter a meal name'); return; }
  addFoodItem({ name, cal, protein: prot, rating: '📝' });
  if($('manName')) $('manName').value='';
  if($('manCal'))  $('manCal').value='';
  if($('manProt')) $('manProt').value='';
  renderLog(); renderNutritionHome(getFoodTotals()); syncFoodBars();
}

function renderLog() {
  const list = $('logList');
  if (!list) return;

  if (_foodMode === 'history') {
    // Show all days
    set('foodLogTitle', 'FOOD HISTORY');
    const allKeys = Object.keys(localStorage).filter(k=>k.startsWith('food_')).sort().reverse();
    if (!allKeys.length) {
      list.innerHTML = '<div class="log-item" style="justify-content:center;color:var(--muted);font-size:13px;padding:16px">No food history yet</div>';
      syncFoodBars(0, 0); return;
    }
    list.innerHTML = allKeys.map(key => {
      const dateStr = key.replace('food_','');
      const items = JSON.parse(localStorage.getItem(key)||'[]');
      const totals = items.reduce((a,m)=>({cal:a.cal+(parseInt(m.cal)||0), protein:a.protein+(parseInt(m.protein)||0)}),{cal:0,protein:0});
      return `
        <div class="log-day-hdr" style="font-family:var(--fm);font-size:9px;color:var(--muted);letter-spacing:.08em;padding:7px 14px;background:var(--bg3);border-bottom:1px solid var(--border)">
          📅 ${fmtDate(dateStr)} &nbsp;·&nbsp; 🔥${totals.cal}kcal &nbsp;·&nbsp; 💪${totals.protein}g
        </div>
        ${items.map(m=>`
        <div class="log-item">
          <div class="log-time">${m.time||'—'}</div>
          <div class="log-name">${m.name} ${m.rating||''}</div>
          <div class="log-macros">
            <div style="color:var(--orange)">${m.cal} kcal</div>
            <div style="color:var(--blue)">${m.protein}g protein</div>
          </div>
        </div>`).join('')}`;
    }).join('');
    return;
  }

  // Single day view
  let key = _todayKey();
  if (_foodMode === 'yesterday') key = `food_${getDateNDaysAgo(1)}`;
  else if (_foodMode !== 'today' && _foodMode.match(/^\d{4}-/)) key = `food_${_foodMode}`;

  const dateLabel = _foodMode === 'today' ? "TODAY'S LOG" : _foodMode === 'yesterday' ? "YESTERDAY'S LOG" : `LOG: ${fmtDate(_foodMode)}`;
  set('foodLogTitle', dateLabel);

  let log = [];
  try { log = JSON.parse(localStorage.getItem(key)||'[]'); } catch(e) {}

  if (!log.length) {
    list.innerHTML = '<div class="log-item" style="justify-content:center;color:var(--muted);font-size:13px;padding:16px">No meals logged for this day</div>';
    syncFoodBars(0, 0); return;
  }

  list.innerHTML = log.map(m => `
    <div class="log-item">
      <div class="log-time">${m.time||'—'}</div>
      <div class="log-name">${m.name} ${m.rating||''}</div>
      <div class="log-macros">
        <div style="color:var(--orange)">${m.cal} kcal</div>
        <div style="color:var(--blue)">${m.protein}g protein</div>
      </div>
      ${_foodMode==='today'?`<button class="rm-btn" onclick="delMeal(${m.id})">✕</button>`:''}
    </div>`).join('');

  const totals = log.reduce((a,m)=>({cal:a.cal+(parseInt(m.cal)||0), protein:a.protein+(parseInt(m.protein)||0)}),{cal:0,protein:0});
  syncFoodBars(totals.cal, totals.protein);
}

function delMeal(id) { removeFoodItem(id); renderLog(); renderNutritionHome(getFoodTotals()); }
function clearFoodDay() { clearFood(); renderLog(); renderNutritionHome({cal:0,protein:0}); }

function syncFoodBars(cal, protein) {
  if (cal === undefined) { const t = getFoodTotals(); cal = t.cal; protein = t.protein; }
  set('fCal', (cal||0).toLocaleString()); set('fProt', protein||0);
  set('fCalRem', Math.max(0,CONFIG.TARGETS.calories-(cal||0)).toLocaleString());
  set('fProtRem', Math.max(0,CONFIG.TARGETS.protein-(protein||0)));
  setw('fCalBar', ((cal||0)/CONFIG.TARGETS.calories)*100);
  setw('fProtBar', ((protein||0)/CONFIG.TARGETS.protein)*100);
}

function addWater(ml) { addWaterMl(ml); renderWater(); }
function addCustomWater() {
  const ml = parseInt($('wCustom')?.value)||0;
  if (ml>0) { addWaterMl(ml); if($('wCustom'))$('wCustom').value=''; renderWater(); }
}
function resetWater() { setWaterMl(0); renderWater(); }
function renderWater() {
  const ml = getWaterMl();
  const pct = Math.min((ml/CONFIG.TARGETS.water)*100, 100);
  set('wMl', ml.toLocaleString());
  setw('wBar', pct);
  set('wPct', Math.round(pct)+'%');
}

// ---- TRAINING ----
const _workoutKey = (date) => `workout_${date}`;
function getTodayKey() { return new Date().toISOString().split('T')[0]; }
function getCompletedExercises(dateKey) {
  try { return JSON.parse(localStorage.getItem(_workoutKey(dateKey))||'[]'); } catch(e) { return []; }
}
function saveCompletedExercises(dateKey, completed) {
  localStorage.setItem(_workoutKey(dateKey), JSON.stringify(completed));
}
function toggleExercise(exName) {
  const key = getTodayKey();
  const done = getCompletedExercises(key);
  const idx = done.indexOf(exName);
  if (idx >= 0) done.splice(idx, 1); else done.push(exName);
  saveCompletedExercises(key, done);
  renderExerciseList(_currentPx);
  renderHomeWorkout(_currentPx);
}

let _currentPx = null;

function renderExerciseList(px) {
  if (!px) return;
  _currentPx = px;
  const key = getTodayKey();
  const done = getCompletedExercises(key);
  const el = $('exList');
  if (!el) return;
  el.innerHTML = px.exercises.map(e => {
    const checked = done.includes(e.name);
    return `
      <div class="ex-item ${checked?'ex-done':''}" onclick="toggleExercise('${e.name.replace(/'/g,"\\'")}')">
        <div class="ex-check">${checked?'✅':'⬜'}</div>
        <div class="ex-left">
          <div class="ex-name" style="${checked?'text-decoration:line-through;color:var(--muted)':''}">${e.name}</div>
          ${e.note?`<div class="ex-note">⚠️ ${e.note}</div>`:''}
        </div>
        <div class="ex-right">
          <div class="ex-sets">${e.sets}</div>
          ${e.url?`<a class="btn-yt" href="${e.url}" target="_blank" rel="noopener" onclick="event.stopPropagation()">▶ YT</a>`:''}
        </div>
      </div>`;
  }).join('');
  const total = px.exercises.filter(e=>e.sets&&e.sets!=='No training').length;
  const doneCount = done.filter(n=>px.exercises.some(e=>e.name===n)).length;
  set('exProgress', `${doneCount}/${total} completed`);
  setw('exProgressBar', total?(doneCount/total)*100:0);
}

async function loadTraining(targetDate=null) {
  const data = await getLastN(14);
  let l = targetDate
    ? data.find(r=>(r['Date']||'').toString().startsWith(targetDate)) || data[data.length-1]
    : data[data.length-1];

  const score = calcRecoveryScore(l);
  const px    = buildPrescription(score, l);

  set('pxTitle', px.label);
  set('pxDay', px.planDay);
  set('pxTag', `<span class="tag ${px.cls}">${px.tag}</span>`, true);
  renderExerciseList(px);

  if (l) {
    set('tBB', l['Body Battery (AM)']||'—');
    set('tSl', l['Sleep Score']||'—');
    set('tHRV', l['Avg Overnight HRV (ms)']||'—');
    set('tSt', l['Stress Score']||'—');
  }

  buildCalendar();
  await loadActivityLog();

  const lbl = data.map(r=>(r['Date']||'').toString().slice(5,10));
  const loads = data.map(r=>{const s=calcRecoveryScore(r);const lv=getLevel(s);return lv==='high'?3:lv==='moderate'?2:lv==='low'?1:0;});
  mkChart('cLoad','bar',lbl,[{
    data:loads,
    backgroundColor:loads.map(l=>l===3?'rgba(0,232,122,.6)':l===2?'rgba(77,159,255,.6)':l===1?'rgba(245,200,66,.6)':'rgba(255,255,255,.1)'),
    borderRadius:4
  }],{scales:{y:{min:0,max:3,ticks:{stepSize:1,callback:v=>['REST','LIGHT','MOD','FULL'][v]}}}});
}

function setTrainingDate(mode, btn) {
  activateDateBtn(btn);
  if (mode === 'today')     loadTraining(null);
  else if (mode === 'yesterday') loadTraining(getDateNDaysAgo(1));
}
function setTrainingDateCustom(val) {
  document.querySelectorAll('#pg-training .date-btn').forEach(b=>b.classList.remove('active'));
  loadTraining(val);
}

async function loadActivityLog() {
  const el = $('activityLog');
  if (!el) return;
  el.innerHTML = '<div style="color:var(--muted);font-size:12px;padding:8px 0">Loading activities...</div>';
  try {
    const rows = await fetchSheet(CONFIG.TABS.activities);
    const activities = rows.slice(1).filter(r=>r[0]).map(r=>({
      date:r[0]||'', type:r[1]||'', duration:parseInt(r[2])||0,
      distance:parseFloat(r[3])||0, calories:parseInt(r[4])||0,
      avgHR:parseInt(r[5])||0, source:r[6]||'', id:r[7]||''
    })).reverse().slice(0,20);

    if (!activities.length) {
      el.innerHTML = `<div style="text-align:center;padding:20px;color:var(--muted)">
        <div style="font-size:28px;margin-bottom:8px">🏃</div>
        <div style="font-family:var(--fm);font-size:10px;letter-spacing:.1em">NO ACTIVITIES YET</div>
        <div style="font-size:12px;margin-top:6px">Complete a workout — it'll appear here via Garmin sync</div>
      </div>`; return;
    }

    el.innerHTML = activities.map(a=>{
      const dObj = new Date(a.date);
      const dStr = dObj.toLocaleDateString('en-SG',{day:'numeric',month:'short'});
      const dyStr = dObj.toLocaleDateString('en-SG',{weekday:'short'});
      const isGarmin = a.source==='Strava-Auto';
      return `<div class="act-item">
        <div class="act-date"><div class="act-day">${dyStr}</div><div class="act-dn">${dStr}</div></div>
        <div class="act-icon">${getActivityIcon(a.type)}</div>
        <div class="act-info">
          <div class="act-type">${a.type||'Workout'}</div>
          <div class="act-stats">
            ${a.duration?`<span>⏱ ${a.duration}min</span>`:''}
            ${a.distance?`<span>📍 ${a.distance}km</span>`:''}
            ${a.calories?`<span>🔥 ${a.calories}cal</span>`:''}
            ${a.avgHR?`<span>❤️ ${a.avgHR}bpm</span>`:''}
          </div>
        </div>
        <div class="act-source">${isGarmin?'<span class="tag tg" style="font-size:8px">GARMIN</span>':'<span class="tag tb" style="font-size:8px">MANUAL</span>'}</div>
      </div>`;
    }).join('');
  } catch(e) {
    el.innerHTML = '<div style="color:var(--muted);font-size:12px;padding:8px 0">Could not load activities.</div>';
  }
}

function getActivityIcon(type) {
  const t=(type||'').toLowerCase();
  if(t.includes('run'))return'🏃';if(t.includes('walk')||t.includes('hike'))return'🚶';
  if(t.includes('swim'))return'🏊';if(t.includes('cycle')||t.includes('ride'))return'🚴';
  if(t.includes('strength')||t.includes('weight'))return'🏋️';if(t.includes('yoga'))return'🧘';
  return'💪';
}

function buildCalendar() {
  const now=new Date(), y=now.getFullYear(), m=now.getMonth();
  const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
  set('calMY',`${months[m]} ${y}`);
  const hdr=$('calHdr');
  if(hdr) hdr.innerHTML=['MON','TUE','WED','THU','FRI','SAT','SUN'].map(d=>`<div class="cal-hdr">${d}</div>`).join('');
  const grid=$('calGrid'); if(!grid) return;
  const first=(new Date(y,m,1).getDay()+6)%7, days=new Date(y,m+1,0).getDate(), today=now.getDate();
  let html='';
  for(let i=0;i<first;i++) html+='<div class="cal-day empty"></div>';
  for(let d=1;d<=days;d++){
    const dow=new Date(y,m,d).getDay(), plan=PERIODIZATION.weeklyPlan[dow];
    const isT=d===today, isFut=d>today;
    let cls='cal-day', tl='';
    if(isT){cls+=' today';tl='●';}
    else if(isFut){cls+=' d-future';tl=plan.type==='rest'?'R':plan.type==='walk'?'W':'S';}
    else{if(plan.type==='rest'){cls+=' d-rest';tl='R';}else if(plan.type==='walk'){cls+=' d-light';tl='W';}else{cls+=' d-mod';tl='S';}}
    html+=`<div class="${cls}" title="${new Date(y,m,d).toDateString()} — ${plan.label}"><span class="cal-dn">${d}</span><span class="cal-dt">${tl}</span></div>`;
  }
  grid.innerHTML=html;
}

// ---- GOALS ----
async function loadGoals() {
  const data = await getDailyHealth();

  // Badges
  const bg = $('badgeGrid');
  if (bg) {
    bg.innerHTML = BADGES.map(b => {
      const earned = b.check(data);
      // Find when badge was first earned
      let earnedDate = null;
      if (earned && data.length > 0) {
        for (let i = 0; i < data.length; i++) {
          if (b.check(data.slice(0, i+1))) {
            earnedDate = data[i]['Date'];
            break;
          }
        }
      }
      return `<div class="badge ${earned?'earned':'locked'}">
        <div class="badge-icon">${b.icon}</div>
        <div class="badge-name">${b.name}</div>
        <div class="badge-desc">${b.desc}</div>
        ${earned?`<div class="badge-date">✓ ${fmtDate(earnedDate)}</div>`:''}
      </div>`;
    }).join('');
  }

  // Report card
  const rc = $('reportCard');
  if (rc) {
    const report = await calcReportCard();
    rc.innerHTML = report.map(r=>`
      <div class="report-row">
        <div style="font-size:13px">${r.label}</div>
        <div class="grade g${r.grade}">${r.grade}</div>
      </div>`).join('');
  }

  // Goal timeline
  const gt = $('goalTimeline');
  if (gt) {
    const l = data[data.length-1]||{};
    const w=parseFloat(l['Weight (kg)'])||CONFIG.START.weight;
    const vf=parseFloat(l['Visceral Fat'])||CONFIG.START.visceralFat;
    const ba=parseFloat(l['Body Age'])||CONFIG.START.bodyAge;

    // Find achievement dates
    const findDate = (checkFn) => {
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        if (checkFn(row)) return row['Date'];
      }
      return null;
    };

    const goals = [
      { label:'🏁 Started journey', val:`${CONFIG.START.weight}kg → 80kg target`, achieved:true, date:data[0]?.['Date'] },
      { label:'⚖️ Break 100kg', val:`${w.toFixed(1)}kg now`, achieved:w<=100, date:findDate(r=>parseFloat(r['Weight (kg)']||999)<=100) },
      { label:'⚖️ Reach 95kg', val:`${w.toFixed(1)}kg now`, achieved:w<=95, date:findDate(r=>parseFloat(r['Weight (kg)']||999)<=95) },
      { label:'⚖️ Reach 90kg', val:`${w.toFixed(1)}kg now`, achieved:w<=90, date:findDate(r=>parseFloat(r['Weight (kg)']||999)<=90) },
      { label:'⚖️ Reach 80kg', val:'Target weight', achieved:w<=80, date:null },
      { label:'🫀 Visceral Fat ≤12', val:`VF ${vf} now`, achieved:vf<=12, date:findDate(r=>parseFloat(r['Visceral Fat']||99)<=12) },
      { label:'🫀 Visceral Fat ≤9', val:'Target', achieved:vf<=9, date:findDate(r=>parseFloat(r['Visceral Fat']||99)<=9) },
      { label:'🧬 Body Age 50', val:`Age ${ba} now`, achieved:ba<=50, date:findDate(r=>parseFloat(r['Body Age']||99)<=50) },
      { label:'🧬 Body Age 38', val:'Target age', achieved:ba<=38, date:null },
    ];

    gt.innerHTML = goals.map(g=>`
      <div class="goal-item">
        <div class="goal-dot ${g.achieved?'achieved':'pending'}"></div>
        <div class="goal-body">
          <div class="goal-label ${g.achieved?'achieved':'pending'}">${g.label}</div>
          <div class="goal-meta">${g.val}</div>
          ${g.achieved && g.date ? `<div class="goal-date">✓ Achieved ${fmtDate(g.date)}</div>` : ''}
          ${!g.achieved ? '<div style="font-family:var(--fm);font-size:9px;color:var(--muted);margin-top:2px">In progress...</div>' : ''}
        </div>
      </div>`).join('');
  }

  // Milestones
  const ms = $('milestones');
  if (ms) {
    const l2 = data[data.length-1]||{};
    const w2=parseFloat(l2['Weight (kg)'])||CONFIG.START.weight;
    const vf2=parseFloat(l2['Visceral Fat'])||CONFIG.START.visceralFat;
    const ba2=parseFloat(l2['Body Age'])||CONFIG.START.bodyAge;
    const list=[
      {label:'Reach 99kg', done:w2<=99, val:`${w2.toFixed(1)}kg`},
      {label:'Reach 95kg', done:w2<=95, val:`${w2.toFixed(1)}kg`},
      {label:'Reach 90kg', done:w2<=90, val:`${w2.toFixed(1)}kg`},
      {label:'Visceral Fat 12', done:vf2<=12, val:`VF ${vf2}`},
      {label:'Visceral Fat 9',  done:vf2<=9,  val:`VF ${vf2}`},
      {label:'Body Age 50',     done:ba2<=50, val:`Age ${ba2}`},
      {label:'Body Age 45',     done:ba2<=45, val:`Age ${ba2}`},
      {label:'Body Age 38',     done:ba2<=38, val:`Age ${ba2}`}
    ];
    ms.innerHTML = list.map(m=>`
      <div class="flex-between" style="padding:8px 0;border-bottom:1px solid var(--border)">
        <div style="display:flex;align-items:center;gap:8px">
          <span>${m.done?'✅':'⬜'}</span>
          <span style="font-size:13px;${m.done?'text-decoration:line-through;color:var(--muted)':''}">${m.label}</span>
        </div>
        <span class="mono" style="font-size:9px;color:var(--muted)">${m.val}</span>
      </div>`).join('');
  }
}

// ---- INIT ----
window.addEventListener('load', async () => {
  setTimeout(()=>{
    const l=$('loader');
    if(l){l.style.opacity='0';setTimeout(()=>l.style.display='none',500);}
  },2000);
  await loadHome();
  setInterval(async()=>{
    const ap=document.querySelector('.page.active');
    if(ap) await loadPage(ap.id.replace('pg-',''));
  },CONFIG.REFRESH_INTERVAL*60000);
});

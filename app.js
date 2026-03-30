// ============================================
// WEILIE FITNESS HUB — APP v2
// ============================================

Chart.defaults.color = '#6b6b80';
Chart.defaults.borderColor = '#2a2a3a';
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

// ---- HOME ----
async function loadHome() {
  const now = new Date();
  set('hDate', now.toLocaleDateString('en-SG',{weekday:'long',year:'numeric',month:'long',day:'numeric'}));
  const wk = Math.ceil(((now-new Date(now.getFullYear(),0,1))/86400000+1)/7);
  set('hWeek', `WEEK ${wk}`);

  const latest = await getLatestHealth();
  const score  = calcRecoveryScore(latest);
  const px     = buildPrescription(score, latest);

  // Recovery ring
  const ring = $('recRing');
  if (ring) {
    const off = 289 - (289 * Math.min((score||0)/100, 1));
    ring.style.strokeDashoffset = off;
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

    set('hWeight', latest['Weight (kg)']||'—');
    set('hVF', latest['Visceral Fat']||'—');

    // Steps
    const steps = parseInt(latest['Steps'])||0;
    const goal  = parseInt(latest['Step Goal'])||CONFIG.TARGETS.steps;
    const sc = stepsColor(steps);
    set('stNum', steps.toLocaleString());
    set('stBig', steps.toLocaleString());
    $('stBig') && ($('stBig').style.color = sc);
    set('stGoal', goal.toLocaleString());
    set('stDist', latest['Steps Distance (km)'] ? latest['Steps Distance (km)']+'km' : '—');
    set('stCal', latest['Steps Calories']||'—');
    const stTag = steps>=8000?'<span class="tag tg">✅ TARGET HIT</span>':steps>=6000?'<span class="tag ty">⚡ CLOSE</span>':'<span class="tag tr">⚠️ KEEP MOVING</span>';
    set('stTag', stTag, true);
    const stRing = $('stepsRing');
    if (stRing) {
      stRing.style.strokeDashoffset = 232 - (232*Math.min(steps/goal,1));
      stRing.style.stroke = sc;
    }
  }

  // Nutrition
  const t = getFoodTotals();
  renderNutritionHome(t);

  // Brief
  const brief = await getLatestBrief();
  if (brief && brief['Claude Brief']) {
    set('briefDate', brief['Date']||'');
    // Try to parse structured brief or show as-is
    const txt = brief['Claude Brief'];
    set('briefWorkout', txt);
    set('briefNutrition', brief['Food Summary']||'Log your meals in the Food tab to track nutrition.');
    set('briefMotivation', brief['Today\'s Advice']||'Stay consistent — every day counts.');
  }

  // Streaks
  const streaks = await calcStreaks();
  set('strCheckin', streaks.checkin);
  set('strSteps', streaks.steps);
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
async function loadProgress() {
  const data = await getLastN(30);
  const l = data[data.length-1];
  if (!l) return;

  const w=parseFloat(l['Weight (kg)'])||null, bf=parseFloat(l['Body Fat %'])||null;
  const vf=parseFloat(l['Visceral Fat'])||null, mu=parseFloat(l['Muscle (kg)'])||null;
  const ba=parseFloat(l['Body Age'])||null;

  set('pW', w?w.toFixed(1):'—'); set('pBF', bf?bf.toFixed(1):'—');
  set('pVF', vf||'—'); set('pMu', mu?mu.toFixed(2):'—');

  if (ba) {
    set('cdNow', ba);
    set('cdGap', Math.max(0, ba-38));
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
  mkChart('cMu', 'line', lbl, [line(data.map(r=>parseFloat(r['Muscle (kg)'])||null), '#00ff9d')]);
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
async function loadRecovery() {
  const data = await getLastN(14);
  const l = data[data.length-1];
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
  mkChart('cBB',  'line', lbl, [line(data.map(r=>parseFloat(r['Body Battery (AM)'])||null), '#00ff9d')]);
  mkChart('cHR',  'line', lbl, [line(data.map(r=>parseFloat(r['Resting HR'])||null), '#ff6b35')]);
}

// ---- FOOD ----
function loadFood() {
  buildHawkerGrid();
  renderLog();
  renderWater();
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

function logMeal(i) {
  addFoodItem(MEALS[i]);
  renderLog();
  renderNutritionHome(getFoodTotals());
  syncFoodBars();
}

function manualAdd() {
  const name = $('manName')?.value?.trim();
  const cal  = parseInt($('manCal')?.value)||0;
  const prot = parseInt($('manProt')?.value)||0;
  if (!name) { alert('Please enter a meal name'); return; }
  addFoodItem({ name, cal, protein: prot, rating: '📝' });
  if($('manName')) $('manName').value='';
  if($('manCal')) $('manCal').value='';
  if($('manProt')) $('manProt').value='';
  renderLog();
  renderNutritionHome(getFoodTotals());
  syncFoodBars();
}

function renderLog() {
  const log = getFoodLog();
  const list = $('logList');
  if (!list) return;
  if (!log.length) {
    list.innerHTML = '<div class="log-item" style="justify-content:center;color:var(--muted);font-size:13px">No meals logged — tap a meal above or add manually</div>';
  } else {
    list.innerHTML = log.map(m => `
      <div class="log-item">
        <div class="log-time">${m.time}</div>
        <div class="log-name">${m.name} ${m.rating||''}</div>
        <div class="log-macros">
          <div style="color:var(--orange)">${m.cal} kcal</div>
          <div style="color:var(--blue)">${m.protein}g protein</div>
        </div>
        <button class="rm-btn" onclick="delMeal(${m.id})">✕</button>
      </div>`).join('');
  }
  syncFoodBars();
}

function delMeal(id) { removeFoodItem(id); renderLog(); renderNutritionHome(getFoodTotals()); }
function clearFoodDay() { clearFood(); renderLog(); renderNutritionHome({cal:0,protein:0}); }

function syncFoodBars() {
  const t = getFoodTotals();
  set('fCal', t.cal.toLocaleString()); set('fProt', t.protein);
  set('fCalRem', Math.max(0,CONFIG.TARGETS.calories-t.cal).toLocaleString());
  set('fProtRem', Math.max(0,CONFIG.TARGETS.protein-t.protein));
  setw('fCalBar', (t.cal/CONFIG.TARGETS.calories)*100);
  setw('fProtBar', (t.protein/CONFIG.TARGETS.protein)*100);
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
async function loadTraining() {
  const latest = await getLatestHealth();
  const score  = calcRecoveryScore(latest);
  const px     = buildPrescription(score, latest);

  set('pxTitle', px.label);
  set('pxDay', px.planDay);
  set('pxTag', `<span class="tag ${px.cls}">${px.tag}</span>`, true);

  const el = $('exList');
  if (el) {
    el.innerHTML = px.exercises.map(e => `
      <div class="ex-item">
        <div class="ex-left">
          <div class="ex-name">${e.name}</div>
          ${e.note ? `<div class="ex-note">⚠️ ${e.note}</div>` : ''}
        </div>
        <div class="ex-right">
          <div class="ex-sets">${e.sets}</div>
          ${e.url ? `<a class="btn-yt" href="${e.url}" target="_blank" rel="noopener">▶ YT</a>` : ''}
        </div>
      </div>`).join('');
  }

  if (latest) {
    set('tBB', latest['Body Battery (AM)']||'—');
    set('tSl', latest['Sleep Score']||'—');
    set('tHRV', latest['Avg Overnight HRV (ms)']||'—');
    set('tSt', latest['Stress Score']||'—');
  }

  buildCalendar();

  const data = await getLastN(7);
  const lbl = data.map(r=>(r['Date']||'').toString().slice(5,10));
  const loads = data.map(r => {
    const s = calcRecoveryScore(r);
    const l = getLevel(s);
    return l==='high'?3:l==='moderate'?2:l==='low'?1:0;
  });
  mkChart('cLoad','bar',lbl,[{
    data: loads,
    backgroundColor: loads.map(l=>l===3?'rgba(0,255,157,.6)':l===2?'rgba(77,159,255,.6)':l===1?'rgba(255,215,0,.6)':'rgba(255,255,255,.1)'),
    borderRadius: 4
  }], {
    scales:{y:{min:0,max:3,ticks:{stepSize:1,callback:v=>['REST','LIGHT','MOD','FULL'][v]}}}
  });
}

function buildCalendar() {
  const now = new Date(), y=now.getFullYear(), m=now.getMonth();
  const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
  set('calMY', `${months[m]} ${y}`);

  const hdr=$('calHdr');
  if(hdr) hdr.innerHTML=['MON','TUE','WED','THU','FRI','SAT','SUN'].map(d=>`<div class="cal-hdr">${d}</div>`).join('');

  const grid=$('calGrid'); if(!grid) return;
  const first=(new Date(y,m,1).getDay()+6)%7;
  const days=new Date(y,m+1,0).getDate();
  const today=now.getDate();
  let html='';
  for(let i=0;i<first;i++) html+='<div class="cal-day empty"></div>';
  for(let d=1;d<=days;d++){
    const dow=new Date(y,m,d).getDay();
    const plan=PERIODIZATION.weeklyPlan[dow];
    const isT=d===today, isFut=d>today;
    let cls='cal-day', tl='';
    if(isT){cls+=' today';tl='●';}
    else if(isFut){cls+=' d-future';tl=plan.type==='rest'?'R':plan.type==='walk'?'W':'S';}
    else{
      if(plan.type==='rest'){cls+=' d-rest';tl='R';}
      else if(plan.type==='walk'){cls+=' d-light';tl='W';}
      else{cls+=' d-mod';tl='S';}
    }
    html+=`<div class="${cls}" title="${new Date(y,m,d).toDateString()} — ${plan.label}"><span class="cal-dn">${d}</span><span class="cal-dt">${tl}</span></div>`;
  }
  grid.innerHTML=html;
}

// ---- GOALS ----
async function loadGoals() {
  const data = await getDailyHealth();

  const bg = $('badgeGrid');
  if (bg) {
    bg.innerHTML = BADGES.map(b => {
      const earned = b.check(data);
      return `<div class="badge ${earned?'earned':'locked'}">
        <div class="badge-icon">${b.icon}</div>
        <div class="badge-name">${b.name}</div>
        <div class="badge-desc">${b.desc}</div>
        ${earned?'<div style="margin-top:6px" class="tag tg">EARNED</div>':''}
      </div>`;
    }).join('');
  }

  const rc = $('reportCard');
  if (rc) {
    const report = await calcReportCard();
    rc.innerHTML = report.map(r=>`
      <div class="report-row">
        <div style="font-size:13px">${r.label}</div>
        <div class="grade g${r.grade}">${r.grade}</div>
      </div>`).join('');
  }

  const ms = $('milestones');
  if (ms) {
    const l = data[data.length-1]||{};
    const w=parseFloat(l['Weight (kg)'])||CONFIG.START.weight;
    const vf=parseFloat(l['Visceral Fat'])||CONFIG.START.visceralFat;
    const ba=parseFloat(l['Body Age'])||CONFIG.START.bodyAge;
    const list=[
      {label:'Reach 99kg',     done:w<=99,  val:`${w.toFixed(1)}kg`},
      {label:'Reach 95kg',     done:w<=95,  val:`${w.toFixed(1)}kg`},
      {label:'Reach 90kg',     done:w<=90,  val:`${w.toFixed(1)}kg`},
      {label:'Visceral Fat 12',done:vf<=12, val:`VF ${vf}`},
      {label:'Visceral Fat 9', done:vf<=9,  val:`VF ${vf}`},
      {label:'Body Age 50',    done:ba<=50, val:`Age ${ba}`},
      {label:'Body Age 45',    done:ba<=45, val:`Age ${ba}`},
      {label:'Body Age 38',    done:ba<=38, val:`Age ${ba}`}
    ];
    ms.innerHTML = list.map(m=>`
      <div class="flex-between" style="padding:7px 0;border-bottom:1px solid var(--border)">
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
  }, 2000);
  await loadHome();
  setInterval(async()=>{
    const ap=document.querySelector('.page.active');
    if(ap) await loadPage(ap.id.replace('pg-',''));
  }, CONFIG.REFRESH_INTERVAL*60000);
});

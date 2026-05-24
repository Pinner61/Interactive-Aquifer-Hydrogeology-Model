/**
 * aquifer.js
 * Interactive Aquifer Hydrogeology Model
 *
 * Physics modelled:
 *   - Water balance:  Recharge = Precip × (1 − ET/140) × Perm_factor
 *   - Darcy velocity: v = K × i  (simplified, displayed in m/day)
 *   - Water level:    integrated net balance over time
 *   - Land subsidence: visible when level < 60% (clay compaction analogue)
 *   - Contaminant plume: advective transport visualisation
 */

'use strict';

/* ── DOM references ─────────────────────────────────── */
const slPrecip   = document.getElementById('sl-precip');
const slEvapo    = document.getElementById('sl-evapo');
const slExtract  = document.getElementById('sl-extract');
const slPerm     = document.getElementById('sl-perm');

const rainG      = document.getElementById('raingroup');
const evapoG     = document.getElementById('evapogroup');
const infilG     = document.getElementById('infilgroup');
const darcyG     = document.getElementById('darcyflow');
const contamG    = document.getElementById('contamplume');
const subcrG     = document.getElementById('subsidence-cracks');

const extractF   = document.getElementById('extractflow');
const rip1       = document.getElementById('rip1');
const rip2       = document.getElementById('rip2');
const pumpH      = document.getElementById('pumphead');

const wtRect     = document.getElementById('waterTableRect');
const wtLine     = document.getElementById('wtLine');
const wtLabel    = document.getElementById('wtLabel');
const wellW      = document.getElementById('wellwater');

const kpiR       = document.getElementById('kpi-recharge');
const kpiE       = document.getElementById('kpi-extract');
const kpiD       = document.getElementById('kpi-darcy');
const kpiL       = document.getElementById('kpi-level');

const statusWrap  = document.getElementById('status-wrap');
const statusIcon  = document.getElementById('status-icon');
const statusTitle = document.getElementById('status-title');
const statusDesc  = document.getElementById('status-desc');

/* ── State ──────────────────────────────────────────── */
let waterLevel  = 100;      // % of total aquifer storage
let showDarcy   = true;
let showContam  = false;
let showSub     = false;
let histBalance = [];       // rolling 20-step history for chart

/* ── Chart.js setup ─────────────────────────────────── */
let chart;

function initChart() {
  const ctx = document.getElementById('balanceChart').getContext('2d');
  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: Array.from({ length: 20 }, () => ''),
      datasets: [{
        label: 'Net balance (mm/yr)',
        data: Array(20).fill(0),
        borderColor: '#2A9A5A',
        borderWidth: 1.5,
        pointRadius: 0,
        tension: 0.4,
        fill: true,
        backgroundColor: 'rgba(42,154,90,0.08)'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false }
      },
      scales: {
        x: { display: false },
        y: {
          display: true,
          grid: { color: 'rgba(128,128,128,0.1)', lineWidth: 0.5 },
          border: { display: false },
          ticks: {
            font: { size: 9 },
            color: 'rgba(128,128,128,0.6)',
            maxTicksLimit: 4,
            callback: v => (v > 0 ? '+' : '') + Math.round(v) + 'mm'
          }
        }
      }
    }
  });
}

/* ── Helpers ────────────────────────────────────────── */

/** Show/hide an SVG element by toggling the 'hidden' CSS class. */
function show(el, visible) {
  if (visible) el.classList.remove('hidden');
  else         el.classList.add('hidden');
}

/** Update the status bar appearance and text. */
function setStatus(type, iconClass, title, desc) {
  statusWrap.className = 'status-bar status-' + type;
  statusIcon.className = 'ti ' + iconClass + ' status-icon';
  statusTitle.textContent = title;
  statusDesc.textContent  = desc;
}

/* ── Core update loop ───────────────────────────────── */

function update() {
  const precip  = parseInt(slPrecip.value,  10);
  const evapo   = parseInt(slEvapo.value,   10);
  const ext     = parseInt(slExtract.value, 10);
  const perm    = parseInt(slPerm.value,    10);

  /* --- Water balance calculation --- */
  // Effective infiltration after ET losses
  const effectiveInfil = Math.max(0, precip * (1 - evapo / 140));
  // Recharge rate (mm/yr analogue) — permeability amplifies how much reaches the aquifer
  const rechargeRate   = Math.round(effectiveInfil * perm * 0.12);
  const extractRate    = ext;
  const netBalance     = rechargeRate - extractRate;

  /* --- Darcy velocity: v = K·i --- */
  // K ∝ perm (0.08 m/d per unit), i ∝ recharge gradient
  const darcyV = (perm * 0.08 * (rechargeRate / 100 + 0.1)).toFixed(2);

  /* --- Integrate water level (clamped 5–100%) --- */
  waterLevel = Math.max(5, Math.min(100, waterLevel + netBalance * 0.06));
  const lvl = Math.round(waterLevel);

  /* --- Visual: precipitation & infiltration --- */
  show(rainG,  precip > 15);
  show(evapoG, evapo  > 20);
  show(infilG, effectiveInfil > 15);

  /* --- Visual: Darcy flow lines --- */
  if (showDarcy) show(darcyG, rechargeRate > 10);
  else           show(darcyG, false);

  /* --- Visual: water table position --- */
  // Shift the saturated zone rect downward as level drops
  const wtShift = Math.round((100 - lvl) * 0.55);
  wtRect.setAttribute('y',  290 + wtShift);
  wtLine.setAttribute('y1', 290 + wtShift);
  wtLine.setAttribute('y2', 290 + wtShift);
  wtLabel.setAttribute('y', 285 + wtShift);
  wellW.setAttribute('y',   290 + wtShift);

  /* --- Visual: extraction well pump --- */
  const pumping = ext > 10;
  show(extractF, pumping);
  show(rip1,     pumping);
  show(rip2,     pumping);
  if (pumping) pumpH.classList.add('pumping');
  else         pumpH.classList.remove('pumping');

  /* --- Visual: land subsidence cracks --- */
  if (showSub && lvl < 60) {
    subcrG.classList.remove('hidden');
    subcrG.style.opacity = String(Math.min(0.9, (60 - lvl) / 50));
  } else {
    subcrG.classList.add('hidden');
  }

  /* --- KPI cards --- */
  kpiR.textContent = rechargeRate + ' mm/yr';
  kpiE.textContent = extractRate  + ' mm/yr';
  kpiD.textContent = darcyV       + ' m/d';
  kpiL.textContent = lvl          + '%';
  kpiL.style.color = lvl < 25 ? '#C03030' : lvl < 55 ? '#C88020' : '#2A7ABF';

  /* --- Rolling balance history → chart --- */
  histBalance.push(netBalance);
  if (histBalance.length > 20) histBalance.shift();

  const chartColor =
    netBalance >= 0    ? '#2A9A5A' :
    netBalance > -25   ? '#C88020' : '#C03030';

  chart.data.datasets[0].data         = [...histBalance];
  chart.data.datasets[0].borderColor  = chartColor;
  chart.data.datasets[0].backgroundColor = chartColor + '14'; // ~8% alpha
  chart.update('none');

  /* --- Status bar --- */
  if (lvl < 20) {
    setStatus('danger', 'ti-alert-triangle',
      'Critical depletion',
      'Aquifer nearly exhausted. Irreversible subsidence likely. Wells run dry.');
  } else if (netBalance < -40) {
    setStatus('danger', 'ti-alert-triangle',
      'Severe over-extraction',
      'Extraction far exceeds recharge — aquifer mining in progress.');
  } else if (netBalance < -15 || lvl < 45) {
    setStatus('warn', 'ti-alert-circle',
      'Stress condition',
      'Extraction exceeds recharge. Water table declining. Monitor closely.');
  } else if (Math.abs(netBalance) <= 15) {
    setStatus('good', 'ti-circle-check',
      'Sustainable equilibrium',
      'Recharge balances extraction. Long-term viability maintained.');
  } else {
    setStatus('good', 'ti-circle-check',
      'Active recharge',
      'Infiltration exceeds demand. Aquifer storage increasing.');
  }
}

/* ── Layer toggles ──────────────────────────────────── */

function toggleLayer(layer, on) {
  if (layer === 'darcy') {
    showDarcy = on;
    show(darcyG, on);
  }
  if (layer === 'contam') {
    showContam = on;
    show(contamG, on);
  }
  if (layer === 'sub') {
    showSub = on;
    if (!on) subcrG.classList.add('hidden');
  }
}

/* ── Scenario presets ───────────────────────────────── */

const SCENARIOS = {
  drought: { precip: 8,  evapo: 80, extract: 40, perm: 3 },
  urban:   { precip: 50, evapo: 25, extract: 95, perm: 5 },
  agri:    { precip: 65, evapo: 70, extract: 75, perm: 6 },
  recover: { precip: 80, evapo: 20, extract: 5,  perm: 7 }
};

function setScenario(name) {
  const sc = SCENARIOS[name];
  if (!sc) return;
  slPrecip.value  = sc.precip;
  slEvapo.value   = sc.evapo;
  slExtract.value = sc.extract;
  slPerm.value    = sc.perm;
  update();
}

/* ── Event listeners ────────────────────────────────── */

[slPrecip, slEvapo, slExtract, slPerm].forEach(s =>
  s.addEventListener('input', update)
);

/* ── Boot ────────────────────────────────────────────── */

initChart();
show(darcyG, true);   // Darcy flow on by default
update();

// Auto-advance the time-series every 2 s so the chart fills even without interaction
setInterval(update, 2000);

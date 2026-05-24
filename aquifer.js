/**
 * aquifer.js
 * Interactive Aquifer Hydrogeology Model
 *
 * Conceptual model:
 * - Recharge = Precipitation × evapotranspiration loss factor × permeability factor
 * - Net balance = recharge − extraction
 * - Water level is updated over time from net balance
 * - Darcy velocity is represented as a simplified K × gradient analogue
 *
 * This model is educational and conceptual, not site calibrated.
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  /* ─────────────────────────────────────────────
     DOM references
     ───────────────────────────────────────────── */

  const slPrecip = document.getElementById('sl-precip');
  const slEvapo = document.getElementById('sl-evapo');
  const slExtract = document.getElementById('sl-extract');
  const slPerm = document.getElementById('sl-perm');

  const rainG = document.getElementById('raingroup');
  const evapoG = document.getElementById('evapogroup');
  const infilG = document.getElementById('infilgroup');
  const darcyG = document.getElementById('darcyflow');
  const contamG = document.getElementById('contamplume');
  const subcrG = document.getElementById('subsidence-cracks');

  const extractF = document.getElementById('extractflow');
  const rip1 = document.getElementById('rip1');
  const rip2 = document.getElementById('rip2');
  const pumpH = document.getElementById('pumphead');

  const wtRect = document.getElementById('waterTableRect');
  const wtLine = document.getElementById('wtLine');
  const wtLabel = document.getElementById('wtLabel');
  const wellW = document.getElementById('wellwater');

  const kpiR = document.getElementById('kpi-recharge');
  const kpiE = document.getElementById('kpi-extract');
  const kpiD = document.getElementById('kpi-darcy');
  const kpiL = document.getElementById('kpi-level');

  const statusWrap = document.getElementById('status-wrap');
  const statusIcon = document.getElementById('status-icon');
  const statusTitle = document.getElementById('status-title');
  const statusDesc = document.getElementById('status-desc');

  const chartCanvas = document.getElementById('balanceChart');

  const requiredElements = [
    slPrecip,
    slEvapo,
    slExtract,
    slPerm,
    rainG,
    evapoG,
    infilG,
    darcyG,
    contamG,
    subcrG,
    extractF,
    rip1,
    rip2,
    pumpH,
    wtRect,
    wtLine,
    wtLabel,
    wellW,
    kpiR,
    kpiE,
    kpiD,
    kpiL,
    statusWrap,
    statusIcon,
    statusTitle,
    statusDesc
  ];

  const missingRequiredElement = requiredElements.some(el => !el);

  if (missingRequiredElement) {
    console.error('Aquifer model could not start because one or more required HTML elements are missing.');
    return;
  }

  console.log('Aquifer model script loaded successfully.');

  /* ─────────────────────────────────────────────
     State
     ───────────────────────────────────────────── */

  let waterLevel = 100;
  let showDarcy = true;
  let showContam = false;
  let showSub = false;
  let histBalance = [];
  let chart = null;

  const SCENARIOS = {
    drought: {
      precip: 8,
      evapo: 80,
      extract: 40,
      perm: 3
    },
    urban: {
      precip: 50,
      evapo: 25,
      extract: 95,
      perm: 5
    },
    agri: {
      precip: 65,
      evapo: 70,
      extract: 75,
      perm: 6
    },
    recover: {
      precip: 80,
      evapo: 20,
      extract: 5,
      perm: 7
    }
  };

  /* ─────────────────────────────────────────────
     Helpers
     ───────────────────────────────────────────── */

  function show(el, visible) {
    if (!el) return;

    if (visible) {
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  }

  function setStatus(type, iconClass, title, desc) {
    statusWrap.className = `status-bar status-${type}`;
    statusIcon.className = `ti ${iconClass} status-icon`;
    statusTitle.textContent = title;
    statusDesc.textContent = desc;
  }

  function setText(el, value) {
    if (el) el.textContent = value;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  /* ─────────────────────────────────────────────
     Chart setup
     ───────────────────────────────────────────── */

  function initChart() {
    if (!chartCanvas) {
      console.warn('Balance chart canvas was not found.');
      return;
    }

    if (typeof Chart === 'undefined') {
      console.warn('Chart.js did not load. The model will still work, but the chart will not render.');
      return;
    }

    const ctx = chartCanvas.getContext('2d');

    chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: Array.from({ length: 20 }, () => ''),
        datasets: [
          {
            label: 'Net balance',
            data: Array(20).fill(0),
            borderColor: '#2A9A5A',
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.4,
            fill: true,
            backgroundColor: 'rgba(42, 154, 90, 0.10)'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            enabled: true,
            callbacks: {
              label: context => `Net balance: ${Math.round(context.raw)} mm/yr`
            }
          }
        },
        scales: {
          x: {
            display: false
          },
          y: {
            display: true,
            grid: {
              color: 'rgba(128, 128, 128, 0.14)',
              lineWidth: 0.5
            },
            border: {
              display: false
            },
            ticks: {
              font: {
                size: 9
              },
              color: 'rgba(180, 180, 180, 0.75)',
              maxTicksLimit: 4,
              callback: value => `${value > 0 ? '+' : ''}${Math.round(value)} mm`
            }
          }
        }
      }
    });
  }

  function updateChart(netBalance) {
    histBalance.push(netBalance);

    if (histBalance.length > 20) {
      histBalance.shift();
    }

    if (!chart) return;

    const chartColor =
      netBalance >= 0 ? '#2A9A5A' :
      netBalance > -25 ? '#C88020' :
      '#C03030';

    chart.data.datasets[0].data = [...histBalance];
    chart.data.datasets[0].borderColor = chartColor;

    if (netBalance >= 0) {
      chart.data.datasets[0].backgroundColor = 'rgba(42, 154, 90, 0.10)';
    } else if (netBalance > -25) {
      chart.data.datasets[0].backgroundColor = 'rgba(200, 128, 32, 0.10)';
    } else {
      chart.data.datasets[0].backgroundColor = 'rgba(192, 48, 48, 0.10)';
    }

    chart.update('none');
  }

  /* ─────────────────────────────────────────────
     Core update loop
     ───────────────────────────────────────────── */

  function update() {
    const precip = parseInt(slPrecip.value, 10);
    const evapo = parseInt(slEvapo.value, 10);
    const ext = parseInt(slExtract.value, 10);
    const perm = parseInt(slPerm.value, 10);

    const effectiveInfiltration = Math.max(0, precip * (1 - evapo / 140));
    const rechargeRate = Math.round(effectiveInfiltration * perm * 0.12);
    const extractionRate = ext;
    const netBalance = rechargeRate - extractionRate;

    const darcyVelocity = (
      perm * 0.08 * (rechargeRate / 100 + 0.1)
    ).toFixed(2);

    waterLevel = clamp(waterLevel + netBalance * 0.06, 5, 100);
    const levelRounded = Math.round(waterLevel);

    /* Visual effects */
    show(rainG, precip > 15);
    show(evapoG, evapo > 20);
    show(infilG, effectiveInfiltration > 15);

    if (showDarcy) {
      show(darcyG, rechargeRate > 10);
    } else {
      show(darcyG, false);
    }

    if (showContam) {
      show(contamG, true);
    }

    const wtShift = Math.round((100 - levelRounded) * 0.55);

    wtRect.setAttribute('y', 290 + wtShift);
    wtLine.setAttribute('y1', 290 + wtShift);
    wtLine.setAttribute('y2', 290 + wtShift);
    wtLabel.setAttribute('y', 285 + wtShift);
    wellW.setAttribute('y', 290 + wtShift);

    const pumping = ext > 10;

    show(extractF, pumping);
    show(rip1, pumping);
    show(rip2, pumping);

    if (pumping) {
      pumpH.classList.add('pumping');
    } else {
      pumpH.classList.remove('pumping');
    }

    if (showSub && levelRounded < 60) {
      show(subcrG, true);
      subcrG.style.opacity = String(Math.min(0.9, (60 - levelRounded) / 50));
    } else {
      show(subcrG, false);
      subcrG.style.opacity = '';
    }

    /* KPIs */
    setText(kpiR, `${rechargeRate} mm/yr`);
    setText(kpiE, `${extractionRate} mm/yr`);
    setText(kpiD, `${darcyVelocity} m/d`);
    setText(kpiL, `${levelRounded}%`);

    kpiL.style.color =
      levelRounded < 25 ? '#C03030' :
      levelRounded < 55 ? '#C88020' :
      '#2A7ABF';

    updateChart(netBalance);

    /* Status */
    if (levelRounded < 20) {
      setStatus(
        'danger',
        'ti-alert-triangle',
        'Critical depletion',
        'Aquifer nearly exhausted. Wells may run dry and compaction risk increases.'
      );
    } else if (netBalance < -40) {
      setStatus(
        'danger',
        'ti-alert-triangle',
        'Severe over-extraction',
        'Extraction far exceeds recharge. The aquifer is being depleted rapidly.'
      );
    } else if (netBalance < -15 || levelRounded < 45) {
      setStatus(
        'warn',
        'ti-alert-circle',
        'Stress condition',
        'Extraction exceeds recharge. The water table is declining and should be monitored.'
      );
    } else if (Math.abs(netBalance) <= 15) {
      setStatus(
        'good',
        'ti-circle-check',
        'Sustainable equilibrium',
        'Recharge approximately balances extraction. Long-term viability is maintained.'
      );
    } else {
      setStatus(
        'good',
        'ti-circle-check',
        'Active recharge',
        'Infiltration exceeds extraction. Aquifer storage is increasing.'
      );
    }
  }

  /* ─────────────────────────────────────────────
     Public functions for HTML buttons
     ───────────────────────────────────────────── */

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

      if (!on) {
        show(subcrG, false);
        subcrG.style.opacity = '';
      }
    }

    update();
  }

  function setScenario(name) {
    const scenario = SCENARIOS[name];

    if (!scenario) {
      console.warn(`Unknown scenario: ${name}`);
      return;
    }

    slPrecip.value = scenario.precip;
    slEvapo.value = scenario.evapo;
    slExtract.value = scenario.extract;
    slPerm.value = scenario.perm;

    update();
  }

  window.toggleLayer = toggleLayer;
  window.setScenario = setScenario;

  /* ─────────────────────────────────────────────
     Event listeners
     ───────────────────────────────────────────── */

  [slPrecip, slEvapo, slExtract, slPerm].forEach(slider => {
    slider.addEventListener('input', update);
  });

  /* ─────────────────────────────────────────────
     Boot
     ───────────────────────────────────────────── */

  initChart();

  showDarcy = true;
  showContam = false;
  showSub = false;

  show(darcyG, true);
  show(contamG, false);
  show(subcrG, false);

  update();

  setInterval(update, 2000);
});

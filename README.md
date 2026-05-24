# Interactive Aquifer Hydrogeology Model

A self-contained, fully interactive browser simulation of aquifer dynamics.
No build tools, no frameworks — open `index.html` directly in any modern browser.

---

## Files

```
aquifer-model/
├── index.html   — markup, SVG cross-section, UI structure
├── style.css    — all styling, animations, dark-mode support
├── aquifer.js   — physics model, chart, interactivity logic
└── README.md    — this file
```

---

## Physics implemented

| Concept | Formula / model |
|---|---|
| Water balance | Recharge = Precip × (1 − ET/140) × Perm_factor |
| Net balance | Net = Recharge − Extraction |
| Darcy velocity | v = K · i (hydraulic conductivity × gradient proxy) |
| Water level | Integrated net balance, clamped 5–100 % |
| Land subsidence | Triggered when water level < 60 % (clay compaction) |
| Contaminant plume | Advective migration visualisation (toggle layer) |

---

## How to use

1. Open `index.html` in Chrome, Firefox, Edge or Safari (no server required).
2. Drag the sliders to change **precipitation**, **evapotranspiration**,
   **extraction rate**, and **soil permeability (K)**.
3. Use the **scenario buttons** to jump to preset real-world situations.
4. Toggle **Darcy flow lines**, **contamination plume**, and
   **land subsidence** independently.
5. Watch the **water balance chart** evolve over time and the
   **status bar** classify the aquifer health.

---

## Scenario presets

| Scenario | Description |
|---|---|
| Prolonged drought | Very low precipitation, high ET, moderate extraction |
| Urban over-extraction | Heavy pumping far exceeds recharge |
| Agricultural use | High ET and extraction during growing season |
| Managed recovery | High precipitation, minimal extraction — recharge dominates |

---

## External dependencies (CDN, no install needed)

- **Chart.js 4.4.1** — `cdnjs.cloudflare.com` — time-series water balance chart
- **Tabler Icons** — `cdn.jsdelivr.net` — UI icons in the status bar

---

## Browser support

Any browser released after 2020. CSS custom properties, SVG animations,
and the Canvas API are all that's required.

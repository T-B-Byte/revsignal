# Audience Intelligence Dashboard — Technical Snapshot

For sharing with other AI assistants or developers building pages that need to match this design system.

---

## 1. Tech Stack

| Layer | Choice | Notes |
|-------|--------|-------|
| **Framework** | None — **static single-file HTML** | No Next.js, no Vite, no build step. One `index.html` file (~840KB) |
| **UI Library** | **Custom** | No component library. All UI is hand-written HTML + vanilla JS |
| **CSS** | **Tailwind CSS 3.x via CDN** | `<script src="https://cdn.tailwindcss.com"></script>` — runtime JIT |
| **Charts** | **Chart.js 4.4.0 via CDN** | Doughnut, bar (horizontal + vertical), used with `animation: false` for print reliability |
| **Animation** | None | No Framer Motion, no animation libraries. CSS `transition-all` on interactive elements only |

---

## 2. Design Tokens

### Tailwind Config (inline in `<head>`)

```js
tailwind.config = {
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0f4ff',
          100: '#e0e9ff',
          500: '#4f6ef7',
          600: '#3b5de8',
          700: '#2d4bd4',
          900: '#1a2d8a'
        }
      }
    }
  }
}
```

### Color System

```
// Mode: DARK ONLY (no light mode toggle)

// Base
Background:          #0f172a (body)
Card/Glass BG:       rgba(255,255,255,0.05) with backdrop-filter: blur(10px)
Card Border:         rgba(255,255,255,0.1)

// Brand
Primary:             #4f6ef7 (brand-500)
Primary Hover:       #3b5de8 (brand-600)
Primary Gradient:    linear-gradient(90deg, #4f6ef7, #7c3aed)

// Metric Cards
Metric BG:           linear-gradient(135deg, rgba(79,110,247,0.15), rgba(124,58,237,0.15))
Metric Border:       rgba(79,110,247,0.3)

// Text
White/Primary Text:  #e2e8f0 (body default), #ffffff (headings)
Secondary Text:      #94a3b8 (slate-400)
Muted Text:          #64748b (slate-500)

// Region Colors (used consistently across all tabs)
APAC:                #4f6ef7 (blue)
EMEA:                #7c3aed (purple)
LATAM:               #10b981 (emerald)
NAMER:               #f59e0b (amber)
Others:              #06b6d4 (cyan)
Undetermined:        #64748b (slate)

// Chart Palette (9 colors, used in order)
['#4f6ef7','#7c3aed','#06b6d4','#10b981','#f59e0b','#ef4444','#ec4899','#8b5cf6','#14b8a6']

// Status Colors
Amber badge BG:      rgba(245,158,11,0.2)
Amber badge text:    amber-300
Emerald accent:      #10b981

// Print Mode (white background overrides)
Print BG:            #ffffff
Print Card BG:       #f8fafc
Print Card Border:   #e2e8f0
Print Metric BG:     #eef2ff
Print Text:          #1e293b, #334155, #64748b
```

### Typography

```
Font Family:         'Inter', system-ui, sans-serif
Body font-size:      Tailwind defaults (base 16px)

// Specific sizes used:
KPI values:          text-2xl / text-3xl (1.5rem / 1.875rem)
Section headings:    text-lg font-semibold (1.125rem)
Card labels:         text-xs (0.75rem)
Body text:           text-sm (0.875rem)
Tiny labels:         text-[10px] (custom 10px)
Code/field names:    font-mono text-xs
```

### Border Radius

```
Cards:               rounded-xl (0.75rem)
Buttons/Badges:      rounded-lg (0.5rem)
Pills:               rounded-full
Progress bars:       rounded-full (bar track), 4px (bar fill)
```

### Scrollbar

```css
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); }
::-webkit-scrollbar-thumb { background: rgba(79,110,247,0.5); border-radius: 3px; }
```

---

## 3. Key Component Patterns

### Glass Cards

```html
<!-- Every card uses this pattern -->
<div class="glass rounded-xl p-6">
  <h3 class="font-semibold text-white text-lg mb-4">Title</h3>
  <!-- content -->
</div>
```

```css
.glass {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  backdrop-filter: blur(10px);
}
```

### Metric Cards

```html
<div class="metric-card rounded-xl p-4">
  <div class="text-xs text-slate-400 mb-1">Label</div>
  <div class="text-2xl font-bold text-white">Value</div>
  <div class="text-xs text-slate-500 mt-0.5">Sub-text</div>
</div>
```

```css
.metric-card {
  background: linear-gradient(135deg, rgba(79,110,247,0.15), rgba(124,58,237,0.15));
  border: 1px solid rgba(79,110,247,0.3);
}
```

### Bar Charts (HTML version, used in many places)

```html
<div>
  <div class="flex justify-between text-xs mb-1">
    <span class="text-slate-300">Label</span>
    <span class="text-white font-medium">Value</span>
  </div>
  <div class="h-1.5 bg-white/5 rounded-full overflow-hidden">
    <div style="width:75%;background:rgba(79,110,247,0.7);height:100%;border-radius:4px"></div>
  </div>
</div>
```

### Data Tables

```html
<!-- No table component library — raw HTML tables with Tailwind -->
<table class="w-full text-sm">
  <thead>
    <tr class="text-slate-400 text-xs border-b border-white/10">
      <th class="text-left py-2 pr-4">Column</th>
      <th class="text-right py-2 px-4">Column</th>
    </tr>
  </thead>
  <tbody>
    <tr class="border-b border-white/5">
      <td class="py-2.5 pr-4 text-slate-300">Cell</td>
      <td class="py-2.5 px-4 text-right text-white font-medium">Cell</td>
    </tr>
  </tbody>
</table>
```

### Tabs

```html
<div class="px-6 pb-0 flex gap-2 border-b border-white/10">
  <button onclick="showTab('name')" id="tab-name"
    class="tab-active px-4 py-2.5 rounded-t-lg text-sm font-medium transition-all">
    Tab Name
  </button>
</div>
```

```css
.tab-active { background: #4f6ef7; color: white; }
.tab-inactive { background: rgba(255,255,255,0.05); color: #94a3b8; }
.tab-inactive:hover { background: rgba(255,255,255,0.1); color: #e2e8f0; }
```

### Form Controls

```css
select, input {
  background: rgba(255,255,255,0.07);
  border: 1px solid rgba(255,255,255,0.15);
  color: #e2e8f0;
}
select option { background: #1e293b; }
```

### Badges

```html
<!-- Amber warning badge -->
<span class="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-semibold uppercase">
  Label
</span>

<!-- Brand pill -->
<span class="text-xs px-2 py-1 bg-brand-500/20 text-brand-500 rounded-full">Label</span>
```

### Buttons

```html
<button class="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors">
  Button Text
</button>
```

### Chart.js Defaults

```js
function chartDefaults() {
  return {
    plugins: { legend: { labels: { color: '#94a3b8', font: { size: 11 } } } },
    scales: {
      x: { ticks: { color: '#64748b', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
      y: { ticks: { color: '#64748b', font: { size: 10 }, callback: v => fmt(v) }, grid: { color: 'rgba(255,255,255,0.05)' } }
    }
  };
}
```

### Loading/Empty/Error States

```
None — all data is embedded in the HTML as JS constants.
No async fetching, no loading spinners, no error states.
Everything renders synchronously on tab switch.
```

---

## 4. Layout

### Structure

```
No sidebar. Top navigation only.

+-------------------------------------+
|  Header (logo area + stat pills)    |  px-6 py-4, border-b border-white/10
+-------------------------------------+
|  KPI Row (8 metric cards)           |  px-6 py-4, grid cols-2 > md:cols-4 > lg:cols-8
+-------------------------------------+
|  Tab Bar                            |  px-6, flex gap-2, border-b border-white/10
+-------------------------------------+
|  Tab Content                        |  px-6 py-6
|  (each pane is space-y-6)           |
+-------------------------------------+
```

### Content Width

```
Full width — no max-width container.
Horizontal padding: px-6 (1.5rem) on all sections.
```

### Grid System

```
Tailwind grid utilities throughout:
  grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3    (differentiator cards)
  grid grid-cols-2 md:grid-cols-4                    (KPI cards, region cards)
  grid grid-cols-1 lg:grid-cols-2                    (two-column layouts)
  grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6     (small detail cards)

Gap: gap-3 to gap-6 depending on context.
```

### Responsive Breakpoints

```
Standard Tailwind:
  sm:  640px
  md:  768px   (most grid breakpoints)
  lg:  1024px  (two-column > side-by-side)
```

---

## 5. Key Utility Functions

```js
// Number formatting (used everywhere)
const fmt = n => n >= 1e9 ? (n/1e9).toFixed(1)+'B'
             : n >= 1e6 ? (n/1e6).toFixed(1)+'M'
             : n >= 1e3 ? (n/1e3).toFixed(0)+'K'
             : n?.toLocaleString() || '0';

// HTML escaping (for user-facing strings in innerHTML)
const esc = s => String(s).replace(/&/g,'&amp;')
                          .replace(/</g,'&lt;')
                          .replace(/>/g,'&gt;')
                          .replace(/"/g,'&quot;');
```

---

## 6. Print/PDF Design System

```css
@media print {
  /* Background & cards */
  Background:        #ffffff
  Card BG:           #f8fafc, border: 1px solid #e2e8f0
  Metric BG:         #eef2ff, border: #c7d2fe
  Text:              #0f172a (headings), #334155 (body), #64748b (muted)
  Page:              A4, margins 1.8cm 1.5cm 2cm 1.5cm

  /* Charts become HTML bars in print (canvas unreliable) */
  /* Lists capped at 9 rows */
  /* Regional comparison hidden */
}
```

---

## 7. Tab Inventory

| Tab | ID | Description |
|-----|----|-------------|
| Overview | `overview` | Vertical bar chart, region doughnut, top 10 topics, seniority distribution |
| Verticals | `verticals` | Vertical x region stacked bars, expandable sub-verticals, heatmap |
| Geography | `geo` | Region cards, audience + signal bar charts |
| Intent Signals | `signals` | Filterable/searchable topic explorer with 6,196 topics |
| Engagement & Coverage | `engagement` | AtlasIQ engagement funnel, medium breakdown, geo coverage (separate data source) |
| Query Builder | `query` | Vertical > Sub-Vertical > Seniority dropdowns, filtered count |
| Highlights | `story` | Data provenance, differentiators, by-the-numbers, trending topics |
| Data Dictionary | `datadict` | 5 dataset schemas, field-level descriptions, lookup values |
| Report | `report` | Filtered PDF report with KPIs, brief, topics, sub-verticals |

---

## Summary

This is a **single static HTML file** with no build system, no component library, and no framework. All styling is **Tailwind via CDN** with a custom `brand` color scale. The design is **dark-mode only** using glass-morphism cards (`backdrop-filter: blur`) on a `#0f172a` background. Charts use **Chart.js 4.4.0**. All data is embedded as JS constants — there are no API calls. The file is ~840KB and self-contained. To match this design system, use the brand colors above, the glass card pattern, and Tailwind utility classes.

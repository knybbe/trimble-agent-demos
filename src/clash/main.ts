import '../shared/styles.css'
import { analyzeClash, formatBriefing, SAMPLE_CLASH, type ClashAnalysis } from './analyzer'
import { ClashViz } from './viz'

const BASE = import.meta.env.BASE_URL

function header(active: string) {
  return `
  <header class="site-header">
    <div class="site-header-inner">
      <a class="brand" href="${BASE}">
        <span class="brand-mark">T</span>
        Trimble Agent Demos
      </a>
      <nav class="nav-links">
        <a href="${BASE}" class="${active === 'home' ? 'active' : ''}">Home</a>
        <a href="${BASE}clash/" class="${active === 'clash' ? 'active' : ''}">Clash Explainer</a>
        <a href="${BASE}drawings/" class="${active === 'drawings' ? 'active' : ''}">Ask the Drawings</a>
        <span class="badge-ai">Built with agentic AI / Grok Bot</span>
      </nav>
    </div>
  </header>`
}

function riskClass(level: string) {
  if (level === 'Critical' || level === 'High') return 'chip-danger'
  if (level === 'Medium') return 'chip-warn'
  return 'chip-ok'
}

function renderResult(a: ClashAnalysis): string {
  return `
    <div class="result-block">
      <h4>Summary</h4>
      <p style="color:var(--text-muted);font-size:0.9rem">${a.summary}</p>
    </div>
    <div class="result-block">
      <h4>Likely cause (ranked)</h4>
      <ul class="ranked-list">
        ${a.likelyCauses
          .map(
            (c) => `
          <li>
            <span class="rank-badge">${c.rank}</span>
            <div>
              <strong>${c.cause}</strong>
              <span class="chip ${c.confidence.startsWith('High') ? 'chip-ok' : 'chip-warn'}">${c.confidence}</span>
              <div style="color:var(--text-dim);font-size:0.82rem;margin-top:0.25rem">${c.rationale}</div>
            </div>
          </li>`,
          )
          .join('')}
      </ul>
    </div>
    <div class="result-block">
      <h4>Elements involved</h4>
      <div>
        ${a.elements
          .map(
            (e) =>
              `<span class="chip chip-accent">${e.type} · ${e.id} · ${e.discipline}</span>`,
          )
          .join('')}
      </div>
    </div>
    <div class="result-block">
      <h4>Risk / discipline impact</h4>
      <div class="risk-bar">
        <span class="chip ${riskClass(a.risk.level)}">Risk: ${a.risk.level}</span>
        ${a.risk.disciplines.map((d) => `<span class="chip">${d}</span>`).join('')}
      </div>
      <p style="color:var(--text-muted);font-size:0.88rem">${a.risk.impact}</p>
    </div>
    <div class="result-block">
      <h4>Recommended next checks</h4>
      <ul>
        ${a.nextChecks.map((c) => `<li>${c}</li>`).join('')}
      </ul>
    </div>
    ${a.fromImage ? '<p class="chip chip-warn" style="margin-top:0.75rem">Analysis includes context from uploaded screenshot</p>' : ''}
  `
}

const app = document.querySelector<HTMLDivElement>('#app')!

app.innerHTML = `
  ${header('clash')}
  <main class="container">
    <h1 class="page-title">Clash Explainer Lite</h1>
    <p class="page-desc">Paste a clash report or drop a screenshot. Get ranked causes, element guesses, risk, and actionable AEC next checks — plus a lightweight 3D overlap viz.</p>
    <div class="privacy-banner">🔒 Demo runs fully in-browser. No project data leaves this machine.</div>

    <div class="layout-split">
      <div>
        <div class="panel">
          <h3>Clash input</h3>
          <label class="field-label" for="clash-text">Clash report / Navisworks-style text</label>
          <textarea id="clash-text" placeholder="Paste clash report here…"></textarea>
          <div class="actions-row">
            <button type="button" class="btn btn-secondary btn-sm" id="btn-sample">Load sample clash</button>
            <button type="button" class="btn btn-primary" id="btn-explain">Explain</button>
            <button type="button" class="btn btn-ghost btn-sm" id="btn-copy" disabled>Copy briefing</button>
          </div>
        </div>

        <div class="panel" style="margin-top:1rem">
          <h3>Optional screenshot</h3>
          <div class="dropzone" id="img-drop">
            <input type="file" id="img-file" accept="image/*" />
            Drop clash screenshot or click to upload
          </div>
          <div class="thumb-wrap" id="thumb-wrap">
            <img id="thumb" alt="Clash screenshot thumbnail" />
          </div>
        </div>
      </div>

      <div>
        <div class="panel">
          <h3>3D clash illustration</h3>
          <canvas id="viz-canvas"></canvas>
          <p style="color:var(--text-dim);font-size:0.75rem;margin-top:0.5rem">Demo-grade primitives: duct (cyan) vs beam (amber). Red volume = overlap. Drag to orbit.</p>
        </div>
        <div class="panel" style="margin-top:1rem">
          <h3>Analysis</h3>
          <div id="result"><p class="empty-hint">Load the sample clash and hit Explain for a one-click demo.</p></div>
        </div>
      </div>
    </div>
  </main>
  <footer class="site-footer">
    Clash Explainer Lite · MIT · Kim Nyberg · Trimble talk demos ·
    <a href="${BASE}">All demos</a>
  </footer>
`

const textarea = document.querySelector<HTMLTextAreaElement>('#clash-text')!
const resultEl = document.querySelector('#result')!
const btnExplain = document.querySelector<HTMLButtonElement>('#btn-explain')!
const btnSample = document.querySelector<HTMLButtonElement>('#btn-sample')!
const btnCopy = document.querySelector<HTMLButtonElement>('#btn-copy')!
const imgDrop = document.querySelector('#img-drop')!
const imgFile = document.querySelector<HTMLInputElement>('#img-file')!
const thumbWrap = document.querySelector('#thumb-wrap')!
const thumb = document.querySelector<HTMLImageElement>('#thumb')!

let hasImage = false
let lastAnalysis: ClashAnalysis | null = null

const canvas = document.querySelector<HTMLCanvasElement>('#viz-canvas')!
const viz = new ClashViz(canvas)

function runExplain() {
  const text = textarea.value.trim()
  if (!text) {
    resultEl.innerHTML = `<p class="empty-hint" style="color:var(--danger)">Paste clash text or load the sample first.</p>`
    return
  }
  resultEl.innerHTML = `<p class="loading-pulse">Analyzing clash heuristics…</p>`
  // slight delay for demo feel
  setTimeout(() => {
    lastAnalysis = analyzeClash(text, hasImage)
    resultEl.innerHTML = renderResult(lastAnalysis)
    btnCopy.disabled = false
  }, 280)
}

btnSample.addEventListener('click', () => {
  textarea.value = SAMPLE_CLASH
  runExplain()
})

btnExplain.addEventListener('click', runExplain)

btnCopy.addEventListener('click', async () => {
  if (!lastAnalysis) return
  try {
    await navigator.clipboard.writeText(formatBriefing(lastAnalysis))
    btnCopy.textContent = 'Copied!'
    setTimeout(() => { btnCopy.textContent = 'Copy briefing' }, 1500)
  } catch {
    btnCopy.textContent = 'Copy failed'
  }
})

function handleImage(file: File) {
  if (!file.type.startsWith('image/')) return
  const url = URL.createObjectURL(file)
  thumb.src = url
  thumbWrap.classList.add('visible')
  hasImage = true
}

imgDrop.addEventListener('click', () => imgFile.click())
imgFile.addEventListener('change', () => {
  const f = imgFile.files?.[0]
  if (f) handleImage(f)
})
imgDrop.addEventListener('dragover', (e) => {
  e.preventDefault()
  imgDrop.classList.add('dragover')
})
imgDrop.addEventListener('dragleave', () => imgDrop.classList.remove('dragover'))
imgDrop.addEventListener('drop', (e) => {
  e.preventDefault()
  imgDrop.classList.remove('dragover')
  const f = (e as DragEvent).dataTransfer?.files?.[0]
  if (f) handleImage(f)
})

// Auto-load sample for instant demo polish (commented — user clicks sample)
// Keep empty state as designed.

window.addEventListener('beforeunload', () => viz.dispose())

import '../shared/styles.css'
import {
  SAMPLE_DOCS,
  TfidfIndex,
  chunkText,
  synthesizeAnswer,
} from './retrieval'
import { extractPdfPages } from './pdf'

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

const EXAMPLES = [
  'What is the duct clearance under beams?',
  'Who owns coordination of Level 2 MEP?',
  'What is the bottom of steel for beam W18×35 on Grid D–E?',
]

const app = document.querySelector<HTMLDivElement>('#app')!

app.innerHTML = `
  ${header('drawings')}
  <main class="container">
    <h1 class="page-title">Ask the Drawings</h1>
    <p class="page-desc">Upload PDFs (specs / drawing text). Ask questions and get extractive answers with citations — filename, page, and snippet. All retrieval runs locally via TF‑IDF.</p>
    <div class="privacy-banner">🔒 Files stay in your browser. Nothing uploaded to a server.</div>

    <div class="layout-split">
      <div>
        <div class="panel">
          <h3>Documents</h3>
          <div class="dropzone" id="pdf-drop">
            <input type="file" id="pdf-file" accept="application/pdf,.pdf" multiple />
            Drag & drop PDFs here, or click to browse
          </div>
          <div class="actions-row">
            <button type="button" class="btn btn-secondary btn-sm" id="btn-samples">Load sample specs</button>
            <button type="button" class="btn btn-ghost btn-sm" id="btn-clear">Clear all</button>
          </div>
          <ul class="file-list" id="file-list"></ul>
          <p id="index-status" style="color:var(--text-dim);font-size:0.8rem;margin-top:0.5rem">No documents loaded.</p>
        </div>
      </div>

      <div>
        <div class="panel">
          <h3>Q&amp;A</h3>
          <div id="empty-state">
            <p class="empty-hint">Load sample specs (or upload PDFs), then try an example:</p>
            <div class="example-qs" id="example-qs">
              ${EXAMPLES.map((q) => `<button type="button" class="btn btn-secondary btn-sm example-q">${q}</button>`).join('')}
            </div>
          </div>
          <div class="chat-log" id="chat-log"></div>
          <form id="ask-form" class="actions-row" style="margin-top:0.85rem">
            <input type="search" id="ask-input" placeholder="Ask about clearances, ownership, grids…" style="flex:1" autocomplete="off" />
            <button type="submit" class="btn btn-primary" id="btn-ask">Ask</button>
          </form>
        </div>
        <div class="panel hidden" id="cite-panel" style="margin-top:1rem">
          <h3>Selected citation</h3>
          <div id="cite-detail"></div>
        </div>
      </div>
    </div>
  </main>
  <footer class="site-footer">
    Ask the Drawings · MIT · Kim Nyberg · Trimble talk demos ·
    <a href="${BASE}">All demos</a>
  </footer>
`

const index = new TfidfIndex()
const loadedNames = new Set<string>()

const fileList = document.querySelector('#file-list')!
const indexStatus = document.querySelector('#index-status')!
const chatLog = document.querySelector('#chat-log')!
const emptyState = document.querySelector('#empty-state')!
const citePanel = document.querySelector('#cite-panel')!
const citeDetail = document.querySelector('#cite-detail')!
const pdfDrop = document.querySelector('#pdf-drop')!
const pdfFile = document.querySelector<HTMLInputElement>('#pdf-file')!
const askForm = document.querySelector<HTMLFormElement>('#ask-form')!
const askInput = document.querySelector<HTMLInputElement>('#ask-input')!

function refreshFileList() {
  const docs = index.getDocuments()
  fileList.innerHTML = docs
    .map(
      (n) =>
        `<li><span>📄 ${n}</span><span class="chip chip-ok">indexed</span></li>`,
    )
    .join('')
  indexStatus.textContent = docs.length
    ? `${docs.length} document(s) · ${index.size} chunks · TF‑IDF ready`
    : 'No documents loaded.'
}

function addSampleDocs() {
  for (const doc of SAMPLE_DOCS) {
    if (loadedNames.has(doc.name)) continue
    loadedNames.add(doc.name)
    for (let i = 0; i < doc.pages.length; i++) {
      index.addChunks(chunkText(doc.name, i + 1, doc.pages[i]))
    }
  }
  refreshFileList()
}

async function ingestPdf(file: File) {
  if (loadedNames.has(file.name)) return
  const buf = await file.arrayBuffer()
  const pages = await extractPdfPages(buf, file.name)
  loadedNames.add(file.name)
  for (const p of pages) {
    index.addChunks(chunkText(file.name, p.page, p.text))
  }
  refreshFileList()
}

function appendMsg(role: 'user' | 'assistant', html: string) {
  emptyState.classList.add('hidden')
  const div = document.createElement('div')
  div.className = `chat-msg ${role}`
  div.innerHTML = html
  chatLog.appendChild(div)
  chatLog.scrollTop = chatLog.scrollHeight
}

function ask(query: string) {
  const q = query.trim()
  if (!q) return
  if (index.size === 0) {
    appendMsg('user', escapeHtml(q))
    appendMsg(
      'assistant',
      'No documents indexed yet. Click <strong>Load sample specs</strong> or upload PDFs first.',
    )
    return
  }
  appendMsg('user', escapeHtml(q))
  const hits = index.search(q, 4)
  const { answer, citations } = synthesizeAnswer(q, hits)
  const citeHtml = citations
    .map(
      (c, i) =>
        `<button type="button" class="chip chip-accent cite-chip" data-idx="${i}" title="${escapeHtml(c.snippet)}">${escapeHtml(c.docName)} · p.${c.page}</button>`,
    )
    .join('')
  const ansHtml = escapeHtml(answer).replace(/\n/g, '<br>') +
    (citeHtml ? `<div class="cite-row">${citeHtml}</div>` : '')
  appendMsg('assistant', ansHtml)

  // wire citation chips on last message
  const last = chatLog.lastElementChild!
  last.querySelectorAll('.cite-chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = Number((btn as HTMLElement).dataset.idx)
      const c = citations[idx]
      if (!c) return
      citePanel.classList.remove('hidden')
      citeDetail.innerHTML = `
        <p><strong>${escapeHtml(c.docName)}</strong> — page ${c.page}
        <span class="chip">score ${c.score.toFixed(2)}</span></p>
        <div class="snippet-box">${escapeHtml(c.snippet)}</div>`
    })
  })
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

document.querySelector('#btn-samples')!.addEventListener('click', async () => {
  // Prefer real bundled PDFs (exercises pdf.js); fall back to in-memory text samples
  const sampleFiles = [
    'Project-Spec-HVAC-Clearances.pdf',
    'Structural-Grid-Notes.pdf',
  ]
  let loadedPdf = false
  for (const name of sampleFiles) {
    if (loadedNames.has(name) || loadedNames.has(name.replace(/\.pdf$/i, '') + '.pdf')) continue
    try {
      const url = `${BASE}samples/${name}`
      const res = await fetch(url)
      if (!res.ok) throw new Error(String(res.status))
      const blob = await res.blob()
      const file = new File([blob], name, { type: 'application/pdf' })
      await ingestPdf(file)
      loadedPdf = true
    } catch (e) {
      console.warn('Sample PDF fetch failed, using text fallback', e)
    }
  }
  if (!loadedPdf || index.size === 0) addSampleDocs()
  else refreshFileList()
})

document.querySelector('#btn-clear')!.addEventListener('click', () => {
  index.clear()
  loadedNames.clear()
  refreshFileList()
  chatLog.innerHTML = ''
  emptyState.classList.remove('hidden')
  citePanel.classList.add('hidden')
})

document.querySelectorAll('.example-q').forEach((btn) => {
  btn.addEventListener('click', () => {
    if (index.size === 0) addSampleDocs()
    ask((btn as HTMLButtonElement).textContent || '')
  })
})

askForm.addEventListener('submit', (e) => {
  e.preventDefault()
  const q = askInput.value
  askInput.value = ''
  ask(q)
})

pdfDrop.addEventListener('click', () => pdfFile.click())
pdfFile.addEventListener('change', async () => {
  const files = [...(pdfFile.files || [])]
  for (const f of files) {
    try {
      await ingestPdf(f)
    } catch (err) {
      console.error(err)
      indexStatus.textContent = `Failed to read ${f.name}`
    }
  }
  pdfFile.value = ''
})

pdfDrop.addEventListener('dragover', (e) => {
  e.preventDefault()
  pdfDrop.classList.add('dragover')
})
pdfDrop.addEventListener('dragleave', () => pdfDrop.classList.remove('dragover'))
pdfDrop.addEventListener('drop', async (e) => {
  e.preventDefault()
  pdfDrop.classList.remove('dragover')
  const files = [...((e as DragEvent).dataTransfer?.files || [])].filter((f) =>
    f.name.toLowerCase().endsWith('.pdf'),
  )
  for (const f of files) {
    try {
      await ingestPdf(f)
    } catch (err) {
      console.error(err)
    }
  }
})

// silence unused

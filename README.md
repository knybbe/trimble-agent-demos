# Trimble Agent Demos

Live, in-browser demos for **Kim Nyberg** (Senior Tech Director, BIM/XR) — Trimble talk.

**Built with agentic AI / Grok Bot.**

## Live URLs

- Landing: https://knybbe.github.io/trimble-agent-demos/
- Clash Explainer Lite: https://knybbe.github.io/trimble-agent-demos/clash/
- Ask the Drawings: https://knybbe.github.io/trimble-agent-demos/drawings/

## Tools

### Tool 2 — Clash Explainer Lite

Paste Navisworks-style clash text and/or drop a screenshot. Client-side heuristics return:

1. Ranked likely causes  
2. Elements involved (types / IDs / discipline)  
3. Risk & discipline impact  
4. Recommended next checks (AEC-actionable)  
5. three.js duct-vs-beam overlap visualization  

**Privacy:** analysis runs fully in-browser; no project data leaves the machine.

### Tool 5 — Ask the Drawings

Upload PDFs (or load bundled HVAC / structural sample specs). Ask questions; get extractive answers with **citations** (filename + page + snippet) via local TF‑IDF retrieval (pdf.js for text extraction).

**Privacy:** files stay in your browser. Nothing uploaded to a server.

## 60-second demo scripts

### Clash (~60s)

1. Open `/clash/`  
2. Click **Load sample clash** (duct vs beam, L2 corridor) — Explain runs automatically  
3. Point at ranked causes, risk chip, next checks  
4. Orbit the 3D panel — cyan duct / amber beam / pulsing red overlap  
5. Optional: **Copy briefing** for “handoff to coordination” narrative  

### Drawings (~60s)

1. Open `/drawings/`  
2. Click **Load sample specs**  
3. Click example: *“What is the duct clearance under beams?”*  
4. Show answer + citation chips → click chip for snippet/page  
5. Optional second Q: *“Who owns coordination of Level 2 MEP?”*  

### Stage narrative

Agents accelerate **triage and briefing**; humans still own design decisions, RFIs, and Trimble Connect / BIM coordination workflows. These demos intentionally keep data on-device.

## Local development

```bash
npm install
npm run dev
# open http://localhost:5173/trimble-agent-demos/
```

```bash
npm run build   # → dist/
npm run preview
```

## Deploy

GitHub Pages from `dist/` (Actions / `peaceiris/actions-gh-pages` or `gh-pages` branch). Site `base` is `/trimble-agent-demos/`.

## License

MIT

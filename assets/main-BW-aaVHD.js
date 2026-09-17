import"./styles-D3aJ_qH3.js";var e=`/trimble-agent-demos/`;document.querySelector(`#app`).innerHTML=`
  <header class="site-header">
    <div class="site-header-inner">
      <a class="brand" href="${e}">
        <span class="brand-mark">T</span>
        Trimble Agent Demos
      </a>
      <nav class="nav-links">
        <a href="${e}" class="active">Home</a>
        <a href="${e}clash/">Clash Explainer</a>
        <a href="${e}drawings/">Ask the Drawings</a>
        <span class="badge-ai">Built with agentic AI / Grok Bot</span>
      </nav>
    </div>
  </header>

  <main class="container">
    <section class="hero">
      <h1>Agentic AI for BIM coordination</h1>
      <p class="subtitle">
        Two live, in-browser demos for Kim Nyberg’s Trimble talk — Senior Tech Director, BIM/XR.
        Fast MVPs that show how agents can explain clashes and answer drawing questions without sending project data off-device.
      </p>
      <div class="hero-meta">
        <span>Kim Nyberg · Senior Tech Director, BIM/XR</span>
        <span>·</span>
        <span>MIT licensed</span>
        <span>·</span>
        <span>Client-side only</span>
      </div>
    </section>

    <div class="tool-grid">
      <a class="tool-card" href="${e}clash/" style="color:inherit">
        <span class="tag">Tool 2</span>
        <h2>Clash Explainer Lite</h2>
        <p>Paste Navisworks-style clash text or drop a screenshot. Get ranked likely causes, elements, risk, and AEC next checks — with a three.js duct-vs-beam overlap viz.</p>
        <span class="btn btn-primary" style="align-self:flex-start;pointer-events:none">Open demo →</span>
      </a>
      <a class="tool-card" href="${e}drawings/" style="color:inherit">
        <span class="tag">Tool 5</span>
        <h2>Ask the Drawings</h2>
        <p>Upload PDFs or load sample HVAC/structural specs. Ask natural-language questions and get answers with citation chips (file + page + snippet) via local TF‑IDF retrieval.</p>
        <span class="btn btn-primary" style="align-self:flex-start;pointer-events:none">Open demo →</span>
      </a>
    </div>

    <section class="talking-points">
      <h3>60-second talking points</h3>
      <ol>
        <li><strong>Clash:</strong> Click “Load sample clash” → Explain → show ranked causes + 3D overlap → Copy briefing. Stress: heuristics in-browser, no model upload.</li>
        <li><strong>Drawings:</strong> Load sample specs → ask “What is the duct clearance under beams?” → show citation chips → open snippet. Stress: PDFs never leave the laptop.</li>
        <li><strong>Narrative:</strong> Agents accelerate coordination triage; humans still own design decisions and Connect workflows.</li>
      </ol>
    </section>
  </main>

  <footer class="site-footer">
    Built with agentic AI / Grok Bot for Kim Nyberg · Trimble · MIT ·
    <a href="https://github.com/knybbe/trimble-agent-demos">GitHub</a>
  </footer>
`;
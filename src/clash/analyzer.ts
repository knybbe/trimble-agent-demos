export interface ClashAnalysis {
  likelyCauses: { rank: number; cause: string; confidence: string; rationale: string }[]
  elements: { type: string; id: string; discipline: string }[]
  risk: { level: 'Low' | 'Medium' | 'High' | 'Critical'; disciplines: string[]; impact: string }
  nextChecks: string[]
  summary: string
  fromImage: boolean
}

const SAMPLE_CLASH = `Clash Report — Navisworks Export
Project: Metro Hub Expansion | Model Set: Coordination_L2_2026-09
Clash ID: CL-4821
Status: New | Hard Clash | Distance: -87 mm (penetration)

Element A (MEP):
  Type: Rectangular Duct
  System: Supply Air SA-02
  ID: DUCT-SA-02-L2-0147
  Size: 800 × 400 mm
  Level: Level 2
  Location: Corridor C2-East, Grid D–E / 4–5
  Bottom elevation: +3850 mm AFF

Element B (Structural):
  Type: Steel Beam (W-section)
  ID: BEAM-S-L2-W18x35-042
  Size: W18×35
  Level: Level 2 Framing
  Location: Corridor C2-East, Grid D–E / 4
  Bottom of steel: +3720 mm AFF
  Top of steel: +4177 mm AFF

Clash notes:
  Duct underside intersects beam top flange zone.
  Clearance specified: 100 mm min under structural steel (HVAC Spec §4.2.3).
  Assigned: MEP Lead — Structural awareness required.
  Related: previous RFI-119 on corridor soffit heights.`

export { SAMPLE_CLASH }

const ELEMENT_PATTERNS: { re: RegExp; type: string; discipline: string }[] = [
  { re: /\bduct\b/i, type: 'Duct', discipline: 'MEP / HVAC' },
  { re: /\bpipe\b|\bpiping\b|\bhydronic\b/i, type: 'Pipe', discipline: 'MEP / Plumbing' },
  { re: /\bcable\s*tray\b|\bconduit\b/i, type: 'Cable Tray / Conduit', discipline: 'MEP / Electrical' },
  { re: /\bbeam\b|\bw-?section\b|\bw\d+/i, type: 'Structural Beam', discipline: 'Structural' },
  { re: /\bcolumn\b/i, type: 'Column', discipline: 'Structural' },
  { re: /\bslab\b|\bdeck\b/i, type: 'Slab / Deck', discipline: 'Structural' },
  { re: /\bwall\b|\bpartition\b/i, type: 'Wall', discipline: 'Architectural' },
  { re: /\bdoor\b|\bopening\b/i, type: 'Opening / Door', discipline: 'Architectural' },
  { re: /\bhanger\b|\bsupport\b|\bbracket\b/i, type: 'Support / Hanger', discipline: 'MEP' },
  { re: /\bvav\b|\bahu\b|\bfcu\b/i, type: 'HVAC Equipment', discipline: 'MEP / HVAC' },
]

const ID_RE = /\b([A-Z]{2,}[-_][A-Z0-9][-A-Z0-9_.]*)\b/g

function extractIds(text: string): string[] {
  const ids = new Set<string>()
  let m: RegExpExecArray | null
  const re = new RegExp(ID_RE)
  while ((m = re.exec(text)) !== null) {
    if (m[1].length >= 6 && m[1].length < 40) ids.add(m[1])
  }
  return [...ids].slice(0, 8)
}

function detectElements(text: string) {
  const found: { type: string; id: string; discipline: string }[] = []
  const ids = extractIds(text)
  let idIdx = 0
  for (const p of ELEMENT_PATTERNS) {
    if (p.re.test(text)) {
      found.push({
        type: p.type,
        id: ids[idIdx] || `inferred-${p.type.replace(/\s+/g, '-').toLowerCase()}`,
        discipline: p.discipline,
      })
      idIdx++
    }
  }
  if (found.length === 0) {
    found.push(
      { type: 'Element A (unknown)', id: ids[0] || 'ELEM-A', discipline: 'TBD' },
      { type: 'Element B (unknown)', id: ids[1] || 'ELEM-B', discipline: 'TBD' },
    )
  }
  return found
}

function rankCauses(text: string, fromImage: boolean): ClashAnalysis['likelyCauses'] {
  const t = text.toLowerCase()
  const causes: { cause: string; score: number; confidence: string; rationale: string }[] = []

  const add = (cause: string, score: number, conf: string, rationale: string) => {
    causes.push({ cause, score, confidence: conf, rationale })
  }

  if (/clearance|underside|intersect|penetrat|bottom of steel|soffit|offset/i.test(t)) {
    add(
      'Insufficient vertical clearance / elevation conflict',
      92,
      'High',
      'Report cites elevation or clearance language; duct/pipe likely routed through structural zone without required offset.',
    )
  }
  if (/level\s*2|wrong\s*level|level\s*mismatch|AFF|elevation/i.test(t)) {
    add(
      'Level or datum misalignment between models',
      78,
      'Medium-High',
      'Level / AFF references present — check shared coordinates and level mapping between structural and MEP models.',
    )
  }
  if (/duct|mep|hvac|pipe|supply\s*air/i.test(t) && /beam|steel|structur|slab|column/i.test(t)) {
    add(
      'MEP routing through structural framing without coordination hold',
      88,
      'High',
      'Classic MEP vs Structural corridor clash — ductwork sized/routed before final beam depths locked.',
    )
  }
  if (/tolerance|fabrication|as-?built|field/i.test(t)) {
    add(
      'Fabrication / as-built variance vs design model',
      55,
      'Medium',
      'Keywords suggest field or fab deviation; verify against latest coordinated model before redesign.',
    )
  }
  if (/hanger|support|bracket/i.test(t)) {
    add(
      'Secondary support clash (hanger/bracket)',
      60,
      'Medium',
      'Supports often clash after primary runs are fixed — check hanger spacing and structural attachment points.',
    )
  }
  if (/grid|corridor|location/i.test(t)) {
    add(
      'Horizontal alignment / grid positioning error',
      48,
      'Medium',
      'Grid/corridor location noted — confirm plan offsets and centerline placement.',
    )
  }
  if (fromImage) {
    add(
      'Visual overlap confirmed from screenshot context',
      70,
      'Medium',
      'Image provided — overlap region used as corroborating context for text-based heuristics.',
    )
  }
  if (causes.length === 0) {
    add(
      'Unresolved model coordination gap',
      50,
      'Low-Medium',
      'Limited keywords matched — treat as general BIM coordination issue pending richer clash metadata.',
    )
  }

  causes.sort((a, b) => b.score - a.score)
  return causes.slice(0, 4).map((c, i) => ({
    rank: i + 1,
    cause: c.cause,
    confidence: c.confidence,
    rationale: c.rationale,
  }))
}

function assessRisk(text: string, elements: ClashAnalysis['elements']): ClashAnalysis['risk'] {
  const t = text.toLowerCase()
  const disciplines = [...new Set(elements.map((e) => e.discipline))]
  let level: ClashAnalysis['risk']['level'] = 'Medium'
  let impact = 'May delay coordination freeze if not resolved before shop drawings.'

  if (/hard\s*clash|penetrat|critical|-?\d+\s*mm/i.test(t)) {
    level = 'High'
    impact = 'Hard clash with measurable penetration — blocks corridor coordination and may cascade to hanger/fire-stopping.'
  }
  if (/fire|life\s*safety|egress|structural\s*integrity/i.test(t)) {
    level = 'Critical'
    impact = 'Potential life-safety or structural integrity implication — escalate immediately.'
  }
  if (/soft\s*clash|clearance\s*only|warning/i.test(t) && level === 'Medium') {
    level = 'Low'
    impact = 'Soft/clearance clash — document and schedule into next BIM coordination session.'
  }
  if (disciplines.some((d) => /structur/i.test(d)) && disciplines.some((d) => /mep/i.test(d))) {
    if (level === 'Medium') level = 'High'
  }

  return { level, disciplines, impact }
}

function nextChecks(text: string, elements: ClashAnalysis['elements']): string[] {
  const checks = [
    'Verify shared coordinates and Level 2 datum match between Structural and MEP federated models (Connect / Trimble Connect sync).',
    'Confirm required clearance under beams per HVAC / structural specs (typical 75–100 mm) and compare to reported penetration.',
    'Check beam bottom-of-steel vs duct bottom elevation on the clash grid line; update one discipline’s routing or depth.',
    'Flag in BIM coordination meeting; assign owner (MEP vs Structural) and due date before IFC / shop drawing freeze.',
    'Search related RFIs and prior clashes in the same corridor grid bay for systemic soffit height issues.',
  ]
  if (/pipe|plumbing/i.test(text)) {
    checks[2] = 'Confirm pipe invert / centerline elevation against structural framing and insulation OD allowances.'
  }
  if (elements.some((e) => /electrical|cable/i.test(e.discipline))) {
    checks.push('Validate cable tray fill and support clearances against electrical specs before relocating runs.')
  }
  return checks.slice(0, 5)
}

export function analyzeClash(text: string, fromImage = false): ClashAnalysis {
  const elements = detectElements(text)
  const likelyCauses = rankCauses(text, fromImage)
  const risk = assessRisk(text, elements)
  const checks = nextChecks(text, elements)

  const elemDesc = elements.map((e) => `${e.type} (${e.id})`).join(' vs ')
  const top = likelyCauses[0]?.cause || 'coordination gap'
  const summary = `Clash involving ${elemDesc}. Top hypothesis: ${top}. Risk: ${risk.level}. ${fromImage ? 'Screenshot context included in analysis. ' : ''}Recommend verifying elevations and clearance before the next coordination session.`

  return {
    likelyCauses,
    elements,
    risk,
    nextChecks: checks,
    summary,
    fromImage,
  }
}

export function formatBriefing(a: ClashAnalysis): string {
  const lines = [
    'CLASH BRIEFING (demo — client-side heuristics)',
    '═'.repeat(48),
    '',
    'SUMMARY',
    a.summary,
    '',
    'LIKELY CAUSES (ranked)',
    ...a.likelyCauses.map(
      (c) => `${c.rank}. [${c.confidence}] ${c.cause}\n   → ${c.rationale}`,
    ),
    '',
    'ELEMENTS',
    ...a.elements.map((e) => `• ${e.type} | ${e.id} | ${e.discipline}`),
    '',
    `RISK: ${a.risk.level}`,
    `Disciplines: ${a.risk.disciplines.join(', ')}`,
    a.risk.impact,
    '',
    'RECOMMENDED NEXT CHECKS',
    ...a.nextChecks.map((c, i) => `${i + 1}. ${c}`),
    '',
    '— Generated in-browser; no project data left this machine.',
  ]
  return lines.join('\n')
}

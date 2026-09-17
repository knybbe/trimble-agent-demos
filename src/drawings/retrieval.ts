export interface Chunk {
  id: string
  docName: string
  page: number
  text: string
  tokens: string[]
}

export interface SearchHit {
  chunk: Chunk
  score: number
}

const STOP = new Set(
  `a an the and or but in on at to for of is are was were be been being it this that these those with from by as into over after before under about between through during without within along across behind beyond plus minus into onto upon which who whom whose what when where why how can could should would may might must shall will do does did done having have has had not no nor so if then than too very just also only own same such both each few more most other some such no nor not only own same so than too very`.split(
    /\s+/,
  ),
)

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9.%°/\-\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP.has(t))
}

export function chunkText(docName: string, page: number, text: string, chunkSize = 450): Chunk[] {
  const cleaned = text.replace(/\s+/g, ' ').trim()
  if (!cleaned) return []
  const chunks: Chunk[] = []
  let i = 0
  let idx = 0
  while (i < cleaned.length) {
    let end = Math.min(i + chunkSize, cleaned.length)
    if (end < cleaned.length) {
      const space = cleaned.lastIndexOf(' ', end)
      if (space > i + 100) end = space
    }
    const slice = cleaned.slice(i, end).trim()
    if (slice.length > 40) {
      chunks.push({
        id: `${docName}::p${page}::${idx}`,
        docName,
        page,
        text: slice,
        tokens: tokenize(slice),
      })
      idx++
    }
    i = end
  }
  return chunks
}

function tf(tokens: string[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const t of tokens) m.set(t, (m.get(t) || 0) + 1)
  const n = tokens.length || 1
  for (const [k, v] of m) m.set(k, v / n)
  return m
}

export class TfidfIndex {
  private chunks: Chunk[] = []
  private idf = new Map<string, number>()
  private docFreq = new Map<string, number>()

  addChunks(chunks: Chunk[]) {
    this.chunks.push(...chunks)
    this.rebuildIdf()
  }

  clear() {
    this.chunks = []
    this.idf.clear()
    this.docFreq.clear()
  }

  get size() {
    return this.chunks.length
  }

  getDocuments(): string[] {
    return [...new Set(this.chunks.map((c) => c.docName))]
  }

  private rebuildIdf() {
    this.docFreq.clear()
    const N = this.chunks.length || 1
    for (const c of this.chunks) {
      const uniq = new Set(c.tokens)
      for (const t of uniq) this.docFreq.set(t, (this.docFreq.get(t) || 0) + 1)
    }
    this.idf.clear()
    for (const [t, df] of this.docFreq) {
      this.idf.set(t, Math.log((N + 1) / (df + 1)) + 1)
    }
  }

  search(query: string, k = 4): SearchHit[] {
    const qTokens = tokenize(query)
    if (!qTokens.length || !this.chunks.length) return []
    const qtf = tf(qTokens)
    const qVec = new Map<string, number>()
    for (const [t, v] of qtf) {
      qVec.set(t, v * (this.idf.get(t) || 1))
    }

    const hits: SearchHit[] = []
    for (const chunk of this.chunks) {
      const ctf = tf(chunk.tokens)
      let dot = 0
      let qn = 0
      let cn = 0
      for (const [t, w] of qVec) {
        qn += w * w
        const cw = (ctf.get(t) || 0) * (this.idf.get(t) || 1)
        dot += w * cw
      }
      for (const [t, v] of ctf) {
        const w = v * (this.idf.get(t) || 1)
        cn += w * w
      }
      const denom = Math.sqrt(qn) * Math.sqrt(cn)
      const score = denom > 0 ? dot / denom : 0
      const lower = chunk.text.toLowerCase()
      let boosted = score
      for (const tok of qTokens) {
        if (tok.length > 3 && lower.includes(tok)) boosted += 0.03
      }
      if (boosted > 0.05) hits.push({ chunk, score: boosted })
    }
    hits.sort((a, b) => b.score - a.score)
    return hits.slice(0, k)
  }
}

export function synthesizeAnswer(query: string, hits: SearchHit[]): {
  answer: string
  citations: { docName: string; page: number; snippet: string; score: number }[]
} {
  if (!hits.length) {
    return {
      answer:
        'I could not find a relevant passage in the loaded documents. Try rephrasing, or load the sample project specs.',
      citations: [],
    }
  }

  const citations = hits.map((h) => ({
    docName: h.chunk.docName,
    page: h.chunk.page,
    snippet: h.chunk.text.slice(0, 280) + (h.chunk.text.length > 280 ? '…' : ''),
    score: h.score,
  }))

  const top = hits[0].chunk
  const q = query.toLowerCase()

  let lead = 'Based on the project documents:'
  if (/clearance|duct|beam|under/i.test(q)) {
    lead = 'Regarding clearance requirements:'
  } else if (/own|coordinat|responsib|who/i.test(q)) {
    lead = 'On coordination ownership:'
  } else if (/level\s*2|l2|mep/i.test(q)) {
    lead = 'For Level 2 MEP coordination:'
  } else if (/grid|structural/i.test(q)) {
    lead = 'From the structural notes:'
  }

  const quotes = hits.slice(0, 2).map((h) => {
    const snip = h.chunk.text.length > 180 ? h.chunk.text.slice(0, 180) + '…' : h.chunk.text
    return `"${snip}" (${h.chunk.docName}, p.${h.chunk.page})`
  })

  const answer = `${lead}\n\n${quotes.join('\n\n')}\n\nPrimary source: ${top.docName}, page ${top.page}. Review the cited passages for full context before design decisions.`

  return { answer, citations }
}

/** Bundled sample documents (plain text standing in for PDFs when samples are loaded). */
export const SAMPLE_DOCS: { name: string; pages: string[] }[] = [
  {
    name: 'Project Spec – HVAC Clearances.pdf',
    pages: [
      `PROJECT SPECIFICATION — HVAC CLEARANCES
Document No: SPEC-HVAC-4.2 | Rev C | Metro Hub Expansion
1.0 Purpose
This section defines minimum clearances for ductwork, piping, and equipment relative to structural framing, ceilings, and other trades.
2.0 Duct clearance under beams
2.1 Supply and return ducts routed under structural steel shall maintain a minimum clear distance of 100 mm between the top of duct insulation (or bare duct if uninsulated) and the bottom of steel (BOS), unless a written deviation is approved by the Structural Engineer of Record.
2.2 In Level 2 corridors C2-East and C2-West, the design soffit elevation assumes 800 × 400 mm ducts with 100 mm clearance under W18 beams. Contractors shall not reduce clearance without BIM coordination approval.
2.3 Fire dampers and access panels require an additional 50 mm service envelope beyond the duct OD.`,
      `3.0 Coordination
3.1 Level 2 MEP coordination is owned by the MEP Lead (HVAC) with Structural as co-reviewer for any clash involving primary framing members.
3.2 Soft clashes (clearance warnings between 0 and 100 mm) shall be logged in the clash register and resolved prior to shop drawing release.
3.3 Hard clashes (penetration of structural steel or concrete) require an RFI within 48 hours of discovery.
4.0 References
See Structural Grid Notes §2 for beam depths and BOS elevations on Grid D–E.`,
    ],
  },
  {
    name: 'Structural Grid Notes.pdf',
    pages: [
      `STRUCTURAL GRID NOTES — Level 2 Framing
Doc: STR-L2-GRID-01 | Metro Hub Expansion
1.0 Grid system
Primary grids A–H (east-west) and 1–8 (north-south). Corridor C2-East spans Grid D–E between lines 4 and 5.
2.0 Beam schedule (excerpt)
BEAM-S-L2-W18x35-042: W18×35, Grid D–E / Line 4, Bottom of steel +3720 mm AFF, Top of steel +4177 mm AFF.
Adjacent beams on Line 4.5 use W16×26 with BOS +3780 mm AFF.
3.0 Slab
Level 2 composite deck: top of slab +4500 mm AFF. Do not penetrate beams without structural review.`,
      `4.0 Coordination notes
4.1 Structural owns primary steel framing geometry. MEP shall route around beams; beam depth changes require Structural approval.
4.2 Who owns coordination of Level 2 MEP: MEP Lead chairs the weekly BIM coordination meeting; Structural and Architectural attend for clash triage.
4.3 Openings larger than 200 mm in beams or decks require an engineered detail.
5.0 Datum
Project base point and shared coordinates published in Trimble Connect folder /Coordinates/Shared_2026. All discipline models shall use the same Level 2 datum.`,
    ],
  },
]

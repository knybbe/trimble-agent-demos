import * as pdfjs from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker

export async function extractPdfPages(
  data: ArrayBuffer,
  _fileName?: string,
): Promise<{ page: number; text: string }[]> {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(data) }).promise
  const pages: { page: number; text: string }[] = []
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    const strings = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .filter(Boolean)
    pages.push({ page: i, text: strings.join(' ') })
  }
  return pages
}

export { pdfjs }

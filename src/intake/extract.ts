// Browser-side text extraction. All output is untrusted data.

export async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import('pdfjs-dist');
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= Math.min(doc.numPages, 50); i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    pages.push(content.items.map((it) => ('str' in it ? it.str : '')).join(' '));
  }
  return pages.join('\n');
}

export async function readTextFile(file: File): Promise<string> {
  return file.text();
}

export function htmlToText(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script, style, noscript, svg, iframe').forEach((n) => n.remove());
  const meta = doc.querySelector('meta[name="description"]')?.getAttribute('content') || '';
  return [doc.title, meta, doc.body?.innerText || doc.body?.textContent || ''].join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Tries to fetch a public page directly. Most sites block cross-origin reads from a static page (CORS),
 * so on failure the UI asks Barry to paste the page text. No third-party proxy is used on purpose.
 */
export async function fetchUrlText(url: string): Promise<{ ok: true; text: string } | { ok: false; reason: string }> {
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };
    return { ok: true, text: htmlToText(await res.text()) };
  } catch {
    return { ok: false, reason: 'cors' };
  }
}

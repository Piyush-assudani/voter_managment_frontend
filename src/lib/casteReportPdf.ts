/**
 * Caste-wise voter report as a real PDF file (A4), rendered by the browser so Gujarati text
 * and voter photos come out exactly as on screen. Each A4 page is drawn with html2canvas and
 * stored in the PDF as a JPEG image, so no PDF/font library is needed.
 */
import html2canvas from 'html2canvas';

export interface CasteReportVoter {
  serialNo?: number | string;
  nameHi?: string;
  nameEn?: string;
  relativeNameHi?: string;
  relativeNameEn?: string;
  relationType?: string;
  gender?: string;
  age?: number | string;
  houseNo?: string;
  wardNo?: string;
  partNo?: string;
  epic?: string;
  caste?: string;
  voted?: boolean;
  photoUrl?: string;
}

const PAGE_W = 794; // A4 at 96 dpi
const PAGE_H = 1123;
const GU: Record<string, string> = {
  'पुरुष': 'પુરુષ', 'स्त्री': 'સ્ત્રી', 'महिला': 'સ્ત્રી', 'पिता': 'પિતા', 'पति': 'પતિ', 'माता': 'માતા', 'अन्य': 'અન્ય', 'पत्नी': 'પત્ની',
};
const gu = (v?: string) => (v && GU[v]) || v || '';

function esc(text: unknown): string {
  return String(text ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

function pageHtml(title: string, subtitle: string, rows: CasteReportVoter[], pageNo: number, pageCount: number, withPhotos: boolean): string {
  const head = `
    <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #1e3a8a;padding-bottom:6px;margin-bottom:8px">
      <div>
        <div style="font-size:20px;font-weight:800;color:#1e3a8a">${esc(title)}</div>
        <div style="font-size:12px;color:#334155;font-weight:600;margin-top:2px">${esc(subtitle)}</div>
      </div>
      <div style="font-size:11px;color:#64748b;text-align:right">પાનું ${pageNo} / ${pageCount}<br/>${esc(new Date().toLocaleDateString('en-GB'))}</div>
    </div>`;
  const th = (t: string, w?: string) => `<th style="background:#1e3a8a;color:#fff;font-size:11.5px;padding:5px 4px;text-align:left;${w ? `width:${w};` : ''}">${t}</th>`;
  const body = rows.map((v, i) => {
    const photo = withPhotos
      ? `<td style="padding:3px;text-align:center">${v.photoUrl ? `<img src="${esc(v.photoUrl)}" crossorigin="anonymous" style="width:40px;height:50px;object-fit:cover;border:1px solid #334155;display:inline-block"/>` : '—'}</td>`
      : '';
    return `<tr style="background:${i % 2 ? '#f8fafc' : '#fff'};border-bottom:1px solid #e2e8f0">
      <td style="padding:4px;font-weight:800;color:#1e3a8a;text-align:center">${esc(v.serialNo)}</td>
      ${photo}
      <td style="padding:4px;font-weight:700">${esc(v.nameHi || v.nameEn)}</td>
      <td style="padding:4px"><span style="color:#64748b;font-size:10.5px">${esc(gu(v.relationType))}:</span> ${esc(v.relativeNameHi || v.relativeNameEn)}</td>
      <td style="padding:4px;text-align:center">${esc(v.houseNo)}</td>
      <td style="padding:4px;text-align:center;white-space:nowrap">${esc(v.age)} / ${esc(gu(v.gender))}</td>
      <td style="padding:4px;font-family:monospace;font-size:11px;color:#1d4ed8">${esc(v.epic)}</td>
      <td style="padding:4px;text-align:center;font-size:11px;color:${v.voted ? '#15803d' : '#b45309'}">${v.voted ? 'મત આપ્યો' : 'બાકી'}</td>
    </tr>`;
  }).join('');
  return `${head}
    <table style="width:100%;border-collapse:collapse;font-size:12px;color:#0f172a">
      <thead><tr>${th('અનુ.', '42px')}${withPhotos ? th('ફોટો', '48px') : ''}${th('મતદારનું નામ')}${th('સંબંધી')}${th('ઘર નં.', '60px')}${th('ઉંમર / જાતિ', '78px')}${th('ઓળખ પત્ર', '96px')}${th('મતદાન', '52px')}</tr></thead>
      <tbody>${body}</tbody>
    </table>`;
}

/** Minimal PDF writer: one full-page JPEG per A4 page. */
function buildPdf(pages: { jpeg: Uint8Array; width: number; height: number }[]): Blob {
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;
  const push = (data: Uint8Array | string) => {
    const bytes = typeof data === 'string' ? enc.encode(data) : data;
    chunks.push(bytes);
    length += bytes.length;
  };
  const obj = (n: number, body: () => void) => {
    offsets[n] = length;
    push(`${n} 0 obj\n`);
    body();
    push('\nendobj\n');
  };

  const W = 595.28; // A4 in points
  const H = 841.89;
  const pageIds = pages.map((_, i) => 3 + i * 3);
  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  obj(1, () => push('<< /Type /Catalog /Pages 2 0 R >>'));
  obj(2, () => push(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`));
  pages.forEach((p, i) => {
    const pageId = 3 + i * 3;
    const contentId = pageId + 1;
    const imageId = pageId + 2;
    obj(pageId, () => push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /XObject << /Im${i} ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`));
    const content = `q ${W} 0 0 ${H} 0 0 cm /Im${i} Do Q`;
    obj(contentId, () => push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`));
    obj(imageId, () => {
      push(`<< /Type /XObject /Subtype /Image /Width ${p.width} /Height ${p.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpeg.length} >>\nstream\n`);
      push(p.jpeg);
      push('\nendstream');
    });
  });
  const total = 3 + pages.length * 3;
  const xref = length;
  push(`xref\n0 ${total}\n0000000000 65535 f \n`);
  for (let n = 1; n < total; n++) push(`${String(offsets[n]).padStart(10, '0')} 00000 n \n`);
  push(`trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return new Blob(chunks as BlobPart[], { type: 'application/pdf' });
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const b64 = dataUrl.split(',')[1] || '';
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function buildCasteReportPdf(options: {
  title: string;
  subtitle: string;
  voters: CasteReportVoter[];
  onProgress?: (done: number, total: number) => void;
}): Promise<Blob> {
  const { title, subtitle, voters, onProgress } = options;
  const withPhotos = voters.some((v) => Boolean(v.photoUrl));
  const perPage = withPhotos ? 17 : 32;
  const chunks: CasteReportVoter[][] = [];
  for (let i = 0; i < voters.length; i += perPage) chunks.push(voters.slice(i, i + perPage));
  if (!chunks.length) chunks.push([]);

  const host = document.createElement('div');
  host.setAttribute('data-no-translate', '');
  // Kept visible (html2canvas skips transparent nodes) but stacked behind the page content.
  host.style.cssText = `position:fixed;left:0;top:0;width:${PAGE_W}px;background:#fff;pointer-events:none;z-index:-99999;`;
  document.body.appendChild(host);
  const pages: { jpeg: Uint8Array; width: number; height: number }[] = [];
  try {
    for (let i = 0; i < chunks.length; i++) {
      const page = document.createElement('div');
      page.style.cssText = `width:${PAGE_W}px;height:${PAGE_H}px;padding:28px 30px;box-sizing:border-box;background:#fff;font-family:"Noto Sans Gujarati","Noto Sans Devanagari",sans-serif;overflow:hidden;`;
      page.innerHTML = pageHtml(title, subtitle, chunks[i], i + 1, chunks.length, withPhotos);
      host.innerHTML = '';
      host.appendChild(page);
      await Promise.all(Array.from(page.querySelectorAll('img')).map((img) => (img.complete ? Promise.resolve() : new Promise((r) => { img.onload = r; img.onerror = r; setTimeout(r, 4000); }))));
      const canvas = await html2canvas(page, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        x: 0,
        y: 0,
        scrollX: 0,
        scrollY: 0,
        width: PAGE_W,
        height: PAGE_H,
        windowWidth: PAGE_W,
        windowHeight: PAGE_H,
        onclone: (doc, el) => {
          // Render the page alone at the top of the cloned document, fully visible.
          doc.body.innerHTML = '';
          doc.body.style.margin = '0';
          doc.body.style.padding = '0';
          doc.body.style.background = '#ffffff';
          doc.body.appendChild(el);
          el.style.position = 'static';
          el.style.opacity = '1';
          el.style.visibility = 'visible';
        },
      });
      pages.push({ jpeg: dataUrlToBytes(canvas.toDataURL('image/jpeg', 0.86)), width: canvas.width, height: canvas.height });
      onProgress?.(i + 1, chunks.length);
    }
  } finally {
    host.remove();
  }
  return buildPdf(pages);
}

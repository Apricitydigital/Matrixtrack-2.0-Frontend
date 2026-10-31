import { matrixStore } from './store';
import { ROLE_LABELS } from './presentation';
// Print an isolated document so scrolling, pagination and closed tabs cannot truncate it.
export function printHtml(title: string, html: string, note = '') {
  const escape = (text: string) => text.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
  const frame = document.createElement('iframe');
  frame.title = title; frame.style.cssText = 'position:fixed;width:1px;height:1px;bottom:0;right:0;border:0;';
  document.body.appendChild(frame);
  const doc = frame.contentDocument!;
  const styles = [...document.querySelectorAll('link[rel="stylesheet"],style')].map(n => n.outerHTML).join('');
  doc.open();doc.write(`<!doctype html><html><head><meta charset="UTF-8"><title>${escape(title)}</title>${styles}<style>@page{size:A4;margin:14mm}body{font:12px Arial,sans-serif;color:#142e40;background:#fff!important}h1{font-size:24px}h2{font-size:17px;margin:20px 0 12px}h3{font-size:14px;margin:15px 0 8px}p{margin:6px 0;line-height:1.5}table{width:100%;border-collapse:collapse;font-size:10px}td,th{padding:9px;text-align:left;border-bottom:1px solid #ddd}thead{display:table-header-group}tr,figure,.decision-card{break-inside:avoid}img{max-width:100%;max-height:240px;object-fit:contain}.print-cover{border-bottom:2px solid #173e52;padding-bottom:16px;margin-bottom:22px}.print-note{color:#687c89;font-size:10px}.report-document{break-before:page}.report-document:first-of-type{break-before:auto}.no-print,button,nav,select,input{display:none!important}.print-gallery{display:grid;grid-template-columns:1fr 1fr;gap:12px}.print-gallery figure{margin:0;border:1px solid #ddd;padding:8px}.workspace-app,.workspace-panel{height:auto!important;overflow:visible!important;max-height:none!important;box-shadow:none!important}.print-scroll{max-height:none!important;overflow:visible!important}.print-chart{max-height:220px}.overflow-x-auto{overflow:visible!important}article{margin-bottom:24px}a{color:inherit;text-decoration:none}</style></head><body><header class="print-cover"><p>MATRIXTRACK 2.0 · ${escape(ROLE_LABELS[matrixStore.currentUser?.role || 'COMMISSIONER'])}</p><h1>${escape(title)}</h1><p class="print-note">${escape(note)} · Generated ${escape(new Date().toLocaleString('en-IN',{timeZone:'Asia/Kolkata'}))} IST</p></header>${html}</body></html>`);doc.close();
  const ready = [...doc.images].map(img => img.complete ? Promise.resolve() : new Promise<void>(resolve => { img.onload=()=>resolve();img.onerror=()=>resolve(); }));
  Promise.race([Promise.all(ready),new Promise(resolve=>setTimeout(resolve,8000))]).then(() => {
    const win=frame.contentWindow!;
    win.addEventListener('afterprint',()=>frame.remove(),{once:true});win.focus();win.print();
    setTimeout(()=>frame.remove(),60000);
  });
}
export function printElement(title: string, element: HTMLElement | null, note = '') {
  if (!element) return;
  const clone=element.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('.no-print,nav,.ops-filter-panel,.insight-filter-row,.workspace-secondary-button,.report-open-button,.commissioner-actions,.register-tools,input,select').forEach(n=>n.remove());
  clone.querySelectorAll('details.analytics-register').forEach(n=>n.setAttribute('open',''));
  // Clickable metric cards and report cells contain report data: retain their contents.
  clone.querySelectorAll('button').forEach(button=>{
    const block=document.createElement('div');
    block.className=button.className;
    if(button.dataset.tone)block.dataset.tone=button.dataset.tone;
    block.innerHTML=button.innerHTML;button.replaceWith(block);
  });
  clone.querySelectorAll('img').forEach(img=>img.removeAttribute('loading'));
  printHtml(title,clone.innerHTML,note);
}

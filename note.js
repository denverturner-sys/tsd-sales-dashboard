// Despatch notes for the warehouse screens (28 Oct): a "Print note" button on each order on Pick & Dispatch, Van Team
// and Collections. No prices. Fetches the order from Bob (login added by wh-auth.js) and opens the browser's print dialog.
(function () {
  const API = 'https://uppxdrihpxsygaorffro.supabase.co/functions/v1/note';
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const dmy = s => s ? new Date(String(s).slice(0, 10) + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  const num = v => (+v || 0).toLocaleString('en-GB', { maximumFractionDigits: 2 });
  const BRANCH = {
    'Bromham': '1 New Road, Bromham, Chippenham, Wiltshire SN15 2JA',
  };

  function html(o, kind) {
    const logo = (document.querySelector('header img') || document.querySelector('img') || {}).src || '';
    const anyBo = o.lines.some(l => l.bo > 0);
    const collect = kind === 'collection';
    const addr = [o.address, [o.town, o.postcode].filter(Boolean).join(' ')].filter(Boolean)
      .join('\n').split(/\n|,\s*(?=[A-Z0-9])/).map(x => x.trim()).filter((x, i, a) => x && a.indexOf(x) === i);
    return `<!doctype html><html><head><meta charset="utf-8"><title>Despatch note ${esc(o.no)}</title><style>
      @page{size:A4;margin:14mm}
      *{box-sizing:border-box} body{font-family:Arial,Helvetica,sans-serif;color:#111;font-size:12.5px;margin:0}
      .top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #111;padding-bottom:10px}
      .top img{height:56px} .top .co{text-align:right;font-size:11.5px;line-height:1.45}
      h1{font-size:26px;margin:14px 0 4px;letter-spacing:1px} .no{font-size:20px;font-weight:700}
      .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:14px 0}
      .box{border:1px solid #999;border-radius:6px;padding:10px 12px;line-height:1.5}
      .box .k{font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#555;margin-bottom:3px}
      .big{font-size:15px;font-weight:700}
      table{width:100%;border-collapse:collapse;margin-top:6px} th{text-align:left;font-size:10.5px;text-transform:uppercase;letter-spacing:.6px;border-bottom:2px solid #111;padding:6px 6px}
      td{padding:7px 6px;border-bottom:1px solid #ccc;vertical-align:top} td.r,th.r{text-align:right} td.c,th.c{text-align:center}
      .bo{color:#b00;font-weight:700}
      .notes{border:1px dashed #777;border-radius:6px;padding:8px 12px;margin-top:12px;white-space:pre-wrap}
      .sign{display:grid;grid-template-columns:2fr 2fr 1fr;gap:14px;margin-top:26px}
      .sign div{border-top:1px solid #111;padding-top:4px;font-size:11px;color:#444;height:42px}
      .foot{margin-top:18px;font-size:11px;color:#444}
    </style></head><body>
      <div class="top">${logo ? `<img src="${logo}" alt="Tiling Supplies Direct">` : '<b>Tiling Supplies Direct</b>'}
        <div class="co"><b>Tiling Supplies Direct</b><br>${esc(BRANCH[o.location] || BRANCH.Bromham)}<br>01249 464000 · www.tilingsuppliesdirect.co.uk</div></div>
      <h1>${collect ? 'COLLECTION NOTE' : 'DESPATCH NOTE'}</h1>
      <div class="no">${esc(o.no)}</div>
      <div class="grid">
        <div class="box"><div class="k">${collect ? 'Customer' : 'Deliver to'}</div>
          <div class="big">${esc(o.ship_name || o.customer)}</div>
          ${o.ship_name && o.ship_name !== o.customer ? `<div>${esc(o.customer)}</div>` : ''}
          ${collect ? '' : addr.map(x => `<div>${esc(x)}</div>`).join('')}
          ${o.contact ? `<div>Contact: ${esc(o.contact)}</div>` : ''}${o.phone ? `<div>Tel: ${esc(o.phone)}</div>` : ''}</div>
        <div class="box"><div class="k">Order</div>
          <div>Order date: <b>${dmy(o.order_date)}</b></div>
          <div>${collect ? 'Collected' : 'Despatched'}: <b>${dmy(o.fulfilled_at || new Date().toISOString())}</b></div>
          ${o.carrier ? `<div>${collect ? 'Collection' : 'Delivery'}: <b>${esc(o.carrier)}</b></div>` : ''}
          ${o.boxes ? `<div>Boxes / parcels: <b>${o.boxes}</b></div>` : ''}
          ${o.rep && o.rep !== 'WooCommerce' ? `<div>Account manager: ${esc(o.rep)}</div>` : o.rep === 'WooCommerce' ? '<div>Website order</div>' : ''}</div>
      </div>
      <table><thead><tr><th style="width:18%">Code</th><th>Description</th><th class="r" style="width:10%">Ordered</th><th class="r" style="width:10%">${collect ? 'Collected' : 'Sent'}</th>${anyBo ? '<th class="r" style="width:12%">To follow</th>' : ''}<th class="c" style="width:7%">✓</th></tr></thead><tbody>
        ${o.lines.map(l => `<tr><td>${esc(l.sku)}</td><td>${esc(l.name)}</td><td class="r">${num(l.qty)}</td><td class="r"><b>${num(Math.max(0, l.qty - l.bo))}</b></td>${anyBo ? `<td class="r ${l.bo > 0 ? 'bo' : ''}">${l.bo > 0 ? num(l.bo) : ''}</td>` : ''}<td class="c">☐</td></tr>`).join('')}
      </tbody></table>
      ${anyBo ? `<div class="foot bo">Items marked "to follow" are on order and will ${collect ? 'be ready to collect' : 'be sent'} as soon as they arrive.</div>` : ''}
      ${o.notes ? `<div class="notes"><b>Notes:</b> ${esc(o.notes)}</div>` : ''}
      <div class="sign"><div>${collect ? 'Collected by (print name)' : 'Received by (print name)'}</div><div>Signature</div><div>Date</div></div>
      <div class="foot">Please check your goods ${collect ? 'before leaving' : 'on delivery'} and let us know straight away if anything is missing or damaged. Thank you for your order.</div>
    </body></html>`;
  }

  async function print(id, kind) {
    let o;
    try {
      const r = await fetch(API + '?id=' + encodeURIComponent(id), { cache: 'no-store' });
      o = await r.json();
      if (!r.ok || o.error) throw new Error(o.error || 'Error ' + r.status);
    } catch (e) { alert("Couldn't get the order for the despatch note: " + e.message); return; }
    const f = document.createElement('iframe');
    f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    document.body.appendChild(f);
    const d = f.contentWindow.document;
    d.open(); d.write(html(o, kind)); d.close();
    const go = () => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) {} setTimeout(() => f.remove(), 60000); };
    const img = d.querySelector('img');
    if (img && !img.complete) { img.onload = go; img.onerror = go; } else setTimeout(go, 150);
  }

  // any button with class "notebtn" and data-id prints that order's note
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('.notebtn');
    if (!b) return;
    e.preventDefault(); e.stopPropagation();
    print(b.dataset.id, b.dataset.kind || 'delivery');
  }, true);
  window.TSDNote = { print };
})();

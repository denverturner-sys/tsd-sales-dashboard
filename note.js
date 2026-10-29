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
    // 29 Oct: lines carry go (in this delivery), prev (sent in an earlier delivery) and follow (still to come), from Cin7's fulfilments
    o.lines.forEach(l => { if (l.go == null) { l.go = Math.max(0, l.qty - l.bo); l.follow = l.bo; l.prev = 0; } });
    const anyBo = o.lines.some(l => l.follow > 0), anyPrev = o.lines.some(l => l.prev > 0);
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
          <div>${o.fulfilled_at ? (collect ? 'Collected' : 'Despatched') : 'Date'}: <b>${dmy(o.fulfilled_at || new Date().toISOString())}</b></div>
          ${anyPrev ? `<div><b>Part ${collect ? 'collection' : 'delivery'}</b>: some of this order went earlier</div>` : ''}
          ${o.carrier ? `<div>${collect ? 'Collection' : 'Delivery'}: <b>${esc(o.carrier)}</b></div>` : ''}
          ${o.boxes ? `<div>Boxes / parcels: <b>${o.boxes}</b></div>` : ''}
          ${o.rep && o.rep !== 'WooCommerce' ? `<div>Account manager: ${esc(o.rep)}</div>` : o.rep === 'WooCommerce' ? '<div>Website order</div>' : ''}</div>
      </div>
      <table><thead><tr><th style="width:18%">Code</th><th>Description</th><th class="r" style="width:10%">Ordered</th><th class="r" style="width:11%">${collect ? 'Collecting now' : 'In this delivery'}</th>${anyPrev ? `<th class="r" style="width:10%">${collect ? 'Collected before' : 'Sent before'}</th>` : ''}${anyBo ? '<th class="r" style="width:10%">To follow</th>' : ''}<th class="c" style="width:7%">✓</th></tr></thead><tbody>
        ${o.lines.map(l => `<tr><td>${esc(l.sku)}</td><td>${esc(l.name)}</td><td class="r">${num(l.qty)}</td><td class="r"><b>${num(l.go)}</b></td>${anyPrev ? `<td class="r">${l.prev > 0 ? num(l.prev) : ''}</td>` : ''}${anyBo ? `<td class="r ${l.follow > 0 ? 'bo' : ''}">${l.follow > 0 ? num(l.follow) : ''}</td>` : ''}<td class="c">☐</td></tr>`).join('')}
      </tbody></table>
      ${anyBo ? `<div class="foot bo">Items marked "to follow" are on order and will ${collect ? 'be ready to collect' : 'be sent'} as soon as they arrive.</div>` : ''}
      ${o.notes ? `<div class="notes"><b>Notes:</b> ${esc(o.notes)}</div>` : ''}
      <div class="sign"><div>${collect ? 'Collected by (print name)' : 'Received by (print name)'}</div><div>Signature</div><div>Date</div></div>
      <div class="foot">Please check your goods ${collect ? 'before leaving' : 'on delivery'} and let us know straight away if anything is missing or damaged. Thank you for your order.</div>
    </body></html>`;
  }

  // ---- address labels (29 Oct, Toby): 4x6in, for the FedEx label printer. Name, address, contact, order number, parcel x of y ----
  function addrLines(o) {
    // postcode is printed big on its own, so leave it out of the address lines
    const pc = String(o.postcode || '').trim().toUpperCase();
    const strip = x => pc ? x.replace(new RegExp('\\s*' + pc.replace(/\s+/g, '\\s*') + '\\s*$', 'i'), '').trim() : x;
    const out = String(o.address || '').split(/\n|,\s*(?=[A-Za-z0-9])/).map(x => strip(x.trim())).filter(Boolean);
    if (o.town && !out.some(x => x.toLowerCase() === String(o.town).trim().toLowerCase())) out.push(String(o.town).trim());
    return out.filter((x, i, a) => a.findIndex(y => y.toLowerCase() === x.toLowerCase()) === i);
  }
  function labelHtml(o, n) {
    const lines = addrLines(o), pc = String(o.postcode || '').toUpperCase();
    const name = o.ship_name || o.customer || '';
    const one = i => `<div class="lab">
        <div class="hd"><span>DELIVER TO</span><span>${esc(o.carrier || '')}</span></div>
        <div class="nm">${esc(name)}</div>
        ${o.ship_name && o.customer && o.ship_name !== o.customer ? `<div class="co">${esc(o.customer)}</div>` : ''}
        <div class="ad">${lines.map(x => `<div>${esc(x)}</div>`).join('')}</div>
        ${pc ? `<div class="pc">${esc(pc)}</div>` : ''}
        <div class="ct">${o.contact ? `Contact: <b>${esc(o.contact)}</b><br>` : ''}${o.phone ? `Tel: <b>${esc(o.phone)}</b>` : ''}</div>
        ${o.notes ? `<div class="nt">${esc(String(o.notes).slice(0, 160))}</div>` : ''}
        <div class="ft"><div><div class="k">Order</div><div class="no">${esc(o.no)}</div></div><div class="pr"><div class="k">Parcel</div><div class="no">${i} of ${n}</div></div></div>
        <div class="fr">From: Tiling Supplies Direct, ${esc(BRANCH[o.location] || BRANCH.Bromham)} · 01249 464000</div>
      </div>`;
    return `<!doctype html><html><head><meta charset="utf-8"><title>Label ${esc(o.no)}</title><style>
      @page{size:4in 6in;margin:0}
      *{box-sizing:border-box} html,body{margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;color:#000}
      .lab{width:4in;height:6in;padding:0.18in 0.2in;display:flex;flex-direction:column;gap:6px;page-break-after:always;overflow:hidden}
      .lab:last-child{page-break-after:auto}
      .hd{display:flex;justify-content:space-between;font-size:11px;font-weight:700;letter-spacing:1px;border-bottom:2px solid #000;padding-bottom:4px}
      .nm{font-size:22px;font-weight:700;line-height:1.15;margin-top:4px} .co{font-size:15px;font-weight:700}
      .ad{font-size:17px;line-height:1.3} .pc{font-size:34px;font-weight:700;letter-spacing:1px;margin-top:2px}
      .ct{font-size:14px;line-height:1.4;margin-top:4px} .nt{font-size:12px;border:1px dashed #000;padding:4px 6px;border-radius:4px}
      .ft{margin-top:auto;display:flex;justify-content:space-between;align-items:flex-end;border-top:2px solid #000;padding-top:6px}
      .ft .k{font-size:10px;font-weight:700;letter-spacing:1px} .ft .no{font-size:26px;font-weight:700} .ft .pr{text-align:right}
      .fr{font-size:9.5px;line-height:1.3}
    </style></head><body>${Array.from({ length: n }, (_, i) => one(i + 1)).join('')}</body></html>`;
  }
  function printDoc(doc) {
    const f = document.createElement('iframe');
    f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    document.body.appendChild(f);
    const d = f.contentWindow.document;
    d.open(); d.write(doc); d.close();
    setTimeout(() => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) {} setTimeout(() => f.remove(), 60000); }, 150);
  }
  async function label(id) {
    let o;
    try {
      const r = await fetch(API + '?id=' + encodeURIComponent(id), { cache: 'no-store' });
      o = await r.json();
      if (!r.ok || o.error) throw new Error(o.error || 'Error ' + r.status);
    } catch (e) { alert("Couldn't get the order for the label: " + e.message); return; }
    // ask how many parcels (one label each)
    const ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;font-family:Barlow,Arial,sans-serif';
    ov.innerHTML = `<div style="background:#323333;color:#fff;border-radius:14px;padding:20px;max-width:380px;width:100%;display:flex;flex-direction:column;gap:12px">
      <div style="font-size:22px;font-weight:700">🏷 Address label · ${esc(o.no)}</div>
      <div style="color:#B9BCBC;font-size:14px">${esc(o.ship_name || o.customer || '')}${o.postcode ? ' · ' + esc(o.postcode) : ''}<br>4×6 label. In the print box, pick the <b style="color:#fff">FedEx label printer</b> (the browser remembers it next time).</div>
      <label style="display:flex;align-items:center;gap:10px;font-size:16px">Labels (one per parcel)
        <input id="tsdlbn" type="number" min="1" max="50" value="${o.boxes || 1}" inputmode="numeric" style="width:70px;text-align:center;font-size:18px;padding:6px;border-radius:8px;border:1px solid #474949;background:#262727;color:#fff"></label>
      <div style="display:flex;gap:10px;justify-content:flex-end"><button id="tsdlbc" style="background:transparent;color:#fff;border:1px solid #474949;border-radius:8px;padding:10px 16px;font-weight:700;cursor:pointer">Cancel</button>
        <button id="tsdlbp" style="background:#EED107;color:#262727;border:0;border-radius:8px;padding:10px 16px;font-weight:700;cursor:pointer">Print</button></div></div>`;
    document.body.appendChild(ov);
    const close = () => ov.remove();
    ov.addEventListener('click', e => { if (e.target === ov) close(); });
    ov.querySelector('#tsdlbc').onclick = close;
    ov.querySelector('#tsdlbp').onclick = () => { const n = Math.max(1, Math.min(50, Math.round(+ov.querySelector('#tsdlbn').value || 1))); close(); printDoc(labelHtml(o, n)); };
    ov.querySelector('#tsdlbn').focus();
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

  // any button with class "lblbtn" and data-id prints address labels for that order
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('.lblbtn');
    if (!b) return;
    e.preventDefault(); e.stopPropagation();
    label(b.dataset.id);
  }, true);
  // any button with class "notebtn" and data-id prints that order's note
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('.notebtn');
    if (!b || b.classList.contains('lblbtn')) return;
    e.preventDefault(); e.stopPropagation();
    print(b.dataset.id, b.dataset.kind || 'delivery');
  }, true);
  window.TSDNote = { print, label };
})();

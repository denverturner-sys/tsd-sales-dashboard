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
  // black-and-white TSD logo for the thermal label printer (the screen logo has white text, which wouldn't print)
  const PRINT_LOGO = 'data:image/png;base64,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';
  function labelHtml(o, n) {
    const lines = addrLines(o), pc = String(o.postcode || '').toUpperCase();
    const name = o.ship_name || o.customer || '';
    const lg = PRINT_LOGO;
    const one = i => `<div class="lab">
        ${lg ? `<img class="lg" src="${lg}" alt="TSD">` : ''}
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
      .lg{height:0.46in;width:auto;align-self:flex-start;margin:-2px 0 2px 0}
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
  window.TSDNote = { print, label, labelHtml };
})();

// Payment links + customer email panel (12 Nov, Denver). Shared by the Sell screen and the Sales orders screen.
//   TSDPay.panel(el, { token: () => '...', saleId, toast: fn, onChange: fn })
// Shows what's due on the order, lets you make a Stripe payment link, copy it, email it to the customer (an Outlook draft you check and send
// yourself), switch it off, and, once the customer has paid, print the pick sheet for the warehouse.
// Bob never records the card payment in Cin7: the Stripe payout is reconciled in Xero and Bob's overnight job copies it across.
window.TSDPay = (function () {
  const BASE = 'https://uppxdrihpxsygaorffro.supabase.co/functions/v1/';
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const gbp = n => '£' + Number(n || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const when = s => { const d = new Date(s), t = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); return d.toDateString() === new Date().toDateString() ? 'today ' + t : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' ' + t; };

  if (!document.getElementById('pp-css')) {
    const st = document.createElement('style'); st.id = 'pp-css';
    st.textContent = `.pp{background:var(--panel2,#3B3C3C);border:1px solid var(--line,#474949);border-radius:10px;padding:12px 14px;margin:10px 0}
    .pp .k{font-size:11px;font-weight:700;letter-spacing:1.1px;text-transform:uppercase;color:var(--muted,#B9BCBC)}
    .pp .big{font-size:20px;font-weight:800}.pp .row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
    .pp .lk{border-top:1px solid var(--line,#474949);padding:9px 0;display:flex;gap:10px;align-items:center;flex-wrap:wrap}
    .pp .b{background:var(--panel,#323333);color:var(--ink,#fff);border:1px solid var(--line,#474949);border-radius:8px;padding:6px 11px;font-weight:700;cursor:pointer;font-size:13px}.pp .b:hover{border-color:var(--accent,#EED107)}
    .pp .b.y{background:var(--accent,#EED107);color:#262727;border-color:var(--accent,#EED107)}.pp .b:disabled{opacity:.5;cursor:default}
    .pp .tg{font-size:11px;font-weight:800;border-radius:999px;padding:2px 9px;background:var(--line,#474949)}.pp .tg.open{background:#8EC5FF;color:#262727}.pp .tg.paid{background:#7DDB98;color:#262727}
    .pp .sm{font-size:12px;color:var(--muted,#B9BCBC)}.pp .er{color:#FF7A6B;font-weight:600;margin-top:6px}
    #ppm{position:fixed;inset:0;background:rgba(0,0,0,.65);display:none;align-items:center;justify-content:center;padding:14px;z-index:90}
    #ppm .bx{background:var(--panel,#323333);color:var(--ink,#fff);border-radius:14px;padding:18px;width:100%;max-width:760px;max-height:92vh;overflow:auto}
    #ppm input{width:100%;background:var(--bg,#262727);color:var(--ink,#fff);border:1px solid var(--line,#474949);border-radius:8px;padding:9px;margin:3px 0 8px;font:inherit}
    #ppm iframe{width:100%;height:340px;border:0;background:#fff;border-radius:8px}`;
    document.head.appendChild(st);
  }
  async function call(token, fn, body, qs) {
    const r = await fetch(BASE + fn + (qs || ''), body ? { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token() }, body: JSON.stringify(body) } : { headers: { Authorization: 'Bearer ' + token() }, cache: 'no-store' });
    if (r.status === 401) throw new Error('Please log in again.');
    const j = await r.json().catch(() => ({}));
    if (j.error || j.ok === false) { const e = new Error(j.error || "Couldn't do that"); e.data = j; throw e; }
    return j;
  }
  function overlay() {
    let m = document.getElementById('ppm');
    if (!m) { m = document.createElement('div'); m.id = 'ppm'; m.innerHTML = '<div class="bx"></div>'; document.body.appendChild(m); m.addEventListener('click', e => { if (e.target === m) m.style.display = 'none'; }); }
    return m;
  }

  // the email box
  async function emailDlg(o, linkId) {
    const m = overlay(), bx = m.firstChild; m.style.display = 'flex'; bx.innerHTML = '<div class="sm">Building the email…</div>';
    let e;
    try { e = await call(o.token, 'sell', { action: 'email', sale_id: o.saleId, link_id: linkId || undefined }); }
    catch (x) { bx.innerHTML = `<div class="er">${esc(x.message)}</div><div class="row" style="margin-top:10px"><button class="b" id="ppx">Close</button></div>`; document.getElementById('ppx').onclick = () => m.style.display = 'none'; return; }
    bx.innerHTML = `<div style="font-size:18px;font-weight:800;margin-bottom:8px">Email to the customer</div>
      <div class="k" style="font-size:11px;font-weight:700;letter-spacing:1px;color:var(--muted)">TO</div><input id="ppto" value="${esc(e.to)}" placeholder="customer@email.com">
      <div class="k" style="font-size:11px;font-weight:700;letter-spacing:1px;color:var(--muted)">SUBJECT</div><input id="ppsu" value="${esc(e.subject)}">
      <iframe id="ppfr"></iframe>
      ${e.link_id ? '' : '<div class="sm" style="margin:6px 0">This email has no payment link in it. Close this and make a link first if you want one.</div>'}
      <div id="ppmsg" class="sm" style="margin:8px 0"></div>
      <div class="row"><button class="b y" id="ppdr">Create draft in Outlook</button><button class="b" id="ppcp">Copy email</button><button class="b" id="ppx">Close</button></div>`;
    document.getElementById('ppfr').srcdoc = e.html;
    const msg = t => document.getElementById('ppmsg').innerHTML = t;
    document.getElementById('ppx').onclick = () => m.style.display = 'none';
    document.getElementById('ppcp').onclick = async () => {
      try { await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([e.html], { type: 'text/html' }), 'text/plain': new Blob([e.text], { type: 'text/plain' }) })]); msg('Copied. Paste it into a new email.'); }
      catch (x) { try { const f = document.getElementById('ppfr'); f.contentWindow.focus(); f.contentWindow.document.execCommand('selectAll'); document.execCommand('copy'); msg('Copied. Paste it into a new email.'); } catch (y) { msg('Your browser wouldn\'t let me copy. Select the text in the box above and copy it.'); } }
      if (e.link_id) call(o.token, 'sell', { action: 'emailed', id: e.link_id }).then(() => o.onChange && o.onChange()).catch(() => {});
    };
    document.getElementById('ppdr').onclick = async () => {
      const b = document.getElementById('ppdr'); b.disabled = true; msg('Creating the draft…');
      try {
        const r = await call(o.token, 'msgraph', { action: 'mail_draft', to: document.getElementById('ppto').value.trim(), subject: document.getElementById('ppsu').value, html: e.html });
        msg(`Done. It's in your Outlook Drafts folder, ready to check and send.${r.web_link ? ` <a href="${esc(r.web_link)}" target="_blank" rel="noopener" style="color:var(--blue,#8EC5FF);font-weight:700">Open it ↗</a>` : ''}`);
        if (e.link_id) call(o.token, 'sell', { action: 'emailed', id: e.link_id }).then(() => o.onChange && o.onChange()).catch(() => {});
      } catch (x) {
        const d = x.data || {};
        if (d.need === 'mail' || d.connected === false || /not connected|isn't connected|Not available/i.test(x.message)) {
          msg(`<span style="color:var(--bad,#FF7A6B)">${esc(d.need === 'mail' ? 'Outlook drafts aren\'t switched on for you yet.' : x.message)}</span> <button class="b" id="ppcn">Connect Outlook drafts</button><div class="sm" style="margin-top:4px">It opens Microsoft's sign-in in a new tab. Bob only creates drafts. It never reads your emails. When you're back, press Create draft again. Or use Copy email for now.</div>`);
          const cn = document.getElementById('ppcn'); if (cn) cn.onclick = async () => { try { const s = await call(o.token, 'msgraph', { action: 'start', mail: true }); window.open(s.url, '_blank'); } catch (z) { msg(esc(z.message)); } };
        } else msg(`<span style="color:var(--bad,#FF7A6B)">${esc(x.message)}</span>`);
        b.disabled = false;
      }
    };
  }

  async function panel(el, o) {
    el.innerHTML = '<div class="pp"><span class="sm">Checking payment…</span></div>';
    let s;
    try { s = await call(o.token, 'sell', null, '?sale=' + encodeURIComponent(o.saleId)); }
    catch (x) { if (o.quiet) { el.innerHTML = ''; return; } el.innerHTML = `<div class="pp"><div class="k">Payment</div><div class="er">${esc(x.message)}</div></div>`; return; }
    const open = s.links.filter(l => l.status === 'open'), paid = s.links.filter(l => l.status === 'paid');
    const refresh = () => { panel(el, o); o.onChange && o.onChange(); };
    el.innerHTML = `<div class="pp"><div class="row" style="justify-content:space-between"><div><div class="k">Payment · ${esc(s.number || '')}</div>
        <div class="big">${s.due > 0 ? gbp(s.due) + ' <span class="sm" style="font-weight:400">still to pay (' + gbp(s.total) + ' total' + (s.paid > 0 ? ', ' + gbp(s.paid) + ' paid' : '') + ')</span>' : 'Paid in full <span class="sm" style="font-weight:400">(' + gbp(s.total) + ')</span>'}</div></div>
        <div class="row">${s.due > 0 && !s.voided ? `<button class="b y" id="ppnew">${open.length ? 'New payment link' : 'Create payment link'}</button>` : ''}<button class="b" id="ppem">Email the customer</button></div></div>
      ${s.links.map(l => `<div class="lk"><span class="tg ${l.status}">${l.status === 'open' ? 'Waiting for payment' : l.status === 'paid' ? 'PAID' : 'Switched off'}</span><b>${gbp(l.amount)}</b>
        <span class="sm" style="flex:1;min-width:150px">${l.status === 'paid' ? 'Paid ' + esc(when(l.paid_at)) + (l.paid_email ? ' · ' + esc(l.paid_email) : '') : 'Made ' + esc(when(l.created_at)) + ' by ' + esc(l.created_by_name || '')}${l.emailed_at ? ' · emailed ' + esc(when(l.emailed_at)) : ''}</span>
        ${l.status === 'open' ? `<button class="b" data-cp="${esc(l.url)}">Copy link</button><button class="b" data-em="${l.id}">Email</button><button class="b" data-cx="${l.id}">Switch off</button>` : ''}
        ${l.status === 'paid' ? `<button class="b y" data-pk="1">🖨 Pick sheet to Dispatch</button>` : ''}</div>`).join('')}
      ${paid.length && s.due <= 0 ? '<div class="sm" style="margin-top:6px">Card payments are recorded in Cin7 by the overnight job once the Stripe payout has been reconciled in Xero. Bob doesn\'t add them itself.</div>' : ''}
      <div id="pper" class="er"></div></div>`;
    const err = t => el.querySelector('#pper').textContent = t || '';
    const nb = el.querySelector('#ppnew');
    if (nb) nb.onclick = async () => {
      let amt; if (s.paid > 0 || open.length) { const v = prompt('Amount for the new link (£)', String(s.due.toFixed(2))); if (v === null) return; amt = Number(v); if (!(amt > 0)) return err('Enter an amount'); }
      nb.disabled = true; err('');
      try { const r = await call(o.token, 'sell', { action: 'paylink', sale_id: o.saleId, amount: amt }); o.toast && o.toast(r.reused ? 'That link was already made' : 'Payment link made'); refresh(); }
      catch (x) { err(x.message); nb.disabled = false; }
    };
    el.querySelector('#ppem').onclick = () => emailDlg(o, open[0] && open[0].id);
    el.querySelectorAll('[data-cp]').forEach(b => b.onclick = async () => { try { await navigator.clipboard.writeText(b.dataset.cp); o.toast && o.toast('Link copied'); } catch (x) { prompt('Copy this link', b.dataset.cp); } });
    el.querySelectorAll('[data-em]').forEach(b => b.onclick = () => emailDlg(o, +b.dataset.em));
    el.querySelectorAll('[data-cx]').forEach(b => b.onclick = async () => { if (!confirm('Switch this link off? The customer will no longer be able to pay with it.')) return; try { await call(o.token, 'sell', { action: 'cancel', id: +b.dataset.cx }); refresh(); } catch (x) { err(x.message); } });
    el.querySelectorAll('[data-pk]').forEach(b => b.onclick = async () => { b.disabled = true; try { await call(o.token, 'orders', { action: 'print', id: o.saleId, doc: 'pick', printer: 'dispatch' }); o.toast && o.toast('Pick sheet sent to the dispatch printer'); } catch (x) { err(x.message); b.disabled = false; } });
  }
  return { panel, emailDlg, call, gbp, when, esc };
})();

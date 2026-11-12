// source hunter content script: highlight -> bubble -> trace in side panel
(function () {
  if (window.__shLoaded) return;
  window.__shLoaded = true;
  let bubble = null;

  function removeBubble() { if (bubble) { bubble.remove(); bubble = null; } }

  document.addEventListener('mouseup', (e) => {
    const sel = window.getSelection();
    const text = sel ? sel.toString().trim() : '';
    if (!text || text.length < 12 || text.length > 600) { removeBubble(); return; }
    removeBubble();
    const range = sel.getRangeAt(0).getBoundingClientRect();
    bubble = document.createElement('div');
    bubble.id = 'sh-bubble';
    bubble.textContent = 'trace this';
    bubble.style.left = (window.scrollX + range.left) + 'px';
    bubble.style.top = (window.scrollY + range.bottom + 6) + 'px';
    bubble.addEventListener('mousedown', (ev) => {
      ev.preventDefault(); ev.stopPropagation();
      startTrace(text);
      removeBubble();
    });
    document.body.appendChild(bubble);
  });

  document.addEventListener('mousedown', (e) => {
    if (bubble && !bubble.contains(e.target)) removeBubble();
  });

  function startTrace(claim) {
    let panel = document.getElementById('sh-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'sh-panel';
      document.body.appendChild(panel);
    }
    panel.innerHTML = '<span class="sh-close">close</span><h2>source hunter</h2>' +
      '<div class="sh-quote">“' + escapeHtml(claim) + '”</div>' +
      '<p>tracing… this can take a couple of minutes.</p>';
    panel.querySelector('.sh-close').onclick = () => panel.remove();
    chrome.runtime.sendMessage(
      { type: 'sh-trace', claim: claim, pageUrl: location.href, pageTitle: document.title },
      (resp) => { render(panel, resp); }
    );
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function render(panel, resp) {
    if (!resp || !resp.ok) {
      panel.innerHTML = '<span class="sh-close">close</span><h2>source hunter</h2><p>trace failed: ' +
        escapeHtml((resp && resp.error) || 'unknown error') + '</p>';
      panel.querySelector('.sh-close').onclick = () => panel.remove();
      return;
    }
    const r = resp.result;
    let html = '<span class="sh-close">close</span><h2>source hunter</h2>';
    html += '<div class="sh-quote">“' + escapeHtml(r.claim) + '”</div>';
    html += '<p class="sh-verdict">' + escapeHtml(r.verdict) + '</p>';
    if (r.note) html += '<p>' + escapeHtml(r.note) + '</p>';
    (r.chain || []).forEach((s) => {
      html += '<div class="sh-step ' + (s.is_primary ? 'primary' : '') + (s.breaks_chain ? ' broken' : '') + '">';
      html += '<div><a href="' + escapeHtml(s.url) + '" target="_blank" rel="noopener">' + escapeHtml(s.title || s.url) + '</a></div>';
      html += '<div>' + escapeHtml(s.date || 'date unknown') + (s.is_primary ? ' · primary source' : '') + '</div>';
      if (s.exact_wording) html += '<div class="sh-quote">“' + escapeHtml(s.exact_wording) + '”</div>';
      if (s.change) html += '<div>⚠ ' + escapeHtml(s.change) + '</div>';
      html += '</div>';
    });
    html += '<p style="color:#888;font-size:12px">traced with TinyFish (research + search + fetch)</p>';
    panel.innerHTML = html;
    panel.querySelector('.sh-close').onclick = () => panel.remove();
  }
})();

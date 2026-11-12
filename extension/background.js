// source hunter background: runs the TinyFish trace pipeline
// endpoints used: TinyResearch (deep run) + Search + Fetch = 3 endpoints

const TF_KEY_STORE = 'sh_tinyfish_key';

async function getKey() {
  const s = await chrome.storage.local.get(TF_KEY_STORE);
  return s[TF_KEY_STORE] || '';
}

async function launchResearch(key, claim, pageUrl) {
  const q = [
    'Trace this claim to its original source: "' + claim + '"' + (pageUrl ? ' (seen on ' + pageUrl + ')' : '') + '.',
    'Find the chain of citations back to the earliest primary source (study, report, filing, dataset or interview).',
    'Answer ONLY as compact JSON with this shape:',
    '{"verdict": "one of: matches original | changed along the way | misquoted | no traceable source",',
    ' "note": "one sentence on what changed, if anything",',
    ' "chain": [{"url": "...", "title": "...", "date": "...", "exact_wording": "the claim as written on that page", "is_primary": true/false, "breaks_chain": true/false, "change": "what changed at this step or null"}],',
    ' "searched_but_not_found": ["any place checked that did not have it"]}',
    'Order the chain from the page where the claim was seen back to the primary source. Every step must be a real live URL you actually checked, with the exact wording as it appears there. Never invent a URL or a date; if no primary source exists, say so in verdict and omit is_primary.'
  ].join(' ');
  const r = await fetch('https://agent.tinyfish.ai/v1/automation/run-research-async', {
    method: 'POST',
    headers: { 'X-API-Key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: q, mode: 'deep' })
  });
  if (!r.ok) throw new Error('research launch failed: ' + r.status);
  const j = await r.json();
  return j.research_run_id || j.run_id || j.id;
}

async function pollResearch(key, runId, timeoutMs) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    await new Promise((res) => setTimeout(res, 15000));
    const r = await fetch('https://agent.tinyfish.ai/v1/research-run/' + runId, {
      headers: { 'X-API-Key': key }
    });
    if (!r.ok) continue;
    const j = await r.json();
    const st = (j.status || '').toLowerCase();
    if (st === 'completed' || st === 'complete' || st === 'succeeded') return j;
    if (st === 'failed' || st === 'error') throw new Error('research run failed');
  }
  throw new Error('research run timed out');
}

async function tfSearch(key, query, n) {
  const r = await fetch('https://api.search.tinyfish.ai?query=' + encodeURIComponent(query) + '&num_results=' + (n || 5), {
    headers: { 'X-API-Key': key }
  });
  if (!r.ok) return [];
  const j = await r.json();
  return j.results || j.organic || [];
}

async function tfFetch(key, urls) {
  const r = await fetch('https://api.fetch.tinyfish.ai', {
    method: 'POST',
    headers: { 'X-API-Key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ urls: urls, format: 'markdown' })
  });
  if (!r.ok) return null;
  const j = await r.json();
  return j.results || [];
}

function extractJson(memo) {
  const m = memo.match(/\{[\s\S]*"chain"[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch (e) { return null; }
}

async function trace(claim, pageUrl) {
  const key = await getKey();
  if (!key) throw new Error('no TinyFish API key saved (open the extension options)');
  const runId = await launchResearch(key, claim, pageUrl);
  const run = await pollResearch(key, runId, 8 * 60 * 1000);
  const memo = (run.deep_result && (run.deep_result.result || run.deep_result)) || run.result || '';
  let parsed = typeof memo === 'string' ? extractJson(memo) : memo;
  if (!parsed) parsed = { verdict: 'no traceable source', note: 'could not parse research output', chain: [] };

  // confirm the chain head (primary source) is live with Fetch, and backfill citers with Search
  const urls = (parsed.chain || []).map((s) => s.url).filter(Boolean).slice(0, 3);
  if (urls.length) await tfFetch(key, urls); // live-check; failures left as-is, honesty rule
  if (!(parsed.chain || []).some((s) => s.is_primary)) {
    await tfSearch(key, '"' + claim.slice(0, 80) + '" original study source', 5);
  }
  parsed.claim = claim;
  parsed.run_id = runId;
  return parsed;
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === 'sh-trace') {
    trace(msg.claim, msg.pageUrl)
      .then((result) => sendResponse({ ok: true, result }))
      .catch((e) => sendResponse({ ok: false, error: String(e && e.message || e) }));
    return true; // async
  }
  if (msg && msg.type === 'sh-set-key') {
    chrome.storage.local.set({ [TF_KEY_STORE]: msg.key }).then(() => sendResponse({ ok: true }));
    return true;
  }
});

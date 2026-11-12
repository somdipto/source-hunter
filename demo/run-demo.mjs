#!/usr/bin/env node
// source hunter demo runner: same pipeline as the extension, writes a markdown report
// usage: TINYFISH_API_KEY=... node demo/run-demo.mjs "claim text" "https://page-seen-on" demos/demo-1.md
import { writeFileSync } from 'node:fs';

const KEY = process.env.TINYFISH_API_KEY;
if (!KEY) { console.error('set TINYFISH_API_KEY'); process.exit(1); }
const [claim, pageUrl, outPath] = process.argv.slice(2);
if (!claim || !outPath) { console.error('usage: node demo/run-demo.mjs "claim" "pageUrl" out.md'); process.exit(1); }

async function launchResearch() {
  const q = [
    `Trace this claim to its original source: "${claim}"` + (pageUrl ? ` (seen on ${pageUrl})` : '') + '.',
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
    headers: { 'X-API-Key': KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: q, mode: 'deep' })
  });
  if (!r.ok) throw new Error('research launch failed: ' + r.status + ' ' + (await r.text()).slice(0, 200));
  const j = await r.json();
  return j.research_run_id || j.run_id || j.id;
}

async function poll(runId, timeoutMs = 10 * 60 * 1000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    await new Promise((res) => setTimeout(res, 15000));
    const r = await fetch('https://agent.tinyfish.ai/v1/research-run/' + runId, { headers: { 'X-API-Key': KEY } });
    if (!r.ok) continue;
    const j = await r.json();
    const st = (j.status || '').toLowerCase();
    if (['completed', 'complete', 'succeeded'].includes(st)) return j;
    if (['failed', 'error'].includes(st)) throw new Error('research run failed');
    process.stderr.write('.');
  }
  throw new Error('timed out');
}

async function tfFetch(urls) {
  const r = await fetch('https://api.fetch.tinyfish.ai', {
    method: 'POST',
    headers: { 'X-API-Key': KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ urls, format: 'markdown' })
  });
  if (!r.ok) return [];
  const j = await r.json();
  return j.results || [];
}

async function tfSearch(query, n = 5) {
  const r = await fetch('https://api.search.tinyfish.ai?query=' + encodeURIComponent(query) + '&num_results=' + n, {
    headers: { 'X-API-Key': KEY }
  });
  if (!r.ok) return [];
  const j = await r.json();
  return j.results || j.organic || [];
}

function extractJson(memo) {
  const m = String(memo).match(/\{[\s\S]*"chain"[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

const runId = await launchResearch();
console.error('research run: ' + runId);
const run = await poll(runId);
const memo = (run.deep_result && (run.deep_result.result || run.deep_result)) || run.result || '';
const parsed = (typeof memo === 'string' ? extractJson(memo) : memo) || { verdict: 'no traceable source', note: 'could not parse research output', chain: [] };

const urls = (parsed.chain || []).map((s) => s.url).filter(Boolean).slice(0, 3);
const fetched = urls.length ? await tfFetch(urls) : [];
const liveMap = Object.fromEntries(fetched.map((f) => [f.url || f.source_url, (f.text || '').length > 200]));
let extra = [];
if (!(parsed.chain || []).some((s) => s.is_primary)) {
  extra = await tfSearch('"' + claim.slice(0, 80) + '" original study source', 5);
}

let md = `# source hunter demo\n\nclaim: "${claim}"\nseen on: ${pageUrl || 'n/a'}\nresearch run: ${runId}\n\n`;
md += `## verdict: ${parsed.verdict}\n\n${parsed.note || ''}\n\n## chain\n\n`;
(parsed.chain || []).forEach((s, i) => {
  const live = s.url && s.url in liveMap ? (liveMap[s.url] ? ' (fetch-confirmed live)' : ' (fetch FAILED - flagged)') : '';
  md += `${i + 1}. [${s.title || s.url}](${s.url}) - ${s.date || 'date unknown'}${s.is_primary ? ' - PRIMARY SOURCE' : ''}${live}\n`;
  if (s.exact_wording) md += `   > "${s.exact_wording}"\n`;
  if (s.change) md += `   - changed here: ${s.change}\n`;
});
if (!parsed.chain || !parsed.chain.length) md += '(no chain found)\n';
if (parsed.searched_but_not_found && parsed.searched_but_not_found.length) {
  md += `\n## searched but not found\n\n` + parsed.searched_but_not_found.map((x) => `- ${x}`).join('\n') + '\n';
}
if (extra.length) {
  md += `\n## extra search pass (no primary in chain)\n\n` + extra.map((x) => `- [${x.title || x.url}](${x.url || x.link})`).join('\n') + '\n';
}
md += `\nbuilt with TinyFish endpoints: research (deep run), fetch (live-check), search (citer backfill)\n`;
writeFileSync(outPath, md);
writeFileSync(outPath.replace(/\.md$/, '.json'), JSON.stringify({ runId, parsed }, null, 2));
console.log('wrote ' + outPath);

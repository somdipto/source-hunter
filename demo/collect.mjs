#!/usr/bin/env node
// check a run once; if complete, write demos/<tag>.md. usage: node demo/collect.mjs tag
import { readFileSync, writeFileSync } from 'node:fs';
const KEY = process.env.TINYFISH_API_KEY;
const tag = process.argv[2];
const meta = JSON.parse(readFileSync(`runs/${tag}.meta.json`, 'utf8'));
const r = await fetch('https://agent.tinyfish.ai/v1/research-run/' + meta.runId, { headers: { 'X-API-Key': KEY } });
if (!r.ok) { console.log('poll http ' + r.status); process.exit(2); }
const run = await r.json();
const st = (run.status || '').toLowerCase();
if (!['completed', 'complete', 'succeeded'].includes(st)) { console.log('status: ' + st); process.exit(st === 'failed' || st === 'error' ? 1 : 2); }

async function tfFetch(urls) {
  const r2 = await fetch('https://api.fetch.tinyfish.ai', {
    method: 'POST', headers: { 'X-API-Key': KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ urls, format: 'markdown' })
  });
  if (!r2.ok) return [];
  const j = await r2.json();
  return j.results || [];
}
async function tfSearch(query, n = 5) {
  const r2 = await fetch('https://api.search.tinyfish.ai?query=' + encodeURIComponent(query) + '&num_results=' + n, { headers: { 'X-API-Key': KEY } });
  if (!r2.ok) return [];
  const j = await r2.json();
  return j.results || j.organic || [];
}
function extractJson(memo) {
  const m = String(memo).match(/\{[\s\S]*"chain"[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}
const memo = (run.deep_result && (run.deep_result.result || run.deep_result)) || run.result || '';
const parsed = (typeof memo === 'string' ? extractJson(memo) : memo) || { verdict: 'no traceable source', note: 'could not parse research output', chain: [] };
const urls = (parsed.chain || []).map((s) => s.url).filter(Boolean).slice(0, 3);
const fetched = urls.length ? await tfFetch(urls) : [];
const liveMap = Object.fromEntries(fetched.map((f) => [f.url || f.source_url, (f.text || '').length > 200]));
let extra = [];
if (!(parsed.chain || []).some((s) => s.is_primary)) {
  extra = await tfSearch('"' + meta.claim.slice(0, 80) + '" original study source', 5);
}
let md = `# source hunter demo\n\nclaim: "${meta.claim}"\nseen on: ${meta.pageUrl || 'n/a'}\nresearch run: ${meta.runId}\n\n`;
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
writeFileSync(`demos/${tag}.md`, md);
writeFileSync(`runs/${tag}.json`, JSON.stringify({ runId: meta.runId, parsed }, null, 2));
console.log('wrote demos/' + tag + '.md');

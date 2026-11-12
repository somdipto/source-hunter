#!/usr/bin/env node
// launch a trace research run, print run id. usage: node demo/launch.mjs "claim" "pageUrl" tag
import { writeFileSync, mkdirSync } from 'node:fs';
const KEY = process.env.TINYFISH_API_KEY;
const [claim, pageUrl, tag] = process.argv.slice(2);
if (!KEY || !claim || !tag) { console.error('usage: TINYFISH_API_KEY=.. node demo/launch.mjs "claim" "pageUrl" tag'); process.exit(1); }
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
if (!r.ok) { console.error('launch failed: ' + r.status + ' ' + (await r.text()).slice(0, 200)); process.exit(1); }
const j = await r.json();
const runId = j.research_run_id || j.run_id || j.id;
mkdirSync('runs', { recursive: true });
writeFileSync(`runs/${tag}.meta.json`, JSON.stringify({ runId, claim, pageUrl, tag }));
console.log(runId);

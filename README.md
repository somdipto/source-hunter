# source hunter

A statistic gets repeated across a hundred articles and nobody checks where it came from. Highlight a number, claim or quote on any page, click once, and this extension traces it back to the original source - the study, report, filing or interview - showing every step and flagging where the claim changed along the way.

## how it works

1. Highlight text on any page -> a "trace this" bubble appears (content script).
2. Click it -> the background worker launches a TinyResearch deep run asking for the citation chain back to the earliest primary source, as strict JSON: each step with URL, date and the exact wording on that page.
3. Fetch API live-checks the head of the chain so dead or invented links are flagged, not shown as fact.
4. Search API backfills when no primary source surfaced - the honest answer "no traceable source" is a valid verdict.
5. A side panel shows the chain with per-step verdicts: matches original, changed along the way, misquoted, or no traceable source.

## TinyFish endpoints used (3)

- **Research (TinyResearch deep run)** - the tracer: follows citations across live pages and returns the chain with exact wording per step.
- **Fetch** - confirms the chain's key pages are live and carry the quoted wording.
- **Search** - finds citing pages when the chain has no primary source.

## install (chrome)

1. open chrome://extensions, enable developer mode
2. "load unpacked" -> pick the `extension/` folder
3. set the TinyFish API key: in the console of any page, `chrome.runtime.sendMessage({type:'sh-set-key', key:'YOUR_KEY'})` (from https://agent.tinyfish.ai/api-keys)
4. highlight any statistic or quote on a page and click "trace this"

## demos

Five real claims traced end to end, including two that turn out wrong or unverifiable - see [demos/](demos/).

Built for the TinyBounties Source Hunter bounty by [@somdipto](https://github.com/somdipto).

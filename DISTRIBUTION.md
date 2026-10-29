# Distribution Package — Ready-to-Use Content

## 1. Social Media Posts

### Twitter/X
```
I built uiq — an accessibility linter that runs on source code. No browser, no rendering, no false positives.

Your AI agent writes the UI. uiq checks 23 rules (hover, focus, ARIA, reduced-motion, touch targets, contrast, etc.) in < 2 seconds.

Before: 27/100. After: 94/100. One agent session.

npm install -g @sujayganorkar/uiq
uiq ./src

https://github.com/sujayganorkar/tailordesign
```

### Reddit (r/webdev, r/reactjs, r/accessibility)
```
Title: I built a UI quality linter that runs on source code — no browser needed

Body:
Most accessibility tools (axe, Lighthouse, pa11y) require a browser to render the page. That's slow, flaky, and doesn't work in CI without headless Chrome.

I built uiq — a deterministic quality gate that runs on source code. It checks 23 rules across 5 categories:

- Motion: no layout animations, duration ranges, reduced-motion handling
- Interaction: hover, focus-visible, loading/empty/error states
- Accessibility: keyboard nav, focus management, ARIA, touch targets, contrast
- Performance: compositor-only animations, no layout thrashing
- Consistency: motion tokens, single motion language, no generic blue CTAs

It also has a decision engine that tells you what interactions each component should have (hover lift on cards, focus trap on modals, stagger on lists, etc.).

And a full workflow that cross-references decisions vs. implementation (compliance score).

Works with React, Vue, Svelte, Flutter. Agent-friendly via MCP and skills.

npm install -g @sujayganorkar/uiq
uiq ./src

GitHub: https://github.com/sujayganorkar/tailordesign
npm: https://www.npmjs.com/package/@sujayganorkar/uiq
```

### Hacker News (Show HN)
```
Title: Show HN: uiq – Accessibility linter that runs on source code, no browser needed

Body:
uiq is a deterministic quality gate for UI code. 23 rules across motion, interaction states, accessibility, performance, and consistency.

Unlike axe/Lighthouse/pa11y (which require rendering), uiq works on source code. It runs in < 2 seconds, needs no browser, no LLM, no network.

Key features:
- 23 rules with real source citations (W3C, Material Design, NN/g, Apple HIG)
- Decision engine: recommends what interactions each component should have
- Full workflow: decisions + quality + compliance in one pass
- Process control: setpoint tracking, alarms, control points
- Human feedback: 10 structured categories
- Escalation: issues needing human judgment
- State persistence: regression detection
- Auto-fix: CSS reduced-motion + motion tokens
- Scaffold: new projects with quality built in
- MCP server: 6 tools for agent integration
- Explain: plain-English rule docs with sources
- Dashboard: local web UI for visual review

Works with React, Vue, Svelte, Flutter, HTML, CSS.

npm install -g @sujayganorkar/uiq
```

## 2. Skills directory submissions

### skillsdirectory.com
- URL: https://skillsdirectory.com/submit
- Name: uiq
- Description: Quality gate for UI code. 23 objective rules across motion, interaction states, accessibility, performance, and consistency. Plus interaction decision engine.
- GitHub: https://github.com/sujayganorkar/tailordesign
- Skill file: SKILL.md (in repo root)

### agenticskills.io
- URL: https://agenticskills.io/submit
- Same content as above

### skillvault.md
- URL: https://skillvault.md/submit
- Same content as above

## 3. MCP registry submissions

### mcpmarket.com
- URL: https://mcpmarket.com/submit
- Name: uiq
- Description: UI quality gate MCP server. 6 tools: scan, decide, full, scaffold, feedback, escalate.
- GitHub: https://github.com/sujayganorkar/tailordesign
- Server file: src/mcp/server.js
- Transport: stdio

### glama.ai/mcp
- URL: https://glama.ai/mcp/servers/submit
- Same content as above

### smithery.ai
- URL: https://smithery.ai/submit
- Same content as above

### mcp.so
- URL: https://mcp.so/submit
- Same content as above

## 4. Awesome-list PRs

### Already submitted:
- punkpeye/awesome-mcp-servers → PR #17986 (Accessibility section)

### Need to submit manually:
- hesreallyhim/awesome-claude-code → PR URL: https://github.com/hesreallyhim/awesome-claude-code/compare/main...sujayganorkar:add-uiq?expand=1
- spencerpauly/awesome-cursor-skills → Need to check format
- PatrickJS/awesome-cursorrules → Need to check format

## 5. GitHub App setup guide

### Steps:
1. Go to https://github.com/settings/developers
2. Click "New GitHub App"
3. Fill in:
   - Name: uiq
   - Description: UI quality gate for pull requests
   - Homepage URL: https://github.com/sujayganorkar/tailordesign
   - Callback URL: https://your-domain.com/callback (or leave blank for now)
   - Webhook URL: https://your-domain.com/webhook (or leave blank)
4. Permissions:
   - Repository contents: Read
   - Pull requests: Read & Write (to comment)
   - Checks: Read & Write (to set check status)
5. Subscribe to events: pull_request, push
6. Create the app
7. Note the App ID and generate a private key
8. Install on your repositories

### What the GitHub App would do:
- On PR: run uiq on changed files
- Comment on PR with issues found
- Set check status (pass/fail)
- Block merge if score < threshold (optional)

## 6. Discord community setup guide

### Channel structure:
- #announcements — releases, updates
- #general — general discussion
- #help — get help with uiq
- #rules — rule requests and discussions
- #showcase — show your uiq results
- #contributors — for contributors

### Bot setup:
- Use a simple bot (MEE6 or Carl-bot) for moderation
- Pin the README and quick start
- Add a welcome message with install command

### Launch message:
"Welcome to the uiq community! uiq is a quality gate for UI code — 23 rules across motion, interaction states, accessibility, performance, and consistency. Run `npx @sujayganorkar/uiq ./src` to get started. Questions? Ask in #help."
EOF
echo "Written"
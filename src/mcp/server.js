// src/mcp/server.js — MCP server for uiq
// Allows agents (Claude Code, Cursor, Codex) to call uiq as a tool
//
// Usage: node src/mcp/server.js
// Or configure in .mcp.json:
// { "mcpServers": { "uiq": { "command": "node", "args": ["src/mcp/server.js"] } } }

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

// Tool definitions
const TOOLS = [
  {
    name: 'uiq_scan',
    description: 'Scan UI code for quality issues. Returns issues with file, line, severity, and fix suggestions. Use after writing or modifying UI code.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to scan (file or directory)' },
        rules: { type: 'string', description: 'Comma-separated rule IDs to run (optional)' },
        minScore: { type: 'number', description: 'Minimum score to pass (default: 80)' },
      },
      required: ['path'],
    },
  },
  {
    name: 'uiq_decide',
    description: 'Analyze UI components and recommend what interactions/states/motion each should have. Use before building new components.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to scan (file or directory)' },
        human: { type: 'boolean', description: 'Return human-readable output (default: false)' },
      },
      required: ['path'],
    },
  },
  {
    name: 'uiq_full',
    description: 'Full workflow: decisions + quality + compliance. Cross-references what components should have vs. what they actually have.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to scan (file or directory)' },
        minScore: { type: 'number', description: 'Minimum score to pass (default: 80)' },
      },
      required: ['path'],
    },
  },
  {
    name: 'uiq_scaffold',
    description: 'Scaffold a new project with UI quality gates, design tokens, and component templates.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Project directory to scaffold' },
      },
      required: ['path'],
    },
  },
  {
    name: 'uiq_feedback',
    description: 'Add human feedback on a UI interaction. Categories: too-slow, too-fast, janky, wrong-easing, unnecessary, missing, too-much, too-little, wrong-trigger, accessibility.',
    inputSchema: {
      type: 'object',
      properties: {
        dir: { type: 'string', description: 'Project directory' },
        file: { type: 'string', description: 'File path' },
        component: { type: 'string', description: 'Component name' },
        category: { type: 'string', description: 'Feedback category' },
        note: { type: 'string', description: 'Additional note' },
      },
      required: ['dir', 'file', 'component', 'category'],
    },
  },
  {
    name: 'uiq_escalate',
    description: 'List pending escalations (issues needing human judgment).',
    inputSchema: {
      type: 'object',
      properties: {
        dir: { type: 'string', description: 'Project directory' },
      },
      required: ['dir'],
    },
  },
];

// Tool handlers
async function handleTool(name, args) {
  switch (name) {
    case 'uiq_scan': {
      const { run } = await import('../index.js');
      const result = await run(args.path, { format: 'json', rules: args.rules, minScore: args.minScore || 80 });
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
    case 'uiq_decide': {
      const { runDecisions } = await import('../decisions/index.js');
      const decisions = await runDecisions(args.path, { format: 'json', human: args.human });
      return {
        content: [{ type: 'text', text: JSON.stringify(decisions, null, 2) }],
      };
    }
    case 'uiq_full': {
      const { runFull } = await import('../workflow/full.js');
      const result = await runFull(args.path, { format: 'json', minScore: args.minScore || 80 });
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
    case 'uiq_scaffold': {
      const { scaffold } = await import('../scaffold/index.js');
      const results = scaffold(args.path);
      return {
        content: [{ type: 'text', text: JSON.stringify({ scaffolded: results }, null, 2) }],
      };
    }
    case 'uiq_feedback': {
      const { addFeedback } = await import('../feedback/review.js');
      const entry = addFeedback(args.dir, {
        file: args.file,
        component: args.component,
        category: args.category,
        note: args.note,
      });
      return {
        content: [{ type: 'text', text: JSON.stringify(entry, null, 2) }],
      };
    }
    case 'uiq_escalate': {
      const { getPending } = await import('../escalation/cards.js');
      const pending = getPending(args.dir);
      return {
        content: [{ type: 'text', text: JSON.stringify(pending, null, 2) }],
      };
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// Server setup
const server = new Server(
  { name: 'uiq', version: '0.1.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    return await handleTool(name, args || {});
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error: ${error.message}` }],
      isError: true,
    };
  }
});

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);

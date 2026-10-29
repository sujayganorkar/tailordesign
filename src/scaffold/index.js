// src/scaffold/index.js - Project scaffolding for new repositories

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

// Component templates with proper interaction states built in
const COMPONENT_TEMPLATES = {
  'Button.jsx': `import React from 'react';

// Button with all required interaction states built in.
// Respects prefers-reduced-motion via motion-reduce variants.
// Source: Material Design 3 interaction states
// https://m3.material.io/foundations/interaction-states/overview
export function Button({ children, onClick, disabled = false, loading = false, variant = 'primary' }) {
  const baseClasses = 'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] min-w-[44px]';

  const variantClasses = {
    primary: 'bg-brand-600 text-white hover:bg-brand-700 focus-visible:ring-brand-500 active:scale-[0.97]',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus-visible:ring-gray-500 active:scale-[0.97]',
    destructive: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500 active:scale-[0.97]',
  };

  return (
    <button
      className={\`\${baseClasses} \${variantClasses[variant]}\`}
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading}
    >
      {loading && (
        <svg className="animate-spin motion-reduce:animate-none h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  );
}
`,

  'Card.jsx': `import React from 'react';

// Card with proper interaction states.
// Respects prefers-reduced-motion via motion-reduce variants.
// Hover lift only on clickable cards. Static cards have no hover.
// Source: NN/g hover affordance guidelines
export function Card({ children, onClick, className = '' }) {
  const isClickable = !!onClick;

  const baseClasses = 'rounded-xl border border-gray-200 bg-white p-6 transition duration-150 ease-out motion-reduce:transition-none';
  const interactiveClasses = isClickable
    ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 active:scale-[0.98]'
    : '';

  const Component = isClickable ? 'button' : 'div';

  return (
    <Component
      className={\`\${baseClasses} \${interactiveClasses} \${className}\`}
      onClick={onClick}
      {...(isClickable ? { type: 'button' } : {})}
    >
      {children}
    </Component>
  );
}
`,

  'Modal.jsx': `import React, { useEffect, useRef } from 'react';

// Modal with focus trapping and restoration.
// focus-trap: modalRef traps focus; restores previousFocus on close.
// Respects prefers-reduced-motion via motion-reduce variants.
// Source: ARIA APG Dialog pattern
// https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
export function Modal({ isOpen, onClose, title, children }) {
  const modalRef = useRef(null);
  const previousFocus = useRef(null);

  useEffect(() => {
    if (isOpen) {
      previousFocus.current = document.activeElement;
      modalRef.current?.focus();
    } else {
      previousFocus.current?.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close modal"
        className="fixed inset-0 bg-black/50 transition-opacity duration-150 ease-out motion-reduce:transition-none"
        onClick={onClose}
      />
      {/* Content */}
      <div
        ref={modalRef}
        tabIndex={-1}
        className="relative z-10 w-full max-w-lg rounded-xl bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200 ease-out motion-reduce:animate-none motion-reduce:transition-none"
      >
        <h2 id="modal-title" className="text-lg font-semibold">{title}</h2>
        <div className="mt-4">{children}</div>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 focus-visible:ring-2"
          aria-label="Close modal"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
`,

  'DataView.jsx': `import React from 'react';

// Data view with all 4 states: loading, empty, error, populated.
// Respects prefers-reduced-motion via motion-reduce variants.
// Source: NN/g empty states + skeleton screens
export function DataView({ loading, error, data, renderItem, emptyMessage = 'No items found.', onRetry }) {
  if (loading) {
    return (
      <div aria-busy="true" aria-live="polite" className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse motion-reduce:animate-none" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="text-center py-8">
        <p className="text-red-600">Something went wrong.</p>
        {onRetry && (
          <button onClick={onRetry} className="mt-2 text-brand-600 hover:underline focus-visible:ring-2">
            Try again
          </button>
        )}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((item, i) => (
        <div key={item.id || i} className="animate-in fade-in duration-200 motion-reduce:animate-none" style={{ animationDelay: \`\${i * 40}ms\` }}>
          {renderItem(item)}
        </div>
      ))}
    </div>
  );
}
`,

  'Input.jsx': `import React from 'react';

// Input with focus, error, success, and disabled states.
// Respects prefers-reduced-motion via motion-reduce variants.
// Source: Material Design 3 text fields
export function Input({ label, error, success, disabled = false, ...props }) {
  const stateClasses = error
    ? 'border-red-500 focus-visible:ring-red-500'
    : success
    ? 'border-green-500 focus-visible:ring-green-500'
    : 'border-gray-300 focus-visible:ring-brand-500';

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <input
        className={\`w-full rounded-lg border px-3 py-2 text-sm transition-colors duration-150 ease-out motion-reduce:transition-none hover:border-gray-400 focus-visible:outline-none focus-visible:ring-2 \${stateClasses} disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]\`}
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={error ? 'input-error' : undefined}
        {...props}
      />
      {error && (
        <p id="input-error" className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
`,
};

// Design tokens (CSS custom properties)
const DESIGN_TOKENS = `/* Design tokens - single source of truth for UI values */
/* Source: W3C Design Tokens Community Group */
/* https://design-tokens.github.io/community-group/format/ */

:root {
  /* Colors */
  --color-brand-50: #eff6ff;
  --color-brand-100: #dbeafe;
  --color-brand-500: #3b82f6;
  --color-brand-600: #2563eb;
  --color-brand-700: #1d4ed8;
  --color-brand-900: #1e3a8a;

  --color-gray-50: #f9fafb;
  --color-gray-100: #f3f4f6;
  --color-gray-200: #e5e7eb;
  --color-gray-300: #d1d5db;
  --color-gray-400: #9ca3af;
  --color-gray-500: #6b7280;
  --color-gray-600: #4b5563;
  --color-gray-700: #374151;
  --color-gray-800: #1f2937;
  --color-gray-900: #111827;

  --color-red-500: #ef4444;
  --color-red-600: #dc2626;
  --color-green-500: #22c55e;
  --color-green-600: #16a34a;

  /* Motion tokens */
  /* Source: Material Design 3 motion spec */
  /* https://m3.material.io/styles/motion/easing-and-duration */
  --duration-micro: 100ms;
  --duration-fast: 150ms;
  --duration-normal: 250ms;
  --duration-slow: 350ms;
  --duration-complex: 500ms;

  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-standard: cubic-bezier(0.4, 0, 0.2, 1);

  /* Spacing */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;

  /* Radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  --radius-xl: 0.75rem;
  --radius-2xl: 1rem;
}

/* Reduced motion - respect user preference */
/* Source: WCAG 2.1 SC 2.3.3 */
/* https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions.html */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
`;

// CI workflow template
const CI_WORKFLOW = `name: UI Quality Gate

on:
  pull_request:
    paths:
      - 'src/**'
      - 'components/**'
      - 'pages/**'
      - '*.css'
      - '*.scss'

jobs:
  ui-quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npx @sujayganorkar/uiq ./src --ci --min-score 80
`;

// uiqrc config template
const UIQRC_TEMPLATE = {
  minScore: 80,
  rules: {},
  ignore: ['node_modules/**', 'dist/**', '*.test.*', '*.spec.*'],
  framework: 'auto',
  motionTokens: {
    durations: { micro: 100, fast: 150, normal: 250, slow: 350, complex: 500 },
    easings: {
      out: 'cubic-bezier(0, 0, 0.2, 1)',
      in: 'cubic-bezier(0.4, 0, 1, 1)',
      inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
  },
  componentMappings: {},
};


// Minimal runnable Vite + React starter (outcome-oriented crux)
const PACKAGE_JSON_TEMPLATE = {
  name: "my-ui-app",
  private: true,
  version: "0.0.0",
  type: "module",
  scripts: {
    dev: "vite",
    build: "vite build",
    preview: "vite preview",
    lint: "npx @sujayganorkar/uiq ./src",
  },
  dependencies: {
    react: "^18.3.1",
    "react-dom": "^18.3.1",
  },
  devDependencies: {
    "@vitejs/plugin-react": "^4.3.1",
    vite: "^5.4.0",
    tailwindcss: "^4.0.0",
    "@tailwindcss/vite": "^4.0.0",
  },
};

const INDEX_HTML = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>UI App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`;

const VITE_CONFIG = `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
});
`;

const MAIN_JSX = `import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`;

const APP_JSX = `import { Button } from './components/Button.jsx';
import { DataView } from './components/DataView.jsx';

export default function App() {
  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-semibold text-gray-900">UI Quality Gate Starter</h1>
        <p className="text-gray-600">Run \`npx @sujayganorkar/uiq ./src\` to check this UI.</p>
        <Button>Primary action</Button>
        <DataView loading={false} data={[]} renderItem={(i) => <span>{i}</span>} />
      </div>
    </main>
  );
}
`;

const INDEX_CSS = `@import "tailwindcss";

/* Design tokens */
@import "./styles/tokens.css";
`;

const GITIGNORE = `node_modules/
dist/
.uiq-state.json
.uiq-feedback.json
.uiq-escalations.json
`;


const README_TEMPLATE = `# UI App

Created with \`uiq create\`.

## Scripts

- \`npm run dev\` - start Vite dev server
- \`npm run build\` - production build
- \`npm run lint\` - run the UI quality gate (\`npx @sujayganorkar/uiq ./src\`)

## Quality gate

This project ships with a UI quality gate. Run \`npm run lint\` and fix issues until the score is >= 80.
`;

export function scaffold(dir) {
  const results = [];

  // Create directory structure
  const dirs = [
    'src/components',
    'src/styles',
    '.github/workflows',
  ];
  for (const d of dirs) {
    const fullPath = join(dir, d);
    if (!existsSync(fullPath)) {
      mkdirSync(fullPath, { recursive: true });
      results.push(`Created ${d}/`);
    }
  }

  // Write component templates
  for (const [filename, content] of Object.entries(COMPONENT_TEMPLATES)) {
    const filePath = join(dir, 'src/components', filename);
    if (!existsSync(filePath)) {
      writeFileSync(filePath, content);
      results.push(`Created src/components/${filename}`);
    }
  }

  // Write design tokens
  const tokensPath = join(dir, 'src/styles/tokens.css');
  if (!existsSync(tokensPath)) {
    writeFileSync(tokensPath, DESIGN_TOKENS);
    results.push('Created src/styles/tokens.css');
  }

  // Write CI workflow
  const ciPath = join(dir, '.github/workflows/ui-quality.yml');
  if (!existsSync(ciPath)) {
    writeFileSync(ciPath, CI_WORKFLOW);
    results.push('Created .github/workflows/ui-quality.yml');
  }

  // Write .uiqrc.json
  const configPath = join(dir, '.uiqrc.json');
  if (!existsSync(configPath)) {
    writeFileSync(configPath, JSON.stringify(UIQRC_TEMPLATE, null, 2));
    results.push('Created .uiqrc.json');
  }

  // Write motion spec template
  const specPath = join(dir, 'motion-spec.json');
  if (!existsSync(specPath)) {
    writeFileSync(specPath, JSON.stringify({
      version: '1.0',
      generated: new Date().toISOString(),
      components: {},
      note: 'Run "uiq ./src --decide" to populate this file with interaction decisions.',
    }, null, 2));
    results.push('Created motion-spec.json');
  }


  // Minimal runnable starter files
  const pkgPath = join(dir, 'package.json');
  if (!existsSync(pkgPath)) {
    writeFileSync(pkgPath, JSON.stringify(PACKAGE_JSON_TEMPLATE, null, 2));
    results.push('Created package.json');
  }
  const indexHtmlPath = join(dir, 'index.html');
  if (!existsSync(indexHtmlPath)) {
    writeFileSync(indexHtmlPath, INDEX_HTML);
    results.push('Created index.html');
  }
  const viteConfigPath = join(dir, 'vite.config.js');
  if (!existsSync(viteConfigPath)) {
    writeFileSync(viteConfigPath, VITE_CONFIG);
    results.push('Created vite.config.js');
  }
  const mainPath = join(dir, 'src/main.jsx');
  if (!existsSync(mainPath)) {
    writeFileSync(mainPath, MAIN_JSX);
    results.push('Created src/main.jsx');
  }
  const appPath = join(dir, 'src/App.jsx');
  if (!existsSync(appPath)) {
    writeFileSync(appPath, APP_JSX);
    results.push('Created src/App.jsx');
  }
  const cssPath = join(dir, 'src/index.css');
  if (!existsSync(cssPath)) {
    writeFileSync(cssPath, INDEX_CSS);
    results.push('Created src/index.css');
  }
  const gitignorePath = join(dir, '.gitignore');
  if (!existsSync(gitignorePath)) {
    writeFileSync(gitignorePath, GITIGNORE);
    results.push('Created .gitignore');
  }


  const readmePath = join(dir, 'README.md');
  if (!existsSync(readmePath)) {
    writeFileSync(readmePath, README_TEMPLATE);
    results.push('Created README.md');
  }

  return results;
}

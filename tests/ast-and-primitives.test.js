import { test } from 'node:test';
import assert from 'node:assert';
import { parseJSX } from '../src/parsers/jsx.js';
import { runRules } from '../src/rules/index.js';
import { isPrimitive, isKnownLibrary, buildPrimitiveSet, configurePrimitives } from '../src/primitives/registry.js';
import { setExperimental, isExperimental } from '../src/experimental.js';

test('AST per-element: one styled button and one unstyled button must fail', () => {
  const code = `
    import React from 'react';
    export default function Component() {
      return (
        <div>
          <button className="hover:bg-blue-600 focus-visible:ring-2">Button 1</button>
          <button className="bg-gray-200">Button 2</button>
        </div>
      );
    }
  `;
  const parsed = parseJSX(code, 'Component.jsx');
  assert.strictEqual(parsed.interactiveElements.length, 2);
  assert.strictEqual(parsed.interactiveElements[0].hasHover, true);
  assert.strictEqual(parsed.interactiveElements[1].hasHover, false);
  assert.strictEqual(parsed.hasHover, false, 'hasHover must be false if any interactive element lacks hover');
  
  const issues = runRules(parsed, [parsed]);
  const hoverIssues = issues.filter(i => i.rule === 'interaction/hover-state');
  assert.strictEqual(hoverIssues.length, 1, 'Should report hover-state issue when at least one button lacks hover');
});

test('AST per-element: all buttons styled passes hover and focus', () => {
  const code = `
    import React from 'react';
    export default function Component() {
      return (
        <div>
          <button className="hover:bg-blue-600 focus-visible:ring-2">Button 1</button>
          <button className="hover:bg-red-600 focus-visible:ring-2">Button 2</button>
        </div>
      );
    }
  `;
  const parsed = parseJSX(code, 'Component.jsx');
  assert.strictEqual(parsed.interactiveElements.length, 2);
  assert.strictEqual(parsed.hasHover, true);
  assert.strictEqual(parsed.hasFocusVisible, true);

  const issues = runRules(parsed, [parsed]);
  const hoverIssues = issues.filter(i => i.rule === 'interaction/hover-state');
  const focusIssues = issues.filter(i => i.rule === 'interaction/focus-visible');
  assert.strictEqual(hoverIssues.length, 0);
  assert.strictEqual(focusIssues.length, 0);
});

test('Primitives Registry: Radix and Headless UI primitives recognized', () => {
  assert.strictEqual(isKnownLibrary('@radix-ui/react-dialog'), true);
  assert.strictEqual(isKnownLibrary('@headlessui/react'), true);
  assert.strictEqual(isKnownLibrary('react-aria-components'), true);
  assert.strictEqual(isKnownLibrary('./utils/helper'), false);

  const primSet = buildPrimitiveSet();
  assert.strictEqual(isPrimitive('Dialog', '@radix-ui/react-dialog', primSet), true);
  assert.strictEqual(isPrimitive('Dialog.Root', '@radix-ui/react-dialog', primSet), true);
  assert.strictEqual(isPrimitive('UnknownWidget', '@radix-ui/react-dialog', primSet), false);
  assert.strictEqual(isPrimitive('Dialog', './components/MyDialog', primSet), false);
});

test('Primitives: Radix Dialog does not trigger a11y/focus-management false positive', () => {
  const code = `
    import React from 'react';
    import { Dialog, DialogContent, DialogTrigger } from '@radix-ui/react-dialog';

    export default function ModalWrapper() {
      return (
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>Modal Body</DialogContent>
        </Dialog>
      );
    }
  `;
  const parsed = parseJSX(code, 'ModalWrapper.jsx');
  assert.strictEqual(parsed.hasPrimitiveModal, true);

  const issues = runRules(parsed, [parsed]);
  const focusMgmt = issues.filter(i => i.rule === 'a11y/focus-management');
  assert.strictEqual(focusMgmt.length, 0, 'Radix Dialog should not require manual focus-trap');
});

test('Two-pass capability graph: non-interactive utility import does NOT suppress hover error', () => {
  const utilFile = {
    filePath: 'src/utils/formatDate.js',
    interactiveElements: [],
    imports: [],
  };

  const pageCode = `
    import React from 'react';
    import { formatDate } from './utils/formatDate';

    export default function Page() {
      return (
        <div>
          <span>{formatDate(new Date())}</span>
          <button className="bg-blue-500">Unstyled Button</button>
        </div>
      );
    }
  `;
  const pageParsed = parseJSX(pageCode, 'src/Page.jsx');
  const projectFiles = [utilFile, pageParsed];

  const issues = runRules(pageParsed, projectFiles);
  const hoverIssues = issues.filter(i => i.rule === 'interaction/hover-state');
  assert.strictEqual(hoverIssues.length, 1, 'Should NOT suppress hover error when importing non-interactive utility');
});

test('Two-pass capability graph: importing interactive component DOES suppress consumer hover check', () => {
  const customButtonFile = {
    filePath: 'src/components/CustomButton.jsx',
    interactiveElements: [{ type: 'button', hasHover: true, hasFocusVisible: true }],
    imports: [],
  };

  const pageCode = `
    import React from 'react';
    import { CustomButton } from './components/CustomButton';

    export default function Page() {
      return (
        <div>
          <CustomButton label="Click Me" />
        </div>
      );
    }
  `;
  const pageParsed = parseJSX(pageCode, 'src/Page.jsx');
  const projectFiles = [customButtonFile, pageParsed];

  const issues = runRules(pageParsed, projectFiles);
  const hoverIssues = issues.filter(i => i.rule === 'interaction/hover-state');
  assert.strictEqual(hoverIssues.length, 0, 'Should suppress hover error when consumer delegates to interactive component');
});

test('Scope-aware layout thrash: split across separate functions does NOT flag', () => {
  const code = `
    import React, { useEffect } from 'react';

    export default function Component() {
      useEffect(() => {
        const height = window.document.body.offsetHeight;
        console.log(height);
      }, []);

      const updateStyle = () => {
        document.body.classList.add('ready');
      };

      return <div onClick={updateStyle}>Test</div>;
    }
  `;
  const parsed = parseJSX(code, 'Component.jsx');
  assert.strictEqual(parsed.layoutThrash, false, 'Separate function scopes should not trigger layout thrashing');

  const issues = runRules(parsed, [parsed]);
  const thrashIssues = issues.filter(i => i.rule === 'perf/layout-thrash');
  assert.strictEqual(thrashIssues.length, 0);
});

test('Scope-aware layout thrash: read and write in SAME function DOES flag', () => {
  const code = `
    import React from 'react';

    export default function Component() {
      const handleClick = (e) => {
        const height = e.target.offsetHeight;
        e.target.style.height = height + 10 + 'px';
      };

      return <button onClick={handleClick}>Grow</button>;
    }
  `;
  const parsed = parseJSX(code, 'Component.jsx');
  assert.strictEqual(parsed.layoutThrash, true, 'Read and write in same function must trigger layout thrashing');

  const issues = runRules(parsed, [parsed]);
  const thrashIssues = issues.filter(i => i.rule === 'perf/layout-thrash');
  assert.strictEqual(thrashIssues.length, 1);
});

test('Experimental contrast flag: disabled by default, enabled when experimental flag set', () => {
  const code = `
    import React from 'react';
    export default function LowContrast() {
      return <div className="text-gray-400 bg-gray-500">Hard to read</div>;
    }
  `;
  const parsed = parseJSX(code, 'LowContrast.jsx');

  // Default: experimental is off
  setExperimental(false);
  assert.strictEqual(isExperimental(), false);
  let issues = runRules(parsed, [parsed]);
  let contrastIssues = issues.filter(i => i.rule === 'a11y/contrast');
  assert.strictEqual(contrastIssues.length, 0, 'Contrast rule should not run by default');

  // Enable experimental
  setExperimental(true);
  assert.strictEqual(isExperimental(), true);
  issues = runRules(parsed, [parsed]);
  contrastIssues = issues.filter(i => i.rule === 'a11y/contrast');
  assert.strictEqual(contrastIssues.length, 1, 'Contrast rule should run when experimental is enabled');

  // Cleanup
  setExperimental(false);
});

test('Corpus hardening: transition-colors alone does not trigger motion/reduced-motion', () => {
  const code = `
    import React from 'react';
    export default function ShadcnButton() {
      return (
        <button className="inline-flex items-center rounded bg-blue-500 transition-colors hover:bg-blue-600 focus-visible:ring-2">
          Click me
        </button>
      );
    }
  `;
  const parsed = parseJSX(code, 'ShadcnButton.jsx');
  assert.strictEqual(parsed.animations.length, 0, 'transition-colors should not be treated as motion animation');

  const issues = runRules(parsed, [parsed]);
  const motionIssues = issues.filter(i => i.rule === 'motion/reduced-motion');
  assert.strictEqual(motionIssues.length, 0, 'No reduced-motion error for color transitions');
});

test('Corpus hardening: text inputs require focus-visible but not hover-state', () => {
  const code = `
    import React from 'react';
    export default function Form() {
      return (
        <form>
          <input type="text" className="border px-3 py-2 focus-visible:ring-2" />
          <button type="submit" className="bg-blue-500 hover:bg-blue-600 focus-visible:ring-2">Submit</button>
        </form>
      );
    }
  `;
  const parsed = parseJSX(code, 'Form.jsx');
  assert.strictEqual(parsed.hasHover, true, 'Form with hover on button and focus on input should pass hasHover');

  const issues = runRules(parsed, [parsed]);
  const hoverIssues = issues.filter(i => i.rule === 'interaction/hover-state');
  assert.strictEqual(hoverIssues.length, 0, 'Inputs without hover should not trigger hover-state error');
});

test('Classifier: custom component naming conventions and MDX wrappers', async () => {
  const { classifyComponents } = await import('../src/decisions/classifier.js');
  const code = `
    import React from 'react';
    export default function DocsPage() {
      return (
        <MDXProvider>
          <HeroSection>
            <ProductCard onClick={() => {}} />
            <SubmitButton onClick={() => {}} />
            <SearchInput />
          </HeroSection>
        </MDXProvider>
      );
    }
  `;
  const result = classifyComponents(code, 'DocsPage.jsx');
  const types = result.components.map(c => c.type);
  assert.ok(types.includes('card-clickable'), 'ProductCard with onClick should be classified as card-clickable');
  assert.ok(types.includes('button'), 'SubmitButton should be classified as button');
  assert.ok(types.includes('input'), 'SearchInput should be classified as input');
  assert.ok(!types.includes('unknown-interactive'), 'Should not leave custom components as unknown-interactive');
});

test('Flutter Platform Awareness: mobile target mutes hover/focus on touch widgets', async () => {
  const { parseDart } = await import('../src/parsers/dart.js');
  const { setPlatform } = await import('../src/platform.js');

  const dartCode = `
    import 'package:flutter/material.dart';

    class TouchScreen extends StatelessWidget {
      @override
      Widget build(BuildContext context) {
        return GestureDetector(
          onTap: () => print('tapped'),
          child: Text('Tap Me'),
        );
      }
    }
  `;
  const parsed = parseDart(dartCode, 'touch_screen.dart');

  // Mobile platform target
  setPlatform('mobile');
  let issues = runRules(parsed, [parsed]);
  let hoverIssues = issues.filter(i => i.rule === 'interaction/hover-state');
  let focusIssues = issues.filter(i => i.rule === 'interaction/focus-visible');
  assert.strictEqual(hoverIssues.length, 0, 'Mobile platform should not expect mouse hover on GestureDetector');
  assert.strictEqual(focusIssues.length, 0, 'Mobile platform should not expect focus ring on GestureDetector');

  // Web platform target
  setPlatform('web');
  issues = runRules(parsed, [parsed]);
  hoverIssues = issues.filter(i => i.rule === 'interaction/hover-state');
  focusIssues = issues.filter(i => i.rule === 'interaction/focus-visible');
  assert.strictEqual(hoverIssues.length, 1, 'Web target SHOULD expect hover handling on GestureDetector');
  assert.strictEqual(focusIssues.length, 1, 'Web target SHOULD expect focus handling on GestureDetector');

  // Reset
  setPlatform('auto');
});

// src/parsers/jsx.js - Parse JSX/TSX files for UI patterns (AST-based)

import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import { getPrimitiveSet, isPrimitive } from '../primitives/registry.js';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

function baseResult(content, filePath) {
  return {
    filePath,
    type: 'jsx',
    interactiveElements: [],
    hasHover: false,
    hasFocusVisible: false,
    hasReducedMotion: false,
    hasLoadingState: false,
    hasEmptyState: false,
    hasErrorState: false,
    hasFocusManagement: false,
    hasAriaLive: false,
    animations: [],
    durations: [],
    easings: [],
    motionTokens: false,
    hasOnClickDiv: false,
    hasModal: false,
    hasPrimitiveModal: false,
    hasForm: false,
    hasNav: false,
    hasActiveRoute: false,
    layoutAnimations: [],
    layoutThrash: false,
    genericCTA: false,
    cardGridHero: false,
    imports: [],
    _content: content,
  };
}

function getTagName(name) {
  if (!name) return null;
  if (name.type === 'JSXIdentifier') return name.name;
  if (name.type === 'JSXMemberExpression') {
    return `${getTagName(name.object)}.${getTagName(name.property)}`;
  }
  return null;
}

function getAttributeValue(value) {
  if (!value) return true;
  if (value.type === 'StringLiteral') return value.value;
  if (value.type === 'JSXExpressionContainer') {
    const expr = value.expression;
    if (expr.type === 'StringLiteral') return expr.value;
    if (expr.type === 'TemplateLiteral') return expr.quasis.map(q => q.value.cooked || '').join('');
    return '[expression]';
  }
  return null;
}

function getClassNameString(attr) {
  if (!attr || !attr.value) return '';
  const v = attr.value;
  if (v.type === 'StringLiteral') return v.value;
  if (v.type === 'JSXExpressionContainer') {
    const expr = v.expression;
    if (expr.type === 'StringLiteral') return expr.value;
    if (expr.type === 'TemplateLiteral') return expr.quasis.map(q => q.value.cooked || '').join(' ');
    return null; // expression (identifier/call) -> unknown
  }
  return '';
}

function hasHoverProp(attrs) {
  return attrs.some(a => a.name?.name === 'onMouseEnter' || a.name?.name === 'onMouseOver');
}
function hasFocusProp(attrs) {
  return attrs.some(a => a.name?.name === 'onFocus');
}

function readCssModule(source, filePath) {
  try {
    const full = resolve(dirname(filePath), source);
    return readFileSync(full, 'utf-8');
  } catch (e) {
    return null;
  }
}

function extractCssRule(css, className) {
  // Find a rule block for .className { ... } (best-effort, one level)
  const re = new RegExp('\\.' + className + '\\s*\\{([^}]*)\\}', 'i');
  const m = css.match(re);
  return m ? m[1] : '';
}

export function parseJSX(content, filePath) {
  content = content == null ? '' : String(content);
  const result = baseResult(content, filePath);

  // Content-level (regex) fields retained for CSS-in-JS / styled / heuristic rules
  if (/prefers-reduced-motion|useReducedMotion|reducedMotion/i.test(content)) result.hasReducedMotion = true;
  if (/isLoading|isPending|isFetching|<Skeleton|<Spinner|Skeleton|Spinner|CircularProgress|LinearProgress|skeleton/i.test(content)) result.hasLoadingState = true;
  if (/isEmpty|emptyState|EmptyState|noData|noResults|NoData|nothing to show|no .* found/i.test(content)) result.hasEmptyState = true;
  if (/isError|hasError|errorState|ErrorState|errorBoundary|ErrorBoundary|onError|role=["']alert["']|aria-live/i.test(content)) result.hasErrorState = true;
  if (/focus-trap|FocusTrap|trapFocus|useFocusTrap|focusTrap|autoFocus|initialFocus/i.test(content)) result.hasFocusManagement = true;
  if (/modal|dialog|drawer|Drawer|Modal|Dialog/i.test(content)) result.hasModal = true;
  if (/aria-live|aria-expanded|aria-controls|role="dialog"|role="alert"/i.test(content)) result.hasAriaLive = true;
  if (/<form|onSubmit|handleSubmit/i.test(content)) result.hasForm = true;
  if (/<nav|<Nav|navigation|Navigation/i.test(content)) result.hasNav = true;
  if (/isActive|activeRoute|activePath|useLocation|usePathname|aria-current/i.test(content)) result.hasActiveRoute = true;

  // Motion tokens / generic CTA / card grid (regex)
  if (/--duration|--ease|--motion/.test(content)) result.motionTokens = true;
  for (const pattern of [/bg-blue-500|bg-blue-600|bg-indigo-500|bg-indigo-600/, /background:\s*#3b82f6|#4f46e5|#2563eb/]) {
    if (pattern.test(content)) { result.genericCTA = true; break; }
  }
  if (/hero/i.test(content) && /grid.*card|card.*grid|grid-cols.*card/i.test(content)) result.cardGridHero = true;

  // Animations / durations / easings / layout animations (regex token extraction)
  const tailwindAnimRegex = /(?:animate-|transition-|duration-|ease-|delay-)[a-z0-9-]+/gi;
  result.animations.push(...(content.match(tailwindAnimRegex) || []));
  const framerRegex = /(?:motion\.\w+|animate=|initial=|exit=|whileHover|whileTap|whileInView|variants=)/gi;
  result.animations.push(...(content.match(framerRegex) || []));
  const cssAnimRegex = /(?:transition|animation)\s*[:=]/gi;
  result.animations.push(...(content.match(cssAnimRegex) || []));

  const durationRegex = /duration[-:]?\s*(\d+(?:\.\d+)?)\s*(ms|s)?/gi;
  let durMatch;
  while ((durMatch = durationRegex.exec(content)) !== null) {
    let val = parseFloat(durMatch[1]);
    if (durMatch[2] === 's') val *= 1000;
    result.durations.push(val);
  }
  const twDurRegex = /duration-(\d+)/g;
  let twDurMatch;
  while ((twDurMatch = twDurRegex.exec(content)) !== null) result.durations.push(parseInt(twDurMatch[1]));

  const easingRegex = /ease[-:]?\s*[-a-z]+|cubic-bezier\([^)]+\)/gi;
  result.easings.push(...(content.match(easingRegex) || []));

  const twTransitionAll = content.match(/transition-all/g) || [];
  result.layoutAnimations.push(...twTransitionAll.map(() => 'transition-all (Tailwind)'));
  const styleAnimRegex = /(?:transition|animation)\s*[:=]\s*['"][^'"]*(?:width|height|top|left|right|bottom|margin|padding)[^'"]*['"]/gi;
  result.layoutAnimations.push(...(content.match(styleAnimRegex) || []));
  const framerLayoutRegex = /animate\s*=\s*\{\{\s*[^}]*?(?:width|height)\s*:/gi;
  result.layoutAnimations.push(...(content.match(framerLayoutRegex) || []));

  // File-level hover/focus/CSS signals
  const globalCssHover = /:hover\b/i.test(content);
  const globalCssFocus = /:focus\b|:focus-visible\b/i.test(content);
  const globalTailwindHover = /hover:/i.test(content);
  const globalTailwindFocus = /focus-visible:|focus:/i.test(content);

  const primitiveSet = getPrimitiveSet();
  const importMap = {};
  const cssModuleImports = {}; // localName -> source path

  // AST traversal
  let ast;
  try {
    ast = parse(content, { sourceType: 'module', plugins: ['jsx', 'typescript', 'decorators-legacy'] });
  } catch (e) {
    // Fallback to regex parser for non-parseable files
    return parseJSXRegex(content, filePath);
  }

  traverse(ast, {
    ImportDeclaration(path) {
      if (path.node.source && path.node.source.value) {
        const src = path.node.source.value;
        result.imports.push(src);
        const isCssModule = /\.(css|scss|less|module\.css)$/i.test(src);
        for (const spec of path.node.specifiers || []) {
          const local = spec.local && spec.local.name;
          if (local) {
            importMap[local] = src;
            if (isCssModule) cssModuleImports[local] = src;
          }
        }
      }
    },
    JSXElement(path) {
      const opening = path.node.openingElement;
      const tagName = getTagName(opening.name);
      if (!tagName) return;
      const attrs = opening.attributes.filter(a => a.type === 'JSXAttribute');
      const classNameAttr = attrs.find(a => a.name?.name === 'className' || a.name?.name === 'class');
      const classStr = getClassNameString(classNameAttr);
      const isExpr = classStr === null && !!classNameAttr && !!classNameAttr.value &&
        classNameAttr.value.type === 'JSXExpressionContainer';

      // CSS Module resolution: className={styles.btn}
      let cssModuleHover = null;
      let cssModuleFocus = null;
      if (isExpr) {
        const expr = classNameAttr.value.expression;
        let moduleName = null;
        let propName = null;
        if (expr.type === 'MemberExpression' && expr.object.type === 'Identifier' && expr.property) {
          moduleName = expr.object.name;
          propName = expr.property.name || (expr.property.type === 'Literal' ? expr.property.value : null);
        }
        if (moduleName && cssModuleImports[moduleName] && propName) {
          const css = readCssModule(cssModuleImports[moduleName], filePath);
          if (css !== null) {
            const block = extractCssRule(css, propName);
            // Also check for separate :hover / :focus-visible rules
            cssModuleHover = /:hover/i.test(block) || new RegExp('\\.' + propName + '\\s*:\\s*hover', 'i').test(css);
            cssModuleFocus = /:focus/i.test(block) || new RegExp('\\.' + propName + '\\s*:\\s*focus', 'i').test(css);
          }
        }
      }

      const elHasHover = hasHoverProp(attrs) || (
        cssModuleHover !== null
          ? cssModuleHover
          : (classStr !== null
              ? /hover:|:hover/i.test(classStr)
              : (globalCssHover || globalTailwindHover))
      );
      const elHasFocus = hasFocusProp(attrs) || (
        cssModuleFocus !== null
          ? cssModuleFocus
          : (classStr !== null
              ? /focus-visible:|focus:|:focus-visible|:focus\b/i.test(classStr)
              : (globalCssFocus || globalTailwindFocus))
      );

      const lower = tagName.toLowerCase();
      const isNativeInteractive = ['button', 'a', 'input', 'select', 'textarea'].includes(lower);
      const importSource = importMap[tagName] || null;
      const primitive = isPrimitive(tagName, importSource, primitiveSet);
      const isOnClickNonInteractive = ['div', 'span', 'p', 'section', 'article'].includes(lower) &&
        attrs.some(a => a.name?.name === 'onClick') && !primitive;

      if (isOnClickNonInteractive) result.hasOnClickDiv = true;

      if (isNativeInteractive) {
        result.interactiveElements.push({
          type: lower === 'a' ? 'a' : lower,
          raw: '',
          hasHover: primitive ? true : (elHasHover || globalCssHover),
          hasFocusVisible: primitive ? true : (elHasFocus || globalCssFocus),
        });
      }

      // Treat primitive components as interactive-but-handled: register a synthetic
      // entry so counts reflect them, but never flag.
      if (!isNativeInteractive && primitive) {
        result.interactiveElements.push({
          type: 'component',
          raw: '',
          hasHover: true,
          hasFocusVisible: true,
        });
      }

      if (/modal|dialog|drawer/i.test(tagName)) result.hasModal = true;
      if (primitive && /dialog|modal|drawer/i.test(tagName)) result.hasPrimitiveModal = true;
      const roleAttr = attrs.find(a => a.name?.name === 'role');
      if (roleAttr && getAttributeValue(roleAttr.value) === 'dialog') result.hasModal = true;
      if (lower === 'form' || attrs.some(a => a.name?.name === 'onSubmit' || a.name?.name === 'handleSubmit')) result.hasForm = true;
      if (lower === 'nav') result.hasNav = true;
    },
  });

  // Layout thrash: only flag if a read and a write occur in the same function scope.
  try {
    traverse(ast, {
      'FunctionDeclaration|FunctionExpression|ArrowFunctionExpression'(path) {
        const node = path.node;
        const start = node.body && node.body.start;
        const end = node.body && node.body.end;
        if (typeof start !== 'number' || typeof end !== 'number') return;
        const src = content.slice(start, end);
        const read = /offsetWidth|offsetHeight|getBoundingClientRect|clientWidth|clientHeight|scrollTop|scrollLeft/i.test(src);
        const write = /\.style\.\w+\s*=|classList\.(add|remove|toggle)|\.innerHTML\s*=/i.test(src);
        if (read && write) result.layoutThrash = true;
      },
    });
  } catch (e) { /* ignore */ }
  // Fallback: if no function scopes found but file has both, keep old behavior
  if (!result.layoutThrash) {
    const globalRead = /offsetWidth|offsetHeight|getBoundingClientRect|clientWidth|clientHeight|scrollTop|scrollLeft/i.test(content);
    const globalWrite = /\.style\.\w+\s*=|classList\.(add|remove|toggle)|\.innerHTML\s*=/i.test(content);
    // Only fall back if there are no function declarations at all (scripts)
    if (globalRead && globalWrite && !/function|=>/.test(content)) result.layoutThrash = true;
  }

  // Aggregate hasHover/hasFocusVisible: true only if all interactive elements have them
  if (result.interactiveElements.length > 0) {
    result.hasHover = result.interactiveElements.every(e => e.hasHover);
    result.hasFocusVisible = result.interactiveElements.every(e => e.hasFocusVisible);
  } else {
    result.hasHover = globalCssHover || globalTailwindHover;
    result.hasFocusVisible = globalCssFocus || globalTailwindFocus;
  }

  return result;
}

// Regex fallback (original implementation) for non-parseable files
function parseJSXRegex(content, filePath) {
  const result = baseResult(content, filePath);
  // imports
  const importRegex = /import\s+.*?from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) result.imports.push(match[1]);

  const buttonRegex = /<button[^>]*>/g;
  const buttons = content.match(buttonRegex) || [];
  result.interactiveElements.push(...buttons.map(b => ({ type: 'button', raw: b, hasHover: /hover:|:hover|onMouseEnter|onMouseOver/i.test(b), hasFocusVisible: /focus-visible:|focus:|:focus-visible|:focus\b/i.test(b) })));
  const linkRegex = /<a[^>]*>/g;
  const links = content.match(linkRegex) || [];
  result.interactiveElements.push(...links.map(l => ({ type: 'a', raw: l, hasHover: /hover:|:hover|onMouseEnter|onMouseOver/i.test(l), hasFocusVisible: /focus-visible:|focus:|:focus-visible|:focus\b/i.test(l) })));
  const inputRegex = /<input[^>]*>/g;
  const inputs = content.match(inputRegex) || [];
  result.interactiveElements.push(...inputs.map(i => ({ type: 'input', raw: i, hasHover: /hover:|:hover|onMouseEnter|onMouseOver/i.test(i), hasFocusVisible: /focus-visible:|focus:|:focus-visible|:focus\b/i.test(i) })));

  const onClickDivRegex = /<(div|span|p|section|article)[^>]*onClick[^>]*>/gi;
  if (onClickDivRegex.test(content)) result.hasOnClickDiv = true;

  if (/hover:|:hover|onMouseEnter|onMouseOver/i.test(content)) result.hasHover = result.interactiveElements.length === 0 ? true : result.interactiveElements.every(e => e.hasHover);
  else result.hasHover = false;
  if (/focus-visible:|focus:|:focus-visible|:focus\b/i.test(content)) result.hasFocusVisible = result.interactiveElements.length === 0 ? true : result.interactiveElements.every(e => e.hasFocusVisible);
  else result.hasFocusVisible = false;

  if (/prefers-reduced-motion|useReducedMotion|reducedMotion/i.test(content)) result.hasReducedMotion = true;
  if (/isLoading|isPending|isFetching|<Skeleton|<Spinner|Skeleton|Spinner|CircularProgress|LinearProgress|skeleton/i.test(content)) result.hasLoadingState = true;
  if (/isEmpty|emptyState|EmptyState|noData|noResults|NoData|nothing to show|no .* found/i.test(content)) result.hasEmptyState = true;
  if (/isError|hasError|errorState|ErrorState|errorBoundary|ErrorBoundary|onError|role=["']alert["']|aria-live/i.test(content)) result.hasErrorState = true;
  if (/focus-trap|FocusTrap|trapFocus|useFocusTrap|focusTrap|autoFocus|initialFocus/i.test(content)) result.hasFocusManagement = true;
  if (/modal|dialog|drawer|Drawer|Modal|Dialog/i.test(content)) result.hasModal = true;
  if (/aria-live|aria-expanded|aria-controls|role="dialog"|role="alert"/i.test(content)) result.hasAriaLive = true;
  if (/<form|onSubmit|handleSubmit/i.test(content)) result.hasForm = true;
  if (/<nav|<Nav|navigation|Navigation/i.test(content)) result.hasNav = true;
  if (/isActive|activeRoute|activePath|useLocation|usePathname|aria-current/i.test(content)) result.hasActiveRoute = true;

  const tailwindAnimRegex = /(?:animate-|transition-|duration-|ease-|delay-)[a-z0-9-]+/gi;
  result.animations.push(...(content.match(tailwindAnimRegex) || []));
  const framerRegex = /(?:motion\.\w+|animate=|initial=|exit=|whileHover|whileTap|whileInView|variants=)/gi;
  result.animations.push(...(content.match(framerRegex) || []));
  const cssAnimRegex = /(?:transition|animation)\s*[:=]/gi;
  result.animations.push(...(content.match(cssAnimRegex) || []));

  const durationRegex = /duration[-:]?\s*(\d+(?:\.\d+)?)\s*(ms|s)?/gi;
  let durMatch;
  while ((durMatch = durationRegex.exec(content)) !== null) {
    let val = parseFloat(durMatch[1]);
    if (durMatch[2] === 's') val *= 1000;
    result.durations.push(val);
  }
  const twDurRegex = /duration-(\d+)/g;
  let twDurMatch;
  while ((twDurMatch = twDurRegex.exec(content)) !== null) result.durations.push(parseInt(twDurMatch[1]));

  const easingRegex = /ease[-:]?\s*[-a-z]+|cubic-bezier\([^)]+\)/gi;
  result.easings.push(...(content.match(easingRegex) || []));

  if (/--duration|--ease|--motion/.test(content)) result.motionTokens = true;

  const twTransitionAll = content.match(/transition-all/g) || [];
  result.layoutAnimations.push(...twTransitionAll.map(() => 'transition-all (Tailwind)'));
  const styleAnimRegex = /(?:transition|animation)\s*[:=]\s*['"][^'"]*(?:width|height|top|left|right|bottom|margin|padding)[^'"]*['"]/gi;
  result.layoutAnimations.push(...(content.match(styleAnimRegex) || []));
  const framerLayoutRegex = /animate\s*=\s*\{\{\s*[^}]*?(?:width|height)\s*:/gi;
  result.layoutAnimations.push(...(content.match(framerLayoutRegex) || []));

  for (const pattern of [/bg-blue-500|bg-blue-600|bg-indigo-500|bg-indigo-600/, /background:\s*#3b82f6|#4f46e5|#2563eb/]) {
    if (pattern.test(content)) { result.genericCTA = true; break; }
  }
  if (/hero/i.test(content) && /grid.*card|card.*grid|grid-cols.*card/i.test(content)) result.cardGridHero = true;
  const _hr = /offsetWidth|offsetHeight|getBoundingClientRect|clientWidth|clientHeight|scrollTop|scrollLeft/i.test(content);
  const _hw = /\.style\.\w+\s*=|classList\.(add|remove|toggle)|\.innerHTML\s*=/i.test(content);
  if (_hr && _hw) result.layoutThrash = true;

  return result;
}

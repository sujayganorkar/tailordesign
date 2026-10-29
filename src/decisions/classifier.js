// src/decisions/classifier.js - AST-based component classification

import { parse } from '@babel/parser';
import traverse from '@babel/traverse';

// Framework component → uiq component type mappings
// Covers: HTML, React, Chakra UI, Radix, Headless UI, shadcn/ui, MUI, Ant Design, Mantine, NextUI
const FRAMEWORK_MAPPINGS = {
  // Buttons
  'button': 'button', 'Button': 'button',
  'IconButton': 'button', 'Fab': 'button', 'FabButton': 'button',
  'ButtonGroup': 'button',
  // Chakra
  'chakra.button': 'button', 'ChakraButton': 'button',
  // Radix
  'Dialog.Trigger': 'button', 'AlertDialog.Trigger': 'button',
  'Popover.Trigger': 'button', 'Tooltip.Trigger': 'button',
  'DropdownMenu.Trigger': 'button',
  // Headless UI
  'Menu.Button': 'button', 'Listbox.Button': 'button',
  'Switch': 'button', 'Disclosure.Button': 'button',
  // MUI
  'MuiButton': 'button', 'MuiIconButton': 'button', 'MuiFab': 'button',
  // Ant Design
  'AntButton': 'button', 'Button': 'button',
  // Mantine
  'MantineButton': 'button', 'ActionIcon': 'button',
  // NextUI
  'NextUIButton': 'button',

  // Modals / Dialogs
  'Modal': 'modal', 'Dialog': 'modal', 'AlertDialog': 'modal',
  'Drawer': 'drawer', 'Sheet': 'drawer', 'DrawerContent': 'drawer',
  'DialogOverlay': 'modal', 'DialogContent': 'modal',
  'chakra.modal': 'modal', 'ChakraModal': 'modal',
  'MuiModal': 'modal', 'MuiDialog': 'modal',
  'AntModal': 'modal', 'AntDrawer': 'drawer',
  'MantineModal': 'modal', 'MantineDrawer': 'drawer',

  // Cards
  'Card': 'card', 'CardHeader': 'card', 'CardBody': 'card', 'CardFooter': 'card',
  'chakra.card': 'card', 'ChakraCard': 'card',
  'MuiCard': 'card', 'MuiCardHeader': 'card', 'MuiCardContent': 'card',
  'AntCard': 'card', 'MantineCard': 'card', 'NextUICard': 'card',

  // Navigation
  'Nav': 'nav', 'Navbar': 'nav', 'Navigation': 'nav', 'AppBar': 'nav',
  'Tabs': 'tab-bar', 'TabBar': 'tab-bar', 'TabList': 'tab-bar',
  'BottomNavigation': 'nav', 'NavigationRail': 'nav',
  'chakra.tabs': 'tab-bar', 'MuiTabs': 'tab-bar', 'AntTabs': 'tab-bar',
  'MantineTabs': 'tab-bar', 'NextUITabs': 'tab-bar',

  // Forms
  'Form': 'form', 'Formik': 'form', 'FormProvider': 'form',
  'Input': 'input', 'TextField': 'input', 'Textarea': 'input',
  'Select': 'input', 'Combobox': 'input', 'Autocomplete': 'input',
  'chakra.input': 'input', 'MuiInput': 'input', 'MuiTextField': 'input',
  'AntInput': 'input', 'MantineInput': 'input', 'NextUIInput': 'input',

  // Lists
  'List': 'list', 'Ul': 'list', 'Ol': 'list',
  'MuiList': 'list', 'AntList': 'list', 'MantineList': 'list',

  // Images
  'Image': 'image', 'Img': 'image', 'Avatar': 'image',
  'chakra.image': 'image', 'MuiAvatar': 'image', 'AntAvatar': 'image',
  'MantineAvatar': 'image', 'NextUIImage': 'image',

  // Links
  'Link': 'link', 'NavLink': 'link', 'NextLink': 'link',
  'chakra.link': 'link', 'MuiLink': 'link', 'AntAnchor': 'link',

  // Accordion
  'Accordion': 'accordion', 'Collapsible': 'accordion', 'Disclosure': 'accordion',
  'chakra.accordion': 'accordion', 'MuiAccordion': 'accordion',
  'AntCollapse': 'accordion', 'MantineAccordion': 'accordion',

  // Tooltip
  'Tooltip': 'tooltip', 'Popover': 'tooltip', 'HoverCard': 'tooltip',
  'chakra.tooltip': 'tooltip', 'MuiTooltip': 'tooltip',
  'AntTooltip': 'tooltip', 'MantineTooltip': 'tooltip', 'NextUITooltip': 'tooltip',

  // Loading
  'Skeleton': 'loading', 'Spinner': 'loading', 'Progress': 'loading',
  'CircularProgress': 'loading', 'LinearProgress': 'loading',
  'chakra.spinner': 'loading', 'MuiCircularProgress': 'loading',
  'AntSpin': 'loading', 'MantineLoader': 'loading', 'NextUISpinner': 'loading',
};

// HTML element → uiq component type
const HTML_MAPPINGS = {
  'button': 'button',
  'a': 'link',
  'input': 'input',
  'textarea': 'input',
  'select': 'input',
  'form': 'form',
  'nav': 'nav',
  'img': 'image',
  'ul': 'list',
  'ol': 'list',
  'details': 'accordion',
};

// Context detection patterns
const CONTEXT_PATTERNS = {
  scroll: /scroll|useInView|whileInView|IntersectionObserver|ScrollTrigger|useScroll/i,
  click: /onClick|onPress|onTap|onSubmit/i,
  hover: /onMouseEnter|onMouseOver|onHover|hover:/i,
  focus: /onFocus|onBlur|focus:/i,
  data: /fetch\(|axios\.|useQuery|useSWR|useMutation|getServerSideProps|getStaticProps/i,
  navigation: /useNavigate|useRouter|usePathname|Link|NavLink|href=|to=/i,
  animation: /animate|motion\.|framer|gsap|transition/i,
};

// Custom component mappings loaded from .uiqrc.json
let customMappings = {};

export function loadCustomMappings(config) {
  if (config?.componentMappings) {
    customMappings = config.componentMappings;
  }
}

// Classify a single JSX element
function classifyElement(tagName, attributes, hasOnClick) {
  // Check custom mappings first
  if (customMappings[tagName]) {
    return customMappings[tagName];
  }

  // Check framework mappings
  if (FRAMEWORK_MAPPINGS[tagName]) {
    const type = FRAMEWORK_MAPPINGS[tagName];
    // Override card → card-clickable if has onClick
    if (type === 'card' && hasOnClick) return 'card-clickable';
    return type;
  }

  // Check HTML mappings
  if (HTML_MAPPINGS[tagName.toLowerCase()]) {
    const type = HTML_MAPPINGS[tagName.toLowerCase()];
    // Override div → button if has onClick and role="button"
    if (tagName.toLowerCase() === 'div' && hasOnClick) {
      // Check if it has button-like attributes
      const hasRole = attributes.some(a => a.name === 'role' && a.value === 'button');
      const hasTabIndex = attributes.some(a => a.name === 'tabIndex' || a.name === 'tabindex');
      if (hasRole || hasTabIndex) return 'button';
      // If it has onClick but no role, it's an unknown interactive
      return 'unknown-interactive';
    }
    return type;
  }

  // Check for card-like patterns (div with card-like classes)
  const className = attributes.find(a => a.name === 'className' || a.name === 'class')?.value || '';
  if (/card|rounded.*shadow|shadow.*rounded/i.test(className)) {
    return hasOnClick ? 'card-clickable' : 'card';
  }

  // Check for button-like patterns
  if (hasOnClick && /btn|button/i.test(className)) {
    return 'button';
  }

  // Unknown interactive (has onClick but not recognized)
  if (hasOnClick) {
    return 'unknown-interactive';
  }

  return null; // Not a recognized component
}

// Parse JSX/TSX with AST
function parseJSXAST(content) {
  const components = [];
  const componentSet = new Set();

  try {
    const ast = parse(content, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript', 'decorators-legacy'],
    });

    traverse.default(ast, {
      JSXElement(path) {
        const opening = path.node.openingElement;
        const tagName = getTagName(opening.name);
        if (!tagName) return;

        // Extract attributes
        const attributes = opening.attributes
          .filter(a => a.type === 'JSXAttribute')
          .map(a => ({
            name: a.name?.name || a.name?.value,
            value: getAttributeValue(a.value),
          }));

        // Check for onClick
        const hasOnClick = attributes.some(a => a.name === 'onClick' || a.name === 'onPress' || a.name === 'onTap');

        // Classify
        const type = classifyElement(tagName, attributes, hasOnClick);
        if (type && type !== 'unknown-interactive') {
          if (!componentSet.has(type)) {
            componentSet.add(type);
            components.push({ type, count: 1 });
          } else {
            const existing = components.find(c => c.type === type);
            if (existing) existing.count++;
          }
        }

        // Track unknown interactive components
        if (type === 'unknown-interactive') {
          if (!componentSet.has('unknown-interactive')) {
            componentSet.add('unknown-interactive');
            components.push({ type: 'unknown-interactive', count: 1, tagName });
          } else {
            const existing = components.find(c => c.type === 'unknown-interactive');
            if (existing) {
              existing.count++;
              if (!existing.tagNames) existing.tagNames = [];
              if (!existing.tagNames.includes(tagName)) existing.tagNames.push(tagName);
            }
          }
        }
      },
    });
  } catch (e) {
    // Parse failed - fall back to regex
    return null;
  }

  return components;
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
  if (!value) return true; // boolean attribute
  if (value.type === 'StringLiteral') return value.value;
  if (value.type === 'JSXExpressionContainer') {
    if (value.expression.type === 'StringLiteral') return value.expression.value;
    if (value.expression.type === 'TemplateLiteral') return value.expression.quasis.map(q => q.value.cooked).join('');
    return '[expression]';
  }
  return null;
}

// Regex fallback for non-parseable files
function classifyRegex(content) {
  const components = [];
  const componentSet = new Set();

  const addComponent = (type) => {
    if (!componentSet.has(type)) {
      componentSet.add(type);
      components.push({ type, count: 1 });
    } else {
      const existing = components.find(c => c.type === type);
      if (existing) existing.count++;
    }
  };

  // Check framework mappings
  for (const [pattern, type] of Object.entries(FRAMEWORK_MAPPINGS)) {
    const regex = new RegExp(`\\b${pattern.replace('.', '\\.')}\\b`, 'g');
    const matches = content.match(regex);
    if (matches) {
      for (let i = 0; i < matches.length; i++) addComponent(type);
    }
  }

  // Check HTML elements
  for (const [tag, type] of Object.entries(HTML_MAPPINGS)) {
    const regex = new RegExp(`<${tag}\\b`, 'gi');
    const matches = content.match(regex);
    if (matches) {
      for (let i = 0; i < matches.length; i++) addComponent(type);
    }
  }

  // Check for onClick on divs (unknown interactive)
  const onClickDivs = content.match(/<(div|span|section|article)[^>]*onClick/gi);
  if (onClickDivs) {
    for (let i = 0; i < onClickDivs.length; i++) addComponent('unknown-interactive');
  }

  return components;
}

// Main classify function
export function classifyComponents(content, filePath) {
  const ext = filePath.split('.').pop().toLowerCase();
  let components = null;

  // Use AST for JS/TS/JSX/TSX files
  if (['js', 'jsx', 'ts', 'tsx'].includes(ext)) {
    components = parseJSXAST(content);
  }

  // Fall back to regex if AST failed or for other file types
  if (!components) {
    components = classifyRegex(content);
  }

  // Detect contexts
  const contexts = [];
  for (const [ctx, pattern] of Object.entries(CONTEXT_PATTERNS)) {
    if (pattern.test(content)) contexts.push(ctx);
  }

  // Mark unknown-interactive components with their tag names
  const unknownComponents = components.filter(c => c.type === 'unknown-interactive');
  for (const uc of unknownComponents) {
    if (!uc.tagNames) uc.tagNames = [];
  }

  return { components: components.filter(c => c !== null), contexts, file: filePath };
}

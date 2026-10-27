// src/decisions/classifier.js — Identify component types from code

// Component type definitions with detection patterns
const COMPONENT_PATTERNS = [
  // Buttons
  { type: 'button-primary', patterns: [/<button[^>]*className[^>]*primary/i, /<Button[^>]*variant=["']primary/i, /<Button[^>]*color=["']primary/i] },
  { type: 'button', patterns: [/<button\b/i, /<Button\b/i, /<IconButton\b/i, /<ElevatedButton\b/i, /<TextButton\b/i, /<OutlinedButton\b/i, /<FilledButton\b/i] },
  { type: 'button-destructive', patterns: [/<button[^>]*destructive/i, /<Button[^>]*color=["']error/i, /<Button[^>]*variant=["']destructive/i, /delete|remove|destroy/i] },

  // Cards
  { type: 'card-clickable', patterns: [/<(?:div|article|li)[^>]*onClick[^>]*className[^>]*(?:card|rounded|shadow)/i, /<Card[^>]*onClick/i, /<Card[^>]*href/i] },
  { type: 'card', patterns: [/<Card\b/i, /className[^>]*(?:card|rounded-lg shadow)/i] },

  // Modals / Dialogs / Drawers
  { type: 'modal', patterns: [/<Modal\b/i, /<Dialog\b/i, /role=["']dialog["']/i, /showModal|showDialog/i] },
  { type: 'drawer', patterns: [/<Drawer\b/i, /<Sheet\b/i, /showModalBottomSheet/i, /slide.*from.*(?:left|right|bottom)/i] },
  { type: 'accordion', patterns: [/<Accordion\b/i, /<details\b/i, /<Collapsible\b/i, /expandable/i] },

  // Forms
  { type: 'form', patterns: [/<form\b/i, /<Form\b/i, /useForm|react-hook-form/i] },
  { type: 'input', patterns: [/<input\b/i, /<Input\b/i, /<TextField\b/i, /<TextFormField\b/i, /<textarea\b/i] },

  // Navigation
  { type: 'nav', patterns: [/<nav\b/i, /<Nav\b/i, /<NavigationBar\b/i, /<BottomNavigationBar\b/i, /<Tabs\b/i, /<TabBar\b/i] },
  { type: 'tab-bar', patterns: [/<Tabs\b/i, /<TabBar\b/i, /<TabList\b/i] },

  // Data views
  { type: 'list', patterns: [/<ul\b/i, /<ol\b/i, /\.map\(/i, /<ListView\b/i, /<FlatList\b/i] },
  { type: 'data-view', patterns: [/\.(?:fetch|query|useQuery|useSWR|useMutation)\(/i, /FutureBuilder|StreamBuilder/i] },

  // Media
  { type: 'image', patterns: [/<img\b/i, /<Image\b/i] },

  // Links
  { type: 'link', patterns: [/<a\b/i, /<Link\b/i, /<NavLink\b/i] },

  // Tooltips / Popovers
  { type: 'tooltip', patterns: [/<Tooltip\b/i, /<Popover\b/i] },

  // Loading
  { type: 'loading', patterns: [/<Skeleton\b/i, /<Spinner\b/i, /CircularProgressIndicator|LinearProgressIndicator/i] },
];

// Context detection
const CONTEXT_PATTERNS = {
  scroll: /scroll|useInView|whileInView|IntersectionObserver|ScrollTrigger/i,
  click: /onClick|onPress|onTap/i,
  hover: /onMouseEnter|onHover|hover:/i,
  focus: /onFocus|focus:/i,
  data: /fetch|useQuery|useSWR|FutureBuilder|StreamBuilder/i,
  navigation: /useNavigate|useRouter|Link|NavLink|GoRouter|Navigator/i,
};

export function classifyComponents(content, filePath) {
  const components = [];

  for (const { type, patterns } of COMPONENT_PATTERNS) {
    for (const pattern of patterns) {
      const matches = content.match(new RegExp(pattern.source, pattern.flags + 'g')) || [];
      if (matches.length > 0) {
        // Avoid duplicate type entries — count occurrences
        const existing = components.find(c => c.type === type);
        if (existing) {
          existing.count += matches.length;
        } else {
          components.push({ type, count: matches.length, file: filePath });
        }
        break; // one pattern match is enough to classify
      }
    }
  }

  // Detect context
  const contexts = [];
  for (const [ctx, pattern] of Object.entries(CONTEXT_PATTERNS)) {
    if (pattern.test(content)) contexts.push(ctx);
  }

  return { components, contexts, file: filePath };
}

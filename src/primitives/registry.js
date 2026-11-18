// Known accessible UI primitives from headless libraries.
// When a JSX element resolves to one of these, interaction-state rules are
// skipped because the library guarantees hover/focus/semantics/keyboard handling.

export const DEFAULT_PRIMITIVES = {
  // Radix UI
  '@radix-ui/react-dialog': ['Dialog', 'DialogContent', 'DialogTrigger', 'DialogClose', 'DialogTitle', 'DialogDescription', 'Root', 'Trigger', 'Content', 'Close', 'Title', 'Description', 'Overlay', 'Portal'],
  '@radix-ui/react-popover': ['Popover', 'PopoverContent', 'PopoverTrigger', 'PopoverClose', 'Root', 'Trigger', 'Content', 'Close', 'Portal', 'Anchor'],
  '@radix-ui/react-tooltip': ['Tooltip', 'TooltipContent', 'TooltipTrigger', 'TooltipProvider', 'Root', 'Trigger', 'Content', 'Provider', 'Portal'],
  '@radix-ui/react-dropdown-menu': ['DropdownMenu', 'DropdownMenuContent', 'DropdownMenuTrigger', 'DropdownMenuItem', 'Root', 'Trigger', 'Content', 'Item', 'CheckboxItem', 'RadioItem', 'Label', 'Separator', 'Sub', 'SubTrigger', 'SubContent', 'Group'],
  '@radix-ui/react-select': ['Select', 'SelectContent', 'SelectTrigger', 'SelectItem', 'SelectValue', 'Root', 'Trigger', 'Content', 'Item', 'Value', 'Group', 'Label', 'Separator', 'ScrollUpButton', 'ScrollDownButton', 'Viewport'],
  '@radix-ui/react-tabs': ['Tabs', 'TabsList', 'TabsTrigger', 'TabsContent', 'Root', 'List', 'Trigger', 'Content'],
  '@radix-ui/react-accordion': ['Accordion', 'AccordionItem', 'AccordionTrigger', 'AccordionContent', 'Root', 'Item', 'Header', 'Trigger', 'Content'],
  '@radix-ui/react-alert-dialog': ['AlertDialog', 'AlertDialogContent', 'AlertDialogTrigger', 'AlertDialogAction', 'AlertDialogCancel', 'Root', 'Trigger', 'Content', 'Action', 'Cancel', 'Title', 'Description', 'Overlay', 'Portal'],
  '@radix-ui/react-checkbox': ['Checkbox', 'CheckboxIndicator', 'Root', 'Indicator'],
  '@radix-ui/react-switch': ['Switch', 'SwitchThumb', 'Root', 'Thumb'],
  '@radix-ui/react-slider': ['Slider', 'SliderTrack', 'SliderRange', 'SliderThumb', 'Root', 'Track', 'Range', 'Thumb'],
  '@radix-ui/react-toast': ['Toast', 'ToastProvider', 'ToastViewport', 'Root', 'Provider', 'Viewport', 'Title', 'Description', 'Action', 'Close'],
  // Headless UI
  '@headlessui/react': ['Dialog', 'DialogPanel', 'DialogTitle', 'DialogDescription', 'Transition', 'Menu', 'MenuButton', 'MenuItems', 'MenuItem', 'Listbox', 'ListboxButton', 'ListboxOptions', 'ListboxOption', 'Popover', 'PopoverButton', 'PopoverPanel', 'Switch', 'Tab', 'TabGroup', 'TabList', 'TabPanel', 'Combobox', 'ComboboxInput', 'ComboboxOptions', 'ComboboxOption'],
  // React Aria
  'react-aria-components': ['Button', 'Dialog', 'Modal', 'Popover', 'Tooltip', 'Menu', 'MenuItem', 'ListBox', 'ListBoxItem', 'Tabs', 'Tab', 'TabPanel', 'Switch', 'Checkbox', 'Radio', 'RadioGroup', 'TextField', 'TextArea', 'Select', 'SelectItem'],
  // Flutter (handled in dart parser, listed for completeness)
};

let _config = {};
export function configurePrimitives(cfg) { _config = cfg || {}; }
export function getPrimitiveConfig() { return _config; }
export function isKnownLibrary(source) {
  if (!source) return false;
  const keys = Object.keys({ ...DEFAULT_PRIMITIVES, ...(_config.primitives || {}) });
  return keys.some(k => source === k || source.includes(k) || source.startsWith(k));
}

export function buildPrimitiveSet(config = {}) {
  const merged = { ...DEFAULT_PRIMITIVES, ...(config.primitives || {}) };
  const names = new Set();
  for (const comps of Object.values(merged)) {
    for (const c of comps) names.add(c);
  }
  return names;
}

export function getPrimitiveSet() {
  return buildPrimitiveSet(_config);
}

export function isPrimitive(tagName, importSource, primitiveSet) {
  if (!tagName || /^[a-z]/.test(tagName)) return false;
  const leaf = tagName.includes('.') ? tagName.split('.').pop() : tagName;
  if (!primitiveSet.has(leaf)) return false;
  // Strict: only treat as primitive if imported from a known library
  if (importSource) return isKnownLibrary(importSource);
  return false;
}

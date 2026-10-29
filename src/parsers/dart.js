// src/parsers/dart.js - Parse Dart/Flutter files for UI patterns

export function parseDart(content, filePath) {
  content = content == null ? '' : String(content);
  const result = {
    filePath,
    type: 'dart',
    // Motion
    hasAnimations: false,
    animations: [],
    durations: [],
    easings: [],
    hasReducedMotion: false,
    layoutAnimations: [],
    hasMotionTokens: false,
    // Interaction
    interactiveElements: [],
    hasHover: false,
    hasFocus: false,
    hasDisabledState: false,
    hasLoadingState: false,
    hasEmptyState: false,
    hasErrorState: false,
    // Accessibility
    hasSemantics: false,
    hasFocusManagement: false,
    hasKeyboardNav: false,
    // Structure
    hasNav: false,
    hasActiveRoute: false,
    hasForm: false,
    hasModal: false,
    genericCTA: false,
    cardGridHero: false,
    imports: [],
    _content: content,
  };

  // Imports
  const importRegex = /import\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    result.imports.push(match[1]);
  }

  // Detect animated widgets
  const animWidgets = [
    'AnimatedContainer', 'AnimatedOpacity', 'AnimatedPositioned',
    'AnimatedPadding', 'AnimatedAlign', 'AnimatedSwitcher',
    'TweenAnimationBuilder', 'AnimatedBuilder', 'AnimatedList',
    'AnimatedCrossFade', 'AnimatedSize', 'AnimatedRotation',
    'AnimatedScale', 'AnimatedSlide', 'FadeTransition',
    'SlideTransition', 'ScaleTransition', 'RotationTransition',
    'SizeTransition', 'PositionedTransition', 'DecoratedBoxTransition',
  ];
  for (const w of animWidgets) {
    if (content.includes(w)) {
      result.hasAnimations = true;
      result.animations.push(w);
    }
  }

  // AnimationController
  if (/AnimationController/.test(content)) {
    result.hasAnimations = true;
    result.animations.push('AnimationController');
  }

  // Durations: Duration(milliseconds: N) or Duration(seconds: N)
  const durRegex = /Duration\(\s*(?:milliseconds|seconds)\s*:\s*(\d+)\s*\)/g;
  let durMatch;
  while ((durMatch = durRegex.exec(content)) !== null) {
    const val = parseInt(durMatch[1]);
    // If seconds, convert (heuristic: if preceded by 'seconds', multiply)
    result.durations.push(val);
  }
  // Also catch Duration(milliseconds: N, seconds: M) combined - simpler: just grab all numbers after milliseconds/seconds
  const durRegex2 = /Duration\(([^)]+)\)/g;
  let durMatch2;
  while ((durMatch2 = durRegex2.exec(content)) !== null) {
    const inner = durMatch2[1];
    const msMatch = inner.match(/milliseconds\s*:\s*(\d+)/);
    const secMatch = inner.match(/seconds\s*:\s*(\d+)/);
    if (msMatch) result.durations.push(parseInt(msMatch[1]));
    if (secMatch) result.durations.push(parseInt(secMatch[1]) * 1000);
  }

  // Easings: Curves.xxx
  const curveRegex = /Curves\.\w+/g;
  const curves = content.match(curveRegex) || [];
  result.easings.push(...curves);

  // Reduced motion
  if (/disableAnimations|accessibleNavigation|MediaQuery\.of.*disableAnimations|reduceMotion/i.test(content)) {
    result.hasReducedMotion = true;
  }

  // Layout animations: animating width/height in AnimatedContainer or TweenAnimationBuilder
  // Check for AnimatedContainer with width/height in tween
  if (/AnimatedContainer/.test(content)) {
    // Look for width: or height: inside AnimatedContainer blocks - heuristic
    const containerBlocks = content.match(/AnimatedContainer\([^)]*\)/gs) || [];
    for (const block of containerBlocks) {
      if (/width\s*:|height\s*:/.test(block)) {
        result.layoutAnimations.push('AnimatedContainer: width/height');
      }
    }
  }
  // TweenAnimationBuilder with width/height
  if (/TweenAnimationBuilder/.test(content) && /width\s*:|height\s*:/.test(content)) {
    // crude check
    result.layoutAnimations.push('TweenAnimationBuilder: possible layout property');
  }

  // Motion tokens (theme-based)
  if (/ThemeData|ThemeExtension|motionTokens|MotionTokens|animationDuration|animationCurve/i.test(content)) {
    result.hasMotionTokens = true;
  }

  // Interactive elements
  const interactiveWidgets = ['GestureDetector', 'InkWell', 'ElevatedButton', 'TextButton', 'OutlinedButton', 'FilledButton', 'IconButton', 'FloatingActionButton', 'ListTile', 'Checkbox', 'Switch', 'Slider', 'TextField', 'TextFormField', 'DropdownButton', 'PopupMenuButton'];
  for (const w of interactiveWidgets) {
    if (content.includes(w)) {
      result.interactiveElements.push(w);
    }
  }

  // Hover states
  if (/onHover|hoverColor|MouseRegion|hovered/i.test(content)) {
    result.hasHover = true;
  }

  // Focus
  if (/Focus\(|focusNode|FocusTraversal|focusColor|onFocus/i.test(content)) {
    result.hasFocus = true;
  }

  // Disabled state
  if (/onPressed\s*:\s*null|disabled\s*:\s*true|isEnabled\s*=\s*false/i.test(content)) {
    result.hasDisabledState = true;
  }

  // Loading states
  if (/CircularProgressIndicator|LinearProgressIndicator|shimmer|Shimmer|isLoading|loading/i.test(content)) {
    result.hasLoadingState = true;
  }

  // Empty states
  if (/empty|isEmpty|noData|noResults|NoData|EmptyState|nothingHere/i.test(content)) {
    result.hasEmptyState = true;
  }

  // Error states
  if (/error|isError|hasError|ErrorState|errorWidget/i.test(content)) {
    result.hasErrorState = true;
  }

  // Semantics (accessibility)
  if (/Semantics\(|SemanticsProperties|MergeSemantics|ExcludeSemantics/i.test(content)) {
    result.hasSemantics = true;
  }

  // Focus management (modals)
  if (/showDialog|showModalBottomSheet|showGeneralDialog/i.test(content)) {
    result.hasModal = true;
  }
  if (/FocusScope|FocusTrap|focusNode/i.test(content)) {
    result.hasFocusManagement = true;
  }

  // Keyboard nav
  if (/Shortcuts|Actions|KeyboardListener|onKeyEvent/i.test(content)) {
    result.hasKeyboardNav = true;
  }

  // Nav
  if (/BottomNavigationBar|NavigationBar|NavigationRail|AppBar|Drawer/i.test(content)) {
    result.hasNav = true;
  }

  // Active route
  if (/selectedIndex|currentIndex|selectedTab|activeIndex|GoRouter|Navigator/i.test(content)) {
    result.hasActiveRoute = true;
  }

  // Form
  if (/Form\(|TextFormField|GlobalKey<FormState>/i.test(content)) {
    result.hasForm = true;
  }

  // Generic blue CTA (Flutter: Colors.blue, Colors.indigo)
  if (/Colors\.blue|Colors\.indigo|Color\(0xFF3B82F6\)|Color\(0xFF4F46E5\)/i.test(content)) {
    result.genericCTA = true;
  }

  // Card grid in hero
  if (/hero/i.test(content) && /GridView|Wrap.*Card|Row.*Card/i.test(content)) {
    result.cardGridHero = true;
  }

  return result;
}

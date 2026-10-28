// src/adapters/flutter.js — Flutter/Dart adapter
import { BaseAdapter, createUniversalComponent } from './base.js';
import { parseDart } from '../parsers/dart.js';

export class FlutterAdapter extends BaseAdapter {
  constructor() {
    super('flutter');
    this.fileExtensions = ['.dart'];
  }

  detect(content, filePath) {
    return filePath.endsWith('.dart');
  }

  parse(content, filePath) {
    // Skip non-UI files
    if (!/Widget|StatelessWidget|StatefulWidget|BuildContext|Scaffold|Container|Column|Row|ListView|GridView/i.test(content)) {
      return null;
    }

    const parsed = parseDart(content, filePath);

    const component = createUniversalComponent('flutter-widget', {
      framework: 'flutter',
      filePath,
      hasHover: parsed.hasHover,
      hasFocus: parsed.hasFocus,
      hasDisabled: parsed.hasDisabledState,
      hasLoading: parsed.hasLoadingState,
      hasEmpty: parsed.hasEmptyState,
      hasError: parsed.hasErrorState,
      hasReducedMotion: parsed.hasReducedMotion,
      hasSemantics: parsed.hasSemantics,
      animations: parsed.animations,
      durations: parsed.durations,
      easings: parsed.easings,
      motionTokens: parsed.hasMotionTokens,
      contexts: this.detectContexts(content),
      raw: parsed,
    });

    return { parsed, component, framework: 'flutter' };
  }

  detectContexts(content) {
    const contexts = [];
    if (/ScrollController|ListView|SingleChildScrollView/i.test(content)) contexts.push('scroll');
    if (/onPressed|onTap|GestureDetector|InkWell/i.test(content)) contexts.push('click');
    if (/onHover|MouseRegion/i.test(content)) contexts.push('hover');
    if (/Focus\(|FocusNode/i.test(content)) contexts.push('focus');
    if (/FutureBuilder|StreamBuilder|http\.get/i.test(content)) contexts.push('data');
    if (/Navigator|GoRouter|routes/i.test(content)) contexts.push('navigation');
    if (/AnimatedContainer|TweenAnimationBuilder|AnimationController/i.test(content)) contexts.push('animation');
    return contexts;
  }

  getRules() {
    return []; // Uses default rules (adapted for Dart in rules/index.js)
  }
}

// src/adapters/registry.js — Auto-detect which adapter to use

import { WebAdapter } from './web.js';
import { FlutterAdapter } from './flutter.js';

const adapters = [
  new WebAdapter(),
  new FlutterAdapter(),
];

export function detectAdapter(content, filePath) {
  for (const adapter of adapters) {
    if (adapter.detect(content, filePath)) {
      return adapter;
    }
  }
  // Default to web adapter
  return adapters[0];
}

export function getAdapter(name) {
  return adapters.find(a => a.name === name) || adapters[0];
}

export function listAdapters() {
  return adapters.map(a => ({ name: a.name, extensions: a.fileExtensions }));
}

export function registerAdapter(adapter) {
  adapters.push(adapter);
}

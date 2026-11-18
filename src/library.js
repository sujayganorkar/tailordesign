let _enabled = false;

export function setLibraryMode(enabled) { _enabled = !!enabled; }
export function isLibraryMode() { return _enabled; }

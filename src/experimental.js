let _enabled = process.env.UIQ_EXPERIMENTAL === '1';

export function setExperimental(enabled) {
  _enabled = !!enabled;
}

export function isExperimental() {
  return _enabled;
}
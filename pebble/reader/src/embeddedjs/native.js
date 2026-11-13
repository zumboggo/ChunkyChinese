import FFI from 'ffi';
// Pebble resets its FFI registry on construction: share exactly one instance.
export default new FFI();

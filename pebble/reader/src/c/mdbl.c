#include <pebble.h>
int main(void) {
  Window *w = window_create();
  window_stack_push(w, false);
  // Balanced against native font/bitmap memory on the 122464-byte Emery app heap.
  ModdableCreationRecord cr = {
    .recordSize = sizeof(ModdableCreationRecord),
    .stack = 4096,
    .slot = 28672,
    .chunk = 20480,
#ifdef PBL_DEBUG
    .flags = kModdableCreationFlagDebug,
#endif
  };
  moddable_createMachine(&cr);
  window_destroy(w);
}

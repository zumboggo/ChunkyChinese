#include <pebble.h>
extern void destroyPortrait(void);
int main(void) {
  Window *w = window_create();
  window_stack_push(w, false);
  // Balanced against native font/bitmap memory on the 122464-byte Emery app heap.
  ModdableCreationRecord cr = {
    .fxBuildFFI = (void *)fxBuildFFI,
    .recordSize = sizeof(ModdableCreationRecord),
    .stack = 4096,
    .slot = 28672,
    .chunk = 24576,
#ifdef PBL_DEBUG
    .flags = kModdableCreationFlagDebug,
#endif
  };
  moddable_createMachine(&cr);
  destroyPortrait();
  window_destroy(w);
}

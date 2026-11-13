#include <pebble.h>
int main(void) {
  Window *w = window_create();
  window_stack_push(w, false);
  ModdableCreationRecord cr = {
    .recordSize = sizeof(ModdableCreationRecord),
    .stack = 4096,
    .slot = 24576,
    .chunk = 16384,
#ifdef PBL_DEBUG
    .flags = kModdableCreationFlagDebug,
#endif
  };
  moddable_createMachine(&cr);
  window_destroy(w);
}

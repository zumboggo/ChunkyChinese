#include <pebble.h>
extern void destroyPortrait(void);
extern void destroyScenes(void);
int main(void) {
  Window *w = window_create();
  window_stack_push(w, false);
  // Story records and portraits stream from resources; reserve room for the XS archive.
  ModdableCreationRecord cr = {
    .fxBuildFFI = (void *)fxBuildFFI,
    .recordSize = sizeof(ModdableCreationRecord),
    .stack = 4096,
    .slot = 34816,
    .chunk = 14336,
#ifdef PBL_DEBUG
    .flags = kModdableCreationFlagDebug,
#endif
  };
  moddable_createMachine(&cr);
  destroyScenes();
  destroyPortrait();
  window_destroy(w);
}

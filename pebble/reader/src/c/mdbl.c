#include <pebble.h>
extern void destroyPortrait(void);
extern void destroyScenes(void);
int main(void) {
  Window *w = window_create();
  window_stack_push(w, false);
  // Measured with five offline episodes, transfers, all scenes and reactions.
  // Fixed pools retain their own headroom; native heap is tested separately.
  ModdableCreationRecord cr = {
    .fxBuildFFI = (void *)fxBuildFFI,
    .recordSize = sizeof(ModdableCreationRecord),
    .stack = 4608,
    .slot = 35840,
    .chunk = 9216,
    .flags = kModdableCreationFlagLogInstrumentation,
  };
  moddable_createMachine(&cr);
  destroyScenes();
  destroyPortrait();
  window_destroy(w);
}

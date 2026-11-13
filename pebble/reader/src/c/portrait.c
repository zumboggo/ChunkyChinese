#include <pebble.h>

static Layer *s_portrait;
static uint32_t s_resource;
static char s_speaker[24];

static void draw_portrait(Layer *layer, GContext *ctx) {
  graphics_context_set_fill_color(ctx, GColorWhite);
  graphics_fill_rect(ctx, layer_get_bounds(layer), 0, GCornerNone);
  graphics_context_set_compositing_mode(ctx, GCompOpSet);
  for (uint32_t tile = 0; tile < 4; tile++) {
    GBitmap *bitmap = gbitmap_create_with_resource(s_resource + tile);
    if (bitmap) {
      graphics_draw_bitmap_in_rect(ctx, bitmap, GRect(0, tile * 57, 200, 57));
      gbitmap_destroy(bitmap); // Immediate release, independent of JavaScript GC.
    } else {
      APP_LOG(APP_LOG_LEVEL_ERROR, "Portrait allocation failed: %lu; free %lu", (unsigned long)(s_resource + tile), (unsigned long)heap_bytes_free());
    }
  }
  graphics_context_set_fill_color(ctx, GColorWhite);
  graphics_fill_rect(ctx, GRect(0, 207, 85, 21), 0, GCornerNone);
  graphics_context_set_text_color(ctx, GColorOxfordBlue);
  graphics_draw_text(ctx, s_speaker, fonts_get_system_font(FONT_KEY_GOTHIC_14), GRect(5, 209, 80, 19), GTextOverflowModeTrailingEllipsis, GTextAlignmentLeft, NULL);
}

void showPortrait(uint32_t resource, uint32_t actor) {
  if (!resource) { if (s_portrait) layer_set_hidden(s_portrait, true); return; }
  if (!s_portrait) {
    s_portrait = layer_create(GRect(0, 0, 200, 228));
    layer_set_update_proc(s_portrait, draw_portrait);
  }
  if (!s_portrait) return;
  s_resource = resource;
  snprintf(s_speaker, sizeof(s_speaker), "%s", actor == 1 ? "Hannah" : actor == 2 ? "Young Alden" : "Alden");
  layer_remove_from_parent(s_portrait);
  layer_add_child(window_get_root_layer(window_stack_get_top_window()), s_portrait);
  layer_set_hidden(s_portrait, false);
  layer_mark_dirty(s_portrait);
}

void destroyPortrait(void) {
  if (s_portrait) { layer_destroy(s_portrait); s_portrait = NULL; }
}

#pragma once
#include <pebble.h>
// Caller owns the state; no heap allocation, decoded image, or persistent sheet.
typedef struct {
  ResHandle resource;
  uint8_t palette[5], descriptors[84], row[16], frames, emotion, step;
  bool valid;
} PixelReaction;
bool pixel_open(PixelReaction *p, uint32_t resource_id);
bool pixel_select(PixelReaction *p, uint8_t emotion);
bool pixel_next(PixelReaction *p);
uint16_t pixel_duration(const PixelReaction *p);
void pixel_draw(PixelReaction *p, GContext *ctx, GPoint origin, uint8_t scale);

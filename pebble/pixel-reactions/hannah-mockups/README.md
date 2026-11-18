# Hannah expression mockups — selection pending

Built-in imagegen produced the retained source sheet using Hannah-neutral-64.png
as the identity reference. No animation or installed artwork has been changed.

Prompt: Four rows of paired shocked/laughing busts of adult Hannah, warm peach
skin, brown eyes, freckles, two loose brown braids and navy casual shirt. Shonen
cutout pixel art; consistent costume/framing. Row 1 Gentle Warmth: kind surprise,
tender laugh. Row 2 Bright Confidence: alert surprise, joyful grin. Row 3 Playful
Wit: raised-brow surprise, mischievous warm laugh. Row 4 Quiet Heart: concerned
surprise, affectionate soft laugh. White background; eight flat colours; no text,
gradients, dithering, accessories or hands. Design for a 64×64 logical grid.

prepare.py extracts the eight portraits, resizes to actual 64×64 with nearest
neighbour and enforces one eight-colour palette including white. validation.json
records the dimensions and colour counts. comparison.png enlarges each sprite 4×
without smoothing; its labels/background are outside the sprite palette limit.
The source image is a high-resolution concept sheet, not itself a verified 64px
asset. Hardware palette mapping and animation will follow the user's selection.

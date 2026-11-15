# Reusable Alden body pieces

Run `python3 pixel-reactions/alden-body/build.py` from `pebble/` to rebuild
`pieces.bin`, the PNG pieces and manifest. The normal `npm run art` command calls
this builder and appends the result to `reactions.bin` without modifying the old
prefix. `ALDEN_BODY_OFFSET` and the browser lookup are generated together.

The torso extends source row 62 of the approved body. All opaque pixels use the
same eight source colours; alpha is a separate mask. Native scenes use a 2× grid.
The source sleeve is rasterized to 16 directions and three lengths. Sprites are
wrist-anchored, with proximal overlap concealed by the torso. The mirror palm is
stored explicitly so the watch needs no reflection/rotation buffer. All geometry
is decoded through the existing 512-byte cache; the palette is cached in 8 bytes.

The AS64 piece header's alpha byte is a bit field: bit 0 enables the alpha mask;
bit 1 interleaves colour and mask rows; bit 2 prefixes each such row with its repeat
count. Existing assets retain their original layout and bytes. The new body uses
all three bits. Rows are emitted as larger rectangles when repeated, reducing
flash reads and draw calls without changing pixels. This format is internal to
the PBW; episode wire schemas are unchanged.

See `PROMPT.md` and `imagegen-reference.png` for the built-in imagegen design
reference. Original face, hair and expression patches are preserved separately;
no generated face pixels enter the release. Other cast members are not modified.

# Train Scene — standalone Time 2 test

Native C port of the approved interactive browser preview. Emery only, with its own app UUID so it does not replace Chunky Chinese.

- Select starts the train scene, picks up the phone at the prompt, and advances after the final held pose.
- Down replays from the start of the animation. Back exits.
- No network, bitmap frames, audio, or generated video. Seven poses occupy 336 bytes; the native build reports roughly 10.6 KiB code/data footprint. It targets an 83 ms frame interval.

Build with `pebble build` in this directory. The main reader version 1.2 includes this scene and four others, so installing the standalone test is optional.

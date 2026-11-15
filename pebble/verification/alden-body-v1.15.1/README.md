# Alden prototype evidence — v1.15.1

Base: verified reading-controls v1.14.2 (`c581f7c5`). Candidate hash:
`86b0384b02beefcbe92ee6cb68ffdd6240f265ef1f32f7ffcbae05597d5fe727`.
All final native reports and packaged PBW use this hash. Browser parity checks
exercise the same native rendering source/assets. No physical watch was tested.

## Results

- 110 build/unit checks; 570 pixel-exact browser/native frames.
- 243 unchanged close-up and other-character frames; original 31,949 artwork
  bytes retain their original hash.
- 42 installed scenes: playback, holds, selected replay checks, all background
  samples, preserved reading position and motion preference after reinstall.
- Five 21,029-byte episodes cached (105,145 bytes); at least 458,752 additional
  allocatable persistent-storage bytes in this emulator. Prefetch during the
  eye-cover scene, full-cache playback and interrupted/refilled queues pass.
- 26 downloadable recipes, all six actors, 12 installed hand-scene transfers;
  incomplete/bad transfers, duplicate END, title/ending overlays and recovery pass.
- No added full-frame buffers or per-frame allocations: packed pieces stream
  through the existing 512-byte cache. New cached palette is eight bytes.

| Measurement | v1.14.2 base | Prototype |
| --- | ---: | ---: |
| Peak string bytes | 9,132 | 9,100 |
| Peak slot bytes | 34,800 | 34,784 |
| Peak stack bytes | 3,744 | 3,744 |
| Required free-heap floor | 12,288 | 12,376 minimum sampled |

2,160 retained heap samples. VM reservations unchanged. See `metrics.json` for
installer/resource/native byte counts and original-art hash.

| Native scene draw average / maximum (ms) | Base | Prototype |
| --- | ---: | ---: |
| Resting, home foliage | 39 / 41 | 53 / 55 |
| Protective eye cover | 41 / 45 | 71 / 77 |
| Cover and peek | 42 / 47 | 72 / 77 |
| Interrupted sip | 40 / 43 | 78 / 84 |

The richer art costs draw time; final averages fit the 83 ms rounded target for
12 fps. One initial concurrent-emulator run reached 84 / 175 ms for the cup and
failed the average limit by 1 ms after 41 successful scene checks. Its raw logs
are retained as `scene-firstpass-*`. `--resume-report` validates the same PBW and
episode, retains those 41 successes and rechecks the cup in isolation, then runs
all background/save/reinstall checks. `scene-resume-*` records that successful
continuation. `scene-watch.log` combines both runs for conservative memory checks;
`prototype-scenes.json` is explicitly a subset of the full final report.

Diagnostic `memory-prefix.json` and baseline counterpart cover identical initial
download/reconnect scenarios. The baseline diagnostic peaked at 9,192 string
bytes; acceptance nevertheless retains the original stricter 9,132-byte limit.
Connection-suspend GC kept the complete final suite within that original limit.

Emulator wall times include host scheduling. These are not physical-watch FPS or
proof that the previously reported watch download error is fixed. Hardware
installation, storage and playback remain unverified. This isolated branch does
not replace concurrent reader work.

Recompute acceptance: `python3 scripts/verify-alden-body-release.py`.

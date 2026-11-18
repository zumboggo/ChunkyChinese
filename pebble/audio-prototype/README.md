# Offline Chinese audio A/B prototype

Phrase: **你打算每天都这样吗？**
Pinyin: **Nǐ dǎsuàn měitiān dōu zhèyàng ma?**
Meaning: **Are you going to do this every day?**

Reuses the existing Episode 13 Mandarin recording. No new speech service, network
request, API key or paid generation is needed. Both clips last 1.95625 seconds and
use identical speech, gain and 8-bit depth. Only sample rate changes. This tests the
smallest directly supported PCM bit depth; it does not compare 16-bit audio or ADPCM.

## Try it

Install `chinese-audio-ab-v1.0.0.pbw` through the Pebble mobile app on Pebble Time 2
(Emery). This is a separate app named **Chinese Audio A-B**, with its own UUID;
it does not replace the reader or touch its saves. Once installed, no phone is
needed for playback. Speaker support requires compatible watch firmware.

- Up: play 8 kHz.
- Down: play 16 kHz.
- Select: replay, or stop current playback.
- Back: exit.

While playing, Up/Down are ignored; use Select to stop, then choose the other rate.
Volume is the same for both (65, subject to watch settings). System mute and Quiet
Time are respected. Focus loss stops playback. The watch screen uses plain Latin
transliteration so this experiment needs no Chinese font resource.

Listen on a computer using `audio/chinese-8000.wav` and `audio/chinese-16000.wav`.
These WAVs contain the exact samples supplied to the watch, with WAV's unsigned
8-bit convention converted from Pebble's signed 8-bit convention. Your computer
speakers do not reproduce the watch speaker's acoustics. Physical-watch listening
is still required to judge pronunciation quality and gaps.

## Storage and measured RAM

| Item | 8 kHz | 16 kHz |
| --- | ---: | ---: |
| Speech resource payload | 15,650 bytes | 31,300 bytes |
| Clip duration | 1.95625 seconds | 1.95625 seconds |
| Shared application PCM buffer | 512 bytes | 512 bytes |
| Observed app-heap drop during playback | 0 bytes | 0 bytes |

The complete app's SDK RAM footprint is **3,780 bytes**, including loaded code
and static data. A matched build with audio disabled is **1,531 bytes**:
**2,249 bytes additional compiled footprint** for streaming code, its buffer,
state and diagnostic strings/logging. This is not 2,249 bytes of dynamic allocation.
The audio buffer is already included; do not add its 512 bytes again.
The full app has 576 bytes BSS plus 8 bytes initialized data.

In four complete emulator runs, free application heap stayed at **127,060 bytes**
before, during and after both sample rates. Timer/service allocations may live
outside that app heap. **OS speaker buffers, driver memory and stack high-water
usage were not measured.** These figures do not imply total device audio RAM is
512 bytes or zero. They are not a measurement of integration into the Alloy reader.

Both raw clips together occupy 46,950 bytes; the SDK resource pack including
metadata/alignment is 51,058 bytes. Resources stream from flash and are never
loaded as whole clips into app RAM. The player retains partially accepted chunks
when the speaker queue is full and yields between bounded refill callbacks.

## Verification

SDK 4.44, Emery emulator. `verification/report.json` binds the test result to the
exact PBW SHA-256. Checks passed for both rates, repeated full playback, exact
accepted-byte counts/checksums, early stop and successful playback afterwards.
WAV previews were checked byte-for-byte against the signed watch PCM. Screenshots
were visually reviewed. No hardware listening, battery, underrun capture, focus
interruption, or reader integration claim is made. Emulator elapsed-time logs are
not an audio-quality or real-time pacing measurement.

`verification/size-report.json` records the matched static-control build.

## Reproduce

```
python3 prepare.py
python3 measure.py
python3 verify.py
```

`prepare.py` uses local macOS afconvert and the existing source episode. It
resamples to 16-bit PCM first, then quantizes both versions identically to 8-bit.
`measure.py` clean-builds this app and a disposable control with AUDIO_ENABLED=0.
`verify.py` installs only this app into the existing Emery emulator, preserving
reader saves. The helpers use David's installed Pebble CLI. Conversion and emulator
access may require macOS access outside the filesystem sandbox.

No push or deployment is part of this prototype.

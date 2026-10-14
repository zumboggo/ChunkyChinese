# Visible props and fantasy actions

The common Learning is Fun renderer now owns these additions, synchronized into Chunky Chinese. No image generation or new audio is needed. Polished and hybrid cartoon-v1 characters share the same attachments; legacy raster rigs keep their previous behavior and reject new prop commands.

After `show`, use `prop Hyun phone`, `prop Hyun sword`, `prop Hyun bow`, or `prop Hyun none`. A held object follows the articulated hand through dialogue and choices, and survives replay/resume. A scene change, exit or another show resets it. The studio offers a Held object selector, preview and insertion.

Phone dialogue can use `[neutral, phone-talk]` or `[angry, phone-shout]`. The right arm keeps the phone at the cheek while the free hand gestures. Captioned `act` variants equip the phone automatically. Fantasy paired actions are `sword-strike`, `sword-blocked`, `sword-dodged`, `shoot-arrow` and `magic-beam`. They equip the required object automatically; magic clears it. Stage both characters first. Use wide framing. Outcomes are authored and non-graphic. Ordinary `give` remains a mimed handoff.

Arrows and beams use the measured responsive stage positions. Effects play once, clear after the action and do not replay on normal-motion resume. Reduced motion shows a static pose and effect. Objects remain held after an action until explicitly put away.

## Try it

Game → **Props & fantasy actions · Rehearsal** is an English-language animation sample separate from the novel. It demonstrates a phone, sword outcomes, bow and beam. All new actions also appear in Create episode → Action choreography.

**Moonlight Sculptor 02** now uses `moonlight-02-v2.json`: the phone appears when Hyun answers, stays through choices and replies, and disappears when he hangs up. His incredulous response uses phone-shout. Every Mandarin entry, interlinear chunk and audio byte is reused. The old v1 files and attempts are preserved; staging commands changed, so old progress is not mapped onto v2.

Validation: all Chunky Chinese unit tests and production build; shared parser/acting/prop tests; phone and desktop player, episode-2 routes, resume, keyboard choices, audio, normal/reduced motion and finite projectile checks. Learning is Fun builds and its animation checks pass; its wider suite reports four failures in writing-prompt-backend.test.ts, outside the changed renderer. Shared parity is checked after synchronization.

# The Name of the Wind — a slow Mandarin journey

Start with the supplied 2007 novel and keep its order: Waystone frame, childhood with the troupe, Tarbean, the road, the University, Imre, Trebon, and the return. The University must feel earned. Never move a later conversation into an earlier room just because the scenery is ready.

The chapter-by-chapter budget in `stories/authoring/wind-roadmap.json` reserves **about 260 short lessons**. This is an adjustable planning estimate across 92 chapters and the epilogue, not 260 finished lessons or a rigid quota. The prologue accompanies lesson 1. Read each next passage before splitting at a small dramatic development; add lessons where a conversation needs breathing room. Never renumber a published episode. A new book has its own sequence and continuation record.

Each lesson normally offers 4 brief choices and around 40–60 voiced entries, with natural Mandarin, phrase-sized glosses, pinyin and cached speech. An observation choice can guide attention without changing what happens. Preserve the difference between the frame, Kvothe's account and stories told by other characters. Do not reveal the future through labels or choices.

## Opening sequence

1. **A Story Before Supper** — the prologue's quiet, the five regulars, Cob's ominous opening and the apprentice's questions. Supper interrupts. Stop before the escape.
2. **A Name and a Fall** — Taborlin's escape and the tinker; Kote's unusual intervention. Preserve the fact that this is Cob's account, not an independently witnessed event.
3. **What Belongs in Stories** — contradictory explanations of the Chandrian; Carter's arrival changes the room. Stop at a coherent reveal rather than combining the whole aftermath.
4. **On the Table** — the scrael, Kote's knowledge and his attempt to conceal it. Choose an exact boundary after source inspection.
5. **Iron and Questions** — the test and the villagers' response. Keep the aftermath and Bast's conversation separate if needed.

Later early arcs remain in source order: Chronicler on the road; Kote's dangerous errand and the agreement to tell his story; troupe life and Abenthy's teaching; loss and survival; Tarbean; the journey with Denna; admissions. The University cycle then allows repeated visits to rooms whose geography the learner already knows. Interludes return to the same Waystone, with different relationships and light rather than a redesigned room.

## Common staging rules

The illustration sources and reusable cast are in `scripts/build-wind-locations.py`, `stories/characters/wind-cast.json` and `public/stories/animated/locations/wind-v1/`. Scenery contains no baked-in people. Furniture used by a pose is attached to the actor's coordinate system, so a stool cannot drift away when the phone layout changes. The scenery's far tables are background objects, not the seat under a foreground actor.

The renderer supports `far-left`, `left`, `center`, `right`, `far-right`. An ensemble uses centers at 10%, 30%, 50%, 70%, 90%; each actor gets an 18%-wide body area inside a separate 20%-wide mark. Existing three-person compositions keep their old spacing. Use a brief wide establishing view and then a listener or adjacent pair shot for readable faces on phones. No five-face close-up, no row of characters all gesturing at once. An off-camera listener remains in the room; narration must not imply an exit merely because a coverage cut removes their rendered figure.

`rest Actor seated` keeps the pelvis lowered, knees bent and feet supported while dialogue uses the upper body. `rest Actor reclining` and `rest Actor lying` include a simple daybed; return to `rest Actor relaxed` to stand. These are supported held poses, not a promise of a climbing or lie-down animation. Use a narrative beat/cut for getting into an upper bunk. Never walk, train or perform a standing impact while still seated or lying. Lying is for a supported rest, injury or sleep scene, not a quota.

A reclining body uses more horizontal space than an upright body. Put it at an edge facing inward; reserve the adjacent mark. For five people including a reclining person, use **two consistent coverage views** of the same room: a rest-area pair and a seated group. Do not compress five full bodies into one flat row. Show the complete party in an upright/seated establishing shot when appropriate, then let the resting body occupy its real space. Five characters can inhabit the scene naturally without all five being visible in every shot.

## Waystone Inn

**Identity:** heavy dark hearth to the left, cool window beyond the center, mahogany service bar, back-room doorway to the right. Keep a clear path between entrance, stools and service area. Night and inhabited-evening versions should share this geometry. The opening uses a restrained, deliberately quiet palette.

**Five-person arrangement:** Cob at the left end, Graham next, Jake center, Shep right and the apprentice at the right end. Cob addresses the apprentice across the group; cut to each rather than trying to fit their distant faces in a tight pair. Jake can interrupt without moving seats. A service shot shows Kote and one or two customers; it does not erase the other regulars. Later Carter's entrance belongs to a doorway/reaction view, not a sixth actor squeezed into the row.

**Habit:** seated storytelling, a listener's hand resting, an impatient mug knock, then a return to stillness. Standing marks a real interruption or practical job. Kote's polishing is a separate action with a cloth, not an empty-handed sword or eating loop. Do not claim a visible prop that the runtime has not rendered.

**Rest:** use a separate guest-room/injury angle for lying down when the source calls for it. A daybed must not materialize in the common-room establishing shot merely to demonstrate the pose.

## The Mews — a bed that means safety

**Source check:** in chapter 37 Kvothe takes an upper bunk in the far corner of the fourth-floor east-wing dormitory. Clean sheets, a locking trunk and a narrow window matter. The book does not establish Kvothe, Simmon, Wilem and Manet as four roommates. Treat the requested four-friend room as a staging capacity, not a change to their living arrangements.

**Geometry:** two bunk structures at the edges; narrow window in the rear center; trunk beside the bed; open central aisle. The far bunk is background scenery. A dedicated bedside angle presents Kvothe's bed at an accessible screen height with the same window and trunk landmarks. Do not pretend the actor has climbed to the upper bunk when only a standing pose changed.

**Up to five:** one person at the bed edge, two on separate stools, one at the trunk and one in the doorway. Assign occupants only after checking who actually visits. A lying Kvothe gets the rest-area angle with one visitor; reverse to the other three listeners when needed. Keep the doorway free so arrivals do not pass through bodies or beds.

**Habit:** sit to remove boots, talk from a bed edge, recline when exhaustion or comfort matters, lie for sleep. Each posture has a reason and persists across lines. Getting up should accompany a decision or departure, not each new speech bubble.

## The Mess — the four friends, with room for a fifth

**Source check:** chapter 37 introduces Kvothe to Wilem and Manet while Simmon guides him at lunch. Sovoy joins the table, making five. Manet is an older student, not a teenage roommate.

**Geometry:** long plank table, benches, other tables far behind, open serving aisle. Use a conversational table-side crop for seated faces and a wider view for arrival. The first reusable background establishes the hall; an authored foreground tabletop can be added in a new asset version when needed.

**Five-person arrangement:** Kvothe and Simmon beside one another; Wilem and Manet across the conversational axis; Sovoy enters at the open end. Keep an empty end before he arrives. His discomfort with the bench is character business; his arrival must not replace another friend's identity. Speech changes gaze and upper-body gesture while everyone stays seated.

**Habit:** shared meals, practical questions about tuition, teasing and changes in allegiance. No invented friendship conversation in the dorm just to reuse this seating group.

## Mains — a class with hierarchy and room to listen

**Source check:** chapter 38's room resembles a small theater: tiered semicircular seats, roughly fifty students, a raised stage and a large stone worktable. It is not a modern classroom. Hemme's manner is different from Abenthy's private teaching.

**Geometry:** teacher/demonstration area at the front, curved rows behind, a side aisle and an entrance higher up. The overview establishes the theater. Close coverage switches between the teacher and the relevant students without implying only five people attend.

**Five featured people:** teacher at the demonstration mark; four students selected from the actual passage on separate bench marks. In the first class, use Kvothe, Gel, Basil and Rian only as the text introduces them; do not substitute Kvothe's friends. A late student pauses in the aisle before taking a seat. Keep the teacher's view and students' view distinct so the teacher never stands inside a bench.

**Habit:** students remain seated for listening, notes and embarrassed reactions. The teacher stands or leans over the worktable. Lying down is not natural here; reserve it for a source-supported medical aftermath in the proper room.

## Continuity and release

Consult `stories/authoring/series/name-of-the-wind.json` for the exact next EPUB boundary and completed endings. Reuse the learner's already authorized familiarity supplement without promoting newly encountered words. Keep source extracts and vocabulary exports private. Publish only complete, checked lessons, and keep planned lessons out of the playable dropdown. The book and episode selectors, title/number search and previous/next controls do not impose a 100-episode limit.

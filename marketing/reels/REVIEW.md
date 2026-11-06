# Review: VibeHeal waitlist reels

Draft for owner review, 2026-11-06.

## Creative calls
- **Five different films, not one film five times.** Each reel has its own device:
  1. a POV joke;
  2. a type-driven argument (why we're building it);
  3. a slot machine with one world for each job;
  4. a split screen that comes back together;
  5. a pause game.

  They share the brand palette, Inter 900 type and the same end card, so they read as a series.
- **No product UI.** The pictures are things a vibe coder already knows: error lines, a chat bubble, a counter, a cracked line, wireframe blocks, a calendar card, a pause icon.
- **The interaction happens in the comments**, because Instagram ranks on comments, shares and rewatches. Each reel ends on one clear ask: comment an error, tag a friend, vote 1/2/3, pick a team, or pause and comment your type. Reel 5 is built for rewatches: every 0.4 s card is a complete poster when paused.
- **Silent files.** No music source was available here, and trending audio added in the Instagram editor helps reach more than a fixed bed. The reels are made to work muted: every beat is carried by the type.
- **Honesty.** The copy says "building", "in the works" and "planned". It names only what the owner listed (fix, build, automate; open-source and paid cloud versions). It gives no prices or dates and invents no statistics.

## What was measured
- `hyperframes check` passes on all five reels with **0 errors**.
- Warnings kept on purpose:
  - `line_unread` on slot-machine rolls, the reel 1 error pile and the pause-game cards. These are meant to flash past, and in reel 5 that is the point of the game.
  - `nested_structure_needs_subcomposition` and `timeline_track_too_dense`: each reel is one file with scenes as timed groups. That keeps five small projects easy to read; splitting each scene into its own file is optional.
  - `film_silent`: deliberate, see above.
- Key frames were snapshotted and looked at for every reel, covering every scene and the end card. Fixed after looking:
  - the reel 1 wordmark wrapped onto two lines;
  - the reel 3 task card text wrapped;
  - the reel 3 loop ring showed a sliver before it drew;
  - the reel 4 "or" badge was mis-sized.
- Renders were probed with `ffprobe` for resolution, frame rate, duration and frame count.

## Not checked
- The renders were never played back at full speed by a person, and no sound was heard (there is none).
- Readability on a real phone was judged from 1080-wide frames, not on a device.
- Whether vibeheal.online's waitlist is live today.

## Weakest shot, and what to do with more time
- **Reel 4, scenes 2 and 3** (the reasons rolling through one slot). They are clear but the quietest beats in the series. A stronger version would show something happening: a terminal line you run yourself for open source, a cloud that takes over for cloud.
- With a music source, cut each reel's colour floods and slot landings on the beat.

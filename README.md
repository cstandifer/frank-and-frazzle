# Frank & Frazzle

A p5.js virtual creature sketch for Logic of Interaction, week 5. In week 8 I
added sound (see [Week 8: adding sound](#week-8-adding-sound)).

<img width="800" height="501" alt="Screenshot 2026-10-13 at 9 27 39 AM" src="https://github.com/user-attachments/assets/6955e971-d069-42c5-8760-b7925a5b1d7e" />

**▶ [Demo video with sound](docs/frank-and-frazzle-demo.webm)** (26 seconds,
week 8; recorded in the game with the R key; turn your volume up a little).

Frank is a grumpy little monster hiding in a cave in a dense forest. All he
really needs is some sunlight and a hug. Frazzle, his happy blob of a buddy,
is just glad to be there.

## How to play

- **Poke Frank:** click his side and he grudgingly steps away from the poke.
  Poke him out of the cave and into the sunbeam, and he turns his face up to the
  sun and (almost) smiles.
- **Poke Frazzle:** tap them in the middle and they hop straight up. Tap a side
  and they hop away from it.
- **Feed them a mushroom:** drag one of the glowing mushrooms onto either
  creature.
  - Frank sits down in a happy daze.
  - Frazzle floats around, bouncing off the edges of the screen, off Frank, and
    off the cave. Grab them while they float to drag them along behind you, like
    a balloon on a stretchy string: pulling an edge turns them, yanking too hard
    makes them slip free, and letting go mid-drag tosses them. If they come down
    upside down, they're dizzy for a moment.
  - The mushroom grows back when the trip ends.
- **The hug:** get Frazzle to land next to Frank while Frank is calm, and Frazzle
  gives him a hug. Frank acts grumpy about it, but he blushes. If Frank is
  annoyed, Frazzle bounces right off him.
- **Sound:** browsers stay silent until you click or tap, so the first click
  turns sound on and the woods fade in. Frank shuffles through the grass when
  he walks, slides down into it when he sits for his trip, and growls and sighs
  when he's hugged. Frazzle boings when they hop, lands softly in the grass,
  and boings off the walls, Frank, and the cave on a trip. **Press M** to mute.
- **Press R** to record a demo video with sound, and R again to stop: the
  browser saves a video file (works best in Chrome). A red "● REC" sign shows
  while it records; it isn't in the video.
- **Press D** to show each creature's current state. (Adding `?debug` to the
  end of the address shows the screen sizes the sketch is working with.)

It works with a mouse or on a phone or tablet, held either way (sideways gives
the biggest view). On a phone, the 🔍 button zooms in to fill the screen, and
when you drag a mushroom, it rides just above your fingertip so you can see it.

**To play full screen on a phone:**
- **iPhone:** in Safari, tap **Share → Add to Home Screen**. Open it from the new icon and it runs like an app, with no browser bars.
- **Android or iPad:** tap the full screen button in the top-right corner (Android can also use **Add to Home Screen**).

## Running it locally

Open the folder with a local web server (for example VS Code's Live Server, or
`python3 -m http.server 8000`) and visit `http://localhost:8000`. Opening
`index.html` directly as a file doesn't always work well.

## How it's built

Everything except the sound is in `sketch.js`. From top to bottom:

1. **Settings** you can tweak (trip lengths, bounciness, how dragging feels),
   then `setup()`, `draw()`, and the mouse/touch handlers.
2. **Fitting the screen**: sizing the canvas for phones and computers, the
   zoom camera, the full screen button, and the phone tips.
3. **The classes**:
   - `Frank` and `Frazzle`: each has `update()` (changes the numbers) and
     `display()` (draws them), plus interaction methods like `poke()`,
     `isMouseOver()`, and `eatMushroom()`. Frazzle also has their floating
     physics: `bounceOffWalls()`, `bounceOffFrank()`, `bounceOffCave()`
     (which all share `bounceAt()`), and grabbing/dragging.
   - `Mushroom`: ready, held, being eaten, eaten, or regrowing
   - `SunBeam`: draws the light and checks whether Frank is standing in it
   - `Blinker` and `Spring`: small helpers for blinking and bouncy, jiggly motion
4. **Little helpers** used all over, like `turnPoint()` and `easeInOut()`.
5. **The scenery**: the forest, cave, and ground, painted once and then
   reused every frame.

The sound is in `sounds.js`: volume settings at the top, then the
`play…Sound()` functions that `sketch.js` calls at each moment (a footstep, a
hop, a bump), then the recipes for each sound, then the building blocks they're
made from (`tone()`, `burst()`, `breath()`, `growl()`). The background is a
recording in `sounds/`; everything else is made in code with the Web Audio
building blocks that p5.sound runs on. The `sound-lab/` page plays each sound
on its own, for comparing and tuning them. `recorder.js` records a demo video
(press R): the canvas's picture plus the game's sound, using the browser's
built-in MediaRecorder.

The `class-example/` folder holds the JitterBug class example from class.

## Week 8: adding sound

### My goal

- **What I wanted to improve:** Frank and Frazzle were silent. I wanted the
  forest to sound like a forest, and to hear the creatures move: Frazzle
  hopping and bouncing off the walls on a trip, and Frank's steps when he walks.
- **What I changed:** I added a quiet woods recording in the background and
  sounds made in code for Frank (a shuffling step through dirt and grass, a
  slide into the grass when he sits for his trip, a low monster growl and sigh
  when he's hugged) and Frazzle (a springy hop, a soft landing in the grass,
  and a jelly boing when they bump into something on a trip).
- **What I kept the same:** how both creatures look, move, and react. Sound is
  added with one call at each moment (in `press()`, `updateWalk()`,
  `updateEating()`, `getHugged()`, `jump()`, `poke()`, `land()`, and
  `bounceAt()`); none of the rules for movement changed. Before the first click
  the game plays silently, just like before.

### What I checked

**Demo:** [a 26-second recording of the game with its sound](docs/frank-and-frazzle-demo.webm),
made with the R key. The sound track is there the whole way through, louder
when the creatures move and quieter in between.

**Before/after: Frazzle's bounce.** I wanted the bounce to sound like the same
creature as the hop. Measured in the browser (the loudest pitch at the start,
middle, and end of each sound):

| Sound | Start | Middle | End |
|---|---|---|---|
| Little hop | 258 Hz | 258 Hz | 545 Hz |
| Bounce, first version (falls, much higher) | 639 Hz | 516 Hz | 357 Hz |
| Bounce, final (rises like the hop) | 252 Hz | 252 Hz | 451 Hz |

**When the sounds play** (counted by stepping the game forward frame by frame):

| What happened | Sounds |
|---|---|
| One poke on Frank | 4 footsteps, then a softer one as his back foot settles |
| Frazzle hopping on their own for 30 seconds | 6 hops and their landings, no boings |
| A full 35-second trip | 13 bumps, 12 boings (one bump was too soft to count) |
| Tossed hard into the cave corner | 6 bumps in 1.5 seconds, 3 boings (at least 0.15 s apart) |

**An experiment I ran myself.** Every `play…Sound()` function starts with
`if (!soundCtx) return;` ("if sound isn't turned on yet, stop here").

- **Prediction:** if I removed that line from `playHopSound()`, I'd hear
  Frazzle's hops before clicking.
- **Observation:** when I clicked first, the hop made its sound on that first
  click (the click that turns sound on). When I waited without clicking,
  **both creatures disappeared** the moment Frazzle tried to hop.
- **Why:** before the first click there's no sound engine yet, so the hop code
  crashed. The crash stopped `draw()` after the forest was painted but before
  Frank and Frazzle were drawn, and p5 never drew another frame. So the line
  keeps the game from crashing before sound is turned on. I put it back.

**Not checked yet:**
- On my phone (an iPhone's silent switch can mute web audio).
- On headphones or speakers. Frank's growl is very low (about 60 Hz), and
  laptop speakers can barely play it.

I listened to every sound in the game on my computer, including the final
growl and sigh and the sit-down slide.

**The prompt I started with, and the first AI response.** I used Claude Code
(in the Claude desktop app). My first prompt:

> I want Frank and Frazzle to have sounds. The background can have a nature
> sound to it and you can hear frazzle hopping and bouncing off the walls when
> on a trip and frank's steps when he walks. Read the relevant code and explain
> which rules control sounds. Make suggestions for these changes and tell me
> how to implement and check it.

The opening of Claude's first response (`[…]` marks cuts):

> Right now Frank & Frazzle has no sound at all. On Oct 18 you removed it on
> purpose: commit `2c48347` took out `p5.sound.min.js`, the unused
> `giggleSound` hook and the `userStartAudio()` call. So adding sound means
> bringing a sound system back and deciding when each sound plays. […]
>
> | Sound | Where in the code | What the rule is |
> |---|---|---|
> | **Any sound at all** | `press()` | Browsers block audio until the player clicks or taps once. […] |
> | **Frank's steps** | `updateWalk()` | `gaitPhase` goes up by 1 every full stride, and a foot lands every half stride. […] |
> | **Trip bounces** | `bounceAt()` | Walls, Frank and the cave all go through this one function. […] |
>
> […] **Start with one sound, not all four.** […]

One correction came out of checking: Claude first predicted 5 footsteps per
poke, but replaying Frank's walking rule showed 4 (the 5th foot only slides
back into place), so a softer settling step plays there instead.

### Decisions and credits

**My choices** (in the order I made them):
- Sounds made in code for Frank and Frazzle, after comparing them with the
  clips I'd found; my own woods recording for the background, "but not too
  loud. It's distracting otherwise."
- Frank's steps: "more of a shuffle," then a softer start and "more of a dirt
  or grass sound."
- Frazzle's hop: a sharper start (0.003 s). The bounce: lower, then "more like
  little hop," and only when Frazzle bounces off something.
- Frazzle lands "like he is landing in grass."
- Everything softer, twice: with my computer at half volume, sound was "about
  as loud as I would want things," so the overall volume went down to half.
- Frank slides into the grass when he sits for his trip, and gives "a grunty
  sigh" when hugged, then "more of a monster grunt. A low growl."
- The growl and sigh start "a little delayed (0.5 second)" into the hug.
- A record key (R), so I could make a demo video with the game's sound.

**How AI helped:** Claude Code read the code and explained which rules could
control sound, trimmed and turned up my woods recording, wrote the
sound recipes and the sound lab page, made each change I asked for, and
measured the results (pitches, timing, how often each sound plays). It also
found that p5.sound changes how audio pieces connect, which broke the first
version of the lab, and fixed it with a small `chain()` helper. The first
version of Frank & Frazzle was also made with Claude Code, in VS Code.

**Sources:**
- **Woods:** ["British woods ambient noise"](https://pixabay.com/sound-effects/nature-british-woods-ambient-noise-24942/)
  by freesound_community, Pixabay. I used a 60-second stretch from 12:25,
  turned up and looped.
- **Used in the sound lab only** (the game uses sounds made in code instead):
  - "Running" by soumages, Pixabay (file 363346): one footstep cut out.
  - "Shrt bass" by stu9, Pixabay (file 357133).
- All three recordings are from Pixabay, under the
  [Pixabay Content License](https://pixabay.com/service/license-summary/).
- **Libraries:** [p5.js](https://p5js.org) 1.10.0 and
  [p5.sound](https://github.com/processing/p5.js-sound) 1.0.1.

### Next question

**What other interactions could Frank and Frazzle have, or is this enough?**

Smaller things still open:
- Frazzle hops on their own about every 5 seconds, so their boing is the sound
  you hear most. Is it charming or distracting after a minute of play?
- Frank's own big grumpy sigh (every 12–25 seconds) is still silent.
- Does the low growl come across on a phone speaker?

**About devices:** the game doesn't use a camera or microphone. Sound is the
only new output, it stays off until you click or tap, and **M** mutes it.

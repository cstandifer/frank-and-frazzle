# Frank & Frazzle

A p5.js virtual creature sketch for Logic of Interaction, week 5.

<img width="800" height="501" alt="Screenshot 2026-10-13 at 9 27 39 AM" src="https://github.com/user-attachments/assets/6955e971-d069-42c5-8760-b7925a5b1d7e" />

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
`index.html` directly as a file doesn't work well, because p5.sound needs a
server.

## How it's built

Everything is in `sketch.js`. From top to bottom:

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
4. **Little helpers** used all over, like `turnPoint()` and `smoothstep()`.
5. **The scenery**: the forest, cave, and ground, painted once and then
   reused every frame.

The `class-example/` folder holds the JitterBug class example from class.

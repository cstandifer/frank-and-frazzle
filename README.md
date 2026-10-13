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
- **Poke Frazzle:** tap him in the middle and he hops straight up. Tap a side and
  he hops away from it.
- **Feed them a mushroom:** drag one of the glowing mushrooms onto either
  creature.
  - Frank sits down in a happy daze.
  - Frazzle floats around the screen. Tap him while he floats and he tilts. If
    he comes down upside down, he's dizzy for a moment.
  - The mushroom grows back when the trip ends.
- **The hug:** get Frazzle to land next to Frank while Frank is calm, and Frazzle
  gives him a hug. Frank acts grumpy about it, but he blushes. If Frank is
  annoyed, Frazzle bounces right off him.
- **Press D** to show each creature's current state.

## Running it locally

Open the folder with a local web server (for example VS Code's Live Server, or
`python3 -m http.server 8000`) and visit `http://localhost:8000`. Opening
`index.html` directly as a file mostly works, but p5.sound needs a server.

## How it's built

Everything is in `sketch.js`, organized as classes:

- `Frank` and `Frazzle`: each has `update()` (changes the numbers) and
  `display()` (draws them), plus interaction methods like `poke()`,
  `isMouseOver()`, and `eatMushroom()`
- `Mushroom`: ready, held, being eaten, eaten, or regrowing
- `SunBeam`: draws the light and checks whether Frank is standing in it
- `Blinker` and `Spring`: small helpers for blinking and bouncy, jiggly motion

The `class-example/` folder holds the JitterBug class example from class.

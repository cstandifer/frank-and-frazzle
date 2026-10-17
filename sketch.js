let frank;
let frazzle;
let sunbeam;
let mushrooms = [];

const GROUND_Y = 400;      // the y of the forest floor
const CAVE_MOUTH_X = 230;  // anything left of this is inside the cave

// how long a magic mushroom trip lasts, in milliseconds
// (make these smaller while you're testing, so you don't have to wait)
const TRIP_MIN = 30000;           // Frank's daze
const TRIP_MAX = 45000;
const FRAZZLE_TRIP_MIN = 25000;   // Frazzle's float is a little shorter
const FRAZZLE_TRIP_MAX = 38000;

const EAT_TIME = 1100;     // how long eating a mushroom takes: open, chomp, swallow

// how Frazzle bounces off the edges of the screen while he's floating
const FLOAT_SPEED = 1.8;    // his drifting speed (pixels per frame)
const BOUNCINESS = 0.75;    // 1 = keeps all his speed in a bounce, 0 = goes splat
const WALL_GRIP = 0.3;      // how much the walls grab at him and make him roll

let heldMushroom = null;   // the mushroom the player is carrying, if any

// Frazzle's giggle. To add a real sound, put a file like giggle.mp3 in this
// folder and add this function:
//   function preload() { giggleSound = loadSound("giggle.mp3"); }
// (the sound only works when the sketch runs from the local server)
let giggleSound = null;

let showDebug = false;     // press D to show each creature's state

// true once the player has touched the screen (a phone or tablet), so we
// can make tap targets bigger and hold mushrooms above their fingertip
let usingTouch = false;

let canvasElt;   // the canvas on the page (so we can size it, and tell taps
                 // on it apart from taps on the full screen button)

function setup() {
  // The sketch is always 800 x 500 inside. fitToScreen() stretches the canvas
  // to fit the screen, and p5 converts mouse and touch positions back to these
  // coordinates for us, so nothing else needs to know the screen size.
  canvasElt = createCanvas(800, 500).elt;
  pixelDensity(min(displayDensity(), 2));   // sharp, but not too slow on phones
  setupZoomButton();
  fitToScreen();
  setupFullscreenButton();
  setupHomeScreenTip();
  setupRotateTip();
  paintScenery();

  // enters through a gap in the canopy, lands on the ground to the right
  sunbeam = new SunBeam(sunbeamTop()[0], sunbeamTop()[1], 585, 640);

  mushrooms.push(new Mushroom(270, GROUND_Y));
  mushrooms.push(new Mushroom(500, GROUND_Y));
  mushrooms.push(new Mushroom(730, GROUND_Y));

  frank = new Frank(110, GROUND_Y);     // hiding under the cave ledge
  frazzle = new Frazzle(400, GROUND_Y);
}

function draw() {
  // the forest behind everything (painted once in setup)
  image(backdrop, 0, 0, width, height);

  // mushrooms on the ground go behind the creatures
  for (let m of mushrooms) {
    m.update();
    if (m.state !== "held" && m.state !== "beingEaten") m.display();
  }

  // first update (change the numbers), then display (draw what they say)
  frank.update();
  frazzle.update();
  frazzle.drawBehindFrank();   // when hugging, one arm reaches around behind Frank
  frank.display();
  frazzle.display();

  // a mushroom flying into someone's mouth goes in front of them
  for (let m of mushrooms) {
    if (m.state === "beingEaten") m.display();
  }

  // the sunbeam goes after the creatures so its light falls over whoever
  // stands in it, then the foreground rocks and grass go in front of everything
  sunbeam.display();
  image(foreground, 0, 0, width, height);

  // the mushroom you're carrying goes on top of everything
  if (heldMushroom) heldMushroom.display();

  // the cursor hints at what you can do: grab a mushroom (or a floating
  // Frazzle, to twist him around), or poke a creature
  if (heldMushroom || frazzle.grabbed) cursor("grabbing");
  else if (mushrooms.some((m) => m.isMouseOver())) cursor("grab");
  else if (frazzle.hopPhase === "floating" && frazzle.isMouseOver()) cursor("grab");
  else if (frazzle.isMouseOver() || frank.isMouseOver()) cursor(HAND);
  else cursor(ARROW);

  if (showDebug) drawDebugLabels();

  updateCamera();
}

// Mouse and touch both end up in press() and release().
// (mouseX and mouseY follow your finger on a touchscreen too.)
// Clicks and taps that aren't on the canvas, like on the full screen
// button, are left alone so the button works normally.
function mousePressed(event) {
  if (event && event.target !== canvasElt) return;
  press();
}

function mouseReleased() {
  release();
}

function touchStarted(event) {
  if (event && event.target !== canvasElt) return;
  usingTouch = true;
  press();
  // returning false stops the browser from also sending a pretend mouse
  // click (which would poke twice) and from zooming on a double tap
  return false;
}

function touchEnded(event) {
  release();
  if (event && event.target !== canvasElt) return;
  return false;
}

function touchMoved(event) {
  if (event && event.target !== canvasElt) return;
  return false;   // keep the page from scrolling while you drag a mushroom
}

// ---------------------------------------------------------------------------
// FITTING THE SCREEN
// The sketch is always 800 x 500 inside; this stretches the canvas on the
// page to fit whatever screen it's on.
// ---------------------------------------------------------------------------

// On phones and tablets, a wide screen would leave big empty bars on the
// sides. So we zoom in to fill the width, trimming up to this much off the
// top (canopy) and bottom (grass). The creatures never go there.
const TRIM_TOP = 40;
const TRIM_BOTTOM = 35;

// zoomed in (the zoom button): the scene fills the whole screen, and a
// camera slides up and down to keep the creatures in view
let zoomedIn = false;
let screenScale = 1;    // screen pixels per sketch pixel
let screenWidth = 0;    // how big the sketch's area on the screen is
let screenHeight = 0;
let cameraX = null;     // when zoomed in: the left and top of the view,
let cameraY = null;     // in sketch pixels

// held upright and zoomed in, this much of the scene's width shows
const UPRIGHT_VIEW_WIDTH = 480;

// held upright and zoomed in, the camera follows whoever you poked or fed last
let cameraFocus = null;

// where the pointer (mouse or finger) is on the screen, kept up to date even
// between p5's events, so a carried mushroom stays under your finger while
// the camera scrolls
let pointerScreenX = null;
let pointerScreenY = null;
window.addEventListener("pointermove", rememberPointer, { passive: true });
window.addEventListener("pointerdown", rememberPointer, { passive: true });
function rememberPointer(e) {
  pointerScreenX = e.clientX;
  pointerScreenY = e.clientY;
}

// the pointer's position in sketch coordinates, worked out fresh from where
// the canvas is right now
function pointerInSketch() {
  if (pointerScreenX === null) return [mouseX, mouseY];
  let r = canvasElt.getBoundingClientRect();
  return [((pointerScreenX - r.left) * width) / r.width, ((pointerScreenY - r.top) * height) / r.height];
}

function fitToScreen() {
  let area = document.querySelector("main");   // p5 puts the canvas in <main>
  if (!area || !canvasElt) return;
  let w = area.clientWidth;
  let h = area.clientHeight;

  // only trim on touch devices; on a computer, show the whole scene
  let trimming = window.matchMedia("(pointer: coarse)").matches;
  let mustShow = trimming ? height - TRIM_TOP - TRIM_BOTTOM : height;

  // Normally: as big as it can be while the full width fits, and at least
  // the part we must show fits in the height. Zoomed in: big enough to cover
  // the whole screen sideways, or to show UPRIGHT_VIEW_WIDTH of the scene
  // held upright (updateCamera picks which part shows).
  let upright = h > w;
  let k = min(w / width, h / mustShow);
  if (zoomedIn && upright) k = min(w / UPRIGHT_VIEW_WIDTH, h / height);
  else if (zoomedIn) k = max(w / width, h / height);
  screenScale = k;
  screenWidth = w;
  screenHeight = h;
  cameraX = null;
  cameraY = null;
  let cw = width * k;
  let ch = height * k;
  let left = (w - cw) / 2;
  let top = (h - ch) / 2;
  if (ch > h) {
    // taller than the screen: trim the extra off the top and bottom
    top = -(ch - h) * (TRIM_TOP / (TRIM_TOP + TRIM_BOTTOM));
  }

  canvasElt.style.width = cw + "px";
  canvasElt.style.height = ch + "px";
  canvasElt.style.left = left + "px";
  canvasElt.style.top = top + "px";
  updateCamera();
  updateRotateTip();
}

// When zoomed in, the screen only shows part of the scene. This slides the
// view around to keep the action in view (like a camera):
// - up and down: it frames the forest floor, but moves up to keep both
//   creatures' heads in view (like when Frazzle floats up high)
// - side to side (held upright): it frames both creatures if they fit, or
//   follows whoever you poked or fed last. While you carry a mushroom, it
//   holds still, unless your finger is near an edge: then it scrolls that way.
function updateCamera() {
  if (!zoomedIn || !frank) return;   // (frank doesn't exist yet at the very start)
  let visibleW = screenWidth / screenScale;    // how much of the scene shows
  let visibleH = screenHeight / screenScale;

  // up and down
  let goalY = (height - visibleH) / 2;   // (centered, if it all fits)
  if (visibleH < height) {
    let floor = 475 - visibleH;   // the forest floor, with a little grass below it
    let highest = min(frank.y - frank.size * 1.5, frazzle.y - frazzle.size * 1.1);
    goalY = constrain(min(floor, highest - 15), 0, height - visibleH);
  }

  // side to side
  let goalX = (width - visibleW) / 2;
  if (visibleW < width) {
    let maxX = width - visibleW;
    if (heldMushroom && cameraX !== null) {
      let edge = screenWidth * 0.15;
      goalX = cameraX;
      if (pointerScreenX !== null && pointerScreenX < edge) goalX -= 7;
      if (pointerScreenX !== null && pointerScreenX > screenWidth - edge) goalX += 7;
    } else {
      let a = frank.x;
      let b = frazzle.x;
      let focus = cameraFocus === frank ? a : b;
      if (abs(a - b) < visibleW - 160) focus = (a + b) / 2;   // both fit: frame them together
      goalX = focus - visibleW / 2;
    }
    goalX = constrain(goalX, 0, maxX);
  }

  // glide there smoothly (or jump straight there the first time); a carried
  // mushroom scrolls the view directly, so it keeps up with your finger
  let ease = heldMushroom ? 1 : 0.08;
  cameraX = cameraX === null ? goalX : lerp(cameraX, goalX, ease);
  cameraY = cameraY === null ? goalY : lerp(cameraY, goalY, 0.08);
  canvasElt.style.left = -cameraX * screenScale + "px";
  canvasElt.style.top = -cameraY * screenScale + "px";
}

// the magnifying glass button: zoom in to fill the screen, or back out to
// see the whole scene. Only on phones and tablets.
function setupZoomButton() {
  let button = document.getElementById("zoom-btn");
  if (!button || !window.matchMedia("(pointer: coarse)").matches) return;

  // remember the choice from last time (if the browser lets us)
  try {
    zoomedIn = localStorage.getItem("zoomedIn") === "yes";
  } catch (e) {}

  button.hidden = false;
  showZoomState(button);
  button.addEventListener("click", () => {
    zoomedIn = !zoomedIn;
    try {
      localStorage.setItem("zoomedIn", zoomedIn ? "yes" : "no");
    } catch (e) {}
    showZoomState(button);
    fitToScreen();
  });
}

// the button shows a plus to zoom in, and a minus to zoom back out
function showZoomState(button) {
  button.classList.toggle("zoomed", zoomedIn);
  button.setAttribute("aria-label", zoomedIn ? "Zoom out" : "Zoom in");
}

// On iPhone (in Safari, not opened from the home screen), a little tip
// explains how to get rid of the browser bars. Closing it hides it for good.
function setupHomeScreenTip() {
  let tip = document.getElementById("home-screen-tip");
  let isIPhone = /iPhone|iPod/.test(navigator.userAgent);
  if (!tip || !isIPhone || navigator.standalone) return;
  try {
    if (localStorage.getItem("tipClosed") === "yes") return;
  } catch (e) {}

  tip.hidden = false;
  tip.querySelector(".tip-close").addEventListener("click", () => {
    tip.hidden = true;
    try {
      localStorage.setItem("tipClosed", "yes");
    } catch (e) {}
  });
}

// On a phone held upright, a little tip suggests turning it sideways for a
// bigger view. It fades away by itself after a few seconds, and closing it
// hides it for good. (It's only a suggestion: upright works too.)
let rotateTipDone = false;

function setupRotateTip() {
  let tip = document.getElementById("rotate-tip");
  if (!tip) return;
  try {
    rotateTipDone = localStorage.getItem("rotateTipClosed") === "yes";
  } catch (e) {}
  tip.querySelector(".tip-close").addEventListener("click", () => {
    hideRotateTip();
    try {
      localStorage.setItem("rotateTipClosed", "yes");
    } catch (e) {}
  });
  updateRotateTip();
}

// show the tip when the phone is upright (once per visit), hide it otherwise
function updateRotateTip() {
  let tip = document.getElementById("rotate-tip");
  if (!tip || !window.matchMedia("(pointer: coarse)").matches) return;
  let upright = window.innerHeight > window.innerWidth;
  if (upright && !rotateTipDone && tip.hidden) {
    tip.hidden = false;
    tip.classList.remove("fading");
    rotateTipDone = true;   // just once each time the sketch is opened
    setTimeout(hideRotateTip, 6000);
  } else if (!upright) {
    tip.hidden = true;
  }
}

function hideRotateTip() {
  let tip = document.getElementById("rotate-tip");
  tip.classList.add("fading");
  setTimeout(() => (tip.hidden = true), 600);
}

// p5 calls this when the window changes size (or the phone turns sideways)
function windowResized() {
  refitSoon();
}

// While a phone turns, the browser reports in-between sizes for a moment, so
// fit now and again once things have settled.
let refitTimers = [];
function refitSoon() {
  fitToScreen();
  refitTimers.forEach(clearTimeout);
  refitTimers = [150, 400, 900].map((ms) => setTimeout(fitToScreen, ms));
}
window.addEventListener("orientationchange", refitSoon);
if (window.visualViewport) window.visualViewport.addEventListener("resize", refitSoon);

// The button in the corner that hides the browser's bars. iPhones don't let
// web pages do this (there, "Add to Home Screen" does the same job), and it
// isn't needed when the sketch was opened from the home screen.
function setupFullscreenButton() {
  let button = document.getElementById("fullscreen-btn");
  let page = document.documentElement;
  let canGoFullscreen = document.fullscreenEnabled || document.webkitFullscreenEnabled;
  let openedFromHomeScreen =
    navigator.standalone ||
    window.matchMedia("(display-mode: standalone), (display-mode: fullscreen)").matches;
  if (!button || !canGoFullscreen || openedFromHomeScreen) return;

  button.hidden = false;
  button.addEventListener("click", () => {
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      return;
    }
    let request = page.requestFullscreen || page.webkitRequestFullscreen;
    let result = request.call(page);
    // on Android, also try to keep the screen sideways
    if (result && result.then) {
      result.then(() => screen.orientation.lock("landscape")).catch(() => {});
    }
  });
}

function press() {
  // phones only allow sound after the first tap, so unlock it here
  if (typeof userStartAudio === "function") userStartAudio();

  // mushrooms first, then Frazzle (he's drawn in front of Frank), then Frank
  for (let m of mushrooms) {
    if (m.isMouseOver()) {
      heldMushroom = m;
      m.pickUp();
      return;
    }
  }
  if (frazzle.isMouseOver()) {
    // floating, he gets grabbed (to twist him around); otherwise poked
    if (frazzle.hopPhase === "floating") frazzle.grab();
    else frazzle.poke(mouseX, mouseY);
    cameraFocus = frazzle;
  } else if (frank.isMouseOver()) {
    frank.poke(mouseX, mouseY);
    cameraFocus = frank;
  }
}

function release() {
  if (heldMushroom) {
    heldMushroom.drop([frazzle, frank]);
    if (heldMushroom.eater) cameraFocus = heldMushroom.eater;   // the camera follows whoever ate it
    heldMushroom = null;
  }
  if (frazzle.grabbed) frazzle.letGo();
}

// fingers are bigger and less exact than a mouse pointer, so on a
// touchscreen everything is a bit easier to hit
function hitSize() {
  return usingTouch ? 1.3 : 1;
}

function keyPressed() {
  if (key === "d" || key === "D") showDebug = !showDebug;
}

// labels above each creature showing what state it's in (for testing)
function drawDebugLabels() {
  noStroke();
  fill(255);
  textSize(13);
  textAlign(CENTER);
  text(frank.mood, frank.x, frank.y - 160);
  text(frazzle.hopPhase, frazzle.x, frazzle.y - 90);
}

class Frank {
  constructor(x, y) {
    this.x = x;         // center between his feet
    this.y = y;         // the ground he stands on
    this.size = 100;    // everything scales from this
    this.facing = 1;    // 1 = facing right, -1 = facing left

    // idle life
    this.breath = 0;                       // -1 to 1, slowly in and out
    this.blinker = new Blinker(2500, 6000);
    this.lookX = 0;                        // where his pupils point, -1 to 1
    this.lookY = 0;
    this.lookGoalX = 0;
    this.lookGoalY = 0;
    this.nextGlanceAt = millis() + 3000;

    // idle action: every so often he lets out a big sigh
    this.action = null;                    // null, or "sigh"
    this.actionStart = 0;
    this.nextActionAt = millis() + random(6000, 12000);
    this.sighBreath = 0;                   // extra breath on top of normal breathing
    this.droop = 0;                        // 0 to 1, how far his eyes sag shut
    this.puff = 0;                         // 0 to 1, progress of the sigh's puff of air

    // mood: "hiding", "indifferent", "annoyed", "content", "dazed", or "hugged"
    this.mood = "hiding";
    this.anger = 0;            // eases toward 1 = annoyed, 0 = indifferent, -1 = content
    this.annoyedUntil = 0;

    // walking: after a poke he walks over to walkTo
    this.walking = false;
    this.walkTo = x;
    this.walkSpeed = 0;        // pixels per frame right now
    this.maxWalkSpeed = 1.1;   // a slow, grumpy shuffle
    this.gaitPhase = 0;        // goes up as he walks; each 1 is a full stride
    this.feet = [{ x: 0, lift: 0 }, { x: 0, lift: 0 }];   // back foot, front foot
    this.stepSize = 65;        // how far one poke pushes him
    this.minX = 60;            // the back of the cave
    this.maxX = 760;           // the fallen tree

    // a poke dents his body where it lands, then the dent springs back out
    this.dentAngle = 0;        // which part of his outline got poked
    this.dentSpring = new Spring(0, 0.2, 0.72);
    this.dent = 0;             // 1 = pushed in, negative = bulging out
    this.flinchSpring = new Spring(0, 0.2, 0.75);
    this.flinch = 0;

    // magic mushroom daze: he sits down and sways, his eyes drifting around
    this.dazedUntil = 0;
    this.tripMushroom = null;  // the one he ate (it grows back when his trip ends)
    this.loopy = 0;            // eases 0 to 1 as the daze kicks in
    this.confusedUntil = 0;    // poked while dazed: confused, but still dazed
    this.confused = 0;         // eases 0 to 1

    // being hugged by Frazzle: he acts grumpy about it, but blushes
    this.huggedUntil = 0;
    this.hugged = 0;           // eases 0 to 1
    this.heartAt = -100000;    // when the little heart pops up

    // eating a mushroom (see eatingPhases)
    this.eatingSince = null;   // when he started eating, or null
    this.eatingMushroom = null;
    this.gulped = false;
    this.mouthOpen = 0;        // 0 to 1
    this.swallow = -1;         // 0 to 1 while the lump goes down, -1 otherwise

    this.bodyColor = color(190, 60, 55);
    this.darkColor = color(120, 30, 30);
    this.lidColor = color(160, 45, 42);
    this.lipColor = color(140, 35, 45);
    this.bellyColor = color(215, 115, 90);

    // All shapes below are [x, y] as fractions of his size, measured from
    // the bottom of his body. He's drawn facing right: +x is his front.

    // plump body: rounded top that's highest toward the back (a slight
    // slouch), and a front that curves smoothly around his belly
    this.bodyPts = [
      [0.08, 0], [0.4, -0.08], [0.5, -0.3], [0.48, -0.56],
      [0.41, -0.8], [0.25, -1.0], [0.0, -1.09], [-0.26, -1.02],
      [-0.42, -0.78], [-0.45, -0.44], [-0.37, -0.12], [-0.17, -0.01],
    ];

    // spikes along his back: [x, y, length]
    this.spikes = [
      [-0.08, -1.08, 0.07], [-0.18, -1.05, 0.09], [-0.28, -1.0, 0.09],
      [-0.38, -0.86, 0.08], [-0.43, -0.72, 0.07], [-0.45, -0.52, 0.05],
    ];

    // messy hair: [rootX, lean, length, curl], rooted at the top of his head
    this.hairRoot = [0.15, -1.01];
    this.hair = [
      [-0.07, -0.7, 0.14, 0.5],
      [-0.04, -0.3, 0.2, -0.6],
      [-0.01, -0.05, 0.24, 0.7],
      [0.02, 0.25, 0.18, -0.5],
      [0.05, 0.6, 0.16, 0.6],
      [0.08, 0.95, 0.11, -0.4],
      [0.0, 0.45, 0.13, 0.8],
    ];

    // scales: rows of little arcs over his back, skipping his face and belly
    this.scales = [];
    for (let row = 0; row < 16; row++) {
      let y = -1.12 + row * 0.065;
      let offset = (row % 2) * 0.045;
      for (let x = -0.55 + offset; x < 0.35; x += 0.09) {
        let onFace = dist(x, y, 0.17, -0.72) < 0.28;
        let onBelly = dist(x, y, 0.25, -0.28) < 0.26;
        if (!onFace && !onBelly) this.scales.push([x, y]);
      }
    }
  }

  update() {
    this.blinker.update();

    // slow, heavy breathing (one breath about every 3.5 seconds)
    this.breath = sin(millis() * 0.0018);
    this.updateEating();
    this.updateWalk();
    this.updateMood();
    this.updateIdleAction();

    this.dent = this.dentSpring.update(0);
    this.flinch = this.flinchSpring.update(0);

    // his eyes follow the mouse; if it's off the screen, he glances around.
    // when he's content in the sun, he ignores you and gazes up at the light
    // (in a daze, his pupils wander on their own; see drawEye)
    if (this.mood === "dazed") {
      this.lookGoalX = 0;
      this.lookGoalY = 0;
    } else if (this.mood === "hugged") {
      // embarrassed: he looks down and away from Frazzle
      let frazzleInFront = (frazzle.x - this.x) * this.facing > 0;
      this.lookGoalX = frazzleInFront ? -1 : 1;
      this.lookGoalY = 0.5;
    } else if (this.mood === "content") {
      this.lookGoalX = 0.6;
      this.lookGoalY = -1;
    } else if (mouseIsOnScreen()) {
      let headY = this.y - this.size;
      this.lookGoalX = constrain(((mouseX - this.x) * this.facing) / 160, -1, 1);
      this.lookGoalY = constrain((mouseY - headY) / 160, -1, 1);
    } else if (millis() > this.nextGlanceAt) {
      this.lookGoalX = random([-1, -0.4, 0, 0.4, 1]);
      this.lookGoalY = 0;
      this.nextGlanceAt = millis() + random(2000, 5000);
    }
    this.lookX = lerp(this.lookX, this.lookGoalX, 0.12);
    this.lookY = lerp(this.lookY, this.lookGoalY, 0.12);
  }

  // decides which mood he's in, then eases his face toward it
  updateMood() {
    let dazed = millis() < this.dazedUntil;

    // when his trip wears off, the mushroom he ate grows back
    if (!dazed && this.tripMushroom) {
      this.tripMushroom.regrow();
      this.tripMushroom = null;
    }

    if (dazed) {
      this.mood = "dazed";
    } else if (this.walking || millis() < this.annoyedUntil) {
      this.mood = "annoyed";
    } else if (millis() < this.huggedUntil) {
      this.mood = "hugged";
    } else if (sunbeam.isInLight(this.x, 25)) {
      this.mood = "content";
    } else if (this.x < CAVE_MOUTH_X) {
      this.mood = "hiding";
    } else {
      this.mood = "indifferent";
    }

    let goal = 0;
    if (this.mood === "annoyed") goal = 1;
    if (this.mood === "content" || this.mood === "dazed") goal = -1;
    if (this.mood === "hugged") goal = 0.2;   // trying to look grumpy about it
    this.anger = lerp(this.anger, goal, 0.1);
    this.hugged = lerp(this.hugged, millis() < this.huggedUntil ? 1 : 0, 0.1);

    // the daze kicks in slowly and wears off slowly
    this.loopy = lerp(this.loopy, dazed ? 1 : 0, 0.03);
    this.confused = lerp(this.confused, millis() < this.confusedUntil ? 1 : 0, 0.15);

    // in the sun, he turns to face it (it shines down through the canopy gap)
    if (this.mood === "content") {
      let sunX = (sunbeamTop()[0] + sunbeamTop()[1]) / 2;
      this.facing = sunX < this.x ? -1 : 1;
    }
  }

  // is the mouse (or a finger) over his body?
  isMouseOver() {
    return this.isPointOver(mouseX, mouseY, hitSize());
  }

  // is the point (px, py) over his body? (an oval that roughly covers him;
  // grow makes the oval bigger)
  isPointOver(px, py, grow = 1) {
    let s = this.size;
    let cx = this.x + this.facing * s * 0.03;
    let cy = this.y - s * 0.18 * (1 - this.loopy) - s * 0.55;   // lower when sitting
    return sq((px - cx) / (s * 0.5 * grow)) + sq((py - cy) / (s * 0.62 * grow)) < 1;
  }

  // the player poked him at (px, py)
  poke(px, py) {
    if (this.mood === "dazed") {
      // too blissed out to get annoyed: he just looks confused
      this.dentAt(px, py);
      this.confusedUntil = millis() + 1500;
      return;
    }

    // he steps away from the poke: poked on his left, he steps right
    let dir = px < this.x ? 1 : -1;
    this.startWalk(dir * this.stepSize);

    // dent him (after he turns, since turning flips which side is which)
    this.dentAt(px, py);

    this.annoyedUntil = millis() + 1800;
    this.action = null;   // a poke interrupts a sigh
  }

  // dents his body on the side where (px, py) poked him, and he flinches
  dentAt(px, py) {
    let s = this.size;
    let dx = (px - this.x) * this.facing;
    let dy = py - (this.y - s * 0.18 * (1 - this.loopy) - s * 0.55);
    this.dentAngle = atan2(dy, dx);
    this.dentSpring.value = 1;
    this.dentSpring.speed = 0;
    this.flinchSpring.push(-0.06);
  }

  // Frazzle is hugging him until `until`
  getHugged(until) {
    this.huggedUntil = until;
    this.heartAt = until - 1300;   // near the end, a little heart gives him away
    this.action = null;
  }

  // something bumped into him at (px, py) from the middle of his body: his
  // body dents in a little there (it doesn't annoy him, though)
  bump(px, py) {
    this.dentAngle = atan2(py, px * this.facing);
    this.dentSpring.value = max(this.dentSpring.value, 0.5);
    this.dentSpring.speed = 0;
    this.flinchSpring.push(-0.03);
  }

  // he can't eat another mushroom while he's eating one or still in a daze
  isBusy() {
    return this.eatingSince !== null || this.mood === "dazed";
  }

  // where his mouth is on the screen (the mushroom flies here)
  mouthPosition() {
    let s = this.size;
    return [this.x + this.facing * s * 0.18, this.y - s * 0.18 * (1 - this.loopy) - s * 0.6];
  }

  // a mushroom was dropped on him: he stops and starts eating it
  eatMushroom(m) {
    this.eatingSince = millis();
    this.eatingMushroom = m;
    this.gulped = false;
    this.walking = false;
    this.walkSpeed = 0;
    this.annoyedUntil = 0;
    this.action = null;
  }

  // open wide, chomp, swallow... then the daze begins
  updateEating() {
    if (this.eatingSince === null) return;
    let t = (millis() - this.eatingSince) / EAT_TIME;
    let phase = eatingPhases(min(t, 1));
    this.mouthOpen = phase.open;
    this.swallow = phase.swallow;
    if (t > 0.4 && !this.gulped) {
      this.gulped = true;
      this.flinchSpring.push(-0.05);   // chomp!
    }
    if (t >= 1) {
      this.eatingSince = null;
      this.mouthOpen = 0;
      this.swallow = -1;
      this.dazedUntil = millis() + random(TRIP_MIN, TRIP_MAX);
      this.tripMushroom = this.eatingMushroom;
    }
  }

  startWalk(distance) {
    if (!this.walking) this.gaitPhase = 0;
    this.walkTo = constrain(this.x + distance, this.minX, this.maxX);
    this.walking = this.walkTo !== this.x;
    if (this.walking) {
      this.facing = this.walkTo > this.x ? 1 : -1;
    }
  }

  updateWalk() {
    if (this.walking) {
      // speed up gently, and slow down as he gets close
      let remaining = this.walkTo - this.x;
      this.walkSpeed = min(this.walkSpeed + 0.05, this.maxWalkSpeed, abs(remaining) * 0.06 + 0.35);
      let move = min(this.walkSpeed, abs(remaining)) * Math.sign(remaining);
      this.x += move;

      // his feet are tied to how far he's actually moved, so a planted
      // foot stays put on the ground while his body goes over it
      this.gaitPhase += abs(move) / this.strideLength();

      if (abs(this.walkTo - this.x) < 0.5) {
        this.x = this.walkTo;
        this.walking = false;
        this.walkSpeed = 0;
      }
    }

    // move each foot toward where it should be (the two feet are half a
    // stride apart)
    for (let i = 0; i < this.feet.length; i++) {
      let foot = this.feet[i];
      if (this.walking) {
        let goal = this.footPose((this.gaitPhase + i * 0.5) % 1);
        foot.x = lerp(foot.x, goal.x, 0.4);
        foot.lift = lerp(foot.lift, goal.lift, 0.4);
      } else {
        // when he stops, any foot that isn't under him takes a small step
        // back into place: up while it's still far off, down as it arrives
        foot.x = lerp(foot.x, 0, 0.15);
        let goalLift = abs(foot.x) > 2 ? this.size * 0.035 : 0;
        foot.lift = lerp(foot.lift, goalLift, 0.3);
      }
    }
  }

  // how far he travels in one full stride (two steps)
  strideLength() {
    return this.size * 0.4;
  }

  // where a foot is at point p (0 to 1) in its stride, measured from where
  // it rests when he's standing still
  footPose(p) {
    let half = this.strideLength() / 4;   // how far a foot reaches forward or back
    if (p < 0.5) {
      // planted on the ground: it slides back under him as his body moves forward
      return { x: lerp(half, -half, p / 0.5), lift: 0 };
    }
    // swinging forward through the air in an arc, ready for the next step
    let u = (p - 0.5) / 0.5;
    return { x: lerp(-half, half, smoothstep(u)), lift: sin(u * PI) * this.size * 0.06 };
  }

  // every 12-25 seconds he lets out a big, grumpy sigh
  updateIdleAction() {
    this.sighBreath = 0;
    this.droop = 0;
    this.puff = 0;

    let canSigh = this.mood !== "annoyed" && this.mood !== "dazed" && this.mood !== "hugged";
    if (this.action === null && millis() > this.nextActionAt && canSigh) {
      this.action = "sigh";
      this.actionStart = millis();
    }
    if (this.action === null) return;

    let duration = 2400;
    let t = (millis() - this.actionStart) / duration;   // 0 to 1 through the sigh
    if (t >= 1) {
      this.action = null;
      this.nextActionAt = millis() + random(12000, 25000);
      return;
    }

    if (this.action === "sigh") {
      // breathe in deep... let it all out and deflate a little... recover
      if (t < 0.4) {
        this.sighBreath = 1.6 * sin((t / 0.4) * HALF_PI);
      } else if (t < 0.7) {
        this.sighBreath = lerp(1.6, -1, smoothstep((t - 0.4) / 0.3));
      } else {
        this.sighBreath = lerp(-1, 0, smoothstep((t - 0.7) / 0.3));
      }
      // eyes sag half shut as he deflates, and a puff of air comes out
      this.droop = constrain(-this.sighBreath, 0, 1) * 0.5;
      if (t > 0.42 && t < 0.9) this.puff = (t - 0.42) / 0.48;
    }
  }

  display() {
    let s = this.size;
    let legH = s * 0.18;
    let bottom = -legH;   // y of the bottom of his body

    push();
    translate(this.x, this.y);   // (0, 0) is now the spot between his feet
    scale(this.facing, 1);       // mirror him when facing left

    // soft shadow on the ground
    noStroke();
    fill(0, 0, 0, 45);
    ellipse(s * 0.03, 0, s * 0.8, s * 0.1);

    // in a daze he sits down: his body drops onto the ground
    let sitDrop = this.loopy * legH;

    // order matters: legs first so the body covers their tops
    this.drawLegs(s, legH, sitDrop);

    // breathing: everything above his legs gets a little taller and
    // narrower as he breathes in, stretching up from the bottom of his body
    // (a flinch from a poke squashes it too). While he walks, his body rises
    // as it passes over the planted foot and dips between steps, and he
    // leans forward a little. Basking in the sun, he leans back so his face
    // tips up toward the light. In a daze, he sways slowly side to side.
    let b = this.breath + this.sighBreath;
    let walkAmount = this.walkSpeed / this.maxWalkSpeed;   // 0 standing, 1 full speed
    let bliss = max(0, -this.anger);                       // 0 to 1, how content he is
    let bob = ((1 - cos(this.gaitPhase * TWO_PI * 2)) / 2) * s * 0.025 * walkAmount;
    let sway = sin(millis() * 0.0015) * 0.06 * this.loopy;
    push();
    translate(0, bottom - bob + sitDrop);
    rotate(0.05 * walkAmount - 0.12 * bliss + sway);
    scale((1 - 0.012 * b) * (1 - this.flinch * 0.6), (1 + 0.022 * b) * (1 + this.flinch));
    translate(0, -bottom);

    this.drawSpikes(s, bottom);
    this.drawHair(s, bottom);

    // body, then everything that sits on its surface
    noStroke();
    fill(this.bodyColor);
    this.bodyOutline(s, bottom);
    if (this.swallow >= 0) this.drawSwallowLump(s, bottom);

    push();
    // clip to the body so belly, scales, and face never spill past his edges
    beginClip();
    this.bodyOutline(s, bottom);
    endClip();
    this.drawBelly(s, bottom);
    this.drawScales(s, bottom);
    this.drawFace(s, bottom);
    pop();

    if (this.puff > 0) this.drawPuff(s, bottom);
    if (this.anger > 0.3) this.drawAngerMark(s, bottom);
    if (this.confused > 0.05) this.drawQuestionMark(s, bottom);
    this.drawHeart(s, bottom);

    pop(); // end of breathing
    pop();
  }

  // the cartoon "anger vein" that pops up above his head when he's annoyed
  drawAngerMark(s, bottom) {
    let size = s * 0.09 * map(this.anger, 0.3, 1, 0.3, 1, true);
    push();
    translate(s * 0.32, bottom - s * 1.12);
    stroke(255, 70, 60);
    strokeWeight(s * 0.03);
    noFill();
    // four curves, each bulging toward the middle
    for (let i = 0; i < 4; i++) {
      rotate(HALF_PI);
      arc(size * 0.9, size * 0.9, size * 1.6, size * 1.6, PI + 0.2, PI + HALF_PI - 0.2);
    }
    pop();
  }

  // swallowing: a lump slides down his throat into his belly, bulging out
  // past the edge of his body (the belly and scales get drawn over the part
  // that's inside his outline, so only the bump shows)
  drawSwallowLump(s, bottom) {
    let u = smoothstep(this.swallow);
    let x = lerp(0.44, 0.49, u) * s;
    let y = bottom + lerp(-0.6, -0.32, u) * s;
    let size = s * 0.17 * (1 - u * 0.4);
    noStroke();
    fill(this.bodyColor);
    ellipse(x, y, size, size);
  }

  // the little heart that floats up near the end of a hug: he likes it,
  // even if he won't admit it
  drawHeart(s, bottom) {
    let p = (millis() - this.heartAt) / 1500;   // 0 to 1 while it floats up
    if (p < 0 || p > 1) return;
    noStroke();
    fill(255, 120, 160, 255 * (1 - p * p));
    drawHeart(s * 0.1, bottom - s * (1.3 + p * 0.3), s * 0.07 * (0.6 + 0.4 * p));
  }

  // a "?" that pops up when he's poked in a daze
  drawQuestionMark(s, bottom) {
    push();
    translate(s * 0.3, bottom - s * 1.25);
    // (undo the facing flip so the "?" never shows up backwards)
    scale(this.facing * this.confused, this.confused);
    textAlign(CENTER, CENTER);
    textSize(s * 0.32);
    textStyle(BOLD);
    stroke(this.darkColor);
    strokeWeight(s * 0.03);
    fill(255);
    text("?", 0, 0);
    pop();
  }

  // the little cloud of air from a sigh, drifting out and fading away
  drawPuff(s, bottom) {
    let p = this.puff;
    noStroke();
    fill(255, 255, 255, 160 * (1 - p));
    for (let k = 0; k < 3; k++) {
      let px = s * (0.38 + p * 0.35 + k * 0.06);
      let py = bottom - s * (0.6 + p * 0.1) + k * s * 0.02;
      let size = s * (0.06 + p * 0.08) * (1 - k * 0.2);
      ellipse(px, py, size, size * 0.8);
    }
  }

  bodyOutline(s, bottom) {
    let pts = this.bodyPts;
    beginShape();
    // curveVertex needs to wrap past the start to close the shape smoothly
    for (let i = -1; i <= pts.length + 1; i++) {
      let [x, y] = this.dented(pts[(i + pts.length) % pts.length]);
      curveVertex(x * s, bottom + y * s);
    }
    endShape();
  }

  // pulls a point on his outline in toward his middle if it's near where
  // he got poked (or pushes it out when the dent springs back past zero)
  dented([x, y]) {
    if (abs(this.dent) < 0.001) return [x, y];
    let cx = 0.02;    // the middle of his body
    let cy = -0.55;
    let diff = abs(atan2(y - cy, x - cx) - this.dentAngle);
    if (diff > PI) diff = TWO_PI - diff;   // the short way around the circle
    let amount = max(0, 1 - diff / 1.2) * 0.4 * this.dent;
    return [x + (cx - x) * amount, y + (cy - y) * amount];
  }

  // sitDrop: how far his body has dropped from sitting down (his legs fold
  // under him and his feet stick out in front)
  drawLegs(s, legH, sitDrop) {
    let legW = s * 0.11;
    noStroke();
    // far leg (behind, a bit darker), then near leg
    let legs = [
      [-s * 0.1, lerpColor(this.darkColor, color(0), 0.25)],
      [s * 0.17, this.darkColor],
    ];
    for (let i = 0; i < legs.length; i++) {
      let [lx, c] = legs[i];
      let foot = this.feet[i];

      // each leg swings from its hip (hidden under his body) down to its foot
      let hipY = -legH - s * 0.06 + sitDrop;
      let ankleX = lx + foot.x + s * 0.2 * this.loopy;
      let ankleY = -s * 0.04 - foot.lift;
      stroke(c);
      strokeWeight(legW);
      line(lx, hipY, ankleX, ankleY);

      // foot, toes forward
      noStroke();
      fill(c);
      ellipse(ankleX + legW * 0.4, ankleY + s * 0.005, legW * 2, s * 0.07);

      // two little claws
      fill(240, 230, 210);
      let toeX = ankleX + legW * 1.3;
      for (let cy of [-s * 0.055, -s * 0.02]) {
        triangle(
          toeX - s * 0.02, cy - foot.lift - s * 0.015,
          toeX - s * 0.02, cy - foot.lift + s * 0.015,
          toeX + s * 0.03, cy - foot.lift + s * 0.01
        );
      }
    }
  }

  drawSpikes(s, bottom) {
    noStroke();
    fill(this.darkColor);
    for (let [x, y, len] of this.spikes) {
      // point each spike away from the middle of his body
      let n = createVector(x, y + 0.55).normalize();
      let side = createVector(-n.y, n.x).mult(0.045);
      let base = createVector(x, y).sub(n.copy().mult(0.04));
      let tip = createVector(x, y).add(n.copy().mult(len));
      triangle(
        (base.x + side.x) * s, bottom + (base.y + side.y) * s,
        (base.x - side.x) * s, bottom + (base.y - side.y) * s,
        tip.x * s, bottom + tip.y * s
      );
    }
  }

  drawHair(s, bottom) {
    stroke(this.darkColor);
    strokeWeight(s * 0.035);
    noFill();
    let [hx, hy] = this.hairRoot;
    let i = 0;
    for (let [rootX, lean, len, curl] of this.hair) {
      // each strand sways a tiny bit, a little out of step with the others
      lean += 0.06 * sin(millis() * 0.002 + i);
      i++;
      let x1 = (hx + rootX) * s;
      let y1 = bottom + hy * s;
      // tip of the strand, pointing in the direction it leans
      let x4 = x1 + sin(lean) * len * s;
      let y4 = y1 - cos(lean) * len * s;
      // control points: halfway up, then pulled sideways to curl the tip
      let x2 = x1 + sin(lean) * len * s * 0.5;
      let y2 = y1 - cos(lean) * len * s * 0.5;
      let x3 = x4 + cos(lean) * curl * len * s;
      let y3 = y4 + sin(lean) * curl * len * s;
      bezier(x1, y1, x2, y2, x3, y3, x4, y4);
    }
  }

  drawBelly(s, bottom) {
    let cx = s * 0.25;
    let cy = bottom - s * 0.28;
    let w = s * 0.46;
    let h = s * 0.44;
    noStroke();
    fill(this.bellyColor);
    ellipse(cx, cy, w, h);

    // curved lines across the belly, like reptile belly plates
    stroke(this.darkColor);
    strokeWeight(s * 0.012);
    noFill();
    for (let k of [-0.1, 0, 0.1]) {
      let plateW = w * sqrt(1 - sq(k / (h / s / 2))) * 0.9;
      arc(cx, cy + k * s, plateW, s * 0.08, 0, PI);
    }
  }

  drawScales(s, bottom) {
    stroke(red(this.darkColor), green(this.darkColor), blue(this.darkColor), 140);
    strokeWeight(s * 0.012);
    noFill();
    for (let [x, y] of this.scales) {
      arc(x * s, bottom + y * s, s * 0.09, s * 0.08, 0, PI);
    }
  }

  drawFace(s, bottom) {
    // three-quarter view: the near eye is bigger and closer to the middle,
    // the far eye is smaller and squished toward the front edge
    this.drawEye(s * 0.03, bottom - s * 0.8, s * 0.19, s * 0.19, 1, s);
    this.drawEye(s * 0.24, bottom - s * 0.8, s * 0.12, s * 0.16, -1, s);
    this.drawMouth(s * 0.18, bottom - s * 0.6, s * 0.3, s);

    // a soft, happy blush on his cheeks while he's in a daze (or being hugged)
    let blush = max(this.loopy, this.hugged);
    if (blush > 0.01) {
      noStroke();
      fill(255, 160, 170, 90 * blush);
      ellipse(-s * 0.02, bottom - s * 0.66, s * 0.14, s * 0.07);
      ellipse(s * 0.32, bottom - s * 0.67, s * 0.08, s * 0.06);
    }
  }

  // inward: which direction (+1 or -1) points to the space between his eyes
  drawEye(cx, cy, w, h, inward, s) {
    // eyeball and pupil (lookX and lookY slide the pupil around)
    noStroke();
    fill(255);
    ellipse(cx, cy, w, h);
    fill(30);
    let lx = this.lookX;
    let ly = this.lookY;
    if (this.loopy > 0) {
      // in a daze, both pupils drift slowly together, dreamily gazing upward
      let t = millis() * 0.0009;
      lx = lerp(lx, 0.35 * sin(t), this.loopy);
      ly = lerp(ly, -0.4 + 0.2 * sin(t * 1.7), this.loopy);
    }
    let px = cx + w * (0.05 + 0.2 * lx);
    let py = cy + h * (0.12 + 0.15 * ly);
    ellipse(px, py, w * 0.42, h * 0.42);

    // heavy eyelid: a slice off the top of the eye, with a slanted
    // edge that sits lower toward the middle of his face. When he's content
    // the lid relaxes: it lifts up and levels out so he can gaze at the sun.
    // When he's confused, it lifts even more: wide eyes.
    let bliss = max(0, -this.anger);
    let start = inward > 0 ? PI + 0.35 : PI - 0.15;
    let stop = inward > 0 ? TWO_PI + 0.15 : TWO_PI - 0.35;
    start = lerp(start, PI + 0.6, bliss);
    stop = lerp(stop, TWO_PI - 0.6, bliss);
    start = lerp(start, PI + 1.1, this.confused);
    stop = lerp(stop, TWO_PI - 1.1, this.confused);
    fill(this.lidColor);
    stroke(this.darkColor);
    strokeWeight(s * 0.015);
    arc(cx, cy, w, h, start, stop, CHORD);

    // blinking (or sagging during a sigh, or heavy-lidded and blissful in a
    // daze): a lid slides down over the eye
    let dreamy = 0.15 * this.loopy * (1 - this.confused);
    let b = max(this.blinker.amount(), this.droop, dreamy);
    if (b > 0) {
      let k = lerp(-0.25, HALF_PI, b);
      arc(cx, cy, w, h, PI - k, TWO_PI + k, CHORD);
    }

    // brow, slanting down toward the middle: steeper when he's annoyed,
    // nearly flat when he's content, raised high when he's confused
    let a = this.anger;
    let raise = h * 0.35 * this.confused;
    strokeWeight(s * 0.05);
    line(
      cx - inward * w * 0.55, cy - h * (0.8 + 0.1 * a) - raise,
      cx + inward * w * 0.45, cy - h * (0.5 - 0.15 * a) - raise * 1.3
    );
  }

  drawMouth(cx, mouthY, w, s) {
    // corners droop down into a frown, deeper when he's annoyed. When he's
    // content they turn up and the middle dips, into a small smile.
    // In a daze the smile gets a bit bigger; confusion shrinks it again.
    let annoyed = max(0, this.anger);
    let bliss = max(0, -this.anger) * (1 - 0.6 * this.confused);
    let loopy = this.loopy * (1 - this.confused);
    let cornerY = mouthY + s * (0.05 + 0.03 * annoyed - 0.08 * bliss - 0.03 * loopy);
    let peakY = mouthY - s * (0.04 + 0.015 * annoyed - 0.06 * bliss - 0.02 * loopy);

    push();
    translate(cx, 0);

    // when he opens his mouth, the lips part: the middle opens the most and
    // the corners only a little. up = how far the top lip moves, down = bottom lip
    let gap = this.mouthOpen * s * 0.07;
    let up = -gap * 1.3;
    let down = gap * 1.3;
    let cornerGap = gap * 0.3;

    noStroke();
    if (gap > 0.3) {
      // the dark inside of his mouth, between the two lips
      fill(60, 15, 25);
      beginShape();
      vertex(-w / 2, cornerY - cornerGap);
      bezierVertex(-w * 0.2, peakY + up, w * 0.2, peakY + up, w / 2, cornerY - cornerGap);
      vertex(w / 2, cornerY + cornerGap);
      bezierVertex(w * 0.2, peakY + down, -w * 0.2, peakY + down, -w / 2, cornerY + cornerGap);
      endShape(CLOSE);
    }

    // top lip: its top edge, then back along where the lips meet
    fill(this.lipColor);
    beginShape();
    vertex(-w / 2, cornerY - cornerGap);
    bezierVertex(-w * 0.2, peakY - s * 0.1 + up, w * 0.2, peakY - s * 0.1 + up, w / 2, cornerY - cornerGap);
    bezierVertex(w * 0.2, peakY + up, -w * 0.2, peakY + up, -w / 2, cornerY - cornerGap);
    endShape(CLOSE);

    // bottom lip: where the lips meet, then back along its bottom edge
    beginShape();
    vertex(-w / 2, cornerY + cornerGap);
    bezierVertex(-w * 0.2, peakY + down, w * 0.2, peakY + down, w / 2, cornerY + cornerGap);
    bezierVertex(w * 0.2, peakY + s * 0.13 + down, -w * 0.2, peakY + s * 0.13 + down, -w / 2, cornerY + cornerGap);
    endShape(CLOSE);

    // finds the y of the top of the bottom lip at a given x, by searching
    // along the curve until its x matches (bezier x and t aren't evenly spaced)
    let lipLineY = (x) => {
      let lo = 0;
      let hi = 1;
      for (let i = 0; i < 20; i++) {
        let mid = (lo + hi) / 2;
        if (bezierPoint(-w / 2, -w * 0.2, w * 0.2, w / 2, mid) < x) lo = mid;
        else hi = mid;
      }
      return bezierPoint(cornerY + cornerGap, peakY + down, peakY + down, cornerY + cornerGap, lo);
    };

    // pointy bottom tooth: its base sits right on the lip line,
    // and its tip pokes up over his top lip
    let toothX = w * 0.18;
    let tw = s * 0.075;
    let th = s * 0.1;
    let leftX = toothX - tw / 2;
    let rightX = toothX + tw / 2;
    noStroke();
    fill(250, 245, 225);
    triangle(
      leftX, lipLineY(leftX),
      rightX, lipLineY(rightX),
      toothX, lipLineY(toothX) - th
    );

    // the line where his lips meet (drawn last so it neatly covers
    // the bottom edge of the tooth), only when his mouth is closed
    if (gap <= 0.3) {
      stroke(80, 15, 25);
      strokeWeight(s * 0.02);
      noFill();
      bezier(-w / 2, cornerY, -w * 0.2, peakY, w * 0.2, peakY, w / 2, cornerY);
    }

    pop();
  }
}

class Frazzle {
  constructor(x, y) {
    this.x = x;          // center of his bottom
    this.y = y;          // the ground he sits on
    this.size = 80;      // everything scales from this
    this.facing = 1;     // 1 = facing right, -1 = facing left
    this.wobbleTime = 0; // keeps increasing, so ripples travel around his edge
    this.stretch = 1;    // squash & stretch: >1 = tall and thin, <1 = wide and flat
    this.armRaise = 0.6; // 0 = arms down, 1 = arms straight up
    this.blinker = new Blinker(2000, 5000);

    // squash & stretch works like a spring: stretch is pulled toward
    // stretchGoal, overshoots, and jiggles back, like a jelly bubble
    this.stretchGoal = 1;
    this.stretchSpring = new Spring(1, 0.15, 0.8);

    // where his pupils point, -1 to 1
    this.lookX = 0;
    this.lookY = 0;

    // 1 = bottom squished flat against the ground, 0 = fully round (in the air)
    this.flatten = 1;

    // hopping
    this.hopPhase = "ground";   // "ground", "crouch", "air", "floating", "dizzy", or "hugging"
    this.vx = 0;                // speed sideways
    this.vy = 0;                // speed up/down (negative = up)
    this.nextHopAt = millis() + 1500;
    this.crouchUntil = 0;
    this.minX = 280;            // the area he wanders in (stays out of the cave)
    this.maxX = 770;

    // magic mushroom trip: he floats around the screen
    this.tripUntil = 0;
    this.tripMushroom = null;   // the one he ate (it grows back when his trip ends)
    this.loopy = 0;             // eases 0 to 1 as the trip kicks in
    this.spin = 0;              // his tilt angle
    this.spinGoal = 0;          // the angle he's turning toward
    this.spinSpeed = 0;         // how fast he's spinning while floating (radians per frame)

    // a bounce presses him against the wall for a moment, squishing that side
    this.pressXSpring = new Spring(0, 0.25, 0.7);
    this.pressYSpring = new Spring(0, 0.25, 0.7);
    this.pressX = 0;
    this.pressY = 0;

    // while he's floating, the player can grab him and twist him around
    this.grabbed = false;
    this.lastPointerX = 0;      // where the pointer was last frame
    this.lastPointerY = 0;

    // coming down from a trip leaves him dizzy for a moment
    this.justTripped = false;   // true while he's falling at the end of a trip
    this.dizzyUntil = 0;
    this.restAngle = 0;         // the angle he lies at while dizzy
    this.upsideDown = false;    // did he land upside down?
    this.dizzy = 0;             // eases 0 to 1: googly eyes and sparkles

    // hugging Frank
    this.nextHugAt = millis() + 6000;   // he's ready for a hug after this
    this.hugUntil = 0;
    this.hugSide = 1;           // which side of Frank he's on (-1 left, 1 right)
    this.hugReach = 0;          // 0 to 1, how far his arms are wrapped around

    // landing makes him sink into the ground a little and spring back up,
    // which squishes whatever side he landed on
    this.sinkSpring = new Spring(0, 0.2, 0.7);
    this.sink = 0;

    // eating a mushroom (see eatingPhases)
    this.eatingSince = null;
    this.eatingMushroom = null;
    this.gulped = false;
    this.mouthOpen = 0;         // 0 to 1, opening wide
    this.mouthShut = 0;         // 0 to 1, clamped shut in the chomp
    this.swallow = -1;          // 0 to 1 while it sinks into his body

    this.bodyColor = color(145, 150, 235);
    this.darkColor = color(90, 95, 180);
    this.backArmColor = lerpColor(this.bodyColor, this.darkColor, 0.4);
    this.lidColor = lerpColor(this.bodyColor, this.darkColor, 0.25);
    this.cheekColor = color(255, 140, 170, 80);
  }

  update() {
    this.blinker.update();
    this.wobbleTime += 1 / 60;

    this.updateEating();
    let tripping = millis() < this.tripUntil;
    this.loopy = lerp(this.loopy, tripping ? 1 : 0, 0.04);

    // he turns smoothly toward his goal angle and stays there
    this.spin = lerp(this.spin, this.spinGoal, this.grabbed ? 0.5 : 0.12);

    if (this.hopPhase === "floating") {
      this.float();
      if (!tripping) {
        // the trip wears off: gravity comes back and he drops to the ground,
        // still at whatever angle he was tilted (slipping out of your grip)
        this.grabbed = false;
        this.hopPhase = "air";
        this.justTripped = true;
        this.vx *= 0.3;
        this.vy = 0;
        if (this.tripMushroom) {
          this.tripMushroom.regrow();
          this.tripMushroom = null;
        }
      }
    } else if (this.hopPhase === "dizzy") {
      // rocking a little on the ground while his head stops spinning
      this.stretchGoal = 1;
      this.y = lerp(this.y, GROUND_Y, 0.2);
      this.spinGoal = this.restAngle + sin(millis() * 0.008) * 0.12;
      if (millis() > this.dizzyUntil) {
        this.spinGoal = round(this.spin / TWO_PI) * TWO_PI;
        if (this.upsideDown) {
          // flip back over with a little hop
          this.vx = 0;
          this.vy = -4.5;
          this.stretchSpring.push(0.1);
          this.hopPhase = "air";
        } else {
          // shake it off, and he's back to normal
          this.hopPhase = "ground";
          this.nextHopAt = millis() + random(1200, 3000);
        }
      }
    } else if (this.hopPhase === "hugging") {
      // squish up against Frank and hold on tight
      let toward = -this.hugSide;
      this.x = lerp(this.x, frank.x + this.hugSide * 72, 0.2);
      this.y = lerp(this.y, GROUND_Y, 0.2);
      this.stretchGoal = 0.92;
      this.spinGoal = 0.08 * toward;   // leaning into him
      if (frank.mood === "annoyed") {
        // someone poked Frank, and he shrugs Frazzle right off
        this.endHug();
        this.vx = -toward * 3.5;
        this.vy = -5;
        this.stretchSpring.push(-0.15);
      } else if (millis() > this.hugUntil) {
        this.endHug();
      }
    } else if (this.hopPhase === "ground") {
      // gentle idle bob while he waits (and settle onto the ground, in case
      // he landed tilted a little higher up)
      this.y = lerp(this.y, GROUND_Y, 0.2);
      this.stretchGoal = 1 + 0.03 * sin(millis() * 0.004);
      if (millis() > this.nextHopAt && this.eatingSince === null) {
        this.hopPhase = "crouch";
        this.crouchUntil = millis() + 150;
      }
    } else if (this.hopPhase === "crouch") {
      // squish down to get ready...
      this.stretchGoal = 0.8;
      if (millis() > this.crouchUntil) this.jump();
    } else if (this.hopPhase === "air") {
      // ...and fly! gravity pulls him back down
      this.stretchGoal = 1.15;
      if (this.justTripped || abs(this.spinSpeed) > 0.001) {
        // spinning in the air (falling at the end of a trip, or after
        // bumping Frank): he keeps spinning, slowing down a bit
        this.spin += this.spinSpeed;
        this.spinSpeed *= 0.98;
        this.spinGoal = this.spin;
      }
      this.vy += 0.4;
      this.x += this.vx;
      this.y += this.vy;
      this.bounceOffFrank();   // Frank is solid: no passing through him
      // (only check while he's coming down, so a hop can get off the ground)
      if (this.vy > 0 && this.contactY() >= GROUND_Y) this.land();
    }

    this.stretch = this.stretchSpring.update(this.stretchGoal);
    this.sink = this.sinkSpring.update(0);
    this.pressX = this.pressXSpring.update(0);
    this.pressY = this.pressYSpring.update(0);

    let onGround = ["ground", "crouch", "dizzy", "hugging"].includes(this.hopPhase);
    this.hugReach = lerp(this.hugReach, this.hopPhase === "hugging" ? 1 : 0, this.hopPhase === "hugging" ? 0.15 : 0.3);

    // his eyes eagerly follow the mouse
    let goalX = 0;
    let goalY = 0;
    if (mouseIsOnScreen()) {
      let headY = this.y - this.size * 0.42;
      goalX = constrain(((mouseX - this.x) * this.facing) / 140, -1, 1);
      goalY = constrain((mouseY - headY) / 140, -1, 1);
    }
    this.lookX = lerp(this.lookX, goalX, 0.35);
    this.lookY = lerp(this.lookY, goalY, 0.35);
    this.dizzy = lerp(this.dizzy, this.hopPhase === "dizzy" ? 1 : 0, 0.15);

    // his bottom is only flat while he's touching the ground
    this.flatten = lerp(this.flatten, onGround ? 1 : 0, 0.3);

    // arms sway gently, and fly up while he's in the air (and wave while floating)
    let armGoal = 0.55 + 0.1 * sin(millis() * 0.003);
    if (this.hopPhase === "air") armGoal = 0.95;
    if (this.hopPhase === "floating") armGoal = 0.85 + 0.15 * sin(millis() * 0.006);
    if (this.hopPhase === "dizzy") armGoal = 0.3 + 0.2 * sin(millis() * 0.01);   // flopping
    this.armRaise = lerp(this.armRaise, armGoal, 0.15);
  }

  // drifting around the screen, bouncing off the edges
  float() {
    this.stretchGoal = 1 + 0.06 * sin(millis() * 0.003);

    // spin: you control it while you're holding him; otherwise it carries
    // on by itself and the air slowly calms it down
    if (this.grabbed) {
      this.twistToPointer();
    } else {
      this.spin += this.spinSpeed;
      this.spinSpeed *= 0.99;
    }
    this.spinGoal = this.spin;

    this.x += this.vx;
    this.y += this.vy;
    this.bounceOffWalls();

    // he's a floaty little guy: after a bounce, he eases back to his
    // gentle drifting speed (so he never gets stuck or zooms off)
    let speed = sqrt(this.vx * this.vx + this.vy * this.vy);
    if (speed > 0.01) {
      let fix = lerp(1, FLOAT_SPEED / speed, 0.02);
      this.vx *= fix;
      this.vy *= fix;
    }
    if (abs(this.vx) > 0.5) this.facing = this.vx > 0 ? 1 : -1;
  }

  // his body as an oval: [half its width, half its height] before tilting
  bodyRadii() {
    return [(this.size * 0.65) / this.stretch, this.size * 0.42 * this.stretch];
  }

  // the point on the edge of his tilted oval that sticks out farthest in
  // direction (nx, ny), measured from the middle of his body. This is the
  // spot that touches a wall in that direction.
  edgePointToward(nx, ny) {
    let [a, b] = this.bodyRadii();
    let c = cos(this.spin);
    let sn = sin(this.spin);
    // turn the direction into his own (untilted) view...
    let lx = nx * c + ny * sn;
    let ly = -nx * sn + ny * c;
    // ...find the farthest point of the oval that way...
    let k = sqrt(a * a * lx * lx + b * b * ly * ly);
    let px = (a * a * lx) / k;
    let py = (b * b * ly) / k;
    // ...and tilt it back to the screen's view
    return [px * c - py * sn, px * sn + py * c];
  }

  // Bouncing like a real object: the exact spot of his oval that touches
  // the wall gets pushed back. If that spot isn't lined up with his middle
  // (he's tilted), the push also sets him spinning, and a little grip
  // against the wall makes him roll.
  bounceOffWalls() {
    let s = this.size;

    // each wall: which way is "out" (nx, ny), and where it is
    let walls = [
      [-1, 0, 0],          // left edge of the screen
      [1, 0, width],       // right edge
      [0, -1, -5],         // top (5 pixels down from the edge)
      [0, 1, GROUND_Y],    // the ground
    ];
    for (let [nx, ny, wallAt] of walls) {
      let midX = this.x;
      let midY = this.y - s * 0.36;
      let [rx, ry] = this.edgePointToward(nx, ny);

      // how far that edge point pokes past the wall
      let poke = (midX + rx) * nx + (midY + ry) * ny - wallAt;
      if (poke <= 0) continue;

      // move him back inside, then bounce
      this.x -= nx * poke;
      this.y -= ny * poke;
      this.bounceAt(rx, ry, nx, ny);
    }

    this.bounceOffFrank();
  }

  // The bounce itself, at the spot (rx, ry) on his body (measured from his
  // middle), against something in direction (nx, ny) from him. Returns
  // true if he was actually moving into it (so it really was a bump).
  bounceAt(rx, ry, nx, ny) {
    let s = this.size;
    let [a, b] = this.bodyRadii();
    let heaviness = (a * a + b * b) / 4;   // how hard he is to spin (for an oval)

    // how fast the touching spot is moving into it
    // (his own movement, plus the spot swinging around as he spins)
    let spotVX = this.vx - this.spinSpeed * ry;
    let spotVY = this.vy + this.spinSpeed * rx;
    let intoWall = spotVX * nx + spotVY * ny;
    if (intoWall <= 0) return false;

    // the push back, pointing away from what he hit
    let pushX = -nx;
    let pushY = -ny;
    let twist = rx * pushY - ry * pushX;   // how much this push would spin him
    let push = ((1 + BOUNCINESS) * intoWall) / (1 + (twist * twist) / heaviness);
    this.vx += push * pushX;
    this.vy += push * pushY;
    this.spinSpeed += (twist * push) / heaviness;

    // grip: it drags on the touching spot as it slides along, which rolls
    // him a little
    let alongX = -pushY;
    let alongY = pushX;
    let sliding = spotVX * alongX + spotVY * alongY;
    let rollTwist = rx * alongY - ry * alongX;
    let grip = -sliding / (1 + (rollTwist * rollTwist) / heaviness);
    grip = constrain(grip, -WALL_GRIP * push, WALL_GRIP * push);
    this.vx += grip * alongX;
    this.vy += grip * alongY;
    this.spinSpeed += (rollTwist * grip) / heaviness;

    // squish: he presses into it a little and springs back
    let squish = min(intoWall * 2.5, s * 0.1);
    this.pressXSpring.value += nx * squish;
    this.pressYSpring.value += ny * squish;
    this.stretchSpring.push(-0.03);
    return true;
  }

  // Frank is solid too: floating into him, Frazzle bounces off his round
  // body the same way he bounces off the walls, and Frank's body dents in a
  // little where he got bumped.
  bounceOffFrank() {
    let s = this.size;
    let fs = frank.size;
    // Frank's body as an oval (sitting lower when he's in a daze)
    let fx = frank.x + frank.facing * fs * 0.03;
    let fy = frank.y - fs * 0.18 * (1 - frank.loopy) - fs * 0.55;
    let frx = fs * 0.47;
    let fry = fs * 0.55;

    // the direction from Frank's middle to Frazzle's middle
    let dx = this.x - fx;
    let dy = this.y - s * 0.36 - fy;
    let d = sqrt(dx * dx + dy * dy);
    if (d < 1) return;
    dx /= d;
    dy /= d;

    // how far Frank's oval reaches toward Frazzle, and Frazzle's toward Frank
    let frankReach = 1 / sqrt(sq(dx / frx) + sq(dy / fry));
    let [ex, ey] = this.edgePointToward(-dx, -dy);
    let frazzleReach = -(ex * dx + ey * dy);
    let overlap = frankReach + frazzleReach - d;
    if (overlap <= 0) return;

    // straight out from Frank's surface at the spot where they touch
    let px = dx * frankReach;
    let py = dy * frankReach;
    let nx = px / (frx * frx);
    let ny = py / (fry * fry);
    let len = sqrt(nx * nx + ny * ny);
    nx /= len;
    ny /= len;

    // push Frazzle back out, then bounce him off
    this.x += nx * overlap;
    this.y += ny * overlap;
    let [rx, ry] = this.edgePointToward(-nx, -ny);
    if (this.bounceAt(rx, ry, -nx, -ny)) frank.bump(px, py);

    // landing on top of Frank's round head, he slides off to one side
    // instead of balancing up there
    if (this.hopPhase === "air" && ny < -0.6) {
      this.vx += (dx >= 0 ? 1 : -1) * 0.6;
    }
  }

  // how low his body reaches on the screen at his current tilt (not counting
  // the little bit at the bottom that always squishes flat on the ground)
  contactY() {
    let s = this.size;
    let a = this.spin;
    let reach = sqrt(sq(s * 0.65 * sin(a)) + sq(s * 0.42 * cos(a)));
    return this.y - s * 0.36 + reach - s * 0.06;
  }

  // is the mouse (or a finger) over his body?
  isMouseOver() {
    return this.isPointOver(mouseX, mouseY, hitSize());
  }

  // is the point (px, py) over his body? (an oval that matches his squash &
  // stretch; grow makes the oval bigger)
  isPointOver(px, py, grow = 1) {
    let s = this.size;
    let cy = this.y - s * 0.36 * this.stretch;
    let rx = ((s * 0.65) / this.stretch) * grow;
    let ry = s * 0.42 * this.stretch * grow;
    return sq((px - this.x) / rx) + sq((py - cy) / ry) < 1;
  }

  // grabbed while floating: you can twist him around as he drifts
  grab() {
    this.grabbed = true;
    this.lastPointerX = mouseX;
    this.lastPointerY = mouseY;
    this.stretchSpring.push(-0.05);   // a little squish as you grab him
    this.giggle();
  }

  letGo() {
    this.grabbed = false;
  }

  // drag around him to turn him, like turning a knob. Only the pointer's
  // movement counts, so his own drifting never turns him: if you hold
  // still, he keeps his angle.
  twistToPointer() {
    // from the middle of his body out to the pointer...
    let rx = mouseX - this.x;
    let ry = mouseY - (this.y - this.size * 0.36);
    // ...and how far the pointer moved since last frame
    let dx = mouseX - this.lastPointerX;
    let dy = mouseY - this.lastPointerY;
    // the part of that movement that goes *around* him (not toward or away
    // from him) is how far he turns, in radians. Right over his middle it
    // would jump around, so ignore it there.
    let r2 = rx * rx + ry * ry;
    let turned = r2 > 64 ? (rx * dy - ry * dx) / r2 : 0;
    this.spin += turned;
    // remember how fast you're turning him, so a flick keeps him spinning
    // after you let go (and letting go slowly leaves him where he is)
    this.spinSpeed = lerp(this.spinSpeed, turned, 0.3);
    this.lastPointerX = mouseX;
    this.lastPointerY = mouseY;
  }

  // the player poked him at (px, py)
  poke(px, py) {
    if (this.hopPhase === "ground" || this.hopPhase === "crouch") {
      if (this.eatingSince !== null) return;   // not with his mouth full!

      // where on him was he poked? -1 = his left edge, 0 = middle, 1 = right edge
      let side = constrain((px - this.x) / (this.size * 0.65), -1, 1);
      if (abs(side) < 0.35) {
        // poked in the middle: a big, happy hop straight up
        this.vx = 0;
        this.vy = -8.5;
      } else {
        // poked on a side: he hops away from it, farther the nearer the edge
        let dir = side < 0 ? 1 : -1;
        this.facing = dir;
        this.vx = dir * map(abs(side), 0.35, 1, 1.8, 3);
        this.vy = -6.5;
      }
      this.stretchSpring.push(0.12);
      this.hopPhase = "air";
    }
  }

  // plays the giggle sound, if one has been added (see giggleSound at the top)
  giggle() {
    if (giggleSound) giggleSound.play();
  }

  // he can't eat another mushroom while he's eating one or still floating
  isBusy() {
    return this.eatingSince !== null || ["floating", "dizzy", "hugging"].includes(this.hopPhase);
  }

  // where his mouth is on the screen (the mushroom flies here)
  mouthPosition() {
    let s = this.size;
    return [this.x + (this.facing * s * 0.28) / this.stretch, this.y - s * 0.22 * this.stretch];
  }

  // a mushroom was dropped on him: he starts eating it
  eatMushroom(m) {
    this.eatingSince = millis();
    this.eatingMushroom = m;
    this.gulped = false;
  }

  // open wide, chomp, swallow... then the trip begins
  updateEating() {
    if (this.eatingSince === null) return;
    let t = (millis() - this.eatingSince) / EAT_TIME;
    let phase = eatingPhases(min(t, 1));
    this.mouthOpen = phase.open;
    this.mouthShut = phase.shut;
    this.swallow = phase.swallow;
    if (t > 0.4 && !this.gulped) {
      this.gulped = true;
      this.stretchSpring.push(-0.06);   // chomp!
    }
    if (t >= 1) {
      this.eatingSince = null;
      this.mouthOpen = 0;
      this.mouthShut = 0;
      this.swallow = -1;
      this.startTrip(this.eatingMushroom);
    }
  }

  startTrip(m) {
    this.spinSpeed = 0;
    this.tripUntil = millis() + random(FRAZZLE_TRIP_MIN, FRAZZLE_TRIP_MAX);
    this.tripMushroom = m;
    this.hopPhase = "floating";
    // drift off upward at a random angle
    let a = random(-PI * 0.8, -PI * 0.2);
    this.vx = cos(a) * 1.8;
    this.vy = sin(a) * 1.8;
    this.stretchSpring.push(0.1);
  }

  jump() {
    // wander: pick a direction, turning around near the edges of his area
    let dir = random([-1, 1]);
    if (this.x < this.minX + 60) dir = 1;
    if (this.x > this.maxX - 60) dir = -1;
    if (random() < 0.3) {
      // a little excited bounce in place
      this.vx = 0;
      this.vy = -random(3.5, 4.5);
    } else {
      this.facing = dir;
      this.vx = dir * random(1.5, 2.5);
      this.vy = -random(5.5, 7.5);
    }
    this.stretchSpring.push(0.08);   // a little extra stretch as he springs up
    this.hopPhase = "air";
  }

  land() {
    this.vx = 0;
    this.vy = 0;
    this.spinSpeed = 0;
    // sink in a little and spring back: squishes the side that hit the ground
    this.sinkSpring.value = 0.07;
    this.sinkSpring.speed = 0;

    // which way up did he land? (a is his tilt, from 0 to TWO_PI)
    let a = ((this.spin % TWO_PI) + TWO_PI) % TWO_PI;
    this.upsideDown = a > PI * 0.55 && a < PI * 1.45;

    if (this.justTripped || this.upsideDown) {
      // coming down from a trip (or landing on his head): dizzy for a moment
      this.justTripped = false;
      this.restAngle = this.upsideDown ? this.spin - a + PI : round(this.spin / TWO_PI) * TWO_PI;
      this.spinGoal = this.restAngle;
      this.stretchSpring.push(-0.12);
      this.hopPhase = "dizzy";
      this.dizzyUntil = millis() + (this.upsideDown ? random(1500, 2200) : random(1200, 1800));
      return;
    }
    // only a little tilted: he just turns upright
    this.spinGoal = round(this.spin / TWO_PI) * TWO_PI;

    this.flatten = 1;                 // squish flat the moment he lands
    this.stretchSpring.push(-0.12);   // splat! the spring jiggles him back into shape
    this.hopPhase = "ground";
    this.nextHopAt = millis() + random(1200, 4500);

    // landed right next to Frank (on his own, or because the player poked
    // him over)? hug time, or a bounce if Frank's grumpy
    if (this.wantsHug() && abs(frank.x - this.x) < 110) this.meetFrank();
  }

  // ready for a hug: it's been long enough since the last one
  wantsHug() {
    return millis() > this.nextHugAt;
  }

  meetFrank() {
    let toward = frank.x > this.x ? 1 : -1;
    this.nextHugAt = millis() + 10000;   // about 10 seconds before the next one
    this.facing = toward;

    if (frank.mood === "annoyed") {
      // Frank's too grumpy: boing! Frazzle bounces right off him
      // (landing already squished him, so just a little extra)
      this.vx = -toward * 3.5;
      this.vy = -5;
      this.hopPhase = "air";
      this.stretchSpring.push(-0.04);
      frank.flinchSpring.push(-0.04);
      return;
    }

    this.hopPhase = "hugging";
    this.hugSide = -toward;
    this.hugUntil = millis() + 3000;
    frank.getHugged(this.hugUntil);
  }

  // let go of Frank and hop back a little
  endHug() {
    let toward = -this.hugSide;
    this.hopPhase = "air";
    this.vx = -toward * 1.2;
    this.vy = -3.5;
    this.spinGoal = 0;
    this.nextHugAt = millis() + 10000;
    frank.huggedUntil = min(frank.huggedUntil, millis());
  }

  display() {
    let s = this.size;

    push();
    // (0, 0) is now the middle of his bottom (sunk in a bit just after landing)
    translate(this.x + this.pressX, this.y + this.sink * s + this.pressY);

    // soft shadow on the ground: smaller and fainter the higher he hops
    let lift = GROUND_Y - (this.y + this.sink * s + this.pressY);
    noStroke();
    fill(0, 0, 0, map(lift, 0, 80, 45, 12, true));
    ellipse(0, lift, s * map(lift, 0, 80, 1.3, 0.7, true), s * 0.12);

    // tilt around the middle of his body (when poked while floating)
    translate(0, -s * 0.36);
    rotate(this.spin);
    translate(0, s * 0.36);

    // mirror him when facing left, and squash/stretch his whole body
    // (narrower when taller, wider when flatter, like a jelly bubble)
    scale(this.facing / this.stretch, this.stretch);

    // back arm goes behind his body (when he's hugging, it reaches around
    // behind Frank instead; see drawBehindFrank)
    if (this.hugReach < 0.05) this.drawArm(s, -1);

    noStroke();
    fill(this.bodyColor);
    this.bodyOutline(s);

    push();
    // clip to the body so the shine and face stay inside his edges
    beginClip();
    this.bodyOutline(s);
    endClip();
    this.drawShine(s);
    if (this.swallow >= 0) this.drawSwallowedMushroom(s);
    this.drawFace(s);
    pop();

    // front arm goes over his body (or across Frank's front, when hugging)
    if (this.hugReach < 0.05) this.drawArm(s, 1);
    else this.drawHugArm(s, true);

    pop();

    if (this.dizzy > 0.02) this.drawDizzySparkles(s);
  }

  // While hugging, his back arm reaches around behind Frank. It's drawn
  // before Frank (using the same moves as display), so Frank's body covers
  // it and only the hand peeks out on the far side.
  drawBehindFrank() {
    if (this.hugReach < 0.05) return;
    let s = this.size;
    push();
    translate(this.x + this.pressX, this.y + this.sink * s + this.pressY);
    translate(0, -s * 0.36);
    rotate(this.spin);
    translate(0, s * 0.36);
    scale(this.facing / this.stretch, this.stretch);
    this.drawHugArm(s, false);
    pop();
  }

  // a long, stretchy jelly arm wrapping around Frank. inFront = the arm
  // across the front of Frank's belly; otherwise the one behind him
  drawHugArm(s, inFront) {
    let d = abs(frank.x - this.x) * this.stretch;   // distance to Frank
    let sx = s * 0.5;                                 // shoulder
    let sy = inFront ? -s * 0.36 : -s * 0.46;
    let goalX = d + (inFront ? 25 : 48);              // the hand ends past Frank's middle
    let hx = lerp(sx, goalX, this.hugReach);
    let hy = inFront ? -s * 0.62 : -s * 0.78;
    let c = inFront ? this.bodyColor : this.backArmColor;
    stroke(c);
    strokeWeight(s * 0.1);
    noFill();
    bezier(sx, sy, sx + (hx - sx) * 0.3, sy - s * 0.25, hx - (hx - sx) * 0.2, hy - s * 0.1, hx, hy);
    noStroke();
    fill(c);
    ellipse(hx, hy, s * 0.15, s * 0.15);
  }

  // little pastel sparkles circling above him while he's dizzy
  drawDizzySparkles(s) {
    let colors = [color(255, 170, 220), color(170, 230, 255), color(255, 240, 150), color(190, 255, 190)];
    noStroke();
    for (let i = 0; i < 5; i++) {
      let a = millis() * 0.004 + (i * TWO_PI) / 5;
      let x = this.x + cos(a) * s * 0.5;
      let y = this.y - s * 0.9 + sin(a) * s * 0.12;
      let c = colors[i % colors.length];
      fill(red(c), green(c), blue(c), 230 * this.dizzy);
      drawSparkle(x, y, s * 0.06 * (0.8 + 0.3 * sin(a * 3)));
    }
  }

  // he's a see-through jelly, so you can watch the mushroom he swallowed
  // sink down inside him and dissolve
  drawSwallowedMushroom(s) {
    let u = smoothstep(this.swallow);
    let x = lerp(0.26, 0.02, u) * s;
    let y = lerp(-0.26, -0.12, u) * s;
    let size = s * 0.2 * (1 - 0.5 * u);
    let alpha = 230 * (1 - u * u);   // fades out mostly at the end
    noStroke();
    fill(240, 230, 210, alpha);   // stem
    rect(x - size * 0.12, y - size * 0.35, size * 0.24, size * 0.4, size * 0.08);
    fill(225, 80, 170, alpha);    // cap
    arc(x, y - size * 0.3, size, size * 0.7, PI, TWO_PI, CHORD);
  }

  // a wide oval whose edge ripples gently, like the surface of a bubble
  bodyOutline(s) {
    let rx = s * 0.65;
    let ry = s * 0.42;
    let n = 24;
    let t = this.wobbleTime;
    beginShape();
    // curveVertex needs to wrap past the start to close the shape smoothly
    for (let i = -1; i <= n + 1; i++) {
      let a = (TWO_PI * i) / n;
      // two soft waves travelling around his edge in opposite directions
      let f = 1 + 0.03 * sin(2 * a + t * 3) + 0.02 * sin(3 * a - t * 2);
      let x = cos(a) * rx * f;
      let y = -ry * 0.85 + sin(a) * ry * f;   // sit the oval a little low
      [x, y] = this.squishAgainstEdges(x, y, s);
      curveVertex(x, y);
    }
    endShape();
  }

  // If this point of his outline would end up past the ground (or, while
  // he's floating, past the edges of the screen) after he's tilted and
  // squashed, press it flat against that edge instead. That squishes
  // whichever side of him is touching it.
  // (this.flatten blends between fully round and fully squished on the ground)
  squishAgainstEdges(x, y, s) {
    let floating = this.hopPhase === "floating";
    let groundAmount = floating ? 1 : this.flatten;
    if (groundAmount < 0.01) return [x, y];

    let cy = -s * 0.36;                      // he tilts around this point
    let k = cos(this.spin);
    let n = sin(this.spin);
    // where his origin is on the screen right now
    let originX = this.x + this.pressX;
    let originY = this.y + this.sink * s + this.pressY;

    // where this point ends up on screen: squash/stretch, then tilt
    let sx = (x * this.facing) / this.stretch;
    let sy = y * this.stretch - cy;
    let qx = sx * k - sy * n;
    let qy = sx * n + sy * k + cy;

    // press it back inside the ground (and the screen's edges, if floating)
    let newX = qx;
    let newY = qy;
    if (originY + qy > GROUND_Y) newY = lerp(qy, GROUND_Y - originY, groundAmount);
    if (floating) {
      if (originX + qx < 0) newX = -originX;
      if (originX + qx > width) newX = width - originX;
      if (originY + qy < 5) newY = 5 - originY;
    }
    if (newX === qx && newY === qy) return [x, y];

    // work backward to his own coordinates
    newY -= cy;
    let ux = newX * k + newY * n;
    let uy = -newX * n + newY * k;
    return [(ux * this.stretch) / this.facing, (uy + cy) / this.stretch];
  }

  // side: 1 = front arm (facing side), -1 = back arm
  drawArm(s, side) {
    let shoulderX = side * s * 0.55;
    let shoulderY = -s * 0.28;
    // angle of the arm: 0.5 points down and out, -1.1 points up and out
    let a = lerp(0.5, -1.1, this.armRaise);
    if (side < 0) a = PI - a;   // mirror for the back arm
    let len = s * 0.32;

    let handX = shoulderX + cos(a) * len;
    let handY = shoulderY + sin(a) * len;
    // bend the arm a little so it looks like a noodle, not a stick
    // (side flips the bend so both arms curve the same way)
    let bendX = shoulderX + cos(a + 0.5 * side) * len * 0.6;
    let bendY = shoulderY + sin(a + 0.5 * side) * len * 0.6;

    let c = side > 0 ? this.bodyColor : this.backArmColor;
    stroke(c);
    strokeWeight(s * 0.1);
    noFill();
    bezier(shoulderX, shoulderY, bendX, bendY, bendX, bendY, handX, handY);
    noStroke();
    fill(c);
    ellipse(handX, handY, s * 0.15, s * 0.15);
  }

  // a soft highlight so he looks a little squishy and shiny
  drawShine(s) {
    push();
    translate(-s * 0.3, -s * 0.56);
    rotate(-0.4);
    noStroke();
    fill(255, 255, 255, 90);
    ellipse(0, 0, s * 0.25, s * 0.12);
    pop();
  }

  drawFace(s) {
    // three-quarter view, like Frank: near eye bigger, far eye squished
    // (the 5th value is which way is "outward" for that eye's lashes)
    this.drawEye(s * 0.12, -s * 0.42, s * 0.26, s * 0.26, -1, s);
    this.drawEye(s * 0.4, -s * 0.42, s * 0.18, s * 0.25, 1, s);

    // plump cheeks: body-colored bulges that push up the bottom of each
    // eye into a happy curve, with a rosy blush on top
    noStroke();
    fill(this.bodyColor);
    ellipse(s * 0.1, -s * 0.255, s * 0.3, s * 0.12);
    ellipse(s * 0.42, -s * 0.255, s * 0.22, s * 0.11);
    fill(this.cheekColor);
    ellipse(s * 0.06, -s * 0.25, s * 0.12, s * 0.07);
    ellipse(s * 0.46, -s * 0.255, s * 0.08, s * 0.06);

    // big open smile with a little tongue (it opens extra wide to eat,
    // then clamps shut for the chomp)
    let mx = s * 0.28;
    let my = -s * 0.22;
    let mw = s * 0.3 * (1 + 0.25 * this.mouthOpen);
    let mh = s * 0.2 * (1 + 0.9 * this.mouthOpen) * (1 - 0.85 * this.mouthShut);
    fill(70, 30, 60);
    arc(mx, my, mw, mh, 0, PI, CHORD);
    fill(240, 120, 150);
    ellipse(mx + mw * 0.05, my + mh * 0.32, mw * 0.45, mh * 0.35);
  }

  // outward: which direction (+1 or -1) points away from his other eye
  drawEye(cx, cy, w, h, outward, s) {
    if (this.hugReach > 0.5) {
      // squeezing his eyes shut with joy: happy curved lines
      stroke(this.darkColor);
      strokeWeight(s * 0.035);
      noFill();
      arc(cx, cy + h * 0.1, w * 0.8, h * 0.6, PI + 0.3, TWO_PI - 0.3);
      arc(cx, cy - h * 0.75, w * 0.8, h * 0.4, PI + 0.4, TWO_PI - 0.4);   // brow
      return;
    }

    // big round eye with a large pupil and a sparkle
    // (lookX and lookY slide the pupil around; the sparkle moves with it)
    noStroke();
    fill(255);
    ellipse(cx, cy, w, h);
    let lx = this.lookX;
    let ly = this.lookY;
    if (this.loopy > 0) {
      // tripping: each pupil drifts around in its own wobbly circle
      let t = millis() * 0.003 + outward * 1.7;
      lx = lerp(lx, cos(t), this.loopy);
      ly = lerp(ly, sin(t * 1.4) * 0.8, this.loopy);
    }
    if (this.dizzy > 0) {
      // dizzy: googly eyes, each pupil wobbling around in its own circle
      let t = millis() * 0.005 + outward * 1.9;
      lx = lerp(lx, cos(t) * 0.9, this.dizzy);
      ly = lerp(ly, sin(t * 1.3) * 0.7, this.dizzy);
    }
    let px = cx + w * (0.08 + 0.12 * lx);
    let py = cy + h * (-0.02 + 0.12 * ly);
    fill(30);
    ellipse(px, py, w * 0.6, h * 0.6);
    fill(255);
    ellipse(px + w * 0.1, py - h * 0.16, w * 0.18, h * 0.18);

    // light eyelid: a crescent that hugs the top of the eye, following
    // its curve, thickest in the middle and tapering at the ends
    // (smaller lidAngle = lid wraps further down the sides,
    //  bigger thick = heavier lid)
    let lidAngle = 0.35;
    let thick = 0.3;
    let steps = 12;
    fill(this.lidColor);
    stroke(this.darkColor);
    strokeWeight(s * 0.015);
    beginShape();
    // outer edge: along the top of the eye, left to right
    for (let i = 0; i <= steps; i++) {
      let a = lerp(PI + lidAngle, TWO_PI - lidAngle, i / steps);
      vertex(cx + cos(a) * (w / 2), cy + sin(a) * (h / 2));
    }
    // inner edge: back right to left, pulled in toward the eye's center
    for (let i = steps; i >= 0; i--) {
      let a = lerp(PI + lidAngle, TWO_PI - lidAngle, i / steps);
      let r = 1 - thick * sin(PI * (i / steps));
      vertex(cx + cos(a) * (w / 2) * r, cy + sin(a) * (h / 2) * r);
    }
    endShape(CLOSE);

    // blinking: a lid slides down until it covers the whole eye
    let b = this.blinker.amount();
    if (b > 0) {
      let k = lerp(-0.4, HALF_PI, b);
      arc(cx, cy, w, h, PI - k, TWO_PI + k, CHORD);
    }

    // two little lashes flicking out from the outer end of the lid
    let lashX = cx + outward * (w / 2) * cos(lidAngle);
    let lashY = cy - (h / 2) * sin(lidAngle);
    let len = s * 0.05;
    strokeWeight(s * 0.018);
    for (let [inset, angle] of [[0, 0.5], [w * 0.12, 1.0]]) {
      let x1 = lashX - outward * inset;
      let y1 = lashY - inset * 0.3;
      line(x1, y1, x1 + outward * cos(angle) * len, y1 - sin(angle) * len);
    }

    // raised, curious brow
    stroke(this.darkColor);
    strokeWeight(s * 0.035);
    noFill();
    arc(cx, cy - h * 0.75, w * 0.8, h * 0.4, PI + 0.4, TWO_PI - 0.4);
  }
}

// A number that springs toward a goal: it speeds up toward the goal,
// overshoots, and wobbles back and forth before settling.
// (Frazzle's jiggle uses one.)
class Spring {
  constructor(value, stiffness, friction) {
    this.value = value;
    this.speed = 0;
    this.stiffness = stiffness;   // bigger = snappier
    this.friction = friction;     // closer to 1 = wobbles for longer
  }

  update(goal) {
    this.speed += (goal - this.value) * this.stiffness;
    this.speed *= this.friction;
    this.value += this.speed;
    return this.value;
  }

  // give it a sudden shove
  push(amount) {
    this.speed += amount;
  }
}

// The steps of eating a mushroom, for t going from 0 to 1:
// open wide (while the mushroom flies in), chomp shut, then swallow.
function eatingPhases(t) {
  return {
    open: t < 0.3 ? smoothstep(t / 0.3) : 1 - smoothstep((t - 0.3) / 0.1),
    shut: t > 0.38 && t < 0.65 ? sin(map(t, 0.38, 0.65, 0, PI)) : 0,
    swallow: t > 0.45 ? (t - 0.45) / 0.55 : -1,   // -1 = not swallowing yet
  };
}

// a heart shape centered at (x, y)
function drawHeart(x, y, r) {
  beginShape();
  vertex(x, y + r * 0.9);
  bezierVertex(x - r * 1.4, y - r * 0.2, x - r * 0.6, y - r * 1.2, x, y - r * 0.45);
  bezierVertex(x + r * 0.6, y - r * 1.2, x + r * 1.4, y - r * 0.2, x, y + r * 0.9);
  endShape(CLOSE);
}

// a little four-pointed sparkle centered at (x, y)
function drawSparkle(x, y, r) {
  beginShape();
  for (let i = 0; i < 8; i++) {
    let a = (i * TWO_PI) / 8 - HALF_PI;
    let d = i % 2 === 0 ? r : r * 0.3;
    vertex(x + cos(a) * d, y + sin(a) * d);
  }
  endShape(CLOSE);
}

// is the mouse inside the canvas?
function mouseIsOnScreen() {
  return mouseX > 0 && mouseX < width && mouseY > 0 && mouseY < height;
}

// eases from 0 to 1 smoothly: starts slow, speeds up, slows down at the end
function smoothstep(x) {
  x = constrain(x, 0, 1);
  return x * x * (3 - 2 * x);
}

// Keeps track of when to blink. Each creature has its own Blinker.
// amount() is 0 when the eyes are open and 1 when they're shut.
class Blinker {
  constructor(minGap, maxGap) {
    this.minGap = minGap;      // shortest wait between blinks (milliseconds)
    this.maxGap = maxGap;      // longest wait
    this.duration = 160;       // how long one blink takes
    this.startedAt = -1000;
    this.nextAt = millis() + random(minGap, maxGap);
  }

  update() {
    if (millis() > this.nextAt) {
      this.startedAt = millis();
      // now and then, a quick double blink
      if (random() < 0.2) this.nextAt = millis() + 260;
      else this.nextAt = millis() + random(this.minGap, this.maxGap);
    }
  }

  amount() {
    let t = (millis() - this.startedAt) / this.duration;
    if (t < 0 || t > 1) return 0;
    return sin(t * PI);   // closes, then opens again
  }
}

class SunBeam {
  // The beam comes in through the canopy between topLeft and topRight
  // (at the top of the screen) and slants down to a sunny patch on the
  // ground between groundLeft and groundRight.
  constructor(topLeft, topRight, groundLeft, groundRight) {
    this.topLeft = topLeft;
    this.topRight = topRight;
    this.groundLeft = groundLeft;
    this.groundRight = groundRight;
    this.color = color(255, 240, 170);
  }

  // is this x position (like Frank's feet) inside the sunny patch?
  // margin widens the patch a little on each side
  isInLight(x, margin = 0) {
    return x > this.groundLeft - margin && x < this.groundRight + margin;
  }

  display() {
    noStroke();
    let r = red(this.color);
    let g = green(this.color);
    let b = blue(this.color);

    // soft glow: a few faint copies of the beam, each a little wider,
    // stacked so the middle is brightest and the edges fade out
    for (let i = 3; i >= 0; i--) {
      let spread = i * 10;
      fill(r, g, b, 22);
      quad(
        this.topLeft - spread * 0.5, 0,
        this.topRight + spread * 0.5, 0,
        this.groundRight + spread, GROUND_Y,
        this.groundLeft - spread, GROUND_Y
      );
    }

    // warm pool of light where it hits the ground
    let cx = (this.groundLeft + this.groundRight) / 2;
    let w = this.groundRight - this.groundLeft;
    fill(255, 235, 150, 70);
    ellipse(cx, GROUND_Y + 3, w * 1.4, 16);
    fill(255, 245, 190, 70);
    ellipse(cx, GROUND_Y + 3, w * 0.9, 9);
  }
}

class Mushroom {
  constructor(x, y) {
    this.homeX = x;      // where it grows (the bottom of its stem)
    this.homeY = y;
    this.x = x;          // where it is right now
    this.y = y;
    this.size = 32;
    this.state = "ready";   // "ready", "held", "returning", "beingEaten", "eaten", or "growing"
    this.growth = 1;        // 0 to 1, how grown it is (it shrinks to 0 when eaten)
    this.eater = null;      // who's eating it
    this.eatStart = 0;
    this.dropX = x;         // where it was let go
    this.dropY = y;
    this.bite = 1;          // shrinks to 0 as it disappears into a mouth
    this.capColor = color(225, 80, 170);
    this.rimColor = color(195, 60, 145);
    this.glowColor = color(255, 140, 220, 18);
  }

  update() {
    if (this.state === "held") {
      // follow the mouse, holding it by the cap (on a touchscreen, hold it
      // up above the fingertip so your finger doesn't hide it)
      let [px, py] = pointerInSketch();
      this.x = px;
      this.y = py + this.size * 0.55 - (usingTouch ? this.size * 1.4 : 0);
    } else if (this.state === "returning") {
      // float back to where it grew
      this.x = lerp(this.x, this.homeX, 0.2);
      this.y = lerp(this.y, this.homeY, 0.2);
      if (dist(this.x, this.y, this.homeX, this.homeY) < 1) {
        this.x = this.homeX;
        this.y = this.homeY;
        this.state = "ready";
      }
    } else if (this.state === "beingEaten") {
      // fly into the eater's open mouth, shrinking as it goes in
      let t = min(1, (millis() - this.eatStart) / (EAT_TIME * 0.34));
      let [mx, my] = this.eater.mouthPosition();
      this.bite = 1 - smoothstep(t);
      // aim the middle of the cap (not the bottom of the stem) at the mouth
      this.x = lerp(this.dropX, mx, smoothstep(t));
      this.y = lerp(this.dropY, my + this.size * 0.6 * this.bite, smoothstep(t));
      if (t >= 1) this.state = "eaten";
    } else if (this.state === "growing") {
      this.growth = min(1, this.growth + 1 / 180);   // about 3 seconds
      if (this.growth >= 1) this.state = "ready";
    }
  }

  // can only be grabbed when it's fully grown and sitting in its spot
  // (with a finger, the grab area is quite a bit bigger)
  isMouseOver() {
    if (this.state !== "ready") return false;
    let reach = this.size * (usingTouch ? 1.0 : 0.6);
    return dist(mouseX, mouseY, this.x, this.y - this.size * 0.55) < reach;
  }

  pickUp() {
    this.state = "held";
    this.eater = null;
  }

  // let go: feed it to whoever it was dropped on, or float it back home.
  // What counts is where the mushroom's cap is (on a touchscreen that's a
  // little above your finger), and a near miss still counts.
  drop(creatures) {
    let capX = this.x;
    let capY = this.y - this.size * 0.55;
    for (let c of creatures) {
      if (c.isPointOver(capX, capY, 1.2) && !c.isBusy()) {
        c.eatMushroom(this);
        this.state = "beingEaten";
        this.eater = c;
        this.eatStart = millis();
        this.dropX = this.x;
        this.dropY = this.y;
        this.bite = 1;
        return;
      }
    }
    this.state = "returning";
  }

  // called when the creature who ate it comes down from their trip
  regrow() {
    this.x = this.homeX;
    this.y = this.homeY;
    this.growth = 0;
    this.bite = 1;
    this.state = "growing";
  }

  display() {
    if (this.state === "eaten") return;
    let s = this.size * smoothstep(this.growth);
    if (this.state === "beingEaten") s *= this.bite;
    push();
    translate(this.x, this.y);
    // it dangles and sways a little while you carry it
    if (this.state === "held") rotate(sin(millis() * 0.01) * 0.15);
    noStroke();

    // magical glow around the cap: faint layers, brightest in the middle
    fill(this.glowColor);
    ellipse(0, -s * 0.75, s * 1.9, s * 1.4);
    ellipse(0, -s * 0.75, s * 1.5, s * 1.1);
    ellipse(0, -s * 0.75, s * 1.15, s * 0.85);

    // stem, slightly curvy
    fill(240, 230, 210);
    beginShape();
    vertex(-s * 0.14, 0);
    bezierVertex(-s * 0.16, -s * 0.3, -s * 0.08, -s * 0.5, -s * 0.1, -s * 0.65);
    vertex(s * 0.1, -s * 0.65);
    bezierVertex(s * 0.08, -s * 0.5, s * 0.16, -s * 0.3, s * 0.14, 0);
    endShape(CLOSE);

    // cap and the rim underneath it
    fill(this.capColor);
    arc(0, -s * 0.6, s, s * 0.8, PI, TWO_PI, CHORD);
    fill(this.rimColor);
    ellipse(0, -s * 0.6, s, s * 0.12);

    // white spots
    fill(255, 245, 250);
    ellipse(-s * 0.22, -s * 0.78, s * 0.14, s * 0.11);
    ellipse(s * 0.12, -s * 0.88, s * 0.12, s * 0.1);
    ellipse(s * 0.3, -s * 0.68, s * 0.09, s * 0.08);
    ellipse(-s * 0.02, -s * 0.7, s * 0.08, s * 0.07);

    pop();
  }
}

// ---------------------------------------------------------------------------
// FOREST SCENERY
// The scenery never moves, so instead of redrawing thousands of leaves and
// grass blades every frame, we paint it ONCE in setup() and save it as an
// image (a "layer"). draw() then just stamps those images onto the screen.
// ---------------------------------------------------------------------------

let backdrop;     // everything behind the creatures
let foreground;   // rocks and grass in front of the creatures

function paintScenery() {
  // a fixed seed makes the random forest come out the same every time
  randomSeed(7);
  backdrop = paintLayer(() => {
    drawSky();
    drawTrees();
    drawCanopy();
    drawUnderbrush();
    drawCave();
    drawGround();
  });
  foreground = paintLayer(drawForeground);
  // un-fix the seed so everything else stays unpredictable
  randomSeed(Date.now());
}

// runs some drawing code on a blank canvas and returns the result as an image
function paintLayer(paint) {
  clear();
  paint();
  let img = get();
  clear();
  return img;
}

// where the sunbeam enters the canopy (the SunBeam in setup uses this too)
function sunbeamTop() {
  return [470, 505];
}

function drawSky() {
  // misty green that gets lighter toward the forest floor
  strokeWeight(1);
  for (let y = 0; y < GROUND_Y; y++) {
    stroke(lerpColor(color(35, 60, 40), color(120, 150, 110), y / GROUND_Y));
    line(0, y, width, y);
  }
}

function drawTrees() {
  // far trees: pale and thin, spread across the whole width
  for (let i = 0; i < 16; i++) {
    let x = (i + 0.5) * (width / 16) + random(-15, 15);
    drawTree(x, random(12, 26), color(125, 155, 125), false);
  }
  drawMist(90);

  // middle trees
  for (let i = 0; i < 9; i++) {
    let x = (i + 0.5) * (width / 9) + random(-25, 25);
    drawTree(x, random(28, 44), color(85, 110, 80), false);
  }
  drawMist(40);

  // near trees: dark and thick, placed by hand to frame the scene
  for (let [x, w] of [[340, 56], [690, 62], [790, 50]]) {
    drawTree(x, w, color(70, 55, 45), true);
  }
}

// a see-through layer that makes the trees behind it fade into the distance
function drawMist(alpha) {
  noStroke();
  fill(150, 180, 150, alpha);
  rect(0, 0, width, GROUND_Y);
}

function drawTree(x, w, col, isNear) {
  // the trunk's center line leans and wanders a little, so it isn't
  // ruler-straight; it's narrower at the top and flares into roots
  let lean = random(-12, 12);
  let wobble = random(TWO_PI);
  let flareY = GROUND_Y - w * 0.9;   // where the roots start to spread
  let centerAt = (y) => {
    let t = y / flareY;              // 0 at the top, 1 where the roots start
    return x + lean * (1 - t) + sin(t * 4 + wobble) * w * 0.06;
  };
  let halfAt = (y) => (w / 2) * (0.75 + 0.25 * min(y / flareY, 1));

  noStroke();
  fill(col);
  traceTrunk(centerAt, halfAt, flareY, w);

  if (isNear || w > 26) {
    // shaded right side, so the trunk looks round
    fill(lerpColor(col, color(0), 0.22));
    beginShape();
    for (let y = -10; y <= flareY; y += 20) {
      vertex(centerAt(y) + halfAt(y) * 0.35, y);
    }
    for (let y = flareY; y >= -10; y -= 20) {
      vertex(centerAt(y) + halfAt(y), y);
    }
    endShape(CLOSE);
  }

  if (isNear) {
    let barkColor = lerpColor(col, color(0), 0.4);

    // bark: wavy lines that follow the trunk's curve, broken up here and there
    stroke(barkColor);
    strokeWeight(2);
    for (let k of [-0.6, -0.25, 0.1, 0.45]) {
      for (let y = 20; y < flareY + w * 0.3; y += 14) {
        if (random() < 0.18) continue;
        let x1 = centerAt(y) + k * halfAt(y) + sin(y * 0.05 + k * 10) * 1.5;
        let x2 = centerAt(y + 14) + k * halfAt(y + 14) + sin((y + 14) * 0.05 + k * 10) * 1.5;
        line(x1, y, x2, y + 14);
      }
    }

    // a knot where an old branch used to be
    let ky = random(140, 280);
    let kx = centerAt(ky) + halfAt(ky) * random(-0.3, 0.2);
    noStroke();
    fill(barkColor);
    ellipse(kx, ky, w * 0.2, w * 0.32);
    fill(lerpColor(col, color(0), 0.15));
    ellipse(kx, ky, w * 0.1, w * 0.17);

    // a couple of roots snaking out along the ground
    stroke(col);
    strokeWeight(w * 0.14);
    noFill();
    let bx = centerAt(flareY);
    bezier(bx - w * 0.3, GROUND_Y - w * 0.2, bx - w * 0.6, GROUND_Y - 2,
      bx - w * 0.9, GROUND_Y, bx - w * 1.4, GROUND_Y + 4);
    bezier(bx + w * 0.3, GROUND_Y - w * 0.2, bx + w * 0.7, GROUND_Y - 4,
      bx + w * 1.0, GROUND_Y, bx + w * 1.5, GROUND_Y + 5);
  }
}

// draws a trunk outline: down the left edge, out along the left root,
// across the ground, up the right root, and back up the right edge
function traceTrunk(centerAt, halfAt, flareY, w) {
  let lx = centerAt(flareY) - halfAt(flareY);
  let rx = centerAt(flareY) + halfAt(flareY);
  beginShape();
  for (let y = -10; y < flareY; y += 20) {
    vertex(centerAt(y) - halfAt(y), y);
  }
  vertex(lx, flareY);
  bezierVertex(lx, flareY + w * 0.5, lx - w * 0.25, GROUND_Y - w * 0.1,
    lx - w * 0.6, GROUND_Y + 3);
  vertex(rx + w * 0.6, GROUND_Y + 3);
  bezierVertex(rx + w * 0.25, GROUND_Y - w * 0.1, rx, flareY + w * 0.5,
    rx, flareY);
  for (let y = flareY - 20; y >= -10; y -= 20) {
    vertex(centerAt(y) + halfAt(y), y);
  }
  endShape(CLOSE);
}

function drawCanopy() {
  noStroke();
  // bright sky peeking through the gap where the sunbeam enters
  // (a few layers, so its edge glows softly instead of a hard circle)
  let [left, right] = sunbeamTop();
  let gapX = (left + right) / 2;
  let w = right - left;
  fill(255, 245, 200, 60);
  ellipse(gapX, 0, w * 3.2, 110);
  fill(255, 245, 200, 120);
  ellipse(gapX, 0, w * 2.6, 85);
  fill(255, 245, 200);
  ellipse(gapX, 0, w * 2.0, 60);

  // clusters of leaves across the top, leaving the gap open
  for (let i = 0; i < 50; i++) {
    let x = random(-40, width + 40);
    let r = random(40, 75);
    if (abs(x - gapX) < r + 15) continue;
    drawLeafCluster(x, random(-20, 60), r, r * 0.4,
      color(28, 55, 32), color(75, 120, 55), gapX);
  }

  // a few vines hanging down from the canopy
  for (let [x, len] of [[395, 95], [565, 70], [748, 120]]) {
    drawVine(x, 40, len);
  }
}

// a clump of leaves: a shadowy middle with leaves sticking out all around.
// avoidX (optional) keeps leaves out of the sunbeam's gap.
function drawLeafCluster(cx, cy, r, leafLen, dark, light, avoidX) {
  noStroke();
  fill(lerpColor(dark, light, 0.15));
  ellipse(cx, cy, r * 1.3, r * 1.1);

  let count = floor(r * 1.0);
  for (let i = 0; i < count; i++) {
    let a = random(TWO_PI);
    let d = r * random(0.25, 0.85);
    let x = cx + cos(a) * d;
    let y = cy + sin(a) * d * 0.85;
    if (avoidX !== undefined && abs(x - avoidX) < 24 && y < 70) continue;
    // leaves near the top of the clump catch more light
    let t = constrain(random(0.1, 0.75) - sin(a) * 0.25 * (d / r), 0, 1);
    fill(lerpColor(dark, light, t));
    // point each leaf roughly outward from the middle
    drawLeaf(x, y, leafLen * random(0.8, 1.2), a + random(-0.6, 0.6));
  }
}

// one pointed leaf, starting at (x, y) and pointing in direction angle
function drawLeaf(x, y, len, angle) {
  push();
  translate(x, y);
  rotate(angle);
  beginShape();
  vertex(0, 0);
  bezierVertex(len * 0.3, -len * 0.28, len * 0.75, -len * 0.22, len, 0);
  bezierVertex(len * 0.75, len * 0.22, len * 0.3, len * 0.28, 0, 0);
  endShape();
  pop();
}

function drawVine(x, y, len) {
  let px = x;
  let py = y;
  for (let i = 1; i <= 12; i++) {
    let t = i / 12;
    let nx = x + sin(t * 5 + x) * 6;
    let ny = y + t * len;
    stroke(50, 85, 40);
    strokeWeight(2);
    line(px, py, nx, ny);
    // a leaf every other step, alternating sides
    if (i % 2 === 0) {
      noStroke();
      fill(lerpColor(color(45, 85, 40), color(85, 130, 60), random()));
      drawLeaf(nx, ny, 10, i % 4 === 0 ? 0.6 : PI - 0.6);
    }
    px = nx;
    py = ny;
  }
}

// a patch of moss: lots of little bumps, darker underneath and lighter on
// top, with a few tiny sprigs poking up
function drawMoss(x, y, w, h) {
  let shades = [color(55, 90, 40), color(80, 120, 50), color(115, 155, 65)];
  let n = floor((w * h) / 18) + 6;
  noStroke();
  for (let layer = 0; layer < 3; layer++) {
    fill(shades[layer]);
    for (let i = 0; i < n / (layer + 1); i++) {
      let a = random(TWO_PI);
      let d = sqrt(random());   // spreads bumps evenly over the patch
      let bx = x + cos(a) * d * (w / 2);
      let by = y + sin(a) * d * (h / 2) - layer * h * 0.12;
      let bs = random(3, 7) * (1 - layer * 0.2);
      ellipse(bx, by, bs * 1.3, bs);
    }
  }
  stroke(shades[2]);
  strokeWeight(1);
  for (let i = 0; i < w / 8; i++) {
    let sx = x + random(-w / 2, w / 2) * 0.8;
    let sy = y - h * 0.3 + random(-2, 2);
    line(sx, sy, sx + random(-2, 2), sy - random(2, 5));
  }
}

// a few wiggly strands of moss dangling down from (x, y)
function drawHangingMoss(x, y, len) {
  for (let i = 0; i < 3; i++) {
    let sx = x + random(-6, 6);
    let l = len * random(0.5, 1);
    stroke(70, 110, 50);
    strokeWeight(1.5);
    let px = sx;
    let py = y;
    for (let t = 0.1; t <= 1; t += 0.1) {
      let nx = sx + sin(t * 6 + i) * 2;
      let ny = y + t * l;
      line(px, py, nx, ny);
      px = nx;
      py = ny;
    }
    noStroke();
    fill(90, 130, 60);
    for (let k = 0; k < 4; k++) {
      ellipse(sx + random(-2, 2), y + random(0, l), 3, 4);
    }
  }
  drawMoss(x, y, 18, 6);
}

// the outline of the cave's rock: a back wall on the left and an overhang
// reaching right (used to fill the rock, and to clip its texture)
const CAVE_ROCK = [
  [0, 85], [55, 70], [130, 82], [200, 115], [250, 160], [285, 205],
  [292, 225],                                   // tip of the ledge
  [272, 236], [235, 238], [185, 233], [120, 232], // underside of the ledge
  [70, 240], [38, 268], [26, 320], [24, GROUND_Y], [0, GROUND_Y],
];

// the dark inside of the cave, where Frank hides
// (its top reaches up behind the rock so no sky peeks through the seam)
const CAVE_INSIDE = [
  [24, GROUND_Y], [26, 320], [30, 250], [60, 222], [250, 222],
  [242, 245], [225, 300], [215, GROUND_Y],
];

function drawShape(points) {
  beginShape();
  for (let [x, y] of points) vertex(x, y);
  endShape(CLOSE);
}

function drawCave() {
  let rockColor = color(100, 95, 88);
  let rockDark = color(60, 56, 52);
  let rockLight = color(135, 128, 118);
  let caveColor = color(50, 46, 42);

  // shadow spilling out of the cave: faint layers that reach less far out
  // each time, so it gets darker toward the cave
  noStroke();
  fill(red(caveColor), green(caveColor), blue(caveColor), 55);
  for (let k = 0; k < 4; k++) {
    drawShape([
      [200, 236], [272 - k * 8, 236], [272 - k * 12, 300],
      [300 - k * 22, GROUND_Y], [200, GROUND_Y],
    ]);
  }

  // inside of the cave, getting darker toward the back
  fill(caveColor);
  drawShape(CAVE_INSIDE);
  push();
  beginClip();
  drawShape(CAVE_INSIDE);
  endClip();
  fill(20, 18, 16, 40);
  for (let d = 320; d > 60; d -= 40) {
    ellipse(60, 340, d, d * 0.9);
  }
  // faint rock shapes on the back wall
  stroke(68, 63, 58);
  strokeWeight(1.5);
  noFill();
  line(50, 260, 95, 250);
  line(95, 250, 120, 262);
  line(160, 248, 205, 258);
  line(40, 330, 62, 300);
  pop();

  // the rock itself
  noStroke();
  fill(rockColor);
  drawShape(CAVE_ROCK);

  // everything in this block is clipped to the rock, so it can't spill out
  push();
  beginClip();
  drawShape(CAVE_ROCK);
  endClip();

  // angular faces in slightly different shades, like chunks of stone
  let faces = [
    [color(112, 106, 98), [[0, 85], [55, 70], [130, 82], [120, 130], [60, 150], [0, 140]]],
    [color(104, 98, 91), [[60, 150], [120, 130], [160, 185], [140, 215], [70, 222]]],
    [color(95, 90, 83), [[120, 130], [130, 82], [200, 115], [250, 160], [230, 190], [160, 185]]],
    [color(88, 83, 77), [[160, 185], [230, 190], [285, 205], [292, 225], [180, 208]]],
    [color(78, 74, 68), [[180, 208], [292, 225], [272, 236], [150, 236], [140, 215]]],
    [color(84, 80, 74), [[0, 140], [60, 150], [70, 222], [38, 268], [24, 320], [24, GROUND_Y], [0, GROUND_Y]]],
  ];
  stroke(70, 66, 61, 120);
  strokeWeight(1);
  for (let [c, pts] of faces) {
    fill(c);
    drawShape(pts);
  }

  // layers in the stone, running roughly along the slope of the rock
  noFill();
  stroke(72, 68, 63, 130);
  strokeWeight(1.5);
  for (let [base, slope] of [[118, 0.36], [160, 0.3], [196, 0.14], [300, 0]]) {
    beginShape();
    for (let x = 0; x <= 300; x += 10) {
      vertex(x, base + x * slope + sin(x * 0.07 + base) * 3);
    }
    endShape();
  }

  // speckles of lighter and darker grit
  noStroke();
  for (let i = 0; i < 260; i++) {
    fill(random() < 0.5 ? color(130, 124, 115, 140) : color(70, 66, 60, 140));
    ellipse(random(0, 300), random(70, GROUND_Y), random(1.5, 3.5));
  }

  // pale lichen spots
  for (let i = 0; i < 7; i++) {
    let lx = random(10, 250);
    let ly = random(95, 200);
    fill(185, 195, 125, 170);
    for (let k = 0; k < 8; k++) {
      ellipse(lx + random(-6, 6), ly + random(-4, 4), random(2, 4));
    }
  }
  pop();

  // light along the top edge where the light hits it
  noStroke();
  fill(rockLight);
  drawShape([
    [8, 90], [55, 76], [130, 88], [200, 121], [250, 166],
    [196, 132], [128, 100], [55, 90],
  ]);

  // the inner edge of the cave mouth catches a little light
  stroke(118, 112, 104);
  strokeWeight(2);
  noFill();
  beginShape();
  for (let [x, y] of [[24, GROUND_Y], [26, 320], [38, 268], [70, 240], [120, 232], [185, 233], [235, 238], [272, 236]]) {
    vertex(x, y);
  }
  endShape();

  // cracks, each with a thin light edge so they look carved in
  let cracks = [
    [60, 110, 90, 150], [90, 150, 80, 190], [150, 125, 172, 170],
    [172, 170, 165, 205], [225, 175, 248, 205], [12, 200, 14, 280],
    [100, 170, 118, 196], [200, 140, 214, 160],
  ];
  for (let [x1, y1, x2, y2] of cracks) {
    stroke(rockLight);
    strokeWeight(1);
    line(x1 + 1.5, y1 + 1, x2 + 1.5, y2 + 1);
    stroke(rockDark);
    strokeWeight(2);
    line(x1, y1, x2, y2);
  }

  // loose stones at the bottom of the wall and by the opening
  drawStone(10, GROUND_Y + 2, 24);
  drawStone(36, GROUND_Y + 3, 13);
  drawStone(208, GROUND_Y + 2, 18);
  drawStone(230, GROUND_Y + 3, 11);
  drawStone(247, GROUND_Y + 4, 8);

  // roots dangling from the ledge, from the trees growing on top
  for (let [x, len] of [[92, 26], [140, 38], [168, 20], [214, 30]]) {
    drawHangingRoot(x, 233, len);
  }

  // moss growing over the top, and dangling off the ledge
  drawMoss(30, 82, 55, 16);
  drawMoss(100, 78, 70, 18);
  drawMoss(170, 102, 50, 14);
  drawMoss(232, 145, 34, 12);
  drawMoss(268, 188, 20, 8);
  drawMoss(10, 230, 16, 40);
  drawHangingMoss(200, 233, 22);
  drawHangingMoss(250, 238, 30);
  drawHangingMoss(278, 233, 18);

  // a couple of ferns and some grass growing on top of the rock
  drawFern(62, 80, 30);
  drawFern(205, 120, 24);
  strokeWeight(1.5);
  for (let i = 0; i < 40; i++) {
    let x = random(5, 260);
    let y = caveTopAt(x) + 3;
    stroke(lerpColor(color(60, 100, 45), color(115, 160, 70), random()));
    line(x, y, x + random(-3, 3), y - random(4, 10));
  }
}

// the y of the top edge of the cave rock at a given x
function caveTopAt(x) {
  let top = CAVE_ROCK.slice(0, 7);   // the points along the top, left to right
  for (let i = 0; i < top.length - 1; i++) {
    let [x1, y1] = top[i];
    let [x2, y2] = top[i + 1];
    if (x >= x1 && x <= x2) return map(x, x1, x2, y1, y2);
  }
  return top[top.length - 1][1];
}

// a small, angular stone; (x, y) is the middle of its bottom
function drawStone(x, y, size) {
  let pts = [];
  for (let i = 0; i < 7; i++) {
    let a = PI + (PI * i) / 6;   // around the top half
    let r = size * random(0.4, 0.55);
    pts.push([x + cos(a) * r * 1.3, y + sin(a) * r]);
  }
  noStroke();
  fill(lerpColor(color(85, 80, 74), color(115, 110, 102), random()));
  drawShape(pts);
  // light on the top-left facet
  fill(140, 134, 124);
  drawShape([pts[1], pts[2], pts[3], [x - size * 0.1, y - size * 0.25]]);
}

// a thin, wiggly root hanging down from (x, y), with a couple of side shoots
function drawHangingRoot(x, y, len) {
  stroke(100, 75, 55);
  strokeWeight(2);
  noFill();
  let px = x;
  let py = y;
  for (let t = 0.1; t <= 1.001; t += 0.1) {
    let nx = x + sin(t * 7 + x) * 3;
    let ny = y + t * len;
    line(px, py, nx, ny);
    if (random() < 0.25) {
      strokeWeight(1);
      line(nx, ny, nx + random(-6, 6), ny + random(4, 8));
      strokeWeight(2);
    }
    px = nx;
    py = ny;
  }
}

function drawGround() {
  // grassy ground, darker toward the bottom of the screen
  strokeWeight(1);
  for (let y = GROUND_Y; y < height; y++) {
    let t = (y - GROUND_Y) / (height - GROUND_Y);
    stroke(lerpColor(color(70, 105, 50), color(38, 62, 32), t));
    line(0, y, width, y);
  }

  // grass blades scattered all over, plus a thick fringe along the top
  let blades = [];
  for (let i = 0; i < 380; i++) {
    blades.push([random(width), random(GROUND_Y + 6, height + 4), random(6, 16)]);
  }
  for (let i = 0; i < 180; i++) {
    blades.push([random(width), GROUND_Y + random(0, 5), random(7, 14)]);
  }
  // draw from back (top) to front (bottom) so nearer blades overlap
  blades.sort((a, b) => a[1] - b[1]);
  strokeWeight(2);
  for (let [x, y, h] of blades) {
    stroke(lerpColor(color(55, 95, 40), color(110, 160, 70), random()));
    line(x, y, x + random(-4, 4), y - h);
  }
}

// bushes, boulders, the fallen tree, and ferns that sit behind the creatures
function drawUnderbrush() {
  for (let [bx, bw] of [[255, 80], [445, 90], [548, 70]]) {
    for (let i = 0; i < 4; i++) {
      drawLeafCluster(bx + random(-bw / 2, bw / 2), GROUND_Y - random(8, 30),
        random(18, 28), 11, color(30, 62, 36), color(70, 115, 52));
    }
  }

  drawBoulder(300, GROUND_Y + 2, 58, 34);
  drawBoulder(326, GROUND_Y + 4, 34, 20);
  drawFallenTree();

  drawFern(365, GROUND_Y + 4, 60);
  drawFern(470, GROUND_Y + 4, 50);
}

// big rocks and tall grass along the bottom edge, in front of everything
function drawForeground() {
  drawBoulder(70, height + 25, 150, 80);
  drawBoulder(165, height + 15, 70, 40);
  drawBoulder(600, height + 30, 170, 85);

  strokeWeight(2.5);
  for (let cx of [250, 335, 455, 705, 785]) {
    for (let i = 0; i < 12; i++) {
      let x = cx + random(-18, 18);
      stroke(lerpColor(color(40, 75, 35), color(70, 110, 45), random()));
      line(x, height + 2, x + random(-8, 8), height + 2 - random(18, 34));
    }
  }
}

// a rounded, mossy rock; (x, y) is the middle of its bottom
function drawBoulder(x, y, w, h) {
  let cy = y - h / 2;
  noStroke();
  fill(95, 92, 85);
  ellipse(x, cy, w, h);
  // shadow on the lower half
  fill(72, 70, 64);
  arc(x, cy, w, h, 0.15, PI - 0.15, CHORD);
  // highlight
  fill(125, 120, 110);
  ellipse(x - w * 0.18, cy - h * 0.22, w * 0.25, h * 0.15);
  // moss growing over the top
  drawMoss(x + w * 0.05, cy - h * 0.3, w * 0.65, h * 0.35);
}

// an old tree that fell a long time ago: a big broken trunk, a smaller log,
// and snapped branches, all overgrown with moss, fungus, and a fern
function drawFallenTree() {
  // a snapped branch sticking up behind the trunk, with a twig
  drawFallenLog(797, 285, 760, 362, 3, 6, true);
  drawFallenLog(806, 300, 783, 318, 1.5, 2.5, true);
  // a broken stub of an old branch
  drawFallenLog(683, 345, 692, 372, 4, 6, true);

  // the main trunk: snapped off on the left, rising off the right edge
  drawFallenLog(652, 390, 840, 335, 25, 30, true);

  // shelf fungus growing out of the trunk's side
  drawShelfFungus(742, 362, 26);
  drawShelfFungus(757, 352, 20);
  drawShelfFungus(727, 370, 16);

  // a smaller old log that rolled in front, half sunk into the ground
  drawFallenLog(700, 394, 812, 381, 11, 12, false);

  // a fern sprouting out of the top of the trunk
  drawFern(785, 333, 30);
}

// a log lying from (x1, y1) to (x2, y2), with radius r1 at the first end
// and r2 at the other. brokenEnd = jagged splinters at the first end
// instead of an old cut end with rings.
function drawFallenLog(x1, y1, x2, y2, r1, r2, brokenEnd) {
  let len = dist(x1, y1, x2, y2);
  push();
  translate(x1, y1);
  rotate(atan2(y2 - y1, x2 - x1));   // now the log runs along the x axis

  // body, a little thicker at one end
  noStroke();
  fill(125, 100, 78);
  quad(0, -r1, len, -r2, len, r2, 0, r1);
  // shading underneath
  fill(92, 72, 55);
  quad(0, r1 * 0.35, len, r2 * 0.35, len, r2, 0, r1);

  // bark grain: short broken lines
  stroke(85, 66, 50);
  strokeWeight(1.5);
  for (let i = 0; i < len / 6; i++) {
    let gx = random(r1, len - 4);
    let gy = random(-0.7, 0.3) * lerp(r1, r2, gx / len);
    line(gx, gy, gx + random(10, 28), gy + random(-1, 1));
  }

  noStroke();
  if (brokenEnd) {
    // splintered wood, jagged where it snapped
    fill(185, 155, 115);
    beginShape();
    vertex(r1 * 0.3, -r1);
    let teeth = 6;
    for (let i = 0; i <= teeth; i++) {
      let y = lerp(-r1, r1, i / teeth);
      let x = i % 2 === 0 ? random(-r1 * 0.9, -r1 * 0.4) : random(0, r1 * 0.3);
      vertex(x, y);
    }
    vertex(r1 * 0.3, r1);
    endShape(CLOSE);
  } else {
    // an old cut end with rings, gone dark with age
    fill(170, 140, 105);
    ellipse(0, 0, r1, r1 * 2);
    noFill();
    stroke(120, 95, 70);
    strokeWeight(1);
    ellipse(0, 0, r1 * 0.65, r1 * 1.3);
    ellipse(0, 0, r1 * 0.3, r1 * 0.6);
  }

  // moss growing along the top
  for (let mx = r1 * 0.5; mx < len; mx += random(18, 34)) {
    let r = lerp(r1, r2, mx / len);
    drawMoss(mx, -r * 0.85, random(22, 40), r * random(0.5, 0.9));
  }
  pop();
}

// a shelf (bracket) fungus: little half-moon shelves stuck to a log
function drawShelfFungus(x, y, size) {
  noStroke();
  fill(205, 130, 60);
  arc(x, y, size, size * 0.55, 0, PI, CHORD);
  fill(230, 175, 100);
  arc(x, y, size * 0.75, size * 0.35, 0, PI, CHORD);
  fill(235, 210, 160);
  arc(x, y, size * 0.45, size * 0.18, 0, PI, CHORD);
}

// a fern: fronds fanning out from the base, drooping toward their tips
function drawFern(x, y, size) {
  stroke(85, 140, 60);
  strokeWeight(2);
  for (let a of [-2.6, -2.1, -1.57, -1.05, -0.55]) {
    let px = x;
    let py = y;
    let steps = 8;
    for (let i = 1; i <= steps; i++) {
      let t = i / steps;
      // the more a frond leans sideways, the more its tip droops
      let droop = size * 0.6 * t * t * abs(cos(a));
      let nx = x + cos(a) * size * t;
      let ny = y + sin(a) * size * t + droop;
      line(px, py, nx, ny);

      // little leaflets on both sides, shorter toward the tip
      let leaf = size * 0.18 * (1 - t * 0.8);
      let dir = atan2(ny - py, nx - px);
      line(nx, ny, nx + cos(dir - 1.1) * leaf, ny + sin(dir - 1.1) * leaf);
      line(nx, ny, nx + cos(dir + 1.1) * leaf, ny + sin(dir + 1.1) * leaf);

      px = nx;
      py = ny;
    }
  }
}

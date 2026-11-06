// Frank & Frazzle sound lab
//
// Two kinds of sound here:
//  - your files, loaded and played with p5.sound (loadSound, play, loop)
//  - sounds made in code. Each one is a tiny recipe: a tone or a burst of
//    hiss, plus a "shape" that says how loud it is and how its pitch moves
//    over a fraction of a second. They use the Web Audio building blocks
//    that p5.sound itself runs on (oscillators, filters, gains).
//
// Browsers stay silent until the first click or tap, so every button calls
// startSound() first.

let woodsFile, stepFile, bassFile;   // your files
let ac;          // the audio context: the browser's sound engine
let out;         // where every sound goes (p5's main volume, so mute works)
let hiss;        // a few seconds of white noise, reused by many sounds
let rumble;      // a few seconds of brown noise (deeper, like wind)
let muted = false;
const SOUND_VOLUME = 0.3;   // everything at once, the same as the game (sounds.js)

function preload() {
  woodsFile = loadSound("../sounds/woods-loop.m4a");
  stepFile = loadSound("../sounds/frank-step.wav");
  bassFile = loadSound("../sounds/bass-hit.wav");
}

function setup() {
  noCanvas();
  ac = getAudioContext();
  out = p5.soundOut.input;
  hiss = makeNoise(2, "white");
  rumble = makeNoise(6, "brown");
  outputVolume(SOUND_VOLUME);
  hookUpButtons();
}

function startSound() {
  userStartAudio();
  showStatus(muted ? "Muted (press M)" : "Sound on");
}

function keyPressed() {
  if (key === "m" || key === "M") {
    muted = !muted;
    outputVolume(muted ? 0 : SOUND_VOLUME, 0.1);
    showStatus(muted ? "Muted (press M)" : "Sound on");
  }
}

// which radio button is picked for a row: "file" or "code"
function source(name) {
  return document.querySelector(`input[name="${name}"]:checked`).value;
}

function slider(id) {
  return parseFloat(document.getElementById(id).value);
}

function showStatus(text) {
  document.getElementById("status").textContent = text;
}

function hookUpButtons() {
  let on = (id, fn) =>
    document.getElementById(id).addEventListener("click", () => {
      startSound();
      fn();
    });

  on("forest-play", playForest);
  on("forest-stop", stopForest);
  document.getElementById("forest-volume").addEventListener("input", setForestVolume);
  // switching between file and code while it plays swaps it over
  for (let r of document.querySelectorAll('input[name="forest"]')) {
    r.addEventListener("change", () => { if (forestPlaying) { stopForest(); playForest(); } });
  }

  on("step-one", () => frankStep(1));
  on("step-walk", playWalk);
  on("frank-sit", frankSit);
  on("frank-hug", frankHugged);

  on("hop-small", () => frazzleHop(0.5));
  on("hop-poke", () => frazzleHop(1));
  on("land", () => frazzleLand(0.8));
  on("hop-full", () => {
    frazzleHop(0.7);
    setTimeout(() => frazzleLand(0.8), 560);   // about how long a hop is in the air
  });

  on("bounce-one", () => frazzleBounce(slider("bounce-strength")));
  on("bounce-trip", playTrip);
}

// ---------------------------------------------------------------------------
// Frank's steps

function frankStep(strength) {
  let weight = slider("step-weight");   // 1 = normal; more = heavier and lower
  if (source("step") === "file") {
    // the same file each time, but a slightly different speed/pitch so it
    // doesn't sound like a machine
    stepFile.rate(random(0.9, 1.05) / weight);
    stepFile.setVolume(0.9 * strength);
    stepFile.play();
  } else {
    stepThud(strength, weight);
  }
}

// a shuffle through dirt and grass: everything fades in (no sharp start),
// then the foot settles with a soft, low thump
function stepThud(strength, weight) {
  let t = ac.currentTime;

  // grass: a high, airy swish (highpass keeps only the hiss)
  burst(hiss, "highpass", 3500, t, 0.06, 0.24, 0.12 * strength);

  // dirt: lots of tiny crackles scattered over the step, quiet at first and
  // louder as his weight comes down, so it crunches instead of clicking
  let crackles = 9;
  for (let i = 0; i < crackles; i++) {
    let delay = random(0, 0.16);
    let build = delay / 0.16;   // 0 at the start of the step, 1 at the end
    burst(hiss, "bandpass", random(1500, 3000) / weight, t + delay, 0.004,
          random(0.015, 0.03), lerp(0.05, 0.22, build) * strength, { q: 2 });
  }

  // the drag underneath: noise through a bandpass (the scrapey middle),
  // fading in slowly, with the band sliding up as the foot slides forward
  let scrape = random(500, 700) / weight;
  burst(hiss, "bandpass", scrape, t, 0.07, 0.26, 0.2 * strength,
        { to: scrape * 1.6, q: 1 });

  // the foot settling: a soft start (0.03 s) instead of a hit
  let f = (70 / weight) * random(0.92, 1.08);
  tone("sine", f * 1.4, f * 0.6, 0.12, t + 0.1, 0.03, 0.22, 0.35 * strength);
}

// One poke walks him 100 pixels. This replays Frank's walking rule from
// updateWalk() in sketch.js, frame by frame, and plays a step on each frame
// where a foot comes down: floor(gaitPhase * 2) goes up by one.
function playWalk() {
  let x = 0, speed = 0, phase = 0, frame = 0;
  let target = 100, maxWalkSpeed = 1.1, strideLength = 40;   // values from sketch.js
  while (abs(target - x) >= 0.5) {
    let remaining = target - x;
    speed = min(speed + 0.05, maxWalkSpeed, abs(remaining) * 0.06 + 0.35);
    let move = min(speed, abs(remaining)) * Math.sign(remaining);
    let footfallsBefore = floor(phase * 2);
    x += move;
    phase += abs(move) / strideLength;
    frame++;
    if (floor(phase * 2) > footfallsBefore) {
      let loudness = max(0.35, speed / maxWalkSpeed);
      setTimeout(() => frankStep(loudness), (frame * 1000) / 60);
    }
  }
  // he stops; his back foot takes a small step back under him
  setTimeout(() => frankStep(0.4), ((frame + 10) * 1000) / 60);
}

// sitting down for his trip: he slides down into the grass with a long
// swish, then settles with a soft, heavy "flump" (in the game, his body is
// most of the way down about half a second in)
function frankSit() {
  let t = ac.currentTime;
  // the grass swishing as he slides down: the hiss band slides lower with him
  breath(hiss, "bandpass", 2400, 900, t, 0.08, 0.8, 0.14, 0.8);
  // a high, airy rustle on top
  breath(hiss, "highpass", 3500, 3500, t, 0.1, 0.7, 0.06);
  // blades crackling under him
  for (let i = 0; i < 8; i++) {
    burst(hiss, "bandpass", random(2000, 4500), t + random(0.1, 0.6), 0.003,
          random(0.01, 0.02), 0.05, { q: 3 });
  }
  // settling onto the ground: lower, softer and longer than a step
  tone("sine", 90, 45, 0.2, t + 0.5, 0.04, 0.4, 0.4);
}

// hugged by Frazzle: a low monster growl (he's pretending not to like it),
// then a long sigh as he gives in
function frankHugged() {
  let t = ac.currentTime;
  // the growl: very low, slow and rough, with a raspy throat
  growl(75, 55, t, 0.05, 0.6, 0.35, 380, { rate: 18, depth: 0.45, rasp: 0.6 });
  // the sigh: air through his mouth, "haaa" sliding to "hooo" (the band slides down)
  breath(hiss, "bandpass", 1300, 500, t + 0.6, 0.15, 1.0, 0.16, 1.5);
  // with a low grumble underneath
  growl(65, 50, t + 0.65, 0.12, 0.8, 0.12, 350, { rate: 18, depth: 0.35 });
}

// ---------------------------------------------------------------------------
// Frazzle

// a springy "boing" that rises as they take off, with a wobble
function frazzleHop(strength) {
  let t = ac.currentTime;
  let base = lerp(200, 260, strength) * random(0.95, 1.05);
  tone("triangle", base, base * 2.4, 0.16, t, 0.003, 0.3, 0.3 + 0.15 * strength,
       { rate: 26, depth: base * 0.12 });
}

// landing in the grass: a soft, low "fwump" as they squish down, with the
// grass swishing and crackling around them
function frazzleLand(strength) {
  let t = ac.currentTime;
  // their soft body: a low thump that sinks, with a gentle start (not a "plop")
  tone("sine", 150, 60, 0.12, t, 0.01, 0.2, 0.4 * strength);
  // the grass flattening: an airy swish (highpass keeps only the hiss)
  burst(hiss, "highpass", 3000, t, 0.025, 0.28, 0.12 * strength);
  // a few blades crackling as they bend
  for (let i = 0; i < 5; i++) {
    burst(hiss, "bandpass", random(2500, 5000), t + random(0, 0.12), 0.003,
          random(0.01, 0.02), 0.06 * strength, { q: 3 });
  }
}

// strength: 0 = a gentle nudge, 1 = slammed into the wall
function frazzleBounce(strength) {
  strength = constrain(strength, 0, 1);
  if (source("bounce") === "file") {
    bassFile.rate(random(0.95, 1.1) * lerp(1.25, 1, strength));
    bassFile.setVolume(lerp(0.15, 0.9, strength));
    bassFile.play();
  } else {
    jellyBoing(strength);
  }
}

// a bounce is a little rebound, so it's built like frazzleHop(): the same
// rising "boing", attack and wobble, just a smaller rise (2x instead of
// 2.4x), so it sounds like the same creature. A harder bump is mostly louder,
// only a little higher. The faint squish makes it sound like they hit something.
function jellyBoing(strength) {
  let t = ac.currentTime;
  let base = lerp(200, 240, strength) * random(0.95, 1.05);
  tone("triangle", base, base * 2, 0.14, t, 0.003, 0.28, lerp(0.12, 0.5, strength),
       { rate: 26, depth: base * 0.12 });
  burst(hiss, "lowpass", 1200, t, 0.002, 0.05, 0.15 * strength);
}

// about 8 seconds of floating, like a mushroom trip: drifting, then bouncing
// off a wall (or Frank, or the cave) every second or two, some harder than others
function playTrip() {
  let when = 300;
  while (when < 8000) {
    let s = random() < 0.25 ? random(0.75, 1) : random(0.2, 0.6);
    setTimeout(() => frazzleBounce(s), when);
    // sometimes a quick second bump, as they roll along the wall
    if (random() < 0.3) setTimeout(() => frazzleBounce(s * 0.4), when + random(90, 160));
    when += random(700, 1900);
  }
}

// ---------------------------------------------------------------------------
// The background

let forestPlaying = false;
let forest = null;   // the made-in-code forest's parts, while it plays

function playForest() {
  if (forestPlaying) return;
  forestPlaying = true;
  if (source("forest") === "file") {
    woodsFile.setVolume(slider("forest-volume"), 0.8);
    woodsFile.loop();
  } else {
    forest = startCodeForest();
  }
}

function stopForest() {
  forestPlaying = false;
  if (woodsFile.isPlaying()) woodsFile.stop();
  if (forest) {
    forest.stop();
    forest = null;
  }
}

function setForestVolume() {
  let v = slider("forest-volume");
  woodsFile.setVolume(v, 0.1);
  if (forest) forest.volume.gain.setTargetAtTime(v, ac.currentTime, 0.1);
}

function startCodeForest() {
  let t = ac.currentTime;
  let volume = ac.createGain();
  volume.gain.setValueAtTime(0, t);
  volume.gain.setTargetAtTime(slider("forest-volume"), t, 0.6);   // fade in
  volume.connect(out);
  let parts = [];   // everything we need to stop later

  // wind: deep noise through a filter that slowly opens and closes (gusts)
  let wind = loopNoise(rumble);
  let windFilter = ac.createBiquadFilter();
  windFilter.type = "lowpass";
  windFilter.frequency.value = 500;
  let windGain = ac.createGain();
  windGain.gain.value = 0.4;
  chain(wind, windFilter, windGain, volume);
  parts.push(wind, wobble(windFilter.frequency, 0.07, 280), wobble(windGain.gain, 0.11, 0.15));

  // leaves: a faint, high rustle that comes and goes
  let leaves = loopNoise(hiss);
  let leafFilter = ac.createBiquadFilter();
  leafFilter.type = "highpass";
  leafFilter.frequency.value = 3500;
  let leafGain = ac.createGain();
  leafGain.gain.value = 0.02;
  chain(leaves, leafFilter, leafGain, volume);
  parts.push(leaves, wobble(leafGain.gain, 0.23, 0.02));

  // the cave has an echo: drips go through a short delay that feeds back
  let echo = ac.createDelay(1);
  echo.delayTime.value = 0.13;
  let feedback = ac.createGain();
  feedback.gain.value = 0.35;
  chain(echo, feedback, echo);
  echo.connect(volume);

  // birds and drips happen now and then, at random
  let timers = [];
  let every = (minMs, maxMs, fn) => {
    let next = () => {
      timers.push(setTimeout(() => { fn(); next(); }, random(minMs, maxMs)));
    };
    next();
  };
  every(1200, 5000, () => bird(volume));
  every(4000, 10000, () => drip(volume, echo));

  return {
    volume,
    stop() {
      for (let id of timers) clearTimeout(id);
      let now = ac.currentTime;
      volume.gain.setTargetAtTime(0, now, 0.25);   // fade out, then stop
      for (let p of parts) p.stop(now + 1.5);
      setTimeout(() => volume.disconnect(), 1600);
    },
  };
}

// one of three made-up birds, somewhere off to the left or right
function bird(dest) {
  let pan = ac.createStereoPanner();
  pan.pan.value = random(-0.8, 0.8);
  pan.connect(dest);
  let t = ac.currentTime;
  let loud = random(0.03, 0.07);   // far away, so quiet
  let kind = random(["tweet", "whistle", "trill"]);

  if (kind === "tweet") {
    // quick little rising chirps
    let f = random(2800, 3600);
    let n = floor(random(3, 7));
    for (let i = 0; i < n; i++) {
      tone("sine", f, f * 1.35, 0.05, t + i * 0.11, 0.005, 0.07, loud, null, pan);
    }
  } else if (kind === "whistle") {
    // two slow notes that fall, like "fee-bee"
    let f = random(2400, 3000);
    tone("sine", f, f * 0.78, 0.3, t, 0.03, 0.36, loud, { rate: 6, depth: 25 }, pan);
    tone("sine", f * 1.1, f * 0.86, 0.3, t + 0.45, 0.03, 0.36, loud, { rate: 6, depth: 25 }, pan);
  } else {
    // a fast warble
    let f = random(3400, 4200);
    tone("sine", f, f, 0.6, t, 0.02, 0.65, loud * 0.7, { rate: random(30, 45), depth: 350 }, pan);
  }
  setTimeout(() => pan.disconnect(), 2000);
}

// a water drop falling into a puddle in the cave, with an echo
function drip(dest, echo) {
  let t = ac.currentTime;
  let f = random(1100, 1600);
  let g = tone("sine", f, f * 0.5, 0.04, t, 0.002, 0.15, 0.06);
  g.connect(echo);   // also send it into the echo
}

// ---------------------------------------------------------------------------
// The building blocks every made-in-code sound uses

// A tone that slides from one pitch to another.
//  type: "sine" (pure), "triangle" (a bit buzzier) ...
//  from/to: start and end pitch (Hz); slide: how long the slide takes
//  t: when it starts; attack: how fast it gets loud; length: how long it lasts
//  peak: how loud; vibrato: optional { rate, depth } wobble in pitch
// Returns its volume control, in case another sound wants to listen in.
function tone(type, from, to, slide, t, attack, length, peak, vibrato = null, dest = out) {
  let osc = ac.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(to, t + slide);

  let gain = ac.createGain();
  shape(gain.gain, t, attack, length, peak);
  chain(osc, gain, dest);
  osc.start(t);
  osc.stop(t + length + 0.05);

  if (vibrato) {
    let lfo = ac.createOscillator();
    lfo.frequency.value = vibrato.rate;
    let depth = ac.createGain();
    depth.gain.setValueAtTime(vibrato.depth, t);
    depth.gain.linearRampToValueAtTime(0, t + length);   // the wobble dies down
    chain(lfo, depth, osc.frequency);
    lfo.start(t);
    lfo.stop(t + length + 0.05);
  }
  return gain;
}

// A short burst of filtered noise: a scuff, a squish, a splash.
//  options (optional): { to: slide the filter to this pitch over the sound,
//                        q: how narrow the filter is (bigger = narrower) }
function burst(buffer, filterType, freq, t, attack, length, peak, options = {}) {
  let src = ac.createBufferSource();
  src.buffer = buffer;
  let filter = ac.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.setValueAtTime(freq, t);
  if (options.to) filter.frequency.exponentialRampToValueAtTime(options.to, t + length);
  if (options.q) filter.Q.value = options.q;
  let gain = ac.createGain();
  shape(gain.gain, t, attack, length, peak);
  chain(src, filter, gain, out);
  src.start(t, random(0, buffer.duration - length - 0.1));   // start somewhere random in the noise
  src.stop(t + length + 0.05);
}

// A longer stretch of filtered hiss: a swish or a breath. Unlike burst(), it
// swells in and fades out evenly (in straight lines), so it holds on.
//  from/to: the filter's pitch slides from one to the other
function breath(buffer, filterType, from, to, t, attack, length, peak, q = 1) {
  let src = ac.createBufferSource();
  src.buffer = buffer;
  let filter = ac.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.setValueAtTime(from, t);
  filter.frequency.exponentialRampToValueAtTime(to, t + length);
  filter.Q.value = q;
  let gain = ac.createGain();
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(peak, t + attack);
  gain.gain.linearRampToValueAtTime(0, t + length);
  chain(src, filter, gain, out);
  src.start(t, random(0, buffer.duration - length - 0.1));
  src.stop(t + length + 0.05);
}

// A low, gruff voice: a buzzy tone (sawtooth) muffled by a filter, like a
// sound made with the mouth closed ("hmph"). It rattles in loudness, which
// makes it gruff.
//  from/to: pitch (Hz); cutoff: how open the mouth is (lower = more closed)
//  options (optional):
//    rate: how many times a second it rattles (slower = more of a growl)
//    depth: how deep the rattle goes (0 = smooth, 0.5 = almost to silence)
//    rasp: how much raspy throat noise to add (0 = none)
function growl(from, to, t, attack, length, peak, cutoff, options = {}) {
  let rate = options.rate || 28;
  let rattleDepth = options.depth || 0.3;

  let osc = ac.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(to, t + length);
  let mouth = ac.createBiquadFilter();
  mouth.type = "lowpass";
  mouth.frequency.value = cutoff;

  // the rattle: loudness wobbles between (1 - 2 x depth) and 1, rate times a second
  let rattle = ac.createGain();
  rattle.gain.value = 1 - rattleDepth;
  let lfo = ac.createOscillator();
  lfo.frequency.value = rate;
  let depth = ac.createGain();
  depth.gain.value = rattleDepth;
  chain(lfo, depth, rattle.gain);

  let gain = ac.createGain();
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(peak, t + attack);
  gain.gain.linearRampToValueAtTime(0, t + length);
  chain(osc, mouth, rattle, gain, out);

  // the rasp: low, rough hiss from the throat, rattling along with the voice
  if (options.rasp) {
    let throat = ac.createBufferSource();
    throat.buffer = hiss;
    let throatFilter = ac.createBiquadFilter();
    throatFilter.type = "bandpass";
    throatFilter.frequency.value = 300;
    throatFilter.Q.value = 1.5;
    let throatGain = ac.createGain();
    throatGain.gain.value = options.rasp;
    chain(throat, throatFilter, throatGain, rattle);
    throat.start(t, random(0, hiss.duration - length - 0.1));
    throat.stop(t + length + 0.05);
  }

  for (let o of [osc, lfo]) {
    o.start(t);
    o.stop(t + length + 0.05);
  }
}

// The volume shape of a sound: silent, quickly up to peak, then fading away.
function shape(param, t, attack, length, peak) {
  peak = max(peak, 0.0002);
  param.setValueAtTime(0.0001, t);
  param.exponentialRampToValueAtTime(peak, t + attack);
  param.exponentialRampToValueAtTime(0.0001, t + length);
}

// Slowly pushes a setting up and down around where it is (for gusts, swells).
// Returns the wobbler so it can be stopped.
function wobble(param, rate, amount) {
  let lfo = ac.createOscillator();
  lfo.frequency.value = rate;
  let depth = ac.createGain();
  depth.gain.value = amount;
  chain(lfo, depth, param);
  lfo.start();
  return lfo;
}

// Connects sounds in a row: chain(a, b, c) plugs a into b, and b into c.
// (p5.sound changes connect() so it can't be chained like a.connect(b).connect(c).)
function chain(...nodes) {
  for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]);
}

function loopNoise(buffer) {
  let src = ac.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  src.start();
  return src;
}

// Fills a buffer with noise. "white" is hiss; "brown" is the deeper rumble
// you get by letting each sample wander a little from the one before.
function makeNoise(seconds, kind) {
  let buffer = ac.createBuffer(1, ac.sampleRate * seconds, ac.sampleRate);
  let data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    let white = Math.random() * 2 - 1;
    if (kind === "brown") {
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    } else {
      data[i] = white;
    }
  }
  // tilt it so the end lines up with the start, so it loops without a click
  let gap = data[data.length - 1] - data[0];
  for (let i = 0; i < data.length; i++) data[i] -= (gap * i) / data.length;
  return buffer;
}

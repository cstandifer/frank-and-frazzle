// Frank & Frazzle's sounds (try and tune them first in sound-lab/)
//
// The background is a recording (sounds/woods-loop.m4a). Everything else is
// made in code: a tone or a burst of hiss, plus a "shape" that says how loud
// it is and how its pitch moves over a fraction of a second. They use the
// Web Audio building blocks that p5.sound runs on.
//
// Browsers stay silent until the first click or tap, so press() in sketch.js
// calls startSound(). Press M to mute.

// ---------------------------------------------------------------------------
// Settings

const SOUND_VOLUME = 0.3;         // everything at once (1 = full); lower = all softer

const WOODS_VOLUME = 0.2;        // the background: quiet, so it isn't distracting (0 to 1)
const WOODS_FADE_IN = 3;          // seconds it takes to fade in after the first tap

const BOUNCE_SOUND_MIN = 0.3;     // Frazzle bumps softer than this make no sound
const BOUNCE_SOUND_GAP = 150;     // at least this many ms between bounce sounds

let soundCtx = null;   // the browser's sound engine (once sound is allowed)
let soundOut;          // where every sound goes (p5's main volume)
let hiss;              // two seconds of white noise, reused by many sounds
let woods = null;      // the background recording
let muted = false;
let lastBounceSound = -Infinity;

function startSound() {
  userStartAudio();
  if (soundCtx) return;
  soundCtx = getAudioContext();
  soundOut = p5.soundOut.input;
  outputVolume(SOUND_VOLUME);
  hiss = soundCtx.createBuffer(1, soundCtx.sampleRate * 2, soundCtx.sampleRate);
  let data = hiss.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

  // load the woods now (not before the game starts, so the game opens
  // quickly), then loop it, fading in from silence
  woods = loadSound("sounds/woods-loop.m4a", () => {
    woods.setVolume(0);
    woods.loop();
    woods.setVolume(WOODS_VOLUME, WOODS_FADE_IN);
  });
}

function toggleMute() {
  muted = !muted;
  outputVolume(muted ? 0 : SOUND_VOLUME, 0.2);
}

// ---------------------------------------------------------------------------
// When each sound plays (called from sketch.js)

// Frank: each time a foot comes down while he walks. strength is how fast
// he's going (0 to 1); delay is in seconds (for the last little step).
function playStepSound(strength, delay = 0) {
  if (!soundCtx) return;
  shuffleStep(max(0.35, strength), delay);
}

// Frank: sitting down in the grass as his mushroom daze begins.
function playSitSound() {
  if (!soundCtx) return;
  sitSlide();
}

// Frank: Frazzle hugs him. He grumbles... then gives in.
function playHugSound() {
  if (!soundCtx) return;
  gruntySigh();
}

// Frazzle: taking off. A poked hop (strength 1) is bigger than an everyday one.
function playHopSound(strength) {
  if (!soundCtx) return;
  hopBoing(strength);
}

// Frazzle: coming down on the ground.
function playLandSound(strength) {
  if (!soundCtx) return;
  landPlop(strength);
}

// Frazzle: called from bounceAt() for every real bump (walls, Frank, the
// cave), which only happens while they float on a trip or fall at the end of
// one. intoWall is how fast they hit: about 1.7 when drifting, more when tossed.
function playBounceSound(intoWall) {
  if (!soundCtx) return;
  if (intoWall < BOUNCE_SOUND_MIN) return;                    // just grazing it
  if (millis() - lastBounceSound < BOUNCE_SOUND_GAP) return;  // one bump can touch twice (like a corner)
  lastBounceSound = millis();
  jellyBoing(constrain(map(intoWall, BOUNCE_SOUND_MIN, 3.5, 0, 1), 0, 1));
}

// ---------------------------------------------------------------------------
// The recipes (the same as stepThud, frazzleHop, frazzleLand and jellyBoing
// in sound-lab/lab.js)

// Frank's shuffle through dirt and grass: everything fades in (no sharp
// start), then the foot settles with a soft, low thump
function shuffleStep(strength, delay) {
  let t = soundCtx.currentTime + delay;

  // grass: a high, airy swish (highpass keeps only the hiss)
  burst("highpass", 3500, t, 0.06, 0.24, 0.12 * strength);

  // dirt: lots of tiny crackles scattered over the step, quiet at first and
  // louder as his weight comes down, so it crunches instead of clicking
  for (let i = 0; i < 9; i++) {
    let d = random(0, 0.16);
    burst("bandpass", random(1500, 3000), t + d, 0.004, random(0.015, 0.03),
          lerp(0.05, 0.22, d / 0.16) * strength, { q: 2 });
  }

  // the drag underneath: the scrapey middle of the hiss (bandpass), sliding
  // up as the foot slides forward
  let scrape = random(500, 700);
  burst("bandpass", scrape, t, 0.07, 0.26, 0.2 * strength, { to: scrape * 1.6, q: 1 });

  // the foot settling: a soft start (0.03 s) instead of a hit
  let f = 70 * random(0.92, 1.08);
  tone("sine", f * 1.4, f * 0.6, 0.12, t + 0.1, 0.03, 0.22, 0.35 * strength);
}

// Frank sitting down for his trip: he slides down into the grass with a long
// swish, then settles with a soft, heavy "flump"
function sitSlide() {
  let t = soundCtx.currentTime;
  // the grass swishing as he slides down: the hiss band slides lower with him
  breath("bandpass", 2400, 900, t, 0.08, 0.8, 0.14, 0.8);
  // a high, airy rustle on top
  breath("highpass", 3500, 3500, t, 0.1, 0.7, 0.06);
  // blades crackling under him
  for (let i = 0; i < 8; i++) {
    burst("bandpass", random(2000, 4500), t + random(0.1, 0.6), 0.003,
          random(0.01, 0.02), 0.05, { q: 3 });
  }
  // settling onto the ground: lower, softer and longer than a step
  tone("sine", 90, 45, 0.2, t + 0.5, 0.04, 0.4, 0.4);
}

// Frank being hugged: a low monster growl (he's pretending not to like it),
// then a long sigh as he gives in
function gruntySigh() {
  let t = soundCtx.currentTime;
  // the growl: very low, slow and rough, with a raspy throat
  growl(75, 55, t, 0.05, 0.6, 0.35, 380, { rate: 18, depth: 0.45, rasp: 0.6 });
  // the sigh: air through his mouth, "haaa" sliding to "hooo" (the band slides down)
  breath("bandpass", 1300, 500, t + 0.6, 0.15, 1.0, 0.16, 1.5);
  // with a low grumble underneath
  growl(65, 50, t + 0.65, 0.12, 0.8, 0.12, 350, { rate: 18, depth: 0.35 });
}

// Frazzle's springy "boing" as they take off: rises, with a wobble
function hopBoing(strength) {
  let t = soundCtx.currentTime;
  let base = lerp(200, 260, strength) * random(0.95, 1.05);
  tone("triangle", base, base * 2.4, 0.16, t, 0.003, 0.3, 0.3 + 0.15 * strength,
       { rate: 26, depth: base * 0.12 });
}

// Frazzle landing in the grass: a soft, low "fwump" as they squish down,
// with the grass swishing and crackling around them
function landPlop(strength) {
  let t = soundCtx.currentTime;
  // their soft body: a low thump that sinks, with a gentle start (not a "plop")
  tone("sine", 150, 60, 0.12, t, 0.01, 0.2, 0.4 * strength);
  // the grass flattening: an airy swish (highpass keeps only the hiss)
  burst("highpass", 3000, t, 0.025, 0.28, 0.12 * strength);
  // a few blades crackling as they bend
  for (let i = 0; i < 5; i++) {
    burst("bandpass", random(2500, 5000), t + random(0, 0.12), 0.003,
          random(0.01, 0.02), 0.06 * strength, { q: 3 });
  }
}

// a bounce is a little rebound, so it's built like the hop: a rising
// "boing" with a jelly wobble, plus a faint squish. A harder bump is mostly
// louder, only a little higher.
function jellyBoing(strength) {
  let t = soundCtx.currentTime;
  let base = lerp(200, 240, strength) * random(0.95, 1.05);
  tone("triangle", base, base * 2, 0.14, t, 0.003, 0.28, lerp(0.12, 0.5, strength),
       { rate: 26, depth: base * 0.12 });
  burst("lowpass", 1200, t, 0.002, 0.05, 0.15 * strength);
}

// ---------------------------------------------------------------------------
// Building blocks

// A tone that slides from one pitch to another.
//  type: "sine" (pure), "triangle" (a bit buzzier) ...
//  from/to: start and end pitch (Hz); slide: how long the slide takes
//  t: when it starts; attack: how fast it gets loud; length: how long it lasts
//  peak: how loud; vibrato: optional { rate, depth } wobble in pitch
function tone(type, from, to, slide, t, attack, length, peak, vibrato = null) {
  let osc = soundCtx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(to, t + slide);
  let gain = soundCtx.createGain();
  shape(gain.gain, t, attack, length, peak);
  chain(osc, gain, soundOut);
  osc.start(t);
  osc.stop(t + length + 0.05);

  if (vibrato) {
    let lfo = soundCtx.createOscillator();
    lfo.frequency.value = vibrato.rate;
    let depth = soundCtx.createGain();
    depth.gain.setValueAtTime(vibrato.depth, t);
    depth.gain.linearRampToValueAtTime(0, t + length);   // the wobble dies down
    chain(lfo, depth, osc.frequency);
    lfo.start(t);
    lfo.stop(t + length + 0.05);
  }
}

// A short burst of filtered hiss: a scuff, a squish, a crunch.
//  options (optional): { to: slide the filter to this pitch over the sound,
//                        q: how narrow the filter is (bigger = narrower) }
function burst(filterType, freq, t, attack, length, peak, options = {}) {
  let src = soundCtx.createBufferSource();
  src.buffer = hiss;
  let filter = soundCtx.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.setValueAtTime(freq, t);
  if (options.to) filter.frequency.exponentialRampToValueAtTime(options.to, t + length);
  if (options.q) filter.Q.value = options.q;
  let gain = soundCtx.createGain();
  shape(gain.gain, t, attack, length, peak);
  chain(src, filter, gain, soundOut);
  src.start(t, random(0, hiss.duration - length - 0.1));   // somewhere random in the hiss
  src.stop(t + length + 0.05);
}

// A longer stretch of filtered hiss: a swish or a breath. Unlike burst(), it
// swells in and fades out evenly (in straight lines), so it holds on.
//  from/to: the filter's pitch slides from one to the other
function breath(filterType, from, to, t, attack, length, peak, q = 1) {
  let src = soundCtx.createBufferSource();
  src.buffer = hiss;
  let filter = soundCtx.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.setValueAtTime(from, t);
  filter.frequency.exponentialRampToValueAtTime(to, t + length);
  filter.Q.value = q;
  let gain = soundCtx.createGain();
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(peak, t + attack);
  gain.gain.linearRampToValueAtTime(0, t + length);
  chain(src, filter, gain, soundOut);
  src.start(t, random(0, hiss.duration - length - 0.1));
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

  let osc = soundCtx.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(to, t + length);
  let mouth = soundCtx.createBiquadFilter();
  mouth.type = "lowpass";
  mouth.frequency.value = cutoff;

  // the rattle: loudness wobbles between (1 - 2 x depth) and 1, rate times a second
  let rattle = soundCtx.createGain();
  rattle.gain.value = 1 - rattleDepth;
  let lfo = soundCtx.createOscillator();
  lfo.frequency.value = rate;
  let depth = soundCtx.createGain();
  depth.gain.value = rattleDepth;
  chain(lfo, depth, rattle.gain);

  let gain = soundCtx.createGain();
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(peak, t + attack);
  gain.gain.linearRampToValueAtTime(0, t + length);
  chain(osc, mouth, rattle, gain, soundOut);

  // the rasp: low, rough hiss from the throat, rattling along with the voice
  if (options.rasp) {
    let throat = soundCtx.createBufferSource();
    throat.buffer = hiss;
    let throatFilter = soundCtx.createBiquadFilter();
    throatFilter.type = "bandpass";
    throatFilter.frequency.value = 300;
    throatFilter.Q.value = 1.5;
    let throatGain = soundCtx.createGain();
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

// The volume shape of a sound: silent, up to peak, then fading away.
function shape(param, t, attack, length, peak) {
  peak = max(peak, 0.0002);
  param.setValueAtTime(0.0001, t);
  param.exponentialRampToValueAtTime(peak, t + attack);
  param.exponentialRampToValueAtTime(0.0001, t + length);
}

// chain(a, b, c) plugs a into b, and b into c. (p5.sound changes connect()
// so it can't be chained like a.connect(b).connect(c).)
function chain(...nodes) {
  for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]);
}

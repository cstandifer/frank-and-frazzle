// Record a demo video of the game, with its sound.
// Press R to start, and R again to stop: the browser saves a video file
// (works best in Chrome). The video has just the game's picture and sound,
// nothing else that's on your screen.

let recorder = null;       // the browser's recorder, while recording
let recordStream = null;   // the picture + sound being recorded
let recordedPieces = [];
let recordTap = null;      // where the recorder listens in on the game's sound
let recBadge = null;       // the little "● REC" sign (outside the canvas, so not in the video)

function toggleRecording() {
  if (recorder) stopRecording();
  else startRecording();
}

function startRecording() {
  if (typeof MediaRecorder === "undefined" || !canvasElt.captureStream) {
    alert("This browser can't record the game. Try Chrome.");
    return;
  }
  startSound();   // pressing R counts as the click that turns sound on (sounds.js)

  // the picture: whatever is drawn on the canvas, 30 times a second
  let picture = canvasElt.captureStream(30);

  // the sound: listen in after the main volume, so M mutes the video too
  if (!recordTap) {
    recordTap = getAudioContext().createMediaStreamDestination();
    p5.soundOut.output.connect(recordTap);
  }

  recordStream = new MediaStream([
    ...picture.getVideoTracks(),
    ...recordTap.stream.getAudioTracks(),
  ]);

  // use the first video format this browser can make
  let formats = ["video/webm;codecs=vp9,opus", "video/webm", "video/mp4"];
  let format = formats.find((f) => MediaRecorder.isTypeSupported(f));
  recorder = new MediaRecorder(recordStream, format ? { mimeType: format } : {});
  recordedPieces = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) recordedPieces.push(e.data);
  };
  recorder.onstop = saveRecording;
  recorder.start(1000);   // hand over the video a second at a time
  showRecBadge(true);
}

function stopRecording() {
  recorder.stop();   // saveRecording() runs once the last piece arrives
  recorder = null;
  showRecBadge(false);
}

// put the pieces together into one video file and download it
function saveRecording() {
  for (let track of recordStream.getVideoTracks()) track.stop();
  let type = recordedPieces.length ? recordedPieces[0].type : "video/webm";
  let video = new Blob(recordedPieces, { type });
  let link = document.createElement("a");
  link.href = URL.createObjectURL(video);
  link.download = "frank-and-frazzle-demo." + (type.includes("mp4") ? "mp4" : "webm");
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 10000);
}

function showRecBadge(on) {
  if (!recBadge) {
    recBadge = document.createElement("div");
    recBadge.id = "rec-badge";
    recBadge.textContent = "● REC (press R to stop)";
    document.body.appendChild(recBadge);
  }
  recBadge.hidden = !on;
}

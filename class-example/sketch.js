let blob;
let buddy;

function setup() {
  createCanvas(400, 400);
  blob = new Creature(130, 200, 100);
  buddy = new Creature(290, 220, 70);
}

function draw() {
  background(220);
  blob.update();
  blob.display();
  buddy.update();
  buddy.display();
}

function mousePressed() {
  blob.poke();
  buddy.poke();
}

class Creature {
  constructor(x, y, size) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.state = "idle";   // idle, curious, scared, happy
    this.happyUntil = 0;   // timestamp for when "happy" wears off
  }

  // LOGIC: decide what state the creature is in
  update() {
    let d = dist(mouseX, mouseY, this.x, this.y);

    if (millis() < this.happyUntil) {
      this.state = "happy";
    } else if (d < this.size * 0.7) {
      this.state = "scared";
    } else if (d < this.size * 1.8) {
      this.state = "curious";
    } else {
      this.state = "idle";
    }

    // BEHAVIOR: move based on state
    if (this.state === "scared") {
      this.x += random(-3, 3); // jitter, like the JitterBug
    }
    this.x = constrain(this.x, this.size / 2, width - this.size / 2);
  }

  // APPEARANCE: draw based on state
  display() {
    let breathe = sin(frameCount * 0.05) * (this.size * 0.05);

    push();
    translate(this.x, this.y);
    noStroke();

    if (this.state === "scared") fill(255, 150, 150);
    else if (this.state === "happy") fill(255, 220, 120);
    else fill(150, 200, 255);
    ellipse(0, 0, this.size + breathe, this.size * 0.9 - breathe);

    // eyes follow the mouse
    let look = createVector(mouseX - this.x, mouseY - this.y).limit(this.size * 0.05);
    let eyeOffset = this.size * 0.2;
    let eyeSize = this.size * 0.25;
    for (let ex of [-eyeOffset, eyeOffset]) {
      fill(255);
      ellipse(ex, -this.size * 0.12, eyeSize, eyeSize);
      fill(0);
      ellipse(ex + look.x, -this.size * 0.12 + look.y, eyeSize * 0.4, eyeSize * 0.4);
    }
    pop();
  }

  // INTERACTION: respond to a click on this creature
  poke() {
    if (dist(mouseX, mouseY, this.x, this.y) < this.size / 2) {
      this.happyUntil = millis() + 1500; // happy for 1.5 seconds
    }
  }
}

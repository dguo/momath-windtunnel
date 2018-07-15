/* MoMath Math Square Behavior
 *
 *        Title: Wind Tunnel
 *  Description: wind tunnel simulation
 * Scheduler ID:
 *    Framework: P5
 *       Author:
 *       Status: work in progress
 */

import P5Behavior from 'p5beh';
import naca from 'naca-four-digit-airfoil';
import Sim from './simulate';

import Particle from './particle';
import {getRainbow} from './colors';

const NUM_POINTS = 50;
const CHORD_LENGTH = 50;//200;
const PARTICLE_RADIUS = 5;
const PARTICLE_DENSITY = 20;
const TIMESCALE = 3;
const TRAILSCALE = 4;
const pb = new P5Behavior();
const particles = new Set();
const rainbow = getRainbow();

let particleCreationCount = 0;
let DIRECTIONS = {};
function getDir(userId) {
  var dir = DIRECTIONS[userId];
  if (dir === undefined) {
    dir = (Math.random() < 0.5) ? -1 : 1;
    DIRECTIONS[userId] = dir;
    //console.log(`userId = ${userId}, dir = ${dir}`)
  }
  return dir;
}

function createNewParticles(height) {
    if (particleCreationCount < PARTICLE_DENSITY) {
        particleCreationCount++;
        return;
    } else {
        particleCreationCount = 0;
    }

    const color = rainbow.next().value;
    for (let i = 0; i < height; i = i + PARTICLE_DENSITY) {
        const position = [0, i];
        const velocity = [1, 0];
        const particle = new Particle(color, position, velocity);
        particles.add(particle);
    }
}

pb.setup = function (p) {
    this.colorMode(this.HSB);
    createNewParticles(p.height);
};

pb.draw = function (floor, p) {
  this.clear();

  let foils = []

  let boxes = floor.users.map(u => ({
    x: u.x,
    y: u.y,
    scale: CHORD_LENGTH,
    dir: getDir(u.id)
  }));

  boxes = mergeBoxes(boxes);


  for (let u of boxes) {
    let color = u.dir > 0 ? 'red': 'blue';
    this.fill(color);
    this.stroke(color);
    this.strokeWeight(1);
    //this.beginShape();
    let rad = u.scale;
    this.ellipse(u.x, u.y, rad, rad);

    /*
    var scale = u.scale;
    const airfoil = naca('4415', scale);

    var flip = [];
    let xOffset = u.x - scale/2;
    let yOffset = u.y;
    for (let i = NUM_POINTS; i >= 0; --i)
    {
      let lookupX = scale*i/NUM_POINTS;
      let points = airfoil.evaluate(lookupX);
      let x = xOffset + points[0];
      let y = yOffset - points[1];

      foil.push({x, y});
      this.vertex(x, y);
      flip.push(points);
    }

    flip.reverse();
    for (let i = 1; i < NUM_POINTS; i++)
    {
      let x = xOffset + flip[i][2];
      let y = yOffset - flip[i][3];
      this.vertex(x, y);
      foil.push({x, y});
    }

    this.endShape(this.CLOSE);
    */

  }

  let sim = new Sim(boxes);

  /*
  for(var x = 0; x < 576; x +=20) {
    for(var y = 0; y < 576; y += 20) {
      var vel = sim.velocity({x, y});
      var dx = vel.x;
      var dy = vel.y;
      var x2 = x + 20*dx;
      var y2 = y + 20*dy;
      this.line(x, y, x2, y2);
    }
  }*/

  this.noStroke();

  createNewParticles(p.height);
  particles.forEach(particle => {
    let p = particle.position;
    const vel = sim.velocity({x:p[0], y: p[1]});
    vel.mult(TIMESCALE);
    //vel.mult(5);
    const [x, y] = particle.move([1+vel.x, vel.y]);

    if (x < 0 || y < 0 || x >= p.width || y >= p.height) {
      particles.delete(particle);
    }
    else {
      this.stroke(...particle.color, 127);
      this.strokeWeight(2);
      
      let xstart = p[0] - TRAILSCALE * (1 + vel.x);
      let ystart = p[1] - TRAILSCALE * (vel.y);
      this.line(xstart, ystart, x, y);

      this.noStroke();
      this.fill(particle.color);
      this.ellipse(x, y, PARTICLE_RADIUS, PARTICLE_RADIUS);

    }
});
  //this.fill(20, 20, 60, 60);
};

function collideRectRect(box1, box2) {
  if (box1.x - box1.scale/2 >= box2.x +  box2.scale/2 ||
          box2.x - box2.scale/2 >= box1.x + box1.scale/2) {
      return false;
  }

  if (box1.y - box1.scale/2 >= box2.y + box2.scale/2 ||
         box2.y - box2.scale/2 >= box1.y + box1.scale/2) {
    return false;
  }
  return true;
};

function merge(box1, box2) {
    let boxNew = {
        x: ((box1.x + box2.x) / 2),
        y: ((box1.y + box2.y) / 2),
        scale: box1.scale + box2.scale,
        dir: box1.dir * box2.dir
    }
    return boxNew;
}

function mergeBoxes(boxes) {
  let boxesFinal = [];
  let hasMerged = false;

  //check if boxes intersect and if so, merge
  for (let i = 0; i < boxes.length - 1; ++i) {
    hasMerged = false;

    for (let j = i+1; j < boxes.length; ++j) {
        if (collideRectRect(boxes[i], boxes[j])) {
          let boxNew = merge(boxes[i], boxes[j]);
          boxesFinal.push(boxNew);
          hasMerged = true;
          boxes.splice(j);
          break;
      }
    }
    if (!hasMerged) boxesFinal.push(boxes[i]);
  }
  if (boxes.length > 0) {
      boxesFinal.push(boxes[boxes.length - 1]);
  }
  return boxesFinal;
}

export const behavior = {
  title: 'Wind Tunnel',
  init: pb.init.bind(pb),
  frameRate: 'animate',
  render: pb.render.bind(pb),
  numGhosts: 3
};

export default behavior;

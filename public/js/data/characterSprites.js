// Frame geometry derived from actual sheet pixel sizes (see plan doc). zhnec frame
// width was ambiguous from pixel data alone (128 vs 256) — 128 verified visually here.
export const CHARACTER_SPRITES = {
  mage: {
    idle: { src: 'images/Character/mage/IDLE.png', frameW: 96, frameH: 64, frames: 5, fps: 6 },
    run: { src: 'images/Character/mage/RUN.png', frameW: 96, frameH: 64, frames: 8, fps: 10 },
    attack: { src: 'images/Character/mage/ATTACK 3.png', frameW: 96, frameH: 64, frames: 7, fps: 12 },
  },
  warrior: {
    idle: { src: 'images/Character/warrior/IDLE.png', frameW: 96, frameH: 64, frames: 5, fps: 6 },
    run: { src: 'images/Character/warrior/RUN.png', frameW: 96, frameH: 64, frames: 7, fps: 10 },
    attack: { src: 'images/Character/warrior/ATTACK1.png', frameW: 96, frameH: 64, frames: 5, fps: 12 },
  },
  archer: {
    idle: { src: 'images/Character/archer/IDLE.png', frameW: 96, frameH: 80, frames: 14, fps: 8 },
    run: { src: 'images/Character/archer/RUN.png', frameW: 96, frameH: 80, frames: 8, fps: 10 },
    attack: { src: 'images/Character/archer/ATTACK.png', frameW: 96, frameH: 80, frames: 11, fps: 14 },
  },
  assasin: {
    idle: { src: 'images/Character/assasin/IDLE.png', frameW: 96, frameH: 96, frames: 5, fps: 6 },
    run: { src: 'images/Character/assasin/RUN.png', frameW: 96, frameH: 96, frames: 8, fps: 10 },
    attack: { src: 'images/Character/assasin/ATTACK 1.png', frameW: 96, frameH: 96, frames: 6, fps: 14 },
  },
  zhnec: {
    idle: { src: 'images/Character/zhnec/IDLE (FLAMING SWORD).png', frameW: 128, frameH: 108, frames: 6, fps: 6 },
    run: { src: 'images/Character/zhnec/RUN (FLAMING SWORD).png', frameW: 128, frameH: 108, frames: 8, fps: 10 },
    attack: { src: 'images/Character/zhnec/ATTACK 2 (FLAMING SWORD).png', frameW: 128, frameH: 108, frames: 6, fps: 12 },
  },
};

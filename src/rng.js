/**
 * Seeded pseudo-random number generator (Mulberry32)
 * サーバーから受け取ったシードで両プレイヤーが同じぷよ順を生成
 */
class SeededRNG {
  constructor(seed) {
    this.seed = seed >>> 0;
  }

  next() {
    let t = (this.seed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    t = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    return t;
  }

  /** [0, max) の整数 */
  nextInt(max) {
    return Math.floor(this.next() * max);
  }
}

// グローバルに使えるシングルトン
let _rng = new SeededRNG(12345);

const RNG = {
  setSeed(seed) {
    _rng = new SeededRNG(seed);
    console.log(`RNG seeded with: ${seed}`);
  },
  nextInt(max) {
    return _rng.nextInt(max);
  },
};

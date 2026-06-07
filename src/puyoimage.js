class PuyoImage {
  static initialize() {
    this.puyoImages = [];
    for (let a = 0; a < 5; a++) {
      this.puyoImages.push(new Image());
      Game.loadImg(`img/puyo_${a + 1}.png`, this.puyoImages[a], () => {
        this.puyoImages[a].width = Config.puyoImgWidth;
        this.puyoImages[a].height = Config.puyoImgHeight;
        this.puyoImages[a].style.position = 'absolute';
      });
    }
    // NOTE: シャッフルはしない。色番号1-5がそのまま対応する
    this.batankyuImage = new Image();
    Game.loadImg('img/batankyu.png', this.batankyuImage, () => {
      this.batankyuImage.width = Config.puyoImgWidth * 6;
      this.batankyuImage.style.position = 'absolute';
      this.nextPuyosSet = [];
    });
  }

  static start() {
    for (let a = 0; a < Config.nextPuyosNumber; a++) {
      this.nextPuyosSet.push({});
      this.nextPuyosSet[a].movablePuyo = RNG.nextInt(Config.puyoColors) + 1;
      this.nextPuyosSet[a].movablePuyoElement = this.getPuyo(this.nextPuyosSet[a].movablePuyo);
      this.nextPuyosSet[a].centerPuyo = RNG.nextInt(Config.puyoColors) + 1;
      this.nextPuyosSet[a].centerPuyoElement = this.getPuyo(this.nextPuyosSet[a].centerPuyo);
    }
  }
  
  static getNextPuyos() {
    let nextPuyos = this.nextPuyosSet.shift();
    this.nextPuyosSet.push({});
    const last = Config.nextPuyosNumber - 1;
    this.nextPuyosSet[last].movablePuyo = RNG.nextInt(this.puyoImages.length) + 1;
    this.nextPuyosSet[last].movablePuyoElement = this.getPuyo(this.nextPuyosSet[last].movablePuyo);
    this.nextPuyosSet[last].centerPuyo = RNG.nextInt(this.puyoImages.length) + 1;
    this.nextPuyosSet[last].centerPuyoElement = this.getPuyo(this.nextPuyosSet[last].centerPuyo);
    Stage.showNextPuyos();
    return nextPuyos;
  }
  
  static getPuyo(index) {
    return this.puyoImages[index - 1].cloneNode(true);
  }

  static prepareBatankyu(frame) {
    this.gameOverFrame = frame;
    Stage.stageElement.appendChild(this.batankyuImage);
    this.batankyuImage.style.top = -this.batankyuImage.height + 'px';
  }

  static batankyu(frame) {
    const ratio = (frame - this.gameOverFrame) / Config.gameOverFrame;
    const x = Math.cos(Math.PI / 2 + ratio * Math.PI * 2 * 10) * Config.puyoImgWidth;
    const y = Math.cos(Math.PI + ratio * Math.PI * 2) * Config.puyoImgHeight * Config.stageRows / 4 + Config.puyoImgHeight * Config.stageRows / 2;
    this.batankyuImage.style.left = `${x}px`;
    this.batankyuImage.style.top = `${y}px`;
  }
}

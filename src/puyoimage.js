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
    for (let i = this.puyoImages.length - 1; i >= 0; i--) {
      let j = Math.floor(Math.random() * (i + 1));
      [this.puyoImages[i], this.puyoImages[j]] = [this.puyoImages[j], this.puyoImages[i]];
    }
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
      this.nextPuyosSet[a].movablePuyo = Math.floor(Math.random() * Config.puyoColors) + 1;
      this.nextPuyosSet[a].movablePuyoElement = this.getPuyo(this.nextPuyosSet[a].movablePuyo);
      this.nextPuyosSet[a].centerPuyo = Math.floor(Math.random() * Config.puyoColors) + 1;
      this.nextPuyosSet[a].centerPuyoElement = this.getPuyo(this.nextPuyosSet[a].centerPuyo);
    }
  }
  
  static getNextPuyos() {
    let nextPuyos = this.nextPuyosSet.shift();
    this.nextPuyosSet.push({});
    this.nextPuyosSet[Config.nextPuyosNumber - 1].movablePuyo = Math.floor(Math.random() * this.puyoImages.length) + 1;
    this.nextPuyosSet[Config.nextPuyosNumber - 1].movablePuyoElement = this.getPuyo(this.nextPuyosSet[Config.nextPuyosNumber - 1].movablePuyo);
    this.nextPuyosSet[Config.nextPuyosNumber - 1].centerPuyo = Math.floor(Math.random() * this.puyoImages.length) + 1;
    this.nextPuyosSet[Config.nextPuyosNumber - 1].centerPuyoElement = this.getPuyo(this.nextPuyosSet[Config.nextPuyosNumber - 1].centerPuyo);
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

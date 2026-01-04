class Score {
  static initialize() {
    this.rensaBonus = [0, 8, 16, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448, 480, 512, 544, 576, 608, 640, 672];
    this.pieceBonus = [0, 0, 0, 0, 2, 3, 4, 5, 6, 7, 10, 10];
    this.colorBonus = [0, 0, 3, 6, 12, 24];
    this.fontTemplateList = [];
    for (let a = 0; a < 10; a++) {
      this.fontTemplateList.push(new Image());
      Game.loadImg(`img/${a}.png`, this.fontTemplateList[a], () => {
        this.fontTemplateList[a].height = Config.fontHeight;
        this.fontTemplateList[a].width = this.fontTemplateList[a].width / this.fontTemplateList[a].height * Config.fontHeight;
      });
    }
  }
  
  static start() {
    this.fontLength = Math.floor(Config.stageCols * Config.puyoImgWidth / Score.fontTemplateList[0].width);
    this.score = 0;
    this.showScore();
  }
  
  static showScore () {
    let score = this.score;
    while (Stage.scoreElement.firstChild) {
      Stage.scoreElement.removeChild(Stage.scoreElement.firstChild);
    }
    for (let a = 0; a < this.fontLength; a++) {
      const number = score % 10;
      Stage.scoreElement.insertBefore(this.fontTemplateList[number].cloneNode(true), Stage.scoreElement.firstChild);
      score = Math.floor(score / 10);
    }
  }
  
  static calculateScore (rensa, piece, color) {
    rensa = Math.min(rensa, Score.rensaBonus.length - 1);
    piece = Math.min(piece, Score.pieceBonus.length - 1);
    color = Math.min(color, Score.colorBonus.length - 1);
    let scale = Score.rensaBonus[rensa] + Score.pieceBonus[piece] + Score.colorBonus[color];
    if (scale === 0) {
      scale = 1;
    }
    this.addScore(scale * piece * 10);
  }
  
  static addScore (score) {
    this.score += score;
    this.showScore();
  }
}

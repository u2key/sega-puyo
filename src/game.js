class Game {
  static initialize() {
    this.mode = 'start';
    this.frame = 0;
    this.combinationCount = 0;
    this.imgQueue = [];
    this.imgQueueActive = false;
    PuyoImage.initialize();
    Stage.initialize();
    Player.initialize();
    Score.initialize();
    this.loop();
  }

  static loadImg(src, element, onload=()=>{}) {
    if (src != null && element != null) {
      this.imgQueue.push({src: src, element: element, onload: onload});
    }
    if (this.imgQueueActive == false) {
      let data = this.imgQueue.shift();
      if (data) {
        this.imgQueueActive = true;
        data.element.addEventListener('load', () => {
          this.imgQueueActive = false;
          data.onload();
        });
        data.element.src = data.src;
        console.log(`Load Image: ${data.src}`);
      }
    }
    if (this.imgQueue.length > 0) {
      setTimeout(() => this.loadImg(null, null), Config.loadImgInterval);
    }
  }

  static loop() {
    if (this.mode == 'start') {
      if (this.imgQueue.length == 0) {
        this.mode = 'checkFall';
        PuyoImage.start();
        Score.start();
      }
    } else if (this.mode == 'checkFall') {
      if (Stage.checkFall()) {
        this.mode = 'fall'
      } else {
        this.mode = 'checkErase';
      }
    } else if (this.mode == 'fall') {
      if (!Stage.fall()) {
        this.mode = 'checkErase';
      }
    } else if (this.mode == 'checkErase') {
      let eraseInfo = Stage.checkErase(this.frame);
      if (eraseInfo) {
        this.mode = 'erasing';
        this.combinationCount++;
        Score.calculateScore(this.combinationCount, eraseInfo.piece, eraseInfo.color);
        Stage.hideZenkeshi();
      } else {
        if (Stage.puyoCount === 0 && this.combinationCount > 0) {
          Stage.showZenkeshi();
          Score.addScore(3600);
        }
        this.combinationCount = 0;
        this.mode = 'newPuyo'
      }
    } else if(this.mode == 'erasing') {
      if (!Stage.erasing(this.frame)) {
        this.mode = 'checkFall';
      }
    } else if (this.mode == 'newPuyo') {
      if (!Player.createNewPuyo()) {
        this.mode = 'gameOver';
      } else {
        this.mode = 'playing';
      }
    } else if (this.mode == 'playing') {
      this.mode = Player.playing(this.frame);
    } else if (this.mode == 'moving') {
      if (!Player.moving(this.frame)) {
        this.mode = 'playing';
      }
    } else if (this.mode == 'rotating') {
      if (!Player.rotating(this.frame)) {
        this.mode = 'playing';
      }
    } else if (this.mode == 'fix') {
      Player.fix();
      this.mode = 'checkFall'
    } else if (this.mode == 'gameOver') {
      PuyoImage.prepareBatankyu(this.frame);
      this.mode = 'batankyu';
    } else if (this.mode == 'batankyu') {
      PuyoImage.batankyu(this.frame);
      Player.batankyu();
    }
    this.frame = this.frame + 1;
    requestAnimationFrame(() => this.loop());
  }
}

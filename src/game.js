let mode = 'start';
let frame = 0;
let combinationCount = 0;

window.addEventListener("load", function () {
  PuyoImage.initialize();
  Stage.initialize();
  Player.initialize();
  Score.initialize();
  loop();
});

function loop() {
  if (mode == 'start') {
    mode = 'checkFall';
  } else if (mode == 'checkFall') {
    if (Stage.checkFall()) {
      mode = 'fall'
    } else {
      mode = 'checkErase';
    }
  } else if (mode == 'fall') {
    if (!Stage.fall()) {
      mode = 'checkErase';
    }
  } else if (mode == 'checkErase') {
    const eraseInfo = Stage.checkErase(frame);
    if (eraseInfo) {
      mode = 'erasing';
      combinationCount++;
      Score.calculateScore(combinationCount, eraseInfo.piece, eraseInfo.color);
      Stage.hideZenkeshi();
    } else {
      if (Stage.puyoCount === 0 && combinationCount > 0) {
        Stage.showZenkeshi();
        Score.addScore(3600);
      }
      combinationCount = 0;
      mode = 'newPuyo'
    }
  } else if (mode == 'erasing') {
    if (!Stage.erasing(frame)) {
      mode = 'checkFall';
    }
  } else if (mode == 'newPuyo') {
    if (!Player.createNewPuyo()) {
      mode = 'gameOver';
    } else {
      mode = 'playing';
    }
  } else if (mode == 'playing') {
      mode = Player.playing(frame);
  } else if (mode == 'moving') {
    if (!Player.moving(frame)) {
      mode = 'playing';
    }
  } else if (mode == 'rotating') {
    if (!Player.rotating(frame)) {
      mode = 'playing';
    }
  } else if (mode == 'fix') {
    Player.fix();
    mode = 'checkFall'
  } else if (mode == 'gameOver') {
    PuyoImage.prepareBatankyu(frame);
    mode = 'batankyu';
  } else if (mode == 'batankyu') {
    PuyoImage.batankyu(frame);
    Player.batankyu();
  }
  frame = frame + 1;
  requestAnimationFrame(loop);
}

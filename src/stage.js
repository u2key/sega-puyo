class Stage {
  static initialize() {
    this.stageElement = document.getElementById("stage");
    this.stageElement.style.width = `${Config.puyoImgWidth * Config.stageCols}px`;
    this.stageElement.style.height = `${Config.puyoImgHeight * Config.stageRows}px`;
    this.stageElement.style.backgroundColor = Config.stageBackgroundColor;
    
    this.zenkeshiImage = new Image();
    Game.loadImg('img/zenkeshi.png', this.zenkeshiImage, () => {
      this.zenkeshiImage.width = Config.puyoImgWidth * 6;
      this.zenkeshiImage.style.position = 'absolute';
      this.zenkeshiImage.style.display = 'none';
    });
    this.stageElement.appendChild(Stage.zenkeshiImage);

    this.scoreElement = document.getElementById("score");
    this.scoreElement.style.backgroundColor = Config.scoreBackgroundColor;
    this.scoreElement.style.top = `${Config.puyoImgHeight * Config.stageRows}px`;
    this.scoreElement.style.width = `${Config.puyoImgWidth * Config.stageCols}px`;
    this.scoreElement.style.height = `${Config.fontHeight}px`;

    this.nextPuyosElement = document.getElementById("nextPuyos");
    this.nextPuyosElement.style.position = 'absolute';
    this.nextPuyosElement.style.top = '0px';
    this.nextPuyosElement.style.left = `${(document.body.clientWidth + (Config.puyoImgWidth * Config.stageCols)) / 2}px`;

    this.board = [];
    this.hiddenBoard = [];
    this.puyoCount = 0;
    for (let y = 0; y < Config.stageRows; y++) {
      this.board.push([]);
      for (let x = 0; x < Config.stageCols; x++) {
        this.board[y].push(null);
      }
    }
    for (let x = 0; x < Config.stageCols; x++) {
      this.hiddenBoard.push(null);
    }

    this.fallingPuyoList = [];
    this.erasingPuyoInfoList = [];
  }

  static showNextPuyos() {
    while (this.nextPuyosElement.firstChild) {
      this.nextPuyosElement.removeChild(this.nextPuyosElement.firstChild);
    }
    for (let a = 0; a < Config.nextPuyosNumber; a++) {
      this.nextPuyosElement.appendChild(PuyoImage.nextPuyosSet[a].movablePuyoElement);
      PuyoImage.nextPuyosSet[a].movablePuyoElement.style.position = 'fixed';
      PuyoImage.nextPuyosSet[a].movablePuyoElement.style.top = `${(a * 3 + 0) * Config.puyoImgHeight}px`;
      this.nextPuyosElement.appendChild(PuyoImage.nextPuyosSet[a].centerPuyoElement);
      PuyoImage.nextPuyosSet[a].centerPuyoElement.style.position = 'fixed';
      PuyoImage.nextPuyosSet[a].centerPuyoElement.style.top = `${(a * 3 + 1) * Config.puyoImgHeight}px`;
    }
  }
  
  static setPuyo(x, y, puyo) {
    const puyoImage = PuyoImage.getPuyo(puyo);
    puyoImage.style.left = `${x * Config.puyoImgWidth}px`;
    puyoImage.style.top = `${y * Config.puyoImgHeight}px`;
    this.stageElement.appendChild(puyoImage);
    this.board[y][x] = {puyo: puyo, element: puyoImage};
  }

  static setHiddenPuyo(x, puyo) {
    let puyoImage = PuyoImage.getPuyo(puyo);
    puyoImage.style.left = `${x * Config.puyoImgWidth}px`;
    puyoImage.style.top = `${-1 * Config.puyoImgHeight}px`;
    this.stageElement.appendChild(puyoImage);
    this.hiddenBoard[x] = {puyo: puyo, element: puyoImage};
  }
  
  static checkFall() {
    this.fallingPuyoList.length = 0;
    let isFalling = false;
    for (let y = Config.stageRows - 2; y >= 0; y--) { 
      const line = this.board[y];
      for (let x = 0; x < line.length; x++) {
        if (!this.board[y][x]) {
          continue;
        }
        if (!this.board[y + 1][x]) {
          let cell = this.board[y][x];
          this.board[y][x] = null;
          let dst = y;
          while (dst + 1 < Config.stageRows && this.board[dst + 1][x] == null) {
            dst = dst + 1;
          }
          this.board[dst][x] = cell;
          this.fallingPuyoList.push({
            element: cell.element,
            position: y * Config.puyoImgHeight,
            destination: dst * Config.puyoImgHeight,
            falling: true
          });
          isFalling = true;
        }
      }
      for (let x = 0; x < Config.stageCols; x++) {
        if (this.hiddenBoard[x]) {
          let dst = 0;
          while (dst < Config.stageRows && this.board[dst][x] == null) {
            dst = dst + 1;
          }
          if (dst > 0) {
            this.board[dst - 1][x] = this.hiddenBoard[x];
            this.hiddenBoard[x] = null;
            this.fallingPuyoList.push({
              element: this.board[dst - 1][x].element,
              position: -1 * Config.puyoImgHeight,
              destination: (dst - 1) * Config.puyoImgHeight,
              falling: true
            });
          }
          isFalling = true;
        }
      }
    }
    return isFalling;
  }
  
  static fall() {
    let isFalling = false;
    for (const fallingPuyo of this.fallingPuyoList) {
      if (!fallingPuyo.falling) {
        continue;
      }
      let position = fallingPuyo.position + Config.freeFallingSpeed;
      if (position >= fallingPuyo.destination) {
        position = fallingPuyo.destination;
        fallingPuyo.falling = false;
      } else {
        isFalling = true;
      }
      fallingPuyo.position = position;
      fallingPuyo.element.style.top = `${position}px`;
    }
    return isFalling;
  }

  /**
   * お邪魔ぷよ (puyo === OJAMA_COLOR=6) の扱い：
   *   - お邪魔自身は連結でカウントされない
   *   - 隣接する通常ぷよが4個以上消えると、お邪魔も一緒に消える
   */
  static checkErase(startFrame) {
    const OJAMA_COLOR = 6;
    this.eraseStartFrame = startFrame;
    this.erasingPuyoInfoList.length = 0;
    const erasedPuyoColor = {};
    const sequencePuyoInfoList = [];
    const existingPuyoInfoList = [];

    // ① 通常ぷよの連結チェック（お邪魔は含めない）
    const checkSequentialPuyo = (x, y) => {
      const orig = this.board[y][x];
      if (!orig) return false;
      const puyo = this.board[y][x].puyo;
      if (puyo === OJAMA_COLOR) return false; // お邪魔は連結しない

      sequencePuyoInfoList.push({x: x, y: y, cell: this.board[y][x]});
      this.board[y][x] = null;

      const direction = [[0, 1], [1, 0], [0, -1], [-1, 0]];
      for (let a = 0; a < direction.length; a++) {
        const dx = x + direction[a][0];
        const dy = y + direction[a][1];
        if (dx < 0 || dy < 0 || dx >= Config.stageCols || dy >= Config.stageRows) continue;
        const cell = this.board[dy][dx];
        if (!cell || cell.puyo !== puyo) continue;
        checkSequentialPuyo(dx, dy);
      }
    };

    for (let y = 0; y < Config.stageRows; y++) {
      for (let x = 0; x < Config.stageCols; x++) {
        sequencePuyoInfoList.length = 0;
        const puyoColor = this.board[y][x] && this.board[y][x].puyo;
        if (!puyoColor || puyoColor === OJAMA_COLOR) continue;
        checkSequentialPuyo(x, y);
        if (sequencePuyoInfoList.length === 0 || sequencePuyoInfoList.length < Config.erasePuyoCount) {
          if (sequencePuyoInfoList.length) {
            existingPuyoInfoList.push(...sequencePuyoInfoList);
          }
        } else {
          this.erasingPuyoInfoList.push(...sequencePuyoInfoList);
          erasedPuyoColor[puyoColor] = true;
        }
      }
    }

    // ② 消えた通常ぷよに隣接するお邪魔ぷよを一緒に消す
    if (this.erasingPuyoInfoList.length > 0) {
      const erasedSet = new Set(this.erasingPuyoInfoList.map(i => `${i.x},${i.y}`));
      const ojamaToErase = new Map(); // key: "x,y" -> info

      for (const info of this.erasingPuyoInfoList) {
        const directions = [[0,1],[1,0],[0,-1],[-1,0]];
        for (const [dx, dy] of directions) {
          const nx = info.x + dx;
          const ny = info.y + dy;
          if (nx < 0 || ny < 0 || nx >= Config.stageCols || ny >= Config.stageRows) continue;
          const key = `${nx},${ny}`;
          if (erasedSet.has(key) || ojamaToErase.has(key)) continue;
          const cell = this.board[ny][nx];
          if (cell && cell.puyo === OJAMA_COLOR) {
            ojamaToErase.set(key, {x: nx, y: ny, cell});
            this.board[ny][nx] = null;
          }
        }
      }
      // お邪魔も消去リストへ
      for (const info of ojamaToErase.values()) {
        this.erasingPuyoInfoList.push(info);
      }
    }

    this.puyoCount -= this.erasingPuyoInfoList.length;

    // 残ったぷよをboardに戻す
    for (const info of existingPuyoInfoList) {
      this.board[info.y][info.x] = info.cell;
    }

    if (this.erasingPuyoInfoList.length) {
      // お邪魔を除いた色数・個数でスコア計算
      const normalErased = this.erasingPuyoInfoList.filter(i => i.cell.puyo !== OJAMA_COLOR);
      return {
        piece: normalErased.length || 1,
        color: Object.keys(erasedPuyoColor).length || 1,
      };
    }
    return null;
  }

  static erasing(frame) {
    const elapsedFrame = frame - this.eraseStartFrame;
    const ratio = elapsedFrame / Config.eraseAnimationDuration;
    if (ratio > 1) {
      for (const info of this.erasingPuyoInfoList) {
        let element = info.cell.element;
        if (element.parentNode) this.stageElement.removeChild(element);
      }
      return false;
    } else if (ratio > 0.75) {
      for (const info of this.erasingPuyoInfoList) {
        info.cell.element.style.display = 'block';
      }
      return true;
    } else if (ratio > 0.50) {
      for (const info of this.erasingPuyoInfoList) {
        info.cell.element.style.display = 'none';
      }
      return true;
    } else if (ratio > 0.25) {
      for (const info of this.erasingPuyoInfoList) {
        info.cell.element.style.display = 'block';
      }
      return true;
    } else {
      for (const info of this.erasingPuyoInfoList) {
        info.cell.element.style.display = 'none';
      }
      return true;
    }
  }
  
  static showZenkeshi() {
    this.zenkeshiImage.style.display = 'block';
    this.zenkeshiImage.style.opacity = '1';
    const startTime = Date.now();
    const startTop = Config.puyoImgHeight * Config.stageRows;
    const endTop = Config.puyoImgHeight * Config.stageRows / 3;
    const animation = () => {
      const ratio = Math.min((Date.now() - startTime) / Config.zenkeshiDuration, 1);
      this.zenkeshiImage.style.top = `${(endTop - startTop) * ratio + startTop}px`;
      if (ratio !== 1) {
        requestAnimationFrame(animation);
      }
    };
    animation();
  }
  
  static hideZenkeshi() {
    const startTime = Date.now();
    const animation = () => {
      const ratio = Math.min((Date.now() - startTime) / Config.zenkeshiDuration, 1);
      this.zenkeshiImage.style.opacity = String(1 - ratio);
      if (ratio !== 1) {
        requestAnimationFrame(animation);
      } else {
        this.zenkeshiImage.style.display = 'none';
      }
    };
    animation();
  }
}

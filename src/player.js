class Player {
  static initialize () {
    this.keyStatus = {
      right: false,
      left: false,
      up: false,
      down: false
    };
    document.addEventListener('keydown', this.keyDownEvent);
    document.addEventListener('keyup', this.keyUpEvent);
    this.touchPoint = {sx: 0, sy: 0, ex: 0, ey: 0};
    document.addEventListener('touchstart', this.touchStartEvent);
    document.addEventListener('touchmove', this.touchMoveEvent);
    document.addEventListener('touchend', this.touchEndEvent);
  }

  static keyDownEvent(e) {
    e.preventDefault();
    if (e.code == 'ArrowLeft') {
      Player.keyStatus.left = true;
    } else if (e.code == "ArrowUp") {
      Player.keyStatus.up = true;
    } else if (e.code == "ArrowRight") {
      Player.keyStatus.right = true;
    } else if (e.code == "ArrowDown") {
      Player.keyStatus.down = true;
    }
    return false;
  }
  static keyUpEvent(e) {
    e.preventDefault();
    if (e.code == "ArrowLeft") {
      Player.keyStatus.left = false;
    } else if (e.code == "ArrowUp") {
      Player.keyStatus.up = false;
    } else if (e.code == "ArrowRight") {
      Player.keyStatus.right = false;
    } else if (e.code == "ArrowDown") {
      Player.keyStatus.down = false;
    }
    return false;
  }

  static touchStartEvent(e) {
    Player.touchPoint.sx = e.touches[0].clientX;
    Player.touchPoint.sy = e.touches[0].clientY;
  }
  static touchMoveEvent(e) {
    if (Math.abs(e.touches[0].clientX - Player.touchPoint.sx) < 20 &&
        Math.abs(e.touches[0].clientY - Player.touchPoint.sy) < 20
    ) {
      return
    }
    Player.touchPoint.ex = e.touches[0].clientX
    Player.touchPoint.ey = e.touches[0].clientY
    let horizonDirection = Player.touchPoint.ex - Player.touchPoint.sx;
    let verticalDirection = Player.touchPoint.ey - Player.touchPoint.sy;
    if (Math.abs(horizonDirection) < Math.abs(verticalDirection)) {
      if (verticalDirection < 0) {
        Player.keyStatus = {right: false, left: false, up: true, down: false};
      } else {
        Player.keyStatus = {right: false, left: false, up: false, down: true};
      }
    } else {
      if (horizonDirection < 0) {
        Player.keyStatus = {right: false, left: true, up: false, down: false};
      } else {
        Player.keyStatus = {right: true, left: false, up: false, down: false};
      }
    }
    Player.touchPoint.sx = Player.touchPoint.ex;
    Player.touchPoint.sy = Player.touchPoint.ey;
  }
  static touchEndEvent(e) {
    Player.keyStatus = {right: false, left: false, up: false, down: false};
  }
  
  static createNewPuyo () {
    if (Stage.board[0][2]) {
      return false;
    }
    let nextPuyosSet = PuyoImage.getNextPuyos();
    this.centerPuyo = nextPuyosSet.centerPuyo;
    this.centerPuyoElement = nextPuyosSet.centerPuyoElement;
    this.movablePuyo = nextPuyosSet.movablePuyo;
    this.movablePuyoElement = nextPuyosSet.movablePuyoElement;
    Stage.stageElement.appendChild(this.centerPuyoElement);
    this.centerPuyoElement.style.position = 'absolute';
    Stage.stageElement.appendChild(this.movablePuyoElement);
    this.movablePuyoElement.style.position = 'absolute';
    this.puyoStatus = {
      x: 2, y: -1, 
      left: 2 * Config.puyoImgWidth, 
      top: -1 * Config.puyoImgHeight, 
      dx: 0, dy: -1, 
      rotation: 90
    };
    this.groundFrame = 0;
    this.setPuyoPosition();
    return true;
  }
  
  static setPuyoPosition () {
    this.centerPuyoElement.style.left = `${this.puyoStatus.left}px`;
    this.centerPuyoElement.style.top = `${this.puyoStatus.top}px`;
    const x = this.puyoStatus.left + Math.cos(this.puyoStatus.rotation * Math.PI / 180) * Config.puyoImgWidth;
    const y = this.puyoStatus.top - Math.sin(this.puyoStatus.rotation * Math.PI / 180) * Config.puyoImgHeight;
    this.movablePuyoElement.style.left = `${x}px`;
    this.movablePuyoElement.style.top = `${y}px`;
  }

  static falling (isDownPressed) {
    let isBlocked = false;
    let x = this.puyoStatus.x;
    let y = this.puyoStatus.y;
    let dx = this.puyoStatus.dx;
    let dy = this.puyoStatus.dy;
    if (y + 1 >= Config.stageRows || Stage.board[y + 1][x] || (y + dy + 1 >= 0 && (y + dy + 1 >= Config.stageRows || Stage.board[y + dy + 1][x + dx]))) {
      isBlocked = true;
    }
    if (!isBlocked) {
      this.puyoStatus.top += Config.playerFallingSpeed;
      if (isDownPressed) {
        this.puyoStatus.top += Config.playerDownSpeed;
      }
      if (Math.floor(this.puyoStatus.top / Config.puyoImgHeight) != y) {
        if (isDownPressed) {
          Score.addScore(1);
        }
        y = this.puyoStatus.y = y + 1;
        if (y + 1 >= Config.stageRows || Stage.board[y + 1][x] || (y + dy + 1 >= 0 && (y + dy + 1 >= Config.stageRows || Stage.board[y + dy + 1][x + dx]))) {
          isBlocked = true;
        }
        if (!isBlocked) {
          this.groundFrame = 0;
        } else {
          this.puyoStatus.top = y * Config.puyoImgHeight;
          this.groundFrame = 1;
        }
      } else {
        this.groundFrame = 0;
      }
      return false;
    }
    if (this.groundFrame == 0) {
      this.groundFrame = 1;
    } else {
      this.groundFrame++;
      if (this.groundFrame > Config.playerGroundFrame) {
        return true;
      }
    }
    return false;
  }
    
  static playing(frame) {
    let nextMode = 'playing';
    if (this.falling(this.keyStatus.down)) {
      this.setPuyoPosition();
      nextNode = 'fix';
    }
    this.setPuyoPosition();
    if (this.keyStatus.right || this.keyStatus.left) {
      const cx = (this.keyStatus.right) ? 1 : -1;
      const x = this.puyoStatus.x;
      const y = this.puyoStatus.y;
      const mx = x + this.puyoStatus.dx;
      const my = y + this.puyoStatus.dy;
      let canMove = true;
      if ((y < 0 || x + cx < 0 || x + cx >= Config.stageCols || Stage.board[y][x + cx]) && y >= 0) {
        canMove = false;
      }
      if ((my < 0 || mx + cx < 0 || mx + cx >= Config.stageCols || Stage.board[my][mx + cx]) && my >= 0) {
        canMove = false;
      }
      if (this.groundFrame === 0) {
        if ((y + 1 < 0 || x + cx < 0 || x + cx >= Config.stageCols || Stage.board[y + 1][x + cx]) && y + 1 >= 0) {
          canMove = false;
        }
        if ((my + 1 < 0 || mx + cx < 0 || mx + cx >= Config.stageCols || Stage.board[my + 1][mx + cx]) && my + 1 >= 0) {
          canMove = false;
        }
      }
      if (canMove) {         
        this.actionStartFrame = frame;
        this.moveSource = x * Config.puyoImgWidth;
        this.moveDestination = (x + cx) * Config.puyoImgWidth;
        this.puyoStatus.x = this.puyoStatus.x + cx;
        nextMode = 'moving';
      }
    }
    if (this.keyStatus.up) {
      const x = this.puyoStatus.x;
      const y = this.puyoStatus.y;
      const mx = x + this.puyoStatus.dx;
      const my = y + this.puyoStatus.dy;
      const rotation = this.puyoStatus.rotation;
      let canRotate = true;
      let canSwap = false;
      let cx = 0;
      let cy = 0;
      if (rotation === 90) {
        if ((y + 1 < 0 || x - 1 < 0 || x - 1 >= Config.stageCols || Stage.board[y + 1][x - 1]) && y + 1 >= 0) {
          cx = 1;
        }
        if (cx === 1 && (y + 1 < 0 || x + 1 < 0 || y + 1 >= Config.stageRows || x + 1 >= Config.stageCols || Stage.board[y + 1][x + 1]) && y + 1 >= 0) {
          canRotate = false;
        }
        canSwap = true;
      } else if (rotation === 180) {
        if ((y + 2 < 0 || y + 2 >= Config.stageRows || Stage.board[y + 2][x]) && y + 2 >= 0) {
          cy = -1;
        }
        if ((y + 2 < 0 || y + 2 >= Config.stageRows || x - 1 < 0 || Stage.board[y + 2][x - 1]) && y + 2 >= 0) {
          cy = -1;
        }
      } else if (rotation === 270) {
        if ((y + 1 < 0 || x + 1 < 0 || x + 1 >= Config.stageCols || Stage.board[y + 1][x + 1]) && y + 1 >= 0) {
          cx = -1;
        }
        if (cx === -1 && (y + 1 < 0 || x - 1 < 0 || x - 1 >= Config.stageCols || Stage.board[y + 1][x - 1]) && y + 1 >= 0) {
          canRotate = false;
        }
        canSwap = true;
      }
      if (canRotate) {
        if (cy === -1) {
          if (this.groundFrame > 0) {
            this.puyoStatus.y = this.puyoStatus.y - 1;
            this.groundFrame = 0;
          }
          this.puyoStatus.top = this.puyoStatus.y * Config.puyoImgHeight;
        }
        this.actionStartFrame = frame;
        this.rotateDegree = 90;
        this.rotateBeforeLeft = x * Config.puyoImgWidth;
        this.rotateAfterLeft = (x + cx) * Config.puyoImgWidth;
        this.rotateFromRotation = this.puyoStatus.rotation;
        this.puyoStatus.x = this.puyoStatus.x + cx;
        const distRotation = (this.puyoStatus.rotation + this.rotateDegree) % 360;
        const dCombi = [[1, 0], [0, -1], [-1, 0], [0, 1]][distRotation / 90];
        this.puyoStatus.dx = dCombi[0];
        this.puyoStatus.dy = dCombi[1];
        nextMode = 'rotating';
      } else if (canSwap) {
        if (this.groundFrame > 0) {
          this.puyoStatus.y = this.puyoStatus.y - 1;
          this.groundFrame = 0;
        }
        this.puyoStatus.top = this.puyoStatus.y * Config.puyoImgHeight;
        this.actionStartFrame = frame;
        this.rotateDegree = 180;
        this.rotateBeforeLeft = x * Config.puyoImgWidth;
        this.rotateAfterLeft = x * Config.puyoImgWidth;
        this.rotateFromRotation = this.puyoStatus.rotation;
        this.puyoStatus.dx = 0;
        if (this.rotateFromRotation == 90) {
          this.puyoStatus.dy = 1;
        } else {
          this.puyoStatus.dy = -1;
        }
        nextMode = 'rotating';
      }
    }
    return nextMode;
  }
  
  static moving(frame) {
    this.falling();
    const ratio = Math.min(1, (frame - this.actionStartFrame) / Config.playerMoveFrame);
    this.puyoStatus.left = ratio * (this.moveDestination - this.moveSource) + this.moveSource;
    this.setPuyoPosition();
    if (ratio === 1) {
      return false;
    }
    return true;
  }
  
  static rotating(frame) {
    this.falling();
    const ratio = Math.min(1, (frame - this.actionStartFrame) / Config.playerRotateFrame);
    this.puyoStatus.left = (this.rotateAfterLeft - this.rotateBeforeLeft) * ratio + this.rotateBeforeLeft;
    this.puyoStatus.rotation = this.rotateFromRotation + ratio * this.rotateDegree;
    this.setPuyoPosition();
    if (ratio === 1) {
      this.puyoStatus.rotation = (this.rotateFromRotation + this.rotateDegree) % 360;
      return false;
    }
    return true;
  }
  
  static fix() {
    if (this.puyoStatus.y >= 0) {
      Stage.setPuyo(this.puyoStatus.x, this.puyoStatus.y, this.centerPuyo);
      Stage.puyoCount = Stage.puyoCount + 1;
    } else {
      Stage.setHiddenPuyo(this.puyoStatus.x, this.centerPuyo);
      Stage.puyoCount = Stage.puyoCount + 1;
    }
    if (this.puyoStatus.y + this.puyoStatus.dy >= 0) {
      Stage.setPuyo(this.puyoStatus.x + this.puyoStatus.dx, this.puyoStatus.y + this.puyoStatus.dy, this.movablePuyo);
      Stage.puyoCount = Stage.puyoCount + 1;
    } else {
      Stage.setHiddenPuyo(this.puyoStatus.x + this.puyoStatus.dx, this.movablePuyo);
      Stage.puyoCount = Stage.puyoCount + 1;
    }
    Stage.stageElement.removeChild(this.centerPuyoElement);
    Stage.stageElement.removeChild(this.movablePuyoElement);
    this.centerPuyoElement = null;
    this.movablePuyoElement = null;
  }

  static batankyu() {
    if (this.keyStatus.up) {
      location.reload()
    }
  }
}

class Game {
  static initialize() {
    this.mode = 'start';
    this.frame = 0;
    this.combinationCount = 0;
    this.imgQueue = [];
    this.imgQueueActive = false;
    this.isOnline = true; // オンラインモード
    this.gameStarted = false;

    // 各モジュール初期化
    PuyoImage.initialize();
    Stage.initialize();
    Player.initialize();
    Score.initialize();
    UI.initialize();
    Network.initialize();
    Ojama.initialize();

    // ゲームループ開始（マッチング前はstartモードで待機）
    this.loop();

    // WebSocket接続
    this._connectOnline();
  }

  static async _connectOnline() {
    const wsUrl = `wss://${location.host}/sega-puyo-socket`;
    UI.showStatus('サーバーに接続中...');
    try {
      await Network.connect(wsUrl);
      UI.showStatus('対戦相手を待っています...');
    } catch (e) {
      UI.showStatus('接続失敗。シングルプレイモードで起動します。');
      console.warn('WebSocket connect failed, falling back to single player', e);
      this.isOnline = false;
      // シングルプレイとして即スタート
      setTimeout(() => {
        UI.hideOverlay();
        this.gameStarted = true;
      }, 1500);
      return;
    }

    // マッチング完了コールバック
    Network.onMatchedCallback = (playerIndex, seed) => {
      RNG.setSeed(seed);
      UI.showStatus(`マッチング成立！ あなたは${playerIndex === 0 ? '先攻(左)' : '後攻(右)'}です`);
      setTimeout(() => {
        UI.hideOverlay();
        UI.positionOpponentArea();
        UI.positionOjamaIndicator();
        UI.setStatusBar(`オンライン対戦中 - Player ${playerIndex + 1}`);
        this.gameStarted = true;
      }, 1000);
    };

    // 相手ボード受信
    Network.onOpponentBoardCallback = (msg) => {
      UI.updateOpponentBoard(msg.board, msg.nextPuyos, msg.score, msg.garbage);
    };

    // お邪魔受信（Network.pendingOjamaを直接Ojama.pendingに同期）
    Network.onReceiveOjamaCallback = (total) => {
      // Network側でpendingOjamaが加算済み、Ojamaに同期するだけ
      Ojama.pending = Network.pendingOjama;
      UI.updateOjamaIndicator(Ojama.pending, Network.ojamaBuffer);
    };

    // 相手ゲームオーバー → 自分が勝利
    Network.onOpponentGameOverCallback = () => {
      this.mode = 'win';
      UI.showResult(true);
    };

    // 相手切断
    Network.onOpponentDisconnectedCallback = () => {
      if (this.mode !== 'win' && this.mode !== 'gameOver') {
        UI.setStatusBar('相手が切断しました');
        UI.showResult(true);
        this.mode = 'win';
      }
    };
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
    if (this.mode === 'start') {
      if (this.imgQueue.length == 0 && this.gameStarted) {
        this.mode = 'checkFall';
        PuyoImage.start();
        Score.start();
      }
      // gameStarted が false のときは待機（何もしない）
    } else if (this.mode === 'checkFall') {
      if (Stage.checkFall()) {
        this.mode = 'fall';
      } else {
        this.mode = 'checkErase';
      }
    } else if (this.mode === 'fall') {
      if (!Stage.fall()) {
        this.mode = 'checkErase';
      }
    } else if (this.mode === 'checkErase') {
      let eraseInfo = Stage.checkErase(this.frame);
      if (eraseInfo) {
        this.mode = 'erasing';
        this.combinationCount++;
        Score.calculateScore(this.combinationCount, eraseInfo.piece, eraseInfo.color);
        Stage.hideZenkeshi();

        // ── お邪魔ダメージ計算 & 蓄積 ──
        const ojama = Ojama.calculateDamage(this.combinationCount, eraseInfo.piece, eraseInfo.color);
        if (ojama > 0) {
          Network.addDamage(ojama);
          UI.updateOjamaIndicator(Ojama.pending, Network.ojamaBuffer);
        }
      } else {
        if (Stage.puyoCount === 0 && this.combinationCount > 0) {
          Stage.showZenkeshi();
          Score.addScore(3600);
          // 全消し：ボーナスお邪魔
          Network.addDamage(30);
        }
        this.combinationCount = 0;

        // 連鎖終了 → 蓄積したダメージを送信
        Network.flushDamage();

        this.mode = 'newPuyo';
      }
    } else if (this.mode === 'erasing') {
      if (!Stage.erasing(this.frame)) {
        this.mode = 'checkFall';
      }
    } else if (this.mode === 'newPuyo') {
      // ── お邪魔降下処理（ぷよ設置直後） ──
      const dropped = Ojama.dropIfPending();
      if (dropped > 0) {
        // お邪魔を降ろした後に落下チェック
        this.mode = 'checkFall';
      } else if (!Player.createNewPuyo()) {
        this.mode = 'gameOver';
      } else {
        this.mode = 'playing';
      }

      // ── 盤面情報を相手に送信 ──
      this._broadcastBoard();

    } else if (this.mode === 'playing') {
      this.mode = Player.playing(this.frame);
    } else if (this.mode === 'moving') {
      if (!Player.moving(this.frame)) {
        this.mode = 'playing';
      }
    } else if (this.mode === 'rotating') {
      if (!Player.rotating(this.frame)) {
        this.mode = 'playing';
      }
    } else if (this.mode === 'fix') {
      Player.fix();
      this.mode = 'checkFall';
    } else if (this.mode === 'gameOver') {
      Network.sendGameOver();
      PuyoImage.prepareBatankyu(this.frame);
      this.mode = 'batankyu';
      UI.showResult(false);
    } else if (this.mode === 'batankyu') {
      PuyoImage.batankyu(this.frame);
      Player.batankyu();
    } else if (this.mode === 'win') {
      // 勝利画面は UI.showResult が表示済み
    }

    this.frame = this.frame + 1;
    requestAnimationFrame(() => this.loop());
  }

  static _broadcastBoard() {
    if (!this.isOnline || !Network.connected) return;
    Network.sendBoard(
      Stage.board,
      null, // nextPuyos省略
      Score.score,
      Ojama.pending,
    );
  }
}

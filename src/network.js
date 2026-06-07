/**
 * Online Puyo Puyo - Network Manager
 * WebSocketによる通信管理
 */
class Network {
  static initialize() {
    this.ws = null;
    this.connected = false;
    this.playerIndex = -1; // 0=先攻(左), 1=後攻(右)
    this.pendingOjama = 0; // 受け取った未処理のお邪魔数
    this.ojamaBuffer = 0;  // 蓄積中のお邪魔（相手に送る前の一時保存）
    this.seed = null;
    this.onMatchedCallback = null;
    this.onOpponentBoardCallback = null;
    this.onReceiveOjamaCallback = null;
    this.onOpponentGameOverCallback = null;
    this.onOpponentDisconnectedCallback = null;
  }

  static connect(url) {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(url);
      this.ws.onopen = () => {
        this.connected = true;
        console.log('WebSocket connected');
        resolve();
      };
      this.ws.onerror = (e) => {
        reject(e);
      };
      this.ws.onmessage = (event) => {
        this._handleMessage(JSON.parse(event.data));
      };
      this.ws.onclose = () => {
        this.connected = false;
        if (this.onOpponentDisconnectedCallback) {
          this.onOpponentDisconnectedCallback();
        }
      };
    });
  }

  static _handleMessage(msg) {
    switch (msg.type) {
      case 'waiting':
        console.log('Waiting for opponent...');
        UI.showStatus('対戦相手を待っています...');
        break;

      case 'matched':
        this.playerIndex = msg.playerIndex;
        this.seed = msg.seed;
        console.log(`Matched! Player ${this.playerIndex}, Seed: ${this.seed}`);
        if (this.onMatchedCallback) this.onMatchedCallback(msg.playerIndex, msg.seed);
        break;

      case 'opponentBoard':
        if (this.onOpponentBoardCallback) this.onOpponentBoardCallback(msg);
        break;

      case 'receiveOjama':
        this.pendingOjama += msg.ojama;
        console.log(`Received ojama: ${msg.ojama}, total pending: ${this.pendingOjama}`);
        if (this.onReceiveOjamaCallback) this.onReceiveOjamaCallback(this.pendingOjama);
        break;

      case 'opponentGameOver':
        if (this.onOpponentGameOverCallback) this.onOpponentGameOverCallback();
        break;

      case 'opponentDisconnected':
        if (this.onOpponentDisconnectedCallback) this.onOpponentDisconnectedCallback();
        break;
    }
  }

  static sendBoard(board, nextPuyos, score, garbage) {
    if (!this.connected) return;
    // board を色番号の2D配列に変換（軽量化）
    const compactBoard = board.map(row => row.map(cell => cell ? cell.puyo : 0));
    this._send({ type: 'board', board: compactBoard, nextPuyos, score, garbage });
  }

  static sendDamage(ojama) {
    if (!this.connected || ojama <= 0) return;
    console.log(`Sending damage: ${ojama}`);
    this._send({ type: 'damage', ojama });
  }

  static sendGameOver() {
    if (!this.connected) return;
    this._send({ type: 'gameOver' });
  }

  static _send(msg) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  /**
   * 蓄積したお邪魔ダメージを相手に送信し、カウンタをリセット
   */
  static flushDamage() {
    if (this.ojamaBuffer > 0) {
      this.sendDamage(this.ojamaBuffer);
      this.ojamaBuffer = 0;
    }
  }

  /**
   * ぷよ消去時にダメージを蓄積
   */
  static addDamage(ojama) {
    this.ojamaBuffer += ojama;
  }

  /**
   * 相手からのお邪魔を確定して受け取る（ぷよ設置タイミングで呼ぶ）
   */
  static consumePendingOjama() {
    const ojama = this.pendingOjama;
    this.pendingOjama = 0;
    return ojama;
  }
}

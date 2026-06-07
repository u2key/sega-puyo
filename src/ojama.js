/**
 * お邪魔ぷよ管理クラス
 * お邪魔の蓄積・降下・描画を担当
 */
class Ojama {
  static initialize() {
    this.pending = 0;        // 降ってくる予定のお邪魔数
    this.dropQueue = [];     // 実際に降下する列の配列（1ターンぶん）
    this.OJAMA_COLOR = 6;    // お邪魔ぷよの識別色番号

    // お邪魔ぷよのビジュアル（グレー丸＋×印）をCanvasで生成
    this._buildOjamaImage();
  }

  static _buildOjamaImage() {
    const size = Config.puyoImgWidth;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // 本体（グレー丸）
    ctx.fillStyle = '#9ca3af';
    ctx.beginPath();
    ctx.arc(size/2, size/2, size/2 - 2, 0, Math.PI*2);
    ctx.fill();

    // 縁取り
    ctx.strokeStyle = '#6b7280';
    ctx.lineWidth = 2;
    ctx.stroke();

    // ×印（黒）
    const m = Math.floor(size * 0.22);
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = Math.max(2, size / 12);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(m, m); ctx.lineTo(size-m, size-m);
    ctx.moveTo(size-m, m); ctx.lineTo(m, size-m);
    ctx.stroke();

    // ハイライト
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.arc(size/2 - size*0.12, size/2 - size*0.12, size*0.2, 0, Math.PI*2);
    ctx.fill();

    this._ojamaCanvas = canvas;
    this._ojamaDataURL = canvas.toDataURL();
  }

  /**
   * お邪魔ぷよのImageElementを返す（stageに追加できる）
   */
  static getOjamaImage() {
    const img = new Image();
    img.src = this._ojamaDataURL;
    img.width  = Config.puyoImgWidth;
    img.height = Config.puyoImgHeight;
    img.style.position = 'absolute';
    img.style.width  = Config.puyoImgWidth  + 'px';
    img.style.height = Config.puyoImgHeight + 'px';
    return img;
  }

  /**
   * ダメージを受けてお邪魔数を蓄積
   */
  static addPending(count) {
    this.pending += count;
    console.log(`Ojama pending: ${this.pending}`);
    UI.updateOjamaIndicator(this.pending, Network.ojamaBuffer);
  }

  /**
   * ぷよ設置タイミングで呼ばれる。
   * pendingのお邪魔を1行ぶん（最大6個）フィールドに降ろす準備をする。
   * 返り値: 実際に降ろした数
   */
  static dropIfPending() {
    if (this.pending <= 0) return 0;

    const cols = Config.stageCols;
    const toDrop = Math.min(this.pending, cols); // 最大1行ぶん
    this.pending -= toDrop;
    UI.updateOjamaIndicator(this.pending, Network.ojamaBuffer);

    // どの列に落とすか決める（ランダム）
    const columns = Array.from({length: cols}, (_, i) => i);
    // Fisher-Yates shuffle
    for (let i = columns.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [columns[i], columns[j]] = [columns[j], columns[i]];
    }
    const targetCols = columns.slice(0, toDrop);

    // Stageのhiddenロウにお邪魔ぷよを置く
    for (const x of targetCols) {
      const puyoImage = Ojama.getOjamaImage();
      Stage.stageElement.appendChild(puyoImage);
      puyoImage.style.left = `${x * Config.puyoImgWidth}px`;
      puyoImage.style.top  = `${-1 * Config.puyoImgHeight}px`;

      // hiddenBoardに既存ぷよがある場合は上書き（ゲーム的には先入れ）
      if (!Stage.hiddenBoard[x]) {
        Stage.hiddenBoard[x] = { puyo: this.OJAMA_COLOR, element: puyoImage };
        Stage.puyoCount++;
      } else {
        // 既に別のぷよがいたら次の空き列を探す（簡易処理）
        Stage.stageElement.removeChild(puyoImage);
        // board上段から空きを探して直接設置
        for (let y = 0; y < Config.stageRows; y++) {
          if (!Stage.board[y][x]) {
            const img2 = Ojama.getOjamaImage();
            Stage.stageElement.appendChild(img2);
            img2.style.left = `${x * Config.puyoImgWidth}px`;
            img2.style.top  = `${y * Config.puyoImgHeight}px`;
            Stage.board[y][x] = { puyo: this.OJAMA_COLOR, element: img2 };
            Stage.puyoCount++;
            break;
          }
        }
      }
    }

    return toDrop;
  }

  /**
   * お邪魔ぷよのダメージ計算
   * ぷよぷよの公式：(10 * scale * piece) を 70 で割ったものがお邪魔数
   * 参考：https://puyonexus.com/wiki/Nuisance_Puyo
   * ここでは簡易版：消去したぷよ数 + 連鎖ボーナス
   */
  static calculateDamage(rensa, piece, color) {
    // 連鎖ボーナス
    const rensaBonus = [0, 8, 16, 32, 64, 96, 128, 160, 192, 224];
    const colorBonus = [0, 0, 3, 6, 12, 24];
    const pieceBonus = [0, 0, 0, 0, 2, 3, 4, 5, 6, 7, 10, 10];

    const rb = rensaBonus[Math.min(rensa - 1, rensaBonus.length - 1)] || 0;
    const cb = colorBonus[Math.min(color, colorBonus.length - 1)] || 0;
    const pb = pieceBonus[Math.min(piece, pieceBonus.length - 1)] || 0;
    let scale = rb + cb + pb;
    if (scale === 0) scale = 1;

    // ぷよぷよのお邪魔計算（概算）
    const score = scale * piece * 10;
    const ojama = Math.floor(score / 70);
    return Math.max(ojama, 0);
  }
}

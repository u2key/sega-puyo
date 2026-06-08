/**
 * Online Puyo Puyo - UI Manager
 * ローディング・マッチング画面・対戦相手フィールドの管理
 */
class UI {
  static initialize() {
    this._createOverlay();
    this._createOpponentArea();
    this._createOjamaIndicator();
    this._createStatusBar();

    // ウィンドウサイズに応じた全体スケーリング
    window.addEventListener('resize', () => this.resize());
    setTimeout(() => this.resize(), 0);
  }

  static resize() {
    const wrapper = document.getElementById('scale-wrapper');
    if (!wrapper) return;
    
    // ベースとなるレイアウトの想定サイズ
    // 幅: 対戦相手(192) + 自フィールド(240) + NEXT(48) + マージン等(32) = 512
    // 高さ: フィールド(480) + ラベル(30) + スコア(30) = 540
    const baseW = 512;
    const baseH = 540;
    
    const scaleW = window.innerWidth / baseW;
    const scaleH = window.innerHeight / baseH;
    const scale = Math.min(scaleW, scaleH) * 0.95; // 画面端に余裕を持たせるため0.95
    
    wrapper.style.transform = `scale(${scale})`;
    
    const actualW = baseW * scale;
    const actualH = baseH * scale;
    wrapper.style.left = `${(window.innerWidth - actualW) / 2}px`;
    wrapper.style.top = `${(window.innerHeight - actualH) / 2}px`;
  }

  // ── オーバーレイ（マッチング待機画面）──────────────────────────────────
  static _createOverlay() {
    this.overlay = document.createElement('div');
    this.overlay.id = 'online-overlay';
    Object.assign(this.overlay.style, {
      position: 'fixed', inset: '0',
      background: 'rgba(0,0,0,0.85)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      zIndex: '9999', color: '#fff',
      fontFamily: "'Segoe UI', sans-serif",
    });

    this.overlayTitle = document.createElement('div');
    this.overlayTitle.style.cssText = 'font-size:2.5rem; font-weight:800; margin-bottom:1rem; background: linear-gradient(135deg,#ff6b6b,#ffd93d,#6bcb77,#4d96ff); -webkit-background-clip:text; -webkit-text-fill-color:transparent;';
    this.overlayTitle.textContent = '🎮 ぷよぷよオンライン';

    this.overlayStatus = document.createElement('div');
    this.overlayStatus.style.cssText = 'font-size:1.2rem; color:#aaa; margin-bottom:2rem;';
    this.overlayStatus.textContent = 'サーバーに接続中...';

    const spinner = document.createElement('div');
    spinner.style.cssText = `
      width:50px; height:50px; border:5px solid #333;
      border-top-color:#ffd93d; border-radius:50%;
      animation: spin 1s linear infinite;
    `;
    const style = document.createElement('style');
    style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
    document.head.appendChild(style);

    this.overlay.appendChild(this.overlayTitle);
    this.overlay.appendChild(this.overlayStatus);
    this.overlay.appendChild(spinner);
    document.body.appendChild(this.overlay);
  }

  static showStatus(msg) {
    if (this.overlayStatus) this.overlayStatus.textContent = msg;
  }

  static hideOverlay() {
    if (this.overlay) {
      this.overlay.style.transition = 'opacity 0.5s';
      this.overlay.style.opacity = '0';
      setTimeout(() => {
        if (this.overlay && this.overlay.parentNode) {
          this.overlay.parentNode.removeChild(this.overlay);
        }
      }, 500);
    }
  }

  // ── 対戦相手のフィールド表示エリア ─────────────────────────────────────
  static _createOpponentArea() {
    const cols = Config.stageCols;
    const rows = Config.stageRows;
    const pw = Config.puyoImgWidth;
    const ph = Config.puyoImgHeight;

    this.opponentWrapper = document.createElement('div');
    Object.assign(this.opponentWrapper.style, {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '4px',
      width: '100%',
    });

    const label = document.createElement('div');
    label.style.cssText = 'color:#fff; font-size:0.85rem; font-weight:700; padding:2px 8px; background:rgba(0,0,0,0.5); border-radius:4px; margin-bottom:2px;';
    label.textContent = '相手';

    this.opponentCanvas = document.createElement('canvas');
    this.opponentCanvas.width = cols * pw;
    this.opponentCanvas.height = rows * ph;
    Object.assign(this.opponentCanvas.style, {
      width: '100%',
      boxSizing: 'border-box',
      border: '2px solid #555',
      borderRadius: '4px',
      background: '#1a1a2e',
      opacity: '0.85',
    });
    this.opponentCtx = this.opponentCanvas.getContext('2d');

    // お邪魔カウンタ
    this.opponentOjamaLabel = document.createElement('div');
    this.opponentOjamaLabel.style.cssText = 'color:#f0c040; font-size:0.85rem; font-weight:700; min-height:1.2em;';

    // スコア
    this.opponentScoreLabel = document.createElement('div');
    this.opponentScoreLabel.style.cssText = 'color:#aaa; font-size:0.75rem;';

    this.opponentWrapper.appendChild(label);
    this.opponentWrapper.appendChild(this.opponentCanvas);
    this.opponentWrapper.appendChild(this.opponentOjamaLabel);
    this.opponentWrapper.appendChild(this.opponentScoreLabel);
    
    const container = document.getElementById('opponent-container');
    if (container) {
      container.appendChild(this.opponentWrapper);
    } else {
      document.body.appendChild(this.opponentWrapper);
    }

    this.opponentWrapper.style.display = 'none';
  }

  static positionOpponentArea() {
    this.opponentWrapper.style.display = 'flex';
  }

  /**
   * 対戦相手のボードを描画 (色番号の2D配列)
   */
  static updateOpponentBoard(board, nextPuyos, score, garbage) {
    const ctx = this.opponentCtx;
    const pw = Config.puyoImgWidth;
    const ph = Config.puyoImgHeight;
    const cols = Config.stageCols;
    const rows = Config.stageRows;

    ctx.clearRect(0, 0, cols * pw, rows * ph);

    // 背景
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, cols * pw, rows * ph);

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const puyo = board[y] && board[y][x];
        if (!puyo) continue;
        const isOjama = puyo === 6; // お邪魔ぷよは色6

        let imgToDraw = null;
        if (isOjama) {
          imgToDraw = Ojama._ojamaCanvas;
        } else if (puyo >= 1 && puyo <= 5) {
          // PuyoImage.puyoImages[0] が色1に対応する
          imgToDraw = PuyoImage.puyoImages[puyo - 1];
        }

        if (imgToDraw) {
          ctx.drawImage(imgToDraw, x * pw, y * ph, pw, ph);
        }
      }
    }

    if (this.opponentScoreLabel) {
      this.opponentScoreLabel.textContent = `スコア: ${score || 0}`;
    }
    if (this.opponentOjamaLabel && garbage > 0) {
      this.opponentOjamaLabel.textContent = `⬇ お邪魔: ${garbage}個`;
    } else if (this.opponentOjamaLabel) {
      this.opponentOjamaLabel.textContent = '';
    }
  }

  // ── 自分のお邪魔インジケーター ─────────────────────────────────────────
  static _createOjamaIndicator() {
    this.ojamaIndicator = document.createElement('div');
    this.ojamaIndicator.id = 'ojama-indicator';
    Object.assign(this.ojamaIndicator.style, {
      position: 'absolute',
      top: '-30px',
      left: '0px',
      background: 'rgba(0,0,0,0.7)',
      color: '#ffd93d',
      fontFamily: 'monospace',
      fontSize: '0.9rem',
      fontWeight: '700',
      padding: '4px 8px',
      borderRadius: '6px',
      zIndex: '200',
      display: 'none',
      whiteSpace: 'nowrap',
    });
    
    const wrapper = document.getElementById('game-wrapper');
    if (wrapper) {
      wrapper.appendChild(this.ojamaIndicator);
    } else {
      document.body.appendChild(this.ojamaIndicator);
    }
  }

  static positionOjamaIndicator() {
    // 構造的に対応済みのため何もしない
  }

  static updateOjamaIndicator(pending, buffer) {
    if (pending > 0 || buffer > 0) {
      this.ojamaIndicator.style.display = 'block';
      let text = '';
      if (pending > 0) text += `⬇ 受信: ${pending}個  `;
      if (buffer > 0) text += `⬆ 送信予定: ${buffer}個`;
      this.ojamaIndicator.textContent = text;
    } else {
      this.ojamaIndicator.style.display = 'none';
    }
  }

  // ── ステータスバー ─────────────────────────────────────────────────────
  static _createStatusBar() {
    this.statusBar = document.createElement('div');
    Object.assign(this.statusBar.style, {
      position: 'fixed',
      bottom: '8px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(0,0,0,0.6)',
      color: '#aaa',
      fontSize: '0.75rem',
      padding: '3px 10px',
      borderRadius: '12px',
      zIndex: '200',
    });
    document.body.appendChild(this.statusBar);
  }

  static setStatusBar(text) {
    if (this.statusBar) this.statusBar.textContent = text;
  }

  // ── 勝敗表示 ───────────────────────────────────────────────────────────
  static showResult(won) {
    const div = document.createElement('div');
    Object.assign(div.style, {
      position: 'fixed', inset: '0',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.75)',
      zIndex: '9999',
      fontFamily: "'Segoe UI', sans-serif",
      color: '#fff',
    });
    div.innerHTML = `
      <div style="font-size:4rem; margin-bottom:1rem;">${won ? '🎉' : '💀'}</div>
      <div style="font-size:3rem; font-weight:900; background:linear-gradient(135deg,${won?'#ffd93d,#ff6b6b':'#6b7280,#374151'}); -webkit-background-clip:text; -webkit-text-fill-color:transparent;">
        ${won ? 'WIN!' : 'LOSE...'}
      </div>
      <div style="margin-top:2rem; font-size:1rem; color:#aaa;">↑キーまたはクリックで再スタート</div>
    `;
    div.addEventListener('click', () => location.reload());
    document.body.appendChild(div);
  }
}

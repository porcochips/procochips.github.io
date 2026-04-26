(function () {
  'use strict';

  const CHARSET = " .`'^\",:;Il!i~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";

  function isDark() {
    return document.documentElement.getAttribute('data-theme') === 'dark';
  }

  class AsciiHero {
    constructor(container) {
      this.container = container;
      this.mouse = { x: 0.5, y: 0.5 };
      this.time  = 0;

      // off-screen canvas for text rendering
      this.textCanvas = document.createElement('canvas');
      this.textCtx    = this.textCanvas.getContext('2d');

      // visible pre element for ASCII output
      this.pre = document.createElement('pre');
      Object.assign(this.pre.style, {
        margin: '0', padding: '0',
        lineHeight: '1em',
        position: 'absolute',
        inset: '0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Fira Code', monospace",
        fontSize: '8px',
        userSelect: 'none',
        pointerEvents: 'none',
        backgroundImage: 'radial-gradient(circle, #ff6188 0%, #fc9867 40%, #ffd866 100%)',
        backgroundAttachment: 'fixed',
        webkitBackgroundClip: 'text',
        backgroundClip: 'text',
        webkitTextFillColor: 'transparent',
        color: 'transparent',
        overflow: 'hidden',
        whiteSpace: 'pre',
      });
      container.appendChild(this.pre);

      // read-back canvas (tiny, for pixel sampling)
      this.sampleCanvas = document.createElement('canvas');
      this.sampleCtx    = this.sampleCanvas.getContext('2d', { willReadFrequently: true });

      this._bindEvents();
      this._observe();
    }

    _bindEvents() {
      this.container.addEventListener('mousemove', e => {
        const b = this.container.getBoundingClientRect();
        this.mouse.x = (e.clientX - b.left) / b.width;
        this.mouse.y = (e.clientY - b.top)  / b.height;
      });
      this.container.addEventListener('mouseleave', () => {
        this.mouse = { x: 0.5, y: 0.5 };
      });
    }

    _observe() {
      const ro = new ResizeObserver(() => this._computeSize());
      ro.observe(this.container);
    }

    _computeSize() {
      const b = this.container.getBoundingClientRect();
      this.W = b.width  || 800;
      this.H = b.height || 220;
    }

    _drawText(t) {
      const fontSize = 160;
      const text = "proco's chips";
      const font = `700 ${fontSize}px SUIT, sans-serif`;

      // measure
      this.textCtx.font = font;
      const m = this.textCtx.measureText(text);
      const tw = Math.ceil(m.width) + 20;
      const th = Math.ceil(m.actualBoundingBoxAscent + m.actualBoundingBoxDescent) + 20;

      this.textCanvas.width  = tw;
      this.textCanvas.height = th;

      this.textCtx.clearRect(0, 0, tw, th);
      this.textCtx.fillStyle = isDark() ? '#e8e8e8' : '#1a1a1a';
      this.textCtx.font = font;
      this.textCtx.fillText(text, 10, 10 + m.actualBoundingBoxAscent);

      return { tw, th };
    }

    _frame(t) {
      this.time = t * 0.001;
      const { tw, th } = this._drawText(this.time);

      // ASCII grid dimensions
      const FONT_W = 5;
      const FONT_H = 8;
      const cols = Math.floor(this.W / FONT_W);
      const rows = Math.floor(this.H / FONT_H);

      this.sampleCanvas.width  = cols;
      this.sampleCanvas.height = rows;

      const ctx = this.sampleCtx;
      ctx.clearRect(0, 0, cols, rows);

      // mouse-driven tilt (CSS transform on textCanvas)
      const tiltX = (this.mouse.y - 0.5) * 0.4;
      const tiltY = (this.mouse.x - 0.5) * 0.4;

      // wave offset
      const waveAmp = 6;
      const waveFreq = 2;

      // draw text with perspective warp via canvas transform
      ctx.save();
      ctx.translate(cols / 2, rows / 2);

      // simple scale + skew for pseudo-3D tilt
      const scaleX = Math.cos(tiltY) * 0.9;
      const scaleY = Math.cos(tiltX) * 0.9;
      const skewX  = Math.sin(tiltX) * 0.3;
      const skewY  = Math.sin(tiltY) * 0.3;

      ctx.transform(scaleX, skewY, skewX, scaleY, 0, 0);

      const destW = cols * 0.9;
      const destH = rows * 0.9;
      ctx.drawImage(
        this.textCanvas,
        -destW / 2, -destH / 2,
        destW, destH
      );
      ctx.restore();

      // sample pixels → ASCII
      const imgData = ctx.getImageData(0, 0, cols, rows).data;
      let str = '';
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const i = (c + r * cols) * 4;
          const a = imgData[i + 3];
          if (a < 10) { str += ' '; continue; }
          const gray = (0.3 * imgData[i] + 0.6 * imgData[i+1] + 0.1 * imgData[i+2]) / 255;
          const idx  = Math.floor(gray * (CHARSET.length - 1));
          str += CHARSET[CHARSET.length - 1 - idx];
        }
        str += '\n';
      }
      this.pre.textContent = str;
    }

    start() {
      this._computeSize();
      const loop = (t) => {
        this._raf = requestAnimationFrame(loop);
        this._frame(t);
      };
      requestAnimationFrame(loop);
    }
  }

  function init() {
    const container = document.getElementById('ascii-hero-container');
    if (!container) return;
    const hero = new AsciiHero(container);
    hero.start();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

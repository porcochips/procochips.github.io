(function () {
  'use strict';

  const PX_RATIO = window.devicePixelRatio || 1;

  Math.map = function (n, start, stop, start2, stop2) {
    return ((n - start) / (stop - start)) * (stop2 - start2) + start2;
  };

  const vertexShader = `
    varying vec2 vUv;
    uniform float uTime;
    uniform float uEnableWaves;
    void main() {
      vUv = uv;
      float t = uTime * 5.0;
      vec3 pos = position;
      pos.x += sin(t + position.y) * 0.5 * uEnableWaves;
      pos.y += cos(t + position.z) * 0.15 * uEnableWaves;
      pos.z += sin(t + position.x) * uEnableWaves;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `;

  const fragmentShader = `
    varying vec2 vUv;
    uniform float uTime;
    uniform sampler2D uTexture;
    void main() {
      float t = uTime;
      vec2 pos = vUv;
      float r = texture2D(uTexture, pos + cos(t * 2.0 - t + pos.x) * 0.01).r;
      float g = texture2D(uTexture, pos + tan(t * 0.5 + pos.x - t) * 0.01).g;
      float b = texture2D(uTexture, pos - cos(t * 2.0 + t + pos.y) * 0.01).b;
      float a = texture2D(uTexture, pos).a;
      gl_FragColor = vec4(r, g, b, a);
    }
  `;

  class AsciiFilter {
    constructor(renderer, { fontSize = 8, fontFamily = "'Fira Code', monospace", charset, invert } = {}) {
      this.renderer = renderer;
      this.domElement = document.createElement('div');
      this.domElement.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;';

      this.pre = document.createElement('pre');
      this.domElement.appendChild(this.pre);

      this.canvas = document.createElement('canvas');
      this.context = this.canvas.getContext('2d');
      this.domElement.appendChild(this.canvas);

      this.invert = invert ?? true;
      this.fontSize = fontSize;
      this.fontFamily = fontFamily;
      this.charset = charset ?? " .'`^\",:;Il!i~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";

      this.context.imageSmoothingEnabled = false;
      this.center = { x: 0, y: 0 };
      this.mouse  = { x: 0, y: 0 };
      this.deg = 0;

      this._onMouseMove = this._onMouseMove.bind(this);
      document.addEventListener('mousemove', this._onMouseMove);
    }

    setSize(w, h) {
      this.width = w;
      this.height = h;
      this.renderer.setSize(w, h);
      this._reset();
      this.center = { x: w / 2, y: h / 2 };
      this.mouse  = { x: w / 2, y: h / 2 };
    }

    _reset() {
      const ctx = this.context;
      ctx.font = `${this.fontSize}px ${this.fontFamily}`;
      const charW = ctx.measureText('A').width;

      this.cols = Math.floor(this.width  / charW);
      this.rows = Math.floor(this.height / this.fontSize);

      this.canvas.width  = this.cols;
      this.canvas.height = this.rows;

      Object.assign(this.pre.style, {
        fontFamily: this.fontFamily,
        fontSize: `${this.fontSize}px`,
        margin: '0', padding: '0',
        lineHeight: '1em',
        position: 'absolute',
        left: '0', top: '0',
        zIndex: '9',
        mixBlendMode: 'difference',
        backgroundImage: 'radial-gradient(circle, #ff6188 0%, #fc9867 40%, #ffd866 100%)',
        backgroundAttachment: 'fixed',
        webkitTextFillColor: 'transparent',
        webkitBackgroundClip: 'text',
        userSelect: 'none',
        pointerEvents: 'none',
      });

      Object.assign(this.canvas.style, {
        position: 'absolute', left: '0', top: '0',
        width: '100%', height: '100%',
        imageRendering: 'pixelated',
        opacity: '0',
      });
    }

    render(scene, camera) {
      this.renderer.render(scene, camera);
      const w = this.canvas.width;
      const h = this.canvas.height;
      this.context.clearRect(0, 0, w, h);
      if (w && h) this.context.drawImage(this.renderer.domElement, 0, 0, w, h);
      this._asciify(w, h);
      this._hue();
    }

    _onMouseMove(e) {
      this.mouse = { x: e.clientX * PX_RATIO, y: e.clientY * PX_RATIO };
    }

    get _dx() { return this.mouse.x - this.center.x; }
    get _dy() { return this.mouse.y - this.center.y; }

    _hue() {
      const deg = Math.atan2(this._dy, this._dx) * 180 / Math.PI;
      this.deg += (deg - this.deg) * 0.075;
      this.domElement.style.filter = `hue-rotate(${this.deg.toFixed(1)}deg)`;
    }

    _asciify(w, h) {
      if (!w || !h) return;
      const img = this.context.getImageData(0, 0, w, h).data;
      let str = '';
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (x + y * w) * 4;
          const [r, g, b, a] = [img[i], img[i+1], img[i+2], img[i+3]];
          if (a === 0) { str += ' '; continue; }
          let gray = (0.3 * r + 0.6 * g + 0.1 * b) / 255;
          let idx = Math.floor((1 - gray) * (this.charset.length - 1));
          if (this.invert) idx = this.charset.length - idx - 1;
          str += this.charset[idx];
        }
        str += '\n';
      }
      this.pre.textContent = str;
    }

    dispose() {
      document.removeEventListener('mousemove', this._onMouseMove);
    }
  }

  class CanvasTxt {
    constructor(txt, { fontSize = 200, fontFamily = "'SUIT', sans-serif", color = '#1a1a1a' } = {}) {
      this.canvas  = document.createElement('canvas');
      this.context = this.canvas.getContext('2d');
      this.txt = txt;
      this.fontSize = fontSize;
      this.fontFamily = fontFamily;
      this.color = color;
      this.font = `700 ${this.fontSize}px ${this.fontFamily}`;
    }

    resize() {
      const ctx = this.context;
      ctx.font = this.font;
      const m = ctx.measureText(this.txt);
      this.canvas.width  = Math.ceil(m.width) + 20;
      this.canvas.height = Math.ceil(m.actualBoundingBoxAscent + m.actualBoundingBoxDescent) + 20;
    }

    render() {
      const ctx = this.context;
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.fillStyle = this.color;
      ctx.font = this.font;
      const m = ctx.measureText(this.txt);
      ctx.fillText(this.txt, 10, 10 + m.actualBoundingBoxAscent);
    }

    get width()   { return this.canvas.width; }
    get height()  { return this.canvas.height; }
    get texture() { return this.canvas; }
  }

  class AsciiHero {
    constructor(container, { text, asciiFontSize, textFontSize, textColor, enableWaves }) {
      this.container = container;
      this.text = text;
      this.asciiFontSize = asciiFontSize;
      this.textFontSize = textFontSize;
      this.textColor = textColor;
      this.enableWaves = enableWaves;
      this.mouse = { x: 0, y: 0 };
      this._onMouseMove = this._onMouseMove.bind(this);
    }

    async init(THREE) {
      this.THREE = THREE;
      const { width, height } = this.container.getBoundingClientRect();
      this.width  = width  || 800;
      this.height = height || 220;

      this.camera = new THREE.PerspectiveCamera(45, this.width / this.height, 1, 1000);
      this.camera.position.z = 30;
      this.scene = new THREE.Scene();

      await document.fonts.ready;

      // Text canvas → texture
      this.textCanvas = new CanvasTxt(this.text, {
        fontSize: this.textFontSize,
        fontFamily: "'SUIT', sans-serif",
        color: this.textColor,
      });
      this.textCanvas.resize();
      this.textCanvas.render();

      this.texture = new THREE.CanvasTexture(this.textCanvas.texture);
      this.texture.minFilter = THREE.NearestFilter;

      const aspect = this.textCanvas.width / this.textCanvas.height;
      const baseH  = 8;
      this.geometry = new THREE.PlaneGeometry(baseH * aspect, baseH, 36, 36);
      this.material = new THREE.ShaderMaterial({
        vertexShader, fragmentShader,
        transparent: true,
        uniforms: {
          uTime:        { value: 0 },
          uTexture:     { value: this.texture },
          uEnableWaves: { value: this.enableWaves ? 1.0 : 0.0 },
        },
      });
      this.mesh = new THREE.Mesh(this.geometry, this.material);
      this.scene.add(this.mesh);

      // Renderer + ASCII filter
      this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
      this.renderer.setPixelRatio(1);
      this.renderer.setClearColor(0x000000, 0);

      this.filter = new AsciiFilter(this.renderer, {
        fontSize: this.asciiFontSize,
        fontFamily: "'Fira Code', monospace",
        invert: true,
      });
      this.container.appendChild(this.filter.domElement);
      this.filter.setSize(this.width, this.height);

      this.container.addEventListener('mousemove', this._onMouseMove);

      // Resize observer
      this._ro = new ResizeObserver(entries => {
        const { width: w, height: h } = entries[0].contentRect;
        if (w > 0 && h > 0) this._resize(w, h);
      });
      this._ro.observe(this.container);
    }

    _resize(w, h) {
      this.width  = w;
      this.height = h;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.filter.setSize(w, h);
    }

    _onMouseMove(e) {
      const b = this.container.getBoundingClientRect();
      this.mouse = { x: e.clientX - b.left, y: e.clientY - b.top };
    }

    start() {
      const animate = () => {
        this._raf = requestAnimationFrame(animate);
        this._render();
      };
      animate();
    }

    _render() {
      const t = Date.now() * 0.001;
      this.textCanvas.render();
      this.texture.needsUpdate = true;
      this.material.uniforms.uTime.value = Math.sin(t);

      const rx = Math.map(this.mouse.y, 0, this.height,  0.5, -0.5);
      const ry = Math.map(this.mouse.x, 0, this.width,  -0.5,  0.5);
      this.mesh.rotation.x += (rx - this.mesh.rotation.x) * 0.05;
      this.mesh.rotation.y += (ry - this.mesh.rotation.y) * 0.05;

      this.filter.render(this.scene, this.camera);
    }

    dispose() {
      cancelAnimationFrame(this._raf);
      if (this._ro) this._ro.disconnect();
      this.filter.dispose();
      if (this.filter.domElement.parentNode) {
        this.container.removeChild(this.filter.domElement);
      }
      this.container.removeEventListener('mousemove', this._onMouseMove);
      this.renderer.dispose();
      this.renderer.forceContextLoss();
    }
  }

  // ── Bootstrap
  function isDark() {
    return document.documentElement.getAttribute('data-theme') === 'dark';
  }

  async function initHero() {
    const container = document.getElementById('ascii-hero-container');
    if (!container) return;

    const THREE = window.THREE;
    if (!THREE) { console.error('Three.js not loaded'); return; }

    const hero = new AsciiHero(container, {
      text: "proco's chips",
      asciiFontSize: 7,
      textFontSize: 160,
      textColor: isDark() ? '#e8e8e8' : '#1a1a1a',
      enableWaves: true,
    });

    await hero.init(THREE);
    hero.start();

    // Update color on theme change
    const observer = new MutationObserver(() => {
      hero.textColor = isDark() ? '#e8e8e8' : '#1a1a1a';
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHero);
  } else {
    initHero();
  }
})();

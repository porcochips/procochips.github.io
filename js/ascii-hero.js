(function () {
  'use strict';

  const CHARSET = " .,:;i1tfLCG08@";
  const TEXT    = "proco's chips";
  const FONT_PX = 7;

  function init() {
    var container = document.getElementById('ascii-hero-container');
    if (!container) return;

    var pre = document.createElement('pre');
    pre.style.cssText = [
      'margin:0', 'padding:8px 0', 'line-height:1em',
      'font-family:"Fira Code",monospace', 'font-size:7px',
      'color:#1a1a1a', 'background:transparent',
      'text-align:center', 'overflow:hidden',
      'width:100%', 'box-sizing:border-box',
    ].join(';');
    container.appendChild(pre);

    var offscreen = document.createElement('canvas');
    var offCtx    = offscreen.getContext('2d', { willReadFrequently: true });

    var mouseX = 0.5, mouseY = 0.5;
    container.addEventListener('mousemove', function(e) {
      var b = container.getBoundingClientRect();
      mouseX = (e.clientX - b.left) / b.width;
      mouseY = (e.clientY - b.top)  / b.height;
    });
    container.addEventListener('mouseleave', function() {
      mouseX = 0.5; mouseY = 0.5;
    });

    function frame(ts) {
      requestAnimationFrame(frame);

      var b    = container.getBoundingClientRect();
      var W    = b.width  || 800;
      var H    = b.height || 200;
      var cols = Math.floor(W / (FONT_PX * 0.6));
      var rows = Math.floor(H / FONT_PX);

      offscreen.width  = cols;
      offscreen.height = rows;

      // tilt based on mouse
      var tiltX = (mouseY - 0.5) * 0.35;
      var tiltY = (mouseX - 0.5) * 0.35;

      offCtx.clearRect(0, 0, cols, rows);
      offCtx.save();
      offCtx.translate(cols / 2, rows / 2);
      offCtx.transform(
        Math.cos(tiltY) * 0.95,
        Math.sin(tiltX) * 0.3,
        Math.sin(tiltY) * -0.3,
        Math.cos(tiltX) * 0.95,
        0, 0
      );

      var fontSize = rows * 0.75;
      offCtx.font = 'bold ' + fontSize + 'px SUIT, sans-serif';
      offCtx.textAlign    = 'center';
      offCtx.textBaseline = 'middle';
      offCtx.fillStyle    = '#fff';
      offCtx.fillText(TEXT, 0, 0);
      offCtx.restore();

      var imgData = offCtx.getImageData(0, 0, cols, rows).data;
      var str = '';
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          var i    = (c + r * cols) * 4;
          var a    = imgData[i + 3];
          if (a < 10) { str += ' '; continue; }
          var gray = (imgData[i] * 0.3 + imgData[i+1] * 0.6 + imgData[i+2] * 0.1) / 255;
          var idx  = Math.floor(gray * (CHARSET.length - 1));
          str += CHARSET[CHARSET.length - 1 - idx];
        }
        str += '\n';
      }
      pre.textContent = str;
    }

    requestAnimationFrame(frame);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

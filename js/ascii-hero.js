(function () {
  'use strict';

  var RADIUS      = 150;
  var FROM_WEIGHT = 100;
  var TO_WEIGHT   = 900;
  var TEXT        = "porco's chips";

  function lerp(a, b, t) { return a + (b - a) * t; }

  function falloff(dist) {
    return Math.max(0, 1 - dist / RADIUS);
  }

  function init() {
    var container = document.getElementById('ascii-hero-container');
    if (!container) return;

    // wrapper
    var wrapper = document.createElement('div');
    wrapper.style.cssText = [
      'display:flex',
      'align-items:flex-start',
      'justify-content:center',
      'width:100%',
      'height:100%',
      'padding-top:16px',
    ].join(';');
    container.appendChild(wrapper);

    // text element
    var textEl = document.createElement('div');
    textEl.style.cssText = [
      'font-family:"Roboto Flex",sans-serif',
      'font-size:clamp(2.5rem, 8vw, 4.5rem)',
      'font-weight:100',
      'line-height:1',
      'letter-spacing:-0.02em',
      'color:var(--color-page-ink)',
      'user-select:none',
      'cursor:default',
    ].join(';');
    wrapper.appendChild(textEl);

    // split into letter spans
    var letterSpans = [];
    TEXT.split('').forEach(function(ch) {
      var span = document.createElement('span');
      span.style.cssText = 'display:inline-block;transition:font-variation-settings 0.05s;';
      span.style.fontVariationSettings = "'wght' " + FROM_WEIGHT;
      span.textContent = ch === ' ' ? ' ' : ch;
      textEl.appendChild(span);
      letterSpans.push(ch === ' ' ? null : span);
    });

    // mouse tracking
    var mouseX = -9999;
    var mouseY = -9999;

    window.addEventListener('mousemove', function(e) {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });

    container.addEventListener('mouseleave', function() {
      mouseX = -9999;
      mouseY = -9999;
    });

    // animation loop
    function frame() {
      requestAnimationFrame(frame);
      letterSpans.forEach(function(span) {
        if (!span) return;
        var rect   = span.getBoundingClientRect();
        var cx     = rect.left + rect.width  / 2;
        var cy     = rect.top  + rect.height / 2;
        var dist   = Math.sqrt((mouseX - cx) * (mouseX - cx) + (mouseY - cy) * (mouseY - cy));
        var t      = falloff(dist);
        var weight = Math.round(lerp(FROM_WEIGHT, TO_WEIGHT, t));
        span.style.fontVariationSettings = "'wght' " + weight;
      });
    }

    document.fonts.load('100 1rem "Roboto Flex"').then(function() {
      requestAnimationFrame(frame);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

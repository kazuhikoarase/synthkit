
'use strict';

Vue.component('WaveView', {
  template: '<canvas></canvas>',
  props : {
    wave: { },
    fg: { default: function() { return 'rgba(255,255,0,1)'; } },
    bg: { default: function() { return 'rgba(0,0,0,1)'; } }
  },
  mounted: function() {

    var width = 64;
    var height = 32;

    var wave = this.wave;
    var canvas = this.$el;
    canvas.width = width;
    canvas.height = height;

    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = this.bg;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = this.fg;
    for (var x = 0; x < width; x += 1) {
      wave.freq = function() {
        return 44100 / width * 4; };
      /*
      wave.freq = function() {
        return 44100 / width * 2 * (width + x * 2) / width ; };
      */
      var y = ~~(height / 2 - 0.9 * height / 2 * wave() );
      if (x == 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  }
});

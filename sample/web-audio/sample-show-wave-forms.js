//
// synthkit sample and test for Web Audio
//

$(function() {

  'use strict';

  var synth = synthkit.createSynth();
  var _const = synth._const;
  var Fs = synth.Fs;

  var waves = [
    synth.sin(),
    synth.square(),
    synth.saw(),
    synth.triangle(),
    synth.noise()
  ];
  var colors = [
    'rgba(255,0,127,0.8)',
    'rgba(255,127,0,0.8)',
    'rgba(0,255,127,0.8)',
    'rgba(0,127,255,0.8)',
    'rgba(63,63,63,0.8)'
  ];

  var width = 100;
  var height = 80;
  var $cv = $('<canvas></canvas>').attr({ width: width, height: height });
  var ctx = $cv[0].getContext('2d');
  ctx.fillStyle = 'rgba(0,0,0,1)';
  ctx.fillRect(0,0,width,height);

  for (var w = 0; w < waves.length; w += 1) {
    waves[w].freq = _const(1);
  }

  for (var w = waves.length - 1; w >= 0; w -= 1) {
    ctx.beginPath();
    ctx.strokeStyle = colors[w];
    for (var i = 0; i < Fs; i += 1) {
      if (i % 100 == 0) {
        var x = ~~(width * i / Fs);
        var y = ~~(height / 2 - height / 2.2 * waves[w].output() );
        if (i == 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      synth.delta();
    }
    ctx.stroke();
  }

  $('BODY').append($cv);
});

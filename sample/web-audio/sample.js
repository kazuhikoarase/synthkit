
'use strict'

!function() {

  var showWave = function(wave) {

    var width = 64;
    var height = 32;

    var canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    document.body.appendChild(canvas);

    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(0,0,0,1)';
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
  };

  showWave(synthkit.sine() );
  showWave(synthkit.square() );
  showWave(synthkit.saw() );
  showWave(synthkit.triangle() );
  showWave(synthkit.noise() );

}();

var start = function() {

  //-------------------------------------------------------

  document.getElementById('test1').addEventListener('mousedown', function() {
    egHH.on();
    var mouseupHandler = function() {
      egHH.off();
      document.removeEventListener('mouseup', mouseupHandler);
    }
    document.addEventListener('mouseup', mouseupHandler);
  });

  document.getElementById('test1').addEventListener('click', function() {
//    w1.freq = function() { return 440; };
  });
  document.getElementById('test2').addEventListener('click', function() {
//    w1.freq = function() { return 448; };
  });

  var notes = [];
  !function() {
    for (var i = 0; i <= 60; i += 1) {
      notes.push(55 * Math.exp(Math.log(2) * i / 12) );
    }
  }();

  var egHH = synthkit.eg({
    input: synthkit.filter({
      input: synthkit.noise(),
      type: 'bpf',
      cutoff: 6000
    })
  });

  var egBD = synthkit.eg({
    input: synthkit.sine({ freq: 80 }),
    attack: 1,
    decay: 2E-4
  });

  var egSD = synthkit.eg({
    input: synthkit.filter({
      input: synthkit.mixer({
        inputs: [
          synthkit.noise(),
          synthkit.sine({ freq: 230 })
        ]
      }),
      cutoff: 1500
    })
  });

  var notesBa = [ 10, 6, 8, 13 ];
  var noteBa = 4;

  var egBa = synthkit.eg({
    input: synthkit.filter({
      input: synthkit.mixer({
        inputs: [
          synthkit.square({ freq: function() { return notes[noteBa] * 1.005; } }),
          synthkit.square({ freq: function() { return notes[noteBa]; } })
        ]
      }),
      cutoff: 21500
    }),
    attack: 1e-2,
    decay: 5e-4
  });

  var disp = { ticks: 0 };

  var beat = 16;

  var patHH = '11-0'.replace(/\s+/g, '');
  var padBD = '100-'.replace(/\s+/g, '');
  var padSD = '0000100- 0000100- 00001000 0-00100-'.replace(/\s+/g, '');
  var patBa = '01111101 01110101'.replace(/\s+/g, '');

  var seq1 = synthkit.seq({ tempo: 132, beat: beat });
  seq1.trigger = function(ticks) {

    disp.ticks = ticks;
    noteBa = notesBa[Math.floor(ticks / patBa.length) % notesBa.length];
    var nHH = patHH.charAt(ticks % patHH.length);
    var nBD = padBD.charAt(ticks % padBD.length);
    var nSD = padSD.charAt(ticks % padSD.length);
    var nBa = patBa.charAt(ticks % patBa.length);

    if (nBa!= '0') {
      egBa.on(nBa == '1'? 0 : -1);
    }

    if (nHH != '0') {
      if (nHH == '1') {
        egHH.decay = function() { return 1E-3; }; // close
      } else {
        egHH.decay = function() { return 1E-4; }; // open
      }
      egHH.on();
    }

    if (nBD != '0') {
      egBD.on(nBD == '1'? 0 : -1);
    }

    if (nSD != '0') {
      egSD.sync();
      egSD.decay = function() { return 2E-4; };
      egSD.on(nSD == '1'? 0 : -0.5);
    }
  };

  synthkit.player(synthkit.mixer({
    inputs : [
      synthkit.vol({ input: egHH, gain: -2, pan: -1 }),
      synthkit.vol({ input: egBD, gain: 0 }),
      synthkit.vol({ input: egSD, gain: -0.5 }),
      synthkit.vol({ input: egBa, gain: -1, pan: 1 }),
      seq1
    ],
    mono : false
  }) );

  var enterFrame = function(time) {
    var s = '';
    for (var i = 0; i < beat; i += 1) {
      s += (i == disp.ticks % beat)? '-' : '_';
    }
    document.getElementById('disp').textContent = s;
    window.requestAnimationFrame(enterFrame);
  };
  window.requestAnimationFrame(enterFrame);
};

var clickHandler = function() {
  start();
  startButton.removeEventListener('click', clickHandler);
  startButton.textContent = 'started.';
};

var startButton = document.getElementById('start');
startButton.addEventListener('click', clickHandler);

$(function() {

  'use strict';

  var AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) {
    console.log('AudioContext not supported');
    return;
  }

  var audioCtx = new AudioContext();

  var _const = synthkit._const;
  var createSynth = synthkit.createSynth;
  var createSynthNode = synthkit.createSynthNode;
  var FilterType = synthkit.FilterType;
  
  var tests = [

    function() {

      var osc = audioCtx.createOscillator();
      osc.frequency.value = 880;
      osc.start();

      var gainNode = audioCtx.createGain();
      gainNode.gain.value = 0;

      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      return {
        label : 'simple',
        start : function() {
          gainNode.gain.value = 0.2;
        },
        stop : function() {
          gainNode.gain.value = 0;
        }
      };
    }(),

    function() {

      var synth = createSynth();

//      var noise = synth.noise();
      var lfo = synth.sh(64);
      lfo.input = synth.noise().output;

      var wave = synth.square();
      //var wave = synth.triangle();
      //var wave = synth.saw();
//      var wave = synth.sin();

      wave.freq = function() {
//        return 880;
//        return 880 * Math.pow(2, ~~(lfo.output() * 12) / 12);
        return 2000 * Math.pow(2, ~~(lfo.output() + 1) / 2);
      };

      // 20 200 2000 20000

      var hpf = synth.filter(FilterType.HPF, 10);
      hpf.input = wave.output;

      var lpf = synth.filter();
      lpf.input = hpf.output;
      var fltLfo = synth.sin(0.5);

      lpf.cutoff = function() {
        return 880 + 500 * fltLfo.output();
      };
      var gain = synth.gain();
      gain.input = lpf.output;
      gain.level = _const(1);//wave.output;

      var eg = synth.eg();
      eg.attack = _const(0.5);
      eg.decay = _const(1);
      eg.sustain = _const(0.3);
      eg.release = _const(0.5);
      gain.level = eg.output;
/*
      var eg_delta = eg.delta;
      var cnt = 0;
      var lastOut = 0;
      
      eg.delta = function() {
        eg_delta();
        cnt += 1;
        if (cnt > 4110) {
          if (lastOut != eg.output() ) {
            console.log(eg.output() );
            lastOut = eg.output();
          }
          cnt = 0;
        }
      };
*/
 
//      var synthNode = createSynthNode(audioCtx, synth, wave.output);
      var synthNode = createSynthNode(audioCtx, synth, gain.output);
//      var synthNode = createSynthNode(audioCtx, synth, lpf.output);
      var gainNode = audioCtx.createGain();
      gainNode.gain.value = 0;
      synthNode.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      return {
        label : 'scriptNode',
        start : function() {
          gainNode.gain.value = 0.2;
          eg.on();
        },
        stop : function() {
          gainNode.gain.value = 0;
          eg.off();
        }
      };
    }(),
    // template
    function() {
      return {
        label : '',
        start : function() {
        },
        stop : function() {
        }
      };
    }(),
    null
  ];

  $.each(tests, function(i, test) {
    if (test == null || !test.label) {
      return;
    }
    var mouseupHandler = function(event) {
      $(document).off('mouseup', mouseupHandler);
      test.stop();
    };
    $('BODY').append($('<input type="button" />').val(test.label).
      on('mousedown', function(event) {
        $(document).on('mouseup', mouseupHandler);
        test.start();
      }) );
  });
});

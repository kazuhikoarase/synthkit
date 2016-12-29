//
// synthkit sample and test for Web Audio
//

$(function() {

  'use strict';

  var FilterType = synthkit.FilterType;

  var sampleDefs = [
    {
      label : 'Simple',
      ui : [
        { id : 'pad1', type : 'pad', label : 'Pad' },
        { id : 'wave', type : 'select', label : 'Wave',
          options : [ 'sin', 'square', 'saw', 'triangle', 'noise'] },
        { id : 'freq', type : 'log', label : 'Freq', min : 20, max : 20000 },
        { id : 'vol', type : 'liner', label : 'Vol', min : 0, max : 1 }
      ],
      settings : {
        "pad1":{"output":0},
        "wave":{"output":"sin"},
        "freq":{"output":440},
        "vol":{"output":1}
      },
      init : function(ui) {

        var osc = synth.osc();
        osc.type = ui.wave.data('output');
        osc.freq = ui.freq.data('output');
        osc.level = function() {
          return ui.pad1.data('output')() * ui.vol.data('output')();
        };

        mixer.inputs.push(osc.output);
      }
    },
    {
      label : 'EG Test',
      ui : [
        { id : 'pad1', type : 'pad', label : 'Pad' },
        { id : 'wave', type : 'select', label : 'Wave',
            options : [ 'sin', 'square', 'saw', 'triangle', 'noise' ] },
        { id : 'lfoWave', type : 'select', label : 'Wave',
            options : [ 'sin', 'square', 'saw', 'triangle', 'noise' ] },
        { id : 'freq', type : 'log', label : 'Freq',
            min : 20, max : 20000 },
        { id : 'filter', type : 'select', label : 'Filter',
            options : [ 'lpf', 'hpf', 'bpf', 'notch' ] },
        { id : 'cutoff', type : 'log', label : 'Cutoff',
            min : 20, max : 20000 },
        { id : 'resonance', type : 'log',
            label : 'Resonance', min : 1, max : 16 },
        { id : 'eg', type : 'eg', label : 'EG' }
      ],
      settings : {
        "pad1":{"output":0},
        "wave":{"output":"square"},
        "freq":{"output":440},
        "filter":{"output":"lpf"},
        "cutoff":{"output":440},
        "resonance":{"output":1},
        "eg":{"a":0,"d":0.5,"s":0.3,"r":0}
      },
      init : function(ui) {

        var eg = synth.eg();
        eg.attack = ui.eg.data('attack');
        eg.decay = ui.eg.data('decay');
        eg.sustain = ui.eg.data('sustain');
        eg.release = ui.eg.data('release');
        eg.input = ui.pad1.data('output');

        var filter = synth.filter();
        filter.type = ui.filter.data('output');
        filter.cutoff = ui.cutoff.data('output');
        filter.resonance = ui.resonance.data('output');

        var osc = synth.osc();
        osc.type = ui.wave.data('output');
        osc.freq = ui.freq.data('output');
        osc.level = eg.output;

        mixer.inputs.push(osc.output);
/*
        var clock = function() {
          var count = 0;
          var clock = synth.clock(4, 120);
          clock.trigger = function() {
            eg.on();
            count = (count + 1) % clock.beat();
          };
          return clock;
        }();
*/
        /*
        // DTMF Signal
        var lo = [ 697, 770, 852, 941 ];
        var hi = [ 1209, 1336, 1477, 1633 ];
        var chars = '147*2580369#ABCD';
        //147*
        //2580
        //369#
        //ABCD
        var f1 = lo[i % 4];
        var f2 = hi[~~(i / 4)];

         */
        ui.pad1.on('change', function(event) {
          if (ui.pad1.data('output')() ) {
            eg.on();
          } else {
            eg.off();
          }
        });
        /*
        ui.wave.on('change', function(event) {
          var wave = waves[$(event.target).data('output')()];
          filter.input = wave.output;
          wave.freq = ui.freq.data('output');
        }).trigger('change');
        */
      }
    },
    {
      label : 'Digital Noise',
      ui : [
        { id : 'pad1', type : 'pad', label : 'Pad' }
      ],
      init : function(ui) {

        var _const = function(val) { return function() { return val; } };

//        var noise = synth.noise();
        var lfo = synth.sh(64);
        lfo.input = synth.noise().output;

        var wave = synth.square();
        //var wave = synth.triangle();
        //var wave = synth.saw();
        //var wave = synth.sin();

        wave.freq = function() {
//          return 880;
//          return 880 * Math.pow(2, ~~(lfo.output() * 12) / 12);
          return 2000 * Math.pow(2, ~~(lfo.output() + 1) / 2);
        };

        var hpf = synth.filter(FilterType.HPF, 10);
        hpf.input = wave.output;

        var lpf = synth.filter();
        lpf.input = hpf.output;
        var fltLfo = synth.sin(0.5);

        lpf.cutoff = function() {
          return 880 + 500 * fltLfo.output();
        };
        var gain = synth.gain();
        gain.input = wave.output;//lpf.output;
        gain.level = _const(1);

        var eg = synth.eg();
        eg.attack = _const(0.5);
        eg.decay = _const(1);
        eg.sustain = _const(0.8);
        eg.release = _const(0.9);
        eg.input = ui.pad1.data('output');

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

        mixer.inputs.push(gain.output);
      }
    }
  ];

  //-------------------------------------------------------

  var AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) {
    console.log('AudioContext not supported');
    return;
  }

  var audioCtx = new AudioContext();
  var gainNode = audioCtx.createGain();
  gainNode.gain.value = 0.2;
  gainNode.connect(audioCtx.destination);

  var synth = synthkit.createSynth();
  var mixer = synth.mixer();
  synthkit.createSynthNode(audioCtx, synth, mixer.output).connect(gainNode);
  $.each(sampleDefs, function(i, sampleDef) {
    $('BODY').append(synthkit_sample.createSample(sampleDef) );
  });
});

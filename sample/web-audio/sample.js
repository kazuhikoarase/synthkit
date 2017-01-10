//
// synthkit sample and test for Web Audio
//
// Copyright (c) 2016 Kazuhiko Arase
//
// URL: http://www.d-project.com/
//
// Licensed under the MIT license:
//  http://www.opensource.org/licenses/mit-license.php
//

$(function() {

  'use strict';

  var FilterType = synthkit.FilterType;

  var sampleDefs = [
    {
      label : 'Simple',
      ui : [
        { id : 'pad1', type : 'pad', label : 'Pad' },
        { id : 'osc', type : 'osc', label : 'OSC' }
      ],
      settings : {
        "pad1":{"output":0},
        "osc":{"type":"square","freq":440,"gain":1}
      },
      init : function(ui) {

        var on = false;

        var osc = synth.osc();
        osc.type = ui.osc.data('type');
        osc.freq = ui.osc.data('freq');
        osc.gain = function() {
          return on? ui.osc.data('gain')() : 0;
        };

        ui.pad1.on('change', function(event) {
          on = !!ui.pad1.data('output')();
        });

        mixer.inputs.push(osc.output);
      }
    },
    {
      label : 'EG Test',
      ui : [
        { id : 'pad1', type : 'pad', label : 'Pad' },
        { id : 'osc1', type : 'osc', label : 'OSC1' },
        { id : 'osc2', type : 'osc', label : 'OSC2' },
        { id : 'eg', type : 'eg', label : 'EG' },
        { id : 'lfo', type : 'osc', label : 'LFO',
          minFreq : 1/30, maxFreq : 100 },
        { id : 'filter', type : 'select', label : 'Filter',
            options : [ 'lpf', 'hpf', 'bpf', 'notch' ] },
        { id : 'cutoff', type : 'log', label : 'Cutoff',
            min : 20, max : 20000 },
        { id : 'resonance', type : 'log',
            label : 'Resonance', min : 1, max : 16 }
      ],
      settings : {
        "pad1":{"output":0},
        "osc1":{"type":"square","freq":490,"gain":0.3},
        "osc2":{"type":"triangle","freq":336,"gain":0.3},
        "eg":{"attack":1,"decay":1,"sustain":0,"release":1},
        "lfo":{"type":"sin","freq":8,"gain":0.6},
        "filter":{"output":"lpf"},
        "cutoff":{"output":695},
        "resonance":{"output":10}
      },
      init : function(ui) {

        var mysynth = function() {
          var osc1 = synth.osc();
          var osc2 = synth.osc();
          var eg = synth.eg();
          var mixer = synth.mixer();
          mixer.inputs.push(osc1.output);
          mixer.inputs.push(osc2.output);
          mixer.gain = eg.output;
          var lfo = synth.osc();
          var filter = synth.filter();
          filter.input = mixer.output;
          return {
            osc1 : osc1,
            osc2 : osc2,
            eg : eg,
            lfo : lfo,
            filter : filter
          };
        }();

        mixer.inputs.push(mysynth.filter.output);

        var clock = function() {
          var count = 0;
          var clock = synth.clock(4, 120);
          clock.ontrigger = function() {
//            mysynth.eg.on();
            count = (count + 1) % clock.beat();
          };
          return clock;
        }();

        var mod = function(freq) {
          return function() {
            return freq() * Math.exp(mysynth.lfo.output() );
          };
        };

        mysynth.osc1.type = ui.osc1.data('type');
        mysynth.osc1.freq = ui.osc1.data('freq');
        mysynth.osc1.gain = ui.osc1.data('gain');

        mysynth.osc2.type = ui.osc2.data('type');
        mysynth.osc2.freq = ui.osc2.data('freq');
        mysynth.osc2.gain = ui.osc2.data('gain');

        mysynth.eg.attack = ui.eg.data('attack');
        mysynth.eg.decay = ui.eg.data('decay');
        mysynth.eg.sustain = ui.eg.data('sustain');
        mysynth.eg.release = ui.eg.data('release');

        mysynth.lfo.type = ui.lfo.data('type');
        mysynth.lfo.freq = ui.lfo.data('freq');
        mysynth.lfo.gain = ui.lfo.data('gain');

        mysynth.filter.type = ui.filter.data('output');
        mysynth.filter.cutoff = mod(ui.cutoff.data('output') );
        mysynth.filter.resonance = ui.resonance.data('output');

        mysynth.osc1.freq = mod(ui.osc1.data('freq') );
        mysynth.osc2.freq = mod(ui.osc2.data('freq') );
        mysynth.filter.cutoff = mod(ui.cutoff.data('output') );
        
        ui.pad1.on('change', function(event) {
          if (ui.pad1.data('output')() ) {
            mysynth.lfo.sync();
            mysynth.eg.on();
          } else {
            mysynth.eg.off();
          }
        });

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

        var _const = function(val) { return function() { return val; }; };

//        var noise = synth.noise();
        var lfo = synth.sh(64);
        lfo.input = synth.noise().output;

        var wave = synth.square();
        //var wave = synth.triangle();
        //var wave = synth.saw();
        //var wave = synth.sin();

        wave.freq = function() {
          var freq = {};
          return function() {
            var f = ~~(lfo.output() + 1);
            if (!freq[f]) {
              freq[f] = 2000 * Math.pow(2, f / 2);
              console.log(f + ',' + freq[f]);
            }
            return freq[f];
          };
        }();

        var hpf = synth.filter(FilterType.HPF, 10);
        hpf.input = wave.output;

        var lpf = synth.filter();
        lpf.input = hpf.output;
        var fltLfo = synth.sin(0.5);

        lpf.cutoff = function() {
          return 880 + 500 * fltLfo.output();
        };

        var eg = synth.eg();
        eg.attack = _const(0.5);
        eg.decay = _const(1);
        eg.sustain = _const(0.8);
        eg.release = _const(0.9);

        var gain = synth.mixer();
        gain.inputs.push(wave.output);//lpf.output;
        gain.gain = _const(1);
        gain.gain = eg.output;
        mixer.inputs.push(gain.output);

        ui.pad1.on('change', function(event) {
          if (ui.pad1.data('output')() ) {
            eg.on();
          } else {
            eg.off();
          }
        });

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

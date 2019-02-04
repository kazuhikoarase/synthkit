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

var init = function() {

  'use strict';

  var FilterType = synthkit.FilterType;

  var scale = [0, 2, 4, 5, 7, 9, 11, 12];
  var getFreqByNote = function(note) {
    var n = note - 1 + 8;
    return Math.pow(2, scale[n % 8] / 12) * 440 * ~~(n / 8);
  };

  var synthDefs = [
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

  var js1Synth = {
    label : 'JS1',
    ui : [
      { id : 'pad1', type : 'pad', label : 'Pad' },
      { id : 'seq1', type : 'seq', label : 'Seq' },
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
    init : function(ui) {

      var mysynth = function() {
        var osc1 = synth.osc();
        var osc2 = synth.osc();
        var eg = synth.eg();
        var mixer = synth.mixer();
        var lfo = synth.osc();
        var filter = synth.filter();
        mixer.inputs.push(osc1.output);
        mixer.inputs.push(osc2.output);
        mixer.gain = eg.output;
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

      mysynth.osc1.type = ui.osc1.data('type');
      mysynth.osc1.freq = ui.osc1.data('freq');
      mysynth.osc1.ratio = ui.osc1.data('ratio');
      mysynth.osc1.gain = ui.osc1.data('gain');

      mysynth.osc2.type = ui.osc2.data('type');
      mysynth.osc2.freq = ui.osc2.data('freq');
      mysynth.osc2.ratio = ui.osc1.data('ratio');
      mysynth.osc2.gain = ui.osc2.data('gain');

      mysynth.eg.attack = ui.eg.data('attack');
      mysynth.eg.decay = ui.eg.data('decay');
      mysynth.eg.sustain = ui.eg.data('sustain');
      mysynth.eg.release = ui.eg.data('release');

      mysynth.lfo.type = ui.lfo.data('type');
      mysynth.lfo.freq = ui.lfo.data('freq');
      mysynth.lfo.gain = ui.lfo.data('gain');

      mysynth.filter.type = ui.filter.data('output');
      mysynth.filter.cutoff = ui.cutoff.data('output');
      mysynth.filter.resonance = ui.resonance.data('output');

      var mod = function(freq) {
        return function() {
          if (arguments.length == 1) {
            freq(arguments[0]);
          }
          return freq() * Math.exp(mysynth.lfo.output() );
        };
      };
      mysynth.osc1.freq = mod(mysynth.osc1.freq);
      mysynth.osc2.freq = mod(mysynth.osc2.freq);
      mysynth.filter.cutoff = mod(mysynth.filter.cutoff);

      ui.pad1.on('change', function(event) {
        if (ui.pad1.data('output')() ) {
          mysynth.lfo.sync();
          mysynth.eg.on();
        } else {
          mysynth.eg.off();
        }
      });

      var drumKit = this.drumKit;
      ui.seq1.on('change', function(event) {
        var note = ui.seq1.data('state')().current;
        if (note != 0) {
          if (!drumKit) {
            var freq = getFreqByNote(note);
            mysynth.osc1.freq(freq);
            mysynth.osc2.freq(freq);
          }
          mysynth.lfo.sync();
          mysynth.eg.on();
        } else {
          mysynth.eg.off();
        }
      });
      seqList.push(function(step) {
        var pat = ui.seq1.data('state')().pattern;
        var note = pat[step % pat.length];
        if (note != 0) {
          if (!drumKit) {
            var freq = getFreqByNote(note);
            mysynth.osc1.freq(freq);
            mysynth.osc2.freq(freq);
          }
          mysynth.lfo.sync();
          mysynth.eg.on();
        }
      });
    }
  };

  var pong = {
      "pad1":{"output":0},
      "seq1":{"pattern":[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"current":0},
      "osc1":{"type":"sin","freq":632.4555320336755,"ratio":0,"gain":0.4067326906894885},
      "osc2":{"type":"sin","freq":1013.5910343332033,"ratio":0,"gain":0.480370057825076},
      "eg":{"attack":1,"decay":0.014206203234342393,"sustain":0,"release":0.02053107012922723},
      "lfo":{"type":"saw","freq":22.572764827917645,"ratio":0,"gain":0},
      "filter":{"output":"lpf"},
      "cutoff":{"output":19999.999999999985},
      "resonance":{"output":1}
    };
  
  var patchAndSeqList = [
{
  "pad1":{"output":0},
  "seq1":{"pattern":[4,2,5,3,8,6,6,4,3,4,3,2,3,5,6,4],"current":0},
  "osc1":{"type":"square","freq":587.3295358348154,"gain":0.06192032421695342},
  "osc2":{"type":"noise","freq":587.3295358348154,"gain":0},
  "eg":{"attack":1,"decay":0.10459856467414358,"sustain":0,"release":1},
  "lfo":{"type":"saw","freq":2.9682986280386467,"gain":0},
  "filter":{"output":"lpf"},
  "cutoff":{"output":5898.446590288671},
  "resonance":{"output":7.526382511320843}
},
{
  "pad1":{"output":0},
  "seq1":{"pattern":[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0],"current":0},
  "osc1":{"type":"sin","freq":99.02811974644634,"gain":1},
  "osc2":{"type":"noise","freq":493.88330125612407,"gain":0},
  "eg":{"attack":1,"decay":0.17069760313420154,"sustain":0,"release":1},
  "lfo":{"type":"saw","freq":2.9682986280386467,"gain":0},
  "filter":{"output":"lpf"},
  "cutoff":{"output":295.4821936759269},
  "resonance":{"output":5.607995067153215}
},
{
  "pad1":{"output":0},
  "seq1":{"pattern":[0,0,3,0,0,0,3,0,0,0,3,0,0,0,3,0],"current":0},
  "osc1":{"type":"saw","freq":493.88330125612407,"gain":0},
  "osc2":{"type":"noise","freq":493.88330125612407,"gain":0.12383776900028452},
  "eg":{"attack":1,"decay":0.02222358324492065,"sustain":0,"release":1},
  "lfo":{"type":"saw","freq":2.9682986280386467,"gain":0},
  "filter":{"output":"hpf"},
  "cutoff":{"output":4895.873862410455},
  "resonance":{"output":7.526382511320843}
},
{
  "pad1":{"output":0},
  "seq1":{"pattern":[0,0,0,0,3,0,0,0,0,0,0,0,3,0,0,3],"current":0},
  "osc1":{"type":"sin","freq":328.19346638560006,"gain":0.13435078314012427},
  "osc2":{"type":"noise","freq":493.88330125612407,"gain":0.4047767053756782},
  "eg":{"attack":1,"decay":0.03327058383917974,"sustain":0,"release":1},
  "lfo":{"type":"saw","freq":2.9682986280386467,"gain":0},
  "filter":{"output":"lpf"},
  "cutoff":{"output":1582.0716184971661},
  "resonance":{"output":3.1189716508399106}
}
  ];
  
  //-------------------------------------------------------

  synthkit.debug = true;
  
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

  $.each(synthDefs, function(i, synthDef) {
    $('BODY').append(synthkit.createUI(synthDef) );
  });

  var seqList = [];

  $('BODY').append(synthkit.createUI(
      $.extend(js1Synth, { settings : pong }) ) );

  $.each(patchAndSeqList, function(i, patchAndSeq) {
    $('BODY').append(synthkit.createUI(
        $.extend(js1Synth, {settings : patchAndSeq, drumKit : i > 0}) ) );
  });

  // test
  seqList = [];

  !function() {
    var step = 0;
    var clock = synth.clock(16, 120);
    clock.ontrigger = function() {
      for (var i = 0; i < seqList.length; i += 1) {
        seqList[i](step);
      }
      step = (step + 1) % clock.beat();
    };
  }();

  $('BODY').off('click', init);
};

$(function() {
  $('BODY').on('click', init);
});


//
// synthkit
//
// Copyright (c) 2016 Kazuhiko Arase
//
// URL: http://www.d-project.com/
//
// Licensed under the MIT license:
//  http://www.opensource.org/licenses/mit-license.php
//

var synthkit = function() {

  'use strict';

  var WaveFormType = {
      SIN : 'sin',
      SQUARE : 'square',
      SAW : 'saw',
      TRIANGLE : 'triangle',
      NOISE : 'noise'
  };

  var BiquadFilterType = {
    LPF : 'lpf',
    HPF : 'hpf',
    BPF : 'bpf',
    NOTCH : 'notch'
  };

  var createSynth = function(Fs) {

    Fs = Fs || 44100;

    var _2PI = 2 * Math.PI;

    var _const = function(val) { return function() { return val; }; };

    var mixer = function(gain) {

      var module = createModule({
        gain : _const(gain || 1),
        inputs : [],
        output : function() {
          var gain = module.gain();
          if (gain == 0) {
            return 0;
          }
          var val = 0;
          for (var i = 0; i < module.inputs.length; i += 1) {
            val += module.inputs[i]();
          }
          return val * gain;
        }
      });

      return module;
    };

    var sin = function(freq) {

      var t = 0;
      var a = 1;
      var _2PI_Fs = _2PI / Fs;

      var module = createModule({
        freq : _const(freq || 440),
        sync : function() { t = 0; },
        output : function() { return a * Math.sin(t); },
        delta : function() { t = (t + _2PI_Fs * module.freq() ) % _2PI; }
      });

      return module;
    };

    var square = function(freq) {

      var t = 0;
      var a = 1;
      var _2_Fs = 2 / Fs;

      var module = createModule({
        freq : _const(freq || 440),
        sync : function() { t = 0; },
        output : function() { return t < 1? a : -a; },
        delta : function() { t = (t + _2_Fs * module.freq() ) % 2; }
      });

      return module;
    };

    var saw = function(freq) {

      var t = 1;
      var a = 1;
      var _2_Fs = 2 / Fs;

      var module = createModule({
        freq : _const(freq || 440),
        sync : function() { t = 1; },
        output : function() { return t * a - a; },
        delta : function() { t = (t + _2_Fs * module.freq() ) % 2; }
      });

      return module;
    };

    var triangle = function(freq) {

      var t = 0.5;
      var a = 1;
      var _2a = a * 2;
      var _2_Fs = 2 / Fs;

      var module = createModule({
        freq : _const(freq || 440),
        sync : function() { t = 0.5; },
        output : function() {
          return (~~t % 2 == 0? t % 1 : 1 - t % 1) * _2a - a; },
        delta : function() { t = (t + _2_Fs * module.freq() ) % 2; }
      });

      return module;
    };

    var noise = function() {

      var val = 0;
      var a = 1;
      var _2a = a * 2;
      var update = true;

      var module = createModule({
        sync : function() {},
        output : function() {
          if (update) {
            val = Math.random() * _2a - a;
            update = false;
          }
          return val;
        },
        delta : function() { update = true; }
      });

      return module;
    };

    var osc = function(type, freq, gain) {

      var waves = {
        sin : sin,
        square : square,
        saw : saw,
        triangle : triangle,
        noise : noise
      };
      var last = { type : null };
      var wave = null;

      var module = createModule({
        type : _const(type || WaveFormType.SIN),
        freq : _const(freq || 440),
        gain : _const(gain || 1),
        sync : function() {
          if (wave != null) {
            wave.sync();
          }
        },
        output : function() {
          var gain = module.gain();
          if (gain == 0) {
            return 0;
          }
          if (last.type != module.type() ) {
            if (wave != null) {
              wave.dispose();
            }
            wave = (waves[module.type()] || sin)();
            last.type = module.type();
          }
          if (wave.freq != module.freq) {
            wave.freq = module.freq;
          }
          return wave.output() * gain;
        }
      });

      var module_dispose = module.dispose;
      module.dispose = function() {
        if (wave != null) {
          wave.dispose();
        }
        module_dispose();
      };

      return module;
    };

    var sampleAndHold = function(freq) {

      var val = 0;
      var t = 0;
      var last = { intT : ~~t };
      var _2_Fs = 2 / Fs;

      var module = createModule({
        freq : _const(freq || 440),
        input : _const(0),
        sync : function() { t = 0; },
        output : function() { 
          var intT = ~~t;
          if (last.intT != intT) {
            val = module.input();
            last.intT = intT;
          }
          return val;
        },
        delta : function() { t = (t + _2_Fs * module.freq() ) % 2; }
      });

      return module;
    };

    // @see http://www.musicdsp.org/files/Audio-EQ-Cookbook.txt
    var biquadFilter = function(type, cutoff, resonance) {

      var _2PI_Fs = _2PI / Fs;

      var _a1, _a2, _b0, _b1, _b2;

      var _in0 = 0;
      var _out0 = 0;
      var _in1 = 0;
      var _in2 = 0;
      var _out1 = 0;
      var _out2 = 0;

      var last = { type : '', cutoff : 0, resonance : 0 };

      var module = createModule({
        type : _const(type || BiquadFilterType.LPF),
        cutoff : _const(cutoff || 440),
        resonance : _const(resonance || 0.5),
        input : _const(0),
        output : function() {
          var type = module.type();
          var cutoff = module.cutoff();
          var resonance = module.resonance();
          if (last.type != type ||
              last.cutoff != cutoff ||
              last.resonance != resonance) {
            prepare(type, cutoff, resonance);
            last.type = type;
            last.cutoff = cutoff;
            last.resonance = resonance;
          }
          _in0 = module.input();
          _out0 = _b0 * _in0 + _b1 * _in1 + _b2 * _in2 -
            _a1 * _out1 - _a2 * _out2;
          _out0 = Math.max(-1, Math.min(_out0, 1) );
          return _out0;
        },
        delta : function() {
          _in2 = _in1;
          _in1 = _in0;
          _out2 = _out1;
          _out1 = _out0;
        }
      });

      var prepare = function(type, cutoff, resonance) {

        var w0 = _2PI_Fs * cutoff;
        var sin_w0 = Math.sin(w0);
        var cos_w0 = Math.cos(w0);
        var alpha = sin_w0 / (2 * resonance);

        var a0, a1, a2, b0, b1, b2;

        switch (type) {

        case BiquadFilterType.LPF :
          b0 = (1 - cos_w0) / 2;
          b1 = 1 - cos_w0;
          b2 = (1 - cos_w0) / 2;
          a0 = 1 + alpha;
          a1 = -2 * cos_w0;
          a2 = 1 - alpha;
          break;

        case BiquadFilterType.HPF :
          b0 = (1 + cos_w0) / 2;
          b1 = -(1 + cos_w0);
          b2 = (1 + cos_w0) / 2;
          a0 = 1 + alpha;
          a1 = -2 * cos_w0;
          a2 = 1 - alpha;
          break;

        case BiquadFilterType.BPF :
          b0 = sin_w0 / 2;
          b1 = 0;
          b2 = -sin_w0 / 2;
          a0 = 1 + alpha;
          a1 = -2 * cos_w0;
          a2 = 1 - alpha;
          break;

        case BiquadFilterType.NOTCH :
          b0 = 1;
          b1 = -2 * cos_w0;
          b2 = 1;
          a0 = 1 + alpha;
          a1 = -2 * cos_w0;
          a2 = 1 - alpha;
          break;

        default :
          throw 'unknown type:' + module.type();
        }

        // prepare params
        _b0 = b0 / a0;
        _b1 = b1 / a0;
        _b2 = b2 / a0;
        _a1 = a1 / a0;
        _a2 = a2 / a0;
      };

      return module;
    };

    var envelopeGenerator = function() {

      var STATE_STOP = '_';
      var STATE_ATTACK = 'a';
      var STATE_DECAY = 'd';
      var STATE_SUSTAIN = 's';
      var STATE_RELEASE = 'r';

      var val = 0;
      var state = STATE_STOP;
      var rate = 100 * _2PI / Fs;

      var minLvl = 0;
      var maxLvl = 1;
      var offset = 0.0001;

      var module = createModule({
        attack : _const(0),
        decay : _const(0),
        sustain : _const(maxLvl),
        release : _const(0),
        on : function() { state = STATE_ATTACK; },
        off : function() { state = STATE_RELEASE; },
        onstop : null,
        input : function() { return 0; },
        output : function() { return val; },
        delta : function() {
          switch(state) {
          case STATE_ATTACK :
            if (val < maxLvl - offset) {
              val += (maxLvl - val) * module.attack() * rate;
            } else {
              state = STATE_DECAY;
            }
            break;
          case STATE_DECAY :
            if (val > module.sustain() + offset) {
              val += (module.sustain() - val) * module.decay() * rate;
            } else {
              state = STATE_SUSTAIN;
            }
            break;
          case STATE_SUSTAIN :
            // nothing to do.
            break;
          case STATE_RELEASE :
            if (val > minLvl + offset) {
              val += (minLvl - val) * module.release() * rate;
            } else {
              state = STATE_STOP;
              if (module.onstop) {
                module.onstop();
              }
            }
            break;
          case STATE_STOP :
            // nothing to do.
            break;
          default :
            throw 'state:' + state;
          }
        }
      });

      return module;
    };

    var clock = function(beat, bpm) {

      var ticks = 0;
      var last = { beat : 0, bpm : 0 };
      var unit = 0;

      var module = createModule({
        beat : _const(beat || 8),
        bpm : _const(bpm || 120),
        ontrigger : null,
        sync : function() { ticks = 0; },
        delta : function() {
          if (last.beat != module.beat() || last.bpm != module.bpm() ) {
            unit = ~~(Fs / (module.bpm() / 60 * module.beat() / 4) );
            last.beat = module.beat();
            last.bpm = module.bpm();
          }
          if (ticks % unit == 0) {
            if (module.ontrigger) {
              module.ontrigger();
            }
            ticks = 0;
          }
          ticks += 1;
        }
      });

      return module;
    };

    //

    var modules = [];
    var createModule = function(module) {
      if (typeof module.dispose != 'undefined') {
        throw 'error';
      }
      module.delta = module.delta || function() {};
      module.dispose = function() { unregister(module); };
      register(module);
      return module;
    };
    var register = function(module) {
      modules.push(module);
      if (synth.debug) {
        console.log('register:' + modules.length);
      }
    };
    var unregister = function(module) {
      var newModules = [];
      for (var i = 0; i < modules.length; i += 1) {
        if (modules[i] != module) {
          newModules.push(modules[i]);
        }
      }
      modules = newModules;
      if (synth.debug) {
        console.log('unregister:' + modules.length);
      }
    };
    var delta = function() {
      for (var i = 0; i < modules.length; i += 1) {
        modules[i].delta();
      }
    };

    var synth = {
      debug : false,
      Fs : Fs,
      _const : _const,
      delta : delta,
      mixer : mixer,
      sin : sin,
      square : square,
      saw : saw,
      triangle : triangle,
      noise : noise,
      osc : osc,
      sh : sampleAndHold,
      filter : biquadFilter,
      eg : envelopeGenerator,
      clock : clock
    };

    return synth;
  };

  var createSynthNode = function(audioCtx, synth, output) {
    // no input, single output.
    var scriptNode = audioCtx.createScriptProcessor(4096, 0, 1);
    scriptNode.onaudioprocess = function(event) {
      var outputBuffer = event.outputBuffer;
      var outputData = outputBuffer.getChannelData(0);
      for (var i = 0; i < outputBuffer.length; i += 1) {
        outputData[i] = output();
        synth.delta();
      }
    };
    return scriptNode;
  };

  return {
    WaveFormType : WaveFormType,
    FilterType : BiquadFilterType,
    createSynth : createSynth,
    createSynthNode : createSynthNode
  };
}();

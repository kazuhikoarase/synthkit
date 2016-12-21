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

  var Fs = 44100; // fixed to 44.1kHz

  var _2PI = 2 * Math.PI;

  var _const = function(val) { return function() { return val; } };

  var createSynth = function() {

    var modules = [];

    var gain = function(level) {

      var gain = 0;
      var last = { level : 0 };

      var module = {
        level : _const(level || 1),
        input : _const(0),
        output : function() {
          if (last.level != module.level() ) {
            gain = Math.pow(10, Math.max(0, Math.min(module.level(), 1) ) - 1);
            last.level = module.level();
          }
          return module.input() * gain; 
        },
        delta : function() {}
      };

      synth.register(module);

      return module;
    };

    var sin = function(freq) {

      var t = 0;

      var module = {
        freq : _const(freq || 440),
        sync : function() { t = 0; },
        output : function() { return Math.sin(t); },
        delta : function() { t += _2PI * module.freq() / Fs; }
      };

      synth.register(module);

      return module;
    };

    var square = function(freq) {

      var t = 0;

      var module = {
        freq : _const(freq || 440),
        sync : function() { t = 0; },
        output : function() { return ~~t % 2 == 1? -1 : 1; },
        delta : function() { t += 2 * module.freq() / Fs; }
      };

      synth.register(module);

      return module;
    };

    var saw = function(freq) {

      var t = 0;

      var module = {
        freq : _const(freq || 440),
        sync : function() { t = 0; },
        output : function() { return ( (t + 0.5) % 1) * 2 - 1; },
        delta : function() { t += 2 * module.freq() / Fs; }
      };

      synth.register(module);

      return module;
    };

    var triangle = function(freq) {

      var t = 0;

      var module = {
        freq : _const(freq || 440),
        sync : function() { t = 0; },
        output : function() {
          var tt = t + 0.5;
          return (~~tt % 2 == 1? tt % 1 : 1 - tt % 1) * 2 - 1; },
        delta : function() { t += 2 * module.freq() / Fs; }
      };

      synth.register(module);

      return module;
    };

    var noise = function() {

      var val = 0;
      var update = true;

      var module = {
        output : function() {
          if (update) {
            val = Math.random() * 2 - 1;
            update = false;
          }
          return val;
        },
        delta : function() { update = true; }
      };

      synth.register(module);

      return module;
    };

    var sampleAndHold = function(freq) {

      var val = 0;
      var t = 0;
      var last = { intT : ~~t };

      var module = {
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
        delta : function() { t += 2 * module.freq() / Fs; }
      };

      synth.register(module);

      return module;
    };

    // @see http://www.musicdsp.org/files/Audio-EQ-Cookbook.txt
    var biquadFilter = function(type, cutoff, resonance) {

      var _a1, _a2, _b0, _b1, _b2;

      var _in0 = 0;
      var _out0 = 0;
      var _in1 = 0;
      var _in2 = 0;
      var _out1 = 0;
      var _out2 = 0;

      var last = { type : '', cutoff : 0, resonance : 0 };

      var module = {
        type : _const(type || BiquadFilterType.LPF),
        cutoff : _const(cutoff || 440),
        resonance : _const(resonance || 0.5),
        input : _const(0),
        output : function() {
          if (last.type != module.type() ||
              last.cutoff != module.cutoff() ||
              last.resonance != module.resonance() ) {
            prepare();
            last.type = module.type();
            last.cutoff = module.cutoff();
            last.resonance = module.resonance();
          }
          _in0 = module.input();
          _out0 = _b0 * _in0 + _b1 * _in1 + _b2 * _in2 -
            _a1 * _out1 - _a2 * _out2;
          return _out0;
        },
        delta : function() {
          _in2 = _in1;
          _in1 = _in0;
          _out2 = _out1;
          _out1 = _out0;
        }
      };

      synth.register(module);

      var prepare = function() {

        var w0 = _2PI * module.cutoff() / Fs;
        var sin_w0 = Math.sin(w0);
        var cos_w0 = Math.cos(w0);
        var alpha = sin_w0 / (2 * module.resonance() );

        var a0, a1, a2, b0, b1, b2;

        switch (module.type() ) {

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

      var val = 0;
      var state = 'r';
      var rate = 1 / Fs / 10;
      var pow = function(val) { return Math.pow(rate, val); };

      // a, d, r : 0 ~ 1 = 0s ~ 10s
      // s : 0 ~ 1
      var module = {
        attack : _const(0),
        decay : _const(0),
        sustain : _const(1),
        release : _const(0),
        output : function() { return val; },
        on : function() { state = 'a'; },
        off : function() { state = 'r'; },
        delta : function() {
          switch(state) {
          case 'a' :
            if (val < 1) {
              val = Math.min(1, val + pow(module.attack() ) );
            } else {
              state = 'd';
            }
            break;
          case 'd' :
            if (val > module.sustain() ) {
              val = Math.max(module.sustain(), val - pow(module.decay() ) );
            }
            break;
          case 'r' :
            if (val > 0) {
              val = Math.max(0, val - pow(module.release() ) );
            }
            break;
          default :
            throw 'state:' + state;
          }
        }
      };

      synth.register(module);

      return module;
    };

    var synth = {
      register : function(module) {
        modules.push(module);
      },
      delta : function() {
        for (var i = 0; i < modules.length; i += 1) {
          modules[i].delta();
        }
      },
      gain : gain,
      sin : sin,
      square : square,
      saw : saw,
      triangle : triangle,
      noise : noise,
      sh : sampleAndHold,
      filter : biquadFilter,
      eg : envelopeGenerator
    };

    return synth;
  };

  var BiquadFilterType = {
    LPF : 'lpf',
    HPF : 'hpf',
    BPF : 'bpf',
    NOTCH : 'notch'
  };

  var createSynthNode = function(audioCtx, synth, output) {
    // no input, single output
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
    Fs : Fs,
    _const : _const,
    createSynth : createSynth,
    FilterType : BiquadFilterType,
    createSynthNode : createSynthNode
  };
}();

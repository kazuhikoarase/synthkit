//
// synthkit
//
// Copyright (c) 2016 Kazuhiko Arase
//
// URL : https ://github.com/kazuhikoarase/synthkit/
//
// Licensed under the MIT license :
//  http ://www.opensource.org/licenses/mit-license.php
//

var synthkit = function() {

  'use strict'

  var extend = function(o) {
    for (var i = 1; i < arguments.length; i += 1) {
      var a = arguments[i];
      for (var k in a) {
        if (typeof o[k] == 'function' && typeof a[k] != 'function') {
          o[k] = function(val) {
            return function() { return val; }; }(a[k]);
        } else {
          o[k] = a[k];
        }
      }
    }
    return o;
  };

  var defaultInput = function() {
    var module;
    return module = extend(function() {
      return 0;
    }, {
      sync : function() { return this; }
    }).sync();
  };

  var modules = function(opts) {

    opts = extend({ sampleRate : 44100 }, opts);
    var Fs = opts.sampleRate;

    var sequencer = function(opts) {

      var _T = 1 / (Fs * 120 * 2);

      var t, ticks, nextTicks;

      var module;
      return module = extend(function() {
        try {
          nextTicks = Math.floor(
              module.tempo() * module.beat() * t * _T);
          if (ticks != nextTicks) {
            ticks = nextTicks;
            module.trigger(ticks);
          }
          return 0;
        } finally {
          t += 1;
        }
      }, {
        sync : function() { t = 0; ticks = -1; return this; },
        tempo : function() { return 120; },
        beat : function() { return 4; },
        trigger : function(ticks) {
          console.log(ticks);
        }
      }, opts || {}).sync();
    };

    var envelopeGenerator = function(opts) {

      var _T = 1 / Fs;
      var minGain = Math.log(10) * -3; // ~= -6.9, -60dB
      var maxGain = 0;

      var gain, state;

      var module, val;
      return module = extend(function() {
        try {
          val = module.input();
          return gain > minGain? val * Math.exp(gain) : 0;
        } finally {
          if (state == 'a') {
            // attack
            gain += module.attack() * _T;
            if (gain > maxGain) {
              gain = maxGain;
              state = 'd';
            }
          } else if (state == 'd') {
            // decay
            gain -= module.decay() * _T;
            if (gain < module.sustain() ) {
              gain = module.sustain();
              state = 's';
            }
          } else if (state == 's') {
            // sustain
            // nothing to do.
          } else if (state == 'r') {
            // release
            gain -= module.release() * _T;
            if (gain < minGain) {
              gain = minGain;
              state = '';
            }
          } else if (state == '') {
            // nothing to do.
          } else {
            throw 'state :' + state;
          }
        }
      }, {
        sync : function() {
          gain = minGain;
          state = '';
          this.input.sync();
          return this;
        },
        on : function(gain) { state = 'a'; maxGain = gain || 0; },
        off : function() { state = 'r'; },
        attack : function() { return 1E3; },
        decay : function() { return 1E0; },
        sustain : function() { return minGain; },
        release : function() { return 1E1; },
        input : defaultInput()
      }, opts || {}).sync();
    };

    var volume = function(opts) {
      var module;
      return module = extend(function() {
        return module.input() * Math.exp(module.gain() );
      }, {
        sync : function() { this.input.sync(); return this; },
        gain : function() { return 0; },
        pan : function() { return 0; },
        input : defaultInput()
      }, opts || {}).sync();
    };

    var mixer = function(opts) {

      var mono = opts.mono !== false;
      var inputs, output = mono? 0 : [0, 0], i, val, pan;

      var module;
      return module = extend(mono? function() {
        output= 0;
        inputs = module.inputs;
        for (i = 0; i < inputs.length; i += 1) {
          output += inputs[i]();
        }
        return output;
      } : function() {
        output[0] = 0;
        output[1] = 0;
        inputs = module.inputs;
        for (i = 0; i < inputs.length; i += 1) {
          val = inputs[i]();
          pan = inputs[i].pan? inputs[i].pan() : 0;
          output[0] += val * Math.exp(pan > 0? -pan : 0);
          output[1] += val * Math.exp(pan < 0? pan : 0);
        }
        return output;
      }, {
        sync : function() {
          inputs = this.inputs;
          for (i = 0; i < inputs.length; i += 1) {
            if (inputs[i].sync) {
              inputs[i].sync();
            }
          }
          return this;
        },
        inputs : []
      }, opts || {}).sync();
    };

    var sine = function(opts) {

      var _2PI = Math.PI * 2;
      var _2PI_Fs = _2PI / Fs;
      var A = 1;

      var t;

      var module;
      return module = extend(function() {
        try {
          return A * Math.sin(t);
        } finally {
          t = (t + _2PI_Fs * module.freq() ) % _2PI;
        }
      }, {
        t0 : 0,
        sync : function() { t = this.t0; return this; },
        freq : function() { return 440; }
      }, opts || {}).sync();
    };

    var square = function(opts) {

      var _2PI = Math.PI * 2;
      var _2PI_Fs = _2PI / Fs;
      var A = 1;

      var t;

      var module;
      return module = extend(function() {
        try {
          return t < _2PI * module.ratio()? A : -A;
        } finally {
          t = (t + _2PI_Fs * module.freq() ) % _2PI;
        }
      }, {
        t0 : 0,
        sync : function() { t = this.t0; return this; },
        freq : function() { return 440; },
        ratio : function() { return 0.5; }
      }, opts || {}).sync();
    };

    var saw = function(opts) {

      var _PI = Math.PI;
      var _2PI = _PI * 2;
      var _2PI_Fs = _2PI / Fs;
      var A = 1;

      var t;

      var module;
      return module = extend(function() {
        try {
          return A - A * t / _PI;
        } finally {
          t = (t + _2PI_Fs * module.freq() ) % _2PI;
        }
      }, {
        t0 : _PI,
        sync : function() { t = this.t0; return this; },
        freq : function() { return 440; }
      }, opts || {}).sync();
    };

    var triangle = function(opts) {

      var _PI = Math.PI;
      var _2PI = _PI * 2;
      var _2PI_Fs = _2PI / Fs;
      var A = 1;

      var t;

      var module;
      return module = extend(function() {
        try {
          return (t < _PI? t % _PI : _PI - t % _PI) * 2 * A / _PI - A;
        } finally {
          t = (t + _2PI_Fs * module.freq() ) % _2PI;
        }
      }, {
        t0 : _PI / 2,
        sync : function() { t = this.t0; return this; },
        freq : function() { return 440; }
      }, opts || {}).sync();
    };

    var noise = function(opts) {

      var S = 1.37;
      var A = 1;

      var output;

      var module;
      return module = extend(function() {
        try {
          return output;
        } finally {
          output = (S * (S + output) ) % (2 * A) - A;
        }
      }, {
        sync : function() { output = 0; return this; }
      }, opts || {}).sync();
    };

    var BiquadFilterType = {
      LPF : 'lpf',
      HPF : 'hpf',
      BPF : 'bpf',
      NOTCH : 'notch'
    };

    var biquadFilter = function(opts) {

      var _2PI = Math.PI * 2;
      var _2PI_Fs = _2PI / Fs;

      var _a1, _a2, _b0, _b1, _b2;

      var _in0, _out0, _in1, _in2, _out1, _out2;

      var last = { type : '', cutoff : 0, resonance : 0 };

      var prepare = function(type, cutoff, resonance) {

        var w0 = _2PI_Fs * cutoff;
        var sin_w0 = Math.sin(w0);
        var cos_w0 = Math.cos(w0);
        var alpha = sin_w0 / (2 * resonance);

        var a0, a1, a2, b0, b1, b2;

        if (type == BiquadFilterType.LPF) {
          b0 = (1 - cos_w0) / 2;
          b1 = 1 - cos_w0;
          b2 = (1 - cos_w0) / 2;
          a0 = 1 + alpha;
          a1 = -2 * cos_w0;
          a2 = 1 - alpha;
        } else if (type == BiquadFilterType.HPF) {
          b0 = (1 + cos_w0) / 2;
          b1 = -(1 + cos_w0);
          b2 = (1 + cos_w0) / 2;
          a0 = 1 + alpha;
          a1 = -2 * cos_w0;
          a2 = 1 - alpha;
        } else if (type == BiquadFilterType.BPF) {
          b0 = sin_w0 / 2;
          b1 = 0;
          b2 = -sin_w0 / 2;
          a0 = 1 + alpha;
          a1 = -2 * cos_w0;
          a2 = 1 - alpha;
        } else if (type == BiquadFilterType.NOTCH) {
          b0 = 1;
          b1 = -2 * cos_w0;
          b2 = 1;
          a0 = 1 + alpha;
          a1 = -2 * cos_w0;
          a2 = 1 - alpha;
        } else {
          throw 'unknown type :' + module.type();
        }

        // prepare params
        _b0 = b0 / a0;
        _b1 = b1 / a0;
        _b2 = b2 / a0;
        _a1 = a1 / a0;
        _a2 = a2 / a0;
      };

      var module;
      return module = extend(function() {
        try {
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
        } finally {
          _in2 = _in1;
          _in1 = _in0;
          _out2 = _out1;
          _out1 = _out0;
        }
      }, {
        sync : function() {
          _in0 = 0;
          _out0 = 0;
          _in1 = 0;
          _in2 = 0;
          _out1 = 0;
          _out2 = 0;
          this.input.sync();
          return this;
        },
        type : function() { return BiquadFilterType.LPF; },
        cutoff : function() { return 440; },
        resonance : function() { return 0.5; },
        input : defaultInput()
      }, opts || {}).sync();
    };

    return {
      sine : sine,
      square : square,
      saw : saw,
      triangle : triangle,
      noise : noise,
      filter : biquadFilter,
      seq : sequencer,
      eg : envelopeGenerator,
      vol : volume,
      mixer : mixer
    };
  };

  var player = function() {

    var audioContext = new AudioContext();

    var gainNode = audioContext.createGain();
    gainNode.gain.value = 0.2;
    gainNode.connect(audioContext.destination);

    var bufferSize = 8192;
    // no input, 2 output.
    var scriptNode = audioContext.createScriptProcessor(bufferSize, 0, 2);
    var outputBuffer, outputDataL, outputDataR, i, val;
    scriptNode.onaudioprocess = function(event) {
      outputBuffer = event.outputBuffer;
      outputDataL = outputBuffer.getChannelData(0);
      outputDataR = outputBuffer.getChannelData(1);
      for (i = 0; i < outputBuffer.length; i += 1) {
        val = player.src();
        if (typeof val == 'number') {
          outputDataL[i] = outputDataR[i] = val;
        } else {
          outputDataL[i] = val[0];
          outputDataR[i] = val[1];
        }
      }
    };

    var player = {

      audioContext : audioContext,
      gainNode : gainNode,
      scriptNode : scriptNode,

      src : function() { return 0; },

      playing : false,
      start : function(src) {
        if (this.playing) {
          return;
        }
        this.src = src;
        scriptNode.connect(gainNode);
        this.playing = true;
      },
      stop : function() {
        if (!this.playing) {
          return;
        }
        scriptNode.disconnect(gainNode);
        this.playing = false;
      },
    };

    return player;
  };

  return {
    modules : modules,
    player : player
  };
}();

!function(synthkit) {
  if (typeof exports === 'object') {
    module.exports = synthkit;
  }
}(synthkit);

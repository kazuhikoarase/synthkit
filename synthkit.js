//
// synthkit
//
// Copyright (c) 2016 Kazuhiko Arase
//
// URL: https://github.com/kazuhikoarase/synthkit/
//
// Licensed under the MIT license:
//  http://www.opensource.org/licenses/mit-license.php
//

var synthkit = function() {

  'use strict'

  var Fs = 44100;

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
      sync: function() {}
    });
  };

  var sequencer = function(opts) {

    var _T = Fs * 120 * 2;

    var t = 0;
    var ticks = -1;
    var nextTicks;

    var module;
    return module = extend(function() {
      try {
        nextTicks = Math.floor(
            module.tempo() * module.beat() * t / _T);
        if (ticks != nextTicks) {
          ticks = nextTicks;
          module.trigger(ticks);
        }
        return 0;
      } finally {
        t += 1;
      }
    }, {
      sync: function() { t = 0; ticks = -1; },
      tempo: function() { return 120; },
      beat: function() { return 4; },
      trigger: function(ticks) {
        console.log(ticks);
      }
    }, opts || {});
  };

  var envelopeGenerator = function(opts) {

    var minGain = Math.log(10) * -3; // -60dB
    var maxGain = 0;

    var gain = minGain;
    var state = '';

    var module;
    return module = extend(function() {
      try {
        return gain > minGain? module.input() * Math.exp(gain) : 0;
      } finally {
        if (state == 'a') {
          // attack
          gain += module.attack();
          if (gain > maxGain) {
            gain = maxGain;
            state = 'd';
          }
        } else if (state == 'd') {
          // decay
          gain -= module.decay();
          if (gain < module.sustain() ) {
            gain = module.sustain();
            state = 's';
          }
        } else if (state == 's') {
          // sustain
          // nothing to do.
        } else if (state == 'r') {
          // release
          gain -= module.release();
          if (gain < minGain) {
            gain = minGain;
            state = '';
          }
        } else if (state == '') {
          // nothing to do.
        } else {
          throw 'state:' + state;
        }
      }
    }, {
      sync: function() { gain = minGain; state = ''; module.input.sync(); },
      on: function(gain) { state = 'a'; maxGain = gain || 0; },
      off: function() { state = 'r'; },
      attack: function() { return 1E-1; },
      decay: function() { return 1E-4; },
      sustain: function() { return minGain; },
      release: function() { return 1E-3; },
      input: defaultInput()
    }, opts || {});
  }

  var volume = function(opts) {
    var module;
    return module = extend(function() {
      return module.input() * Math.exp(module.gain() );
    }, {
      sync: function() { module.input.sync(); },
      gain: function() { return 0; },
      pan: function() { return 0; },
      input: defaultInput()
    }, opts || {});
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
      sync: function() {
        inputs = module.inputs;
        for (i = 0; i < inputs.length; i += 1) {
          inputs[i].sync();
        }
      },
      inputs: []
    }, opts || {});
  };

  var sine = function(opts) {

    var _2PI = Math.PI * 2;
    var _2PI_Fs = _2PI/ Fs;

    var t = 0;

    var module;
    return module = extend(function() {
      try {
        return Math.sin(t);
      } finally {
        t = (t + _2PI_Fs * module.freq() ) % _2PI;
      }
    }, {
      sync: function() { t = 0; },
      freq: function() { return 440; }
    }, opts || {});
  };

  var square = function(opts) {

    var t = 0;
    var _2_Fs = 2 / Fs;

    var module;
    return module = extend(function() {
      try {
        return t < 2 * module.ratio()? 1 : -1;
      } finally {
        t = (t + _2_Fs * module.freq() ) % 2;
      }
    }, {
      sync: function() { t = 0; },
      freq: function() { return 440; },
      ratio: function() { return 0.5; }
    }, opts || {});
  };

  var saw = function(opts) {

    var t = 1;
    var _2_Fs = 2 / Fs;

    var module;
    return module = extend(function() {
      try {
        return 1 - t;
      } finally {
        t = (t + _2_Fs * module.freq() ) % 2;
      }
    }, {
      sync: function() { t = 1; },
      freq: function() { return 440; }
    }, opts || {});
  };

  var triangle = function(opts) {

    var t = 0.5;
    var _2_Fs = 2 / Fs;

    var module;
    return module = extend(function() {
      try {
        return (~~t % 2 == 0? t % 1 : 1 - t % 1) * 2 - 1;
      } finally {
        t = (t + _2_Fs * module.freq() ) % 2;
      }
    }, {
      sync: function() { t = 0.5; },
      freq: function() { return 440; }
    }, opts || {});
  };

  var noise = function(opts) {

    var A = 1.37;
    var output = 0;

    var module;
    return module = extend(function() {
      try {
        return output;
      } finally {
        output = (A * (A + output) ) % 2 - 1;
      }
    }, {
      sync: function() { output = 0; }
    }, opts || {});
  };

  var BiquadFilterType = {
    LPF: 'lpf',
    HPF: 'hpf',
    BPF: 'bpf',
    NOTCH: 'notch'
  };

  var biquadFilter = function(opts) {

    var _2PI = Math.PI * 2;
    var _2PI_Fs = _2PI / Fs;

    var _a1, _a2, _b0, _b1, _b2;

    var _in0 = 0;
    var _out0 = 0;
    var _in1 = 0;
    var _in2 = 0;
    var _out1 = 0;
    var _out2 = 0;

    var last = { type: '', cutoff: 0, resonance: 0 };

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
        throw 'unknown type:' + module.type();
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
      sync: function() {
        _in0 = 0;
        _out0 = 0;
        _in1 = 0;
        _in2 = 0;
        _out1 = 0;
        _out2 = 0;
        module.input.sync();
      },
      type: function() { return BiquadFilterType.LPF; },
      cutoff: function() { return 440; },
      resonance: function() { return 0.5; },
      input: defaultInput()
    }, opts || {});
  };

  var player = function() {

    var audioCtx = new AudioContext();

    Fs = audioCtx.sampleRate;

    var gainNode = audioCtx.createGain();
    gainNode.gain.value = 0.2;
    gainNode.connect(audioCtx.destination);

    var bufferSize = 8192;
    // no input, 2 output.
    var scriptNode = audioCtx.createScriptProcessor(bufferSize, 0, 2);
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

      audioCtx: audioCtx,
      gainNode: gainNode,
      scriptNode: scriptNode,

      src: function() { return 0; },

      playing: false,
      start: function(src) {
        if (this.playing) {
          return;
        }
        this.src = src;
        scriptNode.connect(gainNode);
        this.playing = true;
      },
      stop: function() {
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
    sine: sine,
    square: square,
    saw: saw,
    triangle: triangle,
    noise: noise,
    filter: biquadFilter,
    seq: sequencer,
    eg: envelopeGenerator,
    vol: volume,
    mixer: mixer,
    player: player
  };
}();

!function(synthkit) {
  if (typeof exports === 'object') {
    module.exports = synthkit;
  }
}(synthkit);

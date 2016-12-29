synthkit
--
# Getting started

##With Web Audio

At first, prepare an mixer.

```javascript
var audioCtx = new AudioContext();
var gainNode = audioCtx.createGain();
gainNode.gain.value = 0.2;
gainNode.connect(audioCtx.destination);

// create synth and mixer.
var synth = synthkit.createSynth();
var mixer = synth.mixer();
synthkit.createSynthNode(audioCtx, synth, mixer.output).connect(gainNode);
```

Then create an osc and connect to the mixer.

```javascript
// create osc and connect to the mixer.
var osc = synth.osc();
osc.type = function() { return 'sin'; };
osc.freq = function() { return 440; };
osc.level = function() { return 1; };
mixer.inputs.push(osc.output);
```

The module's parameters are not privided by value but function.
Therefore it's easy to connect each other.

```javascript
var lfo = synth.osc();
lfo.type = function() { return 'saw'; };
lfo.freq = function() { return 0.5; };
lfo.level = function() { return 1; };
var osc = synth.osc();
osc.type = function() { return 'sin'; };
osc.freq = function() { return 440 * Math.exp(lfo.output() ); };
osc.level = function() { return 1; };
mixer.inputs.push(osc.output);
```

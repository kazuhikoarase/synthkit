synthkit
--
# Getting started

##With Web Audio

```javascript
var audioCtx = new AudioContext();
var gainNode = audioCtx.createGain();
gainNode.gain.value = 0.2;
gainNode.connect(audioCtx.destination);

// create synth and mixer.
var synth = synthkit.createSynth();
var mixer = synth.mixer();
synthkit.createSynthNode(audioCtx, synth, mixer.output).connect(gainNode);

// create osc and connect to the mixer.
var osc = synth.osc();
osc.type = function() { return 'sin'; };
osc.freq = function() { return 440; };
osc.level = function() { return 1; };
mixer.inputs.push(osc.output);
```

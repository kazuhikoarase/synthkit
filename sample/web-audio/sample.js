//
// synthkit sample for Web Audio
//

$(function() {

  'use strict';

  var AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) {
    console.log('AudioContext not supported');
    return;
  }

  var audioCtx = new AudioContext();
  var synth = synthkit.createSynth();
  var mixer = synth.mixer();
  var synthNode = synthkit.createSynthNode(audioCtx, synth, mixer.output);
  var gainNode = audioCtx.createGain();
  gainNode.gain.value = 0.2;
  synthNode.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  var _const = synthkit._const;
  var FilterType = synthkit.FilterType;

  var samples = [
    {
      label : 'Simple',
      ui : [
        { id : 'pad1', type : 'pad', label : 'Pad' },
        { id : 'wave', type : 'select', label : 'Wave',
          options : [ 'sin', 'square', 'saw', 'triangle', 'noise'] },
        { id : 'freq', type : 'log', label : 'Freq', min : 20, max : 20000 },
        { id : 'vol', type : 'liner', label : 'Vol', min : 0, max : 1 }
      ],
      settings : { freq : 440, vol : 1 },
      init : function(ui) {

        var waves = {
          sin : synth.sin(),
          square : synth.square(),
          saw : synth.saw(),
          triangle : synth.triangle(),
          noise : synth.noise()
        };

        var gain = synth.gain();
        gain.level = function() {
          return ui.vol.data('output')() * ui.pad1.data('output')();
        };

        mixer.inputs.push(gain.output);

        // setup ui
        ui.wave.on('change', function(event) {
          var wave = waves[$(event.target).data('output')()];
          gain.input = wave.output;
          wave.freq = ui.freq.data('output');
        }).trigger('change');
      }
    },
    {
      label : 'EG Test',
      ui : [
        { id : 'pad1', type : 'pad', label : 'Pad' },
        { id : 'wave', type : 'select', label : 'Wave',
          options : [ 'sin', 'square', 'saw', 'triangle', 'noise'] },
        { id : 'freq', type : 'log', label : 'Freq', min : 20, max : 20000 },
        { id : 'a', type : 'liner', label : 'Attack', min : 0, max : 1 },
        { id : 'd', type : 'liner', label : 'Decay', min : 0, max : 1 },
        { id : 's', type : 'liner', label : 'Sustain', min : 0, max : 1 },
        { id : 'r', type : 'liner', label : 'Release', min : 0, max : 1 }
      ],
      settings : {
        "pad1": 0,
        "wave": "square",
        "freq": 440,
        "a": 0,
        "d": 0,
        "s": 1,
        "r": 0
      },
      init : function(ui) {

        var waves = {
          sin : synth.sin(),
          square : synth.square(),
          saw : synth.saw(),
          triangle : synth.triangle(),
          noise : synth.noise()
        };

        var eg = synth.eg();
        eg.attack = ui.a.data('output');
        eg.decay = ui.d.data('output');
        eg.sustain = ui.s.data('output');
        eg.release = ui.r.data('output');
        eg.input = ui.pad1.data('output');

        var gain = synth.gain();
        gain.level = eg.output;
        mixer.inputs.push(gain.output);

        ui.wave.on('change', function(event) {
          var wave = waves[$(event.target).data('output')()];
          gain.input = wave.output;
          wave.freq = ui.freq.data('output');
        }).trigger('change');
      }
    },
    {
      label : 'Digital Noise',
      ui : [
        { id : 'pad1', type : 'pad', label : 'Pad' }
      ],
      init : function(ui) {

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

  var createSVGElement = function(tagName) {
    return $(document.createElementNS(
        'http://www.w3.org/2000/svg', tagName) );
  };

  var createSVG = function(w, h) {
    return createSVGElement('svg').
      attr({ width: w, height: h, viewBox: '0 0 ' + w + ' ' + h });
  };

  var createPad = function($comp, size, spec) {
    var gap = 4;
    var model = { on : false };
    var $pad = createSVGElement('rect').css('fill', '#000000').
      css('stroke', 'none').attr({x : gap, y : gap,
        width : size - gap * 2, height : size - gap * 2, rx : 6, ry: 6}).
      on('mousedown', function(event) {
        event.preventDefault();
        model.on = true;
        $pad.css('fill', '#333333');
        $(document).on('mouseup', pad_mouseupHandler);
        $comp.trigger('change');
      });
    var pad_mouseupHandler = function(event) {
      model.on = false;
      $pad.css('fill', '#000000');
      $(document).off('mouseup', pad_mouseupHandler);
      $comp.trigger('change');
    };
    var output = function(output) {
      if (arguments.length == 0) {
        return model.on? 1 : 0;
      } else if (arguments.length == 1) {
        model.on = output != 0;
      } else {
        throw 'illegal arguments';
      }
    };
    $comp.data('output', output);
    return $pad;
  };

  var createKnob = function($comp, size, spec) {

    var gap = 4;
    var model = { angle : 45 };
    var r = size / 2 - gap;

    var $knob = createSVGElement('g').
      append(createSVGElement('circle').css('fill', '#000000').
        css('stroke', 'none').attr({ cx : 0, cy : 0, r : r }) ).
      append(createSVGElement('path').css('fill', 'none').
        css('stroke-width', '4').css('stroke', '#ffffff').
        attr('d', 'M0 0L' + 0 + ' ' + r) ).
      on('mousedown', function(event) {
        event.preventDefault();
        $(document).on('mousemove', knob_mousemoveHandler).
          on('mouseup', knob_mouseupHandler);
      });
    var knob_mousemoveHandler = function(event) {
      var off = $comp.offset();
      var dx = event.pageX - (off.left + size / 2);
      var dy = event.pageY - (off.top + size / 2);
      setAngle(-Math.atan2(dx, dy) * 360 / (2 * Math.PI) );
    };
    var knob_mouseupHandler = function(event) {
      $(document).off('mousemove', knob_mousemoveHandler).
        off('mouseup', knob_mouseupHandler);
    };
    var setAngle = function (angle) {
      angle = Math.max(45, Math.min( (360 + angle) % 360, 315) );
      $knob.attr('transform',
          'translate(' + size / 2 + ',' + size / 2 +
          ') rotate(' + angle + ')');
      model.angle = angle;
      $comp.trigger('change');
    };
    var val = function(val) {
      if (arguments.length == 0) {
        return (model.angle - 45) / 270;
      } else if (arguments.length == 1) {
        setAngle(45 + 270 * val);
      } else {
        throw 'illegal arguments';
      }
    };
    if (spec.type == 'liner') {
      var output = function(output) {
        if (arguments.length == 0) {
          return spec.min + (spec.max - spec.min) * val();
        } else if (arguments.length == 1) {
          val( (output - spec.min) / (spec.max - spec.min) );
        } else {
          throw 'illegal arguments';
        }
      };
      $comp.data('output', output);
    } else if (spec.type == 'log') {
      var lmin = Math.log(spec.min);
      var lmax = Math.log(spec.max);
      var output = function(output) {
        if (arguments.length == 0) {
          // 1 -Math.LOG2E
          return Math.exp(lmin + (lmax - lmin) * val() );
        } else if (arguments.length == 1) {
          val( (Math.log(output) - lmin) / (lmax - lmin) );
        } else {
          throw 'illegal arguments';
        }
      };
      $comp.data('output', output);
    }
    val(0);
    return $knob;
  };

  var createFontPath = function(c, cx, cy) {
    var d = '';
    var data = lcdfont.getData(c);
    for (var y = 0; y < 7; y += 1) {
      for (var x = 0; x < 5; x += 1) {
        if ( (data[y] >> x) & 1) {
          d += 'M' + (x + cx) + ' ' + (y + cy);
          d += 'L' + (x + cx + 1) + ' ' + (y + cy);
          d += 'L' + (x + cx + 1) + ' ' + (y + cy + 1);
          d += 'L' + (x + cx) + ' ' + (y + cy + 1);
          d += 'Z';
        }
      }
    }
    return d;
  };

  var createSelect = function($comp, size, spec) {

    var selectedIndex = 0;
    var options = [];
    if (spec.options) {
      for (var i = 0; i < spec.options.length; i += 1) {
        var option = spec.options[i];
        var index = option.indexOf(':');
        if (index != -1) {
          options.push({ value : option.substring(0, index),
            label : option.substring(index + 1) });
        } else {
          options.push({ value : option, label : option });
        }
      }
    }
    if (options.length == 0) {
      options.push({ value : '', label : '-NODATA-' });
    }

    var gap = 2;
    var $path = createSVGElement('path').
    css('stroke', 'none').css('fill', '#ffcc00');
    var $panel = createSVGElement('g').
      attr('transform', 'translate(' + gap + ' ' + (size - 12 - 4) + ')').
      append(createSVGElement('rect').attr({x : 0, y : 0,
        width: size - gap * 2, height: 12}) ).
      append($path).on('mousedown', function(event) {
        event.preventDefault();
        selectedIndex = (selectedIndex + 1) % options.length;
        setText(options[selectedIndex].label);
        $comp.trigger('change');
      });
    var output = function(output) {
      if (arguments.length == 0) {
        // 1 -Math.LOG2E
        return options[selectedIndex].value;
      } else if (arguments.length == 1) {
        for (var i = 0; i < options.length; i += 1) {
          if (options[i].value == output) {
            selectedIndex = i;
            break;
          }
        }
        setText(options[selectedIndex].label);
      } else {
        throw 'illegal arguments';
      }
    };
    $comp.data('output', output);
    var setText = function(text) {
      var len = text.length;
      var d = '';
      for (var i = 0; i < text.length; i += 1) {
        d += createFontPath(text.charAt(i), i * 6, 2);
      }
      $path.attr('d', d);
    };
    setText(options[selectedIndex].label);
    $comp.append($panel);
  };

  var createComponent = function(comp) {

    var fontSize = 12;
    var size = 50;
    var w = size;
    var h = size + fontSize + 4;
    var $comp = createSVG(w, h).attr('id', comp.id);
    $comp.append(createSVGElement('rect').
        css('stroke', 'none').css('fill', '#cccccc').
        attr({ x : 0, y : 0, width : w, height : h }) ).
      append(createSVGElement('text').
        css('stroke', 'none').css('fill', '#000000').
        css('font-size', fontSize + 'px').
        css('text-anchor', 'middle').
        css('alignment-baseline', 'text-before-edge').
        text(comp.label || comp.id).
        attr({ x : size / 2, y : size }) );

    switch(comp.type) {
    case 'pad' :
      $comp.append(createPad($comp, size, comp) );
      break;
    case 'liner' :
    case 'log' :
      $comp.append(createKnob($comp, size, comp) );
      break;
    case 'select' :
      $comp.append(createSelect($comp, size, comp) );
      break;
    default : 
      throw 'illegal type:' + comp.type; 
    }

    return $comp;
  };

  $.each(samples, function(i, sample) {
    var ui = {};
    var $ui = $('<div></div>').css('margin-bottom', '8px');
    $ui.append($('<div></div>').text(sample.label) );
    $.each(sample.ui || [], function(i, comp) {
      ui[comp.id] = createComponent(comp);
      var output = (sample.settings || {})[comp.id];
      if (typeof output != 'undefined') {
        ui[comp.id].data('output')(output);
      }
      $ui.append(ui[comp.id]);
    });
    $ui.append($('<input type="button" />').
        css('margin-left', '8px').
        val('copy settings').
        on('click', function(event) {
          var settings = {};
          $.each(sample.ui || [], function(i, comp) {
            settings[comp.id] = ui[comp.id].data('output')();
          });
          var $tmp = $('<textarea></textarea>').
            val(JSON.stringify(settings, null, 2) );
          $('BODY').append($tmp);
          $tmp.select();
          document.execCommand('copy');
          $tmp.remove();
        }) );
    sample.init(ui);
    $ui.on('change', function(event) {
      var $target = $(event.target);
      console.log('change - ' +
          $target.attr('id') + ' = ' +
          $target.data('output')() );
    });
    $('BODY').append($ui);
  });
});

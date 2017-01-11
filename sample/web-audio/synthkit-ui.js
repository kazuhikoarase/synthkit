//
// synthkit-ui
//
// Copyright (c) 2016 Kazuhiko Arase
//
// URL: http://www.d-project.com/
//
// Licensed under the MIT license:
//  http://www.opensource.org/licenses/mit-license.php
//

!function(synthkit) {

  'use strict';

  var createSVGElement = function(tagName) {
    return $(document.createElementNS(
        'http://www.w3.org/2000/svg', tagName) );
  };

  var createSVG = function(w, h) {
    return createSVGElement('svg').
      attr({ width: w, height: h, viewBox: '0 0 ' + w + ' ' + h });
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

  var prop = function(getter, setter) {
    return function() {
      if (arguments.length == 0) {
        return getter();
      } else if (arguments.length == 1) {
        if (typeof arguments[0] != 'undefined') {
          setter(arguments[0]);
        }
      } else {
        throw 'illegal number of arguments:' + arguments.length;
      }
    };
  };

  var createBase = function(size, spec) {

    var fontSize = 12;
    var w = size;
    var h = size + fontSize + 4;

    var $comp = createSVG(w, h).attr('id', spec.id).
      css('vertical-align', 'top').
      append(createSVGElement('rect').
        css('stroke', 'none').css('fill', '#cccccc').
        attr({ x : 0, y : 0, width : w, height : h, rx : 4, ry : 4 }) ).
      append(createSVGElement('text').
        css('stroke', 'none').css('fill', '#000000').
        css('font-size', fontSize + 'px').
        css('text-anchor', 'middle').
        css('alignment-baseline', 'text-before-edge').
        css('cursor', 'default').
        text(spec.label || spec.id).
        attr({ x : size / 2, y : size }).on('mousedown', function(event) {
          event.preventDefault();
        }) );
    return $comp;
  };

  var createPad = function(spec) {

    var size = 50;
    var $comp = createBase(size, spec);

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
    $comp.data('output', prop(function() {
      return model.on? 1 : 0;
    }, function(output) {
      model.on = output != 0;
    }) );
    $comp.data('state', prop(function() {
      return { output : $comp.data('output')() };
    }, function(state) {
      $comp.data('output')(state.output);
    }) );
    $comp.append($pad);

    return $comp;
  };

  var createKnob = function(spec) {

    var size = 50;
    var $comp = createBase(size, spec);

    var gap = 4;
    var model = { val : -1, valid : false, output : 0 };
    var r = ~~(size / 2 - gap);

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
      var angle = -Math.atan2(dx, dy) * 360 / (2 * Math.PI);
      angle = Math.max(45, Math.min( (360 + angle) % 360, 315) );
      val( (angle - 45) / 270);
    };
    var knob_mouseupHandler = function(event) {
      $(document).off('mousemove', knob_mousemoveHandler).
        off('mouseup', knob_mouseupHandler);
    };
    var val = prop(function() {
      return model.val;
    }, function(val) {
      if (model.val != val) {
        model.val = val;
        model.valid = false;
        var angle = 45 + 270 * Math.max(0, Math.min(val, 1) );
        $knob.attr('transform', 'translate(' + size / 2 + ',' + size / 2 +
            ') rotate(' + angle + ')');
        $comp.trigger('change');
      }
    });

    var converter = { valToOutput : null, outputToVal : null };
    if (spec.type == 'liner') {
      converter.valToOutput = function(val) {
        return spec.min + (spec.max - spec.min) * val;
      };
      converter.outputToVal = function(output) {
        return (output - spec.min) / (spec.max - spec.min);
      };
    } else if (spec.type == 'log') {
      var lmin = Math.log(spec.min);
      var lmax = Math.log(spec.max);
      converter.valToOutput = function(val) {
        return Math.exp(lmin + (lmax - lmin) * val);
      };
      converter.outputToVal = function(output) {
        return (Math.log(output) - lmin) / (lmax - lmin);
      };
    } else if (spec.type == 'custom') {
      converter.valToOutput = spec.valToOutput;
      converter.outputToVal = spec.outputToVal;
    } else {
      throw 'type:' + spec.type;
    }

    $comp.data('output', prop(function() {
      if (!model.valid) {
        model.output = converter.valToOutput(val() );
        model.valid = true;
      }
      return model.output;
    }, function(output) {
      val(converter.outputToVal(output) );
    }) );

    $comp.data('state', prop(function() {
      return { output : $comp.data('output')() };
    }, function(state) {
      $comp.data('output')(state.output);
    }) );
    $comp.append($knob);

    val(0);

    return $comp;
  };

  var createSelect = function(spec) {

    var size = 50;
    var $comp = createBase(size, spec);

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
    $comp.data('output', prop(function() {
      return options[selectedIndex].value;
    }, function(output) {
      for (var i = 0; i < options.length; i += 1) {
        if (options[i].value == output) {
          selectedIndex = i;
          break;
        }
      }
      setText(options[selectedIndex].label);
    }) );
    $comp.data('state', prop(function() {
      return { output : $comp.data('output')() };
    }, function(state) {
      $comp.data('output')(state.output);
    }) );
    var setText = function(text) {
      var d = '';
      for (var i = 0; i < text.length; i += 1) {
        d += createFontPath(text.charAt(i), i * 6, 2);
      }
      $path.attr('d', d);
    };
    $comp.append($panel);

    setText(options[selectedIndex].label);

    return $comp;
  };

  var createSeq = function(spec) {

    var size = 80;
    var $comp = createBase(size, spec);

    var numSteps = 16;
    var numNotes = 16;
    var padSize = 4;
    var hgap = (size - padSize * numSteps) / 2;
    var vgap = (size - padSize * numNotes) / 2;

    var createPad = function(s, n) {
      var noteonColor = '#ffffff';
      var noteoffColor = '#000000';
      var $pad = createSVGElement('rect').css('fill', noteoffColor).
        css('stroke', '#666666').attr({
          x : hgap + s * padSize,
          y : vgap + (numNotes - n) * padSize,
          width : padSize, height :padSize }).
        on('mousedown', function(event) {
          event.preventDefault();
          $pad.css('fill', noteonColor);
          model.current = n;
          $(document).on('mouseup', pad_mouseupHandler);
          $comp.trigger('change');
        }).data('update', function() {
          $pad.css('fill', model.pattern[s] == n? noteonColor : noteoffColor);
        });
      var pad_mouseupHandler = function(event) {
        model.pattern[s] = (model.pattern[s] == n)? 0 : n;
        model.current = 0;
        updatePads();
        $(document).off('mouseup', pad_mouseupHandler);
        $comp.trigger('change');
      };
      return $pad;
    };
    var updatePads = function() {
      for (var i = 0; i < padList.length; i += 1) {
        padList[i].data('update')();
      }
    };
    var padList = [];
    var model = { pattern : [], current : 0 };
    for (var s = 0; s < numSteps; s += 1) {
      for (var n = 1; n <= numNotes; n += 1) {
        var $pad = createPad(s, n);
        padList.push($pad);
        $comp.append($pad);
      }
      model.pattern.push(0);
    }
    $comp.data('state', prop(function() {
      return { pattern : model.pattern.slice(0), current : model.current };
    }, function(state) {
      var pattern = state.pattern || [];
      for (var i = 0; i < pattern.length; i += 1) {
        model.pattern[i] = pattern[i];
      }
      updatePads();
    }) );
    return $comp;
  };

  var createCombined = function(spec, subSpecs) {

    var uiList = [];

    $.each(subSpecs, function(i, subSpec) {
      subSpec._id = subSpec.id;
      subSpec.id = spec.id + '.' + subSpec.id;
      uiList.push(createComponent(subSpec) );
    });

    var $comp = $('<div></div>').
      css('vertical-align', 'top').
      css('display', 'inline-block');

    $.each(uiList, function(i, $ui) {
      $comp.append($ui).data(subSpecs[i]._id, $ui.data('output') );
    });

    $comp.append($('<br/>') ).
      append($('<div></div>').
          css('text-align', 'center').
          text(spec.label || spec.id) );

    $comp.data('state', prop(function() {
      var state = {};
      $.each(uiList, function(i, $ui) {
        state[subSpecs[i]._id] = $ui.data('output')();
      });
      return state;
    }, function(state) {
      $.each(uiList, function(i, $ui) {
        $ui.data('output')(state[subSpecs[i]._id]);
      });
    }) );

    return $comp;
  };

  var createConverter = function(n) {
    return {
      valToOutput : function(val) {
        return (Math.exp(val * n) - 1) / (Math.exp(n) - 1);
      },
      outputToVal : function(output) {
        return Math.log(output * (Math.exp(n) - 1) + 1) / n;
      }
    };
  };

  var createOSC = function(spec) {
    var conv = createConverter(2);
    return createCombined(spec, [
      { id : 'type', type : 'select', label : 'Wave',
        options : [ 'sin', 'square', 'saw', 'triangle', 'noise'] },
      { id : 'freq', type : 'log', label : 'Freq',
        min : spec.minFreq || 20, max : spec.maxFreq || 20000 },
      { id : 'gain', type : 'custom', label : 'Gain',
        valToOutput : conv.valToOutput, outputToVal : conv.outputToVal }
    ]);
  };

  var createEG = function(spec) {
    var conv0 = createConverter(10);
    var conv1 = {
      valToOutput : function(val) {
        return conv0.valToOutput(1 - val);
      },
      outputToVal : function(output) {
        return 1 - conv0.outputToVal(output);
      }
    };
    var conv2 = createConverter(2);
    return createCombined(spec, [
      { id : 'attack', type : 'custom', label : 'Attack',
        valToOutput : conv1.valToOutput, outputToVal : conv1.outputToVal},
      { id : 'decay', type : 'custom', label : 'Decay',
        valToOutput : conv1.valToOutput, outputToVal : conv1.outputToVal },
      { id : 'sustain', type : 'custom', label : 'Sustain',
        valToOutput : conv2.valToOutput, outputToVal : conv2.outputToVal },
      { id : 'release', type : 'custom', label : 'Release',
        valToOutput : conv1.valToOutput, outputToVal : conv1.outputToVal }
    ]);
  };

  var createComponent = function(spec) {
    switch(spec.type) {
    case 'pad' :
      return createPad(spec);
    case 'liner' :
    case 'log' :
    case 'custom' :
      return createKnob(spec);
    case 'select' :
      return createSelect(spec);
    case 'osc' :
      return createOSC(spec);
    case 'eg' :
      return createEG(spec);
    case 'seq' :
      return createSeq(spec);
    default : 
      throw 'illegal type:' + spec.type; 
    }
  };

  //-------------------------------------------------------

  synthkit.createUI = function(uiDef) {

    var ui = {};

    var $ui = $('<div></div>').css('margin-bottom', '8px');

    $ui.append($('<div></div>').text(uiDef.label) ).
      append($('<input type="button" />').
        css('margin', '4px 0px 4px 0px').
        val('copy settings').
        on('click', function(event) {
          var settings = '';
          settings += '{';
          $.each(uiDef.ui || [], function(i, spec) {
            if (i > 0) {
              settings += ',';
            }
            settings += '\n  ' +
              JSON.stringify(spec.id) + ':' +
              JSON.stringify(ui[spec.id].data('state')() );
          });
          settings += '\n}';
          var $tmp = $('<textarea></textarea>').val(settings);
          $('BODY').append($tmp);
          $tmp.select();
          document.execCommand('copy');
          $tmp.remove();
        }) ).append($('<br/>') );

    $.each(uiDef.ui || [], function(i, spec) {
      ui[spec.id] = createComponent(spec);
      var state = (uiDef.settings || {})[spec.id];
      if (typeof state != 'undefined') {
        ui[spec.id].data('state')(state);
      }
      $ui.append(ui[spec.id]);
    });

    uiDef.init.call(uiDef, ui);
    $ui.on('change', function(event) {
      var $target = $(event.target);
      if (synthkit.debug) {
        console.log('change - ' +
            $target.attr('id') + ' => ' +
            JSON.stringify($target.data('state')() ) );
      }
    });
    return $ui;
  };
}(synthkit);

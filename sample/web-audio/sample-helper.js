//
// synthkit sample and test for Web Audio
//

var synthkit_sample = function() {

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
    $comp.data('output', function(output) {
      if (arguments.length == 0) {
        return model.on? 1 : 0;
      } else if (arguments.length == 1) {
        model.on = output != 0;
      } else {
        throw 'illegal arguments';
      }
    } );
    return $pad;
  };

  var createKnob = function($comp, size, spec) {

    var gap = 4;
    var model = { val : -1, valid : false };
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
      var angle = -Math.atan2(dx, dy) * 360 / (2 * Math.PI);
      angle = Math.max(45, Math.min( (360 + angle) % 360, 315) );
      val( (angle - 45) / 270);
    };
    var knob_mouseupHandler = function(event) {
      $(document).off('mousemove', knob_mousemoveHandler).
        off('mouseup', knob_mouseupHandler);
    };
    var val = function(val) {
      if (arguments.length == 0) {
        return model.val;
      } else if (arguments.length == 1) {
        if (model.val != val) {
          model.val = val;
          model.valid = false;
          $knob.attr('transform',
            'translate(' + size / 2 + ',' + size / 2 +
            ') rotate(' + (45 + 270 * val) + ')');
          $comp.trigger('change');
        }
      } else {
        throw 'illegal arguments';
      }
    };
    if (spec.type == 'liner') {
      var outputCache = 0;
      $comp.data('output', function(output) {
        if (arguments.length == 0) {
          if (!model.valid) {
            outputCache = spec.min + (spec.max - spec.min) * val();
            model.valid = true;
          }
          return outputCache;
        } else if (arguments.length == 1) {
          val( (output - spec.min) / (spec.max - spec.min) );
        } else {
          throw 'illegal arguments';
        }
      } );
    } else if (spec.type == 'log') {
      var outputCache = 0;
      var lmin = Math.log(spec.min);
      var lmax = Math.log(spec.max);
      $comp.data('output', function(output) {
        if (arguments.length == 0) {
          if (!model.valid) {
            outputCache = Math.exp(lmin + (lmax - lmin) * val() );
            model.valid = true;
          }
          return outputCache;
        } else if (arguments.length == 1) {
          val( (Math.log(output) - lmin) / (lmax - lmin) );
        } else {
          throw 'illegal arguments';
        }
      } );
    }
    val(0);
    return $knob;
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
    $comp.data('output', function(output) {
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
    } );
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
        attr({ x : 0, y : 0, width : w, height : h, rx : 4, ry : 4 }) ).
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

  //-------------------------------------------------------

  var createSample = function(sampleDef) {
    var ui = {};
    var $ui = $('<div></div>').css('margin-bottom', '8px');
    $ui.append($('<div></div>').text(sampleDef.label) );
    $.each(sampleDef.ui || [], function(i, comp) {
      ui[comp.id] = createComponent(comp);
      var output = (sampleDef.settings || {})[comp.id];
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
          $.each(sampleDef.ui || [], function(i, comp) {
            settings[comp.id] = ui[comp.id].data('output')();
          });
          var $tmp = $('<textarea></textarea>').
            val(JSON.stringify(settings, null, 2) );
          $('BODY').append($tmp);
          $tmp.select();
          document.execCommand('copy');
          $tmp.remove();
        }) );
    sampleDef.init(ui);
    $ui.on('change', function(event) {
      var $target = $(event.target);
      console.log('change - ' +
          $target.attr('id') + ' => ' +
          $target.data('output')() );
    });
    return $ui;
  }

  return {
    createSample : createSample
  };
}();


'use strict';

Vue.component('SynVariable', {
  template : '<span :style="bodyStyle">' +
      '<span :style="knobStyle" @mousedown.prevent="mousedownHandler"></span>' +
    '</span>',
  props : {
    type : { default : function() { return 'liner'; } },
    value : { default : function() { return 0; } },
    range : { default : function() { return [0, 100]; } },
  },
  methods : {
    mousedownHandler : function(event) {
      var mousemoveHandler = function(event) {
        // calc value and emit.
        this.left = Math.max(0, Math.min(
            dragPoint.left + event.pageX - dragPoint.x,
            this.width - this.height) );
        var range = this.range;
        var ratio = this.left / (this.width - this.height);
        var value;
        if (this.type == 'log') {
          value = Math.exp( (Math.log(range[1]) - Math.log(range[0]) ) *
              ratio + Math.log(range[0]) );
        } else {
          value = (range[1] - range[0]) * ratio + range[0];
        }
        var s = value < 0? -1 : 1;
        value = s * function(v){
          if (v === 0) {
            return 0;
          }
          var l = Math.log(v) / Math.log(10);
          var p = Math.floor(4 - l);
          return Math.round(Math.exp(
              (l + p) * Math.log(10) ) ) + 'E' + -p;
        }(value * s);

        this.$emit('input', value);

      }.bind(this);
      var mouseupHandler = function(event) {
        document.removeEventListener('mousemove', mousemoveHandler);
        document.removeEventListener('mouseup', mouseupHandler);
      }.bind(this);
      document.addEventListener('mousemove', mousemoveHandler);
      document.addEventListener('mouseup', mouseupHandler);
      var dragPoint = { x : event.pageX, y : event.pageY, left : this.left };
    }
  },
  computed : {
    bodyStyle : function() {
      return {
        display : 'inline-block', position : 'relative',
        width : this.width + 'px',
        height : this.height + 'px',
        backgroundColor : 'rgba(0,0,0,0.2)'
      };
    },
    knobStyle : function() {
      var range = this.range;
      var ratio;
      if (this.type == 'log') {
        ratio = (Math.log(this.value) - Math.log(range[0]) ) /
            (Math.log(range[1]) - Math.log(range[0]) );
      } else {
        ratio = (this.value - range[0]) / (range[1] - range[0]);
      }
      ratio = Math.max(0, Math.min(ratio, 1) );
      this.left = (this.width - this.height) * ratio;
      return {
        display : 'inline-block', position : 'absolute',
        left : this.left + 'px',
        top : '0px',
        width : this.height + 'px',
        height : this.height + 'px',
        backgroundColor : 'rgba(0,0,0,0.6)'
      };
    }
  },
  data : function() {
    return {
      width : 160,
      height : 16,
      left : 0
    };
  }
});

Vue.component('SynWaveView', {
  template : '<canvas></canvas>',
  props : {
    wave : { type: Function },
    fg : { type: String, default : function() { return 'rgba(255,255,0,1)'; } },
    bg : { type: String, default : function() { return 'rgba(0,0,0,1)'; } }
  },
  watch : {
    wave : function() {
      this.updateView();
    }
  },
  methods : {
    updateView : function() {

      var width = 64;
      var height = 32;

      var wave = this.wave;
      var canvas = this.$el;
      canvas.width = width;
      canvas.height = height;

      var ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = this.bg;
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = this.fg;
      for (var x = 0; x < width; x += 1) {
        wave.freq = function() {
          return 44100 / width * 4; };
        /*
        wave.freq = function() {
          return 44100 / width * 2 * (width + x * 2) / width ; };
        */
        var y = ~~(height / 2 - 0.9 * height / 2 * wave() );
        if (x == 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }
  },
  mounted : function() {
    this.updateView();
  }
});

Vue.component('SynWaveSelector', {
  template : '<div v-if="modules">' +
      '<syn-wave-view :wave="modules[value]?' +
        'modules[value]() : function() { return 0; }"></syn-wave-view>' +
      '<br/>' +
      '<select :value="value" @input="inputHandler">' +
        '<option v-for="wave in waves" :value="wave">{{wave}}</option>' +
      '</select>' +
    '</div>',
  props : {
    waves : { type : Array, default : function () {
      return [ '', 'sine', 'square', 'saw', 'triangle', 'noise' ];
    } },
    value : { type : String }
  },
  data : function() {
    return {
      modules : synthkit.modules()
    };
  },
  methods : {
    inputHandler : function(event) {
      this.$emit('input', event.target.value);
    }
  }
});

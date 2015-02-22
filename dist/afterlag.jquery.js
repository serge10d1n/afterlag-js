(function() {
  var Afterlag, AfterlagHelper;

  AfterlagHelper = (function() {
    function AfterlagHelper() {}

    AfterlagHelper.merge_options = function(first_object, second_object) {
      var key, result_object;
      result_object = {};
      for (key in first_object) {
        result_object[key] = first_object[key];
      }
      for (key in second_object) {
        result_object[key] = second_object[key];
      }
      return result_object;
    };

    return AfterlagHelper;

  })();

  Afterlag = (function() {
    Afterlag.defaults = {
      delay: 100,
      frequency: 30,
      iterations: 3,
      duration: null,
      scatter: 5,
      min_delta: null,
      max_delta: null,
      max: null
    };

    function Afterlag(options) {
      var self;
      if (options == null) {
        options = {};
      }
      this._set_options(options);
      this._callbacks = [];
      self = this;
      this.ready = false;
      this.status = 'processing';
      if (this.options.max > 0) {
        this._timeout_process = setTimeout(function() {
          return self._finish('timeout');
        }, this.options.max);
      }
      this._time_started = new Date().getTime();
      this._last_checked = this._time_started;
      this._success_iterations = 0;
      this._preprocess = setTimeout(function() {
        return self._process = setInterval(function() {
          var delta, now;
          now = new Date().getTime();
          delta = now - self._last_checked - self.options.frequency;
          if ((self.options.min_delta < delta && delta < self.options.max_delta)) {
            self._success_iterations++;
            if (self._success_iterations >= self.options.iterations) {
              self._finish('success');
            }
          } else {
            self._success_iterations = 0;
          }
          return self._last_checked = now;
        }, self.options.frequency);
      }, this.options.delay);
    }

    Afterlag.prototype._set_options = function(options) {
      this.options = AfterlagHelper.merge_options(this.constructor.defaults, options);
      if (this.options.frequency != null) {
        this.options.frequency = parseInt(this.options.frequency);
      }
      if (this.options.iterations != null) {
        this.options.iterations = parseInt(this.options.iterations);
      }
      if (this.options.scatter != null) {
        this.options.scatter = parseInt(this.options.scatter);
      }
      if (this.options.min_delta != null) {
        this.options.min_delta = parseInt(this.options.min_delta);
      }
      if (this.options.max_delta != null) {
        this.options.max_delta = parseInt(this.options.max_delta);
      }
      if (this.options.max != null) {
        this.options.max = parseInt(this.options.max);
      }
      if (this.options.duration != null) {
        this.options.duration = parseInt(this.options.duration);
        this.options.iterations = Math.ceil(this.options.duration / this.options.frequency);
      }
      if (this.options.min_delta == null) {
        this.options.min_delta = -this.options.scatter;
      }
      if (this.options.max_delta == null) {
        return this.options.max_delta = this.options.scatter;
      }
    };

    Afterlag.prototype.info = function() {
      var now, time_passed;
      if (this.time_passed != null) {
        time_passed = this.time_passed;
      } else {
        now = new Date().getTime();
        time_passed = now - this._time_started;
      }
      return {
        status: this.status,
        time_passed: time_passed,
        ready: this.ready,
        options: this.options
      };
    };

    Afterlag.prototype._finish = function(status) {
      var callback, i, len, now, ref, results;
      if (this._preprocess != null) {
        clearTimeout(this._preprocess);
      }
      if (this._process != null) {
        clearInterval(this._process);
      }
      if (this._timeout_process != null) {
        clearTimeout(this._timeout_process);
      }
      this.ready = true;
      this.status = status;
      now = new Date().getTime();
      this.time_passed = now - this._time_started;
      ref = this._callbacks;
      results = [];
      for (i = 0, len = ref.length; i < len; i++) {
        callback = ref[i];
        results.push(callback.fn.call(callback.self, this.info()));
      }
      return results;
    };

    Afterlag.prototype["do"] = function(self, fn) {
      if (fn == null) {
        fn = null;
      }
      if (fn == null) {
        fn = self;
        self = this;
      }
      if (this.ready) {
        fn.call(self, this.info());
      } else {
        this._callbacks.push({
          fn: fn,
          self: self
        });
      }
      return this;
    };

    return Afterlag;

  })();

  window.Afterlag = Afterlag;

  (function($) {
    var last_afterlag;
    last_afterlag = null;
    $.afterlag = function(options) {
      if (options == null) {
        options = {};
      }
      last_afterlag = new Afterlag(options);
      return last_afterlag;
    };
    return $.fn.afterlag = function(options, callback) {
      var afterlag;
      if (options == null) {
        options = {};
        afterlag = last_afterlag != null ? last_afterlag : $.afterlag();
      } else if (callback == null) {
        if (typeof options === 'function') {
          callback = options;
          options = {};
          afterlag = last_afterlag != null ? last_afterlag : $.afterlag();
        }
      } else {
        if (options === true) {
          afterlag = $.afterlag();
        } else if (options instanceof Afterlag) {
          afterlag = options;
        } else {
          afterlag = $.afterlag(options);
        }
      }
      return this.each(function() {
        var $element, self;
        $element = $(this);
        $element.data('afterlag', afterlag);
        self = this;
        return afterlag["do"](function(info) {
          if (callback != null) {
            callback.call(self, info);
          }
          return $element.trigger('afterlag', [info]);
        });
      });
    };
  })(jQuery);

}).call(this);

'use strict';
(function ($) {
  var pluginName = 'inputEditable',
    defaults = {
      // You can customize the way to set and get the input value.
      // This is usefull when the input value is handled by another jQuery plugin.
      // Tis is actually the case for the `phone` field which is using the plugin `jQuery.fn.intlTelInput`
      setInputVal: function (value) {
        $(this).val(value);
      },
      getInputVal: function () {
        return $(this).val();
      },

      // Prevent submit when the input value is bad.
      validate: function (/*value*/) {
        return true;
      },

      // The function that handle the Ajax call (it's like a promise).
      // You must call either the `resolve` or `reject` function (depending on the server response).
      submit: function (value, resolve/*, reject*/) {
        resolve();
      },

      btn: {
        edit: 'Edit',
        submit: 'Submit',
        cancel: 'Cancel'
      },

      required: false,

      placeholder: '',

      // When the plugin is in view-mode (not edit-mode),
      // the tip is a simple text which is displayed after the text value.
      tip: ''
    };

  function Plugin(element, options) {
    this.$element = $(element);
    this.isEdited = false;

    this.initOptions(options);
    this.initMarkup();
    this.setEvents();
  }

  Plugin.prototype = {
    initOptions: function (options) {
      this.options = $.extend({}, defaults, options || {});

      this.options.placeholder = this.$element.data('placeholder') || this.options.placeholder;
      this.options.tip = this.$element.data('tip') || this.options.tip;

      if (typeof this.$element.data('required') !== 'undefined') {
        this.options.required = true;
      }
    },

    /*
      The initial markup is simply:
      -----------------------------
      <article data-placeholder="" data-required="" data-tip="">
        [VALUE]
      </article>

      The generated markup is:
      ------------------------
      <article data-placeholder="" data-required="" data-tip="">
        <div class="inputEditable-text">
          <a href="#" class="inputEditable-btn inputEditable-edit">
            Edit
            <span>[VALUE]</span>
          </a>
        </div>
        <div class="inputEditable-input">
          <input value="[VALUE]">
          <a href="#" class="inputEditable-btn inputEditable-submit">Submit</a>
          <a href="#" class="inputEditable-btn inputEditable-cancel">Cancel</a>
        </div>
      </article>
    */
    initMarkup: function () {
      this.initialText = (this.$element.text()).trim();
      this.$element.html('').addClass(this.getCss());

      this.$textWrap = $('<div>').addClass(this.getCss('text')).css('display', 'inline-block');
      this.$inputWrap = $('<div>').addClass(this.getCss('input')).css('display', 'none');

      this.fillTextWrap();
      this.fillInputWrap();
    },

    fillTextWrap: function () {
      this.$edit = this.getButton('edit').appendTo(this.$textWrap);
      this.$text = $('<span>' + (this.initialText || this.options.placeholder) + '</span>').appendTo(this.$edit);

      if (this.options.tip) {
        $('<i>').text(this.options.tip).addClass(this.getCss('tip')).appendTo(this.$textWrap);
      }
      this.$element.append(this.$textWrap);
    },

    fillInputWrap: function () {
      this.$input = $('<input />').attr({
        value: this.initialText,
        placeholder: this.options.placeholder,
        required: !!this.options.required
      }).appendTo(this.$inputWrap);
      this.$submit = this.getButton('submit').appendTo(this.$inputWrap);
      this.$cancel = this.getButton('cancel').appendTo(this.$inputWrap);

      this.$element.append(this.$inputWrap);
    },

    setEvents: function () {
      this.$edit.click(function (e) {
        e.preventDefault();
        this.toggleEdit();
        this.dispatch('edit');
      }.bind(this));

      this.$cancel.click(function (e) {
        e.preventDefault();
        if (!this.disableActions) {
          this.options.setInputVal.call(this.$input[0], this.oldValue); // Reset the input value
          this.toggleEdit();
          this.dispatch('cancel');
        }
      }.bind(this));

      this.$submit.click(function (e) {
        var newValue = this.getValue();
        e.preventDefault();
        if (!this.disableActions) {
          if (newValue === this.oldValue) {
            // The input value is unmodifed...
            this.$cancel.trigger('click');
          } else if ((!this.options.required && !newValue) || this.options.validate.call(this.$input[0], newValue)) {
            // The input value is modified and validated...
            this.$input.prop('disabled', true);
            this.disableActions = true;
            this.dispatch('post');
            this.options.submit.call(this.$input[0],
              newValue, 
              this.resolveSubmit.bind(this, newValue),
              this.rejectSubmit.bind(this, newValue));
          } else {
            // The input value is modified but with a bad value
            this.dispatch('error', newValue);
          }
        }
      }.bind(this));
    },

    resolveSubmit: function (newValue) {
      this.updateText();
      this.toggleEdit();
      this.disableActions = false;
      this.dispatch('resolve', newValue);
    },

    rejectSubmit: function (newValue) {
      this.$input.prop('disabled', false);
      this.disableActions = false;
      this.dispatch('reject', newValue);
    },

    toggleEdit: function () {
      this.isEdited = !this.isEdited;
      this.$textWrap.css('display', this.isEdited ? 'none' : 'inline-block');
      this.$inputWrap.css('display', this.isEdited ? 'inline-block' : 'none');
      if (this.isEdited) {
        this.$input.prop('disabled', false);
        this.$input.focus();
        this.oldValue = this.getValue(); // Store the oldValue (used on cancel and on submit)
      } else {
        this.oldValue = null;
      }
    },

    // Update the view-mode from the edit-mode (when resolve the Ajax call)
    updateText: function () {
      this.$text.text(this.getValue() || this.options.placeholder || '');
    },

    // Get the view-mode value (but not the placeholder)
    getText: function () {
      var text = this.$text.text();
      return text !== this.options.placeholder ? text : '';
    },

    // Get the edit-mode value
    getValue: function () {
      return this.options.getInputVal.call(this.$input[0]);
    },

    // The plugin dispatch the following events:
    //    `edit.inputEditable`      when click on edit
    //    `cancel.inputEditable`    when click on cancel
    //    `error.inputEditable`     when click on submit and input value in error
    //    `post.inputEditable`      when click on submit and input value validated
    //    `resolve.inputEditable`   when server response ok
    //    `reject.inputEditable`    when server response ko
    dispatch: function (event, data) {
      this.$element.trigger(event + '.' + pluginName, data);
    },

    getButton: function (action) {
      return $('<a href="#"></a>')
        .addClass(this.getCss('btn'))
        .addClass(this.getCss(action))
        .append(this.options.btn[action]);
    },

    getCss: function (suffix) {
      return pluginName + (suffix ? '-' + suffix : '');
    }
  };

  $.fn[pluginName] = function (options) {
    return this.each(function () {
      if (!$.data(this, 'plugin_' + pluginName)) {
        $.data(this, 'plugin_' + pluginName, new Plugin(this, options));
      }
    });
  };

})(jQuery);

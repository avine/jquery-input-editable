/* global jQuery */

(function ($) {
  'use strict';

  var pluginName = 'inputEditable';

  var defaults = {
    // Customize the way to set the input value.
    // (this is usefull when the input element is handled by another jQuery plugin).
    setInputVal: function (value) {
      $(this).val(value);
    },

    // Customize the way to get the input value.
    getInputVal: function () {
      return $(this).val();
    },

    // Validate the input on client-side (before submit).
    validate: function (/* value */) {
      return true;
    },

    // Handle the Ajax call (it's like a promise).
    // (you should call either the `resolve` or `reject` parameter
    // (according to the server response).
    submit: function (value, resolve/* , reject */) {
      resolve();
    },

    // UI buttons (use text or html).
    btn: {
      edit: 'Edit',
      submit: 'Submit',
      cancel: 'Cancel',
    },

    // Is the input field required ?
    required: false,

    // Input placeholder.
    placeholder: '',

    // Input description (displayed after the text value in view-mode).
    description: '',
  };

  // Public methods
  var methods = ['getInstance', 'getText', 'getValue'];

  function InputEditable(element, options) {
    this.$element = $(element);
    this.isEdited = false;

    this.initOptions(options);

    this.initMarkup();

    this.handleEdit();
    this.handleCancel();
    this.handleSubmit();
  }

  InputEditable.prototype = {

    constructor: InputEditable,

    getInstance: function () {
      return this;
    },

    // Set this.options from parameter
    initOptions: function (options) {
      this.options = $.extend({}, defaults, options || {});

      this.checkData('placeholder');
      this.checkData('description');
      if (this.checkData('required')) {
        this.options.required = true;
      }
    },

    // Overwrite this.options with data attributes
    checkData: function (option) {
      var data = this.$element.data(option);
      if (typeof data !== 'undefined') {
        this.options[option] = data;
        return true;
      }
      return false;
    },

    /*
      The initial markup is simply:
      -----------------------------
      <article data-required data-placeholder="" data-description="">
        [VALUE]
      </article>

      The generated markup is:
      ------------------------
      <article data-required data-placeholder="" data-description="">
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
      var text = this.initialText || this.options.placeholder;

      this.$edit = this.getButton('edit').appendTo(this.$textWrap);
      this.$text = $('<span>').text(text).appendTo(this.$edit);

      this.$description = $('<i>');
      if (this.options.description) {
        this.$description
          .text(this.options.description)
          .addClass(this.getCss('description'))
          .appendTo(this.$textWrap);
      }
      this.$element.append(this.$textWrap);
    },

    fillInputWrap: function () {
      this.$input = $('<input />').attr({
        value: this.initialText,
        placeholder: this.options.placeholder,
        required: !!this.options.required,
      }).appendTo(this.$inputWrap);

      this.$submit = this.getButton('submit').appendTo(this.$inputWrap);
      this.$cancel = this.getButton('cancel').appendTo(this.$inputWrap);

      this.$element.append(this.$inputWrap);
    },

    handleEdit: function () {
      this.$edit.click(function (e) {
        e.preventDefault();
        this.toggle();
        this.dispatch('edit');
      }.bind(this));
    },

    handleCancel: function () {
      this.$cancel.click(function (e) {
        e.preventDefault();
        if (!this.disableActions) {
          this.options.setInputVal.call(this.$input[0], this.oldValue); // Reset the input value
          this.toggle();
          this.dispatch('cancel');
        }
      }.bind(this));
    },

    handleSubmit: function () {
      this.$submit.click(function (e) {
        var newValue = this.getValue();
        var isEmpty = !newValue && this.options.required;
        var isInvalid = newValue && !this.options.validate.call(this.$input[0], newValue);
        e.preventDefault();
        if (!this.disableActions) {
          if (newValue === this.oldValue) {
            // The input value is unmodifed...
            this.$cancel.trigger('click');
          } else if (isEmpty || isInvalid) {
            // The input value has error
            this.dispatch('error', newValue);
          } else {
            // The input value is modified and validated...
            this.$input.prop('disabled', true);
            this.disableActions = true;
            this.dispatch('post');
            this.options.submit.call(this.$input[0],
              newValue,
              this.resolve.bind(this, newValue),
              this.reject.bind(this, newValue));
          }
        }
      }.bind(this));
    },

    resolve: function (newValue) {
      this.updateText();
      this.toggle();
      this.disableActions = false;
      this.dispatch('resolve', newValue);
    },

    reject: function (newValue) {
      this.$input.prop('disabled', false);
      this.disableActions = false;
      this.dispatch('reject', newValue);
    },

    // Toggle view-mode and edit-mode
    toggle: function () {
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

    // Get the view-mode value (but not the placeholder)
    getText: function () {
      var text = this.$text.text();
      return text !== this.options.placeholder ? text : '';
    },

    // Update the view-mode from the edit-mode (when resolve the Ajax call)
    updateText: function () {
      this.$text.text(this.getValue() || this.options.placeholder || '');
    },

    // Get the edit-mode value
    getValue: function () {
      return this.options.getInputVal.call(this.$input[0]);
    },

    getButton: function (action) {
      return $('<a href="#"></a>')
        .addClass(this.getCss('btn'))
        .addClass(this.getCss(action))
        .append(this.options.btn[action]);
    },

    getCss: function (suffix) {
      return pluginName + (suffix ? '-' + suffix : '');
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
  };

  $.fn[pluginName] = function () {
    // Plugin constructor options
    var options = $.type(arguments[0]) === 'object' ? arguments[0] : null;

    // Instance method and params
    var method = ~methods.indexOf(arguments[0]) ? arguments[0] : null;
    var params = Array.prototype.slice.call(arguments, 1);

    // Method returns
    var results = [];

    this.each(function () {
      var plugin = $.data(this, 'plugin_' + pluginName);
      if (!plugin) {
        // Instanciate plugin
        plugin = new InputEditable(this, options);
        $.data(this, 'plugin_' + pluginName, plugin);
      }/* else if (options) {
        console.error('Can not refesh plugin instance with new options.');
      } */
      if (method) {
        // Invoke plugin method
        results.push(plugin[method].apply(plugin, params));
      }
    });

    if (method) {
      return results.length === 1 ? results[0] : results;
    }
    return this;
  };
}(jQuery));

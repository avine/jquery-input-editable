/* global jQuery */

(function ($) {
  'use strict';

  var pluginName = 'inputEditable';

  var defaults = {
    // Customize the way to set the input value
    // (this is usefull when the input element is handled by another jQuery plugin).
    set: function (value) {
      $(this).val(value);
    },

    // Customize the way to get the input value.
    get: function () {
      return $(this).val();
    },

    // Custom input validation on client-side (before submit).
    // Return the error message as string if the input value is invalid
    // (otherwise an empty string).
    customValidity: function (/* value */) {
      return '';
    },

    // Handle the Ajax call (it's like a promise).
    // You should invoke either the `resolve` or `reject` parameter
    // (according to the server response).
    submit: function (value, resolve/* , reject */) {
      resolve();
    },

    // UI actions (use text or html).
    action: {
      edit: 'Edit',
      submit: 'Submit',
      cancel: 'Cancel',
    },

    // Input placeholder.
    placeholder: '',

    // Input description (displayed after the text value in view-mode).
    description: '',

    // Native input validation using type attribute (ie: email, number, ...)
    type: false,

    // Native input validation using constraints
    constraints: {
      required: false,
      pattern: false,
      min: false,
      max: false,
      step: false,
      maxlength: false,
    },
  };

  // Public methods
  var methods = ['getInstance', 'getText', 'getValue'];

  function InputEditable(element, options) {
    this.$element = $(element);

    this.initOptions(options);

    this.initMarkup();

    this.editable();
    this.cancelable();
    this.validable();
    this.submittable();

    this.dispatch('init');
  }

  InputEditable.prototype = {

    constructor: InputEditable,

    getInstance: function () {
      return this;
    },

    // Set this.options from parameter
    initOptions: function (options) {
      var constraint;
      var isPresent;

      this.options = $.extend(true, {}, defaults, options || {});

      this.checkData('placeholder', this.options);
      this.checkData('description', this.options);
      this.checkData('type', this.options);

      for (constraint in this.options.constraints) {
        isPresent = this.checkData(constraint, this.options.constraints);
        if (constraint === 'required' && isPresent) {
          this.options.constraints.required = true;
        }
      }
    },

    // Overwrite options parameter with input attributes
    checkData: function (option, container) {
      var data = this.$element.data(option);
      if (typeof data !== 'undefined') {
        container[option] = data;
        return true;
      }
      // The attribute is not present
      return false;
    },

    /*
      Initial markup:
      ---------------
      <form data-required data-type="" data-placeholder="" data-description="">
        [VALUE]
      </form>

      Generated markup:
      -----------------
      <form data-required data-type="" data-placeholder="" data-description="">
        <div class="inputEditable-text">
          <a href="#" class="inputEditable-action inputEditable-edit">
            Edit
            <span>[VALUE]</span>
          </a>
        </div>
        <div class="inputEditable-input">
          <input value="[VALUE]">
          <a href="#" class="inputEditable-action inputEditable-submit">Submit</a>
          <a href="#" class="inputEditable-action inputEditable-cancel">Cancel</a>
        </div>
      </form>
    */
    initMarkup: function () {
      this.initialText = (this.$element.text()).trim();
      this.$element.html('').addClass(this.getCss());

      this.$textWrap = $('<div>').addClass(this.getCss('text'));
      this.$inputWrap = $('<div>').addClass(this.getCss('input'));

      this.editMode(false);

      this.fillTextWrap();
      this.fillInputWrap();
    },

    fillTextWrap: function () {
      var text = this.initialText || this.options.placeholder;

      this.$edit = this.getAction('edit').appendTo(this.$textWrap);
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
      this.$input = $('<input />').attr(this.getInputAttr()).appendTo(this.$inputWrap);

      this.$submit = this.getAction('submit').appendTo(this.$inputWrap);
      this.$cancel = this.getAction('cancel').appendTo(this.$inputWrap);

      this.$element.append(this.$inputWrap);
    },

    getInputAttr: function () {
      var attr = {
        value: this.initialText,
        placeholder: this.options.placeholder,
        type: this.options.type || 'text',
      };
      var constraint;
      var value;
      for (constraint in this.options.constraints) {
        value = this.options.constraints[constraint];
        if (value !== false) {
          attr[constraint] = value;
        }
      }
      return attr;
    },

    editable: function () {
      this.$edit.click(function (e) {
        e.preventDefault();
        this.toggleMode();
        this.dispatch('edit');
      }.bind(this));
    },

    cancelable: function () {
      this.$cancel.click(function (e) {
        e.preventDefault();
        if (!this.isDisabled) {
          // Reset the input value
          this.options.set.call(this.$input[0], this.oldValue);

          this.toggleMode();
          this.dispatch('cancel');
        }
      }.bind(this));
    },

    validable: function () {
      this.$input.on('input', function (e) { // Note: e.target === this.$input[0]
        var newValue = this.getValue();
        var customError = newValue ? this.options.customValidity.call(e.target, newValue) : '';
        // Remove previous custom error
        e.target.setCustomValidity('');
        // Check native error
        if (e.target.checkValidity() && customError) {
          // Set new custom error
          e.target.setCustomValidity(customError);
          this.$input.trigger('invalid');
        }
        /*// Notice: for 'error', watch the native 'invalid' event...
        if (e.target.validationMessage) {
          this.dispatch('error', { value: newValue, message: e.target.validationMessage });
        }*/
      }.bind(this));
    },

    submittable: function () {
      var preventDefault;
      this.$form = this.$input.closest('form');
      if (this.$form.length) {
        // Prevent default only when the form is dedicated to the plugin
        // (otherwise it should be handled outside of this code).
        preventDefault = this.$form[0] === this.$element[0];
        this.$form.submit(function (e) {
          var newValue = this.getValue();
          if (preventDefault) {
            e.preventDefault();
          }
          if (newValue === this.oldValue) {
            this.$cancel.trigger('click');
          } else if (!this.isDisabled) {
            // The input value is modified and validated...
            this.post(newValue);
          }
        }.bind(this));
      }
    },

    // Process the Ajax call
    post: function (newValue) {
      this.disable(true);
      this.dispatch('post');
      this.options.submit.call(this.$input[0],
        newValue,
        this.resolve.bind(this, newValue),
        this.reject.bind(this, newValue)
      );
    },

    resolve: function (newValue) {
      this.updateText();
      this.toggleMode();
      this.disable(false);
      this.dispatch('resolve', newValue);
    },

    reject: function (newValue) {
      this.disable(false);
      this.dispatch('reject', newValue);
    },

    // Toggle view-mode and edit-mode
    toggleMode: function () {
      this.editMode(!this.isEdited);
      if (this.isEdited) {
        this.$input.focus();
        this.oldValue = this.getValue(); // Store the oldValue (used on cancel and on submit)
      } else {
        this.oldValue = null;
      }
    },

    // Render view-mode or edit-mode
    editMode: function (status) {
      this.$textWrap.css('display', status ? 'none' : 'inline-block');
      this.$inputWrap.css('display', status ? 'inline-block' : 'none');
      this.isEdited = status;
    },

    disable: function (status) {
      this.$input.prop('disabled', status);
      this.$submit.prop('disabled', status);
      this.isDisabled = status;
    },

    // The plugin dispatch the following events:
    //    `init.inputEditable`      when the plugin is instanciated
    //    `edit.inputEditable`      when click on edit
    //    `cancel.inputEditable`    when click on cancel
    //    [DEPRECATED] `error.inputEditable`     when click on submit and input value in error
    //    `post.inputEditable`      when click on submit and input value validated
    //    `resolve.inputEditable`   when server response ok
    //    `reject.inputEditable`    when server response ko
    dispatch: function (event, data) {
      this.$element.trigger(event + '.' + pluginName, data);
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
      return this.options.get.call(this.$input[0]);
    },

    getAction: function (action) {
      return $(action === 'submit' ? '<button>' : '<a href="#"></a>')
        .addClass(this.getCss('action'))
        .addClass(this.getCss(action))
        .append(this.options.action[action]);
    },

    getCss: function (suffix) {
      return pluginName + (suffix ? '-' + suffix : '');
    },
  };

  // Expose jQuery plugin
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

  // Expose the class definition
  $.fn[pluginName].definition = InputEditable;
}(jQuery));

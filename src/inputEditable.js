/* global jQuery */

(function ($) {
  'use strict';

  var pluginName = 'inputEditable';

  var settings = {
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

    // Handle the Ajax request (it's like a promise).
    // You should invoke either the `resolve` or `reject` parameter
    // (according to the server response).
    submit: function (value, resolve/* , reject */) {
      resolve();
    },

    // UI actions (use text or html).
    action: {
      edit: 'Edit',
      cancel: 'Cancel',
      submit: 'Submit',
    },

    // Position of the 'edit' and 'cancel' links
    // (note that the 'submit' button is always at the right).
    toggleAtRight: false,

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

    this.ready();
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

      this.options = $.extend(true, {}, settings, options || {});

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
      <form data-description="[DESC]">
        [VALUE]
      </form>

      Generated markup:
      -----------------
      <form data-description="[DESC]">
        <div class="inputEditable-text-wrap">
          <a href="#" class="inputEditable-edit">Edit</a>
          <span class="inputEditable-text">[VALUE]</span>
          <i class="inputEditable-description">[DESC]</i>
        </div>
        <div class="inputEditable-input-wrap">
          <a href="#" class="inputEditable-cancel">Cancel</a>
          <input value="[VALUE]" class="inputEditable-input">
          <a href="#" class="inputEditable-submit">Submit</a>
        </div>
      </form>
    */
    initMarkup: function () {
      this.initialText = (this.$element.text()).trim();
      this.$element.html('').addClass(this.getCss());

      this.$textWrap = $('<div>').addClass(this.getCss('text-wrap'));
      this.$inputWrap = $('<div>').addClass(this.getCss('input-wrap'));

      this.editMode(false);

      this.fillTextWrap();
      this.fillInputWrap();
    },

    fillTextWrap: function () {
      var text = this.initialText || this.options.placeholder;
      var insert = this.options.toggleAtRight ? 'prependTo' : 'appendTo';

      this.$edit = this.getAction('edit').appendTo(this.$textWrap);
      this.$text = $('<span>').addClass(this.getCss('text')).text(text)[insert](this.$textWrap);

      this.$description = $('<i>').addClass(this.getCss('description'));
      if (this.options.description) {
        this.$description.text(this.options.description).appendTo(this.$textWrap);
      }
      this.$element.append(this.$textWrap);
    },

    fillInputWrap: function () {
      var insert = this.options.toggleAtRight ? 'appendTo' : 'prependTo';

      this.$input = $('<input />')
        .addClass(this.getCss('input'))
        .attr(this.getInputAttr())
        .appendTo(this.$inputWrap);

      this.$submit = this.getAction('submit').appendTo(this.$inputWrap);
      this.$cancel = this.getAction('cancel')[insert](this.$inputWrap);

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
      this.$edit.add(this.$text).click(function (e) {
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
        // Store the validation status
        // (usefull when `this.$form[0].noValidate === true` to prevent the .request() whatever).
        this.isInvalid = !!e.target.validationMessage;
        // Dispatch a special event 'invalid.inputEditable'.
        // But you can simply listen the native event 'invalid' (unless you are using the shim).
        if (e.target.validationMessage) {
          this.dispatch('invalid', { value: newValue, message: e.target.validationMessage });
        }
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
          } else if (!this.isInvalid) {
            // The input value is modified and validated...
            this.request(newValue);
          }
        }.bind(this));
      }
    },

    ready: function () {
      this.dispatch('ready');

      // If the initial input value is valid against native error 
      // but is invalid against custom error, then the css `:invalid` is
      // not applied until the user writes something and fires the `input`event.
      // To fix this issue, we need to eventually trigger the `input`event manually.
      if (this.options.customValidity.call(this.$input[0], this.getValue())) {
        this.$input.trigger('input');
      }
    },

    // Process the server request
    request: function (newValue) {
      this.disable(true);
      this.dispatch('request');
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
    //    `ready.inputEditable`     when the plugin is ready to use
    //    `edit.inputEditable`      when click on edit
    //    `cancel.inputEditable`    when click on cancel
    //    `invalid.inputEditable`   when click on submit with bad input value
    //    `request.inputEditable`   when click on submit with good input value
    //    `resolve.inputEditable`   when server responds ok
    //    `reject.inputEditable`    when server responds ko
    dispatch: function (event, data) {
      this.$element.trigger(event + '.' + pluginName, data);
    },

    // Update the view-mode from the edit-mode (when resolve the Ajax request)
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
        console.warn('Can not refesh plugin instance with new options.');
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

  // Expose plugin features
  $.fn[pluginName].definition = InputEditable;
  $.fn[pluginName].settings = settings;
  $.fn[pluginName].methods = methods;

}(jQuery));

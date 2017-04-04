/* global jQuery */

(function ($) {
  'use strict';

  var plugin = $.fn.inputEditable;
  var InputEditable = (plugin || {}).definition;
  var willNotValidate = typeof document.createElement('input').willValidate === 'undefined';

  if (plugin) {
    // Define a callable shim (usefull for testing)
    plugin.shim = function () {

      plugin.shimEnabled = true;

      $.extend(InputEditable.prototype, {
        validable: function () {
          this.$input.on('input', function () {
            var newValue = this.getValue();
            var isEmpty = !newValue && this.options.constraints.required;
            var customError = '';
            if (newValue) {
              customError = this.options.customValidity.call(this.$input[0], newValue);
            }
            if (isEmpty || customError) {
              // FIXME: il manque le message pour un champ vide...
              this.dispatch('error', { value: newValue, message: customError });
              this.isInvalid = true;
            } else {
              this.isInvalid = false;
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
              } else if (!this.isInvalid && !this.isDisabled) {
                // The input value is modified and validated...
                this.post(newValue);
              }
            }.bind(this));
          }
        },
      });
    };

    // Apply shim
    if (willNotValidate) {
      plugin.shim();
    }
  }
}(jQuery));

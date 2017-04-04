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

      $.extend(plugin.settings, {
        shim: {

        },
      });

      InputEditable.prototype.validable = function () {
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
      };
    };

    // Apply shim
    if (willNotValidate) {
      plugin.shim();
    }
  }
}(jQuery));

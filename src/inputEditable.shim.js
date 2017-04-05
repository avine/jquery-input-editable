/* global jQuery */

(function ($) {
  'use strict';

  var plugin = $.fn.inputEditable;
  var InputEditable = (plugin || {}).definition;
  var willNotValidate = typeof document.createElement('input').willValidate === 'undefined';

  if (plugin) {
    // Define a callable shim (usefull for testing)
    plugin.shim = function () {
      // Indicate that the shim is enabled.      
      plugin.shimEnabled = true;

      // Rewrite the method just for old browser compatibility...
      // This simplified version only checks `this.options.customValidity`.
      InputEditable.prototype.validable = function () {
        this.$input.on('input', function (e) { // Note: e.target === this.$input[0]
          var newValue = this.getValue();
          var customError = newValue ? this.options.customValidity.call(e.target, newValue) : '';
          if (customError) {
            this.isInvalid = true;
            this.dispatch('invalid', { value: newValue, message: customError });
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

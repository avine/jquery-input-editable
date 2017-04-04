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
      InputEditable.prototype.validable = function () {

        this.$input.on('input', function () {
          var newValue = this.getValue();
          var isEmpty = !newValue && this.options.constraints.required;
          var customError = newValue ? 
            this.options.customValidity.call(this.$input[0], newValue) : '';
          if (isEmpty || customError) {
            // FIXME: il manque le message pour un champ vide...
            this.dispatch('error', { value: newValue, message: customError });
            //return false;
          }
          //return true;
        }.bind(this));

        /*// Handle form submit
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
            if (!this.disableActions && validate()) {
              // The input value is modified and validated...
              this.post(newValue);
            }
          }.bind(this));
        }*/

        /*
        this.$form = this.$input.closest('form');
        if (this.options.type && this.$form.length) {

          // TODO: improve this using: .noValidate=true and .checkValidity()
          // and perhaps .setCustomValidity() to add :invalid css pseudo-class...
          // (§ https://www.sitepoint.com/html5-forms-javascript-constraint-validation-api/)

          // Use browser input validation (custom validation is bypassed)
          this.$form.submit(function (e) {
            e.preventDefault();
            var newValue = this.getValue();
            if (!this.disableActions) {
              // The input value is modified and validated...
              this.post(newValue);
            }
          }.bind(this));
        } else {
          // Use custom validation
          this.$submit.click(function (e) {
            var newValue = this.getValue();
            var isEmpty = !newValue && this.options.required;
            var isInvalid = newValue && !this.options.customValidity.call(this.$input[0], newValue);
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
                this.post(newValue);
              }
            }
          }.bind(this));
        }
        */

      };
    };
    // Apply shim
    if (willNotValidate) {
      plugin.shim();
    }
  }
}(jQuery));

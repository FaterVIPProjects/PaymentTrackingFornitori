sap.ui.define([], function() {
	"use strict";

	return {

		totalFormatter: function(invoices) {
			if (!invoices) {
				return "";
			}
			var total = 0;
			var change = [];
			var countCurrency = 0;
			var subtotal = {};
			var sInternalType = "string";
			var amount1 = new sap.ui.model.type.Currency({
				showMeasure: false
			});

			for (var i = 0; invoices[i]; i++) {

				// Se è una nuova divisa la traccio 
				if (!(invoices[i].currency in subtotal)) {
					subtotal[invoices[i].currency] = 0;
					countCurrency++;
				}

				if (invoices[i].amount.substr(invoices[i].amount.length - 1) === "-") {
					var amount = invoices[i].amount.substr(0, invoices[i].amount.length - 1);
					total -= parseFloat(amount, 10);
				} else {
					total += parseFloat(invoices[i].amount, 10);
				}
			}

			change.push(total);
			change.push("EUR");

			if (countCurrency > 1) //Totale nascosto se ci sono più divise
				return "";
			else
				return this.getTranslation("total") + ": " + amount1.formatValue(change, sInternalType);
		},

		totalFooterFormatter: function(invoices) {
			if (!invoices) {
				return "";
			}
			var total = 0;
			var change = [];
			var sInternalType = "string";
			var amount1 = new sap.ui.model.type.Currency({
				showMeasure: false
			});

			for (var i = 0; invoices[i]; i++) {
				if (invoices[i].amount.substr(invoices[i].amount.length - 1) === "-") {
					var amount = invoices[i].amount.substr(0, invoices[i].amount.length - 1);
					total -= parseFloat(amount, 10);
				} else {
					total += parseFloat(invoices[i].amount, 10);
				}
			}

			change.push(total);
			change.push("EUR");
			return amount1.formatValue(change, sInternalType);
		},

		totalColorFooterFormatter: function(invoices) {
			if (!invoices) {
				return "";
			}
			var total = 0;

			for (var i = 0; invoices[i]; i++) {
				if (invoices[i].amount.substr(invoices[i].amount.length - 1) === "-") {
					var amount = invoices[i].amount.substr(0, invoices[i].amount.length - 1);
					total -= parseFloat(amount, 10);
				} else {
					total += parseFloat(invoices[i].amount, 10);
				}
			}

			if (total > 0) {
				return "Success";
			} else {
				return "Error";
			}
		},

		numberStateFormatter: function(invoices) {
			if (!invoices) {
				return "Success";
			}
			var total = 0;

			for (var i = 0; invoices[i]; i++) {
				if (invoices[i].amount.substr(invoices[i].amount.length - 1) === "-") {
					var amount = invoices[i].amount.substr(0, invoices[i].amount.length - 1);
					total -= parseFloat(amount, 10);
				} else {
					total += parseFloat(invoices[i].amount, 10);
				}
			}

			if (total > 0) {
				return "Success";
			} else {
				return "Error";
			}
		},

		discountFormatter: function(discount) {
			try {
				if (!discount) {
					return "";
				}

				discount = parseFloat(discount, 10);
				if (discount === 0) {
					return "";
				}

				var change = [];
				var sInternalType = "string";
				var amount1 = new sap.ui.model.type.Currency({
					showMeasure: false
				});

				change.push(discount);
				change.push("EUR");
				return amount1.formatValue(change, sInternalType);
			} catch (e) {
				return "";
			}
		},

		unitVisible: function(discount) {
			try {
				if (!discount) {
					return "";
				}

				discount = parseFloat(discount, 10);
				if (discount === 0) {
					return "";
				}

				return this.getView().getModel("tempModel").getProperty("/CurrentLineCurrency");
			} catch (e) {
				return "";
			}
		},

		unitDiscountVisible: function(lines, currency) {
			try {
				if (!lines) {
					return "";
				}
				for (var i = 0; lines[i]; i++) {
					if (parseFloat(lines[i].docDiscount, 10) !== 0) {
						return currency;
					}
				}
			} catch (e) {
				return "";
			}
		},

		totalDiscount: function(lines) {
			if (!lines) {
				return "";
			}
			var total = 0;
			var change = [];
			var sInternalType = "string";
			var amount1 = new sap.ui.model.type.Currency({
				showMeasure: false
			});

			for (var i = 0; lines[i]; i++) {
				total += parseFloat(lines[i].docDiscount, 10);
			}

			change.push(total);
			change.push("EUR");
			if (total > 0) {
				return amount1.formatValue(change, sInternalType);
			} else {
				return "";
			}
		},

		totalRifA: function(lines) {
			if (!lines) {
				return "";
			}
			var total = 0;
			var change = [];
			var sInternalType = "string";
			var amount1 = new sap.ui.model.type.Currency({
				showMeasure: false
			});

			for (var i = 0; lines[i]; i++) {
				total += parseFloat(lines[i].docQuotaRifA, 10);
			}

			change.push(total);
			change.push("EUR");
			return amount1.formatValue(change, sInternalType);
		},

		totalGrossAmount: function(lines) {
			if (!lines) {
				return "";
			}
			var total = 0;
			var change = [];
			var sInternalType = "string";
			var amount1 = new sap.ui.model.type.Currency({
				showMeasure: false
			});

			for (var i = 0; lines[i]; i++) {
				//var value = parseFloat(lines[i].docGrossAmount, 10);
				//total += value;

				if (lines[i].docGrossAmount.substr(lines[i].docGrossAmount.length - 1) === "-") {
					var amount = lines[i].docGrossAmount.substr(0, lines[i].docGrossAmount.length - 1);
					total -= parseFloat(amount, 10);
				} else {
					total += parseFloat(lines[i].docGrossAmount, 10);
				}
			}

			change.push(total);
			change.push("EUR");
			return amount1.formatValue(change, sInternalType);
		},

		amountFormatter: function(amount) {
			var change = [];
			var sInternalType = "string";
			var amount1 = new sap.ui.model.type.Currency({
				showMeasure: false
			});
			if (amount.substr(amount.length - 1) === "-") {
				amount = "-" + amount.substr(0, amount.length - 1);
			}
			change.push(amount);
			change.push("EUR");
			return amount1.formatValue(change, sInternalType);
		},

		statusFormatter: function(status) {
			switch (status) {
				case "REGIS":
					//						return this.getTranslation("registered");
					return this.getTranslation("inProcess");

				case "PRERE":
					//						return this.getTranslation("preRegistered");
					return this.getTranslation("inProcess");

				default:
					return this.getTranslation("inProcess");
					//						return "";
			}
		},

		dateFormatter: function(date) {
			if (parseInt(date, 10) !== 0) {
				var sInternalType = "string";
				var formattedDate = new sap.ui.model.type.Date();
				return formattedDate.formatValue(date, sInternalType);
			} else {
				return "";
			}

		},

		getResourceBundle: function() {
			return this.getOwnerComponent().getModel("i18n").getResourceBundle();
		},

		/**
		 * Get the translation for sKey
		 * @public
		 * @param {string} sKey the translation key
		 * @param {array} aParameters translation paramets (can be null)
		 * @returns {string} The translation of sKey
		 */
		getTranslation: function(sKey, aParameters) {
			if (aParameters === undefined || aParameters === null) {
				return this.getResourceBundle().getText(sKey);
			} else {
				return this.getResourceBundle().getText(sKey, aParameters);
			}
		}
	};
});
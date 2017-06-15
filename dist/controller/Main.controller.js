sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"org/fater/paymenttrackingsupplier/util/formatter",
	"org/fater/paymenttrackingsupplier/util/utils",
	'sap/ui/model/Filter',
	"sap/ui/model/Sorter",
	'sap/ui/core/Fragment',
	'sap/m/MessageBox'
], function(Controller, formatter, utils, Filter, Sorter, Fragment, MessageBox) {
	"use strict";

	return Controller.extend("org.fater.paymenttrackingsupplier.controller.Main", {

		formatter: formatter,

		onInit: function() {
			this._arrayFilterWidth = ["23%", "15%", "35%", "12%", "12%", "15%", "20%"];
			var filterBar = this.getView().byId("supplierFilterBar");
			var content = filterBar.getContent()[1];
			for (var i = 0; content.getContent()[i]; i++) {
				content.getContent()[i].setProperty("width", this._arrayFilterWidth[i]);
			}
		},

		onAfterRendering: function() {
			var oView = this.getView();
			var oModel = oView.getModel();
			var oTempModel = oView.getModel("tempModel");
			var associatedSupplier = [];
			//var supplierName = "FOR_0000852";
			var supplierName = "FOR_0001543";
			try {
				var userShell = sap.ushell.Container.getService("UserInfo").getUser();
				supplierName = userShell.getId().toUpperCase();
			} catch (err) {}

			var aFilters = [new Filter(
				"UserPortal",
				sap.ui.model.FilterOperator.EQ,
				supplierName
			)];
			oView.setBusy(true);
			var sPath = "/SupplierSet";
			var mParameters = {
				filters: aFilters,
				success: function(oDataSupplier) {

					var Supplier = oDataSupplier.results[0];
					var formattedSupplier = {};
					formattedSupplier.supplierName = Supplier.Name1;
					formattedSupplier.paymentConditions = Supplier.PaymentCondition;
					if (Supplier.Lifnr.length > 0) {
						formattedSupplier.Lifnr = Supplier.Lifnr;
					}

					formattedSupplier.supplierId = Supplier.SupplierId;
					formattedSupplier.Invoices = [];
					formattedSupplier.visible = false;
					associatedSupplier.push(formattedSupplier);

					//Retrieve Parent Supplier an push on Associated Supplier
					aFilters = [new Filter(
						"SupplierId",
						sap.ui.model.FilterOperator.EQ,
						formattedSupplier.supplierId
						//formattedSupplier.Lifnr
					)];

					//Retrieve Child Suppliers
					sPath = "/SupplierAssociatedSet";
					mParameters = {
						filters: aFilters,
						urlParameters: {
							"$expand": "Supplier"
						},
						success: function(oData) {

							for (var i = 0; oData.results[i]; i++) {
								Supplier = oData.results[i].Supplier;
								formattedSupplier = {};
								formattedSupplier.supplierName = Supplier.Name1;
								formattedSupplier.supplierId = Supplier.Lifnr;
								formattedSupplier.paymentConditions = Supplier.PaymentCondition;
								formattedSupplier.Invoices = [];
								formattedSupplier.visible = false;
								associatedSupplier.push(formattedSupplier);
							}
							oTempModel.setProperty(
								"/AssociatedSuppliers",
								associatedSupplier
							);

							oModel.setProperty(
								"/filters/suppliers",
								associatedSupplier
							);
							oView.setBusy(false);
						},
						error: function(oError) {
							jQuery.sap.log.info("Odata Error occured");
							oView.setBusy(false);
						}
					};
					oView.setBusy(true);
					oView.getModel("oDataModel").read(sPath, mParameters);

				},
				error: function(oError) {
					jQuery.sap.log.info("Odata Error occured");
					oView.setBusy(false);
				}
			};
			oView.setBusy(true);
			oView.getModel("oDataModel").read(sPath, mParameters);

		},

		handleFilterDialogClosed: function(oEvent) {
			var filterBar = this.getView().byId("supplierFilterBar");
			var content = filterBar.getContent()[1];
			var indexContent = 0;
			for (var i = 0; filterBar.getAllFilterItems()[i] && content.getContent()[indexContent]; i++) {
				if (filterBar.getAllFilterItems()[i].getVisibleInFilterBar()) {
					content.getContent()[indexContent].setProperty("width", this._arrayFilterWidth[i + 1]);
					indexContent++;
				}
			}
		},

		_handleSuggest: function(oEvent) {
			// FIX AS: Quando scrivo un testo, lo devo salvare nella ricerca eventuale in popup
			var sTerm = oEvent.getParameter("suggestValue");
			if (sTerm)
				this._supplierSearch = sTerm;
			if (sTerm.length >= 3) {
				/*
				var aFilters = []; 
				aFilters.push(new Filter("supplierName", sap.ui.model.FilterOperator.Contains, sTerm)); 					
				oEvent.getSource().getBinding("suggestionItems").filter(aFilters);
				*/

				// FIX AS: Gestione del doppio filtro Ragione Sociale | ID Fornitore.
				// NOTA: Il filtro in OR non funziona, in quanto stiamo filtrando non su più colonne, ma su più
				// valori dello stesso campo. Per questo motivo, dato un pattern di ricerca, bisogna capire se
				// sto inserendo una Ragione Sociale (Pattern alfanumerico) o un ID (Solo cifre)
				var aFilters = [];
				var filter1;
				if (!isNaN(this._supplierSearch)) {
					filter1 = new Filter("supplierId", sap.ui.model.FilterOperator.Contains, this._supplierSearch);
					aFilters = new sap.ui.model.Filter({
						filters: [filter1],
						or: true
					});
				} else {
					filter1 = new Filter("supplierName", sap.ui.model.FilterOperator.Contains, this._supplierSearch);
					aFilters = new sap.ui.model.Filter([filter1]);
				}

				oEvent.getSource().getBinding("suggestionItems").filter(aFilters, sap.ui.model.FilterType.Application);
				var cocdInput = this.getView().byId("supplierFilterInput");
				cocdInput.setShowSuggestion(true);
				cocdInput.setFilterSuggests(false);
				cocdInput.removeAllSuggestionItems();
			} else {
				return null;
			}

		},

		// AS - FIX bug #SUGGESTION SELECTED / REMOVED
		handleSuggestionSelected: function(oEvent) {
			// Retrieve selected items
			var oSupplierInput = this.getView().byId("supplierFilterInput");
			var aSelectedItem = oEvent.getParameter("selectedItem");
			var oModel = this.getView().getModel();

			if (aSelectedItem) {
				var suppliersToken = oModel.getProperty("/filters/suppliers");
				var splittedKey = aSelectedItem.getKey().split("/");
				var supplierId = splittedKey[0];
				var paymentConditions = splittedKey[1];

				for (var i = 0; suppliersToken[i]; i++) {
					if (suppliersToken[i].supplierId === supplierId) {
						var lastIndex = oSupplierInput.getTokens().length - 1;
						oSupplierInput.removeToken(lastIndex);
						var oBundle = this.getResourceBundle();
						MessageBox.error(
							oBundle.getText("alreadySelectedSupplier")
						);
						return;
					}
				}

				// Remove possible valueState Error
				oSupplierInput.setValueState(sap.ui.core.ValueState.None);
				var oSelectedSupplier = {
					"supplierName": aSelectedItem.getText(),
					"supplierId": supplierId,
					"paymentConditions": paymentConditions,
					"visible": false
				};
				suppliersToken.push(oSelectedSupplier);
				// Refresh model so that SAPUI5 refreshes bindings
				oModel.refresh();

			}
		},

		_handleDeleteSupplierToken: function(oEvent) {
			if (oEvent.getParameter("type") === "removed") {
				var oModel = this.getView().getModel();
				var supplierKey = oEvent.getParameter("removedTokens")[0].getKey();
				var splittedKey = supplierKey.split("/");
				var supplierId = splittedKey[0];

				var suppliersToken = oModel.getProperty("/filters/suppliers");
				var index = 0;
				for (var i = 0; suppliersToken[i]; i++) {
					if (suppliersToken[i].supplierId === supplierId)
						index = i;
				}

				var oSupplierInput = this.getView().byId("supplierFilterInput");
				oSupplierInput.removeToken(oEvent.getParameter("token"));

				suppliersToken.splice(index, 1);
				oModel.setProperty("/filters/suppliers", suppliersToken);
				oModel.refresh();
			}
		},

		/**
		 * Manage value help dialog window opening
		 */
		handleSupplierValueHelpPress: function(oEvent) {

			// create value help dialog
			if (!this._valueHelpDialog) {
				this._valueHelpDialog = sap.ui.xmlfragment(
					"org.fater.paymenttrackingsupplier.view.fragment.InputAssistedDialog",
					this
				);
				//Change type toolbar buttons
				var dialog = this._valueHelpDialog._dialog;
				dialog.getButtons()[0].setType("Accept");
				dialog.getButtons()[1].setType("Reject");
				this.getView().addDependent(this._valueHelpDialog);

				// AS - FIX bug #003: Binding elementi spostato nella creazione della popup
				var objListItem = new sap.m.ObjectListItem({
					title: "{oPTModel>supplierName}",
					attributes: [new sap.m.ObjectAttribute({
						title: "{i18n>code}",
						text: "{oPTModel>supplierId}"
					})]
				});

				this._valueHelpDialog.bindAggregation(
					"items",
					"oPTModel>/SupplierSet",
					objListItem
				);
			}

			// AS - FIX bug #003: In caso di input vuoto, sbiancare la ricerca
			var textInput = this.getView().byId("supplierFilterInput");
			var currentValue = textInput.getValue();
			this._supplierSearch = currentValue;
			if (!this._supplierSearch) {
				var filter = new Filter("supplierId", sap.ui.model.FilterOperator.LT, 0);
				var oFilter = new sap.ui.model.Filter({
					filters: [
						filter
					],
					and: false,
					or: true
				});
				this._valueHelpDialog.getBinding("items").filter(oFilter, sap.ui.model.FilterType.Application);
			}

			// open value help dialog filtered by the old search
			if (this._supplierSearch) {
				this._valueHelpDialog.open(this._supplierSearch);
			} else {
				this._valueHelpDialog.open();
			}
		},

		_handleSupplierValueHelpSearch: function(oEvent) {
			// FIX AS: Valorizzo il SupplierSearch solo se non vuoto 
			// (potrebbe provenire dall'input del campo fuori popup
			this._supplierSearch = oEvent.getParameter("value");
			/*	
			var oFilter = new Filter(
				"supplierName",
				sap.ui.model.FilterOperator.Contains, 
				this._supplierSearch
			);
			oEvent.getSource().getBinding("items").filter([oFilter]);				
			*/
			if (this._supplierSearch.length >= 3) {
				var oFilter = [];
				var filter;
				if (!isNaN(this._supplierSearch))
					filter = new Filter("supplierId", sap.ui.model.FilterOperator.Contains, this._supplierSearch);
				else
					filter = new Filter("supplierName", sap.ui.model.FilterOperator.Contains, this._supplierSearch);

				oFilter = new sap.ui.model.Filter({
					filters: [
						filter
					],
					and: false,
					or: true
				});

				oEvent.getSource().getBinding("items").filter(oFilter, sap.ui.model.FilterType.Application);
			}
			// AS - FIX bug #003: In caso di input vuoto, sbiancare la ricerca
			else if (!this._supplierSearch) {
				filter = new Filter("supplierId", sap.ui.model.FilterOperator.LT, 0);
				oFilter = new sap.ui.model.Filter({
					filters: [
						filter
					],
					and: false,
					or: true
				});
				oEvent.getSource().getBinding("items").filter(oFilter, sap.ui.model.FilterType.Application);
			}
		},

		_handleSupplierLiveChangeSearch: function(oEvent) {
			var sValue = oEvent.getParameter("value");
			if (sValue.length < 3) {
				oEvent.getSource().setNoDataText(this.getTranslation("atLeast3CharError"));
			} else {
				oEvent.getSource().setNoDataText("");
			}
		},

		_handleSupplierValueHelpClose: function(oEvent) {

			// Retrieve selected items
			var aSelectedItems = oEvent.getParameter("selectedContexts");
			var oModel = this.getView().getModel();

			if (aSelectedItems && aSelectedItems.length > 0) { //At least one supplier was selected by the user
				var oSupplierInput = this.getView().byId("supplierFilterInput");
				oModel.setProperty("/filters/suppliers", []);

				for (var i in aSelectedItems) {
					/* 
					 * Iterate selected suppliers and add them to the model
					 * (indirect binding will update graphic control's tokens)
					 */
					var oSelectedSupplier = aSelectedItems[i].getObject();
					oSelectedSupplier.visible = false;
					oModel.getProperty("/filters/suppliers").push(oSelectedSupplier);
				}

				// Remove possible valueState Error
				oSupplierInput.setValueState(sap.ui.core.ValueState.None);

			}

			// Refresh model so that SAPUI5 refreshes bindings
			oModel.refresh();

			this._valueHelpDialog.unbindAggregation("items");
		},

		_handleValueHelpSearch: function(oEvent) {
			var sValue = oEvent.getParameter("value");
			var oFilter = new Filter(
				"name",
				sap.ui.model.FilterOperator.Contains,
				sValue
			);
			oEvent.getSource().getBinding("items").filter([oFilter]);
		},

		_handleValueHelpClose: function(oEvent) {

			// Retrieve selected items
			var aSelectedItems = oEvent.getParameter("selectedItems");
			var oModel = this.getView().getModel();

			if (aSelectedItems && aSelectedItems.length > 0) { //At least one supplier was selected by the user

				var oSupplierInput = this.getView().byId(this.inputId);
				oModel.setProperty("/filters/suppliers", []);

				for (var i in aSelectedItems) {
					/* 
					 * Iterate selected suppliers and add them to the model
					 * (indirect binding will update graphic control's tokens)
					 */
					var oSelectedSupplier = aSelectedItems[i].getBindingContext().getObject();
					oModel.getProperty("/filters/suppliers").push(oSelectedSupplier);
				}
				// Remove possible valueState Error
				oSupplierInput.setValueState(sap.ui.core.ValueState.None);
			}

			// Refresh model so that SAPUI5 refreshes bindings
			oModel.refresh();

			// Empty filter
			oEvent.getSource().getBinding("items").filter([]);
		},

		_eraseDatePickerValueStates: function() {
			var oDP1 = this.getView().byId("filterLowerBoundDatePicker"),
				oDP2 = this.getView().byId("filterUpperBoundDatePicker");

			oDP1.setValueState(sap.ui.core.ValueState.None);
			oDP2.setValueState(sap.ui.core.ValueState.None);
		},

		handleDatePickerChange: function(oEvent) {

			var oDP = oEvent.getSource();
			var oSelectedDate = oDP.getDateValue();
			var bValid = oEvent.getParameter("valid");
			var sPath = "/filters/";
			var oModel = this.getView().getModel();
			var oBundle = this._getBundle();

			this._eraseDatePickerValueStates();

			if (bValid) {
				oDP.setValueState(sap.ui.core.ValueState.None);
			} else {
				oDP.setValueState(sap.ui.core.ValueState.Error);
				return;
			}

			if (oDP.getId().toLowerCase().indexOf("lower") !== -1) {
				// check if lower date is greater than upper date
				var oUpperDate = oModel.getProperty("/filters/upperBoundDate");

				if (oUpperDate && (oSelectedDate > oUpperDate)) {
					MessageBox.error(
						oBundle.getText("dateAreNotValidErrorMessage")
					);
					oDP.setValueState(sap.ui.core.ValueState.Error);
				}
				sPath += "lowerBoundDate";
			} else {
				// check if upper date is lower than lower date
				var oLowerDate = oModel.getProperty("/filters/lowerBoundDate");

				if (oLowerDate && (oSelectedDate < oLowerDate)) {
					MessageBox.error(
						oBundle.getText("dateAreNotValidErrorMessage")
					);
					oDP.setValueState(sap.ui.core.ValueState.Error);
				}
				sPath += "upperBoundDate";
			}
			oModel.setProperty(sPath, oSelectedDate);
		},

		onCheckBoxChange: function(oEvent) {
			var oCB1 = this.getView().byId("partiteAperteCheckBox"),
				oCB2 = this.getView().byId("partitePareggiateCheckBox");

			if (!oCB1.getSelected() && !oCB2.getSelected()) {
				var oBundle = this._getBundle();

				oCB1.setValueState(sap.ui.core.ValueState.Error);
				oCB2.setValueState(sap.ui.core.ValueState.Error);
				MessageBox.error(
					oBundle.getText("partiteNotValidErrorMessage")
				);
			} else {
				oCB1.setValueState(sap.ui.core.ValueState.None);
				oCB2.setValueState(sap.ui.core.ValueState.None);
			}
		},

		onFilterBarReset: function(oEvent) {
			var oModel = this.getView().getModel();
			var oDefaultFilters = JSON.parse(JSON.stringify(oModel.getProperty("/defaultFilters")));

			oModel.setProperty("/filters", oDefaultFilters);
			this._eraseDatePickerValueStates();
		},

		_checkIfAllIsOK: function() {
			var oView = this.getView(),
				oDP1 = oView.byId("filterLowerBoundDatePicker"),
				oDP2 = oView.byId("filterUpperBoundDatePicker"),
				oCB1 = oView.byId("partiteAperteCheckBox"),
				oCB2 = oView.byId("partitePareggiateCheckBox");

			return (oDP1.getValueState() !== sap.ui.core.ValueState.Error) &&
				(oDP2.getValueState() !== sap.ui.core.ValueState.Error) &&
				(oCB1.getValueState() !== sap.ui.core.ValueState.Error) &&
				(oCB2.getValueState() !== sap.ui.core.ValueState.Error);
		},

		onFilterBarSearch: function(oEvent) {
			var that = this,
				oView = this.getView(),
				oModel = oView.getModel(),
				oDateFrom = oModel.getProperty("/filters/lowerBoundDate"),
				oDateTo = oModel.getProperty("/filters/upperBoundDate"),
				oSupplierInput = oView.byId("supplierFilterInput"),
				bPartitePareggiate = oModel.getProperty("/filters/partitePareggiate"),
				oBundle = this._getBundle();

			oSupplierInput.setValueState(sap.ui.core.ValueState.None);

			// Retrieve all query parameters
			var aSuppliers = oModel.getProperty("/filters/suppliers");

			if (aSuppliers.length === 0) {
				MessageBox.error(
					oBundle.getText("noSupplierSelectedErrorMessage")
				);
				oSupplierInput.setValueState(sap.ui.core.ValueState.Error);
				return;
			}

			if (!this._checkIfAllIsOK()) {
				MessageBox.error(
					oBundle.getText("unableToProceedErrorMessage")
				);
				return;
			}

			if (!oDateFrom && !oDateTo && bPartitePareggiate) {
				var dialog = new sap.m.Dialog({
					title: oBundle.getText("warning"),
					type: 'Message',
					content: new sap.m.Text({
						text: oBundle.getText("confirmNoDateMessage"),
						textAlign: "Center"
					}),
					beginButton: new sap.m.Button({
						type: "Accept",
						text: oBundle.getText("confirm"),
						press: function() {
							dialog.close();
							that.onFilterBarSearchConfirm(oEvent);
						}
					}),
					endButton: new sap.m.Button({
						type: "Reject",
						text: oBundle.getText("cancel"),
						press: function() {
							dialog.close();
						}
					}),
					afterClose: function() {
						dialog.destroy();
					}
				});

				dialog.open();
			} else {
				this.onFilterBarSearchConfirm(oEvent);
			}
		},

		onFilterBarSearchConfirm: function(oEvent) {
			var that = this,
				oView = this.getView(),
				oModel = oView.getModel(),
				oTempModel = oView.getModel("tempModel"),
				oBundle = this._getBundle();

			// Retrieve all query parameters
			var //aSuppliers 			= this.getView().byId("supplierFilterInput").getTokens(),
				aSuppliers = oModel.getProperty("/filters/suppliers"),
				oDateFrom = oModel.getProperty("/filters/lowerBoundDate"),
				oDateTo = oModel.getProperty("/filters/upperBoundDate"),
				sInvNumber = oModel.getProperty("/filters/invoiceNumber"),
				bPartiteAperte = oModel.getProperty("/filters/partiteAperte"),
				bPartitePareggiate = oModel.getProperty("/filters/partitePareggiate");

			var aFilters = [];

			// Iterate through selected suppliers to retrieve IDs
			var aSupplierIDs = [];
			for (var j in aSuppliers) {
				if (j === "0"){
					aSupplierIDs.push(new sap.ui.model.Filter("supplierId", sap.ui.model.FilterOperator.EQ, aSuppliers[j].Lifnr));	
				}
				else{
					aSupplierIDs.push(new sap.ui.model.Filter("supplierId", sap.ui.model.FilterOperator.EQ, aSuppliers[j].supplierId));	
				}
				
			}

			aSupplierIDs = new sap.ui.model.Filter(aSupplierIDs, false);
			aFilters.push(aSupplierIDs);

			if (oDateFrom && oDateTo) {

				var dateTo = new Date(oDateTo);
				var monthTo = dateTo.getMonth() + 1;
				var formattedDateTo = dateTo.getFullYear().toString();
				if (monthTo < 10) {
					formattedDateTo += "0" + monthTo.toString();
				} else {
					formattedDateTo += monthTo.toString();
				}
				if (dateTo.getDate() < 10) {
					formattedDateTo += "0" + dateTo.getDate().toString();
				} else {
					formattedDateTo += dateTo.getDate().toString();
				}

				var dateFrom = new Date(oDateFrom);
				var monthFrom = dateFrom.getMonth() + 1;
				var formattedDateFrom = dateFrom.getFullYear().toString();
				if (monthFrom < 10) {
					formattedDateFrom += "0" + monthFrom.toString();
				} else {
					formattedDateFrom += monthFrom.toString();
				}
				if (dateFrom.getDate() < 10) {
					formattedDateFrom += "0" + dateFrom.getDate().toString();
				} else {
					formattedDateFrom += dateFrom.getDate().toString();
				}

				var oDateFilter = new sap.ui.model.Filter({
					path: "docDate",
					operator: sap.ui.model.FilterOperator.BT,
					value1: formattedDateFrom,
					value2: formattedDateTo
				});
				aFilters.push(oDateFilter);
			} else {
				if (oDateFrom) {

					var dateFrom = new Date(oDateFrom);
					var monthFrom = dateFrom.getMonth() + 1;
					var formattedDateFrom = dateFrom.getFullYear().toString();
					if (monthFrom < 10) {
						formattedDateFrom += "0" + monthFrom.toString();
					} else {
						formattedDateFrom += monthFrom.toString();
					}
					if (dateFrom.getDate() < 10) {
						formattedDateFrom += "0" + dateFrom.getDate().toString();
					} else {
						formattedDateFrom += dateFrom.getDate().toString();
					}

					var oDateFromFilter = new sap.ui.model.Filter("docDate", sap.ui.model.FilterOperator.GE, formattedDateFrom);
					aFilters.push(oDateFromFilter);
				}

				if (oDateTo) {

					var dateTo = new Date(oDateTo);
					var monthTo = dateTo.getMonth() + 1;
					var formattedDateTo = dateTo.getFullYear().toString();
					if (monthTo < 10) {
						formattedDateTo += "0" + monthTo.toString();
					} else {
						formattedDateTo += monthTo.toString();
					}
					if (dateTo.getDate() < 10) {
						formattedDateTo += "0" + dateTo.getDate().toString();
					} else {
						formattedDateTo += dateTo.getDate().toString();
					}

					var oDateToFilter = new sap.ui.model.Filter("docDate", sap.ui.model.FilterOperator.LE, formattedDateTo);
					aFilters.push(oDateToFilter);
				}
			}

			if (sInvNumber) {
				var sInvNumberFilter = new sap.ui.model.Filter("docNumber", sap.ui.model.FilterOperator.EQ, sInvNumber);
				aFilters.push(sInvNumberFilter);
			}

			if (bPartiteAperte && !bPartitePareggiate) {
				var sPartiteAperteFilter = new sap.ui.model.Filter("status", sap.ui.model.FilterOperator.EQ, "1");
				aFilters.push(sPartiteAperteFilter);
			}

			if (bPartitePareggiate && !bPartiteAperte) {
				var sPartitePareggiateFilter = new sap.ui.model.Filter("status", sap.ui.model.FilterOperator.EQ, "2");
				aFilters.push(sPartitePareggiateFilter);
			}

			if (oDateFromFilter || oDateToFilter || sInvNumberFilter) {
				aFilters = [new sap.ui.model.Filter(aFilters, true)];
			}

			// Disable user interactions
			oView.setBusy(true);
			oTempModel.setProperty("/dataLoaded", false);

			var sPath = "/InvoiceSet";
			var mParameters = {
				filters: aFilters,
				success: function(oData) {
					var aInvoices = aSuppliers;
					for (var x = 0; aInvoices[x]; x++) {
						// FIX SOSTITUZIONE SUPPLIER_ID CON LIFNR
						if (x === 0)
							aInvoices[x].supplierId = aInvoices[x].Lifnr;
						
						aInvoices[x].visible = false;
						aInvoices[x].Invoices = [];

						//Used for space at the end of the tables
						if (x === aInvoices.length - 1) {
							aInvoices[x].lastSupplier = true;
						} else {
							aInvoices[x].lastSupplier = false;
						}

						for (var i = 0; oData.results[i]; i++) {
							var sSupplier = oData.results[i];
							var sSupplierId = sSupplier.supplierId;
							var invoiceSupplierId = aInvoices[x].supplierId;
							if (sSupplierId && sSupplierId !== "")
								sSupplierId = sSupplierId.replace(/^0+/, '');
							else
								sSupplierId = "";
							
							if (invoiceSupplierId && invoiceSupplierId !== "")
								invoiceSupplierId = invoiceSupplierId.replace(/^0+/, '');
							else
								invoiceSupplierId = "";

							if (sSupplierId === invoiceSupplierId) {
								sSupplier.paymentReminder = null;
								aInvoices[x].visible = true;
								aInvoices[x].Invoices.push(sSupplier);
								//								oData.results.splice(i,1);
							}
						}

						//save documents count
						aInvoices[x].documentsCount = aInvoices[x].Invoices.length;
					}

					// Create text for no data supplier
					var text = "";
					var noInvoicesSupplierNumber = 0;
					for (var y = 0; aInvoices[y]; y++) {
						if (!aInvoices[y].Invoices || aInvoices[y].Invoices.length === 0) {
							text = text + aInvoices[y].supplierName + ", ";
							noInvoicesSupplierNumber++;
						}
					}

					if (text.length > 0) {
						text = text.substr(0, text.length - 2);
						if (noInvoicesSupplierNumber === 1) {
							MessageBox.information(
								oBundle.getText("noInvoicesSingleSupplierMessage", [text])
							);
						} else {
							MessageBox.information(
								oBundle.getText("noInvoicesMessage") + ": " + text
							);
						}
					}

					if (oData.results.length > 0) {
						that.getView().byId("supplierFilterBar").setFilterBarExpanded(false);
					}

					oModel.setProperty(
						"/invoices",
						aInvoices
					);

					oTempModel.setProperty(
						"/config/dataLoaded",
						true
					);
					oView.setBusy(false);
				},
				error: function(oError) {
					jQuery.sap.log.info("Odata Error occured");
					oView.setBusy(false);
				}
			};
			oView.setBusy(true);
			oView.getModel("oPTModel").read(sPath, mParameters);
		},

		onTablePersonalizationButtonPressed: function(oEvent) {
			this._selectedHeaderPersoTable = oEvent.getSource().getParent().getParent();
			var grid = oEvent.getSource().getParent().getParent().getParent();
			this._selectedPersoTable = grid.getContent()[1].getContent()[0];
			if (!this._personalizationDialog) {
				this._personalizationDialog = sap.ui.xmlfragment(
					"org.fater.paymenttrackingsupplier.view.fragment.TablePersonalizationDialog",
					this
				);
				this.getView().addDependent(this._personalizationDialog);
			}

			this._personalizationDialog.getButtons()[0].setType("Accept");
			this._personalizationDialog.open();
		},

		handleTablePersonalizationDialogOKButtonPress: function(oEvent) {
			var items = this._personalizationDialog.getContent()[0].getItems();
			for (var i = 0; items[i]; i++) {
				if (items[i].getSelected()) {
					this._selectedHeaderPersoTable.getColumns()[i].setVisible(true);
					this._selectedPersoTable.getColumns()[i].setVisible(true);
				} else {
					this._selectedHeaderPersoTable.getColumns()[i].setVisible(false);
					this._selectedPersoTable.getColumns()[i].setVisible(false);
				}
			}
			this._personalizationDialog.close();
		},

		onTableSortingButtonPressed: function(oEvent) {
			var grid = oEvent.getSource().getParent().getParent().getParent();
			this._selectedSortTable = grid.getContent()[1].getContent()[0];
			this._getDialog().open("sort");
		},

		_getDialog: function() {
			if (!this._oTableVSDialog) {
				this._oTableVSDialog = sap.ui.xmlfragment("org.fater.paymenttrackingsupplier.view.fragment.ViewSettingsDialog", this);
				this.getView().addDependent(this._oTableVSDialog);
			}
			var dialog = this._oTableVSDialog._dialog;
			dialog.getButtons()[0].setType("Accept");
			dialog.getButtons()[1].setType("Reject");
			return this._oTableVSDialog;
		},

		_handleSortConfirm: function(oEvent) {
			var oBinding = this._selectedSortTable.getBinding("items");
			var sortItem = oEvent.getParameter("sortItem").getKey();
			var aSorters = [];
			var sOrder = oEvent.getParameter("sortDescending");
			var sorter = new Sorter(sortItem, sOrder);
			if (sortItem === "amount") {
				sorter.fnCompare = function(value1, value2) {
					var value1Float = parseFloat(value1);
					var value2Float = parseFloat(value2);
					if (value1.indexOf("-") !== -1) {
						value1Float = -value1Float;
					}
					if (value2.indexOf("-") !== -1) {
						value2Float = -value2Float;
					}
					if (value1Float < value2Float) {
						return -1;
					}
					if (value1Float === value2Float) {
						return 0;
					}
					if (value1Float > value2Float) {
						return 1;
					}
				};
			}
			aSorters.push(sorter);
			oBinding.sort(aSorters);
		},

		onExcelExportButtonPressed: function(oEvent) {
			var oButton = oEvent.getSource();
			var oContext = oButton.getBindingContext();
			var oSupplier = oContext.getObject();
			var sSupplierName = oSupplier.supplierName,
				sSupplierId = oSupplier.supplierId,
				sPaymentConditions = oSupplier.paymentConditions,
				aLines = oSupplier.Invoices,
				sReportTitle = "Report " + sSupplierName + " (" + sSupplierId + ")";
			var sCSV = this._generateCSVData(
				sSupplierName,
				sSupplierId,
				sPaymentConditions,
				aLines,
				sReportTitle
			);

			this._downloadCSVFile(
				sReportTitle,
				sCSV
			);
		},

		_generateCSVData: function(sSupplierName, sSupplierId, sPaymentConditions, aLines, sReportTitle) {

			var sCSV = '',
				oBundle = this._getBundle();

			if (aLines.length > 0) {
				// AS - FIX bug #009: Stampa del totale
				var total = oBundle.getText("total") + ": " + utils.getTotal(aLines);
				//Set Report title in first row or line
				sCSV += sReportTitle + ';;;;;;;;' + total + '\r\n';
				sCSV += oBundle.getText("paymentConditionLabel") + ": " + sPaymentConditions + '\r\n';

				// AS - FIX bug #009: Stampa della società
				sCSV += oBundle.getText("typeCompanyFilterLabel") + ": " + "FATER S.P.A." + '\r\n\n    ';

				//Generate the Header of line items table structure
				var row = "";

				row += oBundle.getText("docNumberLabel") + ";" +
					oBundle.getText("docTypeDescrLabel") + ";" +
					oBundle.getText("docAmountLabel") + ";" +
					"" /* Empty column header for currency*/ + ";" +
					oBundle.getText("documentDateLabel") + ";" +
					oBundle.getText("expireDateLabel") + ";" +
					oBundle.getText("pareggioDocNumberLabel") + ";" +
					oBundle.getText("pareggioDocDateLabel") + ";" +
					oBundle.getText("internalDocNumberLabel");

				//append Label row with line break
				sCSV += row + '\r\n';

				//1st loop is to extract each row
				for (var i = 0; i < aLines.length; i++) {

					var change = [];
					var sInternalType = "string";
					var amount1 = new sap.ui.model.type.Currency({
						showMeasure: false
					});
					var notFormattedAmount = aLines[i].amount;
					if (notFormattedAmount.substr(notFormattedAmount.length - 1) === "-") {
						var formattedAmount = "-" + notFormattedAmount.substr(0, notFormattedAmount.length - 1);
					} else {
						var formattedAmount = notFormattedAmount;
					}
					change.push(formattedAmount);
					change.push("EUR");
					var amount = amount1.formatValue(change, sInternalType);

					var docDate = "";
					var expireDate = "";
					var pareggioDocDate = "";
					var formatOptions = {
						source: {
							pattern: "yyyy-MM-ddTHH:mm:ss"
						}
					};
					var dateType = new sap.ui.model.type.Date(formatOptions);
					if (aLines[i].docDate && aLines[i].docDate !== "00000000") {
						docDate = dateType.formatValue(aLines[i].docDate, "string");
					}
					if (aLines[i].expireDate && aLines[i].expireDate !== "00000000") {
						expireDate = dateType.formatValue(aLines[i].expireDate, "string");
					}
					if (aLines[i].pareggioDocDate && aLines[i].pareggioDocDate !== "00000000") {
						pareggioDocDate = dateType.formatValue(aLines[i].pareggioDocDate, "string");
					}
					row = "";
					row += ((aLines[i].docNumber) ? aLines[i].docNumber : " ") + ";" +
						((aLines[i].docType) ? aLines[i].docType : " ") + ";" +
						((amount) ? amount : " ") + ";" +
						((aLines[i].currency) ? aLines[i].currency : " ") + ";" +
						((docDate) ? docDate : " ") + ";" +
						((expireDate) ? expireDate : " ") + ";" +
						((aLines[i].pareggioDocNumber) ? aLines[i].pareggioDocNumber : " ") + ";" +
						((pareggioDocDate) ? pareggioDocDate : " ") + ";" +
						((aLines[i].internalDocNumber) ? aLines[i].internalDocNumber : " ");

					// row.slice(0, row.length - 1);
					//add a line break after each row
					sCSV += row + '\r\n';
				}

				if (sCSV === "") {
					MessageBox.error("Invalid data");
					return;
				}
			}
			return sCSV;
		},

				_downloadCSVFile: function(sReportTitle, sCSV) {
			//this will remove the blank-spaces from the title and replace it with an underscore
			var sFileName = sReportTitle.replace(/ /g, "_");
			// Internet Explorer 6-11
			var isIE = /*@cc_on!@*/ false || !!document.documentMode;
			if (isIE === true) {
				var blob = new Blob([sCSV], {
					type: "text/csv;charset=UTF-8",
					encoding:"UTF-8"
				});
				if (navigator.msSaveBlob) { // IE 10+
					navigator.msSaveBlob(blob, sFileName + ".csv");
				} else {
					var link = document.createElement("a");
					if (link.download !== undefined) { // feature detection
						// Browsers that support HTML5 download attribute
						var url = URL.createObjectURL(blob);
						link.setAttribute("href", url);
						link.setAttribute("download", sFileName + ".csv");
						link.style = "visibility:hidden";
						document.body.appendChild(link);
						link.click();
						document.body.removeChild(link);
					}
				}

			} else {
				//Initialize file format you want csv or xls
				var uri = 'data:text/csv;charset=utf-8,' + escape(sCSV);

				// Now the little tricky part.
				// you can use either>> window.open(uri);
				// but this will not work in some browsers
				// or you will not get the correct file extension    

				//this trick will generate a temp <a /> tag
				var link = document.createElement("a");
				link.href = uri;

				//set the visibility hidden so it will not effect on your web-layout
				//link.style = "visibility:hidden";
				link.download = sFileName + ".csv";

				//this part will append the anchor tag and remove it after automatic click
				document.body.appendChild(link);
				link.click();
				document.body.removeChild(link);
			}
		},

		/**
		 * Handle navigation to Detail page
		 */
		onColumnListItemPress: function(oEvent) {
			var that = this;
			var oBundle = this._getBundle();
			var oContext = oEvent.getSource().getBindingContext();
			var aSplittedPath = oContext.getPath().split("/");
			var oParams = {
				supplier: aSplittedPath[2],
				document: aSplittedPath[4]
			};
			var oRouter = this._getRouter();

			var sPathLocal = oContext.getPath();

			if (!this.getView().getModel().getProperty(sPathLocal + "/paymentReminder")) {
				var supplierId = this.getView().getModel().getProperty(sPathLocal + "/supplierId");
				var docNumber = this.getView().getModel().getProperty(sPathLocal + "/internalDocNumber");

				var sPath = "/InvoiceSet(supplierId='" + supplierId + "',docNumber='" + docNumber + "')/paymentReminder";
				var mParameters = {
					urlParameters: {
						"$expand": "lines"
					},
					success: function(oData) {
						if (oData.lines.results.length > 0) {
							oRouter.navTo("detail", oParams, false);
						} else {
							MessageBox.information(
								oBundle.getText("noLinesMessage")
							);
						}
						that.getView().setBusy(false);
					},
					error: function(oError) {
						jQuery.sap.log.info("Odata Error occured");
						this.getView().setBusy(false);
					}
				};
				this.getView().setBusy(true);
				this.getView().getModel("oPTModel").read(sPath, mParameters);
			} else {
				oRouter.navTo("detail", oParams, false);
			}
		},

		onExportAllPress: function(oEvent) {

			var oModel = this.getView().getModel(),
				oBundle = this._getBundle(),
				sCSV = "",
				sReportTitle = "";
			var aData = oModel.getProperty("/invoices");

			if (!aData) {
				MessageBox.error(
					oBundle.getText("noDataToExportErrorMessage")
				);

				return;
			}

			for (var i in aData) {

				var oSupplier = aData[i],
					aLines = oSupplier.Invoices,
					sSupplierId = oSupplier.supplierId,
					sSupplierName = oSupplier.supplierName,
					sPaymentConditions = oSupplier.paymentConditions;

				sReportTitle = "Report " + sSupplierName + " (" + sSupplierId + ")";
				sCSV += this._generateCSVData(sSupplierName, sSupplierId, sPaymentConditions, aLines, sReportTitle);

				if (i < (aData.length - 1)) {
					sCSV += "\r\n\r\n";
				}
			}

			sReportTitle = "All_Reports";
			this._downloadCSVFile(sReportTitle, sCSV);
		},

		_getBundle: function() {
			var sLanguage = sap.ui.getCore().getConfiguration().getLanguage();
			var sRootPath = jQuery.sap.getModulePath("org.fater.paymenttrackingsupplier");

			if (!this._bundle) {
				this._bundle = jQuery.sap.resources({
					url: sRootPath + "/i18n/i18n.properties",
					locale: sLanguage
				});
			}

			return this._bundle;
		},

		_getRouter: function() {
			return sap.ui.core.UIComponent.getRouterFor(this);
		},

		/**
		 * Getter for the resource bundle.
		 * @public
		 * @returns {sap.ui.model.resource.ResourceModel} the resourceModel of the component
		 */
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
		},

	});

});
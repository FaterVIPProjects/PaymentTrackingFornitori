/* eslint no-empty: ["error", { "allowEmptyCatch": true }] */

sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"org/fater/paymenttrackingsupplier/util/formatter"	
], function(Controller, formatter) {
	"use strict";
	
	return Controller.extend("org.fater.paymenttrackingsupplier.controller.Detail", {

		formatter: formatter,

		_getRouter: function() {
			return sap.ui.core.UIComponent.getRouterFor(this);
		},
		
		_routeMatched: function(oEvent){
			var that = this;
			var sSupplier = oEvent.getParameter("arguments").supplier;
			var sDocument = oEvent.getParameter("arguments").document;
			
			var sPathLocal = ["/invoices" , sSupplier , "Invoices" , sDocument].join("/");
			
			if (!this.getView().getModel().getProperty(sPathLocal + "/paymentReminder")){
				var supplierId = this.getView().getModel().getProperty(sPathLocal + "/supplierId");
				var docNumber = this.getView().getModel().getProperty(sPathLocal + "/internalDocNumber");
				var currency = this.getView().getModel().getProperty(sPathLocal + "/currency");
				var sPath = "/InvoiceSet(supplierId='" + supplierId + "',docNumber='" + docNumber + "')/paymentReminder";
				
				//Max Documents to display without scrollbar
				var maxLines = 10;
				var scrollContainer = this.getView().byId("scrollContainerLines");
				
				var	mParameters = {
					urlParameters : {
						"$expand" : "lines"
					},
	                success : function (oData) {
	                	if(oData.lines){
	                		oData.lines = oData.lines.results;
	                	}

						that.getView().getModel("tempModel").setProperty("/CurrentLineCurrency", currency);
						
  	                	//Adjust scroll container based on number of lines
	                	var linesCount = oData.lines.length + 1;
	                	if (linesCount < maxLines){
	                		var height = linesCount * 2.1; 
	                		scrollContainer.setHeight(height + "rem");
	                	}      	
	                	
	                	that.getView().getModel().setProperty(
							sPathLocal + "/paymentReminder",
							oData
						);

						that.getView().getModel().refresh();
						that.getView().setBusy(false);
	                },
	                error: function (oError) {
	                    jQuery.sap.log.info("Odata Error occured");
	                    this.getView().setBusy(false);
	                }
	            };
	            this.getView().setBusy(true);
				this.getView().getModel("oPTModel").read(sPath, mParameters);					
			}

			this.getView().bindElement(sPathLocal + "/paymentReminder");
		},
		
		onInit: function() {
			this._getRouter().getRoute("detail").attachPatternMatched(this._routeMatched, this);
		},
	
		onNavBack: function(oEvent) {
			this._getRouter().myNavBack("main");
		}


	});

});
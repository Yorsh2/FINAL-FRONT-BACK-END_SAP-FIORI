sap.ui.define([
    "com/invertions/sapfiorimodinv/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/Device",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/model/Filter",
    "sap/ui/core/Fragment",
    "sap/ui/model/FilterOperator",
    "jquery"
], function (
    BaseController,
    JSONModel,
    Device,
    MessageBox,
    MessageToast,
    Filter,
    Fragment,
    FilterOperator,
    $
) {
    "use strict";

    return BaseController.extend("com.invertions.sapfiorimodinv.controller.catalogs.Values", {

        onInit: function () {
            var oView = this.getView();
            oView.setModel(new JSONModel({
                values: [],
                selectedValue: null,
                selectedValueIn: false
            }), "values");
            oView.setModel(new JSONModel({
                VALUEID: "",
                VALUE: "",
                VALUEPAID: "",
                ALIAS: "",
                IMAGE: "",
                DESCRIPTION: "",
                LABELID: "",
                mode: "CREATE"
            }), "newValueModel");
            var oDeviceModel = new JSONModel(Device);
            oDeviceModel.setDefaultBindingMode("OneWay");
            oView.setModel(oDeviceModel, "device");
            this.loadValues();
        },

        _loadLabels: function () {
            var oView = this.getView(), oLabelsModel = new JSONModel();
            oView.setModel(oLabelsModel, "labels");
            oView.setBusy(true);
            $.ajax({
                url: "http://localhost:3333/api/security/label/getAllLabels",
                method: "GET",
                success: function (data) {
                    var aRaw = data.value || data.data || data || [];
                    var aClean = aRaw.map(function (o) { return { LABELID: o.LABELID || o.labelid || o.LabelID }; });
                    oLabelsModel.setProperty("/labels", aClean);
                },
                error: function () {
                    MessageToast.show("Error al cargar labels desde 3333");
                },
                complete: function () {
                    oView.setBusy(false);
                }
            });
        },

        openValueDialog: function (ruta) {
            var oView = this.getView();
            this._loadLabels();  // Cargar todos los labels al abrir diálogo
            if (!this._oDialog) {
                Fragment.load({
                    id: oView.getId(),
                    name: "com.invertions.sapfiorimodinv.view.catalogs.fragments." + ruta,
                    controller: this
                }).then(function (dlg) {
                    this._oDialog = dlg;
                    oView.addDependent(dlg);
                    dlg.open();
                }.bind(this));
            } else {
                this._oDialog.open();
            }
        },

        onAddValues: function () {
            this.getView().getModel("newValueModel").setData({
                VALUEID: "", VALUE: "", VALUEPAID: "", ALIAS: "", IMAGE: "",
                DESCRIPTION: "", LABELID: "", mode: "CREATE"
            });
            this.getView().getModel("values").setProperty("/selectedValueIn", false);
            this.openValueDialog("AddValueDialog");
        },

        onEditValue: function () {
            const oSel = this.getView().getModel("values").getProperty("/selectedValue") || {};
            this.getView().getModel("newValueModel").setData({
                ...oSel,
                mode: "EDIT"
            });
            this.openValueDialog("EditValueDialog");  // También hace el _loadLabels()
        },

        onItemSelect: function (oEvent) {
            var oData = oEvent.getParameter("listItem").getBindingContext("values").getObject();
            var oVals = this.getView().getModel("values");
            oVals.setProperty("/selectedValue", oData);
            oVals.setProperty("/selectedValueIn", true);
        },

        loadValues: function () {
            var oView = this.getView(), oModel = oView.getModel("values");
            oView.setBusy(true);
            $.ajax({
                url: "http://localhost:3333/api/security/values/getAllValues",
                method: "GET",
                success: function (res) {
                    var aItems = res.value || res;
                    oModel.setProperty("/values", aItems);
                },
                error: function () {
                    MessageToast.show("Error al obtener valores");
                },
                complete: function () {
                    oView.setBusy(false);
                }
            });
        },

        loadValuesByLabelId: function (labelid) {
            var oView = this.getView();
            var oValuesModel = oView.getModel("values");

            if (!labelid) {
                oValuesModel.setProperty("/FilteredValues", []);
                return;
            }

            oView.setBusy(true);

            $.ajax({
                // CORREGIDO: Llamada con query param para CDS OData
                url: "http://localhost:3333/api/security/values/getLabelById?labelid=" + encodeURIComponent(labelid),
                method: "GET",
                success: function (res) {
                    var aItems = res.value || res || [];
                    oValuesModel.setProperty("/FilteredValues", aItems);
                },
                error: function () {
                    MessageToast.show("Error al obtener valores filtrados por LABELID");
                    oValuesModel.setProperty("/FilteredValues", []);
                },
                complete: function () {
                    oView.setBusy(false);
                }
            });
        },

        onLabelIdChange: function (oEvent) {
            var selectedLabelId = oEvent.getParameter("selectedItem").getKey();
            this.getView().getModel("newValueModel").setProperty("/LABELID", selectedLabelId);
            this.loadValuesByLabelId(selectedLabelId);
        },

        onSaveValues: function () {
            var oView = this.getView(), oForm = oView.getModel("newValueModel").getData();
            if (!oForm.VALUEID || !oForm.VALUE || !oForm.LABELID) {
                MessageToast.show("VALUEID, VALUE y LABELID son obligatorios");
                return;
            }

            oView.setBusy(true);
            var allowedFields = ["VALUEID", "VALUE", "VALUEPAID", "ALIAS", "IMAGE", "DESCRIPTION", "LABELID"];
            var oPayload = {};
            allowedFields.forEach(function (field) {
                if (oForm[field] !== undefined) {
                    oPayload[field] = oForm[field];
                }
            });

            var url, method, body;
            if (oForm.mode === "CREATE") {
                url = "http://localhost:3333/api/security/values/view";
                method = "POST";
                body = JSON.stringify({ value: oPayload });
            } else {
                url = "http://localhost:3333/api/security/values/updateValue";
                method = "POST";
                body = JSON.stringify({ valueid: oForm.VALUEID, value: oPayload });
            }

            $.ajax({
                url: url,
                method: method,
                contentType: "application/json",
                data: body,
                success: function () {
                    MessageToast.show("Valor " + (oForm.mode === "CREATE" ? "creado" : "actualizado") + " correctamente");
                    this.loadValues();
                    this.onCancelDialog();
                }.bind(this),
                error: function () {
                    MessageToast.show("Error al " + (oForm.mode === "CREATE" ? "crear" : "actualizar") + " valor");
                },
                complete: function () {
                    oView.setBusy(false);
                }
            });
        },

        onFilterChange: function (oEvent) {
            var sQuery = oEvent.getParameter("newValue"),
                oTable = this.byId("valuesTable"),
                oBinding = oTable.getBinding("items"),
                aFilters = [];
            if (sQuery) aFilters.push(new Filter("VALUEID", FilterOperator.Contains, sQuery));
            oBinding.filter(aFilters);
        },

        onActivateValue: function () { this._toggleActive(true); },
        onDeactivateValue: function () { this._toggleActive(false); },

        _toggleActive: function (bActivate) {
            var oSel = this.getView().getModel("values").getProperty("/selectedValue");
            if (!oSel) {
                MessageToast.show("Selecciona un valor primero");
                return;
            }
            var payload = { valueid: oSel.VALUEID, reguser: oSel.VALUEID };
            var sUrl = "http://localhost:3333/api/security/values/" + (bActivate ? "activateValue" : "deactivateValue");

            this.getView().setBusy(true);
            $.ajax({
                url: sUrl,
                method: "POST",
                contentType: "application/json",
                data: JSON.stringify(payload),
                success: function () {
                    MessageToast.show(bActivate ? "Valor activado correctamente" : "Valor desactivado correctamente");
                    this.loadValues();
                }.bind(this),
                error: function () {
                    MessageToast.show(bActivate ? "Error al activar valor" : "Error al desactivar valor");
                },
                complete: function () {
                    this.getView().setBusy(false);
                }.bind(this)
            });
        },

        onDeleteValue: function () {
            var oSel = this.getView().getModel("values").getProperty("/selectedValue");
            if (!oSel) {
                MessageToast.show("Selecciona un valor primero");
                return;
            }
            var payload = { valueid: oSel.VALUEID };
            MessageBox.confirm("¿Eliminar valor permanentemente?", {
                title: "Confirmar eliminación",
                onClose: function (action) {
                    if (action === MessageBox.Action.OK) {
                        this.getView().setBusy(true);
                        $.ajax({
                            url: "http://localhost:3333/api/security/values/deleteview",
                            method: "POST",
                            contentType: "application/json",
                            data: JSON.stringify(payload),
                            success: function () {
                                MessageToast.show("Valor eliminado permanentemente");
                                this.loadValues();
                            }.bind(this),
                            error: function () {
                                MessageToast.show("Error al eliminar valor");
                            },
                            complete: function () {
                                this.getView().setBusy(false);
                            }.bind(this)
                        });
                    }
                }.bind(this)
            });
        },

        onCancelDialog: function () {
            if (this._oDialog) {
                this._oDialog.close();
            }
            this.getView().getModel("newValueModel").setData({
                VALUEID: "", VALUE: "", VALUEPAID: "", ALIAS: "", IMAGE: "", DESCRIPTION: "", LABELID: "", mode: "CREATE"
            });
        }

    });
});

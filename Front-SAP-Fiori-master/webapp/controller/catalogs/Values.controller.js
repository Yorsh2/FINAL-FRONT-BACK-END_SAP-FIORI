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
            this._loadLabels();
        },

        openValueDialog: function () {
            var oView = this.getView();
            if (!this._oDialog) {
                Fragment.load({
                    id: oView.getId(),
                    name: "com.invertions.sapfiorimodinv.view.catalogs.fragments.EditValueDialog",
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
            this.openValueDialog();
        },

        onEditValue: function () {
            var oSel = this.getView().getModel("values").getProperty("/selectedValue") || {};
            this.getView().getModel("newValueModel").setData(Object.assign({}, oSel, { mode: "EDIT" }));
            this.openValueDialog();
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
                    MessageToast.show("Error al cargar labels");
                },
                complete: function () {
                    oView.setBusy(false);
                }
            });
        },

        onSaveValues: function () {
            var oView = this.getView(), oForm = oView.getModel("newValueModel").getData();
            if (!oForm.VALUEID || !oForm.VALUE) {
                MessageToast.show("VALUEID y VALUE son obligatorios");
                return;
            }
            oView.setBusy(true);
            var oPayload = Object.assign({}, oForm);
            delete oPayload.mode; delete oPayload._id; delete oPayload.__v;

            if (oForm.mode === "CREATE") {
                $.ajax({
                    url: "http://localhost:3333/api/security/values/view",
                    method: "POST",
                    contentType: "application/json",
                    data: JSON.stringify({ value: oPayload }),
                    success: function () {
                        MessageToast.show("Valor creado correctamente"); this.loadValues(); this.onCancelDialog();
                    }.bind(this),
                    error: function () {
                        MessageToast.show("Error al crear valor");
                    },
                    complete: function () {
                        oView.setBusy(false);
                    }
                });
            } else {
                $.ajax({
                    url: "http://localhost:3333/api/security/values/updateValue",
                    method: "POST",
                    contentType: "application/json",
                    data: JSON.stringify({ valueid: oForm.VALUEID, value: oPayload }),
                    success: function () {
                        MessageToast.show("Valor actualizado correctamente"); this.loadValues(); this.onCancelDialog();
                    }.bind(this),
                    error: function () {
                        MessageToast.show("Error al actualizar valor");
                    },
                    complete: function () {
                        oView.setBusy(false);
                    }
                });
            }
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
            // URL dinámica según activar o desactivar
            var sUrl = "http://localhost:3333/api/security/values/" + (bActivate ? "activateValue" : "deactivateValue");

            this.getView().setBusy(true);
            $.ajax({
                url: sUrl,
                method: "POST",
                contentType: "application/json",
                data: JSON.stringify(payload),
                success: function () {
                    MessageToast.show(
                        bActivate
                        ? "Valor activado correctamente"
                        : "Valor desactivado correctamente"
                    );
                    this.loadValues();
                }.bind(this),
                error: function () {
                    MessageToast.show(
                        bActivate
                        ? "Error al activar valor"
                        : "Error al desactivar valor"
                    );
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

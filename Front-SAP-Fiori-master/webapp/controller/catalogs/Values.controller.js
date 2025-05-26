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
            // this._loadLabels();
        },

        openValueDialog: function (ruta) {
            var oView = this.getView();
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

            // Abre el diálogo correcto (nombre debe coincidir con el fragmento)
            if (!this._oEditDialog) {
                Fragment.load({
                    id: this.getView().getId(),
                    name: "com.invertions.sapfiorimodinv.view.catalogs.fragments.EditValueDialog",
                    controller: this
                }).then(function (oDialog) {
                    this._oEditDialog = oDialog;
                    this.getView().addDependent(oDialog);
                    oDialog.open();
                }.bind(this));
            } else {
                this._oEditDialog.open();
            }
        },

        onItemSelect: function (oEvent) {
            var oData = oEvent.getParameter("listItem").getBindingContext("values").getObject();
            var oVals = this.getView().getModel("values");
            oVals.setProperty("/selectedValue", oData);
            oVals.setProperty("/selectedValueIn", true);
        },

        loadValues: async function () {
            const oView = this.getView();
            const oModel = oView.getModel("values");

            try {
                oView.setBusy(true);

                const envRes = await fetch("env.json");
                const env = await envRes.json();
                const url = env.API_VALUES_URL_BASE + "getAllValues";

                const res = await fetch(url);
                if (!res.ok) throw new Error("Error cargando valores");

                const data = await res.json();
                const aItems = data.value || data;
                oModel.setProperty("/values", aItems);

            } catch (error) {
                MessageToast.show("Error al cargar valores: " + error.message);
            } finally {
                oView.setBusy(false);
            }
        },

        _loadLabels: async function () {
            const oView = this.getView();
            const oLabelsModel = oView.getModel("labels") || new JSONModel();

            try {
                oView.setBusy(true);

                // Cargar configuración de entorno
                const envRes = await fetch("env.json");
                const env = await envRes.json();
                const url = env.API_LABELS_URL_BASE + "getAllLabels";

                // Hacer la petición con fetch
                const response = await fetch(url);
                if (!response.ok) throw new Error("Error cargando labels");

                // Procesar respuesta
                const data = await response.json();
                const aRaw = data.value || data.data || data || [];
                const aClean = aRaw.map(o => ({
                    LABELID: o.LABELID || o.labelid || o.LabelID
                    // Agrega aquí otras propiedades si las necesitas
                }));

                oLabelsModel.setProperty("/labels", aClean);
                oView.setModel(oLabelsModel, "labels");

            } catch (error) {
                MessageToast.show("Error al cargar labels: " + error.message);
                console.error("Error en _loadLabels:", error);
            } finally {
                oView.setBusy(false);
            }
        },

        onSaveValues: async function () {
            const oView = this.getView();
            const oForm = oView.getModel("newValueModel").getData();

            if (!oForm.VALUEID || !oForm.VALUE) {
                MessageToast.show("VALUEID y VALUE son obligatorios");
                return;
            }

            try {
                oView.setBusy(true);

                // Cargar configuración de entorno
                const envRes = await fetch("env.json");
                const env = await envRes.json();
                const API_BASE = env.API_VALUES_URL_BASE;

                // Campos permitidos
                const allowedFields = ["VALUEID", "VALUE", "VALUEPAID", "ALIAS", "IMAGE", "DESCRIPTION", "LABELID"];

                // Filtrar payload
                const oPayload = {};
                allowedFields.forEach(field => {
                    if (oForm[field] !== undefined) {
                        oPayload[field] = oForm[field];
                    }
                });

                let url, method, body;

                if (oForm.mode === "CREATE") {
                    url = `${API_BASE}view`;
                    method = "POST";
                    body = JSON.stringify({ value: oPayload });
                } else {
                    url = `${API_BASE}updateValue`;
                    method = "POST";
                    body = JSON.stringify({ valueid: oForm.VALUEID, value: oPayload });
                }

                const response = await fetch(url, {
                    method,
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                MessageToast.show(`Valor ${oForm.mode === "CREATE" ? "creado" : "actualizado"} correctamente`);
                this.loadValues();
                this.onCancelDialog();

            } catch (error) {
                MessageToast.show(`Error al ${oForm.mode === "CREATE" ? "crear" : "actualizar"} valor: ${error.message}`);
            } finally {
                oView.setBusy(false);
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

        _toggleActive: async function (bActivate) {
            const oView = this.getView();
            const oSel = oView.getModel("values").getProperty("/selectedValue");

            if (!oSel) {
                MessageToast.show("Selecciona un valor primero");
                return;
            }

            const isCurrentlyActive = oSel.DETAIL_ROW?.ACTIVED;
            if ((bActivate && isCurrentlyActive) || (!bActivate && !isCurrentlyActive)) {
                const msg = bActivate
                    ? "El valor ya se encuentra activo"
                    : "El valor ya se encuentra inactivo";
                MessageToast.show(msg);
                return;
            }

            try {
                oView.setBusy(true);

                // Cargar configuración de entorno
                const envRes = await fetch("env.json");
                const env = await envRes.json();
                const endpoint = bActivate ? "activateValue" : "deactivateValue";
                const url = `${env.API_VALUES_URL_BASE}${endpoint}`;

                const payload = {
                    valueid: oSel.VALUEID,
                    reguser: oSel.VALUEID
                };

                const response = await fetch(url, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    throw new Error(`Error ${response.status}`);
                }

                MessageToast.show(
                    bActivate
                        ? "Valor activado correctamente"
                        : "Valor desactivado correctamente"
                );
                const oModel = oView.getModel("values");
                const aValues = oModel.getProperty("/values");
                const nIndex = aValues.findIndex(v => v.VALUEID === oSel.VALUEID);

                if (nIndex !== -1) {
                    aValues[nIndex].DETAIL_ROW.ACTIVED = bActivate;
                    oModel.setProperty("/values", aValues);
                }

            } catch (error) {
                MessageToast.show(
                    bActivate
                        ? "Error al activar valor"
                        : "Error al desactivar valor"
                );
                console.error("Error en _toggleActive:", error);
            } finally {
                oView.setBusy(false);
            }
        },

        onDeleteValue: async function () {
            const oView = this.getView();
            const oSel = oView.getModel("values").getProperty("/selectedValue");

            if (!oSel) {
                MessageToast.show("Selecciona un valor primero");
                return;
            }

            try {
                const action = await MessageBox.confirm("¿Eliminar valor permanentemente?", {
                    title: "Confirmar eliminación"
                });

                if (action !== MessageBox.Action.OK) return;

                oView.setBusy(true);

                // Cargar configuración de entorno
                const envRes = await fetch("env.json");
                const env = await envRes.json();
                const url = `${env.API_SECURITY_URL_BASE}deleteview`;

                const payload = { valueid: oSel.VALUEID };
                const response = await fetch(url, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    throw new Error("Error en la respuesta del servidor");
                }

                MessageToast.show("Valor eliminado permanentemente");
                this.loadValues();

            } catch (error) {
                MessageToast.show("Error al eliminar valor: " + error.message);
            } finally {
                oView.setBusy(false);
            }
        },

        onCancelDialog: function () {
            if (this._oDialog) {
                this._oDialog.close();
            }
            this.getView().getModel("newValueModel").setData({
                VALUEID: "", VALUE: "", VALUEPAID: "", ALIAS: "", IMAGE: "", DESCRIPTION: "", LABELID: "", mode: "CREATE"
            });
        },

        onCancelValues: function () {
            const oDialog = this.byId("addValueDialog");
            if (oDialog) {
                oDialog.close();
            }
        },

        onEditCancelValue: function () {
            const oDialog = this.byId("editDialogValue");
            if (oDialog) {
                oDialog.close();
            }
        },

    });
});

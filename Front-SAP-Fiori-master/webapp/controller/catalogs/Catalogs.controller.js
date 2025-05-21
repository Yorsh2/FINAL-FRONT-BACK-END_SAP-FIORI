/* eslint-disable fiori-custom/sap-no-hardcoded-url */
/* eslint-disable no-console */
sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/ui/core/Fragment",
    "sap/m/MessageToast",
    "jquery",
  ],
  function (Controller, JSONModel, MessageBox, Fragment, MessageToast, $) {
    "use strict";

    return Controller.extend(
      "com.invertions.sapfiorimodinv.controller.catalogs.Catalogs",
      {
        // ---------------------------------------------------- INICIO DE LA VISTA

        onInit: function () {
          var oModel = new JSONModel();
          var that = this;

          this._oDialog = null;

          $.ajax({
            url: "http://localhost:4004/api/security/label/getAllLabels",
            method: "GET",
            success: function (data) {
              oModel.setData({ value: data.value });
              that.getView().setModel(oModel);
            },
          });
        },

        // ---------------------------------------------------- PARA FILTRAR EN LA TABLA

        onFilterChange: function (oEvent) {
          var sQuery = oEvent.getSource().getValue();
          var oTable = this.byId("catalogTable");
          var aItems = oTable.getItems();

          if (!sQuery) {
            aItems.forEach(function (oItem) {
              oItem.setVisible(true);
            });
            return;
          }

          aItems.forEach(function (oItem) {
            var oContext = oItem.getBindingContext();
            if (!oContext) return;

            var oData = oContext.getObject();
            var bVisible = Object.keys(oData).some(function (sKey) {
              var value = oData[sKey];

              if (typeof value === "string") {
                return value.toLowerCase().includes(sQuery.toLowerCase());
              } else if (typeof value === "number") {
                return value.toString().includes(sQuery);
              }

              return false;
            });

            oItem.setVisible(bVisible);
          });
        },

        // ---------------------------------------------------- PARA AGREGAR UN NUEVO LABEL

        onAddCatalog: function () {
          // Inicializa el modelo con estructura completa
          var oModel = new JSONModel({
            COMPANYID: "0",
            CEDIID: "0",
            LABELID: "",
            LABEL: "",
            INDEX: "",
            COLLECTION: "",
            SECTION: "seguridad", // Valor por defecto
            SEQUENCE: 10, // Valor por defecto
            IMAGE: "",
            DESCRIPTION: "",
            DETAIL_ROW: {
              ACTIVED: true,
              DELETED: false,
              DETAIL_ROW_REG: [
                {
                  CURRENT: false,
                  REGDATE: new Date().toISOString(),
                  REGTIME: new Date().toISOString(),
                  REGUSER: "FIBARRAC",
                },
                {
                  CURRENT: true,
                  REGDATE: new Date().toISOString(),
                  REGTIME: new Date().toISOString(),
                  REGUSER: "FIBARRAC",
                },
              ],
            },
          });

          this.getView().setModel(oModel, "addCatalogModel");

          // Cargar el diálogo si no existe
          if (!this._oAddDialog) {
            Fragment.load({
              id: this.getView().getId(),
              name: "com.invertions.sapfiorimodinv.view.catalogs.fragments.AddCatalogDialog",
              controller: this,
            }).then(
              function (oDialog) {
                this._oAddDialog = oDialog;
                // @ts-ignore
                this.getView().addDependent(oDialog);
                oDialog.open();
              }.bind(this)
            );
          } else {
            this._oAddDialog.open();
          }
        },

        onSaveCatalog: function () {
          var oModel = this.getView().getModel("addCatalogModel");
          var oData = oModel.getData();

          // Validación básica
          if (!oData.LABELID || !oData.LABEL) {
            MessageToast.show("LABELID y LABEL son campos requeridos");
            return;
          }

          // Construir solo el objeto con las propiedades necesarias
          var labelPayload = {
            LABELID: oData.LABELID,
            LABEL: oData.LABEL,
            INDEX: oData.INDEX,
            COLLECTION: oData.COLLECTION,
            SECTION: oData.SECTION,
            SEQUENCE: oData.SEQUENCE,
            IMAGE: oData.IMAGE,
            DESCRIPTION: oData.DESCRIPTION,
          };

          var payload = {
            label: labelPayload,
          };

          $.ajax({
            url: "http://localhost:4004/api/security/label/createLabel",
            method: "POST",
            contentType: "application/json",
            data: JSON.stringify(payload),
            success: function (response) {
              MessageToast.show("Catálogo agregado correctamente");
              this._oAddDialog.close();

              // Agregar el nuevo registro al modelo de tabla
              var oTableModel = this.getView().getModel();
              var aData = oTableModel.getProperty("/value") || [];
              aData.push(oData);
              oTableModel.setProperty("/value", aData);
            }.bind(this),
            error: function (error) {
              MessageToast.show("Error al guardar: " + error.responseText);
            },
          });
        },

        

        onCancelAddCatalog: function () {
          if (this._oAddDialog) {
            this._oAddDialog.close();
          }
        },

        // ---------------------------------------------------- FIN PARA AGREGAR UN NUEVO LABEL

        // ---------------------------------------------------- PARA EDITAR UN LABEL

        onEditPressed: function () {
          if (!this._oSelectedItem) return;

          var oContext = this._oSelectedItem.getBindingContext();
          var oData = oContext.getObject();

          // Crear modelo para edición
          var oEditModel = new JSONModel($.extend(true, {}, oData));
          this.getView().setModel(oEditModel, "editModel");

          // Cargar diálogo de edición
          if (!this._oEditDialog) {
            Fragment.load({
              id: this.getView().getId(),
              name: "com.invertions.sapfiorimodinv.view.catalogs.fragments.EditCatalogDialog",
              controller: this,
            }).then(
              function (oDialog) {
                this._oEditDialog = oDialog;
                // @ts-ignore
                this.getView().addDependent(oDialog);
                oDialog.open();
              }.bind(this)
            );
          } else {
            this._oEditDialog.open();
          }
        },

        onSaveEdit: function () {
          var oEditModel = this.getView().getModel("editModel");
          var oEditedData = oEditModel.getData();

          // Obtener el modelo de la tabla
          var oTableModel = this.getView().getModel();
          var aData = oTableModel.getProperty("/value") || [];

          // Construir payload según espera el backend
          var payload = {
            labelid: oEditedData.LABELID, // <-- en minúscula y sin _id
            label: {
              LABEL: oEditedData.LABEL,
              INDEX: oEditedData.INDEX,
              COLLECTION: oEditedData.COLLECTION,
              SEQUENCE: oEditedData.SEQUENCE,
              IMAGE: oEditedData.IMAGE,
              DESCRIPTION: oEditedData.DESCRIPTION,
              SECTION: oEditedData.SECTION,
            },
          };

          $.ajax({
            url: "http://localhost:4004/api/security/label/updateLabel",
            method: "POST",
            contentType: "application/json",
            data: JSON.stringify(payload),
            success: function (response) {
              MessageToast.show("Registro actualizado correctamente");
              this._oEditDialog.close();

              var updatedIndex = aData.findIndex(
                (item) => item.LABELID === oEditedData.LABELID
              );

              if (updatedIndex !== -1) {
                aData[updatedIndex] = {
                  ...aData[updatedIndex],
                  ...payload.label,
                  LABELID: oEditedData.LABELID,
                };
                oTableModel.setProperty("/value", aData);
              }
            }.bind(this),
            error: function (error) {
              MessageToast.show("Error al actualizar: " + error.responseText);
            }.bind(this),
          });
        },

        onCancelEdit: function () {
          if (this._oEditDialog) {
            this._oEditDialog.close();
          }
        },

        // ---------------------------------------------------- FIN PARA EDITAR UN LABEL

        // ---------------------------------------------------- PARA ELIMINAR UN LABEL

        onDeletePressed: function () {
          if (!this._oSelectedItem) return;

          var oContext = this._oSelectedItem.getBindingContext();
          var oData = oContext.getObject();

          MessageBox.confirm("¿Está seguro de eliminar este registro?", {
            actions: [MessageBox.Action.YES, MessageBox.Action.NO],
            onClose: function (sAction) {
              if (sAction === MessageBox.Action.YES) {
                $.ajax({
                  url: "http://localhost:4004/api/security/label/deleteLabel",
                  method: "POST",
                  contentType: "application/json",
                  data: JSON.stringify({ labelid: oData.LABELID }),
                  success: function () {
                    MessageToast.show("Registro eliminado");

                    var oTableModel = this.getView().getModel();
                    var aData = oTableModel.getProperty("/value") || [];

                    var index = aData.findIndex(
                      (item) => item.LABELID === oData.LABELID
                    );
                    if (index !== -1) {
                      aData.splice(index, 1);
                      oTableModel.setProperty("/value", aData);
                    }
                  }.bind(this),
                  error: function (error) {
                    MessageToast.show(
                      "Error al eliminar: " + error.responseText
                    );
                  }.bind(this),
                });
              }
            }.bind(this),
          });
        },

        // ---------------------------------------------------- FIN PARA ELIMINAR UN LABEL

        // ---------------------------------------------------- ELIMINADO/ACTIVADO LOGICO

        onActivatePressed: function () {
          this._changeStatus(true);
        },

        onDeactivatePressed: function () {
          this._changeStatus(false);
        },

        _changeStatus: function (bActivate) {
          if (!this._oSelectedItem) {
            console.log("No hay ítem seleccionado");
            return;
          }

          var oContext = this._oSelectedItem.getBindingContext();
          var oData = oContext.getObject();

          var sStatusMessage = bActivate ? "activado" : "desactivado";

          var oTableModel = this.getView().getModel();
          var aData = oTableModel.getProperty("/value") || [];

          // Selecciona la URL según la acción (notar mayúscula en ActivateLabel)
          var url = bActivate
            ? "http://localhost:4004/api/security/label/ActivateLabel"
            : "http://localhost:4004/api/security/label/deactivateLabel";

          $.ajax({
            url: url,
            method: "POST",
            contentType: "application/json",
            data: JSON.stringify({
              labelid: oData.LABELID,
            }),
            success: function () {
              var index = aData.findIndex(
                (item) => item.LABELID === oData.LABELID
              );
              if (index !== -1) {
                aData[index].DETAIL_ROW.ACTIVED = bActivate;
                oTableModel.setProperty("/value", aData);
              }

              this.byId("activateButton").setVisible(!bActivate);
              this.byId("activateButton").setEnabled(!bActivate);
              this.byId("deactivateButton").setVisible(bActivate);
              this.byId("deactivateButton").setEnabled(bActivate);

              MessageToast.show(
                "Registro " + oData.LABELID + ": " + sStatusMessage
              );
            }.bind(this),
            error: function (error) {
              MessageToast.show("Error: " + error.responseText);
            }.bind(this),
          });
        },

        // ---------------------------------------------------- FIN ELIMINADO/ACTIVADO LOGICO

        // Evento cuando cambia la selección en la tabla
        onSelectionChange: function (oEvent) {
          var oTable = oEvent.getSource();
          var oSelectedItem = oTable.getSelectedItem();

          this._oSelectedItem = oSelectedItem;

          // Obtener contexto y datos del item seleccionado
          var oContext = oSelectedItem
            ? oSelectedItem.getBindingContext()
            : null;
          var oData = oContext ? oContext.getObject() : null;

          // Referencias a los botones
          var oEditButton = this.byId("editButton");
          var oActivateButton = this.byId("activateButton");
          var oDeactivateButton = this.byId("deactivateButton");
          var oDeleteButton = this.byId("deleteButton");

          if (oData) {
            // Habilitar los botones generales
            oEditButton.setEnabled(true);
            oDeleteButton.setEnabled(true);

            var bActive = oData.DETAIL_ROW && oData.DETAIL_ROW.ACTIVED;

            // Mostrar y habilitar solo el botón correspondiente
            oActivateButton.setVisible(!bActive);
            oActivateButton.setEnabled(!bActive);

            oDeactivateButton.setVisible(bActive);
            oDeactivateButton.setEnabled(bActive);
          } else {
            // Sin selección, deshabilitar todo
            oEditButton.setEnabled(false);
            oActivateButton.setEnabled(false);
            oActivateButton.setVisible(true); // Para que no desaparezca
            oDeactivateButton.setEnabled(false);
            oDeactivateButton.setVisible(false);
            oDeleteButton.setEnabled(false);
          }
        },

        _refreshCatalogTable: function () {
          // Implementa la lógica para refrescar los datos de la tabla
          // @ts-ignore
          var oTable = this.byId("catalogTable");
          var oModel = this.getView().getModel();

          $.ajax({
            url: "http://localhost:4004/api/security/label/getAllLabels",
            method: "GET",
            success: function (data) {
              oModel.setData({ value: data.value });
            },
          });
        },
      }
    );
  }
);

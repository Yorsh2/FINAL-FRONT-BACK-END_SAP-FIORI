sap.ui.define([
  "com/invertions/sapfiorimodinv/controller/BaseController",
  "sap/ui/model/json/JSONModel",
  "sap/base/Log",
  "sap/m/MessageToast",
  "sap/m/MessageBox",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "sap/ui/core/Fragment"
], function (
  BaseController,
  JSONModel,
  Log,
  MessageToast,
  MessageBox,
  Filter,
  FilterOperator,
  Fragment
) {
  "use strict";

  return BaseController.extend("com.invertions.sapfiorimodinv.controller.security.RolesMaster", {

    onInit: function () {
      this._pDialog = null;
      this.loadRoles();
    },

    onAfterRendering: function () {
      const oTable = this.byId("rolesTable");
      const oDomRef = oTable.getDomRef();

      if (oDomRef) {
        oDomRef.addEventListener("dblclick", this.onRowDoubleClick.bind(this));
      }
    },
    //FUNCION SELECCION DOBLE CLICK
    onRowDoubleClick: function (oEvent) {
      const oTable = this.byId("rolesTable");
      const iIndex = oTable.getSelectedIndex();
      if (iIndex === -1) return;

      const oContext = oTable.getContextByIndex(iIndex);
      const oSelectedRole = oContext.getObject();

      const oSelectedRoleModel = new JSONModel(oSelectedRole);
      this.getOwnerComponent().setModel(oSelectedRoleModel, "selectedRole");

      this.getOwnerComponent().getRouter().navTo("RouteRolesDetail", {
        roleId: encodeURIComponent(oSelectedRole.ROLEID)
      });
    },

    onDialogClose: function () {
      if (this._pDialog) this._pDialog.close();
      if (this._pEditDialog) this._pEditDialog.close();
    },
    //cargamos los roles A LA TABLA
    loadRoles: function () {
      const oView = this.getView();
      const oModel = new JSONModel();

      fetch("http://localhost:3333/api/security/rol/getall")
        .then(res => res.json())
        .then(data => {
          oModel.setData({
            value: data.value,
            filterKey: "all"
          });
          oView.setModel(oModel, "roles");
        })
        .catch(error => {
          Log.error("Error al cargar roles", error);
          MessageBox.error("No se pudieron cargar los roles.");
        });
    },

    onRefresh: function () {
      this.loadRoles();
    },


    //quitar privilegios
    onRemovePrivilege: function (oEvent) {
      const oSource = oEvent.getSource();

      // Detecta el contexto y el nombre del modelo (newRoleModel o editRole)
      const aModels = ["newRoleModel", "editRole"];
      let oContext, sModelName;

      for (let model of aModels) {
        oContext = oSource.getBindingContext(model);
        if (oContext) {
          sModelName = model;
          break;
        }
      }

      if (!oContext) {
        MessageBox.error("No se pudo obtener el contexto del privilegio.");
        return;
      }

      const oModel = oContext.getModel();          // Obtiene el modelo detectado
      const oData = oModel.getData();              // Datos del modelo
      const sPath = oContext.getPath();            // Ej: /PRIVILEGES/1
      const iIndex = parseInt(sPath.split("/")[2]);

      if (!isNaN(iIndex)) {
        oData.PRIVILEGES.splice(iIndex, 1);        // Elimina el elemento
        oModel.refresh(true);                      // Refresca la vista
      }
    },


    //funcion boton save guardar en el boton edit 
    onSaveRoleEdit: async function () {
      const oModel = this.getView().getModel("editRole");
      const data = oModel.getData();

      if (!data.ROLEID || !data.ROLENAME || !data.DESCRIPTION || !Array.isArray(data.PRIVILEGES) || data.PRIVILEGES.length === 0) {
        MessageBox.warning("Completa todos los campos y asigna al menos un privilegio.");
        return;
      }

      const now = new Date();

      const payload = {
        roles: {
          ROLEID: data.ROLEID,
          ROLENAME: data.ROLENAME,
          DESCRIPTION: data.DESCRIPTION,
          PRIVILEGES: data.PRIVILEGES.map(p => ({
            PROCESSID: p.PROCESSID,
            PRIVILEGEID: p.PRIVILEGEID
          }))
        }
      };

      try {
        const res = await fetch("http://localhost:3333/api/security/rol/updateItem", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        const result = await res.json();

        if (res.ok) {
          MessageToast.show("Rol actualizado correctamente");
          this._pEditDialog.close();
          this.loadRoles();
        } else {
          MessageBox.error("Error: " + (result.message || "Error desconocido"));
        }
      } catch (e) {
        console.error("Error en la actualización:", e);
        MessageBox.error("No se pudo conectar con el servidor");
      }
    },



    //agregar privilegios
    onAddPrivilege: function () {
      const oView = this.getView();

      // Detectar si estás en modo crear o editar
      const oModel = oView.getModel("editRole") || oView.getModel("newRoleModel");
      const oData = oModel.getData();

      const sProcess = oData.NEW_PROCESSID;
      const aPrivileges = oData.NEW_PRIVILEGES;

      if (!sProcess || !aPrivileges || aPrivileges.length === 0) {
        MessageToast.show("Selecciona un proceso y al menos un privilegio.");
        return;
      }

      // Validar duplicado por proceso
      const bExiste = oData.PRIVILEGES.some(p => p.PROCESSID === sProcess);
      if (bExiste) {
        MessageToast.show("Ya agregaste privilegios para este proceso.");
        return;
      }

      // Asignar correctamente los privilegios con el proceso
      const aNuevos = aPrivileges.map(privId => ({
        PROCESSID: sProcess,
        PRIVILEGEID: privId
      }));

      oData.PRIVILEGES = oData.PRIVILEGES.concat(aNuevos);
      oData.NEW_PROCESSID = "";
      oData.NEW_PRIVILEGES = [];

      oModel.setData(oData);
    },

    onGoToPrivileges: function () {
      MessageToast.show("Funcionalidad aún no implementada.");
    },

    formatPrivileges: function (privs) {
      if (!Array.isArray(privs)) return "";
      return privs.map(p => {
        const pid = p.PROCESSID || "SinProceso";
        const actions = Array.isArray(p.PRIVILEGEID)
          ? p.PRIVILEGEID.join(", ")
          : p.PRIVILEGEID || ""; // fallback si es string
        return `${pid}: ${actions}`;
      }).join("\n");
    },

    formatRegDate: function (detailRow) {
      return detailRow?.DETAIL_ROW_REG?.[0]?.REGDATE || "-";
    },
    formatRegTime: function (detailRow) {
      return detailRow?.DETAIL_ROW_REG?.[0]?.REGTIME || "-";
    },
    formatRegUser: function (detailRow) {
      return detailRow?.DETAIL_ROW_REG?.[0]?.REGUSER || "-";
    },

    onStatusFilterChange: function (oEvent) {
      const sKey = oEvent.getSource().getSelectedKey();
      const oModel = this.getView().getModel("roles");
      const allRoles = oModel.getProperty("/valueAll") || [];
      let filtered = [];

      switch (sKey) {
        case "active":
          filtered = allRoles.filter(r => r.DETAIL_ROW?.ACTIVED && !r.DETAIL_ROW?.DELETED);
          break;
        case "inactive":
          filtered = allRoles.filter(r => !r.DETAIL_ROW?.ACTIVED && !r.DETAIL_ROW?.DELETED);
          break;
        default:
          filtered = allRoles.filter(r => !r.DETAIL_ROW?.DELETED);
      }

      oModel.setProperty("/value", filtered);
      oModel.setProperty("/filterKey", sKey);
    },

    onMultiSearch: function () {
      const sQuery = this.byId("searchRoleName").getValue().toLowerCase();
      const oBinding = this.byId("rolesTable").getBinding("rows");
      const aFilters = sQuery
        ? [new Filter("ROLENAME", FilterOperator.Contains, sQuery)]
        : [];
      oBinding.filter(aFilters);
    },

    onRoleSelected: function () {
      const oTable = this.byId("rolesTable");
      const iIndex = oTable.getSelectedIndex();

      if (iIndex === -1) return;

      const oContext = oTable.getContextByIndex(iIndex);
      const oSelectedRole = oContext.getObject();

      const oSelectedRoleModel = new JSONModel(oSelectedRole);
      this.getOwnerComponent().setModel(oSelectedRoleModel, "selectedRole");

      this.getOwnerComponent().getRouter().navTo("RouteRolesDetail", {
        roleId: encodeURIComponent(oSelectedRole.ROLEID)
      });
    },

    //CARGAGAR VENTANA DE AGREGAR ROL
    onOpenDialog: async function () {
      // 1. Cargar fragmento si no existe
      if (!this._pDialog) {
        this._pDialog = await Fragment.load({
          name: "com.invertions.sapfiorimodinv.view.security.fragments.AddRoleDialog",
          controller: this
        });
        this.getView().addDependent(this._pDialog);
      }

      // 2. Inicializar modelo vacío para el nuevo rol
      this.getView().setModel(new JSONModel({
        ROLEID: "",
        ROLENAME: "",
        DESCRIPTION: "",
        ACTIVO: true,
        NEW_PROCESSID: "",
        NEW_PRIVILEGES: [],
        PRIVILEGES: []
      }), "newRoleModel");

    // 3. Cargar procesos
    fetch("http://localhost:3333/api/security/process/getAllProcesses")
    .then(res => res.json())
    .then(data => {
      // Filtrar procesos válidos según LABELID, por ejemplo "IdProcess"
      const filteredProcesses = data.value.filter(p => p.LABELID === "IdProcess");

      const oProcessModel = new JSONModel();
      oProcessModel.setData({ values: filteredProcesses });
      this.getView().setModel(oProcessModel, "processCatalogModel");
    });

      // 4. Cargar privilegios
      fetch("http://localhost:3333/api/security/values/getAllValues")
        .then(res => res.json())
        .then(data => {
          const privilegeItems = data.value.filter(v => v.LABELID === "IdPrivileges");
          const oPrivilegeModel = new JSONModel({ values: privilegeItems });
          this.getView().setModel(oPrivilegeModel, "privilegeCatalogModel");
        });

      // 5. Abrir el diálogo
      this._pDialog.setTitle("Crear Rol");
      this._pDialog.open();
    },

    ///  FUNCION AGREGAAR ROL///
    onSaveRole: async function () {
      const oView = this.getView();
      const oModel = oView.getModel("newRoleModel");
      const roleData = oModel.getData();

      const { ROLEID, ROLENAME, DESCRIPTION, PRIVILEGES } = roleData;

      if (!ROLEID || !ROLENAME || !DESCRIPTION || PRIVILEGES.length === 0) {
        MessageBox.warning("Completa todos los campos requeridos y añade al menos un privilegio.");
        return;
      }

      const now = new Date();
      const payload = {
        roles: {
          ROLEID,
          ROLENAME,
          DESCRIPTION,
          ACTIVO: true,
          DETAIL_ROW: {
            DETAIL_ROW_REG: [{
              CURRENT: true,
              REGDATE: now.toISOString(),
              REGTIME: now.toISOString(), // ISO válido
              REGUSER: "admin"
            }]
          },
          PRIVILEGES: PRIVILEGES.map(p => ({
            PROCESSID: p.PROCESSID,
            PRIVILEGEID: p.PRIVILEGEID
          }))
        }
      };

      console.log("Payload a enviar:", payload);

      try {
        const res = await fetch("http://localhost:3333/api/security/rol/addOne", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        const result = await res.json(); // ✅ Solo una vez

        if (res.ok) {
          MessageToast.show("Rol guardado correctamente");
          if (this._pDialog) {
            this._pDialog.close();
          }
          this.loadRoles();
        } else {
          MessageBox.error("Error: " + result.message);
        }

      } catch (e) {
        console.error("Error en fetch:", e);
        MessageBox.error("No se pudo conectar con el servidor");
      }
    },


    //abrir ventana edit
    onEditRole: async function () {
      const oTable = this.byId("rolesTable");
      const iIndex = oTable.getSelectedIndex();

      if (iIndex === -1) {
        MessageToast.show("Selecciona un rol para editar.");
        return;
      }

      const oContext = oTable.getContextByIndex(iIndex);
      const oSelected = oContext.getObject();
      // Cargar procesos
    const resProc = await fetch("http://localhost:3333/api/security/process/getAllProcesses");
    const dataProc = await resProc.json();
    // Filtrar procesos válidos, por ejemplo solo donde LABELID sea 'IdProcess'
    const filteredProcesses = dataProc.value.filter(p => p.LABELID === "IdProcess");

    const oProcessModel = new JSONModel({ values: filteredProcesses });
    this.getView().setModel(oProcessModel, "processCatalogModel");

      // Cargar privilegios
      const resPriv = await fetch("http://localhost:3333/api/security/values/getAllValues");
      const dataPriv = await resPriv.json();
      const privilegeItems = dataPriv.value.filter(v => v.LABELID === "IdPrivileges");
      const oPrivilegeModel = new JSONModel({ values: privilegeItems });
      this.getView().setModel(oPrivilegeModel, "privilegeCatalogModel");

      oSelected.NEW_PROCESSID = "";
      oSelected.NEW_PRIVILEGES = [];

      const oEditModel = new JSONModel(Object.assign({}, oSelected));
      this.getView().setModel(oEditModel, "editRole");

      if (!this._pEditDialog) {
        Fragment.load({
          name: "com.invertions.sapfiorimodinv.view.security.fragments.EditRoleDialog",
          controller: this
        }).then(oDialog => {
          this._pEditDialog = oDialog;
          this.getView().addDependent(oDialog);
          this._pEditDialog.open();
        });
      } else {
        this._pEditDialog.open();
      }
    },


    onDeleteRole: function () {
      const oTable = this.byId("rolesTable");
      const iIndex = oTable.getSelectedIndex();
      if (iIndex === -1) return MessageToast.show("Selecciona un rol.");

      const oContext = oTable.getContextByIndex(iIndex);
      const oData = oContext.getObject();

      MessageBox.confirm(`¿Deseas eliminar el rol ${oData.ROLENAME}?`, {
        title: "Confirmar eliminación",
        icon: MessageBox.Icon.WARNING,
        onClose: async (oAction) => {
          if (oAction === MessageBox.Action.OK) {
            try {
              const res = await fetch("http://localhost:3333/api/security/rol/deleteItem", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ROLEID: oData.ROLEID })
              });
              if (!res.ok) throw new Error(await res.text());

              MessageToast.show("Rol eliminado correctamente.");
              this.loadRoles();
            } catch (err) {
              MessageBox.error("Error al eliminar el rol: " + err.message);
            }
          }
        }
      });
    }
  });
});

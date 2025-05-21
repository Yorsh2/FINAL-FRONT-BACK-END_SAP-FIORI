
sap.ui.define([
    "com/invertions/sapfiorimodinv/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/base/Log",
    "sap/ui/core/Fragment",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (BaseController, JSONModel, Log, Fragment, MessageToast, MessageBox) {
    "use strict";

    return BaseController.extend("com.invertions.sapfiorimodinv.controller.security.UsersList", {

        onInit: function () {

            // Esto desactiva los botones cuando entras a la vista, hasta que selecciones un usuario en la tabla se activan
            var oViewModel = new JSONModel({
                buttonsEnabled: false
            });
            this.getView().setModel(oViewModel, "viewModel");
            // Carga los usuarios
            this.loadUsers();
        },

        //=========================================================================================================================================================
        //=============== AÑADIR USUARIO ==========================================================================================================================
        //=========================================================================================================================================================

        // ---- Vista para Crear usuario ----
        onAddUser: function () {
            var oView = this.getView();

            // 1. Verificar si ya tenemos el diálogo
            if (!this._oCreateUserDialog) {
                Fragment.load({
                    id: oView.getId(),
                    name: "com.invertions.sapfiorimodinv.view.security.fragments.AddUserDialog",
                    controller: this
                }).then((oDialog) => {
                    this._oCreateUserDialog = oDialog;
                    oView.addDependent(oDialog);

                    const oNewUserModel = new JSONModel({
                        USERID: "",
                        USERNAME: "",
                        EMAIL: "",
                        PHONENUMBER: "",
                        BIRTHDAYDATE: null,
                        COMPANYID: "",
                        DEPARTMENTID: "",
                        FUNCTION: "",
                        selectedRoles: []
                    });

                    oView.setModel(oNewUserModel, "newUser");

                    this.loadRoles();
                    this.loadCompanies();


                    this._oCreateUserDialog.open();
                });

            } else {
                this.resetNewUserModel();
                this._oCreateUserDialog.open();
            }
        },

        // Lógica para guardar la creación del usuario
        onSaveUser: async function () {
            const oView = this.getView();
            const oNewUser = oView.getModel("newUser").getData();
            var oModel = this.getView().getModel("newUser");

            const {
                USERID, USERNAME, EMAIL, PHONENUMBER,
                BIRTHDAYDATE, COMPANYID, DEPARTMENT, FUNCTION
            } = oNewUser;

            // Validación de campos obligatorios
            if (!USERID || !USERNAME || !EMAIL || !COMPANYID || !DEPARTMENT) {
                MessageBox.warning("Completa todos los campos obligatorios.");
                return;
            }

            var aSelectedRoles = oModel.getProperty("/selectedRoles") || [];

            if (aSelectedRoles.length === 0) {
                MessageBox.error("Debe seleccionar al menos un rol");
                return;
            }

            // Construir payload
            const now = new Date();
            const payload = {
                user: {
                    USERID,
                    USERNAME,
                    FIRSTNAME: USERNAME,
                    LASTNAME: "",
                    EMAIL,
                    PHONENUMBER,
                    BIRTHDAYDATE: BIRTHDAYDATE ? this.formatDateToString(BIRTHDAYDATE) : null,
                    COMPANYID,
                    DEPARTMENT,
                    FUNCTION,
                    ACTIVO: true,
                    DETAIL_ROW: {
                        DETAIL_ROW_REG: [{
                            CURRENT: true,
                            REGDATE: now.toISOString(),
                            REGTIME: now.toISOString(),
                            REGUSER: "admin"
                        }]
                    },
                    ROLES: aSelectedRoles.map(function (oRole) {
                        return { ROLEID: oRole.ROLEID };
                    })
                }
            };


            console.log("Payload de usuario:", payload);

            try {
                // Obtener configuración del entorno
                const envRes = await fetch("env.json");
                const env = await envRes.json();
                const url = env.API_USERS_URL_BASE + "createUser";

                // Enviar petición POST
                const res = await fetch(url, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": "Bearer " + env.API_TOKEN
                    },
                    body: JSON.stringify(payload)
                });

                const result = await res.json();

                if (res.ok) {
                    MessageToast.show("Usuario creado exitosamente");
                    this.byId("AddUserDialog").close();
                    this.resetNewUserModel();
                    // this.loadUsers();
                } else {
                    MessageBox.error("Error: " + (result.message || "No se pudo crear el usuario"));
                }

            } catch (e) {
                console.error("Error al guardar usuario:", e);
                MessageBox.error("Error de conexión con el servidor.");
            }
        },

        prepareUserPayload: function () {
            const oView = this.getView();
            const oUserModel = oView.getModel("newUser");
            const oRolesModel = oView.getModel("rolesModel");
            const oDeptosModel = oView.getModel("deptosModel");

            const userData = oUserModel.getData();

            // Obtener el nombre de la compañía
            const companyName = userData.COMPANYNAME || "";

            // Obtener el nombre del departamento basado en DEPARTMENTID
            let departmentName = "";
            if (oDeptosModel && oDeptosModel.getData() && Array.isArray(oDeptosModel.getData().value)) {
                const depto = oDeptosModel.getData().value.find(d => d.VALUEID === userData.DEPARTMENTID);
                if (depto) {
                    departmentName = depto.VALUE || "";  // Ajusta según la estructura real
                }
            }

            // Obtener los roles completos (con nombres) a partir de los ROLEIDs seleccionados
            let rolesWithNames = [];
            if (oRolesModel && Array.isArray(oRolesModel.getData().roles)) {
                rolesWithNames = userData.ROLES.map(roleId => {
                    const foundRole = oRolesModel.getData().roles.find(r => r.ROLEID === roleId);
                    if (foundRole) {
                        return {
                            ROLEID: foundRole.ROLEID,
                            ROLENAME: foundRole.ROLENAME,
                            ROLEIDSAP: foundRole.ROLEIDSAP || ""
                        };
                    }
                    return { ROLEID: roleId, ROLENAME: "", ROLEIDSAP: "" };
                });
            }

            // Construir el objeto final que enviarás
            const payload = {
                USERID: userData.USERID,
                USERNAME: userData.USERNAME,
                EMAIL: userData.EMAIL,
                PHONENUMBER: userData.PHONENUMBER,
                BIRTHDAYDATE: userData.BIRTHDAYDATE,
                COMPANY: companyName,
                DEPARTMENT: departmentName,
                FUNCTION: userData.FUNCTION,
                ROLES: rolesWithNames
            };

            return payload;
        },


        // Cancelar la creación del usuario
        onCancelUser: function () {
            const oDialog = this.byId("AddUserDialog");
            if (oDialog) {
                oDialog.close(); // Cerrar
            }

            this.resetNewUserModel(); // limpiar los campos
        },

        //=========================================================================================================================================================
        //=============== EDITAR USUARIO ==========================================================================================================================
        //=========================================================================================================================================================

        // --- Abrir modal para editar usuario --- 
        onEditUser: function () {
            var oView = this.getView();

            if (!this.selectedUser) {
                MessageToast.show("Selecciona un usuario primero");
                return;
            }

            if (!this._oEditUserDialog) {
                Fragment.load({
                    id: oView.getId(),
                    name: "com.invertions.sapfiorimodinv.view.security.fragments.EditUserDialog",
                    controller: this
                }).then(async oDialog => {
                    this._oEditUserDialog = oDialog;
                    oView.addDependent(oDialog);

                    // Cargar datos del usuario antes de abrir el diálogo
                    await this._loadUserDataForEdit(this.selectedUser.USERID);

                    this._oEditUserDialog.open();
                });
            } else {
                this._loadUserDataForEdit(this.selectedUser.USERID).then(() => {
                    this._oEditUserDialog.open();
                });
            }
        },

        onEditSaveUser: async function () {
            try {
                const oView = this.getView();
                oView.setBusy(true);

                // 1. Obtener datos del modelo de edición
                const oEditModel = oView.getModel("editUser");
                const oUserData = oEditModel.getData();

                // 2. Validaciones básicas
                if (!oUserData.USERID || !oUserData.USERNAME || !oUserData.EMAIL) {
                    MessageBox.error("Complete los campos obligatorios");
                    return;
                }

                // 3. Cargar configuración del entorno
                const envRes = await fetch("env.json");
                const env = await envRes.json();

                // 4. Construir payload
                const payload = {
                    user: {
                        USERID: oUserData.USERID,
                        USERNAME: oUserData.USERNAME,
                        EMAIL: oUserData.EMAIL,
                        PHONENUMBER: oUserData.PHONENUMBER,
                        BIRTHDAYDATE: oUserData.BIRTHDAYDATE ? this._formatDateForAPI(oUserData.BIRTHDAYDATE) : null,
                        COMPANYID: oUserData.COMPANYID,
                        DEPARTMENT: oUserData.DEPARTMENT,
                        FUNCTION: oUserData.FUNCTION,
                        ROLES: oUserData.selectedRoles.map(role => ({ ROLEID: role.ROLEID }))
                    }
                };

                // 5. Enviar petición de actualización
                const sUrl = `${env.API_USERS_URL_BASE}updateUser`;
                const response = await fetch(sUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${env.API_TOKEN}`
                    },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    throw new Error(`Error ${response.status}`);
                }

                const result = await response.json();

                if (result.success) {
                    MessageToast.show("Usuario actualizado correctamente");
                    this._oEditUserDialog.close();
                    this.loadUsers(); // Refrescar la lista
                } else {
                    MessageBox.error(result.message || "Error al actualizar el usuario");
                }

            } catch (error) {
                console.error("Error al guardar cambios:", error);
                MessageBox.error(`Error al guardar: ${error.message}`);
            } finally {
                this.getView().setBusy(false);
            }
        },

        onEditRoleSelected: function (oEvent) {
            const oSelectedItem = oEvent.getSource().getSelectedItem();
            if (!oSelectedItem) return;

            const sRoleId = oSelectedItem.getKey();
            const sRoleName = oSelectedItem.getText();

            const oModel = this.getView().getModel("editUser");
            const aRoles = oModel.getProperty("/selectedRoles") || [];

            // Verificar si ya está
            if (aRoles.some(role => role.ROLEID === sRoleId)) {
                MessageToast.show("Este rol ya fue agregado.");
                return;
            }

            aRoles.push({ ROLEID: sRoleId, ROLENAME: sRoleName });
            oModel.setProperty("/selectedRoles", aRoles);

            this._updateSelectedRolesView(aRoles, true);
        },

        // Cancelar la edición del usuario
        onEditCancelUser: function () {
            if (this._oEditUserDialog) {
                this._oEditUserDialog.close();
            }
        },


        // =========================================================================================================================================================
        // ========= ELIMINAR USUARIO FISICAMENTE ==================================================================================================================
        // =========================================================================================================================================================

        /**
         * Función onDeleteUser .
         */
        onDeleteUser: function () {
            if (this.selectedUser) {
                var that = this;
                MessageBox.confirm("¿Deseas eliminar el usuario con nombre: " + this.selectedUser.USERNAME + "?", {
                    title: "Confirmar eliminación",
                    icon: MessageBox.Icon.WARNING,
                    onClose: function (oAction) {
                        if (oAction === MessageBox.Action.OK) {
                            that.deleteUser(that.selectedUser.USERID);
                        }
                    }
                });
            } else {
                MessageToast.show("Selecciona un usuario para eliminar de la base de datos");
            }
        },

        async deleteUser(UserId) {
            await this._executeUserAction(
                UserId,
                "physicalDeleteUser",
                "Usuario eliminado correctamente",
                "eliminación"
            );
        },


        // =========================================================================================================================================================
        // ============ DESACTIVAR EL USUARIO (ELIMINADOR LÓGICO) ==================================================================================================
        // =========================================================================================================================================================

        // Modal para desactivar usuario (eliminar lógico)
        onDesactivateUser: function () {
            if (this.selectedUser) {
                var that = this;
                MessageBox.confirm("¿Deseas desactivar el usuario con nombre: " + this.selectedUser.USERNAME + "?", {
                    title: "Confirmar desactivación",
                    icon: MessageBox.Icon.WARNING,
                    onClose: function (oAction) {
                        if (oAction === MessageBox.Action.OK) {
                            that.desactivateUser(that.selectedUser.USERID);
                        }
                    }
                });
            } else {
                MessageToast.show("Selecciona un usuario para desactivar");
            }
        },

        // Lógica para desactivar usuario (eliminar lógico)
        async desactivateUser(UserId) {
            await this._executeUserAction(
                UserId,
                "deleteusers",
                "Usuario desactivado correctamente",
                "desactivación"
            );
        },

        // =========================================================================================================================================================
        // ============== ACTIVAR EL USUARIO =======================================================================================================================
        // =========================================================================================================================================================

        onActivateUser: function () {
            if (this.selectedUser) {
                var that = this;
                MessageBox.confirm("¿Deseas activar el usuario con nombre: " + this.selectedUser.USERNAME + "?", {
                    title: "Confirmar activación",
                    icon: MessageBox.Icon.WARNING,
                    onClose: function (oAction) {
                        if (oAction === MessageBox.Action.OK) {
                            that.activateUser(that.selectedUser.USERID);
                        }
                    }
                });
            } else {
                MessageToast.show("Selecciona un usuario para activar");
            }
        },

        async activateUser(UserId) {
            await this._executeUserAction(
                UserId,
                "activateusers",
                "Usuario activado correctamente",
                "activación"
            );
        },

        //============================================================================================================================================
        //=============== FUNCIONES DE LA TABLA ======================================================================================================
        //============================================================================================================================================

        /**
         * Función que obtiene el usuario que se selecciona en la tabla en this.selectedUser se guarda todo el usuario
         * Además activa los botones de editar/eliminar/desactivar y activar
         */
        onUserRowSelected: function () {
            var oTable = this.byId("IdTable1UsersManageTable");
            var iSelectedIndex = oTable.getSelectedIndex();

            if (iSelectedIndex < 0) {
                this.getView().getModel("viewModel").setProperty("/buttonsEnabled", false);
                return;
            }

            var oContext = oTable.getContextByIndex(iSelectedIndex);
            var UserData = oContext.getObject();

            this.selectedUser = UserData;

            // Activa los botones
            this.getView().getModel("viewModel").setProperty("/buttonsEnabled", true);
        },

        onSearchUser: function () {
            //Aplicar el filtro de búsqueda para la tabla
        },

        onRefresh: function () {
            this.loadUsers();
        },

        //====================================================================================================================================================================
        //=========== FUNCIONES PARA CARGAR INFORMACIÓN ======================================================================================================================
        //====================================================================================================================================================================

        /*
            Funcion para cargar la lista de usuarios en la tabla
        */
        loadUsers: function () {
            var oTable = this.byId("IdTable1UsersManageTable");
            var oModel = new JSONModel();
            var that = this;
            /*
                En nuestro proyecto nosotros creamos un archivo llamado en.json para cargar la url de las apis
                Cambiar esto segun su backend
            */
            fetch("env.json")
                .then(res => res.json())
                .then(env => fetch(env.API_USERS_URL_BASE + "getAllUsers"))
                .then(res => res.json())
                .then(data => {
                    data.value.forEach(user => {
                        // user.ROLES = that.formatRoles(user.ROLES);
                    });
                    oModel.setData(data);
                    that.getView().setModel(oModel);

                })
                .catch(err => {
                    if (err.message === ("Cannot read properties of undefined (reading 'setModel')")) {
                        return;
                    } else {
                        MessageToast.show("Error al cargar usuarios: " + err.message);
                    }
                });
        },
        /* 
            Carga las compañias que se encuentran registradas en la base de datos.
            Las compañias tendran diferentes departamentos registrados, por lo que es primero elegir una
            compañia antes que un departamento.
        */
        loadCompanies: function () {
            var that = this;
            var oModel = new JSONModel();

            fetch("env.json")
                .then(res => res.json())
                .then(env => fetch(env.API_VALUES_URL_BASE + "getLabelById?labelid=IdCompanies"))
                .then(res => res.json())
                .then(data => {
                    oModel.setData(data); // { value: [...] }
                    that.getView().setModel(oModel, "companiesModel");
                    this.loadDeptos();
                })
                .catch(err => {
                    MessageToast.show("Error al cargar las compañías: " + err.message);
                });
        },

        /* 
            Carga los departamentos que se encuentran en la base de datos.
            Esta función mostrará información diferente dependiendo de los departamentos
            registrados en cada compañia, por lo que primero tiene que hacer la consulta
            de las compañias y elegir una para ejecutar esta función.
        */
        loadDeptos: function (companyId) {
            var that = this;
            var oModel = new JSONModel();

            fetch("env.json")
                .then(res => res.json())
                .then(env => {
                    var url = env.API_VALUES_URL_BASE + "getCompanyById?companyid=" + encodeURIComponent(companyId);
                    return fetch(url);
                })
                .then(res => res.json())
                .then(data => {
                    oModel.setData(data); // { value: [...] }
                    that.getView().setModel(oModel, "deptosModel");
                })
                .catch(err => {
                    MessageToast.show("Error al cargar los departamentos: " + err.message);
                });
        },


        /*
            Funciones para cargar en los combobox para creación y edición de usuario
            Asi como tambien el formato que se mostrará en la tabla
         */
        loadRoles: function () {
            var oView = this.getView();
            var oRolesModel = new JSONModel();

            fetch("env.json")
                .then(res => res.json())
                .then(env => fetch(env.API_ROLES_URL_BASE + "getall"))
                .then(res => res.json())
                .then(data => {

                    // 1. Extraer solo los roles únicos
                    const uniqueRoles = [];
                    const seen = new Set();

                    data.value.forEach(role => {
                        if (!seen.has(role.ROLENAME)) {
                            seen.add(role.ROLENAME);
                            uniqueRoles.push({
                                ROLEID: role.ROLEID,
                                ROLENAME: role.ROLENAME
                            });
                        }
                    });


                    // 2. Establecer en el modelo
                    oRolesModel.setData({ roles: uniqueRoles });
                    oView.setModel(oRolesModel, "rolesModel");
                })
                .catch(err => MessageToast.show("Error al cargar roles: " + err.message));
        },

        onRoleSelected: function (oEvent) {
            const oComboBox = oEvent.getSource();
            const sDialogId = oComboBox.getId().includes("Edit") ? "Edit" : "Add";

            const sSelectedKey = oComboBox.getSelectedKey();
            const sSelectedText = oComboBox.getSelectedItem().getText();

            const oModel = this.getView().getModel(sDialogId === "Edit" ? "editUser" : "newUser");
            const aSelectedRoles = oModel.getProperty("/selectedRoles") || [];

            // Validar duplicados
            if (aSelectedRoles.some(role => role.ROLEID === sSelectedKey)) {
                MessageToast.show("Este rol ya fue seleccionado");
                return;
            }

            // Agregar nuevo rol
            aSelectedRoles.push({
                ROLEID: sSelectedKey,
                ROLENAME: sSelectedText
            });

            oModel.setProperty("/selectedRoles", aSelectedRoles);
            this._updateSelectedRolesView(aSelectedRoles, sDialogId === "Edit");

            // Limpiar selección
            oComboBox.setSelectedKey(null);
        },

        _updateSelectedRolesView: function (aRoles, bIsEditDialog) {
            var oVBox = this.byId(bIsEditDialog ? "selectedEditRolesVBox" : "selectedRolesVBox");
            oVBox.destroyItems();

            aRoles.forEach(function (oRole) {
                var oHBox = new sap.m.HBox({
                    items: [
                        new sap.m.Label({
                            text: oRole.ROLENAME
                        }).addStyleClass("sapUiSmallMarginEnd"),
                        new sap.m.Button({
                            icon: "sap-icon://decline",
                            type: sap.m.ButtonType.Transparent,
                            press: this._onRemoveRole.bind(this, oRole.ROLEID, bIsEditDialog)
                        })
                    ]
                });
                oHBox.data("roleId", oRole.ROLEID);
                oVBox.addItem(oHBox);
            }.bind(this));
        },


        _onRemoveRole: function (sRoleId, bIsEditDialog) {
            const sModelName = bIsEditDialog ? "editUser" : "newUser";
            const oModel = this.getView().getModel(sModelName);

            const aSelectedRoles = oModel.getProperty("/selectedRoles").filter(
                role => role.ROLEID !== sRoleId
            );

            oModel.setProperty("/selectedRoles", aSelectedRoles);
            this._updateSelectedRolesView(aSelectedRoles, bIsEditDialog);
        },

        /*
            Formato que se muestren de los roles en la tabla.
        */
        formatRoles: function (aRoles) {
            if (!Array.isArray(aRoles)) {
                return "";
            }

            const aRoleNames = aRoles.map(function (oRole) {
                // Usar ROLEIDSAP si está disponible y no está vacío, si no usar ROLEID
                return oRole.ROLEIDSAP?.trim() || oRole.ROLEID?.trim() || "";
            }).filter(Boolean); // Eliminar valores vacíos

            // console.log("Estos son los roles:", aRoleNames.join(", "));

            return aRoleNames.join(", ");
        },

        //=======================================================================================================================================================
        //=========== Funciones de validaciones o extras ========================================================================================================
        //=======================================================================================================================================================

        isValidEmail: function (email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(email);
        },

        isValidPhoneNumber: function (phone) {
            return /^\d{10}$/.test(phone); // Ejemplo: 10 dígitos numéricos
        },

        resetNewUserModel: function () {
            const oView = this.getView();
            // Limpiar visualmente los campos ComboBox y DatePicker
            // oView.byId("comboBoxCompanies").setSelectedKey(null);
            oView.byId("comboBoxCompanies").setValue("");

            // oView.byId("comboBoxCedis").setSelectedKey(null);
            oView.byId("comboBoxCedis").setValue("");

            // oView.byId("comboBoxRoles").setSelectedKey(null);
            oView.byId("comboBoxRoles").setValue("");

            oView.byId("inputUserBirthdayDate").setDateValue(null);

            // Limpiar los roles seleccionados del VBox visual
            const rolesVBox = oView.byId("selectedRolesVBox");
            rolesVBox.removeAllItems();

            // También puedes resetear otros campos si lo deseas
            oView.byId("inputUserId").setValue("");
            oView.byId("inputUsername").setValue("");
            oView.byId("inputUserPhoneNumber").setValue("");
            oView.byId("inputUserEmail").setValue("");
            oView.byId("inputUserFunction").setValue("");

            oView.setModel(new JSONModel({
                USERID: "",
                USERNAME: "",
                EMAIL: "",
                PHONENUMBER: "",
                BIRTHDAYDATE: null,
                COMPANYID: "",
                DEPARTMENTID: "",
                FUNCTION: "",
                ROLES: []
            }), "newUser");

        },

        //----------------------------------------------------------------------------------------------------------------------------------------------------
        // Formato del texto para la columna de STATUS
        formatStatusText: function (bIsActive) {
            return bIsActive ? "Activo" : "Inactivo";
        },

        formatStatusState: function (bIsActive) {
            return bIsActive ? "Success" : "Warning";
        },
        //----------------------------------------------------------------------------------------------------------------------------------------------------
        // Para guardar el VALUEID al seleccionar compañia
        onCompanySelected: function (oEvent) {
            const oView = this.getView();
            const oComboBox = oEvent.getSource();
            const oSelectedItem = oComboBox.getSelectedItem();

            if (!oSelectedItem) { return; }

            const sCompanyId = oSelectedItem.getKey();   // VALUEID
            const sCompanyName = oSelectedItem.getText(); // VALUE

            // 1. Limpiar ComboBox de CEDIS (departamentos)
            const oDeptosModel = new sap.ui.model.json.JSONModel({ value: [] });
            oView.setModel(oDeptosModel, "deptosModel");

            // 2. Limpiar selección visual de comboBoxCedis
            const oCedisComboBox = oView.byId("comboBoxCedis");
            // oCedisComboBox.setSelectedKey(null);
            oCedisComboBox.setValue("");

            // 3. Actualizar el modelo del nuevo usuario
            const oUserModel = oView.getModel("newUser");
            oUserModel.setProperty("/COMPANYID", sCompanyId);
            oUserModel.setProperty("/COMPANYNAME", sCompanyName);
            oUserModel.setProperty("/CEDIID", "");
            oUserModel.setProperty("/CEDINAME", "");

            // 4. Llamar a la función para cargar departamentos
            this.loadDeptos(sCompanyId);
        },

        formatDateToString: function (oDate) {
            if (!(oDate instanceof Date)) return null;
            const day = String(oDate.getDate()).padStart(2, "0");
            const month = String(oDate.getMonth() + 1).padStart(2, "0");
            const year = oDate.getFullYear();
            return `${day}.${month}.${year}`;
        },

        /*
            Función que permite reutilizar codigo para aquellas rutas que tienen la misma estructura
        */
        async _executeUserAction(UserId, sEndpoint, sSuccessMessage, sActionName) {
            try {
                const oView = this.getView();
                oView.setBusy(true);

                // 1. Cargar configuración del entorno
                const envRes = await fetch("env.json");
                const env = await envRes.json();

                // 2. Construir URL según el endpoint
                const sUrl = `${env.API_USERS_URL_BASE}${sEndpoint}?${sEndpoint === 'physicalDeleteUser' ? 'userid' : 'USERID'}=${encodeURIComponent(UserId)}`;

                // 3. Configurar y enviar petición
                const response = await fetch(sUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${env.API_TOKEN}`
                    }
                });

                // 4. Procesar respuesta de forma segura
                let result = {};
                try {
                    result = await response.json();
                } catch (parseError) {
                    console.error(`Error al parsear la respuesta JSON (${sActionName}):`, parseError);
                    MessageBox.error("Respuesta del servidor no válida");
                    return;
                }

                // 5. Validar éxito de la operación
                if (response.ok || result.success === true || result.deleted === true || result.status === "success") {
                    MessageToast.show(sSuccessMessage);
                    this.loadUsers();

                    // Limpiar selección
                    this.selectedUser = null;
                    this.getView().getModel("viewModel").setProperty("/buttonsEnabled", false);
                } else {
                    const sMessage = result.message || result.error || `El usuario no pudo ser ${sActionName === 'eliminación' ? 'eliminado' : 'desactivado'}`;
                    MessageBox.error(sMessage);
                }

            } catch (error) {
                console.error(`Error en ${sActionName}:`, error);

                let sErrorMessage = `Error durante la ${sActionName}`;
                if (error.message.includes("Failed to fetch")) {
                    sErrorMessage = "Error de conexión con el servidor";
                } else if (error.message.includes("404")) {
                    sErrorMessage = "El usuario ya no existe";
                }

                MessageBox.error(`${sErrorMessage}: ${error.message}`);
            } finally {
                this.getView().setBusy(false);
            }
        },

        // Cargar los datos en la vista de Editar
        async _loadUserDataForEdit(UserId) {
            try {
                const oView = this.getView();
                oView.setBusy(true);

                // 1. Cargar configuración del entorno
                const envRes = await fetch("env.json");
                const env = await envRes.json();

                // 2. Obtener datos del usuario
                const sUrl = `${env.API_USERS_URL_BASE}getUserById?userid=${encodeURIComponent(UserId)}`;
                const response = await fetch(sUrl, {
                    headers: {
                        "Authorization": `Bearer ${env.API_TOKEN}`
                    }
                });

                if (!response.ok) {
                    throw new Error(`Error ${response.status}`);
                }

                const oUserData = await response.json();

                // 3. Crear modelo para el formulario de edición
                const oEditModel = new JSONModel({
                    USERID: oUserData.USERID,
                    USERNAME: oUserData.USERNAME,
                    EMAIL: oUserData.EMAIL,
                    PHONENUMBER: oUserData.PHONENUMBER,
                    BIRTHDAYDATE: oUserData.BIRTHDAYDATE ? new Date(oUserData.BIRTHDAYDATE) : null,
                    COMPANYID: oUserData.COMPANYID,
                    DEPARTMENT: oUserData.DEPARTMENT,
                    FUNCTION: oUserData.FUNCTION,
                    selectedRoles: oUserData.ROLES || []
                });

                oView.setModel(oEditModel, "editUser");

                // 4. Cargar comboboxes
                await this.loadCompanies();
                await this.loadDeptos(oUserData.COMPANYID);
                await this.loadRoles();

                // 5. Vincular los controles al modelo
                this._bindEditControls();

                // 6. Mostrar roles seleccionados
                this._updateSelectedRolesView(oUserData.ROLES || [], true);

            } catch (error) {
                console.error("Error al cargar datos del usuario:", error);
                MessageBox.error(`Error al cargar datos: ${error.message}`);
            } finally {
                this.getView().setBusy(false);
            }
        },

        _bindEditControls: function () {
            const oView = this.getView();

            // Vincular controles al modelo editUser
            oView.byId("inputEditUserId").bindProperty("value", "editUser>/USERID");
            oView.byId("inputEditUsername").bindProperty("value", "editUser>/USERNAME");
            oView.byId("inputEditUserPhoneNumber").bindProperty("value", "editUser>/PHONENUMBER");
            oView.byId("inputEditUserEmail").bindProperty("value", "editUser>/EMAIL");
            oView.byId("inputEditUserBirthdayDate").bindProperty("dateValue", "editUser>/BIRTHDAYDATE");
            oView.byId("comboBoxEditCompanies").bindProperty("selectedKey", "editUser>/COMPANYID");
            oView.byId("comboBoxEditCedis").bindProperty("selectedKey", "editUser>/DEPARTMENT");
            oView.byId("inputEditUserFunction").bindProperty("value", "editUser>/FUNCTION");
        },

        // Formato de la fecha de la API
        _formatDateForAPI: function (oDate) {
            if (!(oDate instanceof Date)) return null;
            const pad = num => num.toString().padStart(2, '0');
            return `${oDate.getFullYear()}-${pad(oDate.getMonth() + 1)}-${pad(oDate.getDate())}`;
        },

    });


});


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

        /**
         * Funcion para cargar la lista de usuarios.
         */
        loadUsers: function () {
            var oTable = this.byId("IdTable1UsersManageTable");
            var oModel = new JSONModel();
            var that = this;

            // En nuestro proyecto nosotros creamos un archivo llamado en.json para cargar la url de las apis
            // Cambiar esto segun su backend
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
                })
                .catch(err => {
                    MessageToast.show("Error al cargar las compañías: " + err.message);
                });
        },


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


        /**
         * Funcion para cargar la lista de roles y poderlos visualizar en el combobox
         * Esto va cambiar ya que quiere que primero carguemos las compañías, luego que carguemos los deptos
         * Y en base a las compañías y depto que coloquemos, se muestren los roles que pertenecen a esta compañía y depto.
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


        /**
         * Esto es para formatear los roles al cargarlos de la bd y que aparezcan separados por un guion medio en la tabla.
         * Ejemplo: Usuario auxiliar-Investor-etc...
         */
        formatRoles: function (aRoles) {
            if (!Array.isArray(aRoles)) {
                return "";
            }

            const aRoleNames = aRoles.map(function (oRole) {
                // Usar ROLEIDSAP si está disponible y no está vacío, si no usar ROLEID
                return oRole.ROLEIDSAP?.trim() || oRole.ROLEID?.trim() || "";
            }).filter(Boolean); // Eliminar valores vacíos

            console.log("Estos son los roles:", aRoleNames.join(", ")); // debug

            return aRoleNames.join(", ");
        },

        /**
         * Este evento se encarga de crear los items en el VBox con el nombre de los roles que se vayan agregando.
         */
        onRoleSelected: function (oEvent) {
            var oComboBox = oEvent.getSource();
            var sSelectedKey = oComboBox.getSelectedKey();
            var sSelectedText = oComboBox.getSelectedItem().getText();

            var oVBox;
            // Este if valida si es la modal de add user o edit user en la que se estáran colocando los roles
            if (oComboBox.getId().includes("comboBoxEditRoles")) {
                oVBox = this.getView().byId("selectedEditRolesVBox");  // Update User VBox
            } else {
                oVBox = this.getView().byId("selectedRolesVBox");   // Create User VBox
            }
            // Validar duplicados
            var bExists = oVBox.getItems().some(oItem => oItem.data("roleId") === sSelectedKey);
            if (bExists) {
                MessageToast.show("El rol ya ha sido añadido.");
                return;
            }

            // Crear item visual del rol seleccionado
            var oHBox = new sap.m.HBox({
                items: [
                    new sap.m.Label({ text: sSelectedText }).addStyleClass("sapUiSmallMarginEnd"),
                    // @ts-ignore
                    new sap.m.Button({
                        icon: "sap-icon://decline",
                        type: "Transparent",
                        press: () => oVBox.removeItem(oHBox)
                    })
                ]
            });

            oHBox.data("roleId", sSelectedKey);
            oVBox.addItem(oHBox);
        },


        //=========================================================================================================================================================
        //=============== AÑADIR USUARIO ==========================================================================================================================
        //=========================================================================================================================================================

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
                        ROLES: [],
                        selectedRole: "",
                        PASSWORD: ""
                    });

                    oView.setModel(oNewUserModel, "newUser"); // Nota: "newUser" debe coincidir con tu fragmento

                    this.loadRoles();
                    this.loadCompanies();
                    this.loadDeptos();

                    this._oCreateUserDialog.open();
                });

            } else {
                this.resetNewUserModel();
                this._oCreateUserDialog.open();
            }
        },

        onSaveUser: async function () {
            const oView = this.getView();
            const oModel = oView.getModel("newUserModel"); // Usar el modelo correcto
            const oData = oModel.getData();

            // Validaciones básicas
            if (!oData.USERID || !oData.USERNAME || !oData.EMAIL) {
                MessageBox.error("ID, Nombre y Email son campos obligatorios");
                return;
            }

            if (!this.isValidEmail(oData.EMAIL)) {
                MessageBox.error("Ingresa un email válido");
                return;
            }

            if (oData.PHONENUMBER && !this.isValidPhoneNumber(oData.PHONENUMBER)) {
                MessageBox.error("El teléfono debe tener 10 dígitos");
                return;
            }

            if (!oData.ROLES || oData.ROLES.length === 0) {
                MessageBox.error("Debe asignar al menos un rol al usuario");
                return;
            }

            try {
                // Preparar payload según estructura de la API
                const payload = {
                    user: {
                        USERID: oData.USERID,
                        PASSWORD: oData.PASSWORD || "",
                        USERNAME: oData.USERNAME,
                        BIRTHDAYDATE: oData.BIRTHDAYDATE || "",
                        COMPANYID: oData.COMPANYID || "",
                        COMPANYNAME: "", // Puedes obtenerlo del modelo de compañías si lo necesitas
                        CEDIID: oData.DEPARTMENTID || "",
                        EMAIL: oData.EMAIL,
                        PHONENUMBER: oData.PHONENUMBER || "",
                        DEPARTMENT: "", // Puedes obtenerlo del modelo de departamentos
                        FUNCTION: oData.FUNCTION || "",
                        ROLES: oData.ROLES.map(role => ({
                            ROLEID: role.ROLEID
                            // Agregar ROLEIDSAP si es necesario
                        }))
                    }
                };

                console.log("Payload para crear usuario:", payload);

                const response = await fetch("http://localhost:3333/api/security/users/createUser", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        // Agrega aquí otros headers necesarios como autorización
                    },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    const errorResponse = await response.text();
                    throw new Error(errorResponse || "Error desconocido al crear usuario");
                }

                const result = await response.json();
                console.log("Usuario creado:", result);

                MessageToast.show("Usuario creado con éxito");

                // Cerrar diálogo y limpiar
                if (this._oAddUserDialog) {
                    this._oAddUserDialog.close();
                }

                // Recargar lista de usuarios
                this.loadUsers();

            } catch (error) {
                console.error("Error al crear usuario:", error);
                MessageBox.error("Error al crear usuario: " + (error.message || "Error desconocido"));
            }
        },

        //=========================================================================================================================================================
        //=============== CERRAR MODAL CREAR USUARIO ==========================================================================================================================
        //=========================================================================================================================================================

        onCancelUser: function () {
            const oDialog = this.byId("AddUserDialog");
            if (oDialog) {
                oDialog.close(); // cerrar
            }

            this.resetNewUserModel(); // limpiar los campos
        },

        //=========================================================================================================================================================
        //=============== EDITAR USUARIO ==========================================================================================================================
        //=========================================================================================================================================================

        onEditUser: function () {
            var oView = this.getView();

            if (!this._oEditUserDialog) {
                Fragment.load({
                    id: oView.getId(),
                    name: "com.invertions.sapfiorimodinv.view.security.fragments.EditUserDialog",
                    controller: this
                }).then(oDialog => {
                    this._oEditUserDialog = oDialog;
                    oView.addDependent(oDialog);
                    this._oEditUserDialog.open();
                });
            } else {
                this._oEditUserDialog.open();
            }

        },

        onEditSaveUser: function () {
            //Aquí la lógica para agregar la info actualizada del usuario en la bd
        },

        onEditCancelUser: function () {
            if (this._oEditUserDialog) {
                this._oEditUserDialog.close();
            }
        },


        // =========================================================================================================================================================
        // ========= Eliminar Usuario Fisicamente ==================================================================================================================
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

        deleteUser: function (UserId) {
            // Aqui agregar la lógica para eliminar de la BD
        },

        // =========================================================================================================================================================
        // ============ Desactivar el usuario ======================================================================================================================
        // =========================================================================================================================================================

        /**
         * Función onDesactivateUser.
         */
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

        desactivateUser: function (UserId) {
            // Aqui agregar la lógica para desactivar al usuario
        },


        // =========================================================================================================================================================
        // ============== Activar el usuario =======================================================================================================================
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

        activateUser: function (UserId) {
            // Aqui agregar la lógica para activar al usuario
        },

        //===================================================
        //=============== Funciones de la tabla =============
        //===================================================

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





        //===================================================
        //=========== Funciones de validaciones o extras ===========
        //===================================================

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
            oView.byId("comboBoxCompanies").setSelectedKey(null);
            oView.byId("comboBoxCompanies").setValue("");

            oView.byId("comboBoxCedis").setSelectedKey(null);
            oView.byId("comboBoxCedis").setValue("");

            oView.byId("comboBoxRoles").setSelectedKey(null);
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

            if (!oSelectedItem) {
                return;
            }

            const sCompanyId = oSelectedItem.getKey();   // VALUEID
            const sCompanyName = oSelectedItem.getText(); // VALUE

            // 1. Limpiar ComboBox de CEDIS (departamentos)
            const oDeptosModel = new sap.ui.model.json.JSONModel({ value: [] });
            oView.setModel(oDeptosModel, "deptosModel");

            // 2. Limpiar selección visual de comboBoxCedis
            const oCedisComboBox = oView.byId("comboBoxCedis");
            oCedisComboBox.setSelectedKey(null);
            oCedisComboBox.setValue("");

            // 3. Actualizar el modelo del nuevo usuario
            const oUserModel = oView.getModel("newUser");
            oUserModel.setProperty("/COMPANYID", sCompanyId);
            oUserModel.setProperty("/COMPANYNAME", sCompanyName);
            oUserModel.setProperty("/CEDIID", "");
            oUserModel.setProperty("/CEDINAME", "");

            // 4. Llamar a la función para cargar departamentos
            this.loadDeptos(sCompanyId);
        }



    });
});

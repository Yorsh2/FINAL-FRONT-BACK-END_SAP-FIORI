using { sec as mysec } from '../models/security/sec-values.cds';
// using { sec as mysecuseres } from '../models/security/sec-users.cds';


@impl: 'src/api/controllers/sec-values-controller.js'


service ValuesRoute @(path:'/api/security/values') {

    entity values as projection on mysec.Values;
    // entity users as projection on mysecuseres.Users;

    // -----------------------------------------------Values-----------------------------------------------
    @Core.Description: 'Obtener todos los valores'
    @path: 'getAllValues'
    function getAllValues()
    returns array of values;

    @Core.Description: 'Obtener valor por VALUEID'
    @path: 'view/:valueid'
    function getValueById(valueid: String)
    returns values;

    @Core.Description: 'Obtener valor por LABELID'
    @path: 'view/:labelid'
    function getLabelById(labelid: String)
    returns array of values;

    @Core.Description: 'Obtener valor por COMPANYID'
    @path: 'view/:companyid'
    function getCompanyById(companyid: String)
    returns array of values;

    @Core.Description: 'Crear nuevo valor'
    @path: 'view'
    action view(value: values)
    returns values;

    @Core.Description: 'Actualizar valor existente por VALUEID'
    @path: 'view'
    action updateValue(valueid: String, value: values)
    returns values;


    @Core.Description: 'Desactivar valor (borrado lógico)'
    @path: 'values/:valueid/deactivate'
    action deactivateValue()
    returns values;

    @Core.Description: 'Eliminar valor (borrado físico)'
    @path: 'values/:valueid'
    action deleteview(valueid: String)
    returns String;

    // @Core.Description: 'Desactivar valor (borrado lógico)'
    // @path: ':valueid/deactivate'
    // action deactivateValue(valueid: String)
    // returns values;

    // @cds.http.DELETE
    // @path: 'deleteview'
    // action deleteview(labelid: String, valueid: String)
    // returns String;


//-----------------------------------------------Users-----------------------------------------------

    // @Core.Description: 'Obtener todos los usuarios'
    // @path: 'users'
    // function getAllUsers()
    // returns array of users;

    // @Core.Description: 'Obtener usuario por ID'
    // @path: 'users/:userid'
    // function getUserById(userid: String)
    // returns users;

    // @Core.Description: 'Crear nuevo usuario'
    // @path: 'createuser'
    // action createUser(user: users)
    // returns users;

    // @Core.Description: 'Actualizar usuario'
    // @path: 'users'
    // @PUT
    // action updateUser()
    // returns users;

    // @Core.Description: 'Desactivar usuario (borrado lógico)'
    // @path: 'users/:userid/deactivate'
    // action deactivateUser(userid: String)
    // returns users;

    // @Core.Description: 'Eliminar usuario (borrado físico)'
    // @path: 'users/:userid'
    // action deleteUser(userid: String)
    // returns String;

}

const Users = require('../models/mongodb/security/ztusers');
const Values = require('../models/mongodb/security/ztvalues');
const Roles = require('../models/mongodb/security/ztroles');

// Función para obtener todos los usuarios
async function GetAllUsers(req) {
    try {
        const { userid, department } = req.req.query;

        const filter = {};

        if (userid) {
            filter.USERID = userid;
        }

        if (department) {
            filter.DEPARTMENT = department;
        }

        const users = await Users.find(filter)
            .select('-PASSWORD -DETAIL_ROW.DETAIL_ROW_REG')
            .lean();

        return users;

    } catch (error) {
        throw new Error(`Error al obtener usuarios: ${error.message}`);
    }
}


// Función para obtener un usuario por ID
async function GetUserById(req) {
    try {
        const userId = req.req.params.userid || req.req.query.userid;
        const { status } = req.req.query;

        if (!userId) {
            throw new Error('El parámetro USERID es requerido');
        }

        const filter = { USERID: userId };

        if (status === 'valid') {
            // Solo activos y no eliminados
            filter['DETAIL_ROW.ACTIVED'] = true;
            filter['DETAIL_ROW.DELETED'] = false;
        }

        const user = await Users.findOne(filter)
            .select('-PASSWORD')
            .lean();

        if (!user) {
            throw new Error('Usuario no encontrado');
        }

        return user;

    } catch (error) {
        throw new Error(`Error al buscar usuario: ${error.message}`);
    }
}

// Función para crear un nuevo usuario
async function CreateUser(req) {
    try {
        const newUser = req.req.body.user;

        if (!newUser || !newUser.USERID) {
            throw new Error('Datos de usuario incompletos: falta USERID');
        }

        const exists = await Users.findOne({ USERID: newUser.USERID });
        if (exists) throw new Error('El USERID ya está registrado');

        // Buscar empresa y departamento (igual que antes)
        let companyName = "";
        if (newUser.COMPANYID) {
            const company = await Values.findOne({
                LABELID: "IdCompanies",
                VALUEID: newUser.COMPANYID
            });
            if (company) companyName = company.VALUE;
        }

        let departmentName = "";
        if (newUser.DEPARTMENT) {
            const department = await Values.findOne({
                LABELID: "IdCedis",
                VALUEID: newUser.DEPARTMENT
            });
            if (department) departmentName = department.VALUE;
        }

        // Ahora procesamos los roles consultando Roles para obtener ROLENAME
        let processedRoles = [];
        if (Array.isArray(newUser.ROLES)) {
            for (const role of newUser.ROLES) {
                let roleWithDetails = { ...role };
                if (role.ROLEID) {
                    const roleDoc = await Roles.findOne({ ROLEID: role.ROLEID });
                    if (roleDoc) {
                        roleWithDetails.ROLEIDSAP = roleDoc.ROLENAME; // Aquí guardamos el nombre del rol
                    }
                }
                processedRoles.push(roleWithDetails);
            }
        }

        // Auditoría
        const auditEntry = {
            CURRENT: true,
            REGDATE: new Date(),
            REGTIME: new Date(),
            REGUSER: newUser.USERID || 'system'
        };

        // Crear objeto para insertar
        const userToCreate = {
            ...newUser,
            COMPANYNAME: companyName,
            DEPARTMENT: departmentName,
            ROLES: processedRoles,
            PASSWORD: newUser.PASSWORD || '',
            DETAIL_ROW: {
                ACTIVED: true,
                DELETED: false,
                DETAIL_ROW_REG: [auditEntry]
            }
        };

        const result = await Users.insertMany([userToCreate], { ordered: true });

        const response = JSON.parse(JSON.stringify(result));
        response.forEach(u => delete u.PASSWORD);

        return response;

    } catch (error) {
        if (error.code === 11000) {
            error.message = 'El USERID ya existe';
        }
        throw error;
    }
}


async function UpdateOneUser(req) {
    try {
        // Obtener USERID del query parameter (igual que en inversiones)
        const USERID = req.req.query.USERID;
        const userData = req.req.body.user;

        if (!USERID) {
            throw new Error("El parámetro USERID es requerido en la query string");
        }

        // Verificar que el usuario existe
        const existingUser = await Users.findOne({
            USERID: USERID,
            'DETAIL_ROW.DELETED': false
        });

        if (!existingUser) {
            throw new Error(`No se encontró un usuario con ID: ${USERID}`);
        }

        // Preparar registro de auditoría
        const auditEntry = {
            CURRENT: true,
            REGDATE: new Date(),
            REGTIME: new Date(),
            REGUSER: 'system'
        };

        // Actualizar el usuario (excluyendo campos protegidos)
        const { USERID: _, PASSWORD: __, ...safeUpdates } = userData;

        const updatedUser = await Users.findOneAndUpdate(
            { USERID: USERID },
            {
                $set: {
                    ...safeUpdates,
                    DETAIL_ROW_REG: [
                        ...existingUser.DETAIL_ROW.DETAIL_ROW_REG.filter(reg => !reg.CURRENT),
                        auditEntry
                    ]
                }
            },
            { new: true }
        ).select('-PASSWORD').lean();

        return {
            message: `Usuario ${USERID} actualizado correctamente`,
            user: updatedUser
        };

    } catch (error) {
        console.error('Error en UpdateOneUser:', error);
        throw error;
    }
}

async function DeactivateUser(req) {
    try {
        // Obtener USERID del query parameter (igual que en updateone)
        const USERID = req.req.query.USERID;

        if (!USERID) {
            throw new Error("El parámetro USERID es requerido en la query string");
        }

        // Verificar que el usuario existe
        const existingUser = await Users.findOne({
            USERID: USERID,
            'DETAIL_ROW.DELETED': false
        });

        if (!existingUser) {
            throw new Error(`Usuario con ID ${USERID} no encontrado`);
        }

        // Preparar registro de auditoría
        const auditEntry = {
            CURRENT: true,
            REGDATE: new Date(),
            REGTIME: new Date(),
            REGUSER: req.req.user?.USERID || 'system'
        };

        // Actualizar el estado del usuario (eliminación lógica)
        const updatedUser = await Users.findOneAndUpdate(
            { USERID: USERID },
            {
                $set: {
                    'DETAIL_ROW.ACTIVED': false,
                    'DETAIL_ROW.DELETED': true,
                    'DETAIL_ROW.DETAIL_ROW_REG': [
                        ...existingUser.DETAIL_ROW.DETAIL_ROW_REG.filter(r => !r.CURRENT),
                        auditEntry
                    ]
                }
            },
            { new: true }
        ).select('-PASSWORD').lean();

        if (!updatedUser) {
            throw new Error('Error al desactivar el usuario');
        }

        return {
            message: `Usuario ${USERID} desactivado correctamente`,
            user: updatedUser
        };

    } catch (error) {
        console.error('Error en DeactivateUser:', error);
        throw error;
    }
}

async function DeletePhysicalUser(req) {
    try {
        const USERID = req.req.query.userid;

        if (!USERID) {
            throw new Error("El parámetro USERID es requerido");
        }

        const result = await Users.deleteOne({ USERID: USERID });

        if (result.deletedCount === 0) {
            throw new Error(`Usuario con ID ${USERID} no encontrado`);
        }

        return { message: "Borrado físicamente" };

    } catch (error) {
        console.error('Error en DeletePhysicalUser:', error);
        throw error;
    }
}

async function ActivateUser(req) {
    try {
        // Obtener USERID del query parameter (igual que en updateone)
        const USERID = req.req.query.USERID;

        if (!USERID) {
            throw new Error("El parámetro USERID es requerido en la query string");
        }

        // Verificar que el usuario existe
        const existingUser = await Users.findOne({
            USERID: USERID,
        });

        if (!existingUser) {
            throw new Error(`Usuario con ID ${USERID} no encontrado`);
        }

        // Preparar registro de auditoría
        const auditEntry = {
            CURRENT: true,
            REGDATE: new Date(),
            REGTIME: new Date(),
            REGUSER: req.req.user?.USERID || 'system'
        };

        // Actualizar el estado del usuario (eliminación lógica)
        const updatedUser = await Users.findOneAndUpdate(
            { USERID: USERID },
            {
                $set: {
                    'DETAIL_ROW.ACTIVED': true,
                    'DETAIL_ROW.DELETED': false,
                    'DETAIL_ROW.DETAIL_ROW_REG': [
                        ...existingUser.DETAIL_ROW.DETAIL_ROW_REG.filter(r => !r.CURRENT),
                        auditEntry
                    ]
                }
            },
            { new: true }
        ).select('-PASSWORD').lean();

        if (!updatedUser) {
            throw new Error('Error al desactivar el usuario');
        }

        return {
            message: `Usuario ${USERID} desactivado correctamente`,
            user: updatedUser
        };

    } catch (error) {
        console.error('Error en DeactivateUser:', error);
        throw error;
    }
}

// Exportación en el formato requerido
module.exports = {
    GetAllUsers,
    GetUserById,
    CreateUser,
    UpdateOneUser,
    DeactivateUser,
    DeletePhysicalUser,
    ActivateUser
};
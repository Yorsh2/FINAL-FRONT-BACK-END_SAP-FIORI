const Values = require('../models/mongodb/security/ztvalues');

async function GetAllValues(req) {
    try {
        const { valueid, active, category } = req.req.query;
        const filter = { 'DETAIL_ROW.DELETED': false };

        if (valueid) filter.VALUEID = valueid;
        if (active !== undefined) filter['DETAIL_ROW.ACTIVED'] = active === 'true';
        if (category) filter.CATEGORY = category;

        return await Values.find(filter)
            .select('-DETAIL_ROW.DETAIL_ROW_REG')
            .lean();

    } catch (error) {
        throw new Error(`Error al obtener valores: ${error.message}`);
    }
}

async function GetValueById(req) {
    try {
        const valueid = req.req.params.valueid || req.req.query.valueid;
        const value = await Values.findOne({
            VALUEID: valueid,
            'DETAIL_ROW.DELETED': false
        }).lean();

        if (!value) throw new Error('Valor no encontrado');
        return value;
    } catch (error) {
        throw new Error(`Error al buscar valor: ${error.message}`);
    }
}

async function GetLabelById(req) {
    try {
        const labelid = req.req.params.labelid || req.req.query.labelid;

        const labels = await Values.find({
            LABELID: labelid,
            'DETAIL_ROW.DELETED': false
        }).lean();


        if (!labels || labels.length === 0) {
            throw new Error(`No se encontraron valores con LABELID: ${labelid}`);
        }

        return labels;
    } catch (error) {
        throw new Error(`Error al buscar valores: ${error.message}`);
    }
}

async function GetCompanyById(req) {
    try {
        const companyid = req.req.params.companyid || req.req.query.companyid;

        const company = await Values.find({
            COMPANYID: companyid,
            'DETAIL_ROW.DELETED': false
        }).lean();


        if (!company || company.length === 0) {
            throw new Error(`No se encontraron compañias con COMPANYID: ${companyid}`);
        }

        return company;
    } catch (error) {
        throw new Error(`Error al buscar las compañias: ${error.message}`);
    }
}




async function view(req) {
    try {
        const newValue = req.req.body.value;

        if (!newValue || !newValue.VALUEID) {
            throw new Error('Datos de valor incompletos');
        }

        const exists = await Values.findOne({ VALUEID: newValue.VALUEID });
        if (exists) {
            throw new Error('El VALUEID ya está registrado');
        }

        const auditEntry = {
            CURRENT: true,
            REGDATE: new Date(),
            REGTIME: new Date(),
            REGUSER: newValue.VALUEID || 'system'
        };

        const valueToCreate = {
            ...newValue,
            DETAIL_ROW: {
                ACTIVED: true,
                DELETED: false,
                DETAIL_ROW_REG: [auditEntry]
            }
        };

        const result = await Values.insertMany([valueToCreate], { ordered: true });
        return JSON.parse(JSON.stringify(result));
    } catch (error) {
        if (error.code === 11000) {
            error.message = 'El VALUEID ya existe';
        }
        throw error;
    }
}



async function UpdateValue(req) {
    const { valueid, value } = req.data;

    if (!valueid) {
        throw new Error('Parámetro "valueid" es requerido');
    }

    // Validar existencia del valor en base de datos
    const existing = await SELECT.one.from(db.Values).where({ VALUEID: valueid });

    if (!existing) {
        throw new Error(`El valor con ID "${valueid}" no existe. No se puede actualizar.`);
    }

    // Ejecutar la actualización
    await UPDATE(db.Values).set(value).where({ VALUEID: valueid });

    // Retornar el valor actualizado
    return await SELECT.one.from(db.Values).where({ VALUEID: valueid });
}

async function DeactivateValue(req) {
    try {
        const valueid = req.req.params.valueid || req.req.query.valueid;
        const reguser = req.req.body.REGUSER || 'system';

        const auditEntry = {
            CURRENT: true,
            REGDATE: new Date(),
            REGTIME: new Date(),
            REGUSER: reguser
        };

        const updatedValue = await Values.findOneAndUpdate(
            { VALUEID: valueid },
            {
                'DETAIL_ROW.ACTIVED': false,
                $push: { 'DETAIL_ROW.DETAIL_ROW_REG': auditEntry }
            },
            {
                new: true
            }
        ).lean();

        if (!updatedValue) {
            throw new Error('Valor no encontrado');
        }

        return updatedValue;
    } catch (error) {
        throw new Error(`Error al desactivar valor: ${error.message}`);
    }
}

async function deleteview(req) {
    try {
        const valueid = req.req.params.valueid || req.req.query.valueid;
        const deletedValue = await Values.findOneAndDelete({ VALUEID: valueid });

        if (!deletedValue) {
            throw new Error('Valor no encontrado');
        }

        return { message: 'Valor eliminado permanentemente' };
    } catch (error) {
        throw new Error(`Error al eliminar valor: ${error.message}`);
    }
}

module.exports = {
    GetAllValues,
    GetValueById,
    view,
    UpdateValue,
    DeactivateValue,
    deleteview,
    GetLabelById,
    GetCompanyById
};

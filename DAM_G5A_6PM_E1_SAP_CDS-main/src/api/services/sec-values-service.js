// src/api/services/sec-values-service.js
const Values = require('../models/mongodb/security/ztvalues');

async function GetAllValues(req) {
  try {
    const { valueid, active, category } = req.req.query;
    const filter = { 'DETAIL_ROW.DELETED': false };
    if (valueid)  filter.VALUEID              = valueid;
    if (active)   filter['DETAIL_ROW.ACTIVED'] = active === 'true';
    if (category) filter.CATEGORY             = category;
    return await Values.find(filter)
      .select('-DETAIL_ROW.DETAIL_ROW_REG')
      .lean();
  } catch (e) {
    throw new Error(`Error al obtener valores: ${e.message}`);
  }
}

async function GetValueById(req) {
  try {
    const valueid = req.req.params.valueid || req.req.query.valueid;
    const value = await Values.findOne({ VALUEID: valueid, 'DETAIL_ROW.DELETED': false }).lean();
    if (!value) throw new Error('Valor no encontrado');
    return value;
  } catch (e) {
    throw new Error(`Error al buscar valor: ${e.message}`);
  }
}

async function GetLabelById(req) {
  try {
    const labelid = req.req.params.labelid || req.req.query.labelid;
    const labels = await Values.find({ LABELID: labelid, 'DETAIL_ROW.DELETED': false }).lean();
    if (!labels.length) throw new Error(`No se encontraron valores con LABELID: ${labelid}`);
    return labels;
  } catch (e) {
    throw new Error(`Error al buscar valores: ${e.message}`);
  }
}

async function GetCompanyById(req) {
  try {
    const companyid = req.req.params.companyid || req.req.query.companyid;
    const comps = await Values.find({ COMPANYID: companyid, 'DETAIL_ROW.DELETED': false }).lean();
    if (!comps.length) throw new Error(`No se encontraron compañías con COMPANYID: ${companyid}`);
    return comps;
  } catch (e) {
    throw new Error(`Error al buscar compañías: ${e.message}`);
  }
}

async function view(req) {
  try {
    const { value } = req.data;
    if (!value || !value.VALUEID) throw new Error('Datos de valor incompletos');
    if (await Values.findOne({ VALUEID: value.VALUEID })) throw new Error('El VALUEID ya está registrado');
    const audit = { CURRENT:true, REGDATE:new Date(), REGTIME:new Date(), REGUSER:value.VALUEID };
    const toCreate = { 
      ...value, 
      DETAIL_ROW:{ ACTIVED:true, DELETED:false, DETAIL_ROW_REG:[audit] } 
    };
    const [created] = await Values.insertMany([toCreate], { ordered:true });
    return created.toObject();
  } catch (e) {
    if (e.code === 11000) e.message = 'El VALUEID ya existe';
    throw new Error(`Error al crear valor: ${e.message}`);
  }
}

async function UpdateValue(req) {
  try {
    const { valueid, value } = req.data;
    if (!valueid) throw new Error('El parámetro "valueid" es requerido');
    if (!await Values.findOne({ VALUEID: valueid })) throw new Error(`El valor con ID "${valueid}" no existe.`);
    const updated = await Values.findOneAndUpdate(
      { VALUEID: valueid },
      { $set: value },
      { new:true }
    ).lean();
    return updated;
  } catch (e) {
    throw new Error(`Error al actualizar valor: ${e.message}`);
  }
}

async function DeactivateValue(req) {
  try {
    const { valueid, reguser } = req.data;
    if (!valueid) throw new Error('El parámetro "valueid" es requerido');
    const audit = { CURRENT:true, REGDATE:new Date(), REGTIME:new Date(), REGUSER:reguser||'system' };
    const updated = await Values.findOneAndUpdate(
      { VALUEID: valueid },
      { 'DETAIL_ROW.ACTIVED': false, $push:{ 'DETAIL_ROW.DETAIL_ROW_REG': audit } },
      { new:true }
    ).lean();
    if (!updated) throw new Error('Valor no encontrado');
    return updated;
  } catch (e) {
    throw new Error(`Error al desactivar valor: ${e.message}`);
  }
}

async function ActivateValue(req) {
  try {
    const { valueid, reguser } = req.data;
    if (!valueid) throw new Error('El parámetro "valueid" es requerido');
    const audit = { CURRENT:true, REGDATE:new Date(), REGTIME:new Date(), REGUSER:reguser||'system' };
    const updated = await Values.findOneAndUpdate(
      { VALUEID: valueid },
      { 'DETAIL_ROW.ACTIVED': true, $push:{ 'DETAIL_ROW.DETAIL_ROW_REG': audit } },
      { new:true }
    ).lean();
    if (!updated) throw new Error('Valor no encontrado');
    return updated;
  } catch (e) {
    throw new Error(`Error al activar valor: ${e.message}`);
  }
}

async function deleteview(req) {
  try {
    const { valueid } = req.data;
    if (!valueid) throw new Error('El parámetro "valueid" es requerido');
    const del = await Values.findOneAndDelete({ VALUEID: valueid });
    if (!del) throw new Error('Valor no encontrado');
    return 'Valor eliminado permanentemente';
  } catch (e) {
    throw new Error(`Error al eliminar valor: ${e.message}`);
  }
}

module.exports = {
  GetAllValues, GetValueById, GetLabelById, GetCompanyById,
  view, UpdateValue, DeactivateValue, ActivateValue, deleteview
};

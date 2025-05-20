const mongoose = require('mongoose');

/**
 * ESQUEMA PARA COLECCIÓN ZTValues
 * 
 * Archivos CDS relacionados:
 * - sec-values.cds: Contiene la definición principal de Values
 * - sec-labels.cds: Proporciona la relación con LABELID
 * - common.cds: Proporciona la estructura DETAIL_ROW (auditoría)
 */

const valueSchema = new mongoose.Schema({
    // ==============================================
    // ESTRUCTURA PRINCIPAL (sec-values.cds)
    // ==============================================
    COMPANYID: { type: String, required: true },      // <- sec-values.cds
    CEDIID: { type: Number, default: 0 },           // <- sec-values.cds

    LABELID: { type: String, required: true },      // <- sec-values.cds (relación con sec-labels.cds)
    VALUEPAID: { type: String, default: "" },       // <- sec-values.cds
    VALUEID: { type: String, required: true },      // <- sec-values.cds (identificador único)
    VALUE: { type: String, required: true },        // <- sec-values.cds
    ALIAS: { type: String },                        // <- sec-values.cds
    SEQUENCE: { type: Number, required: true },     // <- sec-values.cds
    IMAGE: { type: String },                        // <- sec-values.cds
    // VALUESAPID: { type: String, default: "" },      // <- sec-values.cds
    DESCRIPTION: { type: String },                  // <- sec-values.cds

    // ==============================================
    // ESTRUCTURA DE AUDITORÍA (common.cds)
    // ==============================================
    DETAIL_ROW: {                                           // <- common.cds (AuditDetail)
        ACTIVED: { type: Boolean, default: true },          // <- common.cds
        DELETED: { type: Boolean, default: false },         // <- common.cds
        DETAIL_ROW_REG: [{                                  // <- common.cds (AuditDetailReg)
            CURRENT: { type: Boolean, required: true },     // <- common.cds
            REGDATE: { type: Date, required: true },        // <- common.cds
            REGTIME: { type: Date, required: true },        // <- common.cds
            REGUSER: { type: String, required: true }       // <- common.cds
        }]
    }
}, {
    collection: 'ZTValues',
    timestamps: false // Usamos nuestro propio sistema de auditoría
});

// Índices para optimización
valueSchema.index({ LABELID: 1, VALUEID: 1 }, { unique: true }); // Índice compuesto único
valueSchema.index({ VALUE: 1 }); // Índice para búsqueda por nombre de valor
valueSchema.index({ SEQUENCE: 1 }); // Índice para ordenamiento

module.exports = mongoose.model(
    'ZTValues',     // Nombre del modelo
    valueSchema,    // Esquema definido
    'ZTValues'      // Nombre de la colección en MongoDB
);
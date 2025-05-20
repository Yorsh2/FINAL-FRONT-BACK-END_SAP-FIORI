const cds = require('@sap/cds');

const {
    GetAllValues,
    GetValueById,
    view,
    UpdateValue,
    DeactivateValue,
    deleteview,
    GetLabelById,
    GetCompanyById
} = require('../services/sec-values-service');

class SecurityValuesController extends cds.ApplicationService {

    async init() {

        this.on('getAllValues', async (req) => {
            try {
                const values = await GetAllValues(req);
                return values;
            } catch (error) {
                req.error(500, error.message);
            }
        });

        this.on('getValueById', async (req) => {
            try {
                const value = await GetValueById(req);
                return value;
            } catch (error) {
                req.error(error.message.includes('no encontrado') ? 404 : 500, error.message);
            }
        });

        this.on('getLabelById', async (req) => {
            try {
                const label = await GetLabelById(req);
                return label;
            } catch (error) {
                req.error(error.message.includes('no encontrado') ? 404 : 500, error.message);
            }
        });

        this.on('getCompanyById', async (req) => {
            try {
                const label = await GetCompanyById(req);
                return label;
            } catch (error) {
                req.error(error.message.includes('no encontrado') ? 404 : 500, error.message);
            }
        });

        this.on('view', async (req) => {
            try {
                const newValue = await view(req);
                return newValue;
            } catch (error) {
                req.error(error.message.includes('ya está en uso') ? 400 : 500, error.message);
            }
        });

        this.on('UPDATE', 'values', async (req) => {
            const { VALUEID } = req.data;
        
            const existing = await SELECT.one.from('mysec.Values').where({ VALUEID });
            if (!existing) {
                return req.error(404, `Value with ID ${VALUEID} not found`);
            }
        
            await UPDATE('mysec.Values').set(req.data).where({ VALUEID });
            return await SELECT.one.from('mysec.Values').where({ VALUEID });
        });
        

        this.on('updateValue', async (req) => {
            try {
                const updatedValue = await UpdateValue(req);
                return updatedValue;
            } catch (error) {
                req.error(400, error.message);
            }
        });


        this.on('deactivateValue', async (req) => {
            try {
                const result = await DeactivateValue(req);
                return result;
            } catch (error) {
                req.error(error.message.includes('no encontrado') ? 404 : 500, error.message);
            }
        });

        this.on('deleteview', async (req) => {
            try {
                const result = await deleteview(req);
                return result;
            } catch (error) {
                req.error(error.message.includes('no encontrado') ? 404 : 500, error.message);
            }
        });
        
        return await super.init();
    }
}

module.exports = SecurityValuesController;

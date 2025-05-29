sap.ui.define([
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
], function (JSONModel, MessageToast) {
    "use strict";
    return {

        loadSimulations: async function (oView) {
            try {
                const envRes = await fetch("env.json");
                const env = await envRes.json();
                const url = env.API_INVERSIONES_URL_BASE_PRUEBA + "GetAllSimulation";
                const res = await fetch(url);
                const data = await res.json();

                console.log("Simulaciones completas recibidas:", data);

                if (data.length > 0 && Array.isArray(data[0].CHART_DATA) && data[0].CHART_DATA.length > 0) {
                    console.log("CHART_DATA de la primera simulación:", data[0].CHART_DATA);
                    const chartData = data[0].CHART_DATA.map(item => {
                        let indicatorsText = "";
                        if (Array.isArray(item.INDICATORS)) {
                            indicatorsText = item.INDICATORS.map(ind =>
                                `${ind.INDICATOR}: ${ind.VALUE}`
                            ).join(", ");
                        }
                        return {
                            ...item,
                            INDICATORS_TEXT: indicatorsText
                        };
                    });
                    oView.setModel(new JSONModel({ CHART_DATA: chartData }), "strategyResultModel");
                    console.log("Datos procesados para la tabla:", chartData);
                } else {
                    oView.setModel(new JSONModel({ CHART_DATA: [] }), "strategyResultModel");
                    console.warn("No hay simulaciones o CHART_DATA vacío.");
                }
            } catch (err) {
                MessageToast.show("Error al cargar simulaciones");
                console.error("Error en loadSimulations:", err);
            }
        }

    };
});
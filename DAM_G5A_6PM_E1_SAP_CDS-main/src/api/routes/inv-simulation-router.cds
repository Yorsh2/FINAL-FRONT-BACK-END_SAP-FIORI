using {inv as Entsimulation} from '../models/inv-simulation';


@impl: 'src/api/controllers/inv-simulation-controller.js'
service InversionsRoutes @(path: '/api/security/inversions') {

    entity simulations as projection on Entsimulation.SIMULATION;

    @Core.Description: 'simulations'
    @path            : 'simulation'
    action simulation(SIMULATION : simulations) returns array of simulations;

    @Core.Description: 'Obtener todas las simulaciones'
    @path            : 'getAllSimulations'
    function getAllSimulations() returns array of simulations;

}
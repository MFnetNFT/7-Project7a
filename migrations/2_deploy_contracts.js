const FlightSuretyApp = artifacts.require("FlightSuretyApp");
const FlightSuretyData = artifacts.require("FlightSuretyData");
const fs = require('fs');

module.exports = async function(deployer, network, accounts) {
    let firstAirline = accounts[1];
    // Deploy the FlightSuretyData contract and register the first airline during deployment
    await deployer.deploy(FlightSuretyData, firstAirline)
    .then(async () => {
        // Deploy the FlightSuretyApp contract and pass the address of the FlightSuretyData contract
        return await deployer.deploy(FlightSuretyApp, FlightSuretyData.address)
            .then(async () => {
                // Write the configuration file with the contract addresses
                let config = {
                    localhost: {
                        url: 'http://localhost:8545',
                        dataAddress: FlightSuretyData.address,
                        appAddress: FlightSuretyApp.address
                    }
                }
                fs.writeFileSync(__dirname + '/../src/dapp/config.json',JSON.stringify(config, null, '\t'), 'utf-8');
                fs.writeFileSync(__dirname + '/../src/server/config.json',JSON.stringify(config, null, '\t'), 'utf-8');
                // Get the deployed contract instances
                const flightSuretyDataInstance = await FlightSuretyData.deployed();
                // Fetch past events instead of subscribing
                const pastEvents = await flightSuretyDataInstance.getPastEvents('AirlineRegistered', { fromBlock: 0, toBlock: 'latest' });
                pastEvents.forEach(event => {
                    console.log('First Airline Registered:', event.returnValues.airline);
                });
            });
    });
}
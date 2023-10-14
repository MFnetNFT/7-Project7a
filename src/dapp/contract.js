import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';
import Web3 from 'web3';
import BigNumber from 'bignumber.js';

export default class Contract {
    constructor(network, callback) {

        let config = Config[network];
        this.web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
        this.flightSuretyData = new this.web3.eth.Contract(FlightSuretyData.abi, config.dataAddress);
        this.initialize(callback);
        this.owner = null;
        this.airlines = [];
        this.passengers = [];
        this.flights = [];
    }

    async initialize(callback) {
        this.web3.eth.getAccounts(async (error, accts) => {
           
            this.owner = accts[0];

            let counter = 1;
            
            while(this.airlines.length < 5) {
                this.airlines.push(accts[counter++]);
            }

            while(this.passengers.length < 5) {
                this.passengers.push(accts[counter++]);
            }

            // Hardcoded flight data
            this.flights = [
                { airline: this.airlines[0], flightName: "MF1111", timestamp: 1111111111 },
                { airline: this.airlines[1], flightName: "MF2222", timestamp: 2222222222 },
                { airline: this.airlines[2], flightName: "MF3333", timestamp: 3333333333 },
                { airline: this.airlines[3], flightName: "MF4444", timestamp: 4444444444 },
                { airline: this.airlines[4], flightName: "MF5555", timestamp: 5555555555 },
            ];

            // Register and fund airlines during initialization
            await this.registerAndFundAirlines();

            // Register flights during initialization
            await this.registerFlights();
            
            callback();
        });
    }

    async isOperational(callback) {
       let self = this;
       self.flightSuretyApp.methods
            .isOperational()
            .call({ from: self.owner}, callback);
    }

    async registerAndFundAirlines() {
        try {
            // Fund the first airline (registered in deployment)
            await this.flightSuretyApp.methods.fundAirline().send({ from: this.airlines[0], value: this.web3.utils.toWei("10", "ether") });
            console.log(`Airline ${this.airlines[0]} funded successfully.`);
            // Register and fund 2nd, 3rd and 4th airlines
            await this.flightSuretyApp.methods.registerAirline(this.airlines[1]).send({ from: this.airlines[0], gas: 200000 });
            await this.flightSuretyApp.methods.fundAirline().send({ from: this.airlines[1], value: this.web3.utils.toWei("10", "ether") });
            console.log(`Airline ${this.airlines[1]} registered and funded successfully.`);
            await this.flightSuretyApp.methods.registerAirline(this.airlines[2]).send({ from: this.airlines[1], gas: 200000 });
            await this.flightSuretyApp.methods.fundAirline().send({ from: this.airlines[2], value: this.web3.utils.toWei("10", "ether") });
            console.log(`Airline ${this.airlines[2]} registered and funded successfully.`);
            await this.flightSuretyApp.methods.registerAirline(this.airlines[3]).send({ from: this.airlines[2], gas: 200000 });
            await this.flightSuretyApp.methods.fundAirline().send({ from: this.airlines[3], value: this.web3.utils.toWei("10", "ether") });
            console.log(`Airline ${this.airlines[3]} registered and funded successfully.`);
            // Register and fund 5th airline (consensus 50%)
            await this.flightSuretyApp.methods.registerAirline(this.airlines[4]).send({ from: this.airlines[0], gas: 200000 });
            await this.flightSuretyApp.methods.registerAirline(this.airlines[4]).send({ from: this.airlines[1], gas: 200000 });
            await this.flightSuretyApp.methods.registerAirline(this.airlines[4]).send({ from: this.airlines[2], gas: 200000 });
            await this.flightSuretyApp.methods.fundAirline().send({ from: this.airlines[4], value: this.web3.utils.toWei("10", "ether") });
            console.log(`Airline ${this.airlines[4]} registered and funded successfully.`);
            
            console.log("Airlines registered and funded successfully.");
        } catch (error) {
            console.error('Error registering and funding airlines:', error);
        }
    }

    async registerFlights() {
        // Register each flight
        for (const flightData of this.flights) {
            try {
                await this.flightSuretyApp.methods.registerFlight(flightData.flightName, flightData.timestamp).send({ from: flightData.airline, gas: 200000 });
                console.log(`Flight registered: ${flightData.flightName}`);
            } catch (error) {
                console.error(`Error registering flight ${flightData.flightName}:`, error);
            }
        }
    }
    
    // Function to fetch flight status
    async fetchFlightStatus(index, airline, flight, timestamp, callback) {
        try {
            await this.flightSuretyApp.methods.fetchFlightStatus(index, airline, flight, timestamp).send({ from: this.owner }, (error, result) => { callback(error, result); });
            console.log(`Fetching status for flight: ${flight}`);
        } catch (error) {
            console.error('Error fetching flight status:', error);
        }
    }

    // Function to process flight status
    async processFlightStatus(airline, flight, timestamp, statusCode) {
        try {
            await this.flightSuretyApp.methods.processFlightStatus(flight, timestamp, statusCode).send({ from: airline, gas: 200000 });
            console.log(`Processing status for flight: ${flight}`);
        } catch (error) {
            console.error('Error processing flight status:', error);
        }
    }

    // Function to purchase insurance for a flight
    async purchaseInsurance(airline, flight, timestamp, selectedPassenger) {
        try {
            const insuranceAmount = new BigNumber(1).times(new BigNumber(10).pow(18)); // Convert 1 ether to wei
            await this.flightSuretyApp.methods.buyInsurance(airline, flight, timestamp).send({ from: selectedPassenger, value: insuranceAmount, gas: 200000 });
            console.log(`Insurance purchased for flight ${flight} by passenger ${selectedPassenger}`);
        } catch (error) {
            console.error('Error purchasing insurance:', error);
        }
    }

    // Function to check flight status
    async checkFlightStatus(airline, flight, timestamp, selectedPassenger) {
        try {
            const flightDetails = await this.flightSuretyApp.methods.getFlightDetails(airline, flight, timestamp).call({ from: selectedPassenger });
            console.log(`Flight Status for flight ${flight}: ${flightDetails.statusCode}`);
        } catch (error) {
            console.error('Error checking flight status:', error);
        }
    }

    // Function to withdraw funds
    async withdrawFunds(selectedPassenger) {
        try {
            await this.flightSuretyApp.methods.withdrawFunds().send({ from: selectedPassenger });
            console.log('Funds withdrawn successfully.');
        } catch (error) {
            console.error('Error withdrawing funds:', error);
        }
    }
}

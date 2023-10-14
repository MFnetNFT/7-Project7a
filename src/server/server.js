import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';
import express from 'express';

console.log("Initializing server configuration...");

const app = express();

let config = Config['localhost'];
console.log("Connecting to Ethereum provider at:", config.url);
let web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));

(async () => {
  try {
    let accounts = await web3.eth.getAccounts();
    web3.eth.defaultAccount = accounts[0];
    console.log("Using default Ethereum account:", accounts[0]);

    console.log("Initializing FlightSuretyApp contract at address:", config.appAddress);
    let flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);

    // Register oracles
    const ORACLES_COUNT = 50;
    const ORACLE_REGISTRATION_FEE = await flightSuretyApp.methods.REGISTRATION_FEE().call();
    const startIndex = 10; // Start with accounts[10]

    for (let i = startIndex; i < ORACLES_COUNT + startIndex; i++) {
      try {
        await flightSuretyApp.methods.registerOracle().send({ 
          from: accounts[i], 
          value: ORACLE_REGISTRATION_FEE,
          gas: 200000
        });
        let indexes = await flightSuretyApp.methods.getMyIndexes().call({ from: accounts[i] });
        console.log(`Oracle ${i-startIndex+1} registered with indexes: ${indexes}, ${accounts[i]}`);
      } catch (error) {
        console.error(`Error registering oracle for ${accounts[i]}`, error.message);
      }
    }
  
    // Listen for OracleRequest events and handle responses
    flightSuretyApp.events.OracleRequest({
      fromBlock: 0
    }, async (error, event) => {
      if (error) {
        console.error("Error with OracleRequest event:", error);
      } else {
        console.log("Received OracleRequest event:", event.returnValues);

        for (let i = startIndex; i < ORACLES_COUNT + startIndex; i++) {
          let indexes = await flightSuretyApp.methods.getMyIndexes().call({ from: accounts[i] });
          if (indexes.includes(event.returnValues.index)) {
            const statusCode = await flightSuretyApp.methods.generateRandomStatusCode().call({ from: accounts[i] });
            try {
              await flightSuretyApp.methods.submitOracleResponse(
                event.returnValues.index,
                event.returnValues.airline,
                event.returnValues.flight,
                event.returnValues.timestamp,
                statusCode
              ).send({ from: accounts[i] });
              console.log(`Oracle ${i - startIndex + 1} responded with status code: ${statusCode}`);
            } catch (error) {
              console.error(`Error submitting oracle response for oracle ${i - startIndex + 1}:`, error);
            }
          }
        }
      }
    });

    app.get('/api', (req, res) => {
      console.log("Received GET request at /api");
      res.send({
        message: 'An API for use with your Dapp!'
      });
    });
    console.log("Server script loaded and ready.");
  } catch (error) {
    console.error("Error in server initialization:", error);
  }
})();

export default app;

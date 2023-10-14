require("dotenv").config(); // Store environment-specific variable from '.env' to process.env
const HDWalletProvider = require("@truffle/hdwallet-provider");
const infuraKey = process.env.INFURA_API_KEY;
const mnemonic = process.env.MNEMONIC;

module.exports = {

  dashboard: {
    // host: "localhost",
    // port: 24012,
  },

  networks: {

    dashboard: {
      timeout: 300000, // Increase timeout value to 5 minutes (in milliseconds)
      networkCheckTimeout: 300000 // Increase network check timeout to 5 minutes (in milliseconds)
    },

    development: {
      // provider: () => new HDWalletProvider(mnemonic, "http://127.0.0.1:9545/", 0, 50),
      host: "127.0.0.1",  // Localhost (default: none)
      port: 8545,
      network_id: "*",  // Match any network id 
      accounts: 60  // Number of accounts
    },

    sepolia: {
      // provider: () => new HDWalletProvider(mnemonic, "https://sepolia.infura.io/v3/" + infuraKey),
      provider: () => new HDWalletProvider(mnemonic, "wss://sepolia.infura.io/ws/v3/" + infuraKey),
      // network_id: 11155111,
      network_id: "*",
      // gas: 8000000,  // optional: set the gas limit for this network
      // gasPrice: 20000000000,  // optional: set the gas price for this network
      timeout: 300000, // Increase timeout value to 5 minutes (in milliseconds)
      networkCheckTimeout: 300000 // Increase network check timeout to 5 minutes (in milliseconds)
    }
  },

  compilers: {
    solc: {
      version: "0.8.1"
    }
  },

  deploymentTimeout: 600000 // Set the deployment timeout to 600 seconds (10 minutes)

};
## Project Write-up

This project involves the development of a decentralized flight insurance application using blockchain technology. The application is divided into multiple components and follows specific requirements. The main components of the project include:

### Separation of Concerns
- `FlightSuretyData` contract: Responsible for data persistence.
- `FlightSuretyApp` contract: Handles the application logic and oracles code.
- Dapp client: Used for triggering contract calls.
- Server app: Simulates oracles.

### Airlines
- Registering the first airline when the contract is deployed.
- Allowing only an existing airline to register a new airline until there are at least four registered airlines.
- Requiring multi-party consensus of 50% of registered airlines for registering the fifth and subsequent airlines.
- Allowing an airline to be registered but not participate in the contract until it submits funding of 10 ether.

### Passengers
- Allowing passengers to pay up to 1 ether for purchasing flight insurance.
- Using fixed flight numbers and timestamps for the purpose of the project, which can be defined in the Dapp client.
- Providing a credit of 1.5 times the insurance amount to passengers if the flight is delayed due to airline fault.
- Transferring funds from the contract to the passenger wallet only when they initiate a withdrawal.

### Oracles
- Implementing oracles as a server app.
- Registering 20+ oracles upon startup and persisting their assigned indexes in memory.
- Using the client Dapp to trigger a request to update the flight status, generating the OracleRequest event captured by the server.
- Looping through all registered oracles, identifying those relevant to the request, and responding by calling into the app logic contract with the appropriate status code.

### General
- Adding operational status control to the contracts, using the same multi-party control implemented to register airlines.
- Implementing functions that fail fast by using `require()` at the start of functions.
- Providing scaffolding code, but allowing for the replacement of the code with custom implementations.

The project utilizes the following libraries and dependencies:
- OpenZeppelin's SafeMath library: Provides protection against numeric overflow bugs.
- Solidity: The programming language for writing the smart contracts.
- Web3.js: A JavaScript library for interacting with Ethereum.
- Express.js: A web application framework for the server app.

To run the project, ensure you have the necessary dependencies and libraries installed.
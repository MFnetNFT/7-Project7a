var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');

contract('Flight Surety Tests', async (accounts) => {

  const STATUS_CODE_LATE_AIRLINE = 20;
  const ORACLES_COUNT = 50;
  const startIndex = 10; // Start with accounts[10]

  let config;
  let flightDetails;  
  let airline1 = accounts[1]; // config.firstAirline 
  let flight1 = "MF1111";
  let timestamp1 = Math.floor(Date.now() / 1000);
  let airline2 = accounts[2];
  let flight2 = "MF2222";
  let timestamp2 = Math.floor(Date.now() / 1000);
  let airline3 = accounts[3];
  let flight3 = "MF3333";
  let timestamp3 = Math.floor(Date.now() / 1000);
  let airline4 = accounts[4];
  let flight4 = "MF4444";
  let timestamp4 = Math.floor(Date.now() / 1000);
  let airline5 = accounts[5];
  let flight5 = "MF5555";
  let timestamp5 = Math.floor(Date.now() / 1000);
  let oracleIndexes;
 
  before('setup contract', async () => {
    config = await Test.Config(accounts);
    await config.flightSuretyData.setOperatingStatus(true, { from: config.owner });
  });

  /****************************************************************************************/
  /* Flight Surety Tests                                                                 */
  /****************************************************************************************/

  it(`(multiparty) has correct initial isOperational() value`, async function () {
    // Get operating status
    let status = await config.flightSuretyData.isOperational();
    assert.equal(status, true, "Incorrect initial operating status value");
  });

  it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {
    // Ensure that access is denied for non-Contract Owner account
    let accessDenied = false;
    try {
      await config.flightSuretyData.setOperatingStatus(false, { from: config.testAddresses[2] });
    } catch (e) {
      accessDenied = true;
    }
    assert.equal(accessDenied, true, "Access not restricted to Contract Owner");
  });

  it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {
    // Ensure that access is allowed for Contract Owner account
    let accessDenied = false;
    try {
      await config.flightSuretyData.setOperatingStatus(false);
    } catch (e) {
      accessDenied = true;
    }
    assert.equal(accessDenied, false, "Access not restricted to Contract Owner");
  });

  it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {
    await config.flightSuretyData.setOperatingStatus(false);

    let reverted = false;
    try {
      await config.flightSurety.setTestingMode(true);
    } catch (e) {
      reverted = true;
    }
    assert.equal(reverted, true, "Access not blocked for requireIsOperational");

    // Set it back for other tests to work
    await config.flightSuretyData.setOperatingStatus(true);
  });

  it('(airline) cannot register an Airline using registerAirline() if it is not funded', async () => {
    // ARRANGE

    // ACT
    try {
      await config.flightSuretyApp.registerAirline(airline2, { from: airline1 });
    } catch (e) {
    }
    let result = await config.flightSuretyData.isAirlineRegistered(airline2);

    // ASSERT
    assert.equal(result, false, "Airline should not be able to register another airline if it hasn't provided funding");
  });

  it('(airline) can register an Airline using registerAirline() if it is funded', async () => {
    // ARRANGE

    // ACT
    await config.flightSuretyApp.fundAirline({ value: web3.utils.toWei("10", "ether"), from: airline1 });
    await config.flightSuretyApp.registerAirline(airline2, { from: airline1 });
    let result = await config.flightSuretyData.isAirlineRegistered(airline2); 

    // ASSERT
    assert.equal(result, true, "Airline should be able to register another airline if it is funded");

    // Retrieve and log past events for this test case
    // await logPastEvents(config.flightSuretyData, 'AirlineRegistered');
    // await logPastEvents(config.flightSuretyData, 'AirlineFunded');
  });

  it('(airline) can register fifth and subsequent airlines after multi-party consensus (50%)', async () => {
    // ARRANGE

    // ACT
    await config.flightSuretyApp.fundAirline({ value: web3.utils.toWei("10", "ether"), from: airline2 });
    await config.flightSuretyApp.registerAirline(airline3, { from: airline2 });
    await config.flightSuretyApp.fundAirline({ value: web3.utils.toWei("10", "ether"), from: airline3 });
    await config.flightSuretyApp.registerAirline(airline4, { from: airline3 });
    await config.flightSuretyApp.fundAirline({ value: web3.utils.toWei("10", "ether"), from: airline4 });

    // Airline 5 registration requires multi-party consensus
    await config.flightSuretyApp.registerAirline(airline5, { from: airline1 });
    await config.flightSuretyApp.registerAirline(airline5, { from: airline2 });
    await config.flightSuretyApp.registerAirline(airline5, { from: airline3 });
    let result = await config.flightSuretyData.isAirlineRegistered(airline5);

    // ASSERT
    assert.equal(result, true, "Fifth and subsequent airlines should be registered after multi-party consensus");

    // Retrieve and log past events for this test case
    // await logPastEvents(config.flightSuretyData, 'AirlineRegistered');
    // await logPastEvents(config.flightSuretyData, 'AirlineFunded');
  });

  it('(airline) cannot register an Airline using registerAirline() without multi-party consensus', async () => {
    // ARRANGE
    let airline6 = accounts[6];
  
    // ACT
    try {
      await config.flightSuretyApp.registerAirline(airline6, { from: airline1 });
    } catch (e) {
    }
    let result = await config.flightSuretyData.isAirlineRegistered(airline6);
  
    // ASSERT
    assert.equal(result, false, "Airline should not be able to register without multi-party consensus");
  });

  it('(airline) can register a flight using registerFlight() if it is funded', async () => {
    // ARRANGE

    // ACT
    await config.flightSuretyApp.registerFlight(flight1, timestamp1, { from: airline1 });
    let isFlight1Registered = await config.flightSuretyApp.isFlightRegistered(airline1, flight1, timestamp1);
    await config.flightSuretyApp.registerFlight(flight2, timestamp2, { from: airline2 });
    let isFlight2Registered = await config.flightSuretyApp.isFlightRegistered(airline2, flight2, timestamp2);
    await config.flightSuretyApp.registerFlight(flight3, timestamp3, { from: airline3 });
    let isFlight3Registered = await config.flightSuretyApp.isFlightRegistered(airline3, flight3, timestamp3);
    await config.flightSuretyApp.registerFlight(flight4, timestamp4, { from: airline4 });
    let isFlight4Registered = await config.flightSuretyApp.isFlightRegistered(airline4, flight4, timestamp4);

    // ASSET
    assert.equal(isFlight1Registered, true, "Flight1 should be registered");
    assert.equal(isFlight2Registered, true, "Flight2 should be registered");
    assert.equal(isFlight3Registered, true, "Flight3 should be registered");
    assert.equal(isFlight4Registered, true, "Flight4 should be registered");

    // Retrieve and log past events for this test case
    // await logPastEvents(config.flightSuretyData, 'FlightRegistered');
  });

  it('(airline) cannot register a flight using registerFlight() if it is not funded', async () => {
    // ARRANGE

    // ACT
    try {
      await config.flightSuretyApp.registerFlight(flight5, timestamp5, { from: airline5 });
    } catch (e) {
    }
    let isFlight5Registered = await config.flightSuretyApp.isFlightRegistered(airline5, flight5, timestamp5);

    // ASSET
    assert.equal(isFlight5Registered, false, "Flight5 should not be registered");
  });

  it('(passenger) can retrieve all registered flight details', async () => {
    // ACT
    let flightDetails = await config.flightSuretyApp.getAllRegisteredFlightDetails();
    for (let i = 0; i < flightDetails[0].length; i++) {
      console.log(`Flight ${i + 1} details:`);
      console.log(`Airline: ${flightDetails[4][i]}`);
      console.log(`Flight: ${flightDetails[3][i]}`);
      console.log(`Timestamp: ${flightDetails[2][i].toNumber()}`);
      console.log("-----------------------");
    };

    // ASSERT
    assert.equal(flightDetails[0].length, 4, "Number of registered flights should match");
    assert.equal(flightDetails[4][0], airline1, "Airline should match");
    assert.equal(flightDetails[3][0], flight1, "Flight should match");
    assert.equal(flightDetails[2][0].toNumber(), timestamp1, "Timestamp should match");
    assert.equal(flightDetails[4][1], airline2, "Airline should match");
    assert.equal(flightDetails[3][1], flight2, "Flight should match");
    assert.equal(flightDetails[2][1].toNumber(), timestamp2, "Timestamp should match");
    assert.equal(flightDetails[4][2], airline3, "Airline should match");
    assert.equal(flightDetails[3][2], flight3, "Flight should match");
    assert.equal(flightDetails[2][2].toNumber(), timestamp3, "Timestamp should match");
    assert.equal(flightDetails[4][3], airline4, "Airline should match");
    assert.equal(flightDetails[3][3], flight4, "Flight should match");
    assert.equal(flightDetails[2][3].toNumber(), timestamp4, "Timestamp should match");
  });
 
  it('(passenger) can purchase flight insurance', async () => {
    // ARRANGE
    let passenger1 = accounts[7];
    let passenger2 = accounts[8];

    // ACT
    let insuranceAmount = web3.utils.toWei("1", "ether");
    await config.flightSuretyApp.buyInsurance(airline1, flight1, timestamp1, { from: passenger1, value: insuranceAmount });
    let insurance1 = await config.flightSuretyApp.getInsurance(airline1, flight1, timestamp1, { from: passenger1 });
    await config.flightSuretyApp.buyInsurance(airline2, flight2, timestamp2, { from: passenger1, value: insuranceAmount });
    let insurance2 = await config.flightSuretyApp.getInsurance(airline2, flight2, timestamp2, { from: passenger1 });
    await config.flightSuretyApp.buyInsurance(airline1, flight1, timestamp1, { from: passenger2, value: insuranceAmount });
    let insurance3 = await config.flightSuretyApp.getInsurance(airline1, flight1, timestamp1, { from: passenger2 });

    // ASSERT
    assert.equal(insurance1[0].toString(), insuranceAmount, "Insurance amount should match the purchased amount");
    assert.equal(insurance1[1], true, "Insured flag should be true");
    assert.equal(insurance2[0].toString(), insuranceAmount, "Insurance amount should match the purchased amount");
    assert.equal(insurance2[1], true, "Insured flag should be true");
    assert.equal(insurance3[0].toString(), insuranceAmount, "Insurance amount should match the purchased amount");
    assert.equal(insurance3[1], true, "Insured flag should be true");

    // Retrieve and log past events for this test case
    // await logPastEvents(config.flightSuretyData, 'InsurancePurchased');
  });

  it('(passenger) cannot purchase flight insurance without paying the correct amount', async () => {
    // ARRANGE
    let passenger2 = accounts[8];
  
    // ACT
    let incorrectAmount = web3.utils.toWei("1.5", "ether");
    let purchaseFailed = false;
    try {
      await config.flightSuretyApp.buyInsurance(airline2, flight2, timestamp2, { from: passenger2, value: incorrectAmount });
    } catch (e) {
      purchaseFailed = true;
    }
  
    // ASSERT
    assert.equal(purchaseFailed, true, "Insurance purchase should fail with incorrect payment amount");
  });
  
  it('(passenger) cannot purchase flight insurance for an invalid flight', async () => {
    // ARRANGE
    let passenger2 = accounts[8];
    let flight = "INVALID_FLIGHT"; // Non-existent flight
    let timestamp = Math.floor(Date.now() / 1000);    
  
    // ACT
    let insuranceAmount = web3.utils.toWei("1", "ether");
    let purchaseFailed = false;
    try {
      await config.flightSuretyApp.buyInsurance(airline2, flight, timestamp, { from: passenger2, value: insuranceAmount });
    } catch (e) {
      purchaseFailed = true;
    }
  
    // ASSERT
    assert.equal(purchaseFailed, true, "Insurance purchase should fail for an invalid flight");
  });

  it('(airline) can update flight status', async () => {
    // ARRANGE
    let statusCode = STATUS_CODE_LATE_AIRLINE;

    // ACT
    await config.flightSuretyApp.processFlightStatus(flight1, timestamp1, statusCode, { from: airline1 });
    let flightStatus1 = await config.flightSuretyApp.getFlightStatus(airline1, flight1, timestamp1);
    // await config.flightSuretyApp.processFlightStatus(flight2, timestamp2, statusCode, { from: airline2 });
    // let flightStatus2 = await config.flightSuretyApp.getFlightStatus(airline2, flight2, timestamp2);

    // ASSERT
    assert.equal(flightStatus1, statusCode, "Flight status should be updated");
    // assert.equal(flightStatus2, statusCode, "Flight status should be updated");

    // Retrieve and log past events for this test case
    // await logPastEvents(config.flightSuretyData, 'FlightStatusUpdated');
    // await logPastEvents(config.flightSuretyData, 'InsuranceCredited');
  });

  it('(passenger) can initiate withdrawal and receive payout', async () => {
    // ARRANGE
    let passenger1 = accounts[7];
    let payoutAmount1 = web3.utils.toWei("1.5", "ether");
    let passenger2 = accounts[8];
    let payoutAmount2 = web3.utils.toWei("1.5", "ether");
  
    // ACT
    let gasPrice = web3.utils.toWei("2", "gwei"); // Default gas price: 2 Gwei
    let balanceBeforeWithdrawal1 = new BigNumber(await web3.eth.getBalance(passenger1));
    let transaction1 = await config.flightSuretyApp.withdrawFunds({ from: passenger1, gasPrice: gasPrice });
    let gasUsed1 = new BigNumber(transaction1.receipt.gasUsed);
    let txCost1 = gasUsed1.times(gasPrice);
    let balanceAfterWithdrawal1 = new BigNumber(await web3.eth.getBalance(passenger1));
    let balanceBeforeWithdrawal2 = new BigNumber(await web3.eth.getBalance(passenger2));
    let transaction2 = await config.flightSuretyApp.withdrawFunds({ from: passenger2, gasPrice: gasPrice });
    let gasUsed2 = new BigNumber(transaction2.receipt.gasUsed);
    let txCost2 = gasUsed2.times(gasPrice);
    let balanceAfterWithdrawal2 = new BigNumber(await web3.eth.getBalance(passenger2));
  
    // ASSERT
    assert.equal(balanceAfterWithdrawal1.minus(balanceBeforeWithdrawal1).plus(txCost1).toString(), payoutAmount1.toString(), "Passenger1 should receive the payout amount");
    assert.equal(balanceAfterWithdrawal2.minus(balanceBeforeWithdrawal2).plus(txCost2).toString(), payoutAmount2.toString(), "Passenger2 should receive the payout amount");

    // Retrieve and log past events for this test case
    // await logPastEvents(config.flightSuretyData, 'CreditPaid');
  });

  /****************************************************************************************/
  /* Oracles Tests                                                                       */
  /****************************************************************************************/
  
  it('can register oracles', async () => {
    // ARRANGE
    const ORACLE_REGISTRATION_FEE = await config.flightSuretyApp.REGISTRATION_FEE.call();

    // ACT
    for (let a = startIndex; a < ORACLES_COUNT + startIndex; a++) {
      try {
        await config.flightSuretyApp.registerOracle({ from: accounts[a], value: ORACLE_REGISTRATION_FEE });
        let result = await config.flightSuretyApp.getMyIndexes.call({ from: accounts[a] });
        if (a === startIndex) {
          oracleIndexes = result;
        }
        console.log(`Oracle ${a-startIndex+1} Registered: ${result[0]}, ${result[1]}, ${result[2]}, ${accounts[a]}`);
      } catch (e) {
        console.error(`Oracle registration failed for ${accounts[a]}`, e);
      }
    }
  });

  it('can request flight status', async () => {
    // ARRANGE
    let airline = airline2;
    let flight = flight2;
    let timestamp = timestamp2;
    let passenger1 = accounts[7];

    // ACT
    await config.flightSuretyApp.fetchFlightStatus(oracleIndexes[0], airline, flight, timestamp, { from: passenger1 });
   
    // ASSERT
    let event = await config.flightSuretyApp.getPastEvents('OracleRequest', { fromBlock: 0, toBlock: 'latest' });
    assert.equal(event.length, 1, 'OracleRequest event should be emitted once');
    assert.equal(event[0].args.airline, airline, 'Event airline does not match');
    assert.equal(event[0].args.flight, flight, 'Event flight does not match');
    assert.equal(event[0].args.timestamp.toNumber(), timestamp, 'Event timestamp does not match');

    // Retrieve and log past events for this test case
    // await logPastEvents(config.flightSuretyApp, 'OracleRequest');
  });

  it('can submit Oracle Responses and handle Flight Status Updates', async () => {
    // ARRANGE
    let airline = airline2;
    let flight = flight2;
    let timestamp = timestamp2;
    let statusCode = STATUS_CODE_LATE_AIRLINE;
  
    // ACT
    for (let a = startIndex; a < ORACLES_COUNT + startIndex; a++) {
      // Submit a response...it will only be accepted if there is an Index match
      try {
        await config.flightSuretyApp.submitOracleResponse(oracleIndexes[0], airline, flight, timestamp, statusCode, { from: accounts[a] });
      } catch (e) {
        // Handle the error here if needed
        // console.error("Oracle response submission failed:", e);
      }
    }

    // ASSERT
    let oracleReportEvent = await config.flightSuretyApp.getPastEvents('OracleReport', { fromBlock: 0, toBlock: 'latest' });
    let flightStatusInfoEvent = await config.flightSuretyApp.getPastEvents('FlightStatusInfo', { fromBlock: 0, toBlock: 'latest' });
  
    assert.equal(oracleReportEvent.length >= 1, true, 'OracleReport event should be emitted once');
    assert.equal(oracleReportEvent[0].args.airline, airline, 'Event airline does not match');
    assert.equal(oracleReportEvent[0].args.flight, flight, 'Event flight does not match');
    assert.equal(oracleReportEvent[0].args.timestamp.toNumber(), timestamp, 'Event timestamp does not match');
    assert.equal(oracleReportEvent[0].args.status.toNumber(), statusCode, 'Event status code does not match');
  
    assert.equal(flightStatusInfoEvent.length, 1, 'FlightStatusInfo event should be emitted once');
    assert.equal(flightStatusInfoEvent[0].args.airline, airline, 'Event airline does not match');
    assert.equal(flightStatusInfoEvent[0].args.flight, flight, 'Event flight does not match');
    assert.equal(flightStatusInfoEvent[0].args.timestamp.toNumber(), timestamp, 'Event timestamp does not match');
    assert.equal(flightStatusInfoEvent[0].args.status.toNumber(), statusCode, 'Event status code does not match');

    // Retrieve and log past events for this test case
    // await logPastEvents(config.flightSuretyApp, 'OracleReport');
    // await logPastEvents(config.flightSuretyApp, 'FlightStatusInfo');
  });

  after('clean up', async () => {
    // Refund any funds added to the contract during the tests
    let balance = new BigNumber(await web3.eth.getBalance(config.flightSuretyApp.address));
    if (balance.gt(0)) {
      await config.flightSuretyApp.withdrawFunds({ from: config.owner });
    }
  });

  // async function logPastEvents(contractInstance, eventType, filterOptions = {}) {
  async function logPastEvents(contractInstance, eventType, eventName) {
    let pastEvents = await contractInstance.getPastEvents(eventType, {
      fromBlock: 0,
      toBlock: 'latest'
    });
    pastEvents.forEach(event => {
      // console.log(`${eventType} Events:`, event.returnValues[eventName]);
      console.log(`${eventType} Events:`, event.returnValues);
    });
  };
});

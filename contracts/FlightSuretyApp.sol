// SPDX-License-Identifier: MIT
pragma solidity >=0.4.25;

// It's important to avoid vulnerabilities due to numeric overflow bugs
// OpenZeppelin's SafeMath library, when used correctly, protects agains such bugs
// More info: https://www.nccgroup.trust/us/about-us/newsroom-and-events/blog/2018/november/smart-contract-insecurity-bad-arithmetic/

import "../node_modules/@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./FlightSuretyData.sol";

/************************************************** */
/* FlightSurety Smart Contract                      */
/************************************************** */
contract FlightSuretyApp {
    using SafeMath for uint256; // Allow SafeMath functions to be called for all uint256 types (similar to "prototype" in Javascript)

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/
    FlightSuretyData private flightSuretyData;
    address private contractOwner;
    address payable private flightSuretyDataAddress;
    uint256 private constant MULTI_PARTY_CONSENSUS = 50;
    uint8 private constant STATUS_CODE_LATE_AIRLINE = 20;
    
    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/
    event FundingReceived(address payer, uint256 payoutAmount);

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
    * @dev Modifier that requires the "operational" boolean variable to be "true"
    *      This is used on all state changing functions to pause the contract in 
    *      the event there is an issue that needs to be fixed
    */
    modifier requireIsOperational() {
        require(flightSuretyData.isOperational(), "Contract is currently not operational");
        _;
    }

    /**
    * @dev Modifier that requires the "ContractOwner" account to be the function caller
    */
    modifier requireContractOwner()
    {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    /**
    * @dev Modifier that requires Airline to be registered
    */
    modifier requireAirlineRegistered(address airline) {
        require(flightSuretyData.isAirlineRegistered(airline), "Airline must be Registered");
        _;
    }

    /**
    * @dev Modifier that requires Airline to be funded
    */
    modifier requireAirlineFunded(address airline) {
        require(flightSuretyData.isAirlineFunded(airline), "Airline must be funded to participate");
        _;
    }

    /********************************************************************************************/
    /*                                       CONSTRUCTOR                                        */
    /********************************************************************************************/

    /**
    * @dev Contract constructor
    *
    */
    constructor(address payable dataContractAddress) {
        contractOwner = msg.sender;
        flightSuretyDataAddress = dataContractAddress;
        flightSuretyData = FlightSuretyData(dataContractAddress);
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    function isOperational() public view returns(bool) {
        return flightSuretyData.isOperational();
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/
  
   /**
    * @dev Add an airline to the registration queue
    *
    */
    function registerAirline(address airline) external requireIsOperational requireAirlineRegistered(msg.sender) requireAirlineFunded(msg.sender) {
        // If there are less than four registered airlines, any registered airline can register a new airline
        if (flightSuretyData.getRegisteredAirlineCount() < 4) {
            flightSuretyData.registerAirline(airline);
        }
        // If there are four or more registered airlines, multi-party consensus is required
        else {
            require(!flightSuretyData.isMultiPartyConsensus(msg.sender), "Airline is already in the multi-party consensus list");
            flightSuretyData.addMultiPartyConsensus(msg.sender);
            uint256 consensusCount = flightSuretyData.getMultiPartyConsensusLength();
            if (consensusCount > flightSuretyData.getRegisteredAirlineCount().mul(MULTI_PARTY_CONSENSUS).div(100)) {
                flightSuretyData.registerAirline(airline);
                flightSuretyData.clearMultiPartyConsensus();
            }
        }
    }

   /**
    * @dev Register a future flight for insuring.
    *
    */
    function registerFlight(string calldata flight, uint256 timestamp) external requireIsOperational requireAirlineRegistered(msg.sender) requireAirlineFunded(msg.sender) {
        require(bytes(flight).length > 0, "Flight name is required");
        flightSuretyData.registerFlight(msg.sender, flight, timestamp);
    }
    
    function isFlightRegistered(address airline, string calldata flight, uint256 timestamp) public view returns (bool) {
        bytes32 flightKey = flightSuretyData.getFlightKey(airline, flight, timestamp);
        return flightSuretyData.isFlightRegistered(flightKey);
    }

    function getFlightDetails(address airline, string calldata flight, uint256 timestamp) public view returns (
        bool isRegistered,
        uint8 statusCode,
        uint256 updatedTimestamp,
        string memory flightName,
        address airlineName
    ) {
        bytes32 flightKey = flightSuretyData.getFlightKey(airline, flight, timestamp);
        return flightSuretyData.getFlightDetails(flightKey);
    }

    function getAllRegisteredFlightDetails() external view returns (
        bool[] memory isRegistered,
        uint8[] memory statusCode,
        uint256[] memory updatedTimestamp,
        string[] memory flightName,
        address[] memory airline
    ) {
        return flightSuretyData.getAllRegisteredFlightDetails();
    }
    
    /**
     * @dev Buy insurance for a flight
     *
     */
    function buyInsurance(address airline, string calldata flight, uint256 timestamp) external payable requireIsOperational {
        address passenger = msg.sender;
        bytes32 flightKey = flightSuretyData.getFlightKey(airline, flight, timestamp);
        // Ensure the flight is registered
        require(flightSuretyData.isFlightRegistered(flightKey), "Flight is not registered");
        // Transfer the insurance payment to the contract
        flightSuretyData.buyInsurance{value: msg.value}(passenger, flightKey);
    }

    /**
    * @dev Get the insurance details for a passenger's flight
    *
    */
    function getInsurance(address airline, string calldata flight, uint256 timestamp) external view returns (uint256 insuredAmount, bool isInsured) {
        bytes32 flightKey = flightSuretyData.getFlightKey(airline, flight, timestamp);
        address passenger = msg.sender;
        insuredAmount = flightSuretyData.getInsuranceAmount(passenger, flightKey);
        isInsured = insuredAmount > 0;
        return (insuredAmount, isInsured);
    }

   /**
    * @dev Called after oracle has updated flight status
    *
    */  
    function processFlightStatus(
        string memory flight,
        uint256 timestamp,
        uint8 statusCode
    ) public requireIsOperational requireAirlineRegistered(msg.sender) requireAirlineFunded(msg.sender) {
        bytes32 flightKey = flightSuretyData.getFlightKey(msg.sender, flight, timestamp);
        flightSuretyData.updateFlightStatus(flightKey, statusCode);
        address[] memory passengers;
        uint256[] memory payoutAmounts;
        if (statusCode == STATUS_CODE_LATE_AIRLINE) {
            (passengers, payoutAmounts) = flightSuretyData.getInsuredPassengersForFlight(flightKey);
            for (uint256 i = 0; i < passengers.length; i++) {
                address passenger = passengers[i];
                uint256 payoutAmount = payoutAmounts[i];
                flightSuretyData.creditInsurees(passenger, flightKey, payoutAmount);
            }
        }
    }

    function getFlightStatus(address airline, string calldata flight, uint256 timestamp) external view returns (uint8) {
        bytes32 flightKey = flightSuretyData.getFlightKey(airline, flight, timestamp);
        (, uint8 statusCode, , , ) = flightSuretyData.getFlightDetails(flightKey); 
        return statusCode;
    }

    /**
     * @dev Transfers eligible payout funds to insuree
     *
    */
    function withdrawFunds() external requireIsOperational {
        flightSuretyData.withdrawFunds(payable(msg.sender));
    }

    /**
    * @dev Funding function for the smart contract.
    *      This function is triggered by the fallback function in the `FlightSuretyData` contract.
    */
    function fund() external payable requireIsOperational { 
        require(msg.value > 0, "Funding amount must be greater than 0");
        // Transfer the received funds to the FlightSuretyData contract
        address payable dataContract = flightSuretyDataAddress;
        dataContract.transfer(msg.value);
        // Emit an event or perform any additional actions as needed
        emit FundingReceived(msg.sender, msg.value);
    }
    /**
    * @dev Funding function for Airlines.
    */
    function fundAirline() external payable requireIsOperational {
        require(msg.value >= 10 ether, "Funding amount must be at least 10 ether");
        flightSuretyData.fundAirline{value: msg.value}(msg.sender);
    }

    function getFlightKey
                        (
                            address airline,
                            string memory flight,
                            uint256 timestamp
                        )
                        pure
                        internal
                        returns(bytes32) 
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

// region ORACLE MANAGEMENT

    // Incremented to add pseudo-randomness at various points
    uint8 private nonce = 0;

    // Fee to be paid when registering oracle
    uint256 public constant REGISTRATION_FEE = 1 ether;

    // Number of oracles that must respond for valid status
    uint256 private constant MIN_RESPONSES = 3;

    struct Oracle {
        bool isRegistered;
        uint8[3] indexes;        
    }

    // Track all registered oracles
    mapping(address => Oracle) private oracles;

    // Model for responses from oracles
    struct ResponseInfo {
        address requester; // Account that requested status
        bool isOpen; // If open, oracle responses are accepted 
        mapping(uint8 => address[]) responses; // Mapping of status code to oracle responses
    }

    // Track all oracle responses
    mapping(bytes32 => ResponseInfo) private oracleResponses;

    // Event definition
    event OracleRequest(uint8 index, address airline, string flight, uint256 timestamp);
    event OracleReport(address airline, string flight, uint256 timestamp, uint8 status);
    event FlightStatusInfo(address airline, string flight, uint256 timestamp, uint8 status);

    // Register an oracle with the contract
    function registerOracle(
    )
        external
        payable
    {
        // Require registration fee
        require(msg.value >= REGISTRATION_FEE, "Registration fee is required");
        uint8[3] memory indexes = generateIndexes(msg.sender);
        oracles[msg.sender] = Oracle({
            isRegistered: true,
            indexes: indexes
        });
    }

    // Generate a request for oracles to fetch flight information
    function fetchFlightStatus(
        uint8 index,
        address airline, 
        string calldata flight, 
        uint256 timestamp
    ) external {
        require(isFlightRegistered(airline, flight, timestamp), "Flight not registered");
        bytes32 key = keccak256(abi.encodePacked(index, airline, flight, timestamp)); // Generate a unique key for storing the request
        ResponseInfo storage responseInfo = oracleResponses[key]; // Initialize the ResponseInfo struct and its nested mapping
        responseInfo.requester = msg.sender;
        responseInfo.isOpen = true;
        emit OracleRequest(index, airline, flight, timestamp);
    }

    // Called by oracle when a response is available to an outstanding request
    // For the response to be accepted, there must be a pending request that is open
    // and matches one of the three Indexes randomly assigned to the oracle at the
    // time of registration (i.e. uninvited oracles are not welcome)
    function submitOracleResponse(
        uint8 index,
        address airline,
        string calldata flight,
        uint256 timestamp,
        uint8 statusCode
    ) external {
        require(
            (oracles[msg.sender].indexes[0] == index) ||
            (oracles[msg.sender].indexes[1] == index) ||
            (oracles[msg.sender].indexes[2] == index),
            "Index does not match oracle request"
        );
        bytes32 key = keccak256(abi.encodePacked(index, airline, flight, timestamp));
        ResponseInfo storage responseInfo = oracleResponses[key];
        require(responseInfo.isOpen, "Flight status info is not open for this oracle request");
        if (responseInfo.responses[statusCode].length == 0) {
            responseInfo.responses[statusCode] = new address[](0); // Initialize the responses mapping if not done already
        }
        responseInfo.responses[statusCode].push(msg.sender);
        emit OracleReport(airline, flight, timestamp, statusCode);
        // Information isn't considered verified until at least MIN_RESPONSES
        // oracles respond with the *** same *** information
        if (responseInfo.responses[statusCode].length >= MIN_RESPONSES) {
            responseInfo.isOpen = false;
            emit FlightStatusInfo(airline, flight, timestamp, statusCode);
        }
    }

    // Returns array of three non-duplicating integers from 0-9
    function generateIndexes(                       
        address account         
    )
        internal
        returns(uint8[3] memory)
    {
        uint8[3] memory indexes;
        indexes[0] = getRandomIndex(account);
        indexes[1] = indexes[0];
        while(indexes[1] == indexes[0]) {
            indexes[1] = getRandomIndex(account);
        }
        indexes[2] = indexes[1];
        while((indexes[2] == indexes[0]) || (indexes[2] == indexes[1])) {
            indexes[2] = getRandomIndex(account);
        }
        return indexes;
    }

    // Returns array of three non-duplicating integers from 0-9
    function getRandomIndex(address account) internal returns (uint8) {
        uint8 maxValue = 10;
        uint8 newIndex = uint8(uint256(keccak256(abi.encodePacked(blockhash(block.number - 1), account, nonce))) % maxValue);
        nonce++;
        return newIndex;
    }

    function getMyIndexes(
    )
        view
        external
        returns(uint8[3] memory)
    {
        require(oracles[msg.sender].isRegistered, "Not registered as an oracle");
        return oracles[msg.sender].indexes;
    }

    function generateRandomStatusCode() public view returns (uint8) {
        uint8[] memory statusCodes = new uint8[](5);
        statusCodes[0] = 10; // STATUS_CODE_ON_TIME
        statusCodes[1] = 20; // STATUS_CODE_LATE_AIRLINE
        statusCodes[2] = 30; // STATUS_CODE_LATE_WEATHER
        statusCodes[3] = 40; // STATUS_CODE_LATE_TECHNICAL
        statusCodes[4] = 50; // STATUS_CODE_LATE_OTHER
        return statusCodes[block.timestamp % 5];
    }
}   

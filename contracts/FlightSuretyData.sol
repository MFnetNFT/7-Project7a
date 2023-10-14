// SPDX-License-Identifier: MIT
pragma solidity >=0.4.25;

import "../node_modules/@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./FlightSuretyApp.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/
    FlightSuretyApp private flightSuretyApp;
    address private contractOwner; // Account used to deploy contract
    bool private operational = true; // Blocks all state changes throughout the contract if false
    uint8 private constant STATUS_CODE_LATE_AIRLINE = 20;
    mapping(address => bool) private registeredAirlines;
    mapping(address => bool) private fundedAirlines;
    mapping(address => uint256) private airlineFunds;
    uint256 private registeredAirlineCount;
    address[] private multiPartyConsensus;
    uint256 private maxInsuranceAmount = 1 ether; // Set initial maximum
    mapping(address => mapping(bytes32 => uint256)) private insuranceAmounts;
    mapping(bytes32 => address[]) private insuredPassengers;
    struct Flight {
        bool isRegistered;
        uint8 statusCode;
        uint256 updatedTimestamp; 
        string flightName;       
        address airline;
    }
    mapping(bytes32 => Flight) private flights;
    bytes32[] private registeredFlightKeys;

    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/
    event AirlineRegistered(address airline);
    event AirlineFunded(address airline, uint256 amount);
    event FlightRegistered(bytes32 flightKey);
    event InsurancePurchased(address passenger, bytes32 flightKey, uint256 amount);
    event FlightStatusUpdated(bytes32 flightKey, uint8 statusCode);
    event InsuranceCredited(address passenger, bytes32 flightKey, uint256 creditAmount);
    event CreditPaid(address passenger, uint256 payoutAmount);
    event FundsWithdrawn(address owner, uint256 contractBalance);

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
    modifier requireIsOperational() 
    {
        require(operational, "Contract is currently not operational");
        _;  // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
    * @dev Modifier that requires the "ContractOwner" account to be the function caller
    */
    modifier requireContractOwner()
    {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    /********************************************************************************************/
    /*                                       CONSTRUCTOR                                        */
    /********************************************************************************************/

    /**
    * @dev Constructor
    *      The deploying account becomes contractOwner
    */
    constructor(address firstAirlineAddress) {
        contractOwner = msg.sender;
        registeredAirlines[firstAirlineAddress] = true;
        registeredAirlineCount = 1;
        emit AirlineRegistered(firstAirlineAddress);
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
    * @dev Get operating status of contract
    *
    * @return A bool that is the current operating status
    */      
    function isOperational() public view returns(bool) {
        return operational;
    }

    /**
    * @dev Sets contract operations on/off
    *
    * When operational mode is disabled, all write transactions except for this one will fail
    */    
    function setOperatingStatus(bool mode) external requireContractOwner {
        operational = mode;
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

    function fundAirline(address airline) external payable {
        require(fundedAirlines[airline] == false, "Airline is already funded");
        fundedAirlines[airline] = true;
        airlineFunds[airline] = airlineFunds[airline].add(msg.value);
        emit AirlineFunded(airline, msg.value);
    }

    function isAirlineFunded(address airline) external view returns (bool) {
        return fundedAirlines[airline];
    }

    /**
     * @dev Get the number of registered airlines
     *
     * @return The count of registered airlines
     */
    function getRegisteredAirlineCount() external view returns (uint256) {
        return registeredAirlineCount;
    }

    /**
     * @dev Register an airline
     *
     * @param airline The address of the airline to register
     */
    function registerAirline(address airline) external requireIsOperational {
        require(!registeredAirlines[airline], "Airline is already registered");
        registeredAirlines[airline] = true;
        registeredAirlineCount++;
        emit AirlineRegistered(airline);
    }

    function isAirlineRegistered(address airline) external view returns (bool) {
        return registeredAirlines[airline];
    }

    function registerFlight(
        address airline,
        string calldata flight,
        uint256 timestamp
    ) external requireIsOperational {
        bytes32 flightKey = getFlightKey(airline, flight, timestamp);
        require(!flights[flightKey].isRegistered, "Flight is already registered");
        registeredFlightKeys.push(flightKey);
        flights[flightKey] = Flight({
            isRegistered: true,
            statusCode: 0, // Set initial status code to STATUS_CODE_UNKNOWN
            updatedTimestamp: timestamp,
            flightName: flight,
            airline: airline
        });
        emit FlightRegistered(flightKey);
    }

    function isFlightRegistered(bytes32 flightKey) external view returns (bool) {
    return flights[flightKey].isRegistered;
    }
    
    function getFlightDetails(bytes32 flightKey)
        public
        view
        returns (
            bool isRegistered,
            uint8 statusCode,
            uint256 updatedTimestamp,
            string memory flightName,
            address airline
        )
    {
        Flight storage flight = flights[flightKey];
        return (
            flight.isRegistered,
            flight.statusCode,
            flight.updatedTimestamp,
            flight.flightName,
            flight.airline
        );
    }

    function getAllRegisteredFlightDetails()
        external
        view
        returns (
            bool[] memory isRegistered,
            uint8[] memory statusCode,
            uint256[] memory updatedTimestamp,
            string[] memory flightName,
            address[] memory airline
        )
    {
        uint256 flightCount = registeredFlightKeys.length;
        isRegistered = new bool[](flightCount);
        statusCode = new uint8[](flightCount);
        updatedTimestamp = new uint256[](flightCount);
        flightName = new string[](flightCount);
        airline = new address[](flightCount);
        for (uint256 i = 0; i < flightCount; i++) {
            bytes32 flightKey = registeredFlightKeys[i];
            (
                isRegistered[i],
                statusCode[i],
                updatedTimestamp[i],
                flightName[i],
                airline[i]
            ) = getFlightDetails(flightKey);
        }
    }

    /**
    * @dev Buy insurance for a flight
    *
    */
    function buyInsurance(address passenger, bytes32 flightKey) external payable requireIsOperational {
        require(msg.value > 0 && msg.value <= maxInsuranceAmount, "Invalid insurance amount");
        require(flights[flightKey].isRegistered, "Flight is not registered");
        require(insuranceAmounts[passenger][flightKey] == 0, "Passenger has already purchased insurance for this flight");
        insuredPassengers[flightKey].push(passenger);
        insuranceAmounts[passenger][flightKey] = insuranceAmounts[passenger][flightKey].add(msg.value);
        emit InsurancePurchased(passenger, flightKey, msg.value);
    }

    function setMaxInsuranceAmount(uint256 amount) external requireContractOwner {
        maxInsuranceAmount = amount;
    }

    /**
    * @dev Get the insurance amount for a passenger's flight
    *
    * @return insuredAmount The amount of insurance purchased by the passenger for the flight
    */
    function getInsuranceAmount(address passenger, bytes32 flightKey) external view returns (uint256 insuredAmount) {
        return insuranceAmounts[passenger][flightKey];
    }

    function getInsuredPassengersForFlight(bytes32 flightKey)
        external
        view
        returns (address[] memory passengers, uint256[] memory payoutAmounts)
    {
        address[] memory insuredPassengerList = insuredPassengers[flightKey];
        uint256[] memory amounts = new uint256[](insuredPassengerList.length);
        for (uint256 i = 0; i < insuredPassengerList.length; i++) {
            amounts[i] = insuranceAmounts[insuredPassengerList[i]][flightKey];
        }
        return (insuredPassengerList, amounts);
    }

    function updateFlightStatus(bytes32 flightKey, uint8 statusCode) external requireIsOperational {
        require(flights[flightKey].isRegistered, "Flight is not registered");
        flights[flightKey].statusCode = statusCode;
        emit FlightStatusUpdated(flightKey, statusCode);
    }   

    function creditInsurees(
        address passenger,
        bytes32 flightKey,
        uint256 payoutAmount
    ) external requireIsOperational {
        require(payoutAmount > 0, "Payout amount must be greater than 0");
        uint256 insuranceAmount = insuranceAmounts[passenger][flightKey];
        require(insuranceAmount >= payoutAmount, "Payout amount exceeds insured amount");
        // Reduce the insured amount
        insuranceAmounts[passenger][flightKey] = insuranceAmount.sub(payoutAmount);
        // Credit the insured passenger
        uint256 creditedAmount = payoutAmount.mul(3).div(2); // Apply a 1.5x multiplier for credits
        creditInsureeBalance(passenger, creditedAmount);
        emit InsuranceCredited(passenger, flightKey, creditedAmount);
    }

    function creditInsureeBalance(address passenger, uint256 amount) internal {
        uint256 currentBalance = airlineFunds[passenger];
        airlineFunds[passenger] = currentBalance.add(amount);
    }

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
    */
    function withdrawFunds(address payable passenger) external payable requireIsOperational {
        if (passenger == contractOwner) {
            uint256 contractBalance = address(this).balance;
            require(contractBalance > 0, "Contract has no funds to withdraw");
            passenger.transfer(contractBalance);
            emit FundsWithdrawn(passenger, contractBalance);
        } else {
            uint256 payoutAmount = airlineFunds[passenger];
            require(payoutAmount > 0, "No payout amount available for this passenger");
            require(address(this).balance >= payoutAmount, "Contract does not have sufficient funds for payout");
            airlineFunds[passenger] = airlineFunds[passenger].sub(payoutAmount);
            passenger.transfer(payoutAmount); // Transfer the payout amount to the passenger
            emit CreditPaid(passenger, payoutAmount);
        }
    }

    function getFlightKey(address airline, string memory flight, uint256 timestamp) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    /**
     * @dev Fallback function for funding the smart contract.
     *      This function will forward the received funds to the `fund()` function in the `FlightSuretyApp` contract.
     */
    receive() external payable {
        FlightSuretyApp(msg.sender).fund{value: msg.value}();
    }
    
    /**
     * @dev Check if the airline is part of the multi-party consensus list
     */
    function isMultiPartyConsensus(address airline) external view returns (bool) {
        for (uint256 i = 0; i < multiPartyConsensus.length; i++) {
            if (multiPartyConsensus[i] == airline) {
                return true;
            }
        }
        return false;
    }

    /**
     * @dev Get the length of the multi-party consensus list
     *
     * @return The length of the multi-party consensus list
     */
    function getMultiPartyConsensusLength() external view returns (uint256) {
        return multiPartyConsensus.length;
    }

    /**
     * @dev Get the address at a given index from the multi-party consensus list
     *
     * @param index The index to retrieve the address from
     * @return The address at the given index
     */
    function getMultiPartyConsensus(uint256 index) external view returns (address) {
        require(index < multiPartyConsensus.length, "Invalid index");
        return multiPartyConsensus[index];
    }

    /**
     * @dev Add an airline to the multi-party consensus list
     *
     * @param airline The address of the airline to add
     */
    function addMultiPartyConsensus(address airline) external requireIsOperational {
        multiPartyConsensus.push(airline);
    }

    /**
     * @dev Clear the multi-party consensus list
     */
    function clearMultiPartyConsensus() external requireIsOperational {
        require(multiPartyConsensus.length > 0, "Multi-party consensus list is already empty");
        delete multiPartyConsensus;
    }
}

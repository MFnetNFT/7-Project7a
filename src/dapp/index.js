import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';

(async() => {

    let result = null;

    let contract = new Contract('localhost', async () => {

        // Listen to all events emitted by the FightSuretyApp contract
        contract.flightSuretyApp.events.allEvents({
            fromBlock: 0
        }, async (error, event) => {
            if (error) {
                console.error("Error with FightSuretyApp contract event:", error);
            } else {
                console.log("Received FightSuretyApp contract event:", event.event, event);
                // Check if the received event is 'FlightStatusInfo'
                if (event.event === 'FlightStatusInfo') {
                    console.log("Received FlightStatusInfo event:", event.returnValues);
                    // Extract relevant information from the event
                    const airline = event.returnValues.airline;
                    const flight = event.returnValues.flight;
                    const timestamp = event.returnValues.timestamp;
                    const statusCode = event.returnValues.status;
                    // Call the processFlightStatus function with the extracted information
                    await contract.processFlightStatus(airline, flight, timestamp, statusCode);
                }            
            }
        });

        // Listen to all events emitted by the FightSuretyData contract
        contract.flightSuretyData.events.allEvents({
            fromBlock: 0
        }, async (error, event) => {
            if (error) {
                console.error("Error with FightSuretyData contract event:", error);
            } else {
                console.log("Received FightSuretyData contract event:", event.event, event);
            }
        });

        // Read transaction
        contract.isOperational((error, result) => {
            console.log(error,result);
            display('Operational Status', 'Check if contract is operational', [ { label: 'Operational Status', error: error, value: result} ]);
        });

        // Update the oracle interface with flight options
        let selectFlightOracle = DOM.elid('select-flight-oracle');
        updateFlightOracleDropdown(selectFlightOracle, contract.flights);

        // User-submitted transaction
        DOM.elid('submit-oracle').addEventListener('click', async () => {
            let selectFlightOracle = DOM.elid('select-flight-oracle');
            let selectedFlightOracleIndex = parseInt(selectFlightOracle.value, 10);
            let selectedFlightOracle = contract.flights[selectedFlightOracleIndex];
            let index = Math.floor(Math.random() * 10); // Generate a random index from 0 to 9
            let airline = selectedFlightOracle.airline;
            let flight = selectedFlightOracle.flightName;
            let timestamp = selectedFlightOracle.timestamp;

            await contract.fetchFlightStatus(index, airline, flight, timestamp, (error, result) => {
                if (error) {
                    display('Oracles', 'Trigger oracles', [{ label: 'Fetch Flight Status', error: error }]);
                } else {
                    display('Oracles', 'Trigger oracles', [{ label: 'Fetch Flight Status', value: `Flight ${flight} status requested successfully` }]);
                }
            });
        });

        // Update the user interface with flight options
        let selectFlight = DOM.elid('select-flight');
        updateFlightDropdown(selectFlight, contract.flights);

        // Update the user interface with passenger options
        let selectPassenger = DOM.elid('select-passenger');
        updatePassengerDropdown(selectPassenger, contract.passengers);

        // Handle purchase insurance button click
        DOM.elid('purchase-insurance').addEventListener('click', async () => {
            let selectFlight = DOM.elid('select-flight');
            let selectedFlightIndex = parseInt(selectFlight.value, 10);
            let selectPassenger = DOM.elid('select-passenger');
            let selectedPassengerIndex = parseInt(selectPassenger.value, 10);
            let selectedFlight = contract.flights[selectedFlightIndex];
            let selectedPassenger = contract.passengers[selectedPassengerIndex];
            let airline = selectedFlight.airline;
            let flight = selectedFlight.flightName;
            let timestamp = selectedFlight.timestamp;
            await contract.purchaseInsurance(airline, flight, timestamp, selectedPassenger);
        });

        // Handle check status button click
        DOM.elid('check-status').addEventListener('click', async () => {
            let selectFlight = DOM.elid('select-flight');
            let selectedFlightIndex = parseInt(selectFlight.value, 10);
            let selectPassenger = DOM.elid('select-passenger');
            let selectedPassengerIndex = parseInt(selectPassenger.value, 10);
            let selectedFlight = contract.flights[selectedFlightIndex];
            let selectedPassenger = contract.passengers[selectedPassengerIndex];
            let airline = selectedFlight.airline;
            let flight = selectedFlight.flightName;
            let timestamp = selectedFlight.timestamp;
            await contract.checkFlightStatus(airline, flight, timestamp, selectedPassenger);
        });

        // Handle withdraw funds button click
        DOM.elid('withdraw-funds').addEventListener('click', async () => {
            let selectPassenger = DOM.elid('select-passenger');
            let selectedPassengerIndex = parseInt(selectPassenger.value, 10);
            let selectedPassenger = contract.passengers[selectedPassengerIndex];
            await contract.withdrawFunds(selectedPassenger);
        });

    });
})();

    // Function to populate the flight options in the drop-down (oracle)
    async function updateFlightOracleDropdown(selectFlightOracle, flights) {
        // Clear existing options
        selectFlightOracle.innerHTML = '';
        // Populate the drop-down with the flights
        flights.forEach((flight, index) => {
            // Create a new option element for each flight
            let option = DOM.makeElement('option', flight.flightName);
            // Set the value attribute to the flight index
            option.setAttribute('value', index);
            // Append the option to the select element
            selectFlightOracle.appendChild(option);
        });
    }

    // Function to populate the flight options in the drop-down (user)
    async function updateFlightDropdown(selectFlight, flights) {
        // Clear existing options
        selectFlight.innerHTML = '';
        // Populate the drop-down with the flights
        flights.forEach((flight, index) => {
            // Create a new option element for each flight
            let option = DOM.makeElement('option', flight.flightName);
            // Set the value attribute to the flight index
            option.setAttribute('value', index);
            // Append the option to the select element
            selectFlight.appendChild(option);
        });
    }

    // Function to populate the passenger options in the drop-down
    function updatePassengerDropdown(selectPassenger, passengers) {
        // Clear existing options
        selectPassenger.innerHTML = '';
        // Populate the drop-down with the provided data
        passengers.forEach((passenger, index) => {
            // Create a new option element for each passenger
            let option = DOM.makeElement('option', passenger);
            // Set the value attribute to the passenger index
            option.setAttribute('value', index);
            // Append the option to the select element
            selectPassenger.appendChild(option);
        });
    }

    function display(title, description, results) {
        let displayDiv = DOM.elid("display-wrapper");
        let section = DOM.section();
        section.appendChild(DOM.h2(title));
        section.appendChild(DOM.h5(description));
        results.map((result) => {
            let row = section.appendChild(DOM.div({className:'row'}));
            row.appendChild(DOM.div({className: 'col-sm-4 field'}, result.label));
            row.appendChild(DOM.div({className: 'col-sm-8 field-value'}, result.error ? String(result.error) : String(result.value)));
            section.appendChild(row);
        })
        displayDiv.append(section);
    }

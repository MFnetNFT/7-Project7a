var FlightSuretyApp = artifacts.require("FlightSuretyApp");
var FlightSuretyData = artifacts.require("FlightSuretyData");
var BigNumber = require('bignumber.js');
var fs = require('fs');
var path = require('path');

var Config = async function(accounts) {
    
    // These test addresses are useful when you need to add
    // multiple users in test scripts
    let testAddresses = [
        "0x6E836dE5cD04FC39a80D8d44aAb2410594a7250b",
        "0x704bD07257601024E1E8166Ba243545AADE8b259",
        "0x6032Acf1A5deb7Dbe90f5a8696655247367CD87B",
        "0x56A9764f24746CB506699E63DD3810555Bafa764",
        "0x20AbF1E14e40cb2Fd4E34b649d4cC10d45F20a46",
        "0xCd909D9c739aDb1e7f5385749720a85b29227aB3",
        "0xc581c774AFE7e1e5dc238AE5F72603fdb9779885",
        "0x2799f2b41d8b6E0093aCFA6cBa4642435bE86C78",
        "0x742f46F905e8912C4CC8F0D1716c41aAb229d736",
        "0xFf16c42dC7907587410343B445cb0f1F02022960"
    ];

    let owner = accounts[0];
    let firstAirline = accounts[1];
    
    let configPath = path.join(__dirname, '../src/dapp/config.json');
    let configData = fs.readFileSync(configPath);
    let config = JSON.parse(configData);
    
    let dataAddress = config.localhost.dataAddress;
    let appAddress = config.localhost.appAddress;
    
    let flightSuretyData = await FlightSuretyData.at(dataAddress);
    let flightSuretyApp = await FlightSuretyApp.at(appAddress);
    
    return {
        owner: owner,
        firstAirline: firstAirline,
        weiMultiple: (new BigNumber(10)).pow(18),
        testAddresses: testAddresses,
        flightSuretyData: flightSuretyData,
        flightSuretyApp: flightSuretyApp
    }
}

module.exports = {
    Config: Config
};

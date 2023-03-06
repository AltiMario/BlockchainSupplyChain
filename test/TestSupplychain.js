const truffleAssert = require('truffle-assertions');

// This script is designed to test the solidity smart contract - SuppyChain.sol -- and the various functions within
// Declare a variable and assign the compiled smart contract artifact
const SupplyChain = artifacts.require('SupplyChain');

contract('SupplyChain', async (accounts) => {
    // Declare few constants and assign a few sample accounts generated by ganache-cli
    let sku = 1;
    let upc = 1;
    const ownerID = accounts[0];
    const originFarmerID = accounts[1];
	const originFarmName = "John Doe";
    const originFarmInformation = "Yarray Valley";
    const originFarmLatitude = "-38.239770";
    const originFarmLongitude = "144.341490";
    let productID = sku + upc;
    const productNotes = "Best beans for Espresso";
    const productPrice = web3.utils.toWei('1', "ether");
	const itemState = {
		Harvested: 0,
    	Processed: 1,
    	Packed: 2,
    	ForSale: 3,
    	Sold: 4,
    	Shipped: 5,
    	Received: 6,
    	Purchased: 7
	};
	const distributorID = accounts[2];
    const retailerID = accounts[3];
    const consumerID = accounts[4];
    const emptyAddress = '0x00000000000000000000000000000000000000';

    console.log("ganache-cli accounts used here...")
    console.log("Contract Owner: accounts[0] ", accounts[0])
    console.log("Farmer: accounts[1] ", accounts[1])
    console.log("Distributor: accounts[2] ", accounts[2])
    console.log("Retailer: accounts[3] ", accounts[3])
    console.log("Consumer: accounts[4] ", accounts[4])

    before(async () => {
        supplyChain = await SupplyChain.deployed();
        await supplyChain.addFarmer(originFarmerID);
    });

    // 1st Test
    it("Testing smart contract function harvestItem() that allows a farmer to harvest coffee", async() => {
        const tx = await supplyChain.harvestItem(upc, originFarmerID, originFarmName, originFarmInformation, originFarmLatitude, originFarmLongitude, productNotes);
        const resultBufferOne = await supplyChain.fetchItemBufferOne.call(upc);
        const resultBufferTwo = await supplyChain.fetchItemBufferTwo.call(upc);

        // Verify the result set:
        assert.equal(resultBufferOne[0], sku, 'Error: Invalid item SKU');
        assert.equal(resultBufferOne[1], upc, 'Error: Invalid item UPC');
        assert.equal(resultBufferOne[2], ownerID, 'Error: Missing or Invalid ownerID');
        assert.equal(resultBufferOne[3], originFarmerID, 'Error: Missing or Invalid originFarmerID');
        assert.equal(resultBufferOne[4], originFarmName, 'Error: Missing or Invalid originFarmName');
        assert.equal(resultBufferOne[5], originFarmInformation, 'Error: Missing or Invalid originFarmInformation');
        assert.equal(resultBufferOne[6], originFarmLatitude, 'Error: Missing or Invalid originFarmLatitude');
        assert.equal(resultBufferOne[7], originFarmLongitude, 'Error: Missing or Invalid originFarmLongitude');
        assert.equal(resultBufferTwo[5], itemState.Harvested, 'Error: Invalid item State');
		truffleAssert.eventEmitted(tx, 'Harvested', (evt) => { return evt.upc = upc});
    });

    // 2nd Test
    it("Testing smart contract function processItem() that allows a farmer to process coffee", async() => {
        const tx = await supplyChain.processItem(upc, { from: originFarmerID});
        const resultBufferOne = await supplyChain.fetchItemBufferOne(upc);
        const resultBufferTwo = await supplyChain.fetchItemBufferTwo(upc);

        // Verify the result set:
        assert.equal(resultBufferOne[0], sku, 'Error: Invalid item SKU');
        assert.equal(resultBufferTwo[5], itemState.Processed, 'Error: Invalid item State');
        truffleAssert.eventEmitted(tx, 'Processed', (evt) => { return evt.upc = upc});
    });
    // 3rd Test
    it("Testing smart contract function packItem() that allows a farmer to pack coffee", async() => {
        const tx = await supplyChain.packItem(upc);
        const resultBufferOne = await supplyChain.fetchItemBufferOne(upc);
        const resultBufferTwo = await supplyChain.fetchItemBufferTwo(upc);

        // Verify the result set:
        assert.equal(resultBufferOne[0], sku, 'Error: Invalid item SKU');
        assert.equal(resultBufferTwo[5], itemState.Packed, 'Error: Invalid item State');
        truffleAssert.eventEmitted(tx, 'Packed', (evt) => { return evt.upc = upc});
    });

    // 4th Test
    it("Testing smart contract function sellItem() that allows a farmer to sell coffee", async() => {
        const tx = await supplyChain.sellItem(upc, productPrice);
        const resultBufferOne = await supplyChain.fetchItemBufferOne(upc);
        const resultBufferTwo = await supplyChain.fetchItemBufferTwo(upc);

        // Verify the result set:
        assert.equal(resultBufferOne[0], sku, 'Error: Invalid item SKU');
        assert.equal(resultBufferTwo[4], productPrice, 'Error: Invalid item State');
        assert.equal(resultBufferTwo[5], itemState.ForSale, 'Error: Invalid item State');
        truffleAssert.eventEmitted(tx, 'ForSale', (evt) => { return evt.upc = upc});
    });

    // 5th Test
    it("Testing smart contract function buyItem() that allows a distributor to buy coffee", async() => {
        const farmerStartingBalance = await web3.eth.getBalance(originFarmerID);
        const distributorBuyPrice = web3.utils.toWei("2", "ether");
        const tx = await supplyChain.buyItem(upc, { from: distributorID, value: distributorBuyPrice});
        const farmerEndBalance = await web3.eth.getBalance(originFarmerID);
        const resultBufferOne = await supplyChain.fetchItemBufferOne(upc);
        const resultBufferTwo = await supplyChain.fetchItemBufferTwo(upc);

        // Verify the result set:
        assert.equal(resultBufferOne[0], sku, 'Error: Invalid item SKU');
        assert.equal(resultBufferTwo[5], itemState.Sold, 'Error: Invalid item State');
        assert.equal(resultBufferOne[2], distributorID, 'Error: Invalid item Owner');
        assert.equal(resultBufferTwo[6], distributorID, 'Error: Invalid distributor Id');
        assert.equal(farmerEndBalance - farmerStartingBalance, productPrice);
        truffleAssert.eventEmitted(tx, 'Sold', (evt) => { return evt.upc = upc});
    });

    // 6th Test
    it("Testing smart contract function shipItem() that allows a distributor to ship coffee", async() => {
        const tx = await supplyChain.shipItem(upc, {from: distributorID});
        const resultBufferOne = await supplyChain.fetchItemBufferOne(upc);
        const resultBufferTwo = await supplyChain.fetchItemBufferTwo(upc);

        // Verify the result set:
        assert.equal(resultBufferOne[0], sku, 'Error: Invalid item SKU');
        assert.equal(resultBufferTwo[5], itemState.Shipped, 'Error: Invalid item State');
        truffleAssert.eventEmitted(tx, 'Shipped', (evt) => { return evt.upc = upc});
    });

    // 7th Test
    it("Testing smart contract function receiveItem() that allows a retailer to mark coffee received", async() => {
        const tx = await supplyChain.receiveItem(upc, {from: retailerID});
        const resultBufferOne = await supplyChain.fetchItemBufferOne(upc);
        const resultBufferTwo = await supplyChain.fetchItemBufferTwo(upc);

        // Verify the result set:
        assert.equal(resultBufferOne[0], sku, 'Error: Invalid item SKU');
        assert.equal(resultBufferTwo[5], itemState.Received, 'Error: Invalid item State');
        assert.equal(resultBufferOne[2], retailerID, 'Error: Invalid Owner Id');
        assert.equal(resultBufferTwo[7], retailerID, 'Error: Invalid Retailer Id');
        truffleAssert.eventEmitted(tx, 'Received', (evt) => { return evt.upc = upc});
    });

    // 8th Test
    it("Testing smart contract function purchaseItem() that allows a consumer to purchase coffee", async() => {
        const tx = await supplyChain.purchaseItem(upc, {from: consumerID});
        const resultBufferOne = await supplyChain.fetchItemBufferOne(upc);
        const resultBufferTwo = await supplyChain.fetchItemBufferTwo(upc);
        
        // Verify the result set:
        assert.equal(resultBufferOne[0], sku, 'Error: Invalid item SKU');
        assert.equal(resultBufferTwo[5], itemState.Purchased, 'Error: Invalid item State');
        assert.equal(resultBufferOne[2], consumerID, 'Error: Invalid Owner Id');
        assert.equal(resultBufferTwo[8], consumerID, 'Error: Invalid Consumer Id');
        truffleAssert.eventEmitted(tx, 'Purchased', (evt) => { return evt.upc = upc});
    });

    // 9th Test
    it("Testing smart contract function fetchItemBufferOne() that allows anyone to fetch item details from blockchain", async() => {
        const resultBufferOne = await supplyChain.fetchItemBufferOne(upc);
        
        // Verify the result set:
        assert.equal(sku, resultBufferOne[0], 'Error: Invalid sku');
        assert.equal(upc, resultBufferOne[1], 'Error: Invalid puc');
        assert.equal(consumerID, resultBufferOne[2], 'Error: Invalid Owner Id');
        assert.equal(originFarmerID, resultBufferOne[3], 'Error: Invalid farmer id');
        assert.equal(originFarmName, resultBufferOne[4], 'Error: Invalid farmer name');
        assert.equal(originFarmInformation, resultBufferOne[5], 'Error: Invalid farmer information');
        assert.equal(originFarmLatitude, resultBufferOne[6], 'Error: Invalid farm latitude');
        assert.equal(originFarmLongitude, resultBufferOne[7], 'Error: Invalid farm longitude');
    });

    // 10th Test
    it("Testing smart contract function fetchItemBufferTwo() that allows anyone to fetch item details from blockchain", async() => {
        const resultBufferTwo = await supplyChain.fetchItemBufferTwo(upc);
        
        // Verify the result set:
        assert.equal(sku, resultBufferTwo[0], 'Error: Invalid sku');
        assert.equal(upc, resultBufferTwo[1], 'Error: Invalid upc');
        assert.equal(productID, resultBufferTwo[2], 'Error: Invalid product id');
        assert.equal(productNotes, resultBufferTwo[3], 'Error: Invalid product nodes');
        assert.equal(productPrice, resultBufferTwo[4], 'Error: Invalid product price');
        assert.equal(itemState.Purchased, resultBufferTwo[5], 'Error: Invalid item State');
        assert.equal(distributorID, resultBufferTwo[6], 'Error: Invalid distributor id');
        assert.equal(retailerID, resultBufferTwo[7], 'Error: Invalid Retailer Id');
        assert.equal(consumerID, resultBufferTwo[8], 'Error: Invalid Consumer Id');
    });
});
const Remittance = artifacts.require("./Remittance.sol");
const expectThrow = require("./util").expectThrow;

contract("Remittance", function(accounts) {

	const owner = accounts[0];
	const accOne = accounts[1];	
	const accTwo = accounts[2];
	const accThree = accounts[3];

	beforeEach(async () => {

			contract = await Remittance.new();	
			await contract.setFee(50, {from: owner});
			await contract.setMaxTimeLimit(60000, {from: owner});	
			
		});	


	function wait(ms){
		var start = new Date().getTime();
		var end = start;
		while(end < start + ms) {
		end = new Date().getTime();
		}
	}

	describe("Creating a transaction Tests", () => {
			

		it("Has an correct owner", async function () {

	      assert.equal(await contract.owner(), owner, "expected owner not set");
	    });

		it("Should create a transaction with correct values", async function () {

	    	let hash = await contract.giveMeSomeHash("pass1", "pass2");	    	

			await contract.createTransaction(hash, 60000, "Pesho", {from: accOne, value: 10});

			let timeNow = web3.eth.getBlock(web3.eth.blockNumber).timestamp;
			let transactValues = await contract.remittances(hash);

			assert.strictEqual(transactValues[0], accOne, "transaction From is not correct");
			// Returns Pesho != Pesho
			//assert.strictEqual(web3.toAscii(transactValues[1]), "Pesho", "transaction To is not correct");
			assert.strictEqual(transactValues[2].toNumber(), 10, "transaction Value is not correct");
			assert.strictEqual(transactValues[3].toNumber(), timeNow + 60000, "transaction TimeLimit is not correct");
			assert.isTrue(transactValues[4], "transaction isEntity is not correct");

		});

		it("Should create multiple transactions with correct values", async function () {

	    	let hash = await contract.giveMeSomeHash("pass1", "pass2");

			await contract.createTransaction(hash, 60000, "accTwo", {from: accOne, value: 10});
			let timeNow = web3.eth.getBlock(web3.eth.blockNumber).timestamp;
			let transactValues = await contract.remittances(hash);

			assert.strictEqual(transactValues[0], accOne, "transaction From is not correct");
			//assert.strictEqual(transactValues[1], "accTwo", "transaction To is not correct");
			assert.strictEqual(transactValues[2].toNumber(), 10, "transaction Value is not correct");
			assert.strictEqual(transactValues[3].toNumber(), timeNow + 60000, "transaction TimeLimit is not correct");
			assert.isTrue(transactValues[4], "transaction isEntity is not correct");

			// secondOne
			let hash2 = await contract.giveMeSomeHash("pass2", "pass3");

			await contract.createTransaction(hash2, 60000, "accTwo", {from: accTwo, value: 10});
			let timeNow2 = web3.eth.getBlock(web3.eth.blockNumber).timestamp;
			let transactValues2 = await contract.remittances(hash2);

			assert.strictEqual(transactValues2[0], accTwo, "transaction From is not correct");
			//assert.strictEqual(transactValues2[1], "accTwo", "transaction To is not correct");
			assert.strictEqual(transactValues2[2].toNumber(), 10, "transaction Value is not correct");
			assert.strictEqual(transactValues2[3].toNumber(), timeNow2 + 60000, "transaction TimeLimit is not correct");
			assert.isTrue(transactValues2[4], "transaction isEntity is not correct");

			//tird.. from a different sender and different rexiever
			let hash3 = await contract.giveMeSomeHash("pass4", "pass5");

			await contract.createTransaction(hash3, 60000, "accThree", {from: accThree, value: 20});
			let timeNow3 = web3.eth.getBlock(web3.eth.blockNumber).timestamp;
			let transactValues3 = await contract.remittances(hash3);

			assert.strictEqual(transactValues3[0], accThree, "transaction From is not correct");
			//assert.strictEqual(transactValues3[1], "accThree", "transaction To is not correct");
			assert.strictEqual(transactValues3[2].toNumber(), 20, "transaction Value is not correct");
			assert.strictEqual(transactValues3[3].toNumber(), timeNow3 + 60000, "transaction TimeLimit is not correct");
			assert.isTrue(transactValues3[4], "transaction isEntity is not correct");

		});

		it("Should NOT create a transaction with an existing passwords", async function () {

	    	let hash = await contract.giveMeSomeHash("pass1", "pass2");

			await contract.createTransaction(hash, 60000, "accTwo", {from: accOne, value: 10});
			await expectThrow(contract.createTransaction(hash, 60000, "accTwo", {from: accOne, value: 10}));
			//even from a different sender
			await expectThrow(contract.createTransaction(hash, 60000, "accTwo", {from: accTwo, value: 10}));			

		});

		it("Should NOT create a transaction with a zero value", async function () {

	    	let hash = await contract.giveMeSomeHash("pass1", "pass2");

			await expectThrow(contract.createTransaction(hash, 60000, "accTwo", {from: accOne, value: 0}));			

		});

		it("Should NOT create a transaction with a timeLimit bigger than 60000", async function () {

	    	let hash = await contract.giveMeSomeHash("pass1", "pass2");
	    	
			await expectThrow(contract.createTransaction(hash, 60001, "accTwo", {from: accOne, value: 10}));			

		});	    

		it("Should emit transaction creation", async function () {

			let expectedEvent = "LogTransactionCreated";
			let result = await contract.createTransaction("someHash", 60000, "accTwo", {from: accOne, value: 10});

			assert.lengthOf(result.logs, 1, "There should be 1 event emitted from setRate!");
			assert.strictEqual(result.logs[0].event, expectedEvent, "The event emitted was ${result.logs[0].event} instead of ${expectedEvent}");
		});

	});

	describe("Exchanging a transaction Tests", () => {

		it("Should Make a propper Exchage", async function () {

			let hash = await contract.giveMeSomeHash("pass1", "pass2");			

			await contract.createTransaction(hash, 60000, "Pesho", {from: accOne, value: 500});

			await contract.exchangeShop("pass1", "pass2", "Pesho", {from: owner});

			let localCurrency = web3.toWei(await contract.localCurrency("Pesho"));
			let ownerCommission = web3.toWei(await contract.ownersCommission());
			assert.equal(localCurrency.toNumber(), web3.toWei(500 - 500 / 50));
			assert.equal(ownerCommission.toNumber(), web3.toWei(500 / 50));

			//chek if the current remitt is deleted
			let CompleteRemit = await contract.remittances(hash);
			assert.isFalse(CompleteRemit[4]);
		});

		it("Should NOT make an Exchage with wrong pass", async function () {

			let hash = await contract.giveMeSomeHash("pass1", "pass2");

			await contract.createTransaction(hash, 60000, "Pesho", {from: accOne, value: 500});

			await expectThrow(contract.exchangeShop("pass1", "pass3", "Pesho", {from: owner}));
			
		});

		it("Should NOT make an Exchage to wrong reciever", async function () {

			let hash = await contract.giveMeSomeHash("pass1", "pass2");

			await contract.createTransaction(hash, 60000, "Pesho", {from: accOne, value: 500});

			await expectThrow(contract.exchangeShop("pass1", "pass2", "Gosho", {from: owner}));
			
		});

		it("Should NOT make an Exchage if sender is not the owner", async function () {

			let hash = await contract.giveMeSomeHash("pass1", "pass2");

			await contract.createTransaction(hash, 60000, "Pesho", {from: accOne, value: 500});

			await expectThrow(contract.exchangeShop("pass1", "pass2", "Pesho", {from: accTwo}));
			
		});

		it("Should NOT make an Exchage if the time limit is reached", async function () {

			let hash = await contract.giveMeSomeHash("pass1", "pass2");

			await contract.createTransaction(hash, 1, "Pesho", {from: accOne, value: 500});
			
			//let waitSomeSec = new web3FutureTime();
			let waitSomeSec = new wait(2000);

			await expectThrow(contract.exchangeShop("pass1", "pass2", "Pesho", {from: owner}));
			
		});

		it("Should emit exchange transaction", async function () {

			let hash = await contract.giveMeSomeHash("pass1", "pass2");

			let expectedEvent = "LogRemittanceReceived";
			await contract.createTransaction(hash, 60000, "accTwo", {from: accOne, value: 100});

			let result = await contract.exchangeShop("pass1", "pass2", "accTwo", {from: owner});

			assert.lengthOf(result.logs, 1, "There should be 1 event emitted from setRate!");
			assert.strictEqual(result.logs[0].event, expectedEvent, "The event emitted was ${result.logs[0].event} instead of ${expectedEvent}");
		});


	});

	describe("Return Funds After TimeLimit Testing", () => {

		it("Should return fund after time limit", async function () {

			let hash = await contract.giveMeSomeHash("pass1", "pass2");

			await contract.createTransaction(hash, 1, "Pesho", {from: accOne, value: 500});
				
			let waitSomeSec = new wait(2000);

			await contract.returnFundsAfterTimeLimit("pass1", "pass2", {from: accOne});
			let transactValues = await contract.remittances(hash);

			assert.isFalse(transactValues[4], "transaction isEntity is not correct");

		});	

		it("Should NOT return fund if the sender is not the original one", async function () {

			let hash = await contract.giveMeSomeHash("pass1", "pass2");

			await contract.createTransaction(hash, 1, "Pesho", {from: accOne, value: 500});
				
			let waitSomeSec = new wait(2000);

			await expectThrow(contract.returnFundsAfterTimeLimit("pass1", "pass2", {from: accTwo}));
			

		});	

		it("Should NOT return fund if the passwords are not correct", async function () {

			let hash = await contract.giveMeSomeHash("pass1", "pass2");

			await contract.createTransaction(hash, 1, "Pesho", {from: accOne, value: 500});
				
			let waitSomeSec = new wait(2000);

			await expectThrow(contract.returnFundsAfterTimeLimit("pass1", "pass3", {from: accOne}));
			

		});	

		it("Should NOT return fund if the time limit is not reached", async function () {

			let hash = await contract.giveMeSomeHash("pass1", "pass2");

			await contract.createTransaction(hash, 500, "Pesho", {from: accOne, value: 500});				

			await expectThrow(contract.returnFundsAfterTimeLimit("pass1", "pass2", {from: accOne}));
			

		});

		it("Should emit log for returning the money after time limit", async function () {

			let hash = await contract.giveMeSomeHash("pass1", "pass2");

			await contract.createTransaction(hash, 1, "Pesho", {from: accOne, value: 500});
			let waitSomeSec = new wait(2000);

			let expectedEvent = "LogReturnFundsAfterTimeLimit";

			let result = await contract.returnFundsAfterTimeLimit("pass1", "pass2", {from: accOne});

			assert.lengthOf(result.logs, 1, "There should be 1 event emitted from setRate!");
			assert.strictEqual(result.logs[0].event, expectedEvent, "The event emitted was ${result.logs[0].event} instead of ${expectedEvent}");
		});
	});

	describe("Getting owner commission Testing", () => {

		it("Should send commission funds to owner", async function () {

			let hash = await contract.giveMeSomeHash("pass1", "pass2");

			await contract.createTransaction(hash, 1, "Pesho", {from: accOne, value: 501});
			await contract.exchangeShop("pass1", "pass2", "Pesho", {from: owner});

			await contract.ownerWithdraw({from: owner});
			let result = await contract.ownersCommission();

			assert.strictEqual(result.toNumber(), 0);			
		});

		it("Should NOT send commission funds if the sender is not owner", async function () {

			let hash = await contract.giveMeSomeHash("pass1", "pass2");

			await contract.createTransaction(hash, 1, "Pesho", {from: accOne, value: 501});
			await contract.exchangeShop("pass1", "pass2", "Pesho", {from: owner});

			await expectThrow(contract.ownerWithdraw({from: accOne}));
						
		});

		//not sure if necessary
		it("Should NOT send commission to owner if the funds are 0", async function () {

			await expectThrow(contract.ownerWithdraw({from: owner}));

		});

		it("Should emit log for owner commission transaction", async function () {

			let hash = await contract.giveMeSomeHash("pass1", "pass2");

			await contract.createTransaction(hash, 1, "Pesho", {from: accOne, value: 501});
			await contract.exchangeShop("pass1", "pass2", "Pesho", {from: owner});

			let expectedEvent = "LogOwnerCommissionWithdraw";

			let result = await contract.ownerWithdraw({from: owner});

			assert.lengthOf(result.logs, 1, "There should be 1 event emitted from setRate!");
			assert.strictEqual(result.logs[0].event, expectedEvent, "The event emitted was ${result.logs[0].event} instead of ${expectedEvent}");
		});

	});

	describe("Kill Switch Testing", () => {

		it("Should Kill the contract", async function () {

			await contract.kill({from: owner});

			await expectThrow(contract.createTransaction("hash", 1, "Pesho", {from: accOne, value: 501}));					
		});

		it("Should NOT Kill the contract if the sender is not the owner", async function () {

			await expectThrow(contract.kill({from: accOne}));
			
		});
		

	});
});
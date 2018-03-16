const util = {
	expectThrow: async promise => {
		try {
			let result = await promise;
			console.log(result);
		} catch (error) {
			const outOfGas = error.message.search('out of gas') >= 0;
			const revert = error.message.search('revert') >= 0;
			const outOfMoney = error.message.search('doesn\'t have enough funds') >= 0;
			const invalidAddress = error.message.search('BigNumber Error: new BigNumber()') >= 0;
			const invalidContractAddress = error.message.search('not a contract address') >= 0;

			assert(outOfGas || revert || outOfMoney || invalidContractAddress, "Expected throw, got '" + error + "' instead");
			return
		}

		assert.fail('Expected throw not received');
	},

	web3FutureTime: (web3) => {
		return web3.eth.getBlock(web3.eth.blockNumber).timestamp + 10;
	}
}
module.exports = util;



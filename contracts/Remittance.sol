pragma solidity ^0.4.19;

contract Remittance {
	
	address public owner;
	uint private fee;
	uint public maxTimeLimit;
	uint public ownersCommission;

	mapping(bytes32 => Transaction) public remittances;

	// Just for keeping the localvalues. This is actually happens offline	
	mapping (bytes32 => uint) public localCurrency;
	

	function Remittance () public {
		owner = msg.sender;
	}	

	function setFee (uint _fee) public onlyOwner(){
		fee = _fee;
	}

	function setMaxTimeLimit(uint _maxTimeLimit) public onlyOwner(){
		maxTimeLimit = _maxTimeLimit;
	}	

	// For testing the contract..
	function giveMeSomeHash(bytes32 _passOne, bytes32 _passTwo) public pure returns (bytes32 initialHash)	{

    	return keccak256(_passOne, _passTwo);
	}
	
	struct Transaction {
		
		address from;
		bytes32 recieverID;
		uint amount;
		uint timeLimit;			
		bool isEntity;	
	}
	
	event LogTransactionCreated(bytes32 hash, address from, bytes32 _recieverID, uint value ,uint timeLimit);
	event LogRemittanceReceived(bytes32 hash, address from, bytes32 _recieverID, uint value);
	event LogReturnFundsAfterTimeLimit(bytes32 hash, address _to, uint value);
	event LogOwnerCommissionWithdraw(uint value);	

	modifier onlyOwner() { 
		require(msg.sender == owner); 
		_; 
	}

	// Checks is the time limit reached
	modifier onlyWithinTimeLimit(bytes32 _passOne, bytes32 _passTwo) { 
		bytes32 hashToCheck = keccak256(_passOne, _passTwo);
		require (now <= remittances[hashToCheck].timeLimit);
		_;		
	}

	modifier onlyAfterTimeLimit(bytes32 _passOne, bytes32 _passTwo) { 
		bytes32 hashToCheck = keccak256(_passOne, _passTwo);
		require (now > remittances[hashToCheck].timeLimit);
		_;		
	}	

	// Checks is there a transaction with the same passwords
	modifier onlyEmptyEntity(bytes32 entityAddress) {      	
      	 require (!remittances[entityAddress].isEntity);
      	 _;
  }

  	// Creates a transaction from owner to "Bobs" address..
	function createTransaction(bytes32 _hashedPass, uint _timeLimit, bytes32 _recieverID) public payable onlyEmptyEntity(_hashedPass){

		require(msg.value > 0);
		require(_timeLimit <= maxTimeLimit);		

		remittances[_hashedPass].from = msg.sender;
		remittances[_hashedPass].recieverID = _recieverID;
		remittances[_hashedPass].amount = msg.value;
		remittances[_hashedPass].timeLimit = now + _timeLimit;
		remittances[_hashedPass].isEntity = true;

		LogTransactionCreated(_hashedPass, msg.sender, _recieverID, msg.value, _timeLimit);
	}

	function exchangeShop(bytes32 _passOne, bytes32 _passTwo, bytes32 _recieverID) public payable onlyWithinTimeLimit(_passOne, _passTwo) onlyOwner(){

		bytes32 hashToCheck = keccak256(_passOne, _passTwo);

		require(remittances[hashToCheck].recieverID == _recieverID);

		// Here i can add some "exchange" commission to contractOwner (me).
		ownersCommission += remittances[hashToCheck].amount / fee;

		uint amount = remittances[hashToCheck].amount - remittances[hashToCheck].amount / fee;

		// Just for the LogRemittanceReceived.
		address from = remittances[hashToCheck].from;	

		// Just for tracking the local currency transactions. This is actually happening offline..	
		localCurrency[_recieverID] += amount;

		delete(remittances[hashToCheck]);
		
		LogRemittanceReceived(hashToCheck, from, _recieverID, amount);
	}

	function returnFundsAfterTimeLimit(bytes32 _passOne, bytes32 _passTwo) public onlyAfterTimeLimit(_passOne, _passTwo){

		bytes32 hashToCheck = keccak256(_passOne, _passTwo);

		require(remittances[hashToCheck].from == msg.sender);

		uint amount = remittances[hashToCheck].amount;
		delete(remittances[hashToCheck]);
		msg.sender.transfer(amount);

		LogReturnFundsAfterTimeLimit(hashToCheck, msg.sender, amount);
	}

	// Owner can withdraw commissions
	function ownerWithdraw() public onlyOwner() {
		require(ownersCommission > 0);

		// Im not sure if necessary..
		uint temp = ownersCommission;
		ownersCommission = 0;
		owner.transfer(temp);

		LogOwnerCommissionWithdraw(ownersCommission);
		
	}

	// When killed all pending transactions are locked here. I don' know if thats OK.
	function kill() public onlyOwner() {
		selfdestruct(this);		
	}	
}

pragma solidity ^0.4.24;

contract Manager {
    address[] public lotteries;

    function append(address lottery) public {
        lotteries.push(lottery);
    }
    
    function getAll() public view returns(address[]) {
        return lotteries;
    }

    function getOne(uint idx) public view returns(address) {
        return lotteries[idx];
    }
}

pragma solidity ^0.4.24;

import './MarkTwo.sol';

contract Manager {
    address[] public lotteries;

    function append(address lottery) public {
        lotteries.push(lottery);
    }
    
    function getAll() public view returns(address[]) {
        return lotteries;
    }
}

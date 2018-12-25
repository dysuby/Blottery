pragma solidity ^0.4.24;

import './MarkTwo.sol';

contract Manager {
    address[] public lotteries;

    function deploy(uint e) public {
        MarkTwo mt = new MarkTwo(e);
        lotteries.push(mt);
    }
    
    function get() public view returns(address[]) {
        return lotteries;
    }
}

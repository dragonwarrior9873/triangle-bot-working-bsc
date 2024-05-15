//SPDX-License-Identifier: MIT
pragma solidity ^0.6.6;

contract test {
    address public aaa_from;
    address public aaa_to;
    function swap(bytes calldata _data) external {
        address addr_from;
        address addr_to;
        bytes memory data=_data;
        assembly {
            addr_from := mload(add(data, 20))
            addr_to := mload(add(data, 40))
        }
        aaa_from=addr_from;
        aaa_to=addr_to;
    }
}
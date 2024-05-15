//SPDX-License-Identifier: MIT
pragma solidity ^0.6.6;

import "./interfaces/IUniswapV2Router02.sol";
import "./interfaces/IUniswapV2Pair.sol";
import "./interfaces/IUniswapV2Factory.sol";
import "./interfaces/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
contract TriangleArbitrageFlashLoaner {
    using SafeMath for uint;
    address public owner;
    IUniswapV2Router02 public toRouter1;
    IUniswapV2Router02 public toRouter2;
    IUniswapV2Router02 public fromRouter;
    constructor(        
    ) public {
        owner=msg.sender;
    }


    function flashCall(
        uint256 _amount0,
        uint256 _amount1,
        bytes memory _data 
    ) internal {
        address addr_from;
        address addr_to1;
        address addr_to2;
        address token0;
        address token1;
        address token2;
        assembly {
              addr_from := mload(add(_data, 20))
              addr_to1 := mload(add(_data, 40))
              addr_to2 := mload(add(_data, 60))
              token0 := mload(add(_data, 80))
              token1 := mload(add(_data, 100))
              token2 := mload(add(_data, 120))
        }       
        address[] memory path = new address[](2);
        uint256 amountToken = _amount0 == 0 ? _amount1 : _amount0;       
        require(_amount0 == 0 || _amount1 == 0, "one should be zero");

        path[0] = token0;
        path[1] = token1;
 
        IERC20 tokenContract0 = IERC20(token0);
        IERC20 tokenContract1 = IERC20(token1);
        IERC20 tokenContract2 = IERC20(token2);

        toRouter1=IUniswapV2Router02(address(addr_to1));
        toRouter2=IUniswapV2Router02(address(addr_to2));
        fromRouter=IUniswapV2Router02(address(addr_from));
        tokenContract1.approve(address(addr_to1), amountToken);


        uint256 amountRequired = fromRouter.getAmountsIn(amountToken, path)[0];
        path[0] = token1;
        path[1] = token2;
        uint256 amountReceived =
            toRouter1.swapExactTokensForTokens(
                amountToken, /**+-Ammount of Tokens we are going to Sell.*/
                0, /**+-Minimum Ammount of Tokens that we expect to receive in exchange for our Tokens.*/
                path, /**+-We tell Dex what Token to Sell and what Token to Buy.*/
                address(this), /**+-Address of this S.C. where the Output Tokens are going to be received.*/
                block.timestamp+1 days /**+-Time Limit after which an order will be rejected by Dex(It is mainly useful if you send an Order directly from your wallet).*/
            )[1];
        tokenContract2.approve(address(addr_to2), amountReceived);
        path[0] = token2;
        path[1] = token0;
        amountReceived =
            toRouter2.swapExactTokensForTokens(
                amountReceived, /**+-Ammount of Tokens we are going to Sell.*/
                amountRequired, /**+-Minimum Ammount of Tokens that we expect to receive in exchange for our Tokens.*/
                path, /**+-We tell Dex what Token to Sell and what Token to Buy.*/
                address(this), /**+-Address of this S.C. where the Output Tokens are going to be received.*/
                block.timestamp+1 days /**+-Time Limit after which an order will be rejected by Dex(It is mainly useful if you send an Order directly from your wallet).*/
            )[1];
        tokenContract0.transfer(msg.sender, amountRequired);
        tokenContract0.transfer(
            owner, 
            amountReceived - amountRequired
        );
    }

    function pancakeCall(
        address _sender,
        uint256 _amount0,
        uint256 _amount1,
        bytes calldata _data /**+-Makes sure that this is not empty so it will Trigger the FlashLoan.(IGNORE THIS).*/
    ) external {
        flashCall(_amount0, _amount1, _data);
    }
}

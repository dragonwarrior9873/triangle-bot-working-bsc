function swapExactTokensForTokensSupportingFeeOnTransferTokens(
    uint amountIn,
    uint amountOutMin,
    address[] calldata path,
    address to,
    uint deadline
) external virtual override ensure(deadline) {
    TransferHelper.safeTransferFrom(
        path[0], msg.sender, PangolinLibrary.pairFor(factory, path[0], path[1]), amountIn
    );
    uint balanceBefore = IERC20(path[path.length - 1]).balanceOf(to);
    _swapSupportingFeeOnTransferTokens(path, to);
    require(
        IERC20(path[path.length - 1]).balanceOf(to).sub(balanceBefore) >= amountOutMin,
        'PangolinRouter: INSUFFICIENT_OUTPUT_AMOUNT'
    );
}
function swapExactTokensForTokens(
    uint amountIn,
    uint amountOutMin,
    address[] calldata path,
    address to,
    uint deadline
) external virtual override ensure(deadline) returns (uint[] memory amounts) {
    amounts = PangolinLibrary.getAmountsOut(factory, amountIn, path);
    require(amounts[amounts.length - 1] >= amountOutMin, 'PangolinRouter: INSUFFICIENT_OUTPUT_AMOUNT');
    TransferHelper.safeTransferFrom(
        path[0], msg.sender, PangolinLibrary.pairFor(factory, path[0], path[1]), amounts[0]
    );
    _swap(amounts, path, to);
}

function _swapSupportingFeeOnTransferTokens(address[] memory path, address _to) internal virtual {
    for (uint i; i < path.length - 1; i++) {
        (address input, address output) = (path[i], path[i + 1]);
        (address token0,) = PangolinLibrary.sortTokens(input, output);
        IPangolinPair pair = IPangolinPair(PangolinLibrary.pairFor(factory, input, output));
        uint amountInput;
        uint amountOutput;
        { // scope to avoid stack too deep errors
        (uint reserve0, uint reserve1,) = pair.getReserves();
        (uint reserveInput, uint reserveOutput) = input == token0 ? (reserve0, reserve1) : (reserve1, reserve0);
        amountInput = IERC20(input).balanceOf(address(pair)).sub(reserveInput);
        amountOutput = PangolinLibrary.getAmountOut(amountInput, reserveInput, reserveOutput);
        }
        (uint amount0Out, uint amount1Out) = input == token0 ? (uint(0), amountOutput) : (amountOutput, uint(0));
        address to = i < path.length - 2 ? PangolinLibrary.pairFor(factory, output, path[i + 2]) : _to;
        pair.swap(amount0Out, amount1Out, to, new bytes(0));
    }
}

function _swap(uint[] memory amounts, address[] memory path, address _to) internal virtual {
    for (uint i; i < path.length - 1; i++) {
        (address input, address output) = (path[i], path[i + 1]);
        (address token0,) = PangolinLibrary.sortTokens(input, output);
        uint amountOut = amounts[i + 1];
        (uint amount0Out, uint amount1Out) = input == token0 ? (uint(0), amountOut) : (amountOut, uint(0));
        address to = i < path.length - 2 ? PangolinLibrary.pairFor(factory, output, path[i + 2]) : _to;
        IPangolinPair(PangolinLibrary.pairFor(factory, input, output)).swap(
            amount0Out, amount1Out, to, new bytes(0)
        );
    }
}
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract MockPancakeRouter {
    using SafeERC20 for IERC20;

    address private immutable wrappedNative;

    uint256 public tokensOut;
    uint256 public tokenUseBps = 10_000;
    uint256 public bnbUseBps = 10_000;
    uint256 public lastSwapETH;
    uint256 public lastAddLiquidityETH;
    uint256 public lastTokenDesired;
    address public lastLpReceiver;

    constructor(address wrappedNative_) {
        wrappedNative = wrappedNative_;
    }

    receive() external payable {}

    function WETH() external view returns (address) {
        return wrappedNative;
    }

    function setTokensOut(uint256 amount) external {
        tokensOut = amount;
    }

    function setUsageBps(uint256 tokenUseBps_, uint256 bnbUseBps_) external {
        require(tokenUseBps_ <= 10_000 && bnbUseBps_ <= 10_000, "bps too high");
        tokenUseBps = tokenUseBps_;
        bnbUseBps = bnbUseBps_;
    }

    function swapExactETHForTokensSupportingFeeOnTransferTokens(
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external payable {
        require(block.timestamp <= deadline, "expired");
        require(path.length == 2, "bad path");
        require(tokensOut >= amountOutMin, "insufficient output");

        lastSwapETH = msg.value;
        IERC20(path[1]).safeTransfer(to, tokensOut);
    }

    function addLiquidityETH(
        address token,
        uint256 amountTokenDesired,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        address to,
        uint256 deadline
    )
        external
        payable
        returns (uint256 amountToken, uint256 amountETH, uint256 liquidity)
    {
        require(block.timestamp <= deadline, "expired");

        amountToken = (amountTokenDesired * tokenUseBps) / 10_000;
        amountETH = (msg.value * bnbUseBps) / 10_000;
        require(amountToken >= amountTokenMin, "token slippage");
        require(amountETH >= amountETHMin, "bnb slippage");

        lastAddLiquidityETH = msg.value;
        lastTokenDesired = amountTokenDesired;
        lastLpReceiver = to;

        IERC20(token).safeTransferFrom(msg.sender, to, amountToken);
        if (msg.value > amountETH) {
            (bool ok, ) = payable(msg.sender).call{value: msg.value - amountETH}("");
            require(ok, "refund failed");
        }

        liquidity = amountToken + amountETH;
    }
}

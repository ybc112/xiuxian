// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

import {IPancakeRouter02} from "./interfaces/IPancakeRouter02.sol";

interface IERC20Burnable is IERC20 {
    function burnFrom(address account, uint256 value) external;
}

/// @notice Five-tier cultivation scroll NFT with BNB dividends and buyback+LP reserve.
/// @dev Each address can hold one non-transferable scroll. Rewards are accounted by tier.
contract CultivationScroll is ERC721, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 private constant BPS = 10_000;
    uint256 private constant ACC_REWARD_PRECISION = 1e24;

    uint8 public constant MAX_TIER = 5;
    uint16 public constant DIVIDEND_BPS = 8_000;
    uint16 public constant BUYBACK_LP_BPS = 2_000;

    IERC20 public immutable token;
    IERC20Burnable private immutable burnableToken;

    IPancakeRouter02 public router;
    address public lpReceiver;
    string private baseTokenURI;

    uint256 public nextTokenId;
    uint256 public activeScrolls;
    uint256 public totalDividendReceived;
    uint256 public totalClaimed;
    uint256 public buybackLpReserve;

    uint256[6] public minHoldings;
    uint256[6] public upgradeBurnCosts;
    uint16[6] private tierWeights;

    uint256[6] public tierSupply;
    uint256[6] public accRewardPerShare;
    uint256[6] public unallocatedTierRewards;

    mapping(address user => uint256 tokenId) public scrollOf;
    mapping(uint256 tokenId => uint8 tier) public tierOfToken;
    mapping(address user => uint256 rewardDebt) public rewardDebt;
    mapping(address user => uint256 amount) public storedRewards;

    event RewardsDeposited(
        address indexed sender,
        uint256 amount,
        uint256 dividendAmount,
        uint256 buybackLpAmount
    );
    event ScrollRegistered(address indexed user, uint256 indexed tokenId, uint8 tier);
    event ScrollUpgraded(
        address indexed user,
        uint256 indexed tokenId,
        uint8 oldTier,
        uint8 newTier,
        uint256 burnedAmount
    );
    event ScrollInvalidated(
        address indexed user,
        uint256 indexed tokenId,
        uint8 tier,
        string reason
    );
    event RewardClaimed(address indexed user, uint256 amount);
    event RouterUpdated(address indexed router);
    event LpReceiverUpdated(address indexed receiver);
    event BaseURIUpdated(string baseURI);
    event BuybackLiquidityExecuted(
        uint256 bnbSpent,
        uint256 tokenBought,
        uint256 tokenAdded,
        uint256 bnbAdded,
        uint256 liquidity
    );

    error AlreadyRegistered();
    error NotRegistered();
    error NonTransferable();
    error InvalidTier();
    error MaxTierReached();
    error MinHoldingNotMet(uint8 tier, uint256 requiredAmount, uint256 currentAmount);
    error NoReward();
    error ZeroAddress();
    error ZeroAmount();
    error RouterNotSet();
    error InsufficientBuybackReserve();

    constructor(
        address token_,
        string memory name_,
        string memory symbol_,
        address owner_
    ) ERC721(name_, symbol_) Ownable(owner_) {
        if (token_ == address(0) || owner_ == address(0)) revert ZeroAddress();

        token = IERC20(token_);
        burnableToken = IERC20Burnable(token_);
        lpReceiver = owner_;

        minHoldings[1] = 100_000 ether;
        minHoldings[2] = 200_000 ether;
        minHoldings[3] = 400_000 ether;
        minHoldings[4] = 800_000 ether;
        minHoldings[5] = 1_500_000 ether;

        upgradeBurnCosts[2] = 50_000 ether;
        upgradeBurnCosts[3] = 150_000 ether;
        upgradeBurnCosts[4] = 400_000 ether;
        upgradeBurnCosts[5] = 1_000_000 ether;

        tierWeights[1] = 3_000; // 80% dividend pool * 30% = 24% of total income.
        tierWeights[2] = 1_500; // 12% of total income.
        tierWeights[3] = 1_500; // 12% of total income.
        tierWeights[4] = 2_000; // 16% of total income.
        tierWeights[5] = 2_000; // 16% of total income.
    }

    receive() external payable {
        if (address(router) != address(0) && msg.sender == address(router)) {
            return;
        }
        _depositRewards(msg.value);
    }

    function depositRewards() external payable {
        _depositRewards(msg.value);
    }

    function register() external nonReentrant {
        if (scrollOf[msg.sender] != 0) revert AlreadyRegistered();
        _requireMinHolding(msg.sender, 1);

        uint256 tokenId = ++nextTokenId;
        scrollOf[msg.sender] = tokenId;
        tierOfToken[tokenId] = 1;
        tierSupply[1] += 1;
        activeScrolls += 1;
        rewardDebt[msg.sender] = accRewardPerShare[1];

        _safeMint(msg.sender, tokenId);
        emit ScrollRegistered(msg.sender, tokenId, 1);
    }

    function upgrade() external nonReentrant {
        uint256 tokenId = scrollOf[msg.sender];
        if (tokenId == 0) revert NotRegistered();

        if (_invalidateIfBelowCurrentThreshold(msg.sender, tokenId)) {
            return;
        }

        uint8 oldTier = tierOfToken[tokenId];
        if (oldTier >= MAX_TIER) revert MaxTierReached();

        uint8 newTier = oldTier + 1;
        _requireMinHolding(msg.sender, newTier);

        _syncRewards(msg.sender, tokenId);

        uint256 burnAmount = upgradeBurnCosts[newTier];
        burnableToken.burnFrom(msg.sender, burnAmount);

        tierSupply[oldTier] -= 1;
        tierSupply[newTier] += 1;
        tierOfToken[tokenId] = newTier;
        rewardDebt[msg.sender] = accRewardPerShare[newTier];

        emit ScrollUpgraded(msg.sender, tokenId, oldTier, newTier, burnAmount);
    }

    function claim() external nonReentrant {
        uint256 tokenId = scrollOf[msg.sender];
        if (tokenId == 0) revert NotRegistered();

        if (_invalidateIfBelowCurrentThreshold(msg.sender, tokenId)) {
            return;
        }

        _syncRewards(msg.sender, tokenId);

        uint256 amount = storedRewards[msg.sender];
        if (amount == 0) revert NoReward();

        storedRewards[msg.sender] = 0;
        totalClaimed += amount;

        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        require(ok, "BNB transfer failed");

        emit RewardClaimed(msg.sender, amount);
    }

    function validateHolding(address user) external nonReentrant returns (bool valid) {
        uint256 tokenId = scrollOf[user];
        if (tokenId == 0) {
            return false;
        }
        return !_invalidateIfBelowCurrentThreshold(user, tokenId);
    }

    function executeBuybackAndAddLiquidity(
        uint256 amountBNB,
        uint256 minTokensOut,
        uint256 minTokenLiquidity,
        uint256 minBNBLiquidity,
        uint256 deadline
    ) external onlyOwner nonReentrant {
        if (address(router) == address(0)) revert RouterNotSet();
        if (amountBNB == 0) revert ZeroAmount();
        if (amountBNB > buybackLpReserve) revert InsufficientBuybackReserve();

        buybackLpReserve -= amountBNB;

        uint256 swapAmount = amountBNB / 2;
        uint256 liquidityBNB = amountBNB - swapAmount;
        if (swapAmount == 0 || liquidityBNB == 0) revert ZeroAmount();

        address[] memory path = new address[](2);
        path[0] = router.WETH();
        path[1] = address(token);

        uint256 beforeTokenBalance = token.balanceOf(address(this));
        router.swapExactETHForTokensSupportingFeeOnTransferTokens{value: swapAmount}(
            minTokensOut,
            path,
            address(this),
            deadline
        );
        uint256 boughtTokens = token.balanceOf(address(this)) - beforeTokenBalance;
        if (boughtTokens == 0) revert ZeroAmount();

        token.forceApprove(address(router), 0);
        token.forceApprove(address(router), boughtTokens);

        (uint256 tokenAdded, uint256 bnbAdded, uint256 liquidity) =
            router.addLiquidityETH{value: liquidityBNB}(
                address(token),
                boughtTokens,
                minTokenLiquidity,
                minBNBLiquidity,
                lpReceiver,
                deadline
            );

        token.forceApprove(address(router), 0);

        if (liquidityBNB > bnbAdded) {
            buybackLpReserve += liquidityBNB - bnbAdded;
        }

        emit BuybackLiquidityExecuted(
            amountBNB,
            boughtTokens,
            tokenAdded,
            bnbAdded,
            liquidity
        );
    }

    function setRouter(address router_) external onlyOwner {
        if (router_ == address(0)) revert ZeroAddress();
        router = IPancakeRouter02(router_);
        emit RouterUpdated(router_);
    }

    function setLpReceiver(address receiver) external onlyOwner {
        if (receiver == address(0)) revert ZeroAddress();
        lpReceiver = receiver;
        emit LpReceiverUpdated(receiver);
    }

    function setBaseURI(string calldata baseURI_) external onlyOwner {
        baseTokenURI = baseURI_;
        emit BaseURIUpdated(baseURI_);
    }

    function tierWeightBps(uint8 tier) external view returns (uint16) {
        _checkTier(tier);
        return tierWeights[tier];
    }

    function tierOf(address user) external view returns (uint8) {
        uint256 tokenId = scrollOf[user];
        if (tokenId == 0) {
            return 0;
        }
        return tierOfToken[tokenId];
    }

    function pendingReward(address user) public view returns (uint256) {
        uint256 tokenId = scrollOf[user];
        if (tokenId == 0) {
            return storedRewards[user];
        }

        uint8 tier = tierOfToken[tokenId];
        if (token.balanceOf(user) < minHoldings[tier]) {
            return 0;
        }

        uint256 accumulated = accRewardPerShare[tier] - rewardDebt[user];
        return storedRewards[user] + (accumulated / ACC_REWARD_PRECISION);
    }

    function canClaim(address user) external view returns (bool) {
        return pendingReward(user) > 0;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);

        if (bytes(baseTokenURI).length == 0) {
            return "";
        }

        return string.concat(
            baseTokenURI,
            Strings.toString(tierOfToken[tokenId]),
            ".json"
        );
    }

    function _depositRewards(uint256 amount) internal {
        if (amount == 0) revert ZeroAmount();

        uint256 dividendAmount = (amount * DIVIDEND_BPS) / BPS;
        uint256 buybackAmount = amount - dividendAmount;

        totalDividendReceived += dividendAmount;
        buybackLpReserve += buybackAmount;

        uint256 remaining = dividendAmount;
        for (uint8 tier = 1; tier <= MAX_TIER; tier++) {
            uint256 tierAmount;
            if (tier == MAX_TIER) {
                tierAmount = remaining;
            } else {
                tierAmount = (dividendAmount * tierWeights[tier]) / BPS;
                remaining -= tierAmount;
            }
            _addTierReward(tier, tierAmount);
        }

        emit RewardsDeposited(msg.sender, amount, dividendAmount, buybackAmount);
    }

    function _addTierReward(uint8 tier, uint256 amount) internal {
        if (amount == 0) {
            return;
        }

        uint256 supply = tierSupply[tier];
        if (supply == 0) {
            unallocatedTierRewards[tier] += amount;
            return;
        }

        uint256 totalAmount = amount + unallocatedTierRewards[tier];
        unallocatedTierRewards[tier] = 0;
        accRewardPerShare[tier] += (totalAmount * ACC_REWARD_PRECISION) / supply;
    }

    function _syncRewards(address user, uint256 tokenId) internal {
        uint8 tier = tierOfToken[tokenId];
        uint256 currentAcc = accRewardPerShare[tier];
        uint256 debt = rewardDebt[user];

        if (currentAcc > debt) {
            storedRewards[user] += (currentAcc - debt) / ACC_REWARD_PRECISION;
        }

        rewardDebt[user] = currentAcc;
    }

    function _requireMinHolding(address user, uint8 tier) internal view {
        _checkTier(tier);
        uint256 balance = token.balanceOf(user);
        uint256 requiredAmount = minHoldings[tier];
        if (balance < requiredAmount) {
            revert MinHoldingNotMet(tier, requiredAmount, balance);
        }
    }

    function _invalidateIfBelowCurrentThreshold(
        address user,
        uint256 tokenId
    ) internal returns (bool invalidated) {
        uint8 tier = tierOfToken[tokenId];
        if (token.balanceOf(user) >= minHoldings[tier]) {
            return false;
        }

        storedRewards[user] = 0;
        rewardDebt[user] = 0;
        scrollOf[user] = 0;
        tierOfToken[tokenId] = 0;
        tierSupply[tier] -= 1;
        activeScrolls -= 1;

        _burn(tokenId);

        emit ScrollInvalidated(user, tokenId, tier, "BELOW_MIN_HOLDING");
        return true;
    }

    function _checkTier(uint8 tier) internal pure {
        if (tier == 0 || tier > MAX_TIER) revert InvalidTier();
    }

    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address) {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) {
            revert NonTransferable();
        }
        return super._update(to, tokenId, auth);
    }
}

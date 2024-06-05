//SPDX-License-Identifier: Unlicense
pragma solidity 0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IWETH9 is IERC20 {
    /// @notice Deposit ether to get wrapped ether
    function deposit() external payable;

    /// @notice Withdraw wrapped ether to get ether
    function withdraw(uint256) external;
}

interface ISwapRouter02 {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }

    function exactInput(
        ExactInputParams calldata params
    ) external payable returns (uint256 amountOut);

    function exactInputSingle(
        ExactInputSingleParams calldata params
    ) external payable returns (uint256 amountOut);

    struct ExactOutputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 amountOut;
        uint256 amountInMaximum;
        uint160 sqrtPriceLimitX96;
    }

    function exactOutputSingle(
        ExactOutputSingleParams calldata params
    ) external payable returns (uint256 amountIn);
}

contract ProBalance is Ownable {
    using SafeERC20 for IERC20;

    address public i_USDT;
    address public i_USDC;
    address public i_WETH;
    bool public acceptNative;
    ISwapRouter02 public swapRouter;
    mapping(address => bool) public allowedDepositTokens;

    address public operator;
    bool public acceptWithdraw;
    uint256 public withdrawBufferPeriod = 3 seconds;
    mapping(address => uint256) public maxSingleWithdraw;
    mapping(address => uint256) public protectedBalances;
    mapping(address => uint256) public userLastWithdraw;

    event InjectTreasury(uint256 amount);
    event BalanceAdded(address indexed user, uint256 indexed amount);
    event TokenBalanceAdded(
        address indexed user,
        uint256 indexed amount,
        address indexed token
    );

    modifier withdrawAllowed() {
        require(acceptWithdraw, "not allowed");
        _;
    }

    modifier onlyOperator() {
        require(msg.sender == operator, "op");
        _;
    }

    modifier protectedBalanceCheck(address token) {
        if (token == address(0))
            require(
                address(this).balance > protectedBalances[token],
                "protected contact admin"
            );
        else
            require(
                IERC20(token).balanceOf(address(this)) >
                    protectedBalances[token],
                "protected contact admin"
            );
        _;
    }

    constructor(
        bool _acceptWithdraw,
        bool _acceptNative,
        address _weth,
        address _usdt,
        address _usdc,
        address _router,
        address _operator
    ) Ownable(msg.sender) {
        i_WETH = _weth;
        i_USDT = _usdt;
        i_USDC = _usdc;
        swapRouter = ISwapRouter02(_router);
        acceptWithdraw = _acceptWithdraw;
        acceptNative = _acceptNative;
        operator = _operator;

        allowedDepositTokens[_usdt] = true;
        allowedDepositTokens[_usdc] = true;
    }

    function addBalance() external payable {
        require(acceptNative, "native not accepted");
        emit BalanceAdded(msg.sender, msg.value);
    }

    function addBalanceWithSwap(
        address targetToken,
        uint256 amountOutMinimum,
        uint24 poolFee
    ) external payable {
        require(
            targetToken == i_USDT || targetToken == i_USDC,
            "cant convert to target"
        );
        //CONVERT TO TARGET

        ISwapRouter02.ExactInputSingleParams memory params = ISwapRouter02
            .ExactInputSingleParams({
                tokenIn: i_WETH,
                tokenOut: targetToken,
                fee: poolFee,
                recipient: address(this),
                amountIn: msg.value,
                amountOutMinimum: amountOutMinimum,
                sqrtPriceLimitX96: 0
            });

        uint256 targetAmount = swapRouter.exactInputSingle{value: msg.value}(
            params
        );

        emit TokenBalanceAdded(msg.sender, targetAmount, targetToken);
    }

    function addTokenBalance(address token, uint256 amount) external {
        require(allowedDepositTokens[token], "token not accepted");
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        emit TokenBalanceAdded(msg.sender, amount, token);
    }

    function addTokenBalanceWithSwap(
        address token,
        address targetToken,
        uint256 amount,
        uint256 amountOutMinimum,
        uint24 poolFee
    ) external {
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        require(
            targetToken == i_USDT || targetToken == i_USDC,
            "cant convert to target"
        );
        IERC20(token).approve(address(swapRouter), amount);

        ISwapRouter02.ExactInputSingleParams memory params = ISwapRouter02
            .ExactInputSingleParams({
                tokenIn: token,
                tokenOut: targetToken,
                fee: poolFee,
                recipient: address(this),
                amountIn: amount,
                amountOutMinimum: amountOutMinimum,
                sqrtPriceLimitX96: 0
            });

        uint targetAmount = swapRouter.exactInputSingle(params);
        emit TokenBalanceAdded(msg.sender, targetAmount, targetToken);
    }

    function addTokenBalanceWithMultihop(
        address token,
        address tokenHop,
        address targetToken,
        uint256 amount,
        uint256 amountOutMinimum,
        uint24 poolFee1,
        uint24 poolFee2
    ) external {
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        require(
            targetToken == i_USDT || targetToken == i_USDC,
            "cant convert to target"
        );
        IERC20(token).approve(address(swapRouter), amount);

        ISwapRouter02.ExactInputParams memory params = ISwapRouter02
            .ExactInputParams({
                path: abi.encodePacked(
                    token,
                    poolFee1,
                    tokenHop,
                    poolFee2,
                    targetToken
                ),
                recipient: address(this),
                amountIn: amount,
                amountOutMinimum: amountOutMinimum
            });

        uint targetAmount = swapRouter.exactInput(params);
        emit TokenBalanceAdded(msg.sender, targetAmount, targetToken);
    }

    function injectTreasury() external payable {
        emit InjectTreasury(msg.value);
    }

    //OWNER FUNCTIONS
    function setAcceptNative(bool _acceptNative) external onlyOwner {
        acceptNative = _acceptNative;
    }

    function setAcceptWithdraw(bool _acceptWithdraw) external onlyOwner {
        acceptWithdraw = _acceptWithdraw;
    }

    function setSwapRouter(address _router) external onlyOwner {
        swapRouter = ISwapRouter02(_router);
    }

    function setOperator(address _op) external onlyOwner {
        require(_op != address(0), "cant be address 0");
        operator = _op;
    }

    function setAllowedDepositToken(
        address token,
        bool status
    ) external onlyOwner {
        require(token != address(0), "cant be address 0");
        allowedDepositTokens[token] = status;
    }

    function setProtectedBalance(
        address _token,
        uint256 _amount
    ) external onlyOwner {
        protectedBalances[_token] = _amount;
    }

    function setMaxSingleWithdraw(
        address _token,
        uint256 _amount
    ) external onlyOwner {
        maxSingleWithdraw[_token] = _amount;
    }

    function recoverAmount(uint256 amount) external onlyOwner {
        _transferAmount(msg.sender, amount);
    }

    function recoverToken(
        address tokenAddress,
        uint256 amount
    ) external onlyOwner {
        _transferEthOrToken(tokenAddress, owner(), amount);
    }

    function sendBalanceAmount(
        address tokenAddress,
        address user,
        uint256 amount
    ) external onlyOwner {
        _transferEthOrToken(tokenAddress, user, amount);
    }

    //INTERNAL FUNCTIONS
    function _transferEthOrToken(
        address tokenAddress,
        address _to,
        uint256 _amount
    ) internal {
        if (tokenAddress == address(0)) _transferAmount(_to, _amount);
        else IERC20(tokenAddress).safeTransfer(_to, _amount);
    }

    function _transferAmount(address _to, uint256 _amount) internal {
        (bool success, ) = _to.call{value: _amount}("");
        require(success, "TransferHelper: TRANSFER_FAILED");
    }

    //WITHDRAW FUNCTIONS

    function canSend(
        address tokenAddress,
        address user,
        uint256 amount
    ) public view returns (bool) {
        if (!acceptWithdraw) return false;
        if (msg.sender != operator) return false;

        if (userLastWithdraw[user] + withdrawBufferPeriod > block.timestamp)
            return false;

        if (
            maxSingleWithdraw[tokenAddress] > 0 &&
            amount > maxSingleWithdraw[tokenAddress]
        ) return false;

        return true;
    }

    function sendBalance(
        address tokenAddress,
        address user,
        uint256 amount
    )
        external
        onlyOperator
        withdrawAllowed
        protectedBalanceCheck(tokenAddress)
    {
        require(
            userLastWithdraw[user] + withdrawBufferPeriod < block.timestamp,
            "waitForBuffer"
        );
        userLastWithdraw[user] = block.timestamp;

        require(
            maxSingleWithdraw[tokenAddress] > 0 &&
                amount < maxSingleWithdraw[tokenAddress],
            ">max"
        );

        _transferEthOrToken(tokenAddress, user, amount);
  }

//THIS FUNCTION IS FOR ONRAMP CREDIT CARD TOP-UP. relayer will call this function to add USDT 
//balance in user's address
function addTokenBalanceForUser(
        address user,
        address token,
        uint256 amount
    ) external {
        require(allowedDepositTokens[token], "token not accepted");
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        emit TokenBalanceAdded(user, amount, token);
    }
}

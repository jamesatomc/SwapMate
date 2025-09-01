// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Test.sol";
import "../src/AddLiquidity.sol";

contract MockERC20 {
    string public name = "Mock";
    string public symbol = "MCK";
    uint8 public decimals = 18;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    constructor(uint256 initial) {
        _mint(msg.sender, initial);
    }

    function _mint(address to, uint256 amount) internal {
        balanceOf[to] += amount;
        totalSupply += amount;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        if (allowed != type(uint256).max) {
            require(allowed >= amount, "allowance");
            allowance[from][msg.sender] = allowed - amount;
        }
        require(balanceOf[from] >= amount, "balanceFrom");
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

contract ConstantProductAMMTest is Test {
    ConstantProductAMM amm;
    MockERC20 tokenA;
    MockERC20 tokenB;
    address user = address(0xBEEF);

    function setUp() public {
        // deploy mock tokens and AMM
        tokenA = new MockERC20(0);
        tokenB = new MockERC20(0);
        amm = new ConstantProductAMM(address(tokenA), address(tokenB));

        // mint tokens to user
        tokenA.mint(user, 1e24); // 1M tokens
        tokenB.mint(user, 1e24);

        vm.label(user, "user");
    }

    function testAddLiquidityERC20() public {
        uint256 amountA = 1e20; // 100
        uint256 amountB = 2e20; // 200

        // user approves
        vm.prank(user);
        tokenA.approve(address(amm), amountA);
        vm.prank(user);
        tokenB.approve(address(amm), amountB);

        // add liquidity
        vm.prank(user);
        uint256 lp = amm.addLiquidity(amountA, amountB, 0, 0, block.timestamp + 1 hours);
        assertTrue(lp > 0);

        (uint256 rA, uint256 rB) = amm.getReserves();
        assertEq(rA, amountA);
        assertEq(rB, amountB);
    }

    function testSwapERC20() public {
        uint256 amountA = 1e20; // 100
        uint256 amountB = 1e20; // 100

        // seed liquidity
        vm.prank(user);
        tokenA.approve(address(amm), amountA * 10);
        vm.prank(user);
        tokenB.approve(address(amm), amountB * 10);
        vm.prank(user);
        amm.addLiquidity(amountA * 10, amountB * 10, 0, 0, block.timestamp + 1 hours);

        // perform swap A -> B
        uint256 inAmt = 1e18; // 1
        vm.prank(user);
        tokenA.approve(address(amm), inAmt);
        vm.prank(user);
        uint256 out = amm.swap(address(tokenA), inAmt, 0, block.timestamp + 1 hours);
        assertTrue(out > 0);
    }

    function testAddLiquidityNative() public {
        // deploy AMM with native tokenA
        ConstantProductAMM amm2 = new ConstantProductAMM(address(0), address(tokenB));

        uint256 amountB = 1e20;
        // mint tokenB to user
        tokenB.mint(user, amountB);

        // approve
        vm.prank(user);
        tokenB.approve(address(amm2), amountB);

        // add liquidity sending native value
        vm.deal(user, 1e21);
        vm.prank(user);
        // call with value
        (bool ok, ) = address(amm2).call{value: 1e20}(abi.encodeWithSelector(amm2.addLiquidity.selector, uint256(1e20), uint256(amountB), uint256(0), uint256(0), uint256(block.timestamp + 1 hours)));
        assertTrue(ok);

        (uint256 rA, uint256 rB) = amm2.getReserves();
        assertEq(rA, 1e20);
        assertEq(rB, amountB);
    }

    function testDeadlineReverts() public {
        uint256 amountA = 1e20;
        uint256 amountB = 1e20;

        vm.prank(user);
        tokenA.approve(address(amm), amountA);
        vm.prank(user);
        tokenB.approve(address(amm), amountB);

        vm.prank(user);
        vm.expectRevert(bytes("Deadline exceeded"));
        amm.addLiquidity(amountA, amountB, 0, 0, 0);
    }

    function testSwapSlippageReverts() public {
        uint256 amountA = 1e20;
        uint256 amountB = 1e20;

        vm.prank(user);
        tokenA.approve(address(amm), amountA * 10);
        vm.prank(user);
        tokenB.approve(address(amm), amountB * 10);
        vm.prank(user);
        amm.addLiquidity(amountA * 10, amountB * 10, 0, 0, block.timestamp + 1 hours);

        uint256 inAmt = 1e18; // 1
        vm.prank(user);
        tokenA.approve(address(amm), inAmt);

        vm.prank(user);
        vm.expectRevert(bytes("INSUFFICIENT_OUTPUT_AMOUNT"));
        // set minAmountOut extremely high
        amm.swap(address(tokenA), inAmt, type(uint256).max, block.timestamp + 1 hours);
    }
}

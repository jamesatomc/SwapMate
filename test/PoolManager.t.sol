// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "lib/forge-std/src/Test.sol";
import "src/PoolManager.sol";
import "src/USDK.sol";
import "src/Kanari.sol";

contract PoolManagerTest is Test {
    PoolManager pm;
    USDK usdk;
    Kanari kanari;

    function setUp() public {
        pm = new PoolManager();
        usdk = new USDK();
        kanari = new Kanari();
    }

    function testAddPoolAndSetFreeValue() public {
        bytes32 id = pm.poolIdFor(address(usdk), address(kanari));
        // initially not exists
        (, , , bool existsBefore) = pm.getPool(id);
        assertFalse(existsBefore);

        // add pool
        bytes32 added = pm.addPool(address(usdk), address(kanari));
        assertEq(added, id);

        // free value default 0
        uint256 fv0 = pm.freeValueOf(address(usdk), address(kanari));
        assertEq(fv0, 0);

        // only owner (this contract is NOT owner) should fail when calling setFreeValue
        vm.prank(address(0xBEEF));
        vm.expectRevert("only owner");
        pm.setFreeValue(id, 123);

        // owner sets free value
        // Owner is the EOA that deployed PoolManager in setUp (address(this) during setUp). But Test framework deploys contracts from address(this).
        pm.setFreeValue(id, 999);
        uint256 fv1 = pm.freeValueOf(address(usdk), address(kanari));
        assertEq(fv1, 999);
    }

    function testTokenProperties() public view {
        // Test USDK properties
        assertEq(usdk.name(), "USD Kanari");
        assertEq(usdk.symbol(), "USDK");
        assertEq(usdk.decimals(), 6);
        assertEq(usdk.totalSupply(), 1_000_000 * 10**6); // 1M USDK
        
        // Test Kanari properties
        assertEq(kanari.name(), "Kanari Token");
        assertEq(kanari.symbol(), "KANARI");
        assertEq(kanari.decimals(), 18);
        assertEq(kanari.totalSupply(), 50_000_000 * 10**18); // 50M KANARI
        assertEq(kanari.MAX_SUPPLY(), 100_000_000 * 10**18); // 100M max
    }

    function testUSDKMinting() public {
        address user = address(0x123);
        
        // Test minting by owner
        usdk.mint(user, 1000 * 10**6); // 1000 USDK
        assertEq(usdk.balanceOf(user), 1000 * 10**6);
        
        // Test unauthorized minting fails
        vm.prank(user);
        vm.expectRevert("Not authorized minter");
        usdk.mint(user, 100);
    }

    function testKanariBurnMechanism() public {
        address user = address(0x456);
        uint256 amount = 1000 * 10**18; // 1000 KANARI
        
        // Transfer tokens to user first
        kanari.transfer(user, amount);
        
        // Test burn on transfer (1% burn rate)
        vm.prank(user);
        uint256 transferAmount = 100 * 10**18; // 100 KANARI
        uint256 expectedBurn = transferAmount * 100 / 10000; // 1% burn = 1 KANARI
        
        kanari.transfer(address(0x789), transferAmount);
        
        // Check that burn occurred
        assertEq(kanari.totalBurned(), expectedBurn);
        assertEq(kanari.balanceOf(address(0x789)), transferAmount - expectedBurn);
    }

    function testRejectInvalidPairs() public {
        vm.expectRevert("invalid tokens");
        pm.addPool(address(0), address(kanari));

        vm.expectRevert("invalid tokens");
        pm.addPool(address(usdk), address(usdk));
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "lib/forge-std/src/Script.sol";


import "src/AddLiquidity.sol";
import "lib/forge-std/src/console.sol";

/// @notice Script to deploy enhanced DEX system with swap functionality
contract DeployDEX is Script {
    function run() external {
        // When using --ledger, we don't need to get private key from env
        // read token addresses from env
        string memory a = vm.envOr("TOKEN_A", string(abi.encodePacked("0x")));
        string memory b = vm.envOr("TOKEN_B", string(abi.encodePacked("0x")));

        address tokenA = _parseEnvAddr(a);
        address tokenB = _parseEnvAddr(b);

        console.log("Deploying ConstantProductAMM with tokenA:", tokenA);
        console.log("Deploying ConstantProductAMM with tokenB:", tokenB);

        vm.startBroadcast();
        ConstantProductAMM pool = new ConstantProductAMM(tokenA, tokenB);
        vm.stopBroadcast();

        console.log("Deployed pool at:", address(pool));
    }

    function _parseEnvAddr(string memory s) internal pure returns (address) {
        // If env is empty or starts with 0x and length <= 2, treat as native (address(0))
        bytes memory bs = bytes(s);
        if (bs.length == 0) return address(0);
        if (bs.length <= 2) return address(0);
        // parse hex string to address
        uint160 acc = 0;
        for (uint i = 2; i < bs.length; i++) {
            acc *= 16;
            uint8 c = uint8(bs[i]);
            if (c >= 48 && c <= 57) acc += uint160(c - 48);
            else if (c >= 97 && c <= 102) acc += uint160(10 + c - 97);
            else if (c >= 65 && c <= 70) acc += uint160(10 + c - 65);
            else break;
        }
        return address(acc);
    }
}

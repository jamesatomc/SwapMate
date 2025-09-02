If you wish to simulate on-chain transactions pass a RPC URL.
PS D:\Work\sm> forge script script/DeployDEX.s.sol --fork-url https://rpc.testnet.alpenlabs.io --ledger --broadcast
[⠊] Compiling...
No files changed, compilation skipped
Script ran successfully.

== Logs ==
  USDK deployed at: 0x8bd0eED7fBF4520F14FA70B35cDe45D83D4e13b6
  KANARI deployed at: 0x08ce40815dE4EbE10DbC06A71A967eF9D12e8645
  KANARI/USDK DEX deployed at: 0x9224A59e8CE52bd7A43dB38a7049CDdeAD535f63
  KANARI/Native DEX deployed at: 0x6852F22199064a6caa463372B43320cE9bA6970C
  USDK/Native DEX deployed at: 0x38DB72fA85823d17E4C878FF6901931EA16ca95b
  === Deployment Summary ===
  USDK Token: 0x8bd0eED7fBF4520F14FA70B35cDe45D83D4e13b6
  KANARI Token: 0x08ce40815dE4EbE10DbC06A71A967eF9D12e8645
  KANARI/USDK Pool: 0x9224A59e8CE52bd7A43dB38a7049CDdeAD535f63
  KANARI/Native Pool: 0x6852F22199064a6caa463372B43320cE9bA6970C
  USDK/Native Pool: 0x38DB72fA85823d17E4C878FF6901931EA16ca95b

  === Next Steps ===
  1. Mint tokens for testing:
     - KANARI.mint(address, amount)
     - USDK.mint(address, amount)
  2. Add liquidity to pools using the frontend or directly
  3. Start trading!

## Setting up 1 EVM.

==========================

Chain 2892

Estimated gas price: 0.000000015 gwei

Estimated total gas used for script: 19376208

Estimated amount required: 0.00000000029064312 ETH

==========================

##### 2892
✅  [Success] Hash: 0x7d5250864deaf8d33b9c22d0532f6d50d606fe5617a513c9d025917857a19d45
Contract Address: 0x8bd0eED7fBF4520F14FA70B35cDe45D83D4e13b6
Block: 678027
Paid: 0.000000000011841432 ETH (1480179 gas * 0.000000008 gwei)


##### 2892
✅  [Success] Hash: 0x91c95fb4bbc461c8eacdf8609ee5d9a396f170b133ed608a20e3cdfaf605baa0
Contract Address: 0x08ce40815dE4EbE10DbC06A71A967eF9D12e8645
Block: 678030
Paid: 0.000000000015526992 ETH (1940874 gas * 0.000000008 gwei)

                                                                                                                       
##### 2892                                                                                                             
✅  [Success] Hash: 0x4407259e062f1bfdfeb58c37aeeddb458496aacd2117964dc2fe5e3a5557bc77                                 
Contract Address: 0x9224A59e8CE52bd7A43dB38a7049CDdeAD535f63                                                           
Block: 678033                                                                                                          
Paid: 0.000000000030624544 ETH (3828068 gas * 0.000000008 gwei)


##### 2892
✅  [Success] Hash: 0x45763f9cbfff9bf9b3eecb313f0c9a8fed9f2a6f97db6311abd5273ea8a1a4cc
Contract Address: 0x6852F22199064a6caa463372B43320cE9bA6970C
Block: 678037
Paid: 0.000000000030622624 ETH (3827828 gas * 0.000000008 gwei)


##### 2892
✅  [Success] Hash: 0xfb59ebbdb07ac07168d4863fd6ce87f5f45a47e0c42074176298c97f790d02b0
Contract Address: 0x38DB72fA85823d17E4C878FF6901931EA16ca95b
Block: 678041
Paid: 0.000000000030622624 ETH (3827828 gas * 0.000000008 gwei)

✅ Sequence #1 on 2892 | Total Paid: 0.000000000119238216 ETH (14904777 gas * avg 0.000000008 gwei)                    
                                                                                                                       
                                                                                                                       
==========================

ONCHAIN EXECUTION COMPLETE & SUCCESSFUL.

Transactions saved to: D:/Work/sm/broadcast\DeployDEX.s.sol\2892\run-latest.json

Sensitive values saved to: D:/Work/sm/cache\DeployDEX.s.sol\2892\run-latest.json

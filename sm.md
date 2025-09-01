PS D:\Work\sm> forge script script/DeploySystem.s.sol --fork-url https://rpc.testnet.alpenlabs.io --ledger --broadcast
[⠊] Compiling...
No files changed, compilation skipped
Script ran successfully.

== Logs ==
  USDK deployed at: 0x99Ca3418F47544CD01659d895FB80c5d356717C5
  Kanari deployed at: 0xfD091f10DdaAC71ce5a81482a3Ff6bB5C361916C
  PoolManager deployed at: 0x569eF97895FC7d60F97944485d55B24264285947
  Pool ID (USDK/KANARI): 0x1733a754c0b952988766eae9a885986a7bd0c664ec2875cbe4227c742c4c1d45
  USDK total supply: 1000000000000
  Kanari total supply: 50000000000000000000000000
  Pool free value: 1000000000

## Setting up 1 EVM.

==========================

Chain 2892

Estimated gas price: 0.000000015 gwei

Estimated total gas used for script: 6145979

Estimated amount required: 0.000000000092189685 ETH

==========================

##### 2892
✅  [Success] Hash: 0x88b01ee0a5509e402c0ea1b2974bca98c48ffaad9b97d299c507d7cdf75265ec
Contract Address: 0x99Ca3418F47544CD01659d895FB80c5d356717C5
Block: 654472
Paid: 0.000000000013248488 ETH (1656061 gas * 0.000000008 gwei)


##### 2892
✅  [Success] Hash: 0x2795ee9b265649f69ac529b96308fa21dcb4da82ed617091761b2b6dca834c8e
Contract Address: 0xfD091f10DdaAC71ce5a81482a3Ff6bB5C361916C
Block: 654483
Paid: 0.000000000016595056 ETH (2074382 gas * 0.000000008 gwei)


##### 2892
✅  [Success] Hash: 0xdf11c4f477a25b23f5c0ec3e12543ba025790657ca9853f06698a04f906478e5
Contract Address: 0x569eF97895FC7d60F97944485d55B24264285947
Block: 654487
Paid: 0.00000000000636608 ETH (795760 gas * 0.000000008 gwei)                                                        

                                                                                                                     
##### 2892                                                                                                           
✅  [Success] Hash: 0xb388cf8590b799e7f7d271c94b2586e1ccc723f17c4f83d56589e905ecb639ad                               
Block: 654489                                                                                                        
Paid: 0.000000000001113184 ETH (139148 gas * 0.000000008 gwei)

                                                                                                                     
##### 2892                                                                                                           
✅  [Success] Hash: 0x6341386b34aea0d4e0ee1dd2529a33b457fb4f9a443dcd4021e08f6bb7b766dc                               
Block: 654491
Paid: 0.000000000000403808 ETH (50476 gas * 0.000000008 gwei)

✅ Sequence #1 on 2892 | Total Paid: 0.000000000037726616 ETH (4715827 gas * avg 0.000000008 gwei)                   
                                                                                                                     
==========================

ONCHAIN EXECUTION COMPLETE & SUCCESSFUL.

Transactions saved to: D:/Work/sm/broadcast\DeploySystem.s.sol\2892\run-latest.json

Sensitive values saved to: D:/Work/sm/cache\DeploySystem.s.sol\2892\run-latest.json

PS D:\Work\sm> forge script script/InteractSystem.s.sol --fork-url https://rpc.testnet.alpenlabs.io --ledger --broadcast
[⠊] Compiling...
[⠘] Compiling 1 files with Solc 0.8.30
[⠃] Solc 0.8.30 finished in 731.72ms
Compiler run successful!
Script ran successfully.

== Logs ==
  Deploying new contracts...
  USDK deployed at: 0xCF64854FB0C8a50A1a096fc48bC59843bdEb688e
  Kanari deployed at: 0x1d1D334E3fe1c22B12D68af6B4Ffd8DFd4c1a5e7
  PoolManager deployed at: 0xd987b74317D396B89fF722997EbDC0B587eCC5E4
  Creating USDK/KANARI pool...
  Pool created with ID: 0x1a91ae7761a8388babf7703093896d2af9c6b3bb8bdd6bba9b15edafc38b3fde
  Setting free value to 2000 USDK...
  Minting 5000 USDK to recipient...
  Minting 10000 KANARI to recipient...

=== Final State ===
  Pool free value: 2000000000
  USDK total supply: 1005000000000
  Kanari total supply: 50010000000000000000000000
  Recipient USDK balance: 5000000000
  Recipient KANARI balance: 10000000000000000000000

## Setting up 1 EVM.

==========================

Chain 2892

Estimated gas price: 0.000000015 gwei

Estimated total gas used for script: 6300590

Estimated amount required: 0.00000000009450885 ETH

==========================

##### 2892
✅  [Success] Hash: 0xb2669ee731c1f14eba72ba6854fed0787b19e978cf9ffce4b23e92e3e4160d9e
Contract Address: 0xCF64854FB0C8a50A1a096fc48bC59843bdEb688e
Block: 654531
Paid: 0.000000000013248488 ETH (1656061 gas * 0.000000008 gwei)

                                                                                                                                                                                   
##### 2892                                                                                                                                                                         
✅  [Success] Hash: 0x48470b578566e69e98123e67eb21159ca20bb4e8f92337f5794204cadcb0d257                                                                                             
Contract Address: 0xd987b74317D396B89fF722997EbDC0B587eCC5E4                                                                                                                       
Block: 654536                                                                                                                                                                      
Paid: 0.00000000000636608 ETH (795760 gas * 0.000000008 gwei)                                                                                                                      
                                                                                                                                                                                   

##### 2892
✅  [Success] Hash: 0x9f262667d78aeaccf799db7d6b9d91e2ca3088ca306f0d1110768052250c9b65
Block: 654539
Paid: 0.000000000001113184 ETH (139148 gas * 0.000000008 gwei)

                                                                                                                                                                                   
##### 2892                                                                                                                                                                         
✅  [Success] Hash: 0xfc5a6a98437212a335993ae66583002d1ae0febc268776351ac51c55b15bd210                                                                                             
Block: 654544                                                                                                                                                                      
Paid: 0.000000000000433248 ETH (54156 gas * 0.000000008 gwei)                                                                                                                      
                                                                                                                                                                                   

##### 2892
✅  [Success] Hash: 0x0ddc5cef7024fc16ff1c36fc07d87d8988f92924d9b8a93ec500958f8da2fc17
Contract Address: 0x1d1D334E3fe1c22B12D68af6B4Ffd8DFd4c1a5e7
Block: 654533
Paid: 0.000000000016595056 ETH (2074382 gas * 0.000000008 gwei)

                                                                                                                                                                                   
##### 2892                                                                                                                                                                         
✅  [Success] Hash: 0xbc129d9e159c1ef35ded3b82f107ddd1cf2d4e4327532f2e762b3b2e4462109c                                                                                             
Block: 654541                                                                                                                                                                      
Paid: 0.000000000016595056 ETH (2074382 gas * 0.000000008 gwei)


##### 2892
✅  [Success] Hash: 0xbc129d9e159c1ef35ded3b82f107ddd1cf2d4e4327532f2e762b3b2e4462109c
Block: 654541
Paid: 0.000000000000403808 ETH (50476 gas * 0.000000008 gwei)


##### 2892
✅  [Success] Hash: 0x7410cef9eb93c91819f1a09dc904482c4ec8ed05dd94ebad91200b419732f8a4
Block: 654545
Paid: 0.000000000000436568 ETH (54571 gas * 0.000000008 gwei)

✅ Sequence #1 on 2892 | Total Paid: 0.000000000038596432 ETH (4824554 gas * avg 0.000000008 gwei)


==========================

ONCHAIN EXECUTION COMPLETE & SUCCESSFUL.

Transactions saved to: D:/Work/sm/broadcast\InteractSystem.s.sol\2892\run-latest.json

Sensitive values saved to: D:/Work/sm/cache\InteractSystem.s.sol\2892\run-latest.json
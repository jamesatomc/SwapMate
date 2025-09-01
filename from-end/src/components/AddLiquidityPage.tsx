"use client";

import React, { useEffect, useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther, Address } from 'viem';
import { CONTRACTS, USDK_ABI, KANARI_ABI, SWAP_ABI } from '@/lib/contracts';

export default function AddLiquidityPage() {

  return (
    <div>
      <h1>Add Liquidity Page</h1>
    </div>
  );
}

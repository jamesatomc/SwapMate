"use client";

import React, { useEffect, useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther, Address } from 'viem';
import { CONTRACTS, USDK_ABI, KANARI_ABI, SWAP_ABI } from '@/lib/contracts';

export default function SwapPage() {
  const { address, isConnected } = useAccount();

  return (
    <div>
      <h1>Swap Page</h1>
    </div>
  );
}

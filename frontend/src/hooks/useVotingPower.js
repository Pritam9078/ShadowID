import { useState, useEffect, useCallback } from 'react';
import { useContractRead, useAccount } from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
import { GOVERNANCE_TOKEN_ABI } from '../config/abis';
import { CONTRACTS } from '../config/contracts';

/**
 * Custom hook for managing voting power calculations
 * Handles direct tokens, delegated tokens, and voting power tracking
 */
export const useVotingPower = () => {
  const { address } = useAccount();
  const [votingPower, setVotingPower] = useState(0);
  const [delegatedPower, setDelegatedPower] = useState(0);
  const [totalSupply, setTotalSupply] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Get user's token balance
  const { data: userBalance, isLoading: balanceLoading } = useContractRead({
    address: CONTRACTS.GOVERNANCE_TOKEN,
    abi: GOVERNANCE_TOKEN_ABI,
    functionName: 'balanceOf',
    args: [address],
    enabled: !!address,
    watch: true
  });

  // Get delegated voting power
  const { data: delegatedBalance, isLoading: delegatedLoading } = useContractRead({
    address: CONTRACTS.GOVERNANCE_TOKEN,
    abi: GOVERNANCE_TOKEN_ABI,
    functionName: 'getVotes',
    args: [address],
    enabled: !!address,
    watch: true
  });

  // Get total token supply
  const { data: supply, isLoading: supplyLoading } = useContractRead({
    address: CONTRACTS.GOVERNANCE_TOKEN,
    abi: GOVERNANCE_TOKEN_ABI,
    functionName: 'totalSupply',
    watch: true
  });

  // Get delegation info (who user delegated to)
  const { data: delegatee } = useContractRead({
    address: CONTRACTS.GOVERNANCE_TOKEN,
    abi: GOVERNANCE_TOKEN_ABI,
    functionName: 'delegates',
    args: [address],
    enabled: !!address,
    watch: true
  });

  // Calculate effective voting power
  useEffect(() => {
    if (!address) {
      setVotingPower(0);
      setDelegatedPower(0);
      setTotalSupply(0);
      return;
    }

    setIsLoading(balanceLoading || delegatedLoading || supplyLoading);

    try {
      // Direct token balance (if not delegated to someone else)
      const balance = userBalance ? Number(formatUnits(userBalance, 18)) : 0;
      
      // Delegated voting power (tokens delegated TO this user)
      const delegated = delegatedBalance ? Number(formatUnits(delegatedBalance, 18)) : 0;
      
      // Total supply for percentage calculations
      const total = supply ? Number(formatUnits(supply, 18)) : 0;

      // If user has delegated their tokens to someone else, they don't have direct voting power
      const hasDelegated = delegatee && delegatee !== address && delegatee !== '0x0000000000000000000000000000000000000000';
      
      setVotingPower(hasDelegated ? 0 : balance);
      setDelegatedPower(delegated - (hasDelegated ? 0 : balance)); // Subtract own tokens to avoid double counting
      setTotalSupply(total);
      setError(null);
    } catch (err) {
      console.error('Error calculating voting power:', err);
      setError(err.message);
    }
  }, [userBalance, delegatedBalance, supply, delegatee, address, balanceLoading, delegatedLoading, supplyLoading]);

  // Get voting power at a specific block (for historical proposals)
  const getVotingPowerAtBlock = useCallback(async (blockNumber) => {
    if (!address) return 0;

    try {
      // This would typically use a multicall or historical query
      // For now, return current voting power
      return votingPower + delegatedPower;
    } catch (err) {
      console.error('Error getting historical voting power:', err);
      return 0;
    }
  }, [address, votingPower, delegatedPower]);

  // Check if user meets minimum voting power requirements
  const meetsMinimumPower = useCallback((requiredPower = 1) => {
    return (votingPower + delegatedPower) >= requiredPower;
  }, [votingPower, delegatedPower]);

  // Get voting power breakdown
  const getVotingPowerBreakdown = useCallback(() => {
    return {
      directTokens: votingPower,
      delegatedTokens: delegatedPower,
      totalVotingPower: votingPower + delegatedPower,
      percentageOfSupply: totalSupply > 0 ? ((votingPower + delegatedPower) / totalSupply) * 100 : 0,
      hasDelegated: delegatee && delegatee !== address && delegatee !== '0x0000000000000000000000000000000000000000',
      delegatedTo: delegatee
    };
  }, [votingPower, delegatedPower, totalSupply, delegatee, address]);

  return {
    // Current voting power
    votingPower,
    delegatedPower,
    totalVotingPower: votingPower + delegatedPower,
    totalSupply,
    
    // Status
    isLoading,
    error,
    
    // Utility functions
    getVotingPowerAtBlock,
    meetsMinimumPower,
    getVotingPowerBreakdown,
    
    // Percentages
    votingPowerPercentage: totalSupply > 0 ? (votingPower / totalSupply) * 100 : 0,
    delegatedPowerPercentage: totalSupply > 0 ? (delegatedPower / totalSupply) * 100 : 0,
    totalPowerPercentage: totalSupply > 0 ? ((votingPower + delegatedPower) / totalSupply) * 100 : 0
  };
};

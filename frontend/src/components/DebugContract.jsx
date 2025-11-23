import { useReadContract } from 'wagmi';
import { CONTRACT_ADDRESSES } from '../config/contracts';
import { DAO_ABI } from '../config/abis';

const DebugContract = () => {
  const { data: proposalCount, error, isLoading } = useReadContract({
    address: CONTRACT_ADDRESSES.DAO,
    abi: DAO_ABI,
    functionName: 'proposalCount',
  });

  return (
    <div className="p-4 bg-gray-100 rounded m-4">
      <h3 className="font-bold mb-2">Contract Debug Info:</h3>
      <p>Contract Address: {CONTRACT_ADDRESSES.DAO}</p>
      <p>Is Loading: {isLoading ? 'Yes' : 'No'}</p>
      <p>Error: {error ? error.message : 'None'}</p>
      <p>Proposal Count: {proposalCount ? proposalCount.toString() : 'Not loaded'}</p>
    </div>
  );
};

export default DebugContract;

import { ethers } from 'ethers';

export function withTimeout(promise, milliseconds, message = 'Operation timed out') {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(message)), milliseconds); }),
  ]).finally(() => clearTimeout(timer));
}

let readProvider;
export function getReadProvider() {
  if (!readProvider) {
    const request = new ethers.FetchRequest(import.meta.env.VITE_SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com');
    request.timeout = 15000;
    readProvider = new ethers.JsonRpcProvider(request, 11155111);
  }
  return readProvider;
}

let providerPromise;

export async function getMobileWallet() {
  const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;
  if (!projectId) throw new Error('WalletConnect project ID missing');
  if (!providerPromise) {
    providerPromise = import('@walletconnect/ethereum-provider').then(({ default: EthereumProvider }) =>
      EthereumProvider.init({
        projectId,
        chains: [11155111],
        showQrModal: true,
        optionalMethods: ['wallet_switchEthereumChain'],
        rpcMap: { 11155111: 'https://ethereum-sepolia-rpc.publicnode.com' },
        metadata: {
          name: 'TrustDApp',
          description: 'Sepolia escrow prototype. Never use mainnet funds.',
          url: window.location.origin,
          icons: [new URL('/favicon.svg', window.location.origin).href],
        },
        qrModalOptions: { themeMode: document.documentElement.dataset.theme === 'light' ? 'light' : 'dark' },
      })
    ).catch(error => { providerPromise = undefined; throw error; });
  }
  return providerPromise;
}
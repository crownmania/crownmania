import { Web3Auth } from "@web3auth/modal";
import { CHAIN_NAMESPACES } from "@web3auth/base";
import Moralis from 'moralis';

const web3AuthConfig = {
  clientId: import.meta.env.VITE_WEB3AUTH_CLIENT_ID,
  chainConfig: {
    chainNamespace: CHAIN_NAMESPACES.EIP155,
    chainId: "0x1", // Ethereum Mainnet
    rpcTarget: import.meta.env.VITE_WEB3_RPC_TARGET,
    displayName: "Ethereum Mainnet",
    blockExplorer: "https://etherscan.io",
    ticker: "ETH",
    tickerName: "Ethereum"
  }
};

// Initialize Web3Auth
const web3auth = new Web3Auth({
  ...web3AuthConfig,
  web3AuthNetwork: "mainnet"
});

// Initialize and export Moralis
const initMoralis = async () => {
  await Moralis.start({
    apiKey: import.meta.env.VITE_MORALIS_API_KEY
  });
  return Moralis;
};

export { web3auth, Moralis, initMoralis };

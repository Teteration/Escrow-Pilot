# 🔗 Escrow Pilot

A professional, fully automated decentralized Escrow application built on the Ethereum network (Sepolia Testnet). This project ensures trustless transactions between an Employer and a Contractor using a 2-of-2 multisig architecture, where final payment release requires approval from both the Employer and a decentralized Chainlink Oracle.

## ✨ Key Features

*   **Smart Contract Escrow:** Automated fund locking and releasing mechanism requiring dual validation.
*   **Decentralized Arbitration:** Integrates **Chainlink Any-API** (calling CoinGecko) to act as an automated, impartial third-party arbiter.
*   **Fully Automated Pipeline:** A custom Hardhat deployment script that dynamically deploys the contract, auto-funds it with LINK, and seamlessly injects the latest ABI and Contract Address directly into the React frontend.
*   **Modern UI/UX:** A responsive, dark-themed Glassmorphism dashboard built with React and pure CSS—no heavy UI libraries required.
*   **Dynamic State Management:** Real-time milestone tracking, dynamic tooltips, and on-chain status badges.

## 🏗 Architecture Workflow

1.  **Creation:** The Employer creates a milestone and locks the exact required ETH budget into the smart contract.
2.  **Employer Approval:** Once the off-chain work is delivered, the Employer approves the milestone on-chain.
3.  **Oracle Approval:** A Chainlink Oracle is triggered to verify real-world data (via CoinGecko API). Upon successful validation, the Oracle submits the second required signature.
4.  **Payout:** With both signatures collected (`approvalCount == 2`), the smart contract automatically releases the locked funds directly to the Contractor's wallet.

## 🛠 Tech Stack

*   **Smart Contracts:** Solidity, Hardhat, Ethers.js (v6)
*   **Frontend:** React.js, Vite
*   **Oracles:** Chainlink Client (`@chainlink/contracts`)
*   **Network:** Sepolia Testnet

## 🚀 Getting Started

### Prerequisites
*   [Node.js](https://nodejs.org/) installed.
*   [MetaMask](https://metamask.io/) extension installed in your browser.
*   Sepolia ETH and Sepolia LINK tokens in your deployer wallet.

### 1. Clone & Setup
```bash
git clone [https://github.com/yourusername/escrow-pilot.git](https://github.com/yourusername/escrow-pilot.git)
cd escrow-pilot
```

### 2. Install Dependencies
Install packages for both the Hardhat backend and the React frontend:
```bash
npm install
cd frontend && npm install
cd ..
```

### 3. Environment Configuration
Create a `.env` file in the root directory and add your credentials:
```env
SEPOLIA_RPC_URL="[https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY](https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY)"
PRIVATE_KEY="YOUR_METAMASK_PRIVATE_KEY"
```

### 4. Automated Deployment
Before deploying, open `scripts/deploy.js` and set your specific `contractorAddress`. Then run:
```bash
npx hardhat run scripts/deploy.js --network sepolia
```
*Note: This script handles contract deployment, auto-funding the contract with 1 LINK, and synchronizing the ABI/Address with your frontend repository.*

### 5. Launch the Frontend
```bash
cd frontend
npm run dev
```
Navigate to `http://localhost:5173` in your browser. Connect your MetaMask wallet and start creating Escrow milestones!

## 🛡️ Security Notes
This is a pilot project deployed on the Sepolia testnet. While the architecture enforces strict value checks (`require(msg.value == _amount)`) and implements basic Reentrancy protections via state updates preceding external calls, it has not undergone a formal security audit. Do not use this exact contract in a production (Mainnet) environment involving real-world assets without comprehensive penetration testing and auditing.

## 📝 License
This project is licensed under the MIT License.
cd /blockChainProj/escrow-pilot$ 
    npx hardhat run scripts/deploy.js --network sepolia
result: 
-----------------------------------------
🎉 EscrowOracle Deployed Successfully!
📍 Contract Address: 0x4c0a627fa932Dc95c559d0F5c188B87b8b43b050
-----------------------------------------

cd /blockChainProj/frontend$
    npm run dev



1- select price and Deploy Smart Contract on blockchain
2- charge smart contract with BlockChain Token(Sepolia ETH) -> it hold your money and lock it. -<<<<<<<<< این فاز حذف شد. حذف نشد، با فاز بعد یکی شد. یعنی سفارش به شرطی که پولش درجا بلاک شه در قرارداد هوشمند>>>>>>>>>
3- accept as comploye <<< یعنی پیمانکار کارش رو انجام داده و کارفرما تایید میزنه>>>
4- charge smart contract with chainlink token(LINK) -> its needed for chainlink Network fee
5- Call Oracle Api(its chainlink transaction and need LINK for pay Network fee)
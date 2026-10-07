import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import FactoryJSON from './contracts/EscrowFactory.json';
import EscrowJSON from './contracts/TrustEscrow.json';
import AddressJSON from './contracts/contract-address.json';
import './App.css'; 

function App() {
  const [account, setAccount] = useState(null);
  const [factoryContract, setFactoryContract] = useState(null);
  const [escrows, setEscrows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState(''); // مدیریت خطای فرم بدون پاپ‌آپ

  const [newContractor, setNewContractor] = useState('');
  const [newArbiter, setNewArbiter] = useState('');
  const [newBudget, setNewBudget] = useState('');
  const [isOracleMode, setIsOracleMode] = useState(false);

  useEffect(() => {
    const wallet = window.ethereum;
    if (!wallet?.on) return;
    const resetWallet = () => {
      setAccount(null);
      setFactoryContract(null);
      setEscrows([]);
    };
    wallet.on('accountsChanged', resetWallet);
    wallet.on('chainChanged', resetWallet);
    return () => {
      wallet.removeListener('accountsChanged', resetWallet);
      wallet.removeListener('chainChanged', resetWallet);
    };
  }, []);

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0xaa36a7' }], 
        });

        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        
        const factory = new ethers.Contract(AddressJSON.EscrowFactory, FactoryJSON.abi, signer);
        
        setAccount(address);
        setFactoryContract(factory);
        fetchEscrows(factory, provider);
      } catch (error) {
        console.error("Connection Error:", error);
      }
    }
  };

  const fetchEscrows = async (factoryIns, provider) => {
    try {
      const addresses = await factoryIns.getAllEscrows();
      const allEscrowData = [];

      for (let address of addresses) {
        const escrowContract = new ethers.Contract(address, EscrowJSON.abi, provider);
        
        const employer = await escrowContract.employer();
        const contractor = await escrowContract.contractor();
        const arbiter = await escrowContract.arbiter();
        const budget = await escrowContract.budget();
        const state = await escrowContract.currentState();
        const isOracle = await escrowContract.isOracleMode();
        
        const empRel = await escrowContract.hasApprovedRelease(employer);
        const conRel = await escrowContract.hasApprovedRelease(contractor);
        const arbRel = await escrowContract.hasApprovedRelease(arbiter);

        const empRef = await escrowContract.hasApprovedRefund(employer);
        const conRef = await escrowContract.hasApprovedRefund(contractor);
        const arbRef = await escrowContract.hasApprovedRefund(arbiter);

        allEscrowData.push({
          address, employer, contractor, arbiter,
          budget: ethers.formatEther(budget),
          state: Number(state), 
          isOracle,
          signatures: { empRel, conRel, arbRel, empRef, conRef, arbRef }
        });
      }
      setEscrows(allEscrowData);
    } catch (error) {
      console.error("Fetch Error:", error);
    }
  };

  const createNewEscrow = async (e) => {
    e.preventDefault();
    if (!factoryContract) return;
    
    setFormError(''); // پاک کردن خطای قبلی

    // بررسی‌های اولیه فرانت‌اند برای تجربه کاربری بهتر
    if (!isOracleMode && newArbiter.toLowerCase() === account.toLowerCase()) {
      setFormError('خطا: آدرس ناظر نمی‌تواند با آدرس کارفرما (خود شما) یکسان باشد.');
      return;
    }

    try {
      setLoading(true);
      const amountInWei = ethers.parseEther(newBudget.toString());
      const finalArbiter = isOracleMode ? ethers.ZeroAddress : newArbiter;
      
      const tx = await factoryContract.createEscrow(
        newContractor, finalArbiter, isOracleMode, { value: amountInWei }
      );
      
      await tx.wait();
      const provider = new ethers.BrowserProvider(window.ethereum);
      fetchEscrows(factoryContract, provider);
      
      setNewContractor(''); setNewArbiter(''); setNewBudget(''); setIsOracleMode(false);
    } catch (error) {
      console.error("Create Error:", error);
      // استخراج پیام خطای قرارداد هوشمند
      let msg = error.reason || error.message || "خطای ناشناخته در تراکنش";
      if (msg.includes("Arbiter must be a neutral third party")) {
        msg = "خطا: ناظر باید یک شخص ثالث و بی‌طرف باشد و نمی‌‌تواند خودتان یا پیمانکار باشید.";
      }
      setFormError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (escrowAddress, actionType) => {
    try {
      setLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const escrowContract = new ethers.Contract(escrowAddress, EscrowJSON.abi, signer);
      
      let tx = actionType === 'release' 
        ? await escrowContract.approveRelease() 
        : await escrowContract.approveRefund();
      
      await tx.wait();
      fetchEscrows(factoryContract, provider);
    } catch (error) {
      console.error("Action Error:", error);
      alert("شما قبلا رای داده‌اید یا مجاز به این عملیات نیستید.");
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (addr) => `${addr.substring(0, 6)}...${addr.substring(38)}`;

  // تشخیص هوشمند نقش کاربر متصل به متامسک در هر پروژه
  const getUserRoleInProject = (m) => {
    if (!account) return null;
    const currentAcc = account.toLowerCase();
    if (m.employer.toLowerCase() === currentAcc) return "کارفرما (Employer)";
    if (m.contractor.toLowerCase() === currentAcc) return "پیمانکار (Contractor)";
    if (!m.isOracle && m.arbiter.toLowerCase() === currentAcc) return "ناظر (Arbiter)";
    return "ناظر/مشاهده‌گر";
  };

  const SignaturesDisplay = ({ sigs, type, isOracle }) => {
    const isRel = type === 'release';
    return (
      <div className="signers-box">
        <span className={`signer-tag ${ (isRel ? sigs.empRel : sigs.empRef) ? 'yes' : 'no' }`}>
          کارفرما {(isRel ? sigs.empRel : sigs.empRef) ? '✅' : '⏳'}
        </span>
        <span className={`signer-tag ${ (isRel ? sigs.conRel : sigs.conRef) ? 'yes' : 'no' }`}>
          پیمانکار {(isRel ? sigs.conRel : sigs.conRef) ? '✅' : '⏳'}
        </span>
        {isOracle ? (
           <span className="signer-tag oracle">اوراکل API 🤖</span>
        ) : (
           <span className={`signer-tag ${ (isRel ? sigs.arbRel : sigs.arbRef) ? 'yes' : 'no' }`}>
             ناظر {(isRel ? sigs.arbRel : sigs.arbRef) ? '✅' : '⏳'}
           </span>
        )}
      </div>
    );
  };

  return (
    <div className="app-container">
      <header className="top-header">
        <h2 className="logo">TrustDApp</h2>
        {account ? (
          <span className="wallet-btn connected">کیف پول: <bdi title={account}>{formatAddress(account)}</bdi></span>
        ) : (
          <button className="wallet-btn" onClick={connectWallet}>اتصال متامسک</button>
        )}
      </header>

      {account && (
        <main>
          <section className="card">
            <h3 className="card-title">تعریف قرارداد جدید</h3>
            <form className="escrow-form" onSubmit={createNewEscrow}>
              <input className="input-field" type="text" placeholder="آدرس کیف پول پیمانکار" 
                value={newContractor} onChange={e => setNewContractor(e.target.value)} required />
              
              <input className="input-field" type="text" 
                placeholder={isOracleMode ? "توسط شبکه اوراکل مدیریت می‌شود" : "آدرس کیف پول ناظر (Arbiter)"}
                value={isOracleMode ? "" : newArbiter} 
                onChange={e => setNewArbiter(e.target.value)} 
                disabled={isOracleMode} required={!isOracleMode} />
              
              <input className="input-field" type="number" step="0.0001" placeholder="بودجه پروژه (ETH)" 
                value={newBudget} onChange={e => setNewBudget(e.target.value)} required />
              
              <label className="checkbox-group">
                <input type="checkbox" checked={isOracleMode} onChange={e => setIsOracleMode(e.target.checked)} />
                داوری اتوماتیک (Oracle API) - فیلد ناظر دستی غیرفعال می‌شود
              </label>

              {formError && (
                <div style={{ color: '#ef4444', fontSize: '0.85rem', background: 'rgba(239, 68, 68, 0.1)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                  {formError}
                </div>
              )}
              
              <button className="submit-btn" type="submit" disabled={loading}>
                {loading ? 'در حال پردازش...' : 'ایجاد قرارداد'}
              </button>
            </form>
          </section>

          <section className="card">
            <h3 className="card-title">داشبورد پروژه‌ها</h3>
            <div className="table-wrapper">
              <table className="escrow-table">
                <thead>
                  <tr>
                    <th>قرارداد</th>
                    <th>مبلغ</th>
                    <th>نقش شما</th>
                    <th>وضعیت</th>
                    <th>وضعیت تسویه</th>
                    <th>وضعیت لغو</th>
                    <th>عملیات</th>
                  </tr>
                </thead>
                <tbody>
                  {escrows.map((m, i) => (
                    <tr key={i}>
                      <td><span className="address-cell" title={m.address}>{formatAddress(m.address)}</span></td>
                      <td><span className="budget-val">{m.budget} ETH</span></td>
                      <td><span style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: 'bold' }}>{getUserRoleInProject(m)}</span></td>
                      <td>
                        {m.state === 0 && <span className="status-badge status-0">در جریان</span>}
                        {m.state === 1 && <span className="status-badge status-1">تسویه شده</span>}
                        {m.state === 2 && <span className="status-badge status-2">لغو شده</span>}
                      </td>
                      <td><SignaturesDisplay sigs={m.signatures} type="release" isOracle={m.isOracle} /></td>
                      <td><SignaturesDisplay sigs={m.signatures} type="refund" isOracle={m.isOracle} /></td>
                      <td>
                        <div className="action-btns">
                          {m.state === 0 && (
                            <>
                              <button className="btn-action btn-release" onClick={() => handleAction(m.address, 'release')} disabled={loading}>تسویه</button>
                              <button className="btn-action btn-refund" onClick={() => handleAction(m.address, 'refund')} disabled={loading}>لغو</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {escrows.length === 0 && (
                    <tr>
                      <td colSpan="7" style={{ padding: '2rem', color: '#94a3b8' }}>هیچ پروژه‌ای یافت نشد.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      )}
    </div>
  );
}

export default App;
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import EscrowOracleJSON from './contracts/EscrowOracle.json';
import contractAddressData from './contracts/contract-address.json';
import './App.css';

const CONTRACT_ADDRESS = contractAddressData.EscrowOracle;

function App() {
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [milestones, setMilestones] = useState([]);

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        
        const escrowContract = new ethers.Contract(CONTRACT_ADDRESS, EscrowOracleJSON.abi, signer);
        setAccount(address);
        setContract(escrowContract);
      } catch (error) {
        console.error("خطا در اتصال:", error);
      }
    } else {
      alert("لطفاً افزونه MetaMask را نصب کنید.");
    }
  };

  const fetchMilestones = async () => {
    if (!contract) return;
    try {
      const count = await contract.milestoneCount();
      let loadedMilestones = [];
      for (let i = 1; i <= count; i++) {
        const m = await contract.milestones(i);
        loadedMilestones.push({
          id: i,
          amount: ethers.formatEther(m.amount),
          isCompleted: m.isCompleted,
          employerApproved: m.employerApproved,
          arbiterApproved: m.arbiterApproved,
          approvalCount: m.approvalCount.toString()
        });
      }
      setMilestones(loadedMilestones);
    } catch (error) {
      console.error("خطا در دریافت فازها:", error);
    }
  };

  useEffect(() => {
    if (contract) fetchMilestones();
  }, [contract]);

  const createMilestone = async () => {
    if (!contract || !amount) return;
    try {
      setLoading(true);
      const amountInWei = ethers.parseEther(amount);
      const tx = await contract.createMilestone(amountInWei, { value: amountInWei });
      await tx.wait();
      setAmount("");
      fetchMilestones(); 
    } catch (error) {
      alert("خطا! آیا موجودی اتریوم شما کافی است؟");
    } finally {
      setLoading(false);
    }
  };

  const approveByEmployer = async (id) => {
    try {
      setLoading(true);
      const tx = await contract.approveByEmployer(id);
      await tx.wait();
      fetchMilestones(); 
    } catch (error) {
      alert("خطا! آیا با آدرس کارفرما متصل هستید؟");
    } finally {
      setLoading(false);
    }
  };

  const callOracle = async (id) => {
    try {
      setLoading(true);
      const apiUrl = "https://api.npoint.io/ebb606af8e3a3c8dedb8"; 
      const tx = await contract.requestMilestoneStatus(id, apiUrl);
      await tx.wait();
      alert("درخواست به اوراکل ارسال شد! تایید نهایی ممکن است ۱-۲ دقیقه زمان ببرد.");
      fetchMilestones(); 
    } catch (error) {
      alert("خطا! آیا قرارداد را با توکن LINK شارژ کرده‌اید؟");
    } finally {
      setLoading(false);
    }
  };

  // کوتاه کردن آدرس کیف پول برای نمایش زیباتر
  const formatAddress = (addr) => `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;

  return (
    <div className="app-container">
      <nav className="navbar">
        <div className="logo-section">
          <div className="logo-icon">🔗</div>
          <h1>Escrow Pilot</h1>
          <span className="network-badge">Sepolia Testnet</span>
        </div>
        {!account ? (
          <button onClick={connectWallet} className="btn-primary">اتصال کیف پول</button>
        ) : (
          <div className="wallet-info">
            <span className="wallet-address">{formatAddress(account)}</span>
            <div className="status-dot online"></div>
          </div>
        )}
      </nav>

      {account && (
        <main className="dashboard">
          <section className="card create-card">
            <h2>تعریف فاز جدید</h2>
            <p className="subtitle">بودجه پروژه را مشخص کنید تا در قرارداد هوشمند قفل شود.</p>
            <div className="input-group">
              <input 
                type="number" 
                placeholder="مبلغ (مثلاً 0.01 ETH)" 
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="modern-input"
              />
              <button onClick={createMilestone} disabled={loading} className="btn-primary">
                {loading ? <span className="spinner"></span> : "قفل سرمایه"}
              </button>
            </div>
          </section>

          <section className="card table-card">
            <div className="table-header">
              <h2>وضعیت پروژه‌ها</h2>
              <button onClick={fetchMilestones} className="btn-icon" title="بروزرسانی جدول">🔄</button>
            </div>
            
            <div className="table-responsive">
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>شناسه</th>
                    <th>بودجه (ETH)</th>
                    <th>کارفرما</th>
                    <th>اوراکل</th>
                    <th>امضاها</th>
                    <th>وضعیت</th>
                    <th>عملیات</th>
                  </tr>
                </thead>
                <tbody>
                  {milestones.length === 0 ? (
                    <tr><td colSpan="7" className="empty-state">هیچ فازی تعریف نشده است.</td></tr>
                  ) : milestones.map((m) => (
                    <tr key={m.id}>
                      <td>#{m.id}</td>
                      <td className="font-mono">{m.amount}</td>
                      <td>
                        <span className={`badge ${m.employerApproved ? 'badge-success' : 'badge-pending'}`}>
                          {m.employerApproved ? "تایید شده" : "در انتظار"}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${m.arbiterApproved ? 'badge-success' : 'badge-pending'}`}>
                          {m.arbiterApproved ? "تایید شده" : "در انتظار"}
                        </span>
                      </td>
                      <td className="font-mono">{m.approvalCount} / 2</td>
                      <td>
                        <span className={`badge ${m.isCompleted ? 'badge-paid' : 'badge-locked'}`}>
                          {m.isCompleted ? "🔓 تسویه شد" : "🔒 قفل شده"}
                        </span>
                      </td>
                      <td className="actions-cell">
                        {!m.employerApproved && !m.isCompleted && (
                          <button onClick={() => approveByEmployer(m.id)} disabled={loading} className="btn-action btn-approve">
                            تایید کارفرما
                          </button>
                        )}
                        {m.employerApproved && !m.arbiterApproved && !m.isCompleted && (
                          <button onClick={() => callOracle(m.id)} disabled={loading} className="btn-action btn-oracle">
                            فراخوانی اوراکل
                          </button>
                        )}
                        {m.isCompleted && <span className="text-muted">—</span>}
                      </td>
                    </tr>
                  ))}
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
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
        
        // ========= بخش دیباگ =========
        const network = await provider.getNetwork();
        console.log("1. Network Chain ID:", network.chainId.toString());
        console.log("2. Target Address:", CONTRACT_ADDRESS);
        
        const code = await provider.getCode(CONTRACT_ADDRESS);
        console.log("3. Bytecode at address:", code);
        
        if (code === "0x") {
            alert("خطای بحرانی: متامسک در این شبکه هیچ قراردادی در این آدرس نمی‌‌بیند!");
            return; // توقف اجرای کد برای جلوگیری از خطای قرمز
        }
        // ============================

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
      // استفاده از یک API تستی بسیار پایدار که یک عدد صحیح (Integer) برمی‌گرداند
      const apiUrl = "https://jsonplaceholder.typicode.com/posts/1"; 
      const apiPath = "id"; // مقدار id در این لینک دقیقا عدد 1 است

      const tx = await contract.requestMilestoneStatus(id, apiUrl, apiPath);
      await tx.wait();
      alert("درخواست به اوراکل ارسال شد! تایید نهایی ممکن است ۱-۲ دقیقه زمان ببرد.");
      fetchMilestones(); 
    } catch (error) {
      alert("خطا در ارتباط با اوراکل رخ داد.");
    } finally {
      setLoading(false);
    }
  };

  const simulateOracle = async (id) => {
    try {
      setLoading(true);
      const tx = await contract.forceOracleApproval(id);
      await tx.wait();
      fetchMilestones(); 
    } catch (error) {
      alert("خطا در شبیه‌سازی اوراکل.");
    } finally {
      setLoading(false);
    }
  };

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
                    <th>
                      <div className="tooltip-container">
                        تایید کارفرما
                        <span className="tooltip-text">کارفرما (شما) پس از تحویل خروجی توسط پیمانکار، باید این تاییدیه را صادر کند تا یک امضا ثبت شود.</span>
                      </div>
                    </th>
                    <th>
                      <div className="tooltip-container">
                        تایید اوراکل
                        <span className="tooltip-text">اوراکل یک ناظر هوشمند (Chainlink) است که با بررسی یک منبع خارجی بی‌طرف (API) تایید دوم را به صورت خودکار صادر می‌کند.</span>
                      </div>
                    </th>
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
                        {m.employerApproved && !m.arbiterApproved && !m.isCompleted && (
                          <button onClick={() => simulateOracle(m.id)} disabled={loading} className="btn-action" style={{background: '#8b5cf6', color: 'white', marginLeft: '8px'}}>
                            بای‌پس تستی اوراکل
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
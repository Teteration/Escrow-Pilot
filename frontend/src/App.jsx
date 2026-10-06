import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import EscrowOracleJSON from './contracts/EscrowOracle.json';
import './App.css';

import contractAddressData from './contracts/contract-address.json';
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
        
        const escrowContract = new ethers.Contract(
          CONTRACT_ADDRESS,
          EscrowOracleJSON.abi,
          signer
        );

        setAccount(address);
        setContract(escrowContract);
      } catch (error) {
        console.error("خطا در اتصال به کیف پول:", error);
      }
    } else {
      alert("لطفاً افزونه MetaMask را نصب کنید.");
    }
  };

  // دریافت اطلاعات فازها از قرارداد
  const fetchMilestones = async () => {
    if (!contract) return;
    try {
      const count = await contract.milestoneCount();
      let loadedMilestones = [];
      
      for (let i = 1; i <= count; i++) {
        const m = await contract.milestones(i);
        loadedMilestones.push({
          id: i,
          amount: ethers.formatEther(m.amount), // تبدیل Wei به Ether برای نمایش
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

  // هر بار که قرارداد لود شد، فازها را هم بخوان
  useEffect(() => {
    if (contract) {
      fetchMilestones();
    }
  }, [contract]);

const createMilestone = async () => {
    if (!contract || !amount) return;
    try {
      setLoading(true);
      const amountInWei = ethers.parseEther(amount);
      
      // تغییر جدید: ارسال اتریوم به همراه تراکنش
      const tx = await contract.createMilestone(amountInWei, { value: amountInWei });
      
      await tx.wait();
      alert("فاز جدید ایجاد و بودجه با موفقیت قفل شد!");
      setAmount("");
      fetchMilestones(); 
    } catch (error) {
      console.error("خطا در ایجاد فاز:", error);
      alert("خطا! آیا موجودی اتریوم شما برای این رقم کافی است؟");
    } finally {
      setLoading(false);
    }
  };

  // تابع تایید کارفرما
  const approveByEmployer = async (id) => {
    try {
      setLoading(true);
      const tx = await contract.approveByEmployer(id);
      await tx.wait();
      alert("تایید شما در بلاکچین ثبت شد!");
      fetchMilestones(); // بروزرسانی جدول
    } catch (error) {
      console.error("خطا در تایید:", error);
      alert("خطا! آیا شما با آدرس کارفرما متصل هستید؟");
    } finally {
      setLoading(false);
    }
  };

// تابع فراخوانی اوراکل
  const callOracle = async (id) => {
    try {
      setLoading(true);
      // یک آدرس API تستی که نتیجه true (تایید) برمی‌گرداند
      const apiUrl = "https://api.npoint.io/ebb606af8e3a3c8dedb8"; 
      
      const tx = await contract.requestMilestoneStatus(id, apiUrl);
      await tx.wait();
      alert("درخواست به اوراکل ارسال شد! تایید نهایی ممکن است ۱-۲ دقیقه زمان ببرد.");
      fetchMilestones(); 
    } catch (error) {
      console.error("خطا در فراخوانی اوراکل:", error);
      alert("خطا! آیا قرارداد را با توکن LINK شارژ کرده‌اید؟");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <h1>سامانه تسویه امانی (Escrow Pilot)</h1>
      
      {!account ? (
        <button onClick={connectWallet} className="connect-btn">
          اتصال کیف پول
        </button>
      ) : (
        <div className="dashboard">
          <p className="success-text">✅ کیف پول متصل شد: {account}</p>
          <hr />
          
          <div className="action-card">
            <h3>تعریف فاز جدید پروژه</h3>
            <div className="input-group">
              <input 
                type="number" 
                placeholder="مبلغ (مثلا 0.01)" 
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                style={{ padding: '8px', marginRight: '10px' }}
              />
              <button onClick={createMilestone} disabled={loading} style={{ padding: '8px' }}>
                {loading ? "در حال پردازش..." : "ثبت در بلاکچین"}
              </button>
            </div>
          </div>

          <div className="action-card" style={{ marginTop: '20px' }}>
            <h3>وضعیت پروژه‌ها (Milestones)</h3>
            <button onClick={fetchMilestones} style={{ marginBottom: '10px', padding: '5px' }}>🔄 بروزرسانی جدول</button>
            
            <table style={{ width: '100%', textAlign: 'center', borderCollapse: 'collapse' }} border="1">
              <thead>
                <tr>
                  <th>شناسه فاز</th>
                  <th>مبلغ (Sepolia ETH)</th>
                  <th>تایید کارفرما</th>
                  <th>تایید اوراکل</th>
                  <th>تعداد امضا</th>
                  <th>وضعیت نهایی</th>
                  <th>عملیات</th>
                </tr>
              </thead>
              <tbody>
                {milestones.map((m) => (
                  <tr key={m.id}>
                    <td>{m.id}</td>
                    <td>{m.amount}</td>
                    <td>{m.employerApproved ? "✅ تایید شده" : "❌ منتظر تایید"}</td>
                    <td>{m.arbiterApproved ? "✅ تایید شده" : "❌ منتظر تایید"}</td>
                    <td>{m.approvalCount} / 2</td>
                    <td>{m.isCompleted ? "🎉 پرداخت شد" : "🔒 قفل شده"}</td>
                    <td>
                      {!m.employerApproved && !m.isCompleted && (
                        <button 
                          onClick={() => approveByEmployer(m.id)}
                          disabled={loading}
                          style={{ background: '#4CAF50', color: 'white', cursor: 'pointer' }}
                        >
                          تایید به عنوان کارفرما
                        </button>
                      )}
                    </td>
                    <td>
                      {!m.employerApproved && !m.isCompleted && (
                        <button onClick={() => approveByEmployer(m.id)} disabled={loading} style={{ background: '#4CAF50', color: 'white', cursor: 'pointer', marginBottom: '5px' }}>
                          تایید کارفرما
                        </button>
                      )}
                      {/* دکمه جدید برای اوراکل */}
                      {m.employerApproved && !m.arbiterApproved && !m.isCompleted && (
                        <button onClick={() => callOracle(m.id)} disabled={loading} style={{ background: '#2196F3', color: 'white', cursor: 'pointer' }}>
                          فراخوانی اوراکل (API)
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
        </div>
      )}
    </div>
  );
}

export default App;
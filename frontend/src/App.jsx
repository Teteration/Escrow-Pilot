import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ethers } from 'ethers';
import FactoryJSON from './contracts/EscrowFactory.json';
import EscrowJSON from './contracts/TrustEscrow.json';
import AddressJSON from './contracts/contract-address.json';
import './App.css';

function OracleInputs({ settings, onChange, prefix, disabled = false }) {
  return (
    <div className="oracle-inputs">
      <label htmlFor={`${prefix}-url`}>آدرس API (با HTTPS)</label>
      <input id={`${prefix}-url`} className="input-field" type="url" required disabled={disabled}
        value={settings.url} placeholder="https://example.com/project/status"
        onChange={e => onChange({ ...settings, url: e.target.value })} />
      <label htmlFor={`${prefix}-path`}>مسیر فیلد عددی در پاسخ</label>
      <input id={`${prefix}-path`} className="input-field" required disabled={disabled}
        value={settings.path} placeholder="status یا data,status"
        onChange={e => onChange({ ...settings, path: e.target.value })} />
      <p className="oracle-help">پاسخ باید عددی باشد: ۱ = رأی به تسویه، ۲ = رأی به بازپرداخت. پاسخ متنی پشتیبانی نمی‌شود.</p>
      <code dir="ltr">{'{"status": 1}'}</code>
    </div>
  );
}

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
  const [oracleDefaults, setOracleDefaults] = useState({ url: '', path: 'status' });
  const [oracleSettings, setOracleSettings] = useState({});
  const [oracleMessages, setOracleMessages] = useState({});

  const session = useRef(0);
  const connected = useRef(false);
  const connecting = useRef(false);
  const [walletBusy, setWalletBusy] = useState(false);
  const [walletError, setWalletError] = useState('');

  const resetWallet = useCallback(() => {
    session.current++;
    connected.current = false;
    setAccount(null);
    setFactoryContract(null);
    setEscrows([]);
    setOracleSettings({});
    setOracleMessages({});
    setFormError('');
    setNewContractor('');
    setNewArbiter('');
    setNewBudget('');
    setIsOracleMode(false);
    setOracleDefaults({ url: '', path: 'status' });
  }, []);

  const fetchEscrows = useCallback(async (factoryIns, provider) => {
    const generation = session.current;
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
        let oracleDecision = null;
        if (isOracle) {
          try {
            // Older deployed escrows do not expose the new Oracle vote getter.
            const voteReader = new ethers.Contract(address, ['function oracleDecision() view returns (uint8)'], provider);
            oracleDecision = Number(await voteReader.oracleDecision());
          } catch {
            oracleDecision = null;
          }
        }

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
          oracleDecision,
          signatures: { empRel, conRel, arbRel, empRef, conRef, arbRef }
        });
      }
      if (connected.current && generation === session.current) setEscrows(allEscrowData);
    } catch (error) {
      console.error("Fetch Error:", error);
    }
  }, []);

  const initializeWallet = useCallback(async (address) => {
    const generation = session.current;
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner(address);
    const signerAddress = await signer.getAddress();
    if (generation !== session.current) return;
    const factory = new ethers.Contract(AddressJSON.EscrowFactory, FactoryJSON.abi, signer);
    connected.current = true;
    setAccount(signerAddress);
    setFactoryContract(factory);
    await fetchEscrows(factory, provider);
  }, [fetchEscrows]);

  useEffect(() => {
    const wallet = window.ethereum;
    if (!wallet?.on) return;
    const onAccounts = async (accounts) => {
      if (connecting.current || !connected.current) return;
      resetWallet();
      if (!accounts.length) return;
      try {
        if (await wallet.request({ method: 'eth_chainId' }) === '0xaa36a7') {
          await initializeWallet(accounts[0]);
        }
      } catch {
        setWalletError('اتصال حساب جدید ناموفق بود؛ دوباره اتصال را بزنید.');
      }
    };
    const onChain = () => {
      if (connecting.current) return;
      resetWallet();
      setWalletError('شبکه تغییر کرد؛ برای اتصال روی Sepolia دوباره اتصال را بزنید.');
    };
    wallet.on('accountsChanged', onAccounts);
    wallet.on('chainChanged', onChain);
    wallet.on('disconnect', resetWallet);
    return () => {
      wallet.removeListener('accountsChanged', onAccounts);
      wallet.removeListener('chainChanged', onChain);
      wallet.removeListener('disconnect', resetWallet);
    };
  }, [initializeWallet, resetWallet]);

  const connectWallet = async (chooseAccount = false) => {
    if (connecting.current) return;
    if (!window.ethereum) {
      setWalletError('کیف پول نصب نیست یا در دسترس نیست.');
      return;
    }
    connecting.current = true;
    setWalletBusy(true);
    setWalletError('');
    resetWallet();
    try {
      if (chooseAccount) {
        await window.ethereum.request({ method: 'wallet_requestPermissions', params: [{ eth_accounts: {} }] });
      }
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0xaa36a7' }] });
      if (!accounts.length) throw new Error('No account selected');
      await initializeWallet(accounts[0]);
    } catch (error) {
      resetWallet();
      setWalletError(error.code === 4001 ? 'درخواست اتصال یا انتخاب حساب رد شد.' : error.code === -32002 ? 'یک درخواست در کیف پول باز است؛ آن را تکمیل کنید.' : 'اتصال ناموفق بود. حساب موردنظر را در کیف پول انتخاب کنید و دوباره تلاش کنید.');
    } finally {
      connecting.current = false;
      setWalletBusy(false);
    }
  };

  const disconnectWallet = async () => {
    resetWallet();
    setWalletError('');
    setWalletBusy(true);
    try {
      await window.ethereum.request({ method: 'wallet_revokePermissions', params: [{ eth_accounts: {} }] });
    } catch {
      setWalletError('اتصال برنامه قطع شد؛ کیف پول لغو مجوز را نپذیرفت. مجوز سایت ممکن است در کیف پول باقی مانده باشد.');
    } finally {
      setWalletBusy(false);
    }
  };

  const createNewEscrow = async (e) => {
    e.preventDefault();
    if (!factoryContract) return;
    if (isOracleMode && !validateOracleSettings(oracleDefaults)) {
      setFormError('آدرس HTTPS معتبر و مسیر فیلد پاسخ را وارد کنید.');
      return;
    }

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

      const receipt = await tx.wait();
      if (isOracleMode) {
        for (const log of receipt.logs) {
          try {
            const event = factoryContract.interface.parseLog(log);
            if (event?.name === 'EscrowCreated') {
              setOracleSettings(previous => ({ ...previous, [event.args.escrowAddress]: { ...oracleDefaults } }));
            }
          } catch { /* Ignore logs from other contracts. */ }
        }
      }
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

  const validateOracleSettings = (settings) => {
    try {
      const url = new URL(settings.url.trim());
      return url.protocol === 'https:' && !url.username && !url.password && settings.path.trim().length > 0;
    } catch {
      return false;
    }
  };

  const requestOracle = async (e, escrow) => {
    e.preventDefault();
    const settings = oracleSettings[escrow.address] || { url: '', path: 'status' };
    const report = message => setOracleMessages(previous => ({ ...previous, [escrow.address]: message }));
    if (!validateOracleSettings(settings)) {
      report('آدرس HTTPS معتبر و مسیر فیلد پاسخ را وارد کنید.');
      return;
    }
    try {
      setLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(escrow.address, EscrowJSON.abi, signer);
      report('منتظر تأیید کیف پول…');
      const tx = await contract.requestOracleDecision(settings.url.trim(), settings.path.trim());
      report(`در انتظار ثبت تراکنش: ${tx.hash}`);
      await tx.wait();
      report(`درخواست ثبت شد؛ دریافت پاسخ هنوز تأیید نشده است. برای بررسی، وضعیت را تازه کنید. تراکنش: ${tx.hash}`);
      await fetchEscrows(factoryContract, provider);
    } catch (error) {
      report(error.code === 'ACTION_REJECTED' ? 'تراکنش توسط شما رد شد.' : `ارسال ناموفق: ${error.reason || error.shortMessage || error.message}`);
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

  // تشخیص هوشمند نقش کاربر متصل به کیف پول در هر پروژه
  const getUserRoleInProject = (m) => {
    if (!account) return null;
    const currentAcc = account.toLowerCase();
    if (m.employer.toLowerCase() === currentAcc) return "کارفرما (Employer)";
    if (m.contractor.toLowerCase() === currentAcc) return "پیمانکار (Contractor)";
    if (!m.isOracle && m.arbiter.toLowerCase() === currentAcc) return "ناظر (Arbiter)";
    return "ناظر/مشاهده‌گر";
  };

  const SignaturesDisplay = ({ sigs, type, isOracle, oracleDecision }) => {
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
           <span className={`signer-tag ${oracleDecision === (isRel ? 1 : 2) ? 'yes' : 'oracle'}`}>
             اوراکل {oracleDecision === null ? 'نامشخص' : oracleDecision === (isRel ? 1 : 2) ? '✅' : '⏳'}
           </span>
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
        <div className="brand"><h1 className="logo" dir="ltr">TrustDApp</h1><span className="brand-subtitle">مدیریت امن قراردادهای امانی</span></div>
        {account ? (
          <div className="wallet-controls">
            <a className="wallet-btn connected" href={`https://sepolia.etherscan.io/address/${account}`} target="_blank" rel="noopener noreferrer" title="مشاهده کیف پول در اتر‌اسکن"><span className="connection-dot" aria-hidden="true" />متصل: <bdi title={account}>{formatAddress(account)}</bdi></a>
            <button className="wallet-btn" disabled={loading || walletBusy} onClick={() => connectWallet(true)}>انتخاب حساب دیگر</button>
            <button className="wallet-btn wallet-disconnect" disabled={loading || walletBusy} onClick={disconnectWallet}>قطع اتصال</button>
          </div>
        ) : (
          <div className="wallet-controls">
            <button className="wallet-btn" disabled={walletBusy || loading} onClick={() => connectWallet()}>اتصال به کیف پول</button>
            <button className="wallet-btn" disabled={walletBusy || loading} onClick={() => connectWallet(true)}>اتصال با حساب دیگر</button>
          </div>
        )}
      </header>
      {walletBusy && <p role="status">منتظر پاسخ کیف پول…</p>}
      {walletError && <p className="wallet-error" role="alert">{walletError}</p>}

      <div className="network-strip"><span className="network-label">شبکهٔ آزمایشی <bdi>Sepolia</bdi></span><a href={`https://sepolia.etherscan.io/address/${AddressJSON.EscrowFactory}`} target="_blank" rel="noopener noreferrer">مشاهدهٔ کارخانهٔ قراردادها ↗</a><span>توکن TRUST مستقل از این برنامه است</span></div>
      {!account && <section className="welcome-card"><span className="eyebrow">قراردادهای امانی روی بلاکچین</span><h2>همکاری با شفافیت، پرداخت با توافق</h2><p>کیف پول سازگار با اتریوم را متصل کنید تا قرارداد بسازید، رأی بدهید و وضعیت پرداخت‌ها را بررسی کنید.</p><button className="submit-btn" disabled={walletBusy} onClick={() => connectWallet()}>اتصال به کیف پول</button><p className="oracle-help">این نسخه آزمایشی است؛ از دارایی شبکهٔ اصلی استفاده نکنید.</p></section>}
      {account && (
        <main>
          <section className="overview-grid" aria-label="خلاصهٔ قراردادهای کارخانه">
            <div className="stat-card"><span>کل قراردادها</span><strong>{escrows.length.toLocaleString('fa-IR')}</strong><small>در کارخانهٔ فعلی؛ همهٔ کاربران</small></div>
            <div className="stat-card"><span>قراردادهای فعال</span><strong>{escrows.filter(item => item.state === 0).length.toLocaleString('fa-IR')}</strong><small>در انتظار تصمیم طرفین</small></div>
            <div className="stat-card"><span>تسویه‌شده</span><strong>{escrows.filter(item => item.state === 1).length.toLocaleString('fa-IR')}</strong><small>پرداخت به پیمانکار</small></div>
            <div className="stat-card"><span>بودجهٔ قراردادهای فعال</span><strong dir="ltr">{ethers.formatEther(escrows.filter(item => item.state === 0).reduce((total, item) => total + ethers.parseEther(item.budget), 0n))} ETH</strong><small>بودجهٔ ثبت‌شده؛ نه موجودی لحظه‌ای</small></div>
          </section>
          <div className="workspace-grid">
          <section className="card create-card">
            <h3 className="card-title">تعریف قرارداد جدید</h3>
            <form className="escrow-form" onSubmit={createNewEscrow}>
              <label htmlFor="contractor">آدرس پیمانکار</label><input id="contractor" className="input-field" type="text" placeholder="0x…"
                value={newContractor} onChange={e => setNewContractor(e.target.value)} required />

              <input className="input-field" type="text"
                placeholder={isOracleMode ? "توسط شبکه اوراکل مدیریت می‌شود" : "آدرس کیف پول ناظر (Arbiter)"}
                value={isOracleMode ? "" : newArbiter}
                onChange={e => setNewArbiter(e.target.value)}
                disabled={isOracleMode} required={!isOracleMode} />

              <label htmlFor="budget">بودجهٔ پروژه (ETH)</label><input id="budget" className="input-field" type="number" step="any" min="0" placeholder="0.01"
                value={newBudget} onChange={e => setNewBudget(e.target.value)} required />

              <label className="checkbox-group">
                <input type="checkbox" checked={isOracleMode} onChange={e => setIsOracleMode(e.target.checked)} />
                داوری اتوماتیک (Oracle API) - فیلد ناظر دستی غیرفعال می‌شود
              </label>

              {isOracleMode && (
                <div className="oracle-panel">
                  <OracleInputs settings={oracleDefaults} onChange={setOracleDefaults} prefix="new-oracle" disabled={loading} />
                  <p className="oracle-help">این تنظیمات فقط برای درخواست بعدی در همین صفحه نگه داشته می‌شوند؛ در قرارداد ذخیره نمی‌شوند و با بارگذاری مجدد صفحه از بین می‌روند. ایجاد پروژه درخواست اوراکل ارسال نمی‌کند.</p>
                  <p className="oracle-warning">سرویس قدیمی اوراکل آزمایشی است و پاسخ تضمین نمی‌شود. هر درخواست به ۰٫۱ LINK در خود escrow نیاز دارد و هزینهٔ تراکنش جداست. منبع API توسط قرارداد تأیید نمی‌شود؛ از آدرس دارای کلید یا اطلاعات محرمانه استفاده نکنید.</p>
                </div>
              )}

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

          <section className="card projects-card">
            <h3 className="card-title">داشبورد پروژه‌ها</h3><p className="section-description">جزئیات قرارداد، رأی‌ها و عملیات؛ همهٔ قراردادهای کارخانه نمایش داده می‌شوند.</p>
            <button className="btn-action btn-oracle" disabled={loading} onClick={() => fetchEscrows(factoryContract, new ethers.BrowserProvider(window.ethereum))}>تازه‌سازی وضعیت</button>
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
                  {escrows.map((m) => (
                    <tr key={m.address}>
                      <td data-label="قرارداد"><a className="address-cell" href={`https://sepolia.etherscan.io/address/${m.address}`} target="_blank" rel="noopener noreferrer" title={m.address}>{formatAddress(m.address)} ↗</a><details className="contract-details"><summary>جزئیات طرفین</summary><dl>{[['کارفرما', m.employer], ['پیمانکار', m.contractor], ...(!m.isOracle ? [['ناظر', m.arbiter]] : [])].map(([role, address]) => <div key={role}><dt>{role}</dt><dd><a href={`https://sepolia.etherscan.io/address/${address}`} target="_blank" rel="noopener noreferrer"><bdi title={address}>{formatAddress(address)}</bdi> ↗</a></dd></div>)}</dl></details><span className="mode-label">{m.isOracle ? 'اوراکل · آزمایشی' : 'داوری دستی'}</span></td>
                      <td data-label="بودجه"><span className="budget-val">{m.budget} ETH</span></td>
                      <td data-label="نقش شما"><span style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: 'bold' }}>{getUserRoleInProject(m)}</span></td>
                      <td data-label="وضعیت">
                        {m.state === 0 && <span className="status-badge status-0">در جریان</span>}
                        {m.state === 1 && <span className="status-badge status-1">تسویه شده</span>}
                        {m.state === 2 && <span className="status-badge status-2">لغو شده</span>}
                      </td>
                      <td data-label="رأی تسویه"><SignaturesDisplay sigs={m.signatures} type="release" isOracle={m.isOracle} oracleDecision={m.oracleDecision} /></td>
                      <td data-label="رأی بازپرداخت"><SignaturesDisplay sigs={m.signatures} type="refund" isOracle={m.isOracle} oracleDecision={m.oracleDecision} /></td>
                      <td data-label="عملیات">
                        <div className="action-btns">
                          {m.state === 0 && (
                            <>
                              <button className="btn-action btn-release" onClick={() => handleAction(m.address, 'release')} disabled={loading || ![m.employer, m.contractor, ...(!m.isOracle ? [m.arbiter] : [])].some(address => address.toLowerCase() === account.toLowerCase())}>تأیید تسویه</button>
                              <button className="btn-action btn-refund" onClick={() => handleAction(m.address, 'refund')} disabled={loading || ![m.employer, m.contractor, ...(!m.isOracle ? [m.arbiter] : [])].some(address => address.toLowerCase() === account.toLowerCase())}>تأیید بازپرداخت</button>
                            </>
                          )}
                        </div>
                        {m.isOracle && (
                          <div className="oracle-panel">
                            <p className="oracle-help">{m.oracleDecision === null ? 'نسخهٔ قرارداد قدیمی است یا وضعیت رأی قابل خواندن نیست؛ منطق دو رأی جدید را فرض نکنید.' : m.oracleDecision === 0 ? 'هنوز رأی اوراکل ثبت نشده است.' : m.oracleDecision === 1 ? 'رأی اوراکل: تسویه' : 'رأی اوراکل: بازپرداخت'}</p>
                            {m.state === 0 && !m.oracleDecision && [m.employer, m.contractor].some(address => address.toLowerCase() === account.toLowerCase()) && (
                              <form onSubmit={e => requestOracle(e, m)}>
                                <OracleInputs settings={oracleSettings[m.address] || { url: '', path: 'status' }} prefix={m.address} disabled={loading}
                                  onChange={settings => setOracleSettings(previous => ({ ...previous, [m.address]: settings }))} />
                                <p className="oracle-warning">هر ارسال ۰٫۱ LINK از این escrow مصرف می‌کند. پاسخ نود تضمین نیست. API عمومی و مورد توافق طرفین باشد؛ درخواست ثبت‌شده به معنی دریافت پاسخ نیست.</p>
                                <button className="btn-action btn-oracle" type="submit" disabled={loading}>ارسال درخواست اوراکل</button>
                              </form>
                            )}
                            {oracleMessages[m.address] && <p className="oracle-message" role="status">{oracleMessages[m.address]}</p>}
                          </div>
                        )}
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
          </div>
        </main>
      )}
    </div>
  );
}

export default App;

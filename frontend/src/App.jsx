import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ethers } from 'ethers';
import FactoryJSON from './contracts/EscrowFactory.json';
import EscrowJSON from './contracts/TrustEscrow.json';
import AddressJSON from './contracts/contract-address.json';
import { LanguageProvider } from './i18n.jsx';
import { useLanguage } from './useLanguage.js';
import './App.css';

function OracleInputs({ settings, onChange, prefix, disabled = false }) {
  const { t } = useLanguage();
  return (
    <div className="oracle-inputs">
      <label htmlFor={`${prefix}-url`}>{t("آدرس API (با HTTPS)")}</label>
      <input id={`${prefix}-url`} className="input-field" type="url" required disabled={disabled}
        aria-describedby={`${prefix}-help`} value={settings.url} placeholder="https://example.com/project/status"
        onChange={e => onChange({ ...settings, url: e.target.value })} />
      <label htmlFor={`${prefix}-path`}>{t("مسیر فیلد عددی در پاسخ")}</label>
      <input id={`${prefix}-path`} className="input-field" required disabled={disabled}
        aria-describedby={`${prefix}-help`} value={settings.path} placeholder={t("status یا data,status")}
        onChange={e => onChange({ ...settings, path: e.target.value })} />
      <p id={`${prefix}-help`} className="oracle-help">{t("پاسخ باید عددی باشد: ۱ = رأی به تسویه، ۲ = رأی به بازپرداخت. پاسخ متنی پشتیبانی نمی‌شود.")}</p>
      <code dir="ltr">{'{"status": 1}'}</code>
    </div>
  );
}

function App() {
  const { language, setLanguage, t, locale } = useLanguage();
  const [account, setAccount] = useState(null);
  const [factoryContract, setFactoryContract] = useState(null);
  const [escrows, setEscrows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [readBusy, setReadBusy] = useState(false);
  const [readError, setReadError] = useState('');
  const [transaction, setTransaction] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
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
    setTransaction(null);
    setReadError('');
    setReadBusy(false);
    setSearch('');
    setStatusFilter('all');
    setNewContractor('');
    setNewArbiter('');
    setNewBudget('');
    setIsOracleMode(false);
    setOracleDefaults({ url: '', path: 'status' });
  }, []);

  const fetchEscrows = useCallback(async (factoryIns, provider) => {
    const generation = session.current;
    setReadBusy(true);
    setReadError('');
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
      if (generation === session.current) setReadError('خواندن قراردادها ناموفق بود؛ دوباره تلاش کنید.');
    } finally {
      if (generation === session.current) setReadBusy(false);
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
        setWalletError("اتصال حساب جدید ناموفق بود؛ دوباره اتصال را بزنید.");
      }
    };
    const onChain = () => {
      if (connecting.current) return;
      resetWallet();
      setWalletError("شبکه تغییر کرد؛ برای اتصال روی Sepolia دوباره اتصال را بزنید.");
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
      setWalletError("کیف پول نصب نیست یا در دسترس نیست.");
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
      setWalletError(error.code === 4001 ? "درخواست اتصال یا انتخاب حساب رد شد." : error.code === -32002 ? "یک درخواست در کیف پول باز است؛ آن را تکمیل کنید." : "اتصال ناموفق بود. حساب موردنظر را در کیف پول انتخاب کنید و دوباره تلاش کنید.");
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
      setWalletError("اتصال برنامه قطع شد؛ کیف پول لغو مجوز را نپذیرفت. مجوز سایت ممکن است در کیف پول باقی مانده باشد.");
    } finally {
      setWalletBusy(false);
    }
  };

  const createNewEscrow = async (e) => {
    e.preventDefault();
    if (!factoryContract) return;
    if (isOracleMode && !validateOracleSettings(oracleDefaults)) {
      setFormError("آدرس HTTPS معتبر و مسیر فیلد پاسخ را وارد کنید.");
      return;
    }

    setFormError(''); // پاک کردن خطای قبلی

    // بررسی‌های اولیه فرانت‌اند برای تجربه کاربری بهتر
    if (!isOracleMode && newArbiter.toLowerCase() === account.toLowerCase()) {
      setFormError("خطا: آدرس ناظر نمی‌تواند با آدرس کارفرما (خود شما) یکسان باشد.");
      return;
    }

    try {
      setLoading(true);
      setTransaction({ stage: 'pending', message: 'منتظر تأیید کیف پول…' });
      const amountInWei = ethers.parseEther(newBudget.toString());
      const finalArbiter = isOracleMode ? ethers.ZeroAddress : newArbiter;

      const tx = await factoryContract.createEscrow(
        newContractor, finalArbiter, isOracleMode, { value: amountInWei }
      );

      setTransaction({ stage: 'pending', message: 'تراکنش ارسال شد؛ منتظر تأیید شبکه…', hash: tx.hash });
      const receipt = await tx.wait();
      setTransaction({ stage: 'success', message: 'قرارداد جدید در شبکه ثبت شد.', hash: tx.hash });
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
      setTransaction({ stage: 'error', message: error.code === 'ACTION_REJECTED' ? 'تراکنش توسط شما رد شد.' : msg });
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
      report("آدرس HTTPS معتبر و مسیر فیلد پاسخ را وارد کنید.");
      return;
    }
    try {
      setLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(escrow.address, EscrowJSON.abi, signer);
      report("منتظر تأیید کیف پول…");
      const tx = await contract.requestOracleDecision(settings.url.trim(), settings.path.trim());
      report(`در انتظار ثبت تراکنش: ${tx.hash}`);
      await tx.wait();
      report(`درخواست ثبت شد؛ دریافت پاسخ هنوز تأیید نشده است. برای بررسی، وضعیت را تازه کنید. تراکنش: ${tx.hash}`);
      await fetchEscrows(factoryContract, provider);
    } catch (error) {
      report(error.code === 'ACTION_REJECTED' ? "تراکنش توسط شما رد شد." : `ارسال ناموفق: ${error.reason || error.shortMessage || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (escrowAddress, actionType) => {
    try {
      setLoading(true);
      setTransaction({ stage: 'pending', message: 'منتظر تأیید کیف پول…' });
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const escrowContract = new ethers.Contract(escrowAddress, EscrowJSON.abi, signer);

      let tx = actionType === 'release'
        ? await escrowContract.approveRelease()
        : await escrowContract.approveRefund();

      setTransaction({ stage: 'pending', message: 'تراکنش ارسال شد؛ منتظر تأیید شبکه…', hash: tx.hash });
      await tx.wait();
      setTransaction({ stage: 'success', message: 'رأی شما در شبکه ثبت شد.', hash: tx.hash });
      await fetchEscrows(factoryContract, provider);
    } catch (error) {
      console.error("Action Error:", error);
      setTransaction({ stage: 'error', message: error.code === 'ACTION_REJECTED' ? 'تراکنش توسط شما رد شد.' : `ارسال ناموفق: ${error.reason || error.shortMessage || error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (addr) => `${addr.substring(0, 6)}...${addr.substring(38)}`;

  // تشخیص هوشمند نقش کاربر متصل به کیف پول در هر پروژه
  const getUserRoleInProject = (m) => {
    if (!account) return null;
    const currentAcc = account.toLowerCase();
    if (m.employer.toLowerCase() === currentAcc) return t("کارفرما (Employer)");
    if (m.contractor.toLowerCase() === currentAcc) return t("پیمانکار (Contractor)");
    if (!m.isOracle && m.arbiter.toLowerCase() === currentAcc) return t("ناظر (Arbiter)");
    return t("ناظر/مشاهده‌گر");
  };

  const SignaturesDisplay = ({ sigs, type, isOracle, oracleDecision }) => {
    const isRel = type === 'release';
    return (
      <div className="signers-box">
        <span className={`signer-tag ${ (isRel ? sigs.empRel : sigs.empRef) ? 'yes' : 'no' }`}>
          {t("کارفرما")} {(isRel ? sigs.empRel : sigs.empRef) ? '✅' : '⏳'}
        </span>
        <span className={`signer-tag ${ (isRel ? sigs.conRel : sigs.conRef) ? 'yes' : 'no' }`}>
          {t("پیمانکار")} {(isRel ? sigs.conRel : sigs.conRef) ? '✅' : '⏳'}
        </span>
        {isOracle ? (
           <span className={`signer-tag ${oracleDecision === (isRel ? 1 : 2) ? 'yes' : 'oracle'}`}>
             {t("اوراکل")} {oracleDecision === null ? t("نامشخص") : oracleDecision === (isRel ? 1 : 2) ? '✅' : '⏳'}
           </span>
        ) : (
           <span className={`signer-tag ${ (isRel ? sigs.arbRel : sigs.arbRef) ? 'yes' : 'no' }`}>
             {t("ناظر")} {(isRel ? sigs.arbRel : sigs.arbRef) ? '✅' : '⏳'}
           </span>
        )}
      </div>
    );
  };

  const visibleEscrows = escrows.filter(item =>
    (statusFilter === 'all' || item.state === Number(statusFilter)) &&
    [item.address, item.employer, item.contractor, item.arbiter].some(address => address.toLowerCase().includes(search.trim().toLowerCase()))
  );

  return (
    <div className="app-container" dir={language === 'fa' ? 'rtl' : 'ltr'}>
      <a className="skip-link" href="#main-content">{t("رفتن به محتوای اصلی")}</a>
      <header className="top-header">
        <div className="brand"><h1 className="logo" dir="ltr">TrustDApp</h1><span className="brand-subtitle">{t("مدیریت امن قراردادهای امانی")}</span></div>
        <label className="language-control">
          <span>{t("زبان")}</span>
          <select aria-label={t("زبان")} value={language} onChange={event => setLanguage(event.target.value)}>
            <option value="fa">فارسی</option>
            <option value="en">English</option>
          </select>
        </label>
        {account ? (
          <div className="wallet-controls">
            <a className="wallet-btn connected" href={`https://sepolia.etherscan.io/address/${account}`} target="_blank" rel="noopener noreferrer" title={t("مشاهده کیف پول در اتر‌اسکن")}><span className="connection-dot" aria-hidden="true" />{t("متصل: ")}<bdi title={account}>{formatAddress(account)}</bdi></a>
            <button className="wallet-btn" disabled={loading || walletBusy} onClick={() => connectWallet(true)}>{t("انتخاب حساب دیگر")}</button>
            <button className="wallet-btn wallet-disconnect" disabled={loading || walletBusy} onClick={disconnectWallet}>{t("قطع اتصال")}</button>
          </div>
        ) : (
          <div className="wallet-controls">
            <button className="wallet-btn" disabled={walletBusy || loading} onClick={() => connectWallet()}>{t("اتصال به کیف پول")}</button>
            <button className="wallet-btn" disabled={walletBusy || loading} onClick={() => connectWallet(true)}>{t("اتصال با حساب دیگر")}</button>
          </div>
        )}
      </header>
      {walletBusy && <p role="status">{t("منتظر پاسخ کیف پول…")}</p>}
      {walletError && <p className="wallet-error" role="alert">{t(walletError)}</p>}

      <div className="network-strip"><span className="network-label">{t("شبکهٔ آزمایشی ")}<bdi>Sepolia</bdi></span><a href={`https://sepolia.etherscan.io/address/${AddressJSON.EscrowFactory}`} target="_blank" rel="noopener noreferrer">{t("مشاهدهٔ کارخانهٔ قراردادها ↗")}</a><span>{t("توکن TRUST مستقل از این برنامه است")}</span></div>
      {!account && <section id="main-content" tabIndex="-1" className="welcome-card"><span className="eyebrow">{t("قراردادهای امانی روی بلاکچین")}</span><h2>{t("همکاری با شفافیت، پرداخت با توافق")}</h2><p>{t("کیف پول سازگار با اتریوم را متصل کنید تا قرارداد بسازید، رأی بدهید و وضعیت پرداخت‌ها را بررسی کنید.")}</p><button className="submit-btn" disabled={walletBusy} onClick={() => connectWallet()}>{t("اتصال به کیف پول")}</button><p className="oracle-help">{t("این نسخه آزمایشی است؛ از دارایی شبکهٔ اصلی استفاده نکنید.")}</p></section>}
      {account && (
        <main id="main-content" tabIndex="-1">
          <div className="dashboard-heading"><div><span className="eyebrow">{t("فضای کاری شما")}</span><h2>{t("داشبورد پروژه‌ها")}</h2><p>{t("مدیریت وجوه، تصمیم‌های شفاف")}</p></div><span className="pilot-badge">{t("نسخهٔ آزمایشی · Sepolia")}</span></div>
          {transaction && <div className={`transaction-notice ${transaction.stage}`} role={transaction.stage === 'error' ? 'alert' : 'status'}><div><strong>{t(transaction.message)}</strong>{transaction.hash && <a href={`https://sepolia.etherscan.io/tx/${transaction.hash}`} target="_blank" rel="noopener noreferrer">{t("مشاهدهٔ تراکنش ↗")}</a>}</div>{!loading && <button className="notice-close" type="button" aria-label={t("بستن پیام")} onClick={() => setTransaction(null)}>×</button>}</div>}
          <section className="overview-grid" aria-label={t("خلاصهٔ قراردادهای کارخانه")}>
            <div className="stat-card"><span>{t("کل قراردادها")}</span><strong>{escrows.length.toLocaleString(locale)}</strong><small>{t("در کارخانهٔ فعلی؛ همهٔ کاربران")}</small></div>
            <div className="stat-card"><span>{t("قراردادهای فعال")}</span><strong>{escrows.filter(item => item.state === 0).length.toLocaleString(locale)}</strong><small>{t("در انتظار تصمیم طرفین")}</small></div>
            <div className="stat-card"><span>{t("تسویه‌شده")}</span><strong>{escrows.filter(item => item.state === 1).length.toLocaleString(locale)}</strong><small>{t("پرداخت به پیمانکار")}</small></div>
            <div className="stat-card"><span>{t("بودجهٔ قراردادهای فعال")}</span><strong dir="ltr">{ethers.formatEther(escrows.filter(item => item.state === 0).reduce((total, item) => total + ethers.parseEther(item.budget), 0n))} ETH</strong><small>{t("بودجهٔ ثبت‌شده؛ نه موجودی لحظه‌ای")}</small></div>
          </section>
          <div className="workspace-grid">
          <section className="card create-card">
            <h2 className="card-title">{t("تعریف قرارداد جدید")}</h2>
            <p className="section-description">{t("بودجه در قرارداد قفل می‌شود؛ تصمیم نهایی به دو رأی موافق نیاز دارد.")}</p>
            <form className="escrow-form" aria-busy={loading} onSubmit={createNewEscrow}>
              <label htmlFor="contractor">{t("آدرس پیمانکار")}</label><input id="contractor" className="input-field" type="text" placeholder="0x…"
                aria-describedby={formError ? "create-error" : undefined} value={newContractor} onChange={e => { setNewContractor(e.target.value); setFormError(''); }} required />

              <label htmlFor="arbiter">{t("آدرس ناظر")}</label><input id="arbiter" className="input-field" type="text"
                placeholder={isOracleMode ? t("توسط شبکه اوراکل مدیریت می‌شود") : t("آدرس کیف پول ناظر (Arbiter)")}
                value={isOracleMode ? "" : newArbiter}
                aria-describedby={formError ? "create-error" : undefined} onChange={e => { setNewArbiter(e.target.value); setFormError(''); }}
                disabled={isOracleMode} required={!isOracleMode} />

              <label htmlFor="budget">{t("بودجهٔ پروژه (ETH)")}</label><input id="budget" className="input-field" type="number" step="any" min="0" placeholder="0.01"
                aria-describedby={formError ? "create-error" : undefined} value={newBudget} onChange={e => { setNewBudget(e.target.value); setFormError(''); }} required />

              <label className="checkbox-group">
                <input type="checkbox" checked={isOracleMode} onChange={e => setIsOracleMode(e.target.checked)} />
                {t("داوری اتوماتیک (Oracle API) - فیلد ناظر دستی غیرفعال می‌شود")}
              </label>

              {isOracleMode && (
                <div className="oracle-panel">
                  <OracleInputs settings={oracleDefaults} onChange={setOracleDefaults} prefix="new-oracle" disabled={loading} />
                  <p className="oracle-help">{t("این تنظیمات فقط برای درخواست بعدی در همین صفحه نگه داشته می‌شوند؛ در قرارداد ذخیره نمی‌شوند و با بارگذاری مجدد صفحه از بین می‌روند. ایجاد پروژه درخواست اوراکل ارسال نمی‌کند.")}</p>
                  <p className="oracle-warning">{t("سرویس قدیمی اوراکل آزمایشی است و پاسخ تضمین نمی‌شود. هر درخواست به ۰٫۱ LINK در خود escrow نیاز دارد و هزینهٔ تراکنش جداست. منبع API توسط قرارداد تأیید نمی‌شود؛ از آدرس دارای کلید یا اطلاعات محرمانه استفاده نکنید.")}</p>
                </div>
              )}

              {formError && (
                <div id="create-error" className="wallet-error" role="alert">
                  {t(formError)}
                </div>
              )}

              <button className="submit-btn" type="submit" disabled={loading}>
                {loading ? t("در حال پردازش...") : t("ایجاد قرارداد")}
              </button>
            </form>
          </section>

          <section className="card projects-card">
            <h2 className="card-title">{t("داشبورد پروژه‌ها")}</h2><p className="section-description">{t("جزئیات قرارداد، رأی‌ها و عملیات؛ همهٔ قراردادهای کارخانه نمایش داده می‌شوند.")}</p>
            <button className="btn-action btn-oracle" disabled={loading || readBusy} onClick={() => fetchEscrows(factoryContract, new ethers.BrowserProvider(window.ethereum))}>{t("تازه‌سازی وضعیت")}</button>
            <div className="project-toolbar">
              <label className="search-control"><span>{t("جست‌وجوی آدرس")}</span><input className="input-field" type="search" placeholder="0x…" value={search} onChange={event => setSearch(event.target.value)} /></label>
              <label className="filter-control"><span>{t("وضعیت")}</span><select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="all">{t("همهٔ وضعیت‌ها")}</option><option value="0">{t("در جریان")}</option><option value="1">{t("تسویه شده")}</option><option value="2">{t("لغو شده")}</option></select></label>
            </div>
            {readBusy && <p className="read-status" role="status">{t("در حال خواندن اطلاعات شبکه…")}</p>}
            {readError && <p className="wallet-error" role="alert">{t(readError)}</p>}
            <div className="table-wrapper" aria-busy={readBusy}>
              <table className="escrow-table"><caption className="sr-only">{t("جزئیات قرارداد، رأی‌ها و عملیات؛ همهٔ قراردادهای کارخانه نمایش داده می‌شوند.")}</caption>
                <thead>
                  <tr>
                    <th scope="col">{t("قرارداد")}</th>
                    <th scope="col">{t("مبلغ")}</th>
                    <th scope="col">{t("نقش شما")}</th>
                    <th scope="col">{t("وضعیت")}</th>
                    <th scope="col">{t("وضعیت تسویه")}</th>
                    <th scope="col">{t("وضعیت لغو")}</th>
                    <th scope="col">{t("عملیات")}</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleEscrows.map((m) => (
                    <tr key={m.address}>
                      <td data-label={t("قرارداد")}><a className="address-cell" href={`https://sepolia.etherscan.io/address/${m.address}`} target="_blank" rel="noopener noreferrer" title={m.address}>{formatAddress(m.address)} ↗</a><details className="contract-details"><summary>{t("جزئیات طرفین")}</summary><dl>{[[t("کارفرما"), m.employer], [t("پیمانکار"), m.contractor], ...(!m.isOracle ? [[t("ناظر"), m.arbiter]] : [])].map(([role, address]) => <div key={role}><dt>{role}</dt><dd><a href={`https://sepolia.etherscan.io/address/${address}`} target="_blank" rel="noopener noreferrer"><bdi title={address}>{formatAddress(address)}</bdi> ↗</a></dd></div>)}</dl></details><span className="mode-label">{m.isOracle ? t("اوراکل · آزمایشی") : t("داوری دستی")}</span></td>
                      <td data-label={t("بودجه")}><span className="budget-val">{m.budget} ETH</span></td>
                      <td data-label={t("نقش شما")}><span style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: 'bold' }}>{getUserRoleInProject(m)}</span></td>
                      <td data-label={t("وضعیت")}>
                        {m.state === 0 && <span className="status-badge status-0">{t("در جریان")}</span>}
                        {m.state === 1 && <span className="status-badge status-1">{t("تسویه شده")}</span>}
                        {m.state === 2 && <span className="status-badge status-2">{t("لغو شده")}</span>}
                      </td>
                      <td data-label={t("رأی تسویه")}><SignaturesDisplay sigs={m.signatures} type="release" isOracle={m.isOracle} oracleDecision={m.oracleDecision} /></td>
                      <td data-label={t("رأی بازپرداخت")}><SignaturesDisplay sigs={m.signatures} type="refund" isOracle={m.isOracle} oracleDecision={m.oracleDecision} /></td>
                      <td data-label={t("عملیات")}>
                        <div className="action-btns">
                          {m.state === 0 && (
                            <>
                              <button className="btn-action btn-release" onClick={() => handleAction(m.address, 'release')} disabled={loading || ![m.employer, m.contractor, ...(!m.isOracle ? [m.arbiter] : [])].some(address => address.toLowerCase() === account.toLowerCase())}>{t("تأیید تسویه")}</button>
                              <button className="btn-action btn-refund" onClick={() => handleAction(m.address, 'refund')} disabled={loading || ![m.employer, m.contractor, ...(!m.isOracle ? [m.arbiter] : [])].some(address => address.toLowerCase() === account.toLowerCase())}>{t("تأیید بازپرداخت")}</button>
                            </>
                          )}
                        </div>
                        {m.isOracle && (
                          <div className="oracle-panel">
                            <p className="oracle-help">{m.oracleDecision === null ? t("نسخهٔ قرارداد قدیمی است یا وضعیت رأی قابل خواندن نیست؛ منطق دو رأی جدید را فرض نکنید.") : m.oracleDecision === 0 ? t("هنوز رأی اوراکل ثبت نشده است.") : m.oracleDecision === 1 ? t("رأی اوراکل: تسویه") : t("رأی اوراکل: بازپرداخت")}</p>
                            {m.state === 0 && !m.oracleDecision && [m.employer, m.contractor].some(address => address.toLowerCase() === account.toLowerCase()) && (
                              <form onSubmit={e => requestOracle(e, m)}>
                                <OracleInputs settings={oracleSettings[m.address] || { url: '', path: 'status' }} prefix={m.address} disabled={loading}
                                  onChange={settings => setOracleSettings(previous => ({ ...previous, [m.address]: settings }))} />
                                <p className="oracle-warning">{t("هر ارسال ۰٫۱ LINK از این escrow مصرف می‌کند. پاسخ نود تضمین نیست. API عمومی و مورد توافق طرفین باشد؛ درخواست ثبت‌شده به معنی دریافت پاسخ نیست.")}</p>
                                <button className="btn-action btn-oracle" type="submit" disabled={loading}>{t("ارسال درخواست اوراکل")}</button>
                              </form>
                            )}
                            {oracleMessages[m.address] && <p className="oracle-message" role="status">{t(oracleMessages[m.address])}</p>}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {visibleEscrows.length === 0 && !readBusy && !readError && (
                    <tr>
                      <td colSpan="7" style={{ padding: '2rem', color: '#94a3b8' }}><div className="empty-state"><span aria-hidden="true">◇</span><strong>{t("هیچ پروژه‌ای یافت نشد.")}</strong><p>{t("فیلترها را تغییر دهید یا نخستین قرارداد را بسازید.")}</p></div></td>
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

export default function LocalizedApp() {
  return <LanguageProvider><App /></LanguageProvider>;
}

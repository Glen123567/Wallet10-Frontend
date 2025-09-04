import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from 'framer-motion';
import { User, Send, LogOut, Wallet as WalletIcon, Unlock, ArrowLeft } from 'lucide-react';
import { ethers } from 'ethers';

// --- Futuristic UI Styles ---
const FuturisticStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;700&display=swap');
    :root { --primary-glow: #00f6ff; --secondary-glow: #ff00c1; --background-dark: #0a0a14; --text-color: #e0e0ff; --border-color: rgba(0, 246, 255, 0.2); --error-color: #ff4444; --success-color: #44ff44; }
    body { font-family: 'Orbitron', sans-serif; color: var(--text-color); text-shadow: 0 0 2px rgba(0, 246, 255, 0.3); }
    .cyber-card { background: rgba(16, 16, 32, 0.6); backdrop-filter: blur(12px) saturate(150%); -webkit-backdrop-filter: blur(12px) saturate(150%); border: 1px solid var(--border-color); box-shadow: 0 0 15px rgba(0, 246, 255, 0.1), 0 0 30px rgba(0, 246, 255, 0.05); }
    .cyber-input { background: rgba(10, 10, 20, 0.8); border: 1px solid var(--border-color); transition: all 0.3s ease; caret-color: var(--primary-glow); }
    .cyber-input:focus { outline: none; border-color: var(--primary-glow); box-shadow: 0 0 15px rgba(0, 246, 255, 0.5); }
    .cyber-input.error { border-color: var(--error-color); }
    .cyber-input.success { border-color: var(--success-color); }
    .animated-grid { width: 100vw; height: 100vh; position: fixed; top: 0; left: 0; z-index: -1; background-image: linear-gradient(to right, rgba(0, 246, 255, 0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 246, 255, 0.1) 1px, transparent 1px); background-size: 40px 40px; animation: moveGrid 10s linear infinite; }
    @keyframes moveGrid { from { background-position: 0 0; } to { background-position: 40px 40px; } }
    .validation-error { color: var(--error-color); font-size: 0.75rem; margin-top: 0.25rem; display: block; }
    .validation-success { color: var(--success-color); font-size: 0.75rem; margin-top: 0.25rem; display: block; }
  `}</style>
);

// --- Backend API wrapper ---
const API_BASE = "https://chatbackend-ziin.onrender.com/api"; 

const api = {
  _withAuth: (options = {}) => {
    const auth = AuthStorage.getAuth();
    if (auth?.token) {
      return { ...options, headers: { ...options.headers, 'Authorization': `Bearer ${auth.token}` } };
    }
    return options;
  },
  register: async (userData) => { const response = await fetch(`${API_BASE}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(userData) }); return response.json(); },
  login: async (credentials) => { const response = await fetch(`${API_BASE}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(credentials) }); return response.json(); },
  getUsers: async () => { const response = await fetch(`${API_BASE}/users`, api._withAuth()); return response.json(); },
  deleteAllUsers: async () => { const response = await fetch(`${API_BASE}/users`, api._withAuth({ method: 'DELETE' })); return response.json(); },
  getMessages: async (u1, u2) => { const response = await fetch(`${API_BASE}/messages/${u1}/${u2}`, api._withAuth()); return response.json(); },
  sendMessage: async (messageData) => { const response = await fetch(`${API_BASE}/messages`, api._withAuth({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(messageData) })); return response.json(); },
  deleteAllMessages: async () => { const response = await fetch(`${API_BASE}/messages`, api._withAuth({ method: 'DELETE' })); return response.json(); }
};

// --- Session Persistence using localStorage ---
const LOCAL_STORAGE_KEY = "secureChatAuth";
const AuthStorage = {
  getAuth: () => { try { const stored = localStorage.getItem(LOCAL_STORAGE_KEY); return stored ? JSON.parse(stored) : null; } catch (e) { console.error("Failed to parse auth data", e); return null; } },
  setAuth: (auth) => { try { localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(auth)); } catch (e) { console.error("Failed to save auth data", e); } },
  clearAuth: () => { localStorage.removeItem(LOCAL_STORAGE_KEY); },
};

// --- Form Validation Functions ---
const validators = {
    username: (v) => { if (!v?.trim()) return "Username is required"; if (v.trim().length < 3) return "Username must be at least 3 characters"; if (v.trim().length > 20) return "Username must be less than 20 characters"; if (!/^[a-zA-Z0-9_]+$/.test(v.trim())) return "Invalid characters in username"; return null; },
    password: (v) => { if (!v) return "Password is required"; if (v.length < 8) return "Password must be at least 8 characters"; if (!/(?=.*[a-z])/.test(v)) return "Password needs a lowercase letter"; if (!/(?=.*[A-Z])/.test(v)) return "Password needs an uppercase letter"; if (!/(?=.*\d)/.test(v)) return "Password needs a number"; if (!/(?=.*[@$!%*?&])/.test(v)) return "Password needs a special character"; return null; },
    email: (v) => { if (!v?.trim()) return "Email is required"; if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())) return "Invalid email address"; return null; },
    phone: (v) => { if (!v?.trim()) return null; if (!/^\d{10}$/.test(v.replace(/\D/g, ''))) return "Phone must be 10 digits (optional)"; return null; },
    dob: (v) => { if (!v) return null; const s = new Date(v), t = new Date(); if (s > new Date(t.getFullYear() - 13, t.getMonth(), t.getDate())) return "Must be at least 13 years old"; if (s < new Date(t.getFullYear() - 120, t.getMonth(), t.getDate())) return "Invalid date of birth"; return null; },
    walletAddress: (v) => { if (!v?.trim()) return "Wallet address is required"; if (!ethers.isAddress(v.trim())) return "Invalid Ethereum address"; return null; }
};

// --- Blockchain & Animation Placeholders ---
const ERC20_ABI = ["function balanceOf(address) view returns (uint256)", "function decimals() view returns (uint8)"];
const BSC_MAINNET = { chainId: '0x38', chainName: 'BNB Smart Chain', rpcUrls: ['https://bsc-dataseed.binance.org/'], nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18, }, blockExplorerUrls: ['https://bscscan.com/'], };
const TOKENS = { USDT: "0x55d398326f99059fF775485246999027B3197955", USDC: "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d" };
const dummyHash = () => "0x" + Math.random().toString(16).slice(2).padEnd(64, "0");
const pageTransition = { initial: { opacity: 0, filter: "blur(8px)", y: 50 }, animate: { opacity: 1, filter: "blur(0px)", y: 0 }, exit: { opacity: 0, filter: "blur(8px)", y: -50 } };
const slideInLeft = { initial: { opacity: 0, x: -50 }, animate: { opacity: 1, x: 0 }, transition: { type: "spring", stiffness: 100, damping: 15 } };
const fadeInUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } } };
const staggerList = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } } };
const bounceIn = { hidden: { opacity: 0, scale: 0.3, y: 50 }, visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 15 } } };
const scaleTap = { whileTap: { scale: 0.95 }, whileHover: { scale: 1.05, y: -2, transition: { type: "spring", stiffness: 400, damping: 10 } } };
const floatingAnimation = { animate: { y: [0, -8, 0], transition: { duration: 4, repeat: Infinity, ease: "easeInOut" } } };
const messageSlideLeft = { hidden: { opacity: 0, x: -100, scale: 0.8 }, visible: { opacity: 1, x: 0, scale: 1, transition: { type: "spring", stiffness: 200, damping: 20 } } };
const messageSlideRight = { hidden: { opacity: 0, x: 100, scale: 0.8 }, visible: { opacity: 1, x: 0, scale: 1, transition: { type: "spring", stiffness: 200, damping: 20 } } };

// --- UI Components ---
function Button({ children, className = "", variant = "primary", ...props }) { const base = "px-6 py-3 rounded-lg font-bold shadow-lg text-white relative overflow-hidden group tracking-wider uppercase disabled:opacity-50 disabled:cursor-not-allowed"; const variants = { primary: "bg-cyan-500/80 border border-cyan-400 hover:bg-cyan-400/90 hover:shadow-cyan-400/50", secondary: "bg-pink-500/80 border border-pink-400 hover:bg-pink-400/90 hover:shadow-pink-400/50", danger: "bg-red-600/80 border border-red-500 hover:bg-red-500/90 hover:shadow-red-500/50" }; return (<motion.button {...scaleTap} className={`${base} ${variants[variant]} ${className}`} {...props}><div className="absolute inset-0 bg-black opacity-20 group-hover:opacity-0 transition-opacity" /><div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white/20 to-transparent" /><span className="relative z-10">{children}</span></motion.button>); }
function ValidatedInput({ name, type = "text", placeholder, value, onChange, validator }) { const [err, setErr] = useState(""); const [touched, setTouched] = useState(false); const isValid = touched && !err && value && validator && !validator(value); const c = `w-full px-4 py-3 rounded-lg cyber-input ${touched && err ? "error" : ""} ${isValid ? "success" : ""}`; const hC = (e) => { onChange(e); if (touched && validator) setErr(validator(e.target.value) || ""); }; const hB = () => { setTouched(true); if (validator) setErr(validator(value) || ""); }; return (<div className="w-full"><input name={name} type={type} placeholder={placeholder} value={value} onChange={hC} onBlur={hB} className={c} />{touched && err && (<motion.span initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="validation-error">{err}</motion.span>)}{isValid && (<motion.span initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="validation-success">✓ Valid</motion.span>)}</div>); }
function Navbar({ onBack, onLogout, walletAddress, balances, loadingBalances }) { return (<motion.div initial={{ y: -100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 80, damping: 20 }} className="w-full max-w-7xl mb-8"><div className="flex items-center justify-center relative bg-black/20 p-4 rounded-lg border border-[var(--border-color)]">{onBack && (<motion.button {...scaleTap} onClick={onBack} className="absolute left-4 flex items-center gap-2 text-[var(--primary-glow)] hover:text-white px-3 py-2"><ArrowLeft size={20} /> Back</motion.button>)}<motion.h1 className="text-3xl font-bold flex items-center gap-4" style={{color: 'var(--primary-glow)', textShadow: '0 0 10px var(--primary-glow)'}} {...floatingAnimation}><WalletIcon size={32} />Cyber Secure Chat</motion.h1>{onLogout && (<motion.button {...scaleTap} onClick={onLogout} className="absolute right-4 flex items-center gap-2 text-[var(--secondary-glow)] hover:text-white px-3 py-2"><LogOut size={20} /> Logout</motion.button>)}</div>{walletAddress && (<motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }} className="mt-4 text-center"><div className="cyber-card p-4"><p className="text-sm text-slate-300 mb-2 break-all"><span className="uppercase tracking-wider">Wallet: </span><span className="font-mono text-[var(--primary-glow)]">{walletAddress}</span></p>{loadingBalances ? (<div className="flex items-center justify-center gap-2"><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-4 h-4 border-2 border-[var(--primary-glow)] border-t-transparent rounded-full" /><span className="text-slate-400">Syncing...</span></div>) : balances ? (<motion.div variants={staggerList} initial="hidden" animate="visible" className="flex justify-center gap-6 flex-wrap">{Object.entries(balances).map(([sym, val]) => (<motion.div key={sym} variants={bounceIn} className="bg-black/30 px-3 py-1 rounded-md border border-[var(--border-color)]"><span className="font-semibold text-[var(--primary-glow)]">{sym}:</span> {val}</motion.div>))}</motion.div>) : (<p className="text-slate-400">No balance data</p>)}</div></motion.div>)}</motion.div>); }
function Card({ title, children, footer }) { return (<motion.div variants={pageTransition} initial="initial" animate="animate" exit="exit" className="cyber-card w-full max-w-xl rounded-2xl p-6 relative overflow-hidden"><div className="relative z-10">{title && (<motion.h2 initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="text-2xl font-bold mb-6 text-center uppercase" style={{ color: 'var(--primary-glow)', textShadow: '0 0 8px var(--primary-glow)'}}>{title}</motion.h2>)}<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>{children}</motion.div>{footer && (<motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="mt-6">{footer}</motion.div>)}</div></motion.div>); }
function MessageBubble({ m, currentUser }) { const isSent = m.sender === currentUser; const time = new Date(m.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); return (<motion.div variants={isSent ? messageSlideRight : messageSlideLeft} initial="hidden" animate="visible" className={`w-full flex mb-4 group ${isSent ? 'justify-end' : 'justify-start'}`}><div className={`max-w-md p-4 rounded-2xl relative shadow-lg ${isSent ? 'bg-gradient-to-br from-cyan-500/20 to-transparent border-2 border-cyan-500/50 rounded-br-none' : 'bg-slate-800/50 border border-slate-700/80 rounded-bl-none'}`}><p className="text-sm break-words leading-relaxed">{m.text}</p><span className="text-xs opacity-60 mt-2 block text-right">{time}</span><div className={`absolute bottom-0 w-3 h-3 rounded-full blur-md opacity-70 group-hover:opacity-100 transition-opacity ${isSent ? 'right-0 bg-cyan-400' : 'left-0 bg-pink-400'}`} /></div></motion.div>); }
function UserItem({ u, selected, onClick }) { return (<motion.button {...scaleTap} variants={bounceIn} onClick={onClick} className={`flex items-center gap-4 w-full p-3 rounded-lg border transition-all duration-300 relative overflow-hidden group ${selected ? "bg-cyan-500/30 border-cyan-400 shadow-[0_0_15px_rgba(0,246,255,0.5)]" : "bg-black/30 border-[var(--border-color)] hover:bg-cyan-500/10"}`}><motion.div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shrink-0"><User size={18} /></motion.div><div className="text-left flex-1 overflow-hidden"><div className="font-bold tracking-wider truncate">{u.username}</div><div className="text-xs text-cyan-300/70 truncate font-mono">{u.walletAddress}</div></div><div className={`w-3 h-3 rounded-full shadow-lg transition-all shrink-0 ${selected ? 'bg-green-400 shadow-green-400/50' : 'bg-slate-500'}`} animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity }} /></motion.button>); }

// --- Main App Component ---
export default function App() {
  const [step, setStep] = useState("connect");
  const [connectedAddress, setConnectedAddress] = useState("");
  const [balances, setBalances] = useState(null);
  const [loadingBalances, setLoadingBalances] = useState(false);
  const [manualAddress, setManualAddress] = useState("");
  const [form, setForm] = useState({ username: "", password: "", email: "", phone: "", dob: "" });
  const [session, setSession] = useState(null);
  const [partner, setPartner] = useState(null);
  const [message, setMessage] = useState("");
  const [users, setUsers] = useState([]);
  const [msgs, setMsgs] = useState([]);
  const chatEndRef = useRef(null);
  
  const isRegisterFormValid = () => !validators.username(form.username) && !validators.password(form.password) && !validators.email(form.email) && !validators.phone(form.phone) && !validators.dob(form.dob);
  const isLoginFormValid = () => form.username.trim().length > 0 && form.password.trim().length > 0;

  const scrollToBottom = () => chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(scrollToBottom, [msgs]);

  const loadUsers = async () => { try { const res = await api.getUsers(); if (Array.isArray(res)) setUsers(res); } catch (e) { console.error("Failed to load users:", e); } };
  const loadMessages = async () => { if (!session || !partner) return; try { const res = await api.getMessages(session.user.username, partner.username); if (Array.isArray(res)) setMsgs(res); } catch (e) { console.error("Failed to load messages:", e); } };

  useEffect(() => { if (session) loadUsers(); }, [session]);
  useEffect(() => { if (session && partner) { setMsgs([]); loadMessages(); } }, [session, partner]);

  useEffect(() => {
    const savedAuth = AuthStorage.getAuth();
    if (savedAuth?.token && savedAuth?.user && savedAuth?.address) {
      setSession(savedAuth); setConnectedAddress(savedAuth.address); setStep("chat"); fetchBalances(savedAuth.address);
    } else if (savedAuth?.address) {
      setConnectedAddress(savedAuth.address); setStep("chooseAuth"); fetchBalances(savedAuth.address);
    }
  }, []);

  const switchToBSC = async () => {
    if (!window.ethereum) return false;
    try { await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: BSC_MAINNET.chainId }], }); return true; } 
    catch (e) { if (e.code === 4902) { try { await window.ethereum.request({ method: 'wallet_addEthereumChain', params: [BSC_MAINNET], }); return true; } catch (addError) { console.error('Failed to add BSC:', addError); return false; } } console.error('Failed to switch to BSC:', e); return false; }
  };

  const fetchBalances = async (addr) => {
    if (!addr) return; setLoadingBalances(true); setBalances(null);
    try { await switchToBSC(); const provider = new ethers.JsonRpcProvider(BSC_MAINNET.rpcUrls[0]); const results = { BNB: "0.0000", USDT: "0.00", USDC: "0.00" }; const promises = [provider.getBalance(addr).then(b => { results.BNB = parseFloat(ethers.formatEther(b)).toFixed(4); }).catch(() => results.BNB = "Error"), ...Object.entries(TOKENS).map(([sym, adr]) => (async () => { try { const contract = new ethers.Contract(adr, ERC20_ABI, provider); const [bal, dec] = await Promise.all([contract.balanceOf(addr), contract.decimals()]); results[sym] = parseFloat(ethers.formatUnits(bal, Number(dec))).toFixed(2); } catch { results[sym] = "Error"; } })())]; await Promise.all(promises); setBalances(results); } 
    catch (e) { console.error("Balance fetch error:", e); setBalances({ BNB: "Error", USDT: "Error", USDC: "Error" }); } 
    finally { setLoadingBalances(false); }
  };
  
  const connectMetaMask = async () => {
    if (!window.ethereum) return alert("MetaMask not detected. Please install it.");
    try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const addr = accounts[0];
        if (!addr) return alert("Please connect an account in MetaMask.");
        
        const switched = await switchToBSC();
        if (!switched) return alert("Please switch to the BNB Smart Chain to continue.");
        
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        
        const challenge = `Welcome to Cyber Secure Chat!\n\nSign this message to prove you own this wallet.\n\nAddress: ${addr}\nTimestamp: ${Date.now()}`;
        const signature = await signer.signMessage(challenge);
        
        const authData = { address: addr, signature, challenge };
        AuthStorage.setAuth(authData);

        setConnectedAddress(addr);
        fetchBalances(addr);
        setStep("chooseAuth");

        window.ethereum.on("accountsChanged", () => {
          alert("Wallet account changed. Please reconnect and sign in again.");
          handleLogout();
        });
        window.ethereum.on("chainChanged", () => { if (connectedAddress) fetchBalances(connectedAddress); });
    } catch (err) {
        console.error("MetaMask connection/signature failed:", err);
        if (err.code === 4001) {
            alert("You rejected the request in MetaMask.");
        } else {
            alert("Failed to connect to MetaMask.");
        }
    }
  };

  const connectManual = () => { const err = validators.walletAddress(manualAddress); if (err) return alert(err); const addr = manualAddress.trim(); AuthStorage.setAuth({ address: addr }); setConnectedAddress(addr); fetchBalances(addr); setStep("chooseAuth"); };
  const clearSession = () => { setSession(null); setPartner(null); setUsers([]); setMsgs([]); setMessage(""); setForm({ username: "", password: "", email: "", phone: "", dob: "" }); };
  const clearWallet = () => { setConnectedAddress(""); setManualAddress(""); setBalances(null); };
  const handleLogout = () => { AuthStorage.clearAuth(); clearSession(); clearWallet(); setStep("connect"); };
  const navigateTo = (newStep) => { if ((step === "register" || step === "login")) { setForm({ username: "", password: "", email: "", phone: "", dob: "" }); } if (newStep === "chooseAuth" && session) { clearSession(); } setStep(newStep); };
  
  const handleRegister = async () => { if (!isRegisterFormValid()) return alert("Please fix form errors."); try { const res = await api.register({ ...form, walletAddress: connectedAddress }); if (res.success) { alert("Registration successful! Please login."); navigateTo("login"); } else { alert(res.message || "Registration failed"); } } catch (e) { alert("Registration failed."); } };
  const handleLogin = async () => { if (!isLoginFormValid()) return alert("Enter username/password."); try { const res = await api.login({ username: form.username, password: form.password }); if (res.success) { const authData = { ...AuthStorage.getAuth(), user: res.user, token: res.token }; AuthStorage.setAuth(authData); setSession(authData); navigateTo("chat"); } else { alert(res.message || "Invalid credentials"); } } catch (e) { alert("Login failed."); } };
  const handleSendMsg = async () => { if (!message.trim() || !partner) return; try { const res = await api.sendMessage({ receiver: partner.username, text: message.trim(), txHash: dummyHash() }); if (res.success) { setMessage(""); await loadMessages(); } else { alert("Failed to send message"); } } catch (e) { alert("Failed to send message."); } };
  const handleClearAll = async () => { if (window.confirm("Are you sure? This deletes ALL users & chats.")) { try { await api.deleteAllUsers(); setUsers([]); setMsgs([]); clearSession(); navigateTo("chooseAuth"); } catch (e) { alert("Failed to clear users."); } } };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const thread = msgs.filter((m) => (m.sender === session?.user.username && m.receiver === partner?.username) || (m.sender === partner?.username && m.receiver === session?.user.username));

  return (
    <div className="min-h-screen w-full bg-[#0a0a14] text-slate-100 flex flex-col items-center py-10 px-4 relative overflow-hidden">
      <FuturisticStyles />
      <div className="animated-grid" />
      <div className="w-full max-w-7xl relative z-10 flex flex-col items-center">
        <Navbar onBack={step === "chooseAuth" ? handleLogout : (step !== "connect" && step !== "chat" ? () => navigateTo("chooseAuth") : null)} onLogout={session ? handleLogout : null} walletAddress={connectedAddress} balances={balances} loadingBalances={loadingBalances}/>
        <main className="mt-8 w-full flex justify-center">
          <AnimatePresence mode="wait">
            {step === "connect" && (<motion.div key="connect"><Card title="Initialize Connection"><p className="mb-6 text-sm text-center text-slate-400">Connect your wallet to enter the secure network.</p><motion.div className="space-y-4" variants={staggerList} initial="hidden" animate="visible"><motion.div variants={bounceIn}><Button onClick={connectMetaMask} className="w-full">Connect with MetaMask</Button></motion.div><div className="text-center my-2 text-slate-500">OR</div><motion.div variants={bounceIn} className="flex gap-3"><ValidatedInput placeholder="Manual Wallet Address" value={manualAddress} onChange={(e) => setManualAddress(e.target.value)} validator={validators.walletAddress} /><Button onClick={connectManual} variant="secondary" disabled={!manualAddress.trim() || !!validators.walletAddress(manualAddress)}>Link</Button></motion.div></motion.div></Card></motion.div>)}
            {step === "chooseAuth" && (<motion.div key="chooseAuth"><Card title="Authentication"><p className="mb-6 text-sm text-center text-slate-400">Wallet linked. Register a new profile or log in.</p><div className="flex gap-4"><Button className="w-full" onClick={() => navigateTo("register")}>Register</Button><Button className="w-full" variant="secondary" onClick={() => navigateTo("login")}>Login</Button></div></Card></motion.div>)}
            {step === "register" && (<motion.div key="register"><Card title="Create Profile"><div className="space-y-4"><ValidatedInput name="username" value={form.username} onChange={handleChange} placeholder="Username" validator={validators.username}/><ValidatedInput name="password" type="password" value={form.password} onChange={handleChange} placeholder="Password" validator={validators.password}/><ValidatedInput name="email" type="email" value={form.email} onChange={handleChange} placeholder="Email" validator={validators.email}/><ValidatedInput name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder="Phone Number (Optional)" validator={validators.phone}/><ValidatedInput name="dob" type="date" value={form.dob} onChange={handleChange} placeholder="Date of Birth (Optional)" validator={validators.dob}/><Button onClick={handleRegister} className="w-full mt-4" disabled={!isRegisterFormValid()}>Create Profile</Button></div></Card></motion.div>)}
            {step === "login" && (<motion.div key="login"><Card title="Login"><div className="space-y-4"><ValidatedInput name="username" value={form.username} onChange={handleChange} placeholder="Username"/><ValidatedInput name="password" type="password" value={form.password} onChange={handleChange} placeholder="Password"/><Button onClick={handleLogin} className="w-full mt-4 flex items-center justify-center gap-2" disabled={!isLoginFormValid()}><Unlock size={18} /> Access</Button></div></Card></motion.div>)}
            {step === "chat" && session && (<motion.div key="chat" className="grid lg:grid-cols-3 gap-6 w-full max-w-7xl" variants={staggerList} initial="hidden" animate="visible"><motion.div variants={slideInLeft}><Card title="Contacts" footer={<Button onClick={handleClearAll} variant="danger" className="w-full">Clear All Users & Chats</Button>}><div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">{users.filter((u) => u.username !== session.user.username).map((u) => (<UserItem key={u.username} u={u} selected={partner?.username === u.username} onClick={() => setPartner(u)} />))}</div></Card></motion.div><motion.div variants={fadeInUp} className="lg:col-span-2"><Card title={partner ? `Channel: ${partner.username}` : "Select Contact"}><div className="h-[50vh] flex flex-col overflow-y-auto mb-6 bg-black/20 rounded-lg p-4 border border-[var(--border-color)]"><div className="flex-grow space-y-2">{partner ? (thread.length > 0 ? thread.map((m) => (<MessageBubble key={m._id} m={m} currentUser={session.user.username} />)) : (<div className="h-full flex items-center justify-center text-slate-400">No messages yet.</div>)) : (<div className="h-full flex items-center justify-center text-slate-400">Choose a contact to begin.</div>)}<div ref={chatEndRef} /></div></div>{partner && (<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3"><input className="flex-1 px-4 py-3 rounded-lg cyber-input" placeholder={`Message...`} value={message} onChange={(e) => setMessage(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleSendMsg(); }}/><Button onClick={handleSendMsg} className="px-4"><Send size={18} /></Button></motion.div>)}</Card></motion.div></motion.div>)}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
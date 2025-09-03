import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from 'framer-motion';
import { User, Send, LogOut, Wallet as WalletIcon, Unlock, ArrowLeft } from 'lucide-react';
import { ethers } from 'ethers'; // Still imported for wallet address validation

// --- Futuristic UI Styles ---
const FuturisticStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;700&display=swap');

    :root {
      --primary-glow: #00f6ff;
      --secondary-glow: #ff00c1;
      --background-dark: #0a0a14;
      --background-light: #1a1a2e;
      --text-color: #e0e0ff;
      --border-color: rgba(0, 246, 255, 0.2);
      --error-color: #ff4444;
      --success-color: #44ff44;
    }

    body {
      font-family: 'Orbitron', sans-serif;
      color: var(--text-color);
      text-shadow: 0 0 2px rgba(0, 246, 255, 0.3);
    }

    .cyber-card {
      background: rgba(16, 16, 32, 0.6);
      backdrop-filter: blur(12px) saturate(150%);
      -webkit-backdrop-filter: blur(12px) saturate(150%);
      border: 1px solid var(--border-color);
      box-shadow: 0 0 15px rgba(0, 246, 255, 0.1), 0 0 30px rgba(0, 246, 255, 0.05);
      position: relative;
    }

    .cyber-input {
      background: rgba(10, 10, 20, 0.8);
      border: 1px solid var(--border-color);
      transition: all 0.3s ease;
      caret-color: var(--primary-glow);
    }

    .cyber-input:focus {
      outline: none;
      border-color: var(--primary-glow);
      box-shadow: 0 0 15px rgba(0, 246, 255, 0.5);
    }

    .cyber-input.error {
      border-color: var(--error-color);
      box-shadow: 0 0 15px rgba(255, 68, 68, 0.3);
    }

    .cyber-input.success {
      border-color: var(--success-color);
      box-shadow: 0 0 15px rgba(68, 255, 68, 0.3);
    }

    .animated-grid {
      width: 100vw;
      height: 100vh;
      position: fixed;
      top: 0;
      left: 0;
      z-index: -1;
      background-image:
        linear-gradient(to right, rgba(0, 246, 255, 0.1) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(0, 246, 255, 0.1) 1px, transparent 1px);
      background-size: 40px 40px;
      animation: moveGrid 10s linear infinite;
    }

    @keyframes moveGrid {
      from { background-position: 0 0; }
      to { background-position: 40px 40px; }
    }

    .validation-error {
      color: var(--error-color);
      font-size: 0.75rem;
      margin-top: 0.25rem;
      display: block;
      opacity: 0.9;
    }

    .validation-success {
      color: var(--success-color);
      font-size: 0.75rem;
      margin-top: 0.25rem;
      display: block;
      opacity: 0.9;
    }
  `}</style>
);


// --------------------------- Backend API wrapper ---------------------------
// Updated to use a function that gets the token for each request
const API_BASE = "https://chatbackend-ziin.onrender.com/api";

const getAuthHeaders = () => {
  const auth = AuthStorage.getAuth();
  if (auth && auth.token) {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${auth.token}`
    };
  }
  return { 'Content-Type': 'application/json' };
};

const api = {
  // Auth endpoints
  register: async (userData) => {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    return response.json();
  },

  login: async (credentials) => {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    return response.json();
  },

  // User endpoints (now require authentication)
  getUsers: async () => {
    const response = await fetch(`${API_BASE}/users`, {
      headers: getAuthHeaders(),
    });
    return response.json();
  },

  deleteAllUsers: async () => {
    const response = await fetch(`${API_BASE}/users`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return response.json();
  },

  // Message endpoints (now require authentication)
  getMessages: async (u1, u2) => {
    const response = await fetch(`${API_BASE}/messages/${u1}/${u2}`, {
      headers: getAuthHeaders(),
    });
    return response.json();
  },

  sendMessage: async (messageData) => {
    const response = await fetch(`${API_BASE}/messages`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(messageData)
    });
    return response.json();
  },

  deleteAllMessages: async () => {
    const response = await fetch(`${API_BASE}/messages`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return response.json();
  }
};

// --------------------------- Session Persistence using localStorage ---------------------------
const LOCAL_STORAGE_KEY = "secureChatAuth";

const AuthStorage = {
  getAuth: () => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      console.error("Failed to parse auth data from localStorage", e);
      return null;
    }
  },
  setAuth: (auth) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(auth));
    } catch (e) {
      console.error("Failed to save auth data to localStorage", e);
    }
  },
  clearAuth: () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  },
};

// --------------------------- Form Validation Functions ---------------------------
const validators = {
  username: (value) => {
    if (!value || value.trim().length === 0) return "Username is required";
    if (value.trim().length < 3) return "Username must be at least 3 characters";
    if (value.trim().length > 20) return "Username must be less than 20 characters";
    if (!/^[a-zA-Z0-9_]+$/.test(value.trim())) return "Username can only contain letters, numbers, and underscores";
    return null;
  },

  password: (value) => {
    if (!value) return "Password is required";
    if (value.length < 8) return "Password must be at least 8 characters";
    if (!/(?=.*[a-z])/.test(value)) return "Password must contain at least one lowercase letter";
    if (!/(?=.*[A-Z])/.test(value)) return "Password must contain at least one uppercase letter";
    if (!/(?=.*\d)/.test(value)) return "Password must contain at least one number";
    if (!/(?=.*[@$!%*?&])/.test(value)) return "Password must contain at least one special character (@$!%*?&)";
    return null;
  },

  email: (value) => {
    if (!value || value.trim().length === 0) return "Email is required";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value.trim())) return "Please enter a valid email address";
    return null;
  },

  phone: (value) => {
    if (value.trim().length === 0) return null; // Optional
    const phoneRegex = /^\d{10}$/;
    const cleanPhone = value.replace(/\D/g, ''); // Remove non-digits
    if (!phoneRegex.test(cleanPhone)) return "Phone number must be exactly 10 digits";
    return null;
  },

  dob: (value) => {
    if (value.trim().length === 0) return null; // Optional
    const selectedDate = new Date(value);
    const today = new Date();
    const minAge = new Date(today.getFullYear() - 13, today.getMonth(), today.getDate()); // Minimum 13 years old
    const maxAge = new Date(today.getFullYear() - 120, today.getMonth(), today.getDate()); // Maximum 120 years old

    if (selectedDate > minAge) return "You must be at least 13 years old";
    if (selectedDate < maxAge) return "Please enter a valid date of birth";
    return null;
  },

  walletAddress: (value) => {
    if (!value || value.trim().length === 0) return "Wallet address is required";
    if (!ethers.isAddress(value.trim())) return "Please enter a valid Ethereum address";
    return null;
  }
};

// --------------------------- ERC20 ABI & Contract Config (Commented out for now) ---------------------------
// const ERC20_ABI = [
//   "function balanceOf(address) view returns (uint256)",
//   "function decimals() view returns (uint8)",
//   "function symbol() view returns (string)"
// ];

// const CONTRACT_CONFIG = {
//   address: "0x842b6E8BA8860962C10DD7a51bA5AFBb0E086b46",
//   abi: [/* Your ABI here */]
// };

// const blockchain = {
//   contract: null,

//   async initContract() {
//     if (typeof window.ethereum !== "undefined") {
//       const provider = new ethers.BrowserProvider(window.ethereum);
//       const signer = await provider.getSigner();
//       this.contract = new ethers.Contract(CONTRACT_CONFIG.address, CONTRACT_CONFIG.abi, signer);
//     }
//   },

//   async registerOnChain(publicKey) {
//     await this.initContract();
//     const fee = await this.contract.messageFee();
//     const tx = await this.contract.registerUser(publicKey, { value: fee });
//     return await tx.wait();
//   },

//   async sendMessageOnChain(receiverAddress, encryptedContent) {
//     await this.initContract();
//     const fee = await this.contract.messageFee();
//     const tx = await this.contract.sendMessage(receiverAddress, encryptedContent, { value: fee });
//     return await tx.wait();
//   },

//   async getConversationHashes(otherUserAddress) {
//     await this.initContract();
//     return await this.contract.getConversation(otherUserAddress);
//   }
// };

// BSC Mainnet configuration
const BSC_MAINNET = {
  chainId: '0x38', // 56 in hex
  chainName: 'BNB Smart Chain',
  rpcUrls: ['https://bsc-dataseed.binance.org/'],
  nativeCurrency: {
    name: 'BNB',
    symbol: 'BNB',
    decimals: 18,
  },
  blockExplorerUrls: ['https://bscscan.com/'],
};

// BSC Mainnet USDT & USDC contracts (Commented out for now)
// const TOKENS = {
//   USDT: "0x55d398326f99059fF775485246999027B3197955",
//   USDC: "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d"
// };

// --------------------------- Dummy crypto placeholders ---------------------------
const dummyHash = () => "0x" + Math.random().toString(16).slice(2).padEnd(64, "0");

// --------------------------- Enhanced Animation Variants ---------------------------
const pageTransition = {
  initial: { opacity: 0, filter: "blur(8px)", y: 50 },
  animate: { opacity: 1, filter: "blur(0px)", y: 0 },
  exit: { opacity: 0, filter: "blur(8px)", y: -50 }
};

const slideInLeft = {
  initial: { opacity: 0, x: -50 },
  animate: { opacity: 1, x: 0 },
  transition: { type: "spring", stiffness: 100, damping: 15 }
};

const slideInRight = {
  initial: { opacity: 0, x: 50 },
  animate: { opacity: 1, x: 0 },
  transition: { type: "spring", stiffness: 100, damping: 15 }
};

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

const staggerList = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  },
};

const bounceIn = {
  hidden: { opacity: 0, scale: 0.3, y: 50 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 15
    }
  }
};

const scaleTap = {
  whileTap: { scale: 0.95 },
  whileHover: { scale: 1.05, y: -2, transition: { type: "spring", stiffness: 400, damping: 10 } }
};

const floatingAnimation = {
  animate: {
    y: [0, -8, 0],
    transition: {
      duration: 4,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};


// Message-specific animations
const messageSlideLeft = {
  hidden: { opacity: 0, x: -100, scale: 0.8 },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 200,
      damping: 20,
      delay: 0.1
    }
  }
};

const messageSlideRight = {
  hidden: { opacity: 0, x: 100, scale: 0.8 },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 200,
      damping: 20,
      delay: 0.1
    }
  }
};

// --------------------------- Futuristic UI Components ---------------------------
function Button({ children, className = "", variant = "primary", ...props }) {
    const baseStyle = "px-6 py-3 rounded-lg font-bold shadow-lg text-white relative overflow-hidden group tracking-wider uppercase";
    const variants = {
        primary: "bg-cyan-500/80 border border-cyan-400 hover:bg-cyan-400/90 hover:shadow-cyan-400/50",
        secondary: "bg-pink-500/80 border border-pink-400 hover:bg-pink-400/90 hover:shadow-pink-400/50",
        danger: "bg-red-600/80 border border-red-500 hover:bg-red-500/90 hover:shadow-red-500/50"
    };

    return (
        <motion.button
            {...scaleTap}
            className={`${baseStyle} ${variants[variant]} ${className}`}
            style={{ textShadow: "0 0 5px rgba(0,0,0,0.5)" }}
            {...props}
        >
            <div className="absolute inset-0 bg-black opacity-20 group-hover:opacity-0 transition-opacity duration-300" />
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white/20 to-transparent" />
            <span className="relative z-10">{children}</span>
        </motion.button>
    );
}

// --------------------------- Validated Input Component ---------------------------
function ValidatedInput({ name, type = "text", placeholder, value, onChange, validator, className = "", ...props }) {
  const [error, setError] = useState("");
  const [touched, setTouched] = useState(false);

  const handleChange = (e) => {
    const newValue = e.target.value;
    onChange(e);

    if (touched && validator) {
      const validationError = validator(newValue);
      setError(validationError || "");
    }
  };

  const handleBlur = () => {
    setTouched(true);
    if (validator) {
      const validationError = validator(value);
      setError(validationError || "");
    }
  };

  const getInputClassName = () => {
    let classes = `w-full px-4 py-3 rounded-lg cyber-input ${className}`;
    if (touched && error) classes += " error";
    else if (touched && !error && value && value.trim().length > 0) classes += " success"; // Only success if not empty
    return classes;
  };

  return (
    <div className="w-full">
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        className={getInputClassName()}
        {...props}
      />
      {touched && error && (
        <motion.span
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="validation-error"
        >
          {error}
        </motion.span>
      )}
      {touched && !error && value && value.trim().length > 0 && (
        <motion.span
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="validation-success"
        >
          ✓ Valid
        </motion.span>
      )}
    </div>
  );
}

function Navbar({ title, onBack, onLogout, user, walletAddress, balances, loadingBalances }) {
  return (
    <motion.div
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 80, damping: 20 }}
      className="flex flex-col w-full max-w-7xl mb-8 relative"
    >
      <div className="flex items-center justify-center relative bg-black/20 p-4 rounded-lg border border-[var(--border-color)]">
        {onBack && (
          <motion.button
            {...scaleTap}
            onClick={onBack}
            className="absolute left-4 flex items-center gap-2 text-[var(--primary-glow)] hover:text-white px-3 py-2 rounded-lg backdrop-blur-sm"
          >
            <ArrowLeft size={20} /> Back
          </motion.button>
        )}

        <motion.h1
          className="text-3xl font-bold flex items-center gap-4 justify-center"
          style={{color: 'var(--primary-glow)', textShadow: '0 0 10px var(--primary-glow)'}}
          {...floatingAnimation}
        >
          <motion.div>
            <WalletIcon size={32} />
          </motion.div>
          {title}
        </motion.h1>

        {user && (
          <motion.button
            {...scaleTap}
            onClick={onLogout}
            className="absolute right-4 flex items-center gap-2 text-[var(--secondary-glow)] hover:text-white px-3 py-2 rounded-lg"
          >
            <LogOut size={20} /> Logout
          </motion.button>
        )}
      </div>

      {walletAddress && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-4 text-center"
        >
          <div className="cyber-card p-4">
            <p className="text-sm text-slate-300 mb-2">
              <span className="uppercase tracking-wider">Connected Wallet: </span>
              <span className="font-mono text-[var(--primary-glow)]">{walletAddress}</span>
            </p>

            {loadingBalances ? (
              <div className="flex items-center justify-center gap-2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-4 h-4 border-2 border-[var(--primary-glow)] border-t-transparent rounded-full"
                />
                <span className="text-slate-400">Syncing Balances...</span>
              </div>
            ) : balances ? (
              <motion.div
                variants={staggerList}
                initial="hidden"
                animate="visible"
                className="flex justify-center gap-6"
              >
                {Object.entries(balances).map(([sym, val]) => (
                  <motion.div
                    key={sym}
                    variants={bounceIn}
                    className="bg-black/30 px-3 py-1 rounded-md border border-[var(--border-color)]"
                  >
                    <span className="font-semibold text-[var(--primary-glow)]">{sym}:</span> {val}
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <p className="text-slate-400">No balance data</p>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

function Card({ title, children, footer }) {
  return (
    <motion.div
      variants={pageTransition}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.5, ease: "easeInOut" }}
      className="cyber-card w-full max-w-xl rounded-2xl p-6 relative overflow-hidden"
    >
      <div className="relative z-10">
        {title && (
            <motion.h2
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-2xl font-bold mb-6 text-center uppercase"
            style={{ color: 'var(--primary-glow)', textShadow: '0 0 8px var(--primary-glow)'}}
            >
            {title}
            </motion.h2>
        )}

        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
        >
            {children}
        </motion.div>

        {footer && (
            <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-6"
            >
            {footer}
            </motion.div>
        )}
      </div>
    </motion.div>
  );
}

function MessageBubble({ m, currentUser }) {
  const isSentByMe = m.sender === currentUser;

  // Base styles for all bubbles
  const bubbleBaseStyle = "max-w-md p-4 rounded-2xl relative shadow-lg";
  const textStyle = "text-sm break-words leading-relaxed";
  const timeStyle = "text-xs opacity-60 mt-2 block text-right";

  if (isSentByMe) {
    // --- SENDER'S BUBBLE (Cyber/Futuristic) ---
    return (
      <motion.div
        variants={messageSlideRight}
        initial="hidden"
        animate="visible"
        className="w-full flex justify-end mb-4 group"
      >
        <div
          className={`${bubbleBaseStyle} bg-gradient-to-br from-cyan-500/20 via-cyan-500/10 to-transparent border-2 border-cyan-500/50 rounded-br-none`}
        >
          {/* Main message text */}
          <p className={textStyle}>
            {m.text}
          </p>
          {/* Timestamp */}
          <span className={timeStyle}>
            {new Date(m.createdAt || Date.now()).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
          {/* Decorative glowing corner effect */}
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-cyan-400 rounded-full blur-md opacity-70 group-hover:opacity-100 transition-opacity" />
        </div>
      </motion.div>
    );
  } else {
    // --- RECEIVER'S BUBBLE (Cyber/Futuristic) ---
    return (
      <motion.div
        variants={messageSlideLeft}
        initial="hidden"
        animate="visible"
        className="w-full flex justify-start mb-4 group"
      >
        <div
          className={`${bubbleBaseStyle} bg-slate-800/50 backdrop-blur-sm border border-slate-700/80 rounded-bl-none`}
        >
          {/* Sender's username */}
          <p className="text-sm font-bold text-pink-400 mb-2 tracking-wider">
            {m.sender}
          </p>
          {/* Main message text */}
          <p className={textStyle}>
            {m.text}
          </p>
          {/* Timestamp */}
          <span className={timeStyle}>
            {new Date(m.createdAt || Date.now()).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
          {/* Decorative glowing corner effect */}
          <div className="absolute bottom-0 left-0 w-3 h-3 bg-pink-400 rounded-full blur-md opacity-70 group-hover:opacity-100 transition-opacity" />
        </div>
      </motion.div>
    );
  }
}


function UserItem({ u, selected, onClick }) {
    const isSelected = selected;
    return (
        <motion.button
            {...scaleTap}
            variants={bounceIn}
            onClick={onClick}
            className={`flex items-center gap-4 w-full p-3 rounded-lg border transition-all duration-300 relative overflow-hidden group ${
                isSelected
                ? "bg-cyan-500/30 border-cyan-400 shadow-[0_0_15px_rgba(0,246,255,0.5)]"
                : "bg-black/30 border-[var(--border-color)] hover:bg-cyan-500/10"
            }`}
        >
            <motion.div
                className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg"
            >
                <User size={18} />
            </motion.div>

            <div className="text-left flex-1">
                <div className="font-bold tracking-wider">{u.username}</div>
                <div className="text-xs text-cyan-300/70 truncate font-mono">{u.walletAddress}</div>
            </div>

            <div
                className={`w-3 h-3 rounded-full shadow-lg transition-all ${isSelected ? 'bg-green-400 shadow-green-400/50' : 'bg-slate-500'}`}
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
            />
        </motion.button>
    );
}

// --------------------------- Main App ---------------------------
export default function App() {
  const [step, setStep] = useState("connect");
  const [connectedAddress, setConnectedAddress] = useState("");
  const [balances, setBalances] = useState(null);
  const [loadingBalances, setLoadingBalances] = useState(false);
  const [manualAddress, setManualAddress] = useState("");
  const [form, setForm] = useState({ username: "", password: "", email: "", phone: "", dob: "" });
  const [formErrors, setFormErrors] = useState({});
  const [session, setSession] = useState(null); // Stores { user: {...}, token: "..." }
  const [partner, setPartner] = useState(null);
  const [message, setMessage] = useState("");
  const [users, setUsers] = useState([]);
  const [msgs, setMsgs] = useState([]);

  const messagesEndRef = useRef(null);

  const thread = msgs.filter(
    (m) =>
      (m.sender === session?.user?.username && m.receiver === partner?.username) ||
      (m.sender === partner?.username && m.receiver === session?.user?.username)
  );

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [thread]);


  // --------------------------- Form Validation Logic ---------------------------
  const validateForm = (currentForm = form) => {
    const errors = {};

    Object.keys(currentForm).forEach(field => {
      // Wallet address is handled separately when connecting/registering
      if (field === "walletAddress") return;

      if (validators[field]) {
        const error = validators[field](currentForm[field]);
        if (error) {
          errors[field] = error;
        }
      }
    });

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const isFormValid = () => {
    let isValid = true;
    const errors = {};
    Object.keys(form).forEach(field => {
        if (validators[field]) {
            const error = validators[field](form[field]);
            if (error) {
                isValid = false;
                errors[field] = error;
            }
        } else if (form[field].trim() === '' && field !== 'phone' && field !== 'dob') { // Mark required non-validated fields as invalid if empty
            isValid = false;
            errors[field] = `${field} is required`;
        }
    });
    setFormErrors(errors); // Update errors state for visual feedback
    return isValid;    // --------------------------- Load users and messages ---------------------------
    const loadUsers = useCallback(async () => {
        if (!session?.token) {
            console.log("No session token, skipping loadUsers.");
            return;
        }
        try {
            const usersData = await api.getUsers();
            if (Array.isArray(usersData)) {
                setUsers(usersData);
            } else {
                console.error("API returned non-array for users:", usersData);
                setUsers([]);
                // If token is invalid, force logout
                if (usersData.message === "Invalid or expired token") {
                    alert("Your session has expired. Please log in again.");
                    handleLogout();
                }
            }
        } catch (error) {
            console.error("Failed to load users:", error);
            setUsers([]);
        }
    }, [session?.token]); // Dependency on session.token

    const loadMessages = useCallback(async () => {
        if (!session?.token || !partner) {
            console.log("No session token or partner, skipping loadMessages.");
            return;
        }
        try {
            const messagesData = await api.getMessages(session.user.username, partner.username);
            if (Array.isArray(messagesData)) {
                setMsgs(messagesData);
            } else {
                console.error("API returned non-array for messages:", messagesData);
                setMsgs([]);
                if (messagesData.message === "Invalid or expired token") {
                    alert("Your session has expired. Please log in again.");
                    handleLogout();
                }
            }
        } catch (error) {
            console.error("Failed to load messages:", error);
            setMsgs([]);
        }
    }, [session?.token, session?.user?.username, partner]); // Dependencies on session.token, session.user.username, partner

    useEffect(() => {
        if (session?.token) {
            loadUsers();
        }
    }, [session?.token, loadUsers]);

    useEffect(() => {
        if (session && partner) {
            loadMessages();
        }
    }, [session, partner, loadMessages]);

    // --------------------------- Restore session ---------------------------
    useEffect(() => {
        const savedAuth = AuthStorage.getAuth();
        if (savedAuth?.address) {
            setConnectedAddress(savedAuth.address);
            fetchBalances(savedAuth.address);

            if (savedAuth.user && savedAuth.token) {
                // Validate that the user still exists in the system
                api.getUsers().then(usersData => {
                    const userExists = Array.isArray(usersData) && usersData.some(u => u.username === savedAuth.user.username);
                    if (userExists) {
                        setSession({ user: savedAuth.user, token: savedAuth.token });
                        setStep("chat");
                    } else {
                        // User doesn't exist anymore or token is invalid, clear user/token from auth but keep wallet
                        AuthStorage.setAuth({
                            address: savedAuth.address,
                            signature: savedAuth.signature,
                            challenge: savedAuth.challenge,
                            ts: savedAuth.ts
                        });
                        setStep("chooseAuth");
                    }
                }).catch((err) => {
                    console.error("Error validating session on backend:", err);
                    // If backend is unreachable or token is invalid, clear session
                    AuthStorage.setAuth({
                        address: savedAuth.address,
                        signature: savedAuth.signature,
                        challenge: savedAuth.challenge,
                        ts: savedAuth.ts
                    });
                    setStep("chooseAuth");
                });
            } else {
                setStep("chooseAuth");
            }
        }
    }, []);


    // --------------------------- Switch to BSC Network ---------------------------
    async function switchToBSC() {
        if (typeof window.ethereum === "undefined") return false;

        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: BSC_MAINNET.chainId }],
            });
            return true;
        } catch (switchError) {
            if (switchError.code === 4902) {
                try {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [BSC_MAINNET],
                    });
                    return true;
                } catch (addError) {
                    console.error('Failed to add BSC network:', addError);
                    return false;
                }
            }
            console.error('Failed to switch to BSC network:', switchError);
            return false;
        }
    }

    // --------------------------- Fetch balances (FINAL, ROBUST VERSION) ---------------------------
    const fetchBalances = useCallback(async (addr) => {
        if (!addr) return;
        setLoadingBalances(true);
        setBalances(null);

        const getCorrectProvider = async () => {
            const publicRpcProvider = new ethers.JsonRpcProvider(BSC_MAINNET.rpcUrls[0]);
            if (typeof window.ethereum === 'undefined' || !window.ethereum.isConnected()) {
                return publicRpcProvider;
            }

            const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
            if (currentChainId !== BSC_MAINNET.chainId) {
                try {
                    await switchToBSC();
                    // Give the wallet a moment to process the network change
                    await new Promise(resolve => setTimeout(resolve, 500));
                } catch (error) {
                    alert("Please switch to BNB Smart Chain to see live balances.");
                    return null; // Indicate failure to switch
                }
            }
            return new ethers.BrowserProvider(window.ethereum);
        };

        try {
            const provider = await getCorrectProvider();
            if (!provider) {
                setLoadingBalances(false);
                return; // Stop execution if provider couldn't be obtained
            }

            const balanceResults = { BNB: "0.0000" /* , USDT: "0.00", USDC: "0.00" */ }; // Removed USDT/USDC for now

            // Create an array of promises to fetch all balances concurrently
            const promises = [
                // BNB Balance Promise
                provider.getBalance(addr).then(balance => {
                    balanceResults.BNB = parseFloat(ethers.formatEther(balance)).toFixed(4);
                }).catch(err => {
                    console.error("Error fetching BNB balance:", err);
                    balanceResults.BNB = "Error";
                }),

                // ERC20 Token Balance Promises (Commented out for now)
                /*
                ...Object.entries(TOKENS).map(([symbol, address]) => (async () => {
                    try {
                        const contract = new ethers.Contract(address, ERC20_ABI, provider);
                        const [balance, decimals] = await Promise.all([
                            contract.balanceOf(addr),
                            contract.decimals()
                        ]);
                        balanceResults[symbol] = parseFloat(ethers.formatUnits(balance, decimals)).toFixed(2);
                    } catch (err) {
                        console.error(`Error fetching ${symbol} balance:`, err);
                        balanceResults[symbol] = "Error";
                    }
                })())
                */
            ];

            // Wait for all balance fetches to settle
            await Promise.all(promises);

            setBalances(balanceResults);

        } catch (error) {
            console.error("A critical error occurred in fetchBalances:", error);
            setBalances({ BNB: "Error" /*, USDT: "Error", USDC: "Error"*/ });
        } finally {
            setLoadingBalances(false);
        }
    }, []);

    // --------------------------- Connect MetaMask ---------------------------
    async function connectMetaMask() {
        if (typeof window.ethereum !== "undefined") {
            try {
                const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                if (accounts.length === 0) {
                    alert("Please connect at least one account in MetaMask.");
                    return;
                }
                const addr = accounts[0];

                // Ensure user is on BSC before proceeding with signature
                await switchToBSC();

                const provider = new ethers.BrowserProvider(window.ethereum);
                const challenge = `SecureChat authentication\nAddress: ${addr}\nTime: ${Date.now()}`;
                const signer = await provider.getSigner();
                const signature = await signer.signMessage(challenge);

                const authData = { address: addr, signature, challenge, ts: Date.now() };
                AuthStorage.setAuth(authData); // Save basic wallet info

                setConnectedAddress(addr);
                fetchBalances(addr);
                setStep("chooseAuth");

                // Event listeners for MetaMask changes
                const handleAccountsChanged = (accs) => {
                    if (accs.length === 0) {
                        handleLogout();
                    } else {
                        const newAddr = accs[0];
                        setConnectedAddress(newAddr);
                        fetchBalances(newAddr);

                        // Update stored auth with new address but preserve user session
                        const currentAuth = AuthStorage.getAuth();
                        if (currentAuth) {
                            AuthStorage.setAuth({
                                ...currentAuth,
                                address: newAddr
                            });
                        }
                    }
                };
                const handleChainChanged = () => {
                    if (connectedAddress) fetchBalances(connectedAddress);
                };

                // Clear previous listeners to prevent duplicates
                window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
                window.ethereum.removeListener("chainChanged", handleChainChanged);

                window.ethereum.on("accountsChanged", handleAccountsChanged);
                window.ethereum.on("chainChanged", handleChainChanged);

            } catch (err) {
                console.error("MetaMask connection/signature failed:", err);
                if (err.code === 4001) {
                    alert("You rejected the connection request. Please try again.");
                } else {
                    alert("Failed to connect to MetaMask. Please make sure it's unlocked.");
                }
            }
        } else {
            alert("MetaMask not detected. Please install MetaMask from https://metamask.io/");
        }
    }

    // --------------------------- Manual connect ---------------------------
    function connectManual() {
        const validationError = validators.walletAddress(manualAddress);
        if (validationError) {
            alert(validationError);
            return;
        }

        const addr = manualAddress.trim();
        setConnectedAddress(addr);
        AuthStorage.setAuth({ address: addr, ts: Date.now() }); // Only store address for manual connect
        fetchBalances(addr);
        setStep("chooseAuth");
    }

    // Comprehensive session cleanup
    function clearAllSessionData() {
        setSession(null);
        setPartner(null);
        setUsers([]);
        setMsgs([]);
        setMessage("");
        setForm({ username: "", password: "", email: "", phone: "", dob: "" });
        setFormErrors({});
    }

    // Comprehensive wallet cleanup
    function clearWalletData() {
        setConnectedAddress("");
        setManualAddress("");
        setBalances(null);
        setLoadingBalances(false);
    }

    function handleLogout() {
        AuthStorage.clearAuth();
        clearAllSessionData();
        clearWalletData();
        setStep("connect");
    }

    function handleDisconnect() {
        AuthStorage.clearAuth();
        clearAllSessionData();
        clearWalletData();
        setStep("connect");
    }

    // Navigation handler that clears form when moving between auth steps
    function navigateToStep(newStep) {
        // Clear form data when navigating between authentication steps
        if (["register", "login"].includes(step) && ["register", "login", "chooseAuth"].includes(newStep)) {
            setForm({ username: "", password: "", email: "", phone: "", dob: "" });
            setFormErrors({});
        }

        // Clear session data if going back to auth selection
        if (newStep === "chooseAuth" && session) {
            clearAllSessionData();
            const auth = AuthStorage.getAuth();
            if (auth) {
                AuthStorage.setAuth({ address: auth.address, signature: auth.signature, challenge: auth.challenge, ts: auth.ts });
            }
        }

        setStep(newStep);
    }

    // --------------------------- Auth + Chat logic ---------------------------
    async function register() {
        if (!isFormValid()) { // Use isFormValid to check all fields
            alert("Please fix all validation errors before registering.");
            return;
        }
        if (!connectedAddress) {
            alert("Please connect your wallet first.");
            return;
        }

        try {
            const result = await api.register({
                ...form,
                walletAddress: connectedAddress
            });

            if (result.success) {
                alert("Registration successful! Please login.");
                // Clear form and navigate to login
                setForm({ username: "", password: "", email: "", phone: "", dob: "" });
                setFormErrors({});
                setStep("login");
                await loadUsers(); // Load users after successful registration (optional, but good for immediate display)
            } else {
                alert(result.message || "Registration failed");
            }
        } catch (error) {
            console.error("Registration error:", error);
            alert("Registration failed. Please try again.");
        }
    }

    async function login() {
        // Basic validation for login fields
        const usernameError = validators.username(form.username);
        const passwordError = validators.password(form.password);

        if (usernameError || passwordError) {
            alert("Please enter valid username and password.");
            setFormErrors(prev => ({ ...prev, username: usernameError, password: passwordError }));
            return;
        }

        try {
            const result = await api.login({
                username: form.username,
                password: form.password
            });

            if (result.success && result.user && result.token) {
                const currentAuth = AuthStorage.getAuth();
                AuthStorage.setAuth({ ...currentAuth, user: result.user, token: result.token });
                setSession({ user: result.user, token: result.token }); // Update session state

                // Clear form data after successful login
                setForm({ username: "", password: "", email: "", phone: "", dob: "" });
                setFormErrors({});
                setStep("chat");
            } else {
                alert(result.message || "Invalid credentials");
            }
        } catch (error) {
            console.error("Login error:", error);
            alert("Login failed. Please try again.");
        }
    }


    async function sendMsg() {
        if (!message.trim() || !partner || !session?.token) return;

        try {
            const result = await api.sendMessage({
                sender: session.user.username,
                receiver: partner.username,
                text: message.trim(),
                txHash: dummyHash() // Placeholder for blockchain hash
            });

            if (result.success) {
                setMessage("");
                await loadMessages(); // Reload messages to see the new one
            } else {
                alert(result.message || "Failed to send message");
            }
        } catch (error) {
            console.error("Send message error:", error);
            alert("Failed to send message. Please try again.");
        }
    }

    async function clearAllUsers() {
        if (window.confirm("Are you sure? This will delete ALL registered users and messages. This action cannot be undone.")) {
            try {
                await api.deleteAllUsers();
                await api.deleteAllMessages();
                setUsers([]);
                setMsgs([]);
                // Clear current session and return to auth selection
                clearAllSessionData();
                const auth = AuthStorage.getAuth();
                if (auth) {
                    AuthStorage.setAuth({ address: auth.address, signature: auth.signature, challenge: auth.challenge, ts: auth.ts });
                }
                setStep("chooseAuth");
            } catch (error) {
                console.error("Clear all users error:", error);
                alert("Failed to clear users. Please try again.");
            }
        }
    }

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    // --------------------------- Main Render ---------------------------
    return (
        <div className="min-h-screen w-full bg-[#0a0a14] text-slate-100 flex flex-col items-center py-10 px-4 relative overflow-hidden">
            <FuturisticStyles />
            <div className="animated-grid" />

            <div className="w-full max-w-7xl relative z-10">
                <Navbar
                    title="Cyber Secure Chat"
                    onBack={step === "chooseAuth" && connectedAddress ? handleDisconnect : (
                        (step !== "connect" && step !== "chat") ? () => navigateToStep("chooseAuth") : null
                    )}
                    onLogout={session ? handleLogout : null}
                    user={session?.user}
                    walletAddress={connectedAddress}
                    balances={balances}
                    loadingBalances={loadingBalances}
                />

                <main className="mt-8">
                    <AnimatePresence mode="wait">
                        {step === "connect" && (
                            <motion.div key="connect" className="flex justify-center">
                                <Card title="Initialize Connection">
                                    <p className="mb-6 text-sm text-center text-slate-400">
                                        Connect your wallet to enter the secure network.
                                    </p>
                                    <motion.div
                                        className="space-y-4"
                                        variants={staggerList}
                                        initial="hidden"
                                        animate="visible"
                                    >
                                        <motion.div variants={bounceIn}>
                                            <Button onClick={connectMetaMask} className="w-full">Connect with MetaMask</Button>
                                        </motion.div>
                                        <div className="text-center my-2 text-slate-500">OR</div>
                                        <motion.div variants={bounceIn} className="flex gap-3">
                                            <ValidatedInput
                                                type="text"
                                                placeholder="Manual Wallet Address"
                                                value={manualAddress}
                                                onChange={(e) => setManualAddress(e.target.value)}
                                                validator={validators.walletAddress}
                                                className="flex-1"
                                            />
                                            <Button
                                                onClick={connectManual}
                                                variant="secondary"
                                                disabled={!manualAddress.trim() || !!validators.walletAddress(manualAddress)} // Disable if invalid
                                            >
                                                Link
                                            </Button>
                                        </motion.div>
                                    </motion.div>
                                </Card>
                            </motion.div>
                        )}

                        {step === "chooseAuth" && (
                            <motion.div key="chooseAuth" className="flex justify-center">
                                <Card title="Authentication">
                                    <p className="mb-6 text-sm text-center text-slate-400">
                                        Wallet linked: <span className="font-mono text-[var(--primary-glow)]">{connectedAddress}</span>.
                                        Register a new profile or log in to an existing one.
                                    </p>
                                    <motion.div className="flex gap-4">
                                        <div className="flex-1">
                                            <Button className="w-full" onClick={() => navigateToStep("register")}>
                                                Register
                                            </Button>
                                        </div>
                                        <div className="flex-1">
                                            <Button className="w-full" variant="secondary" onClick={() => navigateToStep("login")}>
                                                Login
                                            </Button>
                                        </div>
                                    </motion.div>
                                </Card>
                            </motion.div>
                        )}

                        {step === "register" && (
                            <motion.div key="register" className="flex justify-center">
                                <Card title="Create Profile">
                                    <motion.div variants={staggerList} initial="hidden" animate="visible" className="space-y-4">
                                        <motion.div variants={fadeInUp}>
                                            <ValidatedInput
                                                name="username"
                                                value={form.username}
                                                onChange={handleChange}
                                                placeholder="Username"
                                                validator={validators.username}
                                            />
                                        </motion.div>
                                        <motion.div variants={fadeInUp}>
                                            <ValidatedInput
                                                name="password"
                                                type="password"
                                                value={form.password}
                                                onChange={handleChange}
                                                placeholder="Password"
                                                validator={validators.password}
                                            />
                                        </motion.div>
                                        <motion.div variants={fadeInUp}>
                                            <ValidatedInput
                                                name="email"
                                                type="email"
                                                value={form.email}
                                                onChange={handleChange}
                                                placeholder="Email"
                                                validator={validators.email}
                                            />
                                        </motion.div>
                                        <motion.div variants={fadeInUp}>
                                            <ValidatedInput
                                                name="phone"
                                                type="tel"
                                                value={form.phone}
                                                onChange={handleChange}
                                                placeholder="Phone Number (Optional)"
                                                validator={validators.phone}
                                            />
                                        </motion.div>
                                        <motion.div variants={fadeInUp}>
                                            <ValidatedInput
                                                name="dob"
                                                type="date"
                                                value={form.dob}
                                                onChange={handleChange}
                                                placeholder="Date of Birth (Optional)"
                                                validator={validators.dob}
                                            />
                                        </motion.div>
                                        <motion.div variants={bounceIn}>
                                            <Button
                                                onClick={register}
                                                className="w-full"
                                                disabled={!isFormValid()}
                                            >
                                                Create Profile
                                            </Button>
                                        </motion.div>
                                    </motion.div>
                                </Card>
                            </motion.div>
                        )}

                        {step === "login" && (
                            <motion.div key="login" className="flex justify-center">
                                <Card title="Login">
                                    <motion.div variants={staggerList} initial="hidden" animate="visible" className="space-y-4">
                                        <motion.div variants={fadeInUp}>
                                            <ValidatedInput
                                                name="username"
                                                value={form.username}
                                                onChange={handleChange}
                                                placeholder="Username"
                                                validator={validators.username}
                                            />
                                        </motion.div>
                                        <motion.div variants={fadeInUp}>
                                            <ValidatedInput
                                                name="password"
                                                type="password"
                                                value={form.password}
                                                onChange={handleChange}
                                                placeholder="Password"
                                                validator={validators.password}
                                            />
                                        </motion.div>
                                        <motion.div variants={bounceIn}>
                                            <Button
                                                onClick={login}
                                                className="w-full flex items-center justify-center gap-2"
                                                disabled={!form.username.trim() || !form.password.trim() || !!validators.username(form.username) || !!validators.password(form.password)}
                                            >
                                                <Unlock size={18} /> Access
                                            </Button>
                                        </motion.div>
                                    </motion.div>
                                </Card>
                            </motion.div>
                        )}

                        {step === "chat" && session?.user && (
                            <motion.div key="chat" className="grid lg:grid-cols-3 gap-6 w-full" variants={staggerList} initial="hidden" animate="visible">
                                <motion.div variants={slideInLeft}>
                                    <Card
                                        title="Contacts"
                                        footer={
                                            <motion.div variants={bounceIn}>
                                                <Button onClick={clearAllUsers} variant="danger" className="w-full">
                                                    Clear All Users & Chats
                                                </Button>
                                            </motion.div>
                                        }
                                    >
                                        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                                            {users
                                                .filter((u) => u.username !== session.user.username)
                                                .map((u) => (
                                                    <UserItem key={u.username} u={u} selected={partner?.username === u.username} onClick={() => setPartner(u)} />
                                                ))}
                                            {users.filter((u) => u.username !== session.user.username).length === 0 && (
                                                <p className="text-slate-400 text-center py-4">No other users found. Invite someone!</p>
                                            )}
                                        </div>
                                    </Card>
                                </motion.div>

                                <motion.div variants={fadeInUp} className="lg:col-span-2">
                                    <Card title={partner ? `Channel: ${partner.username}` : "Select Contact"}>
                                        <div className="h-[50vh] overflow-y-auto space-y-2 mb-6 pr-2 bg-black/20 rounded-lg p-4 border border-[var(--border-color)]">
                                            <AnimatePresence>
                                                {partner ? (
                                                    thread.length ? (
                                                        <motion.div variants={staggerList} initial="hidden" animate="visible" className="space-y-2">
                                                            {thread.map((m, index) => (
                                                                <MessageBubble key={m._id || index} m={m} currentUser={session.user.username} />
                                                            ))}
                                                            <div ref={messagesEndRef} /> {/* Scroll to bottom ref */}
                                                        </motion.div>
                                                    ) : (
                                                        <div className="flex flex-col items-center justify-center h-full text-center">
                                                            <p className="text-slate-400">No messages. Start the conversation.</p>
                                                        </div>
                                                    )
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center h-full text-center">
                                                        <p className="text-slate-400">Choose a contact to begin secure chat.</p>
                                                    </div>
                                                )}
                                            </AnimatePresence>
                                        </div>


                                        {partner && (
                                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex gap-3">
                                                <input
                                                    className="flex-1 px-4 py-3 rounded-lg cyber-input"
                                                    placeholder={`Message ${partner.username}...`}
                                                    value={message}
                                                    onChange={(e) => setMessage(e.target.value)}
                                                    onKeyDown={(e) => { if (e.key === "Enter") sendMsg(); }}
                                                />
                                                <Button onClick={sendMsg} className="px-4" disabled={!message.trim()}>
                                                    <Send size={18} />
                                                </Button>
                                            </motion.div>
                                        )}
                                    </Card>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </main>
            </div>
        </div>
    );
}
import React, { useState, useEffect } from "react";
import { User, Send, LogOut, Wallet as WalletIcon, Unlock, ArrowLeft } from 'lucide-react';

// In-Memory Storage (No localStorage for Vercel compatibility)
let authStorage = null;

const AuthStorage = {
  getAuth: () => authStorage,
  setAuth: (auth) => { authStorage = auth; },
  clearAuth: () => { authStorage = null; },
};

// Backend API wrapper
const API_BASE = "https://chatbackend-ziin.onrender.com/api";

const api = {
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

  getUsers: async () => {
    const response = await fetch(`${API_BASE}/users`);
    return response.json();
  },

  deleteAllUsers: async () => {
    const response = await fetch(`${API_BASE}/users`, { method: 'DELETE' });
    return response.json();
  },

  getMessages: async (u1, u2) => {
    const response = await fetch(`${API_BASE}/messages/${u1}/${u2}`);
    return response.json();
  },

  sendMessage: async (messageData) => {
    const response = await fetch(`${API_BASE}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messageData)
    });
    return response.json();
  },

  deleteAllMessages: async () => {
    const response = await fetch(`${API_BASE}/messages`, { method: 'DELETE' });
    return response.json();
  }
};

// Form Validation Functions
const validators = {
  username: (value) => {
    if (!value || value.trim().length === 0) return "Username is required";
    if (value.trim().length < 3) return "Username must be at least 3 characters";
    if (!/^[a-zA-Z0-9_]+$/.test(value.trim())) return "Username can only contain letters, numbers, and underscores";
    return null;
  },

  password: (value) => {
    if (!value) return "Password is required";
    if (value.length < 8) return "Password must be at least 8 characters";
    if (!/(?=.*[a-z])/.test(value)) return "Password must contain at least one lowercase letter";
    if (!/(?=.*[A-Z])/.test(value)) return "Password must contain at least one uppercase letter";
    if (!/(?=.*\d)/.test(value)) return "Password must contain at least one number";
    return null;
  },

  email: (value) => {
    if (!value || value.trim().length === 0) return "Email is required";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value.trim())) return "Please enter a valid email address";
    return null;
  },

  phone: (value) => {
    if (!value || value.trim().length === 0) return "Phone number is required";
    const phoneRegex = /^\d{10}$/;
    const cleanPhone = value.replace(/\D/g, '');
    if (!phoneRegex.test(cleanPhone)) return "Phone number must be exactly 10 digits";
    return null;
  },

  dob: (value) => {
    if (!value) return "Date of birth is required";
    return null;
  },

  walletAddress: (value) => {
    if (!value || value.trim().length === 0) return "Wallet address is required";
    if (!/^0x[a-fA-F0-9]{40}$/.test(value.trim())) return "Please enter a valid Ethereum address";
    return null;
  }
};

const dummyHash = () => "0x" + Math.random().toString(16).slice(2).padEnd(64, "0");

// UI Components
function Button({ children, className = "", variant = "primary", onClick, disabled, ...props }) {
    const getButtonClass = () => {
        const base = "px-6 py-3 rounded-lg font-bold text-white transition-all duration-300 border";
        switch(variant) {
            case 'secondary':
                return `${base} bg-pink-600 border-pink-500 hover:bg-pink-500 ${className}`;
            case 'danger':
                return `${base} bg-red-600 border-red-500 hover:bg-red-500 ${className}`;
            default:
                return `${base} bg-cyan-600 border-cyan-500 hover:bg-cyan-500 ${className}`;
        }
    };

    return (
        <button
            className={getButtonClass()}
            onClick={onClick}
            disabled={disabled}
            style={{ opacity: disabled ? 0.5 : 1 }}
            {...props}
        >
            {children}
        </button>
    );
}

function ValidatedInput({ name, type = "text", placeholder, value, onChange, validator, className = "" }) {
  const [error, setError] = useState("");
  const [touched, setTouched] = useState(false);

  const handleChange = (e) => {
    onChange(e);
    if (touched && validator) {
      const validationError = validator(e.target.value);
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

  const inputClass = `w-full px-4 py-3 rounded-lg bg-slate-800 border text-white ${
    touched && error ? 'border-red-500' : 'border-slate-600'
  } ${className}`;

  return (
    <div className="w-full">
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        className={inputClass}
      />
      {touched && error && (
        <span className="text-red-400 text-sm mt-1 block">{error}</span>
      )}
      {touched && !error && value && (
        <span className="text-green-400 text-sm mt-1 block">✓ Valid</span>
      )}
    </div>
  );
}

function Navbar({ title, onBack, onLogout, user }) {
  return (
    <div className="w-full max-w-7xl mb-8">
      <div className="flex items-center justify-center relative bg-slate-900 p-4 rounded-lg border border-slate-700">
        {onBack && (
          <button
            onClick={onBack}
            className="absolute left-4 flex items-center gap-2 text-cyan-400 hover:text-white px-3 py-2 rounded-lg"
          >
            <ArrowLeft size={20} /> Back
          </button>
        )}
        
        <h1 className="text-3xl font-bold flex items-center gap-4 text-cyan-400">
          <WalletIcon size={32} />
          {title}
        </h1>
        
        {user && (
          <button
            onClick={onLogout}
            className="absolute right-4 flex items-center gap-2 text-pink-400 hover:text-white px-3 py-2 rounded-lg"
          >
            <LogOut size={20} /> Logout
          </button>
        )}
      </div>
    </div>
  );
}

function Card({ title, children, footer }) {
  return (
    <div className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-2xl p-6">
      {title && (
        <h2 className="text-2xl font-bold mb-6 text-center text-cyan-400">
          {title}
        </h2>
      )}
      
      <div>{children}</div>
      
      {footer && (
        <div className="mt-6">{footer}</div>
      )}
    </div>
  );
}

function MessageBubble({ m, currentUser }) {
  const isSentByMe = m.sender === currentUser;

  if (isSentByMe) {
    return (
      <div className="w-full flex justify-end mb-4">
        <div className="max-w-md p-4 rounded-2xl bg-cyan-600 text-white shadow-lg">
          <p className="text-sm break-words">{m.text}</p>
          <span className="text-xs opacity-70 mt-2 block text-right">
            {new Date(m.createdAt || Date.now()).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
        </div>
      </div>
    );
  } else {
    return (
      <div className="w-full flex justify-start mb-4">
        <div className="max-w-md p-4 rounded-2xl bg-slate-700 text-white shadow-lg">
          <p className="text-sm font-bold text-pink-400 mb-2">{m.sender}</p>
          <p className="text-sm break-words">{m.text}</p>
          <span className="text-xs opacity-70 mt-2 block text-right">
            {new Date(m.createdAt || Date.now()).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
        </div>
      </div>
    );
  }
}

function UserItem({ u, selected, onClick }) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-4 w-full p-3 rounded-lg border transition-all duration-300 ${
                selected
                ? "bg-cyan-600 border-cyan-400 text-white"
                : "bg-slate-800 border-slate-600 hover:bg-slate-700 text-white"
            }`}
        >
            <div className="w-10 h-10 rounded-full bg-cyan-500 flex items-center justify-center text-white">
                <User size={18} />
            </div>
            
            <div className="text-left flex-1">
                <div className="font-bold">{u.username}</div>
                <div className="text-xs opacity-70 truncate">{u.walletAddress}</div>
            </div>
            
            <div className={`w-3 h-3 rounded-full ${selected ? 'bg-green-400' : 'bg-slate-500'}`} />
        </button>
    );
}

// Main App Component
export default function App() {
  const [step, setStep] = useState("connect");
  const [connectedAddress, setConnectedAddress] = useState("");
  const [manualAddress, setManualAddress] = useState("");
  const [form, setForm] = useState({ username: "", password: "", email: "", phone: "", dob: "" });
  const [session, setSession] = useState(null);
  const [partner, setPartner] = useState(null);
  const [message, setMessage] = useState("");
  const [users, setUsers] = useState([]);
  const [msgs, setMsgs] = useState([]);

  const thread = msgs.filter(
    (m) =>
      (m.sender === session?.username && m.receiver === partner?.username) ||
      (m.sender === partner?.username && m.receiver === session?.username)
  );

  const validateForm = () => {
    return Object.keys(form).every(field => {
      if (!validators[field]) return true;
      return !validators[field](form[field]);
    }) && Object.values(form).every(value => value.trim() !== '');
  };

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (session && partner) {
      loadMessages();
    }
  }, [session, partner]);

  const loadUsers = async () => {
    try {
      const usersData = await api.getUsers();
      setUsers(Array.isArray(usersData) ? usersData : []);
    } catch (error) {
      console.error("Failed to load users:", error);
      setUsers([]);
    }
  };

  const loadMessages = async () => {
    if (!session || !partner) return;
    try {
      const messagesData = await api.getMessages(session.username, partner.username);
      setMsgs(Array.isArray(messagesData) ? messagesData : []);
    } catch (error) {
      console.error("Failed to load messages:", error);
      setMsgs([]);
    }
  };

  const connectMetaMask = async () => {
    if (typeof window.ethereum !== "undefined") {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts.length === 0) {
          alert("Please connect at least one account in MetaMask.");
          return;
        }
        const addr = accounts[0];
        AuthStorage.setAuth({ address: addr, ts: Date.now() });
        setConnectedAddress(addr);
        setStep("chooseAuth");
      } catch (err) {
        console.error("MetaMask connection failed:", err);
        alert("Failed to connect to MetaMask. Please try again.");
      }
    } else {
      alert("MetaMask not detected. Please install MetaMask.");
    }
  };

  const connectManual = () => {
    const validationError = validators.walletAddress(manualAddress);
    if (validationError) {
      alert(validationError);
      return;
    }
    const addr = manualAddress.trim();
    setConnectedAddress(addr);
    AuthStorage.setAuth({ address: addr, ts: Date.now() });
    setStep("chooseAuth");
  };

  const clearAllSessionData = () => {
    setSession(null);
    setPartner(null);
    setUsers([]);
    setMsgs([]);
    setMessage("");
    setForm({ username: "", password: "", email: "", phone: "", dob: "" });
  };

  const clearWalletData = () => {
    setConnectedAddress("");
    setManualAddress("");
  };

  const handleLogout = () => {
    AuthStorage.clearAuth();
    clearAllSessionData();
    clearWalletData();
    setStep("connect");
  };

  const handleDisconnect = () => {
    AuthStorage.clearAuth();
    clearAllSessionData();
    clearWalletData();
    setStep("connect");
  };

  const navigateToStep = (newStep) => {
    if ((step === "register" || step === "login") && (newStep === "register" || newStep === "login" || newStep === "chooseAuth")) {
      setForm({ username: "", password: "", email: "", phone: "", dob: "" });
    }
    
    if (newStep === "chooseAuth" && session) {
      clearAllSessionData();
      const auth = AuthStorage.getAuth();
      if (auth) {
        AuthStorage.setAuth({ address: auth.address, ts: auth.ts });
      }
    }
    
    setStep(newStep);
  };

  const register = async () => {
    if (!validateForm()) {
      alert("Please fix all validation errors before registering.");
      return;
    }

    try {
      const result = await api.register({
        ...form,
        walletAddress: connectedAddress
      });

      if (result.success) {
        alert("Registration successful! Please login.");
        setForm({ username: "", password: "", email: "", phone: "", dob: "" });
        setStep("login");
        await loadUsers();
      } else {
        alert(result.message || "Registration failed");
      }
    } catch (error) {
      console.error("Registration error:", error);
      alert("Registration failed. Please try again.");
    }
  };

  const login = async () => {
    const usernameError = validators.username(form.username);
    const passwordError = validators.password(form.password);
    
    if (usernameError || passwordError) {
      alert("Please enter valid username and password.");
      return;
    }

    try {
      const result = await api.login({
        username: form.username,
        password: form.password
      });

      if (result.success) {
        setSession(result.user);
        const auth = AuthStorage.getAuth();
        AuthStorage.setAuth({ ...auth, user: result.user });
        setForm({ username: "", password: "", email: "", phone: "", dob: "" });
        setStep("chat");
        await loadUsers();
      } else {
        alert(result.message || "Invalid credentials");
      }
    } catch (error) {
      console.error("Login error:", error);
      alert("Login failed. Please try again.");
    }
  };

  const sendMsg = async () => {
    if (!message.trim() || !partner) return;

    try {
      const result = await api.sendMessage({
        sender: session.username,
        receiver: partner.username,
        text: message.trim(),
        txHash: dummyHash()
      });

      if (result.success) {
        setMessage("");
        await loadMessages();
      } else {
        alert("Failed to send message");
      }
    } catch (error) {
      console.error("Send message error:", error);
      alert("Failed to send message. Please try again.");
    }
  };

  const clearAllUsers = async () => {
    if (window.confirm("Are you sure? This will delete ALL registered users and messages.")) {
      try {
        await api.deleteAllUsers();
        await api.deleteAllMessages();
        setUsers([]);
        setMsgs([]);
        clearAllSessionData();
        const auth = AuthStorage.getAuth();
        if (auth) {
          AuthStorage.setAuth({ address: auth.address, ts: auth.ts });
        }
        setStep("chooseAuth");
      } catch (error) {
        console.error("Clear all users error:", error);
        alert("Failed to clear users. Please try again.");
      }
    }
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  return (
    <div className="min-h-screen w-full bg-slate-900 text-white flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-7xl">
        <Navbar
          title="Cyber Secure Chat"
          onBack={step === "chooseAuth" ? handleDisconnect : (step !== "connect" && step !== "chat" ? () => navigateToStep("chooseAuth") : null)}
          onLogout={session ? handleLogout : null}
          user={session}
        />

        <main className="mt-8">
          {step === "connect" && (
            <div className="flex justify-center">
              <Card title="Initialize Connection">
                <p className="mb-6 text-sm text-center text-slate-400">
                  Connect your wallet to enter the secure network.
                </p>
                <div className="space-y-4">
                  <Button onClick={connectMetaMask} className="w-full">Connect with MetaMask</Button>
                  <div className="text-center my-2 text-slate-500">OR</div>
                  <div className="flex gap-3">
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
                      disabled={!manualAddress.trim() || validators.walletAddress(manualAddress)}
                    >
                      Link
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {step === "chooseAuth" && (
            <div className="flex justify-center">
              <Card title="Authentication">
                <p className="mb-6 text-sm text-center text-slate-400">
                  Wallet linked. Register a new profile or log in to an existing one.
                </p>
                <div className="flex gap-4">
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
                </div>
              </Card>
            </div>
          )}
          
          {step === "register" && (
            <div className="flex justify-center">
              <Card title="Create Profile">
                <div className="space-y-4">
                  <ValidatedInput
                    name="username"
                    value={form.username}
                    onChange={handleChange}
                    placeholder="Username"
                    validator={validators.username}
                  />
                  <ValidatedInput
                    name="password"
                    type="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Password"
                    validator={validators.password}
                  />
                  <ValidatedInput
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="Email"
                    validator={validators.email}
                  />
                  <ValidatedInput
                    name="phone"
                    type="tel"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="Phone Number"
                    validator={validators.phone}
                  />
                  <ValidatedInput
                    name="dob"
                    type="date"
                    value={form.dob}
                    onChange={handleChange}
                    placeholder="Date of Birth"
                    validator={validators.dob}
                  />
                  <Button 
                    onClick={register} 
                    className="w-full"
                    disabled={!validateForm()}
                  >
                    Create Profile
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {step === "login" && (
            <div className="flex justify-center">
              <Card title="Login">
                <div className="space-y-4">
                  <ValidatedInput
                    name="username" 
                    value={form.username} 
                    onChange={handleChange}
                    placeholder="Username"
                    validator={validators.username}
                  />
                  <ValidatedInput
                    name="password" 
                    type="password" 
                    value={form.password} 
                    onChange={handleChange}
                    placeholder="Password"
                    validator={validators.password}
                  />
                  <Button 
                    onClick={login} 
                    className="w-full flex items-center justify-center gap-2"
                    disabled={!form.username.trim() || !form.password.trim()}
                  >
                    <Unlock size={18} /> Access
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {step === "chat" && session && (
            <div className="grid lg:grid-cols-3 gap-6 w-full">
              <div>
                <Card 
                  title="Contacts"
                  footer={
                    <Button onClick={clearAllUsers} variant="danger" className="w-full">
                      Clear All Users & Chats
                    </Button>
                  }
                >
                  <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                    {users
                      .filter((u) => u.username !== session.username)
                      .map((u) => (
                        <UserItem key={u.username} u={u} selected={partner?.username === u.username} onClick={() => setPartner(u)} />
                      ))}
                  </div>
                </Card>
              </div>

              <div className="lg:col-span-2">
                <Card title={partner ? `Channel: ${partner.username}` : "Select Contact"}>
                  <div className="h-[50vh] overflow-y-auto space-y-2 mb-6 pr-2 bg-slate-800 rounded-lg p-4 border border-slate-600">
                    {partner ? (
                      thread.length ? (
                        <div className="space-y-2">
                          {thread.map((m, index) => (
                            <MessageBubble key={m._id || index} m={m} currentUser={session.username} />
                          ))}
                        </div>
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
                  </div>

                  {partner && (
                    <div className="flex gap-3">
                      <input
                        className="flex-1 px-4 py-3 rounded-lg bg-slate-800 border border-slate-600 text-white"
                        placeholder={`Message ${partner.username}...`}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") sendMsg(); }}
                      />
                      <Button onClick={sendMsg} className="px-4">
                        <Send size={18} />
                      </Button>
                    </div>
                  )}
                </Card>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
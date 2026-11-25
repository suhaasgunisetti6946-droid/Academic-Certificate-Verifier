/**
 * ==============================================================================
 * CertiChain - Blockchain Certificate Verifier Application Logic
 * ==============================================================================
 * 
 * Tech Stack:
 * - HTML5 / CSS3 (Dark Glassmorphism)
 * - Browser Web Crypto API (crypto.subtle.digest SHA-256)
 * - Ethers.js v6 for Ethereum Web3 RPC communication
 * - Zero Build Step: Ready for GitHub Pages hosting
 */

// ==============================================================================
// 1. SMART CONTRACT CONFIGURATION PLACEHOLDERS
// ==============================================================================
// NOTE FOR STUDENTS / EVALUATORS:
// After deploying contracts/CertificateVerifier.sol via Remix IDE on Sepolia,
// paste your deployed contract address below.
const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; 

// ABI (Application Binary Interface) of CertificateVerifier.sol
const CONTRACT_ABI = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "bytes32", "name": "docHash", "type": "bytes32" },
      { "indexed": false, "internalType": "string", "name": "studentName", "type": "string" },
      { "indexed": false, "internalType": "string", "name": "courseName", "type": "string" },
      { "indexed": false, "internalType": "uint256", "name": "issueDate", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "issuer", "type": "address" }
    ],
    "name": "CertificateIssued",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "bytes32", "name": "docHash", "type": "bytes32" },
      { "indexed": true, "internalType": "address", "name": "revokedBy", "type": "address" }
    ],
    "name": "CertificateRevoked",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "admin",
    "outputs": [
      { "internalType": "address", "name": "", "type": "address" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "bytes32", "name": "docHash", "type": "bytes32" },
      { "internalType": "string", "name": "studentName", "type": "string" },
      { "internalType": "string", "name": "courseName", "type": "string" }
    ],
    "name": "issueCertificate",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "bytes32", "name": "docHash", "type": "bytes32" }
    ],
    "name": "verifyCertificate",
    "outputs": [
      { "internalType": "string", "name": "studentName", "type": "string" },
      { "internalType": "string", "name": "courseName", "type": "string" },
      { "internalType": "uint256", "name": "issueDate", "type": "uint256" },
      { "internalType": "bool", "name": "isValid", "type": "bool" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "bytes32", "name": "docHash", "type": "bytes32" }
    ],
    "name": "revokeCertificate",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "newAdmin", "type": "address" }
    ],
    "name": "transferAdmin",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

// Target Network: Ethereum Sepolia Testnet (Chain ID 11155111 / 0xaa36a7)
const SEPOLIA_CHAIN_ID = "0xaa36a7";
const SEPOLIA_CHAIN_ID_DECIMAL = 11155111n;

// ==============================================================================
// 2. STATE & DOM ELEMENTS
// ==============================================================================
let provider = null;
let signer = null;
let userAccount = null;
let currentChainId = null;
let isDemoMode = false;

// Local mock storage key for Demo Mode
const DEMO_STORAGE_KEY = "certichain_demo_registry";

// Computed hash tracking
let currentIssueHash = null;
let currentVerifyHash = null;

// DOM Elements
const demoModeToggle = document.getElementById("demoModeToggle");
const demoToggleText = document.getElementById("demoToggleText");
const demoBanner = document.getElementById("demoBanner");
const loadSampleCertBtn = document.getElementById("loadSampleCertBtn");

const connectWalletBtn = document.getElementById("connectWalletBtn");
const walletBtnText = document.getElementById("walletBtnText");
const networkPill = document.getElementById("networkPill");
const networkDot = document.getElementById("networkDot");
const networkName = document.getElementById("networkName");

const tabButtons = document.querySelectorAll(".tab-btn");
const tabContents = document.querySelectorAll(".tab-content");

// Tab 1 Elements
const studentNameInput = document.getElementById("studentName");
const courseNameInput = document.getElementById("courseName");
const issueDropzone = document.getElementById("issueDropzone");
const issueFileInput = document.getElementById("issueFileInput");
const issueHashCard = document.getElementById("issueHashCard");
const issueFileName = document.getElementById("issueFileName");
const issueFileSize = document.getElementById("issueFileSize");
const issueHashCode = document.getElementById("issueHashCode");
const copyIssueHashBtn = document.getElementById("copyIssueHashBtn");
const btnIssueCert = document.getElementById("btnIssueCert");
const issueTxStatus = document.getElementById("issueTxStatus");
const issueTxMsg = document.getElementById("issueTxMsg");

// Tab 2 Elements
const verifyDropzone = document.getElementById("verifyDropzone");
const verifyFileInput = document.getElementById("verifyFileInput");
const verifyHashCard = document.getElementById("verifyHashCard");
const verifyFileName = document.getElementById("verifyFileName");
const verifyFileSize = document.getElementById("verifyFileSize");
const verifyHashCode = document.getElementById("verifyHashCode");
const copyVerifyHashBtn = document.getElementById("copyVerifyHashBtn");
const manualHashInput = document.getElementById("manualHashInput");
const btnVerifyCert = document.getElementById("btnVerifyCert");
const authenticResultCard = document.getElementById("authenticResultCard");
const tamperedResultCard = document.getElementById("tamperedResultCard");

const resStudentName = document.getElementById("resStudentName");
const resCourseName = document.getElementById("resCourseName");
const resIssueDate = document.getElementById("resIssueDate");
const resDocHash = document.getElementById("resDocHash");

// ==============================================================================
// 3. CRYPTOGRAPHIC HASHING (WEB CRYPTO API)
// ==============================================================================
/**
 * Computes SHA-256 hash client-side using browser native Web Crypto API.
 * Returns a 0x-prefixed 32-byte hex string (matches Solidity bytes32).
 * @param {ArrayBuffer} buffer - File buffer
 * @returns {Promise<string>} Hex formatted SHA-256 digest
 */
async function computeSHA256(buffer) {
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hexString = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  return "0x" + hexString;
}

/**
 * Helper to format byte sizes
 */
function formatBytes(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// ==============================================================================
// 4. METAMASK & WEB3 CONNECTION
// ==============================================================================
async function initEthers() {
  if (typeof window.ethereum !== "undefined") {
    provider = new ethers.BrowserProvider(window.ethereum);
    try {
      const accounts = await provider.send("eth_accounts", []);
      if (accounts.length > 0) {
        await handleAccountsChanged(accounts);
      }
      const network = await provider.getNetwork();
      handleChainChanged(network.chainId);

      // Metamask Event Listeners
      window.ethereum.on("accountsChanged", handleAccountsChanged);
      window.ethereum.on("chainChanged", () => window.location.reload());
    } catch (err) {
      console.warn("Wallet initialization check error:", err);
    }
  } else {
    console.log("No Ethereum browser extension detected. Demo mode available.");
  }
}

async function connectWallet() {
  if (isDemoMode) {
    alert("You are currently in Demo Mode. To connect MetaMask, toggle Demo Mode OFF in the top bar.");
    return;
  }

  if (typeof window.ethereum === "undefined") {
    const enableDemo = confirm(
      "MetaMask was not detected in your browser!\n\nWould you like to activate 'Demo Mode' to test credential hashing and verification immediately?"
    );
    if (enableDemo) {
      demoModeToggle.checked = true;
      toggleDemoMode(true);
    }
    return;
  }

  try {
    provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await provider.send("eth_requestAccounts", []);
    await handleAccountsChanged(accounts);

    // Verify network is Sepolia
    const network = await provider.getNetwork();
    if (network.chainId !== SEPOLIA_CHAIN_ID_DECIMAL) {
      await requestSwitchToSepolia();
    }
  } catch (error) {
    console.error("User rejected or error connecting wallet:", error);
    alert("Connection error: " + (error.message || error));
  }
}

async function requestSwitchToSepolia() {
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: SEPOLIA_CHAIN_ID }]
    });
  } catch (switchError) {
    // Error 4902: chain has not been added to MetaMask
    if (switchError.code === 4902) {
      try {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: SEPOLIA_CHAIN_ID,
              chainName: "Sepolia Test Network",
              nativeCurrency: { name: "Sepolia ETH", symbol: "ETH", decimals: 18 },
              rpcUrls: ["https://rpc.sepolia.org"],
              blockExplorerUrls: ["https://sepolia.etherscan.io"]
            }
          ]
        });
      } catch (addError) {
        console.error("Failed to add Sepolia network:", addError);
      }
    }
  }
}

async function handleAccountsChanged(accounts) {
  if (accounts.length === 0) {
    userAccount = null;
    signer = null;
    walletBtnText.textContent = "Connect MetaMask";
    connectWalletBtn.classList.remove("connected");
    updateNetworkStatus(false, "Disconnected");
  } else {
    userAccount = accounts[0];
    signer = await provider.getSigner();
    const truncated = `${userAccount.substring(0, 6)}...${userAccount.substring(userAccount.length - 4)}`;
    walletBtnText.textContent = truncated;
    connectWalletBtn.classList.add("connected");

    const network = await provider.getNetwork();
    handleChainChanged(network.chainId);
  }
}

function handleChainChanged(chainId) {
  currentChainId = chainId;
  if (chainId === SEPOLIA_CHAIN_ID_DECIMAL) {
    updateNetworkStatus(true, "Sepolia Testnet", "active");
  } else {
    updateNetworkStatus(true, `Wrong Network (${chainId})`, "warning");
  }
}

function updateNetworkStatus(connected, text, dotClass = "") {
  networkName.textContent = text;
  networkDot.className = "status-dot " + dotClass;
}

// ==============================================================================
// 5. DEMO MODE ENGINE (LOCAL SIMULATION FOR FACULTY EVALUATION)
// ==============================================================================
function initDemoRegistry() {
  let registry = localStorage.getItem(DEMO_STORAGE_KEY);
  if (!registry) {
    // Seed with a default pre-verified sample for instant testing
    const sampleRecord = {
      "0xe3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855": {
        studentName: "Aarav Patel",
        courseName: "B.Tech Computer Science (Honors in Blockchain)",
        issueDate: Math.floor(Date.now() / 1000) - 86400 * 30, // 30 days ago
        isValid: true,
        issuer: "0xInstitutionAdminDemo742"
      }
    };
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(sampleRecord));
  }
}

function toggleDemoMode(active) {
  isDemoMode = active;
  demoToggleText.textContent = `Demo Mode: ${isDemoMode ? "ON" : "OFF"}`;
  
  if (isDemoMode) {
    demoBanner.style.display = "flex";
    walletBtnText.textContent = "Demo Admin (0xDEMO...742)";
    connectWalletBtn.classList.add("connected");
    updateNetworkStatus(true, "Demo Network (Local)", "active");
  } else {
    demoBanner.style.display = "none";
    if (provider && userAccount) {
      const truncated = `${userAccount.substring(0, 6)}...${userAccount.substring(userAccount.length - 4)}`;
      walletBtnText.textContent = truncated;
    } else {
      walletBtnText.textContent = "Connect MetaMask";
      connectWalletBtn.classList.remove("connected");
      updateNetworkStatus(false, "Disconnected");
    }
  }
}

function loadSampleDataForDemo() {
  studentNameInput.value = "Sneha Roy";
  courseNameInput.value = "B.Tech in Artificial Intelligence & Data Science";

  // Synthesize sample file text buffer & hash
  const sampleContent = "CERTICHAIN_SAMPLE_OFFICIAL_DEGREE_SNEHA_ROY_2026";
  const encoder = new TextEncoder();
  const data = encoder.encode(sampleContent);

  computeSHA256(data.buffer).then(hash => {
    currentIssueHash = hash;
    issueFileName.innerHTML = `<i class="fa-solid fa-file-shield"></i> Sneha_Roy_Degree_Certificate.pdf`;
    issueFileSize.textContent = "1.45 MB (Demo Generated)";
    issueHashCode.textContent = hash;
    issueHashCard.classList.add("visible");
    
    // Also auto-populate verify input for quick demonstration
    manualHashInput.value = hash;
  });
}

// ==============================================================================
// 6. ISSUE CERTIFICATE WORKFLOW
// ==============================================================================
async function handleIssueFile(file) {
  if (!file) return;
  issueFileName.innerHTML = `<i class="fa-solid fa-file"></i> ${file.name}`;
  issueFileSize.textContent = formatBytes(file.size);

  const arrayBuffer = await file.arrayBuffer();
  currentIssueHash = await computeSHA256(arrayBuffer);

  issueHashCode.textContent = currentIssueHash;
  issueHashCard.classList.add("visible");
}

async function issueCertificateAction() {
  const sName = studentNameInput.value.trim();
  const cName = courseNameInput.value.trim();

  if (!sName || !cName) {
    alert("Please enter both Student Name and Course Name.");
    return;
  }

  if (!currentIssueHash) {
    alert("Please upload a certificate document to compute its cryptographic hash.");
    return;
  }

  btnIssueCert.disabled = true;
  issueTxStatus.classList.add("visible");

  // DEMO MODE EXECUTION
  if (isDemoMode) {
    issueTxMsg.innerHTML = `<span class="spinner"></span> [DEMO MODE] Anchoring SHA-256 hash to local ledger simulation...`;
    
    setTimeout(() => {
      const registry = JSON.parse(localStorage.getItem(DEMO_STORAGE_KEY) || "{}");
      registry[currentIssueHash.toLowerCase()] = {
        studentName: sName,
        courseName: cName,
        issueDate: Math.floor(Date.now() / 1000),
        isValid: true,
        issuer: "0xDEMO_ADMIN"
      };
      localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(registry));

      issueTxMsg.innerHTML = `
        <div style="color: var(--success-emerald); font-weight: 600;">
          <i class="fa-solid fa-circle-check"></i> Certificate Successfully Anchored (Demo Ledger)!
        </div>
        <div style="font-size: 0.8rem; margin-top: 0.35rem; color: var(--text-secondary);">
          Hash: <code>${currentIssueHash}</code>
        </div>
      `;
      btnIssueCert.disabled = false;
    }, 1200);
    return;
  }

  // ETHEREUM SEPOLIA BLOCKCHAIN EXECUTION
  if (!signer) {
    alert("MetaMask wallet is not connected. Please click 'Connect MetaMask' in the top-right corner.");
    btnIssueCert.disabled = false;
    issueTxStatus.classList.remove("visible");
    return;
  }

  if (CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000" || !CONTRACT_ADDRESS.startsWith("0x")) {
    alert("Smart Contract Address placeholder has not been replaced yet!\n\nPlease deploy contracts/CertificateVerifier.sol on Sepolia and paste the address into CONTRACT_ADDRESS at the top of app.js.\n\nYou can also enable 'Demo Mode' in the navbar to test right away!");
    btnIssueCert.disabled = false;
    issueTxStatus.classList.remove("visible");
    return;
  }

  try {
    issueTxMsg.innerHTML = `<span class="spinner"></span> Awaiting signature in MetaMask...`;
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

    // Call issueCertificate(bytes32 docHash, string memory studentName, string memory courseName)
    const tx = await contract.issueCertificate(currentIssueHash, sName, cName);
    
    issueTxMsg.innerHTML = `<span class="spinner"></span> Transaction submitted! Mining block on Sepolia: <a href="https://sepolia.etherscan.io/tx/${tx.hash}" target="_blank" style="color: #38bdf8; text-decoration: underline;">${tx.hash.substring(0, 16)}...</a>`;

    const receipt = await tx.wait();
    
    issueTxMsg.innerHTML = `
      <div style="color: var(--success-emerald); font-weight: 600;">
        <i class="fa-solid fa-circle-check"></i> Successfully Mined in Block #${receipt.blockNumber}!
      </div>
      <div style="font-size: 0.8rem; margin-top: 0.35rem;">
        <a href="https://sepolia.etherscan.io/tx/${tx.hash}" target="_blank" style="color: #38bdf8; text-decoration: underline;">
          View Transaction on Etherscan <i class="fa-solid fa-external-link-alt fa-xs"></i>
        </a>
      </div>
    `;
  } catch (err) {
    console.error("Smart contract error:", err);
    let errorMsg = err.reason || err.message || "Transaction failed";
    if (err.data && err.data.message) errorMsg = err.data.message;
    issueTxMsg.innerHTML = `<span style="color: var(--danger-crimson);"><i class="fa-solid fa-circle-xmark"></i> ${errorMsg}</span>`;
  } finally {
    btnIssueCert.disabled = false;
  }
}

// ==============================================================================
// 7. VERIFY CERTIFICATE WORKFLOW
// ==============================================================================
async function handleVerifyFile(file) {
  if (!file) return;
  verifyFileName.innerHTML = `<i class="fa-solid fa-file"></i> ${file.name}`;
  verifyFileSize.textContent = formatBytes(file.size);

  const arrayBuffer = await file.arrayBuffer();
  currentVerifyHash = await computeSHA256(arrayBuffer);

  verifyHashCode.textContent = currentVerifyHash;
  verifyHashCard.classList.add("visible");
  manualHashInput.value = currentVerifyHash;
}

async function verifyCertificateAction() {
  // Determine lookup hash (either from uploaded file or manual hash input)
  let lookupHash = manualHashInput.value.trim();
  if (!lookupHash && currentVerifyHash) {
    lookupHash = currentVerifyHash;
  }

  if (!lookupHash) {
    alert("Please either drag & drop a certificate document or paste a 64-character SHA-256 hash.");
    return;
  }

  // Ensure 0x prefix and 32 bytes (64 hex characters + '0x' = 66 chars)
  if (!lookupHash.startsWith("0x")) {
    lookupHash = "0x" + lookupHash;
  }

  if (lookupHash.length !== 66) {
    alert("Invalid SHA-256 hash format. A valid document hash must be 32 bytes (64 hexadecimal characters starting with 0x).");
    return;
  }

  // Reset Result Displays
  authenticResultCard.classList.remove("visible");
  tamperedResultCard.classList.remove("visible");
  btnVerifyCert.disabled = true;

  // DEMO MODE LOOKUP
  if (isDemoMode) {
    setTimeout(() => {
      const registry = JSON.parse(localStorage.getItem(DEMO_STORAGE_KEY) || "{}");
      const cert = registry[lookupHash.toLowerCase()];

      if (cert && cert.isValid) {
        showAuthenticResult(cert.studentName, cert.courseName, cert.issueDate, lookupHash);
      } else {
        showTamperedResult();
      }
      btnVerifyCert.disabled = false;
    }, 400);
    return;
  }

  // BLOCKCHAIN LOOKUP (Read-only via Ethers Provider or Public RPC)
  try {
    let readProvider = provider;
    if (!readProvider) {
      // Connect to public Sepolia RPC so public users can verify even without MetaMask!
      readProvider = new ethers.JsonRpcProvider("https://rpc.sepolia.org");
    }

    if (CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000" || !CONTRACT_ADDRESS.startsWith("0x")) {
      alert("Contract address not configured yet! Please enable 'Demo Mode' at the top to simulate verification without Sepolia deployment.");
      btnVerifyCert.disabled = false;
      return;
    }

    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, readProvider);
    
    // Call verifyCertificate(bytes32 docHash)
    const [studentName, courseName, issueDate, isValid] = await contract.verifyCertificate(lookupHash);

    if (isValid && studentName && studentName.length > 0) {
      showAuthenticResult(studentName, courseName, Number(issueDate), lookupHash);
    } else {
      showTamperedResult();
    }
  } catch (err) {
    console.error("Verification error:", err);
    alert("Blockchain query error: " + (err.message || err));
    showTamperedResult();
  } finally {
    btnVerifyCert.disabled = false;
  }
}

function showAuthenticResult(name, course, timestamp, hash) {
  resStudentName.textContent = name;
  resCourseName.textContent = course;
  
  if (timestamp) {
    const d = new Date(timestamp * 1000);
    resIssueDate.textContent = `${d.toLocaleDateString()} at ${d.toLocaleTimeString()} (UTC)`;
  } else {
    resIssueDate.textContent = "Genesis Issuance";
  }

  resDocHash.textContent = hash;
  authenticResultCard.classList.add("visible");
  authenticResultCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function showTamperedResult() {
  tamperedResultCard.classList.add("visible");
  tamperedResultCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

// ==============================================================================
// 8. EVENT LISTENERS & SETUP
// ==============================================================================
function setupDragAndDrop(dropzoneEl, fileInputEl, handlerFn) {
  dropzoneEl.addEventListener("click", () => fileInputEl.click());

  ["dragenter", "dragover"].forEach(eventName => {
    dropzoneEl.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzoneEl.classList.add("dragover");
    });
  });

  ["dragleave", "drop"].forEach(eventName => {
    dropzoneEl.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzoneEl.classList.remove("dragover");
    });
  });

  dropzoneEl.addEventListener("drop", (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length > 0) {
      handlerFn(files[0]);
    }
  });

  fileInputEl.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
      handlerFn(e.target.files[0]);
    }
  });
}

function setupCopyButton(btn, textSourceFn) {
  btn.addEventListener("click", () => {
    const text = textSourceFn();
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      const origHtml = btn.innerHTML;
      btn.innerHTML = `<i class="fa-solid fa-check" style="color: var(--success-emerald);"></i>`;
      setTimeout(() => { btn.innerHTML = origHtml; }, 1500);
    });
  });
}

// Initialization on DOM Load
document.addEventListener("DOMContentLoaded", () => {
  initDemoRegistry();
  initEthers();

  // Tab switching
  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      tabButtons.forEach(b => b.classList.remove("active"));
      tabContents.forEach(c => c.classList.remove("active"));

      btn.classList.add("active");
      const targetId = btn.getAttribute("data-tab");
      document.getElementById(targetId).classList.add("active");
    });
  });

  // Demo toggle switch
  demoModeToggle.addEventListener("change", (e) => {
    toggleDemoMode(e.target.checked);
  });

  // Demo sample loader
  loadSampleCertBtn.addEventListener("click", () => {
    loadSampleDataForDemo();
  });

  // Wallet Connect Button
  connectWalletBtn.addEventListener("click", connectWallet);

  // Setup Drag & Drop
  setupDragAndDrop(issueDropzone, issueFileInput, handleIssueFile);
  setupDragAndDrop(verifyDropzone, verifyFileInput, handleVerifyFile);

  // Setup Copy Buttons
  setupCopyButton(copyIssueHashBtn, () => currentIssueHash);
  setupCopyButton(copyVerifyHashBtn, () => currentVerifyHash || manualHashInput.value);

  // Action Buttons
  btnIssueCert.addEventListener("click", issueCertificateAction);
  btnVerifyCert.addEventListener("click", verifyCertificateAction);
});

# 🎓 CertiChain: Blockchain-Based Academic Certificate Verifier

> **A 3rd-Year B.Tech Mini Project in Distributed Ledger Technology & Cyber Security**  
> *Tamper-Proof, Zero-Trust Academic Credential Verification on Ethereum Sepolia*

---

## 📌 Executive Summary

**CertiChain** is a decentralized web application (dApp) designed to eradicate credential forgery, fake degrees, and fraudulent academic claims. By coupling **client-side cryptographic hashing (SHA-256 via Web Crypto API)** with **immutable smart contracts on the Ethereum Sepolia Testnet**, CertiChain provides an instant, zero-trust verification pipeline.

The repository requires **zero build steps** (no npm, Webpack, or Vite required) and is fully ready to be hosted directly on **GitHub Pages**.

---

## 🛡️ Why Blockchain is Needed for Academic Credential Verification

### 1. The Global Credential Forgery Crisis
Academic degree fraud, diploma mills, and unauthorized modifications of grade transcripts represent a multibillion-dollar global challenge. Traditional paper certificates with physical holograms, embossed seals, and QR codes can easily be counterfeited using high-resolution printers and modern graphic design tools.

### 2. Limitations of Traditional Verification Systems
* **Centralized Single Point of Failure:** Central university databases are susceptible to server outages, ransomware attacks, and malicious insider manipulation (e.g., rogue database administrators altering degree records).
* **High Latency & Administrative Overhead:** Verification by prospective employers or foreign universities often requires manual email exchanges, postal transcripts, or third-party background verification agencies, taking weeks and incurring heavy fees.
* **Loss of Institutional Permanence:** If an academic institution shuts down, merges, or loses historical archives, alumni lose verifiable proof of their legitimate achievements.

### 3. How Blockchain Solves This Problem
| Threat / Challenge | Traditional Approach | CertiChain Blockchain Solution |
| :--- | :--- | :--- |
| **Tampering & Alteration** | Database updates can be silently rewritten | Cryptographically immutable; blocks are linked by SHA-256 hashes |
| **Privacy Violation** | Uploading full PDF/marksheet to external servers | **Zero Data Leakage:** Only the 32-byte cryptographic hash is published on-chain; student identity documents remain strictly offline |
| **Central Authority Reliance** | University database must stay online 24/7 | Public read availability across thousands of Ethereum nodes globally |
| **Cost & Latency** | Days or weeks via manual verification | Instant (under 1 second) via client-side hashing and smart contract lookup |

### 4. The Avalanche Effect & Cryptographic Integrity
The core mathematical guarantee relies on the **Avalanche Effect of SHA-256**:
$$\text{Document } D \xrightarrow{\text{SHA-256}} H_1 \in \{0, 1\}^{256}$$
If an attacker alters even a **single pixel**, period, or character in the student's certificate ($D'$):
$$D' = D + \Delta \implies \text{SHA-256}(D') = H_2 \quad (\text{where } H_1 \oplus H_2 \approx 50\% \text{ bit divergence})$$
Because $H_2$ does not match the immutable $H_1$ stored in the Ethereum ledger, the smart contract immediately rejects the altered document with an **"Invalid / Tampered Document"** alert.

---

## 🏗️ System Architecture & Workflow

```
[ University Authority ] (Admin)
        │
        ├── 1. Issues Certificate PDF
        ├── 2. Browser computes SHA-256 digest client-side (crypto.subtle)
        └── 3. MetaMask signs transaction -> calls issueCertificate() on Sepolia
                        │
                        ▼
      ╔═════════════════════════════════════════════╗
      ║       Ethereum Sepolia Testnet Ledger       ║
      ║  Smart Contract: CertificateVerifier.sol   ║
      ║  mapping(bytes32 docHash => Certificate)    ║
      ╚═════════════════════════════════════════════╝
                        ▲
                        │
[ Employer / Verifier ] (Public User)
        │
        ├── 1. Drags candidate's certificate into CertiChain
        ├── 2. Browser computes SHA-256 digest client-side
        └── 3. Queries verifyCertificate(docHash) -> Instant PASS / FAIL
```

---

## 📂 Repository Structure

```
blockchain-certificate-verifier/
├── contracts/
│   └── CertificateVerifier.sol     # Solidity smart contract (v0.8.20)
├── index.html                      # Semantic HTML5 UI (Dark glassmorphism)
├── style.css                       # Modern stylesheet (#0f172a, Inter font, Glow accents)
├── app.js                          # Web3 (Ethers.js v6) + Web Crypto SHA-256 logic
├── sample_certificate.html         # Sample graduation certificate for presentation testing
└── README.md                       # Comprehensive project documentation & guide
```

---

## ⚙️ Smart Contract Specifications (`CertificateVerifier.sol`)

* **Solidity Version:** `^0.8.20`
* **Network:** Ethereum Sepolia Testnet (Chain ID: `11155111`)
* **State Variables:**
  * `address public admin`: University administrative address set to `msg.sender` in constructor.
  * `mapping(bytes32 => Certificate) private certificates`: Stores student certificate structs indexed by the SHA-256 digest.
* **Certificate Struct:**
  ```solidity
  struct Certificate {
      string studentName;
      string courseName;
      uint256 issueDate;
      bool isValid;
  }
  ```
* **Core Functions:**
  * `issueCertificate(bytes32 docHash, string memory studentName, string memory courseName)`: Restricted to `onlyAdmin`. Prevents duplicate issuance.
  * `verifyCertificate(bytes32 docHash)`: Free, public read-only (`view`) function returning certificate validity, student name, degree title, and issuance timestamp.
  * `revokeCertificate(bytes32 docHash)`: Allows the institution to revoke a certificate in cases of academic dishonesty or administrative errors.

---

## 🚀 Step-by-Step Setup & Deployment Guide

### Phase 1: Deploying the Smart Contract via Remix IDE

1. Open **[Remix Ethereum IDE](https://remix.ethereum.org/)** in your browser.
2. In the `contracts` folder in Remix, create a file named `CertificateVerifier.sol` and paste the contents from `contracts/CertificateVerifier.sol`.
3. Go to the **Solidity Compiler** tab:
   * Select compiler version `0.8.20` (or `^0.8.0`).
   * Click **Compile CertificateVerifier.sol**.
4. Go to the **Deploy & Run Transactions** tab:
   * Change Environment to **Injected Provider - MetaMask**.
   * Make sure your MetaMask is switched to the **Sepolia Test Network**.
   * *(Need free Sepolia ETH? Obtain some from [Google Cloud Web3 Faucet](https://cloud.google.com/application/web3/faucet/ethereum/sepolia) or [Sepolia PoW Faucet](https://sepolia-faucet.pk910.de/)).*
   * Click the orange **Deploy** button and confirm the transaction in MetaMask.
5. Once mined, scroll down to **Deployed Contracts** in Remix, copy the contract address (e.g., `0x1234...abcd`).

---

### Phase 2: Connecting the Front-End (`app.js`)

1. Open `app.js` in your editor.
2. Locate the configuration placeholder on line 20:
   ```javascript
   const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
   ```
3. Replace the placeholder string with your newly deployed contract address from Remix.
4. Save `app.js`.

---

### Phase 3: Launching & Hosting via GitHub Pages (Zero Build Step!)

Because this project uses vanilla JavaScript and CDN libraries (Ethers.js v6, Font Awesome, Google Fonts), it requires **no Node.js build step**.

1. Initialize git and push to your GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Blockchain Certificate Verifier"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git push -u origin main
   ```
2. In your GitHub repository:
   * Click **Settings** > **Pages** (under Code and automation in the left sidebar).
   * Under **Build and deployment** > **Source**, choose **Deploy from a branch**.
   * Under **Branch**, select `main` and `/ (root)`.
   * Click **Save**.
3. Your live application will be available at:  
   `https://<your-username>.github.io/<repo-name>/`

---

## 🧪 Demo Mode Guide for Faculty & Presentation Evaluations

> **Designed specifically for Project Viva & Faculty Presentations!**

During an academic evaluation, faculty members or examiners may not have MetaMask installed or testnet Sepolia ETH in their wallets. CertiChain includes a built-in **"Demo Mode (Without Wallet)"** toggle:

1. **Activate Demo Mode:** Click the toggle switch in the top navigation bar (`Demo Mode: ON`).
2. **Instant Sample Data:** Click the **"Load Sample Certificate"** button that appears in the banner.
3. **Issue in Demo Mode:** Click **Anchor Certificate to Blockchain**. The application simulates transaction signing and mines the SHA-256 hash into a simulated ledger stored in browser memory.
4. **Demonstrating Verification:**
   * Switch to the **Verify Certificate** tab.
   * Click **Verify on Blockchain**. The verified emerald green badge will display student details and cryptographic confirmation.
5. **Demonstrating Tamper Detection:**
   * Change a single character in the hash (e.g., replace the last digit with `0`) or drag a different file.
   * Click **Verify on Blockchain**.
   * The glowing crimson **"Invalid / Tampered Document"** alert will trigger, clearly demonstrating the security principle of the project.

---

## 🛠️ Technology Stack

* **Blockchain:** Ethereum Sepolia Testnet (EVM)
* **Smart Contract Language:** Solidity `0.8.20`
* **Development & Deployment:** Remix IDE, MetaMask
* **Cryptographic Engine:** Browser Native Web Crypto API (`window.crypto.subtle.digest("SHA-256", ...)`)
* **Web3 Integration:** Ethers.js v6 (via CDN)
* **Front-End:** Semantic HTML5, Glassmorphism CSS3 (Custom CSS Variables, Flexbox, CSS Grid)
* **Typography & Icons:** Inter, JetBrains Mono, FontAwesome 6

---

## 📚 Academic Viva Q&A Guide

**Q1: Why do we store the document hash on-chain rather than the PDF itself?**  
*Answer:* Storing large files directly on Ethereum is cost-prohibitive (storing 1 MB can cost several ETH in gas). Additionally, storing academic certificates publicly exposes sensitive student personal identifiable information (PII). Hashing maps any file size to an exact 32-byte digest, preserving privacy while guaranteeing mathematical proof of authenticity.

**Q2: What prevents an unauthorized user from issuing fake certificates?**  
*Answer:* The `issueCertificate` function is guarded by the `onlyAdmin` modifier. Only the Ethereum address that deployed the contract (the university authority) possesses the cryptographic private key to execute issuance transactions.

**Q3: Can a public verifier check a certificate without paying gas fees?**  
*Answer:* Yes. `verifyCertificate` is marked as `view`. Read operations on the Ethereum state do not require gas or wallet transactions; they can be queried freely through any public Ethereum RPC node.

---

## 👨‍💻 Author & Project Credits
* **Degree:** Bachelor of Technology (B.Tech) - Computer Science & Engineering
* **Project Type:** 3rd-Year B.Tech Mini Project / Capstone Proof-of-Concept
* **License:** MIT Open Source License

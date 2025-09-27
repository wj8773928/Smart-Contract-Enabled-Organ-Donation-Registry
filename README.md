# 🫀 Smart Contract-Enabled Organ Donation Registry

Welcome to a revolutionary blockchain-based solution for organ donation! This project creates a transparent, immutable registry on the Stacks blockchain using Clarity smart contracts to match donors and recipients in real-time, ensuring fair and auditable allocation based on predefined rules. It addresses real-world problems like organ shortages, lack of transparency in traditional systems, potential biases in allocation, and delays in matching—potentially saving lives through decentralized trust.

## ✨ Features

🩺 Register as a donor or recipient with medical details (e.g., blood type, organ type, urgency level)  
🔄 Real-time matching engine that pairs donors and recipients based on compatibility and priority  
📜 Transparent allocation rules stored on-chain for fairness (e.g., prioritizing urgency, location, and wait time)  
✅ Immutable records of registrations, matches, and transplants to prevent fraud  
🔔 Automated notifications for matches and updates  
🔒 Privacy-preserving verification using oracles for medical authenticity  
📊 Audit trails for all transactions to ensure accountability  
🚀 Incentive mechanisms (optional utility tokens) to encourage donor participation  

## 🛠 How It Works

This project leverages 8 Clarity smart contracts to handle different aspects of the organ donation lifecycle, ensuring modularity, security, and scalability on the Stacks blockchain.

**Key Smart Contracts:**
- **DonorRegistration.clar**: Manages donor sign-ups, storing details like organ pledges, blood type, and consent hashes.
- **RecipientRegistration.clar**: Handles recipient registrations, including medical needs, urgency scores, and waitlist entries.
- **MatchingEngine.clar**: Executes real-time matching logic, querying registries and applying rules to find compatible pairs.
- **AllocationRules.clar**: Defines and updates allocation criteria (e.g., scoring algorithms for priority) via governance.
- **VerificationOracle.clar**: Integrates with off-chain oracles to verify medical data without exposing sensitive info.
- **NotificationSystem.clar**: Triggers on-chain events for match notifications to involved parties (e.g., hospitals).
- **TransplantLedger.clar**: Records successful transplants, updating registries and creating immutable proofs.
- **AdminGovernance.clar**: Allows authorized updates to rules or emergency interventions, with multi-sig controls.

**For Donors:**
- Provide your medical details and consent (hashed for privacy).
- Call the `register-donor` function in DonorRegistration.clar with parameters like blood type, organ type, and location.
- Your pledge is timestamped and stored immutably—ready for potential matching.

**For Recipients:**
- Submit your needs via a healthcare provider (e.g., organ required, urgency level).
- Use `register-recipient` in RecipientRegistration.clar to join the waitlist.
- The system automatically checks for matches in real-time.

**For Healthcare Providers/Verifiers:**
- Use MatchingEngine.clar to query potential matches.
- Verify details with VerificationOracle.clar.
- Once matched, record the outcome in TransplantLedger.clar for transparency.

**Matching Process:**
- When a donor becomes available (e.g., upon brain death confirmation), the MatchingEngine.clar runs allocation rules to score and select recipients.
- Rules ensure equity: e.g., higher scores for longer wait times or critical conditions.
- All steps are auditable on-chain, reducing disputes and building trust.

Boom! Lives saved with blockchain transparency. This setup minimizes human error, prevents corruption, and scales globally while complying with regulations (integrate with legal frameworks off-chain).
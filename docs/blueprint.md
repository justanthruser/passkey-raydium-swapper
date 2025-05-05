# **App Name**: Passkey Raydium Swapper

## Core Features:

- Passkey Authentication: Enable secure user authentication using Passkeys (WebAuthn) for passwordless login. Utilize biometric authentication (e.g., FaceID) where available.
- Token Swapping: Integrate with the Raydium protocol on Solana devnet to allow users to swap tokens. The UI should present the options and amounts, and show the expected output amount, while providing an interface to approve the interaction.
- Transaction Signing & Verification: Sign transactions with secp256r1 signatures using the Lazor.kit SDK. Implement on-chain verification of signatures in a Rust program.

## Style Guidelines:

- Primary color: Solana's signature purple (#9945FF) to align with the ecosystem.
- Secondary color: Light gray (#F5F5F5) for backgrounds and subtle UI elements.
- Accent: Teal (#008080) for interactive elements and call-to-action buttons.
- Clean and modern fonts for readability.
- Use crisp and clear icons to represent different tokens and actions.
- Clean and minimalist layout with clear sections for authentication, token selection, and transaction details.
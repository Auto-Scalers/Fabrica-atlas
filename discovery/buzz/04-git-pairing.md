# Buzz — Git & Pairing (git-sign-nostr, git-credential-nostr, buzz-pair-relay, buzz-pairing-cli)

> Source: `_sources/buzz/crates/`
> Commit: `8868787`

## Overview

These crates provide Nostr-authenticated git operations and device pairing. They are the bridge between Buzz identity (Nostr keypairs) and traditional git workflows.

---

## git-sign-nostr (Nostr-Signed Git)

**Location:** `crates/git-sign-nostr/src/`

### Purpose
Sign git objects with a Nostr private key. Produces signatures that can be verified by anyone holding your public key.

### Key Files

| File | Purpose |
|------|---------|
| `lib.rs` | Core signing logic, signature format |
| `main.rs` | CLI entry point |

### Use Case
Replace GPG-signed git commits with Nostr-signed commits. The signature is embedded in the commit (as a `gpgsig`-style header) but uses Schnorr over secp256k1 instead of GPG.

### Signature Format
A Nostr-signed commit includes a special header (e.g., `nostr-sig <bech32-event>`) containing a NIP-98-style signed event over the commit hash.

---

## git-credential-nostr (Git Credential Helper)

**Location:** `crates/git-credential-nostr/src/`

### Purpose
Git credential helper that uses Nostr auth to push/fetch from git remotes hosted on Buzz relays.

### Key Files

| File | Purpose |
|------|---------|
| `lib.rs` | Credential generation, Nostr auth challenge |
| `main.rs` | Git credential helper entry point |

### Protocol
1. Git invokes the helper with `get`/`store`/`erase`
2. Helper generates a NIP-98 signed auth header for the relay
3. Relay validates the auth, grants push/fetch access based on repository membership
4. No passwords, no SSH keys — just Nostr keypairs

### Integration
Configure in `.gitconfig`:
```
[credential "https://buzz.example.com"]
    helper = "!git-credential-nostr"
```

---

## buzz-pair-relay (Ephemeral Pairing Sidecar)

**Location:** `crates/buzz-pair-relay/src/`

### Purpose
Ephemeral sidecar relay for NIP-AB device pairing. Enables secure initial key exchange between two devices.

### Key Files

| File | Purpose |
|------|---------|
| `lib.rs` | Pairing protocol implementation |
| `main.rs` | Sidecar entry point |

### Pairing Flow (NIP-AB)

```
Device A                          Device B
   │                                  │
   ├─ generate QR (nostrpair://...)──►│
   │                                  ├─ scan QR
   │                                  ├─ ECDH key exchange
   │◄───── encrypted SAS ────────────┤
   │                                  │
   ├─ verify SAS matches ◄──────────►┤
   │                                  │
   ├─ encrypted key transfer ───────►│
   │                                  ├─ store identity
```

### Crypto Primitives
- **ECDH** (secp256k1) for key agreement
- **HKDF** for session key derivation
- **SAS** (Short Authentication String) for out-of-band verification
- **AES-256-GCM** for encrypted key transfer

### Why Ephemeral
The sidecar relay runs only during pairing — no persistent state, no attack surface after the exchange completes.

---

## buzz-pairing-cli

**Location:** `crates/buzz-pairing-cli/`

### Purpose
CLI tool for NIP-AB device pairing interop testing. Used by developers to verify pairing implementations work together.

### Features
- Initiate pairing (show QR)
- Accept pairing (scan QR)
- Verify SAS
- Export/import identity archives

---

## How These Fit Together

The git crates (`git-sign-nostr`, `git-credential-nostr`) provide git integration on top of an existing Buzz identity. The pairing crates (`buzz-pair-relay`, `buzz-pairing-cli`) provide the initial key exchange to create that identity on a new device.

**End-to-end flow:**
1. User generates Nostr keypair on Device A
2. Pair Device B using `buzz-pair-relay` (QR + ECDH)
3. Both devices now share the identity
4. User signs git commits with `git-sign-nostr`
5. User pushes to Buzz-hosted repos using `git-credential-nostr`

No GPG, no SSH keys, no passwords — just Nostr.

---

## Scan Coverage

- All 4 crates enumerated
- Key files in each crate inspected
- `Cargo.toml` workspace member list verified
- **Not deeply read:** exact ECDH/HKDF parameter values, SAS display format

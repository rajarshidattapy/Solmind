# Quick Start: Deploy to Solana Testnet

## Step 1: Install Prerequisites (One-time setup)

### Install Rust
```powershell
# Option 1: Using winget (recommended)
winget install Rustlang.Rustup

# Option 2: Download installer
# Visit: https://rustup.rs/ and download rustup-init.exe
```

After installation, restart your terminal/PowerShell.

### Install Solana CLI
```powershell
# Download and run the installer
cmd /c "curl https://release.solana.com/stable/install | powershell"

# Add to PATH (add this to your PowerShell profile)
$env:Path += ";$env:USERPROFILE\.local\share\solana\install\active_release\bin"

# Or manually add to PATH:
# C:\Users\<YourUsername>\.local\share\solana\install\active_release\bin
```

### Install Anchor CLI
```powershell
# Install Anchor Version Manager
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force

# Install latest Anchor version
avm install latest
avm use latest

# Verify installation
anchor --version
```

## Step 2: Configure Solana for Testnet

```powershell
# Set cluster to testnet
solana config set --url https://api.testnet.solana.com

# Generate keypair if you don't have one
solana-keygen new

# Get testnet SOL
solana airdrop 2

# Verify balance
solana balance
```

## Step 3: Deploy the Program

```powershell
# From project root directory
cd C:\Users\asus\Desktop\Sol_mind

# Build the program
anchor build

# Deploy to testnet
anchor deploy --provider.cluster testnet
```

## Alternative: Use the Deployment Script

```powershell
# Run the PowerShell deployment script
.\deploy.ps1
```

## Verify Deployment

```powershell
# Check program on testnet
solana program show Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS --url testnet
```

## View on Explorer

Visit: https://explorer.solana.com/address/Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS?cluster=testnet

## Troubleshooting

### "anchor: command not found"
- Make sure you've installed Anchor CLI and it's in your PATH
- Try: `cargo install --git https://github.com/coral-xyz/anchor avm --locked --force`

### "solana: command not found"
- Add Solana to your PATH: `$env:Path += ";$env:USERPROFILE\.local\share\solana\install\active_release\bin"`
- Or restart your terminal after installation

### Build errors
- Ensure you're in the project root directory
- Try: `anchor clean` then `anchor build`

### Insufficient funds
- Get more testnet SOL: `solana airdrop 2`
- Check balance: `solana balance`


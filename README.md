# Elixir Launchpad Utils

Used to generate your collection URI and metadata JSON file using [Shadow drive](https://github.com/GenesysGo/shadow-drive-cli)

## Prerequisites

- A wallet keypair generated using the [Solana CLI](https://docs.solana.com/wallet-guide/file-system-wallet#generate-a-file-system-wallet-keypair). Wallet must be funded with SOL and [SHDW token](https://jup.ag/swap/SOL-SHDW)
- Artwork and JSON files generated
  - A folder of image and JSON files (ex 0.json + 0.png)
  - Elixir recommends using [Appsus](https://nft.appsus.co.uk/)
- URL from a [Solana RPC provider](https://solana.com/rpc)
- [Node](https://nodejs.org/en/download) installed

## Steps

1. Ensure you have met all prerequisites
2. Clone this repository locally `git clone https://github.com/elixirfi/launchpad-utils.git`
3. Run `npm install` to install packages
4. Update all variables in `.env` following comments
5. Create `/assets` folder and upload generated images and JSON files
6. Run `node upload.js`

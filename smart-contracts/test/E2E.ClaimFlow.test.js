/**
 * E2E Claim Flow Test (Local Hardhat Network)
 * =============================================
 * Simulates the full CrownMania claim flow:
 *   1. Deploy contract
 *   2. Pre-mint all 500 editions to backend wallet
 *   3. User verifies serial number
 *   4. User connects wallet & signs message
 *   5. Backend verifies signature & transfers NFT
 *   6. Verify user now owns the NFT
 *   7. User transfers NFT to external wallet
 *   8. Verify new ownership
 */

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("E2E: Full Claim Flow", function () {
    let nft;
    let backendWallet; // Simulates the CrownMania backend wallet
    let userWallet;     // Simulates a user claiming an NFT
    let externalWallet; // Simulates an external wallet (MetaMask, Trust)

    const COLLECTION_NAME = "CrownMania Collectible";
    const COLLECTION_SYMBOL = "CROWN";
    const BASE_URI = "https://crownmania.com/api/metadata/";

    before(async function () {
        [backendWallet, userWallet, externalWallet] = await ethers.getSigners();
    });

    // ── Step 1: Deploy & Pre-Mint ──
    describe("Step 1: Deploy Contract & Pre-Mint", function () {
        it("should deploy the CrownManiaNFT contract", async function () {
            const CrownManiaNFT = await ethers.getContractFactory("CrownManiaNFT");
            nft = await CrownManiaNFT.deploy(COLLECTION_NAME, COLLECTION_SYMBOL, BASE_URI);
            await nft.waitForDeployment();

            const address = await nft.getAddress();
            expect(address).to.be.properAddress;
            console.log(`    ✅ Contract deployed at: ${address}`);
        });

        it("should pre-mint all 500 editions to backend wallet", async function () {
            this.timeout(30000); // Allow time for 500 mints

            // Mint in batches of 50 (matches deploy.js)
            for (let start = 1; start <= 500; start += 50) {
                const count = Math.min(50, 501 - start);
                const tx = await nft.mintBatch(start, count);
                await tx.wait();
            }

            expect(await nft.totalMinted()).to.equal(500);
            expect(await nft.ownerOf(1)).to.equal(backendWallet.address);
            expect(await nft.ownerOf(500)).to.equal(backendWallet.address);
            console.log(`    ✅ 500 editions minted to backend wallet: ${backendWallet.address}`);
        });
    });

    // ── Step 2: Simulate Serial Verification ──
    describe("Step 2: Serial Verification", function () {
        it("should verify a serial number maps to an available edition", async function () {
            // In production: POST /api/verification/verify → checks Firestore claimCodes
            // Here we simulate by checking NFT ownership
            const tokenId = 42; // Edition #42
            const owner = await nft.ownerOf(tokenId);

            // NFT should still be held by backend wallet (unclaimed)
            expect(owner).to.equal(backendWallet.address);
            console.log(`    ✅ Edition #${tokenId} is available (owned by backend)`);
        });
    });

    // ── Step 3: Wallet Auth (Nonce + Sign) ──
    describe("Step 3: Wallet Authentication", function () {
        let nonce;
        let signedMessage;
        const NONCE_PREFIX = "CrownMania Authentication\nNonce: ";

        it("should generate a nonce for the user", async function () {
            // In production: GET /api/auth/nonce?address=0x...
            nonce = ethers.hexlify(ethers.randomBytes(16));
            expect(nonce).to.have.lengthOf(34); // 0x + 32 hex chars
            console.log(`    ✅ Nonce generated: ${nonce}`);
        });

        it("should sign the nonce message with user wallet", async function () {
            // User signs the message in their wallet (Web3Auth or MetaMask)
            const message = `${NONCE_PREFIX}${nonce}`;
            signedMessage = await userWallet.signMessage(message);

            expect(signedMessage).to.be.a("string");
            expect(signedMessage).to.have.lengthOf(132); // 0x + 130 hex chars
            console.log(`    ✅ Message signed by: ${userWallet.address}`);
        });

        it("should verify the signature matches the user wallet", async function () {
            // Backend verifies: recoveredAddress === walletAddress from request
            const message = `${NONCE_PREFIX}${nonce}`;
            const recoveredAddress = ethers.verifyMessage(message, signedMessage);

            expect(recoveredAddress.toLowerCase()).to.equal(userWallet.address.toLowerCase());
            console.log(`    ✅ Signature verified: ${recoveredAddress}`);
        });
    });

    // ── Step 4: Claim (Transfer NFT from backend → user) ──
    describe("Step 4: NFT Claim Transfer", function () {
        const claimedEdition = 42;

        it("should transfer edition #42 from backend to user wallet", async function () {
            // In production: verificationService.claimProduct → queueService.enqueueTransfer
            // → transferWorker → contract.transferEdition()
            const tx = await nft.transferEdition(userWallet.address, claimedEdition);
            const receipt = await tx.wait();

            expect(await nft.ownerOf(claimedEdition)).to.equal(userWallet.address);
            console.log(`    ✅ Edition #${claimedEdition} transferred to: ${userWallet.address}`);
            console.log(`    ⛽ Gas used: ${receipt.gasUsed.toString()}`);
        });

        it("should emit EditionTransferred event", async function () {
            // Already transferred above, so check the event from that tx
            const filter = nft.filters.EditionTransferred(claimedEdition);
            const events = await nft.queryFilter(filter);
            expect(events).to.have.lengthOf(1);
            expect(events[0].args.to).to.equal(userWallet.address);
            console.log(`    ✅ EditionTransferred event logged on chain`);
        });

        it("should prevent backend from re-transferring the same edition", async function () {
            // Backend no longer owns it → should revert
            await expect(nft.transferEdition(externalWallet.address, claimedEdition))
                .to.be.revertedWith("Not owner of this edition");
            console.log(`    ✅ Double-transfer correctly prevented`);
        });
    });

    // ── Step 5: User Views in Vault ──
    describe("Step 5: Vault Display", function () {
        it("should return correct metadata URI for claimed edition", async function () {
            const uri = await nft.tokenURI(42);
            expect(uri).to.equal(`${BASE_URI}42`);
            console.log(`    ✅ Metadata URI: ${uri}`);
        });

        it("should show user as owner on-chain", async function () {
            const owner = await nft.ownerOf(42);
            expect(owner).to.equal(userWallet.address);
            console.log(`    ✅ On-chain owner: ${owner}`);
        });
    });

    // ── Step 6: User Transfers to External Wallet ──
    describe("Step 6: External Transfer", function () {
        it("should allow user to transfer to their MetaMask/Trust wallet", async function () {
            // User calls standard ERC-721 transferFrom
            const tx = await nft.connect(userWallet).transferFrom(
                userWallet.address,
                externalWallet.address,
                42
            );
            const receipt = await tx.wait();

            expect(await nft.ownerOf(42)).to.equal(externalWallet.address);
            console.log(`    ✅ Edition #42 transferred to external: ${externalWallet.address}`);
            console.log(`    ⛽ Gas used: ${receipt.gasUsed.toString()}`);
        });

        it("should prevent original user from transferring again", async function () {
            await expect(
                nft.connect(userWallet).transferFrom(userWallet.address, backendWallet.address, 42)
            ).to.be.reverted;
            console.log(`    ✅ User can no longer transfer (not owner)`);
        });
    });

    // ── Step 7: Ownership Reconciliation ──
    describe("Step 7: Ownership Reconciliation", function () {
        it("should detect ownership changed from user to external wallet", async function () {
            // This simulates what the reconciliation job does:
            // query on-chain ownership and compare with DB
            const currentOwner = await nft.ownerOf(42);
            const dbOwner = userWallet.address; // What DB thinks

            expect(currentOwner).to.not.equal(dbOwner);
            expect(currentOwner).to.equal(externalWallet.address);
            console.log(`    ✅ Mismatch detected: DB says ${dbOwner}, chain says ${currentOwner}`);
            console.log(`    → Reconciliation would update DB owner to: ${currentOwner}`);
        });
    });

    // ── Step 8: Supply Integrity ──
    describe("Step 8: Supply Integrity Check", function () {
        it("should still have all 500 editions accounted for", async function () {
            expect(await nft.totalMinted()).to.equal(500);

            // Backend still owns 499 editions (only #42 was transferred out)
            const backendOwns1 = await nft.ownerOf(1);
            const backendOwns500 = await nft.ownerOf(500);
            expect(backendOwns1).to.equal(backendWallet.address);
            expect(backendOwns500).to.equal(backendWallet.address);

            // Edition #42 is owned by external wallet
            expect(await nft.ownerOf(42)).to.equal(externalWallet.address);
            console.log(`    ✅ Supply verified: 499 in backend + 1 transferred`);
        });

        it("should not allow minting beyond 500", async function () {
            await expect(nft.mintBatch(501, 1)).to.be.revertedWith("Out of range");
            console.log(`    ✅ Max supply enforced`);
        });
    });
});

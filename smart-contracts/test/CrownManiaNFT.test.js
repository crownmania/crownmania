const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CrownManiaNFT", function () {
    let nft;
    let owner;
    let user1;
    let user2;

    beforeEach(async function () {
        [owner, user1, user2] = await ethers.getSigners();

        const CrownManiaNFT = await ethers.getContractFactory("CrownManiaNFT");
        nft = await CrownManiaNFT.deploy(
            "CrownMania Collectible",
            "CROWN",
            "https://crownmania.com/api/metadata/"
        );
        await nft.waitForDeployment();
    });

    describe("Deployment", function () {
        it("should set correct name and symbol", async function () {
            expect(await nft.name()).to.equal("CrownMania Collectible");
            expect(await nft.symbol()).to.equal("CROWN");
        });

        it("should set max supply to 500", async function () {
            expect(await nft.MAX_SUPPLY()).to.equal(500);
        });

        it("should set the deployer as owner", async function () {
            expect(await nft.owner()).to.equal(owner.address);
        });

        it("should start with 0 total minted", async function () {
            expect(await nft.totalMinted()).to.equal(0);
        });
    });

    describe("Batch Minting", function () {
        it("should mint a batch of editions", async function () {
            await nft.mintBatch(1, 10);
            expect(await nft.totalMinted()).to.equal(10);
            expect(await nft.ownerOf(1)).to.equal(owner.address);
            expect(await nft.ownerOf(10)).to.equal(owner.address);
        });

        it("should mint all 500 via multiple batches", async function () {
            for (let start = 1; start <= 500; start += 100) {
                const count = Math.min(100, 501 - start);
                await nft.mintBatch(start, count);
            }
            expect(await nft.totalMinted()).to.equal(500);
        });

        it("should reject batch out of range", async function () {
            await expect(nft.mintBatch(499, 5)).to.be.revertedWith("Out of range");
        });

        it("should reject non-owner batch mint", async function () {
            await expect(nft.connect(user1).mintBatch(1, 10))
                .to.be.revertedWithCustomError(nft, "OwnableUnauthorizedAccount");
        });
    });

    describe("Full Mint", function () {
        it("should mint all 500 editions at once", async function () {
            await nft.mintAllEditions();
            expect(await nft.totalMinted()).to.equal(500);
            expect(await nft.ownerOf(1)).to.equal(owner.address);
            expect(await nft.ownerOf(500)).to.equal(owner.address);
        });

        it("should reject minting twice", async function () {
            await nft.mintAllEditions();
            await expect(nft.mintAllEditions()).to.be.revertedWith("Editions already minted");
        });
    });

    describe("Edition Transfer", function () {
        beforeEach(async function () {
            await nft.mintBatch(1, 10);
        });

        it("should transfer edition from owner to user", async function () {
            await nft.transferEdition(user1.address, 1);
            expect(await nft.ownerOf(1)).to.equal(user1.address);
        });

        it("should emit EditionTransferred event", async function () {
            await expect(nft.transferEdition(user1.address, 1))
                .to.emit(nft, "EditionTransferred")
                .withArgs(1, owner.address, user1.address);
        });

        it("should reject transfer of token not owned", async function () {
            await nft.transferEdition(user1.address, 1);
            await expect(nft.transferEdition(user2.address, 1))
                .to.be.revertedWith("Not owner of this edition");
        });

        it("should reject non-owner transfer call", async function () {
            await expect(nft.connect(user1).transferEdition(user2.address, 1))
                .to.be.revertedWithCustomError(nft, "OwnableUnauthorizedAccount");
        });
    });

    describe("Token URI", function () {
        beforeEach(async function () {
            await nft.mintBatch(1, 5);
        });

        it("should return correct base URI", async function () {
            const uri = await nft.tokenURI(1);
            expect(uri).to.equal("https://crownmania.com/api/metadata/1");
        });

        it("should allow owner to update base URI", async function () {
            await nft.setBaseURI("https://new.crownmania.com/meta/");
            const uri = await nft.tokenURI(1);
            expect(uri).to.equal("https://new.crownmania.com/meta/1");
        });
    });

    describe("Gas Estimation", function () {
        it("should estimate gas for single transfer", async function () {
            await nft.mintBatch(1, 5);
            const tx = await nft.transferEdition(user1.address, 1);
            const receipt = await tx.wait();
            console.log(`    Gas used for transfer: ${receipt.gasUsed.toString()}`);
            // Polygon gas is cheap; just make sure it's reasonable
            expect(receipt.gasUsed).to.be.lessThan(200000n);
        });
    });
});

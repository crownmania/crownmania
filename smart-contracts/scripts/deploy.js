const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying CrownManiaNFT with account:", deployer.address);
    console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

    // Deploy
    const CrownManiaNFT = await hre.ethers.getContractFactory("CrownManiaNFT");
    const nft = await CrownManiaNFT.deploy(
        "CrownMania Collectible",                          // name
        "CROWN",                                            // symbol
        "https://crownmania.com/api/metadata/"              // base URI
    );

    await nft.waitForDeployment();
    const contractAddress = await nft.getAddress();
    console.log("✅ CrownManiaNFT deployed to:", contractAddress);

    // Pre-mint all 500 editions in batches of 50 (gas safe)
    console.log("Minting 500 editions in batches of 50...");
    for (let start = 1; start <= 500; start += 50) {
        const count = Math.min(50, 501 - start);
        const tx = await nft.mintBatch(start, count);
        await tx.wait();
        console.log(`  Minted editions ${start} to ${start + count - 1}`);
    }

    console.log(`✅ All 500 editions minted to ${deployer.address}`);

    // Verify on Polygonscan (if not localhost)
    if (hre.network.name !== "localhost" && hre.network.name !== "hardhat") {
        console.log("Waiting for block confirmations before verifying...");
        await new Promise(r => setTimeout(r, 30000)); // wait 30s

        try {
            await hre.run("verify:verify", {
                address: contractAddress,
                constructorArguments: [
                    "CrownMania Collectible",
                    "CROWN",
                    "https://crownmania.com/api/metadata/",
                ],
            });
            console.log("✅ Contract verified on Polygonscan");
        } catch (err) {
            console.log("⚠️  Verification failed (can retry manually):", err.message);
        }
    }

    // Export address
    const fs = require("fs");
    const output = {
        contractAddress,
        network: hre.network.name,
        deployer: deployer.address,
        deployedAt: new Date().toISOString(),
    };
    fs.writeFileSync("deployment.json", JSON.stringify(output, null, 2));
    console.log("📄 Deployment info saved to deployment.json");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

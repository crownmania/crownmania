require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: {
        version: "0.8.20",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200,
            },
        },
    },
    networks: {
        hardhat: {},
        // Polygon Amoy testnet (replaced Mumbai, which was deprecated April 2024)
        amoy: {
            url: process.env.ALCHEMY_AMOY_URL || "https://polygon-amoy.g.alchemy.com/v2/" + (process.env.ALCHEMY_API_KEY || ""),
            accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
            chainId: 80002,
        },
        polygon: {
            url: process.env.ALCHEMY_POLYGON_URL || "https://polygon-mainnet.g.alchemy.com/v2/" + (process.env.ALCHEMY_API_KEY || ""),
            accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
            chainId: 137,
        },
    },
    etherscan: {
        apiKey: {
            polygonAmoy: process.env.POLYGONSCAN_API_KEY || "",
            polygon: process.env.POLYGONSCAN_API_KEY || "",
        },
    },
};

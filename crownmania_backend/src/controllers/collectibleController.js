import { Moralis } from '../config/web3.js';
import Collectible from '../models/Collectible.js';
import logger from '../config/logger.js';
import axios from 'axios';

export const verifySerialNumber = async (req, res) => {
  try {
    const { serialNumber, recaptchaToken } = req.body;

    // Verify reCAPTCHA
    const recaptchaResponse = await axios.post(
      `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${recaptchaToken}`
    );

    if (!recaptchaResponse.data.success) {
      return res.status(400).json({ error: 'Invalid CAPTCHA' });
    }

    const collectible = await Collectible.findBySerialNumber(serialNumber);
    if (!collectible) {
      return res.status(404).json({ error: 'Invalid serial number' });
    }

    res.json({ 
      valid: true,
      status: collectible.status,
      metadata: collectible.metadata
    });
  } catch (error) {
    logger.error('Error verifying serial number:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const claimCollectible = async (req, res) => {
  try {
    const { serialNumber } = req.body;
    const userId = req.user.uid;

    const collectible = await Collectible.findBySerialNumber(serialNumber);
    if (!collectible) {
      return res.status(404).json({ error: 'Invalid serial number' });
    }

    if (collectible.status !== 'unclaimed') {
      return res.status(400).json({ error: 'Collectible already claimed' });
    }

    // Update collectible status and owner
    await collectible.updateStatus('claimed');
    collectible.ownerId = userId;
    await collectible.save();

    res.json({ 
      message: 'Collectible claimed successfully',
      collectible
    });
  } catch (error) {
    logger.error('Error claiming collectible:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const mintNFT = async (req, res) => {
  try {
    const { serialNumber } = req.body;
    const userId = req.user.uid;

    const collectible = await Collectible.findBySerialNumber(serialNumber);
    if (!collectible) {
      return res.status(404).json({ error: 'Invalid serial number' });
    }

    if (collectible.status !== 'claimed') {
      return res.status(400).json({ error: 'Collectible not claimed' });
    }

    if (collectible.ownerId !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Mint NFT using Moralis
    const response = await Moralis.EvmApi.nft.mint({
      address: process.env.NFT_CONTRACT_ADDRESS,
      chain: process.env.CHAIN_ID,
      data: collectible.metadata
    });

    // Update collectible with token ID
    collectible.tokenId = response.result.tokenId;
    await collectible.updateStatus('minted');

    res.json({
      message: 'NFT minted successfully',
      tokenId: collectible.tokenId,
      transactionHash: response.result.transactionHash
    });
  } catch (error) {
    logger.error('Error minting NFT:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

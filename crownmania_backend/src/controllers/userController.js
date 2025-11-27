import User from '../models/User.js';
import { sgMail, EMAIL_TEMPLATES, EMAIL_CONFIG } from '../config/email.js';
import logger from '../config/logger.js';

export const createUser = async (req, res) => {
  try {
    const { email, walletAddress } = req.body;
    const userId = req.user.uid;

    // Create user in database
    const user = await User.create({
      id: userId,
      email,
      walletAddress
    });

    // Send welcome email
    await sgMail.send({
      to: email,
      from: EMAIL_CONFIG.from,
      templateId: EMAIL_TEMPLATES.WELCOME,
      dynamicTemplateData: {
        name: email.split('@')[0]
      }
    });

    res.json(user);
  } catch (error) {
    logger.error('Error creating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getUser = async (req, res) => {
  try {
    const userId = req.user.uid;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    logger.error('Error getting user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateUser = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { email, walletAddress } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update user fields
    if (email) user.email = email;
    if (walletAddress) user.walletAddress = walletAddress;

    await user.save();
    res.json(user);
  } catch (error) {
    logger.error('Error updating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getUserCollectibles = async (req, res) => {
  try {
    const userId = req.user.uid;
    const collectibles = await Collectible.findByOwner(userId);
    res.json(collectibles);
  } catch (error) {
    logger.error('Error getting user collectibles:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

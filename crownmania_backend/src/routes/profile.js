import express from 'express';
import { db } from '../config/firebase.js';
import encryptionService from '../services/encryptionService.js';
import signatureService from '../services/signatureService.js';
import logger from '../config/logger.js';
import { contentSecurity } from '../utils/contentSecurity.js';

const router = express.Router();

/**
 * Validate email format
 */
const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

/**
 * Validate phone format (E.164)
 */
const isValidPhone = (phone) => {
    return /^\+[1-9]\d{1,14}$/.test(phone);
};

/**
 * Validate birthday and check age (13+)
 */
const isValidBirthday = (birthday) => {
    const date = new Date(birthday);
    if (isNaN(date.getTime())) return false;

    const age = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    return age >= 13; // COPPA compliance
};

/**
 * POST /api/profile
 * Create or update user profile (after claim)
 */
router.post('/', async (req, res) => {
    try {
        const { walletAddress, name, email, phone, birthday, ageVerified, marketingOptIn, signature, message } = req.body;

        // Validate required fields
        if (!walletAddress) {
            return res.status(400).json({ error: 'Wallet address is required' });
        }

        // Verify wallet signature for profile creation
        if (signature && message) {
            try {
                await signatureService.verifySignature(walletAddress, signature, message);
            } catch (error) {
                return res.status(401).json({ error: 'Signature verification failed' });
            }
        }

        // Sanitize inputs
        const sanitizedWallet = contentSecurity.sanitizeInput(walletAddress);
        const sanitizedName = name ? contentSecurity.sanitizeInput(name) : null;

        // Validate fields
        if (email && !isValidEmail(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        if (phone && !isValidPhone(phone)) {
            return res.status(400).json({ error: 'Invalid phone format. Use E.164 format (+12345678900)' });
        }

        if (birthday && !isValidBirthday(birthday)) {
            return res.status(400).json({ error: 'Invalid birthday or user must be 13+ years old' });
        }

        // Age gate is required
        if (ageVerified !== undefined && ageVerified !== true) {
            return res.status(400).json({ error: 'Age verification is required (must be 13+)' });
        }

        // Build user data with encrypted PII
        const userData = {
            walletAddress: sanitizedWallet.toLowerCase(),
            name: sanitizedName,
            email: email ? encryptionService.encrypt(email) : null,
            emailPlain: email ? encryptionService.mask(email) : null, // For admin display
            phone: phone ? encryptionService.encrypt(phone) : null,
            phonePlain: phone ? encryptionService.mask(phone, 2) : null,
            birthday: birthday ? encryptionService.encrypt(birthday) : null,
            ageVerified: ageVerified === true,
            marketingOptIn: marketingOptIn === true,
            profileComplete: !!(name && email && ageVerified),
            role: 'user',
            updatedAt: new Date()
        };

        // Check if user already exists
        const userSnapshot = await db.collection('users')
            .where('walletAddress', '==', sanitizedWallet.toLowerCase())
            .limit(1)
            .get();

        let userId;

        if (userSnapshot.empty) {
            // Create new user
            userData.createdAt = new Date();
            userData.lastLogin = new Date();

            const userRef = await db.collection('users').add(userData);
            userId = userRef.id;

            logger.info(`Created profile for wallet ${sanitizedWallet.substring(0, 10)}...`);
        } else {
            // Update existing user
            const userDoc = userSnapshot.docs[0];
            userId = userDoc.id;

            await db.collection('users').doc(userId).update(userData);

            logger.info(`Updated profile for wallet ${sanitizedWallet.substring(0, 10)}...`);
        }

        // Log profile action
        contentSecurity.logSecurityEvent('profile_updated', {
            userId,
            walletAddress: sanitizedWallet.substring(0, 10) + '...',
            profileComplete: userData.profileComplete
        }, req.ip, sanitizedWallet);

        res.json({
            success: true,
            userId,
            profileComplete: userData.profileComplete
        });
    } catch (error) {
        logger.error('Error creating/updating profile:', error);
        res.status(500).json({ error: 'Failed to save profile' });
    }
});

/**
 * GET /api/profile/:walletAddress
 * Get user profile (masked for privacy unless owner)
 */
router.get('/:walletAddress', async (req, res) => {
    try {
        const { walletAddress } = req.params;
        const { signature, message } = req.query;

        // Validate wallet address
        if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
            return res.status(400).json({ error: 'Invalid wallet address' });
        }

        // Check if requester is owner
        let isOwner = false;
        if (signature && message) {
            try {
                await signatureService.verifySignature(walletAddress, signature, message);
                isOwner = true;
            } catch (error) {
                // Not owner, continue with masked data
            }
        }

        const userSnapshot = await db.collection('users')
            .where('walletAddress', '==', walletAddress.toLowerCase())
            .limit(1)
            .get();

        if (userSnapshot.empty) {
            return res.status(404).json({ error: 'Profile not found' });
        }

        const userData = userSnapshot.docs[0].data();

        // Return full data if owner, masked data otherwise
        const response = {
            walletAddress: userData.walletAddress,
            name: userData.name,
            profileComplete: userData.profileComplete,
            createdAt: userData.createdAt?.toDate().toISOString()
        };

        if (isOwner) {
            // Decrypt PII for owner
            response.email = userData.email ? encryptionService.decrypt(userData.email) : null;
            response.phone = userData.phone ? encryptionService.decrypt(userData.phone) : null;
            response.birthday = userData.birthday ? encryptionService.decrypt(userData.birthday) : null;
            response.marketingOptIn = userData.marketingOptIn;
        } else {
            // Masked data for non-owners
            response.email = userData.emailPlain || null;
            response.phone = userData.phonePlain || null;
        }

        res.json(response);
    } catch (error) {
        logger.error('Error fetching profile:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

/**
 * GET /api/profile/data-export/:walletAddress
 * GDPR data export (owner only)
 */
router.get('/data-export/:walletAddress', async (req, res) => {
    try {
        const { walletAddress } = req.params;
        const { signature, message } = req.query;

        // Must verify owner
        if (!signature || !message) {
            return res.status(401).json({ error: 'Signature required for data export' });
        }

        try {
            await signatureService.verifySignature(walletAddress, signature, message);
        } catch (error) {
            return res.status(401).json({ error: 'Signature verification failed' });
        }

        // Get user data
        const userSnapshot = await db.collection('users')
            .where('walletAddress', '==', walletAddress.toLowerCase())
            .limit(1)
            .get();

        if (userSnapshot.empty) {
            return res.status(404).json({ error: 'No data found' });
        }

        const userData = userSnapshot.docs[0].data();

        // Get collectibles
        const collectiblesSnapshot = await db.collection('collectibles')
            .where('ownerId', '==', walletAddress.toLowerCase())
            .get();

        const collectibles = collectiblesSnapshot.docs.map(doc => doc.data());

        // Decrypt all PII
        const exportData = {
            profile: {
                walletAddress: userData.walletAddress,
                name: userData.name,
                email: userData.email ? encryptionService.decrypt(userData.email) : null,
                phone: userData.phone ? encryptionService.decrypt(userData.phone) : null,
                birthday: userData.birthday ? encryptionService.decrypt(userData.birthday) : null,
                marketingOptIn: userData.marketingOptIn,
                createdAt: userData.createdAt?.toDate().toISOString()
            },
            collectibles: collectibles.map(c => ({
                serialNumber: c.serialNumber,
                productName: c.productName,
                edition: c.edition,
                claimedAt: c.createdAt?.toDate().toISOString()
            }))
        };

        logger.info(`Data export requested by ${walletAddress.substring(0, 10)}...`);

        res.json(exportData);
    } catch (error) {
        logger.error('Error exporting data:', error);
        res.status(500).json({ error: 'Failed to export data' });
    }
});

export { router as profileRouter };
export default router;

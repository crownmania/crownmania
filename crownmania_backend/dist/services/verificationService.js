import { firestore } from '../config/firebase.js';
import { sendVerificationEmail } from '../config/email.js';
import crypto from 'crypto';

/**
 * Service for managing collectible verification and token claiming
 */
export const verificationService = {
  /**
   * Verify a product by its serial number
   * @param {string} serialNumber - The product serial number
   * @returns {Promise<{verified: boolean, product: object|null, message: string}>}
   */
  verifySerialNumber: async serialNumber => {
    try {
      // Check if serial number exists in Firestore
      const productRef = firestore.collection('products');
      const snapshot = await productRef.where('serialNumber', '==', serialNumber).get();
      if (snapshot.empty) {
        return {
          verified: false,
          product: null,
          message: 'Product not found. This may be counterfeit or the serial number is incorrect.'
        };
      }

      // Get the product data
      const productDoc = snapshot.docs[0];
      const productData = productDoc.data();

      // Check if the product has already been claimed
      if (productData.tokenClaimed) {
        return {
          verified: true,
          product: {
            id: productDoc.id,
            ...productData,
            // Exclude sensitive information
            purchaseEmail: undefined,
            purchaseDetails: undefined
          },
          message: 'Product is authentic. Digital token has already been claimed.'
        };
      }
      return {
        verified: true,
        product: {
          id: productDoc.id,
          ...productData,
          // Exclude sensitive information
          purchaseEmail: undefined,
          purchaseDetails: undefined
        },
        message: 'Product verified successfully.'
      };
    } catch (error) {
      console.error('Error verifying serial number:', error);
      throw new Error('Failed to verify product');
    }
  },
  /**
   * Generate a time-limited verification token for email verification
   * @param {string} serialNumber - The product serial number
   * @param {string} email - The email to verify against
   * @returns {Promise<{success: boolean, message: string}>}
   */
  generateEmailVerification: async (serialNumber, email) => {
    try {
      // Verify the serial number first
      const {
        verified,
        product
      } = await verificationService.verifySerialNumber(serialNumber);
      if (!verified || !product) {
        return {
          success: false,
          message: 'Invalid serial number'
        };
      }

      // Get product details from Firestore to verify the email
      const productRef = firestore.collection('products').doc(product.id);
      const productDoc = await productRef.get();
      const productData = productDoc.data();

      // Verify that the email matches the purchase email
      if (productData.purchaseEmail.toLowerCase() !== email.toLowerCase()) {
        return {
          success: false,
          message: 'Email does not match the purchase record'
        };
      }

      // Generate a secure verification token (valid for 15 minutes)
      const token = crypto.randomBytes(32).toString('hex');
      const expiryTime = new Date();
      expiryTime.setMinutes(expiryTime.getMinutes() + 15);

      // Store the token in Firestore
      await firestore.collection('verificationTokens').add({
        token,
        serialNumber,
        email,
        expiryTime,
        createdAt: new Date(),
        used: false
      });

      // Send verification email
      await sendVerificationEmail(email, token, serialNumber);
      return {
        success: true,
        message: 'Verification email sent. Please check your inbox.'
      };
    } catch (error) {
      console.error('Error generating email verification:', error);
      throw new Error('Failed to generate email verification');
    }
  },
  /**
   * Verify a token sent via email
   * @param {string} token - The verification token
   * @returns {Promise<{success: boolean, serialNumber: string|null, message: string}>}
   */
  verifyToken: async token => {
    try {
      // Find the token in Firestore
      const tokenRef = firestore.collection('verificationTokens');
      const snapshot = await tokenRef.where('token', '==', token).where('used', '==', false).get();
      if (snapshot.empty) {
        return {
          success: false,
          serialNumber: null,
          message: 'Invalid or expired token'
        };
      }

      // Get the token data
      const tokenDoc = snapshot.docs[0];
      const tokenData = tokenDoc.data();

      // Check if token has expired
      const expiryTime = tokenData.expiryTime.toDate();
      if (expiryTime < new Date()) {
        return {
          success: false,
          serialNumber: null,
          message: 'Token has expired'
        };
      }

      // Mark token as used
      await tokenRef.doc(tokenDoc.id).update({
        used: true
      });
      return {
        success: true,
        serialNumber: tokenData.serialNumber,
        message: 'Token verified successfully'
      };
    } catch (error) {
      console.error('Error verifying token:', error);
      throw new Error('Failed to verify token');
    }
  },
  /**
   * Issue a token to the user after successful verification
   * @param {string} serialNumber - The verified serial number
   * @param {string} walletAddress - The wallet address to issue the token to
   * @returns {Promise<{success: boolean, tokenId: string|null, message: string}>}
   */
  issueToken: async (serialNumber, walletAddress) => {
    try {
      // Find the product in Firestore
      const productRef = firestore.collection('products');
      const snapshot = await productRef.where('serialNumber', '==', serialNumber).get();
      if (snapshot.empty) {
        return {
          success: false,
          tokenId: null,
          message: 'Product not found'
        };
      }

      // Get the product data
      const productDoc = snapshot.docs[0];
      const productData = productDoc.data();

      // Check if token has already been claimed
      if (productData.tokenClaimed) {
        return {
          success: false,
          tokenId: null,
          message: 'Token has already been claimed for this product'
        };
      }

      // Create a token record in Firestore (in a real-world scenario, this would involve blockchain operations)
      const tokenRef = await firestore.collection('tokens').add({
        productId: productDoc.id,
        serialNumber,
        walletAddress,
        modelUrl: productData.modelUrl,
        productName: productData.name,
        issuedAt: new Date(),
        metadata: {
          name: `${productData.name} #${serialNumber.slice(-6)}`,
          description: productData.description,
          image: productData.imageUrl
        }
      });

      // Mark the product as claimed
      await productRef.doc(productDoc.id).update({
        tokenClaimed: true,
        tokenId: tokenRef.id,
        claimedBy: walletAddress,
        claimedAt: new Date()
      });
      return {
        success: true,
        tokenId: tokenRef.id,
        message: 'Token issued successfully'
      };
    } catch (error) {
      console.error('Error issuing token:', error);
      throw new Error('Failed to issue token');
    }
  },
  /**
   * Get all tokens owned by a wallet address
   * @param {string} walletAddress - The wallet address to check
   * @returns {Promise<Array>} - Array of token objects
   */
  getWalletTokens: async walletAddress => {
    try {
      // Find all tokens owned by the wallet address
      const tokensRef = firestore.collection('tokens');
      const snapshot = await tokensRef.where('walletAddress', '==', walletAddress).get();
      if (snapshot.empty) {
        return [];
      }

      // Map the tokens to a more user-friendly format
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          productName: data.productName,
          serialNumber: data.serialNumber,
          modelUrl: data.modelUrl,
          issuedAt: data.issuedAt.toDate(),
          metadata: data.metadata
        };
      });
    } catch (error) {
      console.error('Error getting wallet tokens:', error);
      throw new Error('Failed to get wallet tokens');
    }
  }
};
export default verificationService;
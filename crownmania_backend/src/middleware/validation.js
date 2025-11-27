import Joi from 'joi';
import logger from '../config/logger.js';

const validateRequest = (schema, type = 'body') => {
  return (req, res, next) => {
    const { error } = schema.validate(req[type], { abortEarly: false });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      logger.warn('Validation error:', { 
        path: req.path, 
        errors,
        requestBody: req[type]
      });
      
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors
      });
    }
    next();
  };
};

// User validation schemas
export const userSchema = Joi.object({
  email: Joi.string().email().required(),
  walletAddress: Joi.string()
    .pattern(/^0x[a-fA-F0-9]{40}$/)
    .message('Invalid Ethereum wallet address format')
    .required(),
  name: Joi.string().min(2).max(50).optional(),
  phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional()
});

// Serial number validation schema
export const serialNumberSchema = Joi.object({
  serialNumber: Joi.string()
    .pattern(/^[A-Z0-9]{6,20}$/)
    .message('Serial number must be 6-20 characters long and contain only uppercase letters and numbers')
    .required(),
  recaptchaToken: Joi.string().required()
});

// Wallet validation schema
export const walletSchema = Joi.object({
  walletAddress: Joi.string()
    .pattern(/^0x[a-fA-F0-9]{40}$/)
    .message('Invalid Ethereum wallet address format')
    .required(),
  signature: Joi.string()
    .pattern(/^0x[a-fA-F0-9]{130}$/)
    .message('Invalid signature format')
    .required(),
  message: Joi.string().required()
});

// Order validation schema
export const orderSchema = Joi.object({
  items: Joi.array().items(
    Joi.object({
      id: Joi.string().required(),
      quantity: Joi.number().integer().min(1).max(10).required(),
      price: Joi.number().positive().required()
    })
  ).min(1).required(),
  shippingAddress: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    street: Joi.string().min(5).max(100).required(),
    city: Joi.string().min(2).max(50).required(),
    state: Joi.string().length(2).required(),
    zip: Joi.string().pattern(/^\d{5}(-\d{4})?$/).required(),
    country: Joi.string().length(2).required(),
    phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).required()
  }).required()
});

// NFT minting validation schema
export const mintingSchema = Joi.object({
  serialNumber: Joi.string()
    .pattern(/^[A-Z0-9]{6,20}$/)
    .required(),
  recipientAddress: Joi.string()
    .pattern(/^0x[a-fA-F0-9]{40}$/)
    .message('Invalid recipient wallet address')
    .required(),
  metadata: Joi.object({
    name: Joi.string().required(),
    description: Joi.string().required(),
    image: Joi.string().uri().required(),
    attributes: Joi.array().items(
      Joi.object({
        trait_type: Joi.string().required(),
        value: Joi.string().required()
      })
    ).required()
  }).required()
});

// Shipping update validation schema
export const shippingSchema = Joi.object({
  trackingNumber: Joi.string()
    .pattern(/^[A-Z0-9]{6,30}$/)
    .message('Invalid tracking number format')
    .required(),
  carrier: Joi.string().valid('USPS', 'UPS', 'FedEx', 'DHL').required(),
  estimatedDeliveryDate: Joi.date().greater('now').required()
});

export const validateSerialNumber = validateRequest(serialNumberSchema);
export const validateWallet = validateRequest(walletSchema);
export const validateOrder = validateRequest(orderSchema);
export const validateUser = validateRequest(userSchema);
export const validateMinting = validateRequest(mintingSchema);
export const validateShipping = validateRequest(shippingSchema);

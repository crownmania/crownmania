import express from 'express';

const router = express.Router();

const MAX_TOKEN_ID = 499; // tokens 0-499 = 500 editions

/**
 * @route GET /api/metadata/:tokenId
 * @desc ERC-721 metadata for lazy-minted tokens 400-499 (batch 2).
 *       Tokens 0-399 resolve to the original IPFS batch; this endpoint
 *       serves the extension batch lazily minted via HTTPS metadata.
 * @access Public
 */
router.get('/:tokenId', (req, res) => {
  const tokenId = Number(req.params.tokenId);
  if (!Number.isInteger(tokenId) || tokenId < 400 || tokenId > MAX_TOKEN_ID) {
    return res.status(404).json({ error: 'Unknown token' });
  }

  res.set('Cache-Control', 'public, max-age=86400');
  res.json({
    attributes: [
      { trait_type: 'collection', value: 'CrownMania' },
      { trait_type: 'series', value: 'Lil Durk' },
      { trait_type: 'edition', value: 'Regular' }
    ],
    background_color: '#000000',
    description: 'Official Lil Durk digital collectible from CrownMania',
    name: `Lil Durk Digital Crown #${tokenId + 1}`,
    price_amount: '0',
    price_currency: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    supply: '1'
  });
});

export default router;

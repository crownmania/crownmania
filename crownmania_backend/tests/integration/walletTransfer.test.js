/**
 * External NFT Transfer Integration Tests
 * ========================================
 * Tests the 2FA-gated external transfer flow (OpenSea security model):
 *   - POST /api/wallet/transfer/request-2fa
 *   - POST /api/wallet/transfer
 *
 * Uses jest.unstable_mockModule for proper ESM mocking
 */
import { jest } from '@jest/globals';

// ── Mocks ──
const mockFirestoreData = {};
let mockDocCounter = 0;

const mockDoc = (id, data) => ({
    id: id || `doc_${++mockDocCounter}`,
    exists: !!data,
    data: () => data || null,
    ref: { id: id || `doc_${mockDocCounter}` }
});

const mockGet = jest.fn();
const mockAdd = jest.fn().mockResolvedValue({ id: 'new_doc_id' });
const mockUpdate = jest.fn().mockResolvedValue({});
const mockWhere = jest.fn().mockReturnThis();
const mockOrderBy = jest.fn().mockReturnThis();
const mockLimit = jest.fn().mockReturnThis();

const mockCollection = jest.fn().mockReturnValue({
    doc: jest.fn((id) => ({
        get: jest.fn().mockImplementation(() => {
            const data = mockFirestoreData[id];
            return Promise.resolve(mockDoc(id, data));
        }),
        update: mockUpdate,
    })),
    add: mockAdd,
    where: mockWhere,
    orderBy: mockOrderBy,
    limit: mockLimit,
    get: mockGet,
});

// Mock Firebase
jest.unstable_mockModule('../../src/config/firebase.js', () => ({
    db: { collection: mockCollection },
    default: { db: { collection: mockCollection } },
}));

// Mock logger
jest.unstable_mockModule('../../src/config/logger.js', () => ({
    default: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
    },
}));

// Mock signatureService
const mockVerifySignature = jest.fn();
const mockGenerateNonce = jest.fn();
jest.unstable_mockModule('../../src/services/signatureService.js', () => ({
    default: {
        verifySignature: mockVerifySignature,
        generateNonce: mockGenerateNonce,
    },
    signatureService: {
        verifySignature: mockVerifySignature,
        generateNonce: mockGenerateNonce,
    },
}));

// Mock ownershipService
const mockVerifyOwnership = jest.fn();
jest.unstable_mockModule('../../src/services/ownershipService.js', () => ({
    default: {
        verifyOwnership: mockVerifyOwnership,
        checkNFTOwnership: jest.fn(),
        getWalletNFTs: jest.fn(),
    },
    ownershipService: {
        verifyOwnership: mockVerifyOwnership,
        checkNFTOwnership: jest.fn(),
        getWalletNFTs: jest.fn(),
    },
}));

// Mock twoFactorService
const mockVerifyCode = jest.fn();
const mockGetStatus = jest.fn();
const mockSendLoginChallenge = jest.fn();
jest.unstable_mockModule('../../src/services/twoFactorService.js', () => ({
    default: {
        verifyCode: mockVerifyCode,
        getStatus: mockGetStatus,
        sendLoginChallenge: mockSendLoginChallenge,
        generateCode: jest.fn(),
        sendEmailCode: jest.fn(),
        sendPhoneCode: jest.fn(),
        enable2FA: jest.fn(),
        disable2FA: jest.fn(),
    },
    twoFactorService: {
        verifyCode: mockVerifyCode,
        getStatus: mockGetStatus,
        sendLoginChallenge: mockSendLoginChallenge,
    },
}));

// Mock thirdwebService
const mockTransferNFTToWallet = jest.fn();
jest.unstable_mockModule('../../src/services/thirdwebService.js', () => ({
    transferNFTToWallet: mockTransferNFTToWallet,
    getAvailableNFTs: jest.fn().mockResolvedValue([]),
    checkNFTOwnership: jest.fn().mockResolvedValue({ owned: false, tokens: [] }),
    getNFTMetadata: jest.fn().mockResolvedValue(null),
    default: {
        transferNFTToWallet: mockTransferNFTToWallet,
        getAvailableNFTs: jest.fn(),
        checkNFTOwnership: jest.fn(),
        getNFTMetadata: jest.fn(),
    },
}));

// Mock contentSecurity
jest.unstable_mockModule('../../src/utils/contentSecurity.js', () => ({
    contentSecurity: {
        sanitizeInput: jest.fn((input) => input),
        logSecurityEvent: jest.fn(),
    },
}));

// Mock validation middleware (pass through)
jest.unstable_mockModule('../../src/middleware/validation.js', () => ({
    validateTransfer: (req, res, next) => next(),
}));

// Mock rate limiter (pass through in tests)
jest.unstable_mockModule('express-rate-limit', () => ({
    default: () => (req, res, next) => next(),
}));

// ── Import after mocks ──
const { default: express } = await import('express');
const { default: request } = await import('supertest');
const { walletRouter } = await import('../../src/routes/wallet.js');

// ── Test App ──
const app = express();
app.use(express.json());
app.use('/api/wallet', walletRouter);

// ── Test Data ──
const SOURCE_WALLET = '0x1234567890abcdef1234567890abcdef12345678';
const DEST_WALLET = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
const COLLECTIBLE_ID = 'collectible_42';
const VALID_SIGNATURE = '0x' + 'ab'.repeat(65);
const VALID_MESSAGE = 'Sign this message to prove wallet ownership:\nWallet: 0x1234567890abcdef1234567890abcdef12345678\nNonce: abc-123\nTimestamp: 1700000000000';

const MOCK_COLLECTIBLE = {
    ownerId: SOURCE_WALLET.toLowerCase(),
    serialNumber: 'CM-DURK-001',
    productName: 'Lil Durk Series 01',
    edition: 42,
    totalEditions: 500,
    blockchainTokenId: '42',
    contractAddress: '0xContractAddress',
    status: 'active',
    metadata: { name: 'Lil Durk #42' },
};

// ── Tests ──
describe('External NFT Transfer', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockDocCounter = 0;

        // Setup default Firestore data
        mockFirestoreData[COLLECTIBLE_ID] = { ...MOCK_COLLECTIBLE };

        // Default mock behaviors
        mockVerifySignature.mockResolvedValue(true);
        mockVerifyCode.mockResolvedValue(true);
        mockVerifyOwnership.mockResolvedValue(true);
        mockGetStatus.mockResolvedValue({ twoFactorEnabled: true, emailVerified: true, phoneVerified: true });
        mockSendLoginChallenge.mockResolvedValue({ required: true, method: 'email' });
        mockTransferNFTToWallet.mockResolvedValue({
            success: true,
            transactionHash: '0xTxHash123',
            tokenId: '42',
            contractAddress: '0xContractAddress',
            recipient: DEST_WALLET,
        });
    });

    // ── Request 2FA ──
    describe('POST /api/wallet/transfer/request-2fa', () => {
        it('should send 2FA code when user has 2FA enabled', async () => {
            const res = await request(app)
                .post('/api/wallet/transfer/request-2fa')
                .send({ walletAddress: SOURCE_WALLET, method: 'email' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.method).toBe('email');
            expect(res.body.validityMinutes).toBe(20);
            expect(mockSendLoginChallenge).toHaveBeenCalledWith(SOURCE_WALLET, 'email');
        });

        it('should reject if 2FA is not enabled', async () => {
            mockGetStatus.mockResolvedValue({ twoFactorEnabled: false });

            const res = await request(app)
                .post('/api/wallet/transfer/request-2fa')
                .send({ walletAddress: SOURCE_WALLET, method: 'email' });

            expect(res.status).toBe(403);
            expect(res.body.twoFactorRequired).toBe(true);
        });

        it('should reject invalid method', async () => {
            const res = await request(app)
                .post('/api/wallet/transfer/request-2fa')
                .send({ walletAddress: SOURCE_WALLET, method: 'pigeon' });

            expect(res.status).toBe(400);
        });

        it('should reject missing wallet address', async () => {
            const res = await request(app)
                .post('/api/wallet/transfer/request-2fa')
                .send({ method: 'email' });

            expect(res.status).toBe(400);
        });

        it('should reject invalid wallet format', async () => {
            const res = await request(app)
                .post('/api/wallet/transfer/request-2fa')
                .send({ walletAddress: 'not-a-wallet', method: 'email' });

            expect(res.status).toBe(400);
        });
    });

    // ── Transfer ──
    describe('POST /api/wallet/transfer', () => {
        const validTransferBody = {
            collectibleId: COLLECTIBLE_ID,
            destinationAddress: DEST_WALLET,
            twoFactorCode: '123456',
            twoFactorMethod: 'email',
            walletAddress: SOURCE_WALLET,
            signature: VALID_SIGNATURE,
            message: VALID_MESSAGE,
        };

        it('should successfully transfer NFT with valid 2FA + signature', async () => {
            const res = await request(app)
                .post('/api/wallet/transfer')
                .send(validTransferBody);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.transfer.from).toBe(SOURCE_WALLET.toLowerCase());
            expect(res.body.transfer.to).toBe(DEST_WALLET.toLowerCase());
            expect(res.body.transfer.transactionHash).toBe('0xTxHash123');
            expect(res.body.transfer.edition).toBe(42);

            // Verify all security steps were called
            expect(mockVerifySignature).toHaveBeenCalled();
            expect(mockVerifyCode).toHaveBeenCalled();
            expect(mockVerifyOwnership).toHaveBeenCalled();
            expect(mockTransferNFTToWallet).toHaveBeenCalledWith(DEST_WALLET, '42');
            expect(mockUpdate).toHaveBeenCalled();
        });

        it('should reject transfer without valid wallet signature', async () => {
            mockVerifySignature.mockRejectedValue(new Error('Invalid signature'));

            const res = await request(app)
                .post('/api/wallet/transfer')
                .send(validTransferBody);

            expect(res.status).toBe(401);
            expect(res.body.error).toContain('signature');
            expect(mockTransferNFTToWallet).not.toHaveBeenCalled();
        });

        it('should reject transfer with invalid 2FA code', async () => {
            mockVerifyCode.mockRejectedValue(new Error('Invalid verification code'));

            const res = await request(app)
                .post('/api/wallet/transfer')
                .send(validTransferBody);

            expect(res.status).toBe(401);
            expect(res.body.error).toContain('2FA');
            expect(mockTransferNFTToWallet).not.toHaveBeenCalled();
        });

        it('should reject transfer to the same wallet address', async () => {
            const res = await request(app)
                .post('/api/wallet/transfer')
                .send({
                    ...validTransferBody,
                    destinationAddress: SOURCE_WALLET
                });

            expect(res.status).toBe(400);
            expect(res.body.error).toContain('same');
            expect(mockTransferNFTToWallet).not.toHaveBeenCalled();
        });

        it('should reject when collectible not found', async () => {
            delete mockFirestoreData[COLLECTIBLE_ID];

            const res = await request(app)
                .post('/api/wallet/transfer')
                .send(validTransferBody);

            expect(res.status).toBe(404);
            expect(mockTransferNFTToWallet).not.toHaveBeenCalled();
        });

        it('should reject when caller is not the owner', async () => {
            mockFirestoreData[COLLECTIBLE_ID] = {
                ...MOCK_COLLECTIBLE,
                ownerId: '0xotherowner00000000000000000000000000000000'
            };

            const res = await request(app)
                .post('/api/wallet/transfer')
                .send(validTransferBody);

            expect(res.status).toBe(403);
            expect(res.body.error).toContain('not the owner');
            expect(mockTransferNFTToWallet).not.toHaveBeenCalled();
        });

        it('should reject when NFT not minted on-chain yet', async () => {
            mockFirestoreData[COLLECTIBLE_ID] = {
                ...MOCK_COLLECTIBLE,
                blockchainTokenId: null,
                contractAddress: null
            };

            const res = await request(app)
                .post('/api/wallet/transfer')
                .send(validTransferBody);

            expect(res.status).toBe(400);
            expect(res.body.error).toContain('not been minted');
            expect(mockTransferNFTToWallet).not.toHaveBeenCalled();
        });

        it('should reject when on-chain ownership check fails', async () => {
            mockVerifyOwnership.mockResolvedValue(false);

            const res = await request(app)
                .post('/api/wallet/transfer')
                .send(validTransferBody);

            expect(res.status).toBe(403);
            expect(res.body.error).toContain('On-chain ownership');
            expect(mockTransferNFTToWallet).not.toHaveBeenCalled();
        });

        it('should update collectible status after successful transfer', async () => {
            await request(app)
                .post('/api/wallet/transfer')
                .send(validTransferBody);

            expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
                ownerId: DEST_WALLET.toLowerCase(),
                previousOwnerId: SOURCE_WALLET.toLowerCase(),
                status: 'transferred_external',
                lastTransferTo: DEST_WALLET.toLowerCase(),
            }));
        });
    });
});

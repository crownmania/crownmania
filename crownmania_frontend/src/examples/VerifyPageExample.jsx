/**
 * EXAMPLE: Integrating useAuth into existing component
 * =====================================================
 * This shows how to update VerifyPage.jsx to use the new auth abstraction
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { verifySerial, claimCollectible, getNonce } from '../api/verificationApi';

export default function VerifyPage() {
    const { address, isConnected, login, signMessage, provider } = useAuth();

    const [serialNumber, setSerialNumber] = useState('');
    const [verifying, setVerifying] = useState(false);
    const [claiming, setClaiming] = useState(false);
    const [verificationResult, setVerificationResult] = useState(null);
    const [claimResult, setClaimResult] = useState(null);
    const [error, setError] = useState(null);

    // Show which provider is active (dev info)
    useEffect(() => {
        if (provider) {
            console.log(`🔐 Auth Provider: ${provider.getProviderName()}`);
        }
    }, [provider]);

    async function handleVerify() {
        if (!serialNumber.trim()) {
            setError('Please enter a serial number');
            return;
        }

        setVerifying(true);
        setError(null);

        try {
            const result = await verifySerial(serialNumber);
            setVerificationResult(result);

            if (!result.claimable) {
                setError(result.message || 'This serial cannot be claimed');
            }
        } catch (err) {
            console.error('Verification failed:', err);
            setError(err.message || 'Verification failed');
        } finally {
            setVerifying(false);
        }
    }

    async function handleConnect() {
        try {
            setError(null);
            await login();
            console.log('✅ Connected:', address);
        } catch (err) {
            console.error('Login failed:', err);
            setError(err.message || 'Failed to connect wallet');
        }
    }

    async function handleClaim() {
        if (!isConnected) {
            setError('Please connect your wallet first');
            return;
        }

        if (!verificationResult?.claimable) {
            setError('Please verify serial number first');
            return;
        }

        setClaiming(true);
        setError(null);

        try {
            // Step 1: Get nonce from backend
            console.log('📝 Getting nonce for:', address);
            const { nonce } = await getNonce(address);

            // Step 2: Sign message with wallet
            const message = `Sign this message to authenticate with CrownMania.\n\nNonce: ${nonce}`;
            console.log('✍️  Signing message...');
            const signature = await signMessage(message);
            console.log('✅ Signature obtained');

            // Step 3: Submit claim to backend
            console.log('🎯 Submitting claim...');
            const result = await claimCollectible({
                claimCodeId: serialNumber,
                walletAddress: address,
                signature,
                message,
            });

            setClaimResult(result);
            console.log('🎉 Claim successful!', result);

        } catch (err) {
            console.error('Claim failed:', err);
            setError(err.message || 'Failed to claim collectible');
        } finally {
            setClaiming(false);
        }
    }

    return (
        <div className="verify-page">
            <h1>Claim Your Collectible</h1>

            {/* Dev info: Show active provider */}
            {process.env.NODE_ENV === 'development' && provider && (
                <div style={{
                    padding: '8px',
                    background: '#f0f0f0',
                    borderRadius: '4px',
                    fontSize: '12px',
                    marginBottom: '16px'
                }}>
                    🔐 Provider: <strong>{provider.getProviderName()}</strong>
                </div>
            )}

            {/* Step 1: Verify Serial */}
            <div className="verify-section">
                <h2>Step 1: Verify Serial Number</h2>
                <input
                    type="text"
                    placeholder="Enter serial number"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    disabled={verifying}
                />
                <button onClick={handleVerify} disabled={verifying}>
                    {verifying ? 'Verifying...' : 'Verify'}
                </button>

                {verificationResult && (
                    <div className={verificationResult.claimable ? 'success' : 'error'}>
                        {verificationResult.message}
                    </div>
                )}
            </div>

            {/* Step 2: Connect Wallet */}
            {verificationResult?.claimable && (
                <div className="connect-section">
                    <h2>Step 2: Connect Wallet</h2>
                    {!isConnected ? (
                        <button onClick={handleConnect}>
                            Connect Wallet
                        </button>
                    ) : (
                        <div className="connected">
                            ✅ Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
                        </div>
                    )}
                </div>
            )}

            {/* Step 3: Claim */}
            {isConnected && verificationResult?.claimable && (
                <div className="claim-section">
                    <h2>Step 3: Claim Collectible</h2>
                    <button
                        onClick={handleClaim}
                        disabled={claiming}
                        className="claim-button"
                    >
                        {claiming ? 'Claiming...' : 'Claim NFT'}
                    </button>
                </div>
            )}

            {/* Claim Result */}
            {claimResult && (
                <div className="claim-result success">
                    <h3>🎉 Claim Successful!</h3>
                    <p>Edition: #{claimResult.editionNumber} / {claimResult.totalEditions}</p>
                    <p>Status: {claimResult.status}</p>
                    <p>{claimResult.message}</p>
                </div>
            )}

            {/* Error Display */}
            {error && (
                <div className="error-message">
                    ❌ {error}
                </div>
            )}
        </div>
    );
}

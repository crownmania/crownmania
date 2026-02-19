/**
 * CrownMania Sound Effects System
 * Uses Web Audio API to generate premium procedural sounds
 * No external audio files needed — all sounds are synthesized
 */

let audioCtx = null;

function getAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    // Resume if suspended (browser autoplay policy)
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

// Master volume (0-1)
let masterVolume = 0.35;
let soundEnabled = true;

export function setSoundEnabled(enabled) {
    soundEnabled = enabled;
}

export function setMasterVolume(vol) {
    masterVolume = Math.max(0, Math.min(1, vol));
}

/**
 * Play a note with given parameters
 */
function playTone(freq, duration, type = 'sine', volume = 0.3, startTime = 0, fadeOut = true) {
    if (!soundEnabled) return;
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);
    gain.gain.setValueAtTime(volume * masterVolume, ctx.currentTime + startTime);

    if (fadeOut) {
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + duration);
    }

    osc.start(ctx.currentTime + startTime);
    osc.stop(ctx.currentTime + startTime + duration);
}

/**
 * Play noise burst (for impacts, whooshes)
 */
function playNoise(duration, volume = 0.1, startTime = 0, bandpass = null) {
    if (!soundEnabled) return;
    const ctx = getAudioContext();
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize); // Fade out naturally
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume * masterVolume, ctx.currentTime + startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + duration);

    if (bandpass) {
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = bandpass;
        filter.Q.value = 2;
        source.connect(filter);
        filter.connect(gain);
    } else {
        source.connect(gain);
    }

    gain.connect(ctx.destination);
    source.start(ctx.currentTime + startTime);
    source.stop(ctx.currentTime + startTime + duration);
}

// ============================================
// SOUND EFFECTS
// ============================================

/**
 * ✅ Verification Success — bright ascending chime
 */
export function playVerificationSuccess() {
    if (!soundEnabled) return;
    // C5 → E5 → G5 → C6 (C major arpeggio, uplifting)
    playTone(523.25, 0.2, 'sine', 0.25, 0);
    playTone(659.25, 0.2, 'sine', 0.25, 0.1);
    playTone(783.99, 0.2, 'sine', 0.3, 0.2);
    playTone(1046.50, 0.4, 'sine', 0.35, 0.3);
    // Add a subtle shimmer
    playTone(1046.50, 0.5, 'triangle', 0.08, 0.35);
}

/**
 * ❌ Error / Failed — descending minor tone
 */
export function playError() {
    if (!soundEnabled) return;
    playTone(440, 0.15, 'square', 0.15, 0);
    playTone(349.23, 0.25, 'square', 0.12, 0.12);
    playNoise(0.1, 0.05, 0);
}

/**
 * 🔓 Unlock / Panel Transition — smooth whoosh
 */
export function playUnlock() {
    if (!soundEnabled) return;
    playNoise(0.4, 0.08, 0, 2000);
    playTone(200, 0.1, 'sine', 0.08, 0);
    playTone(600, 0.3, 'sine', 0.12, 0.05);
}

/**
 * 🖱️ UI Click — subtle tap
 */
export function playClick() {
    if (!soundEnabled) return;
    playTone(800, 0.05, 'sine', 0.1, 0);
    playTone(1200, 0.03, 'sine', 0.06, 0.02);
}

/**
 * 💎 Diamond Rarity Reveal — epic crystalline fanfare
 */
export function playDiamondReveal() {
    if (!soundEnabled) return;
    // Shimmering ice crystal arpeggio
    playTone(1046.50, 0.15, 'sine', 0.2, 0);      // C6
    playTone(1318.51, 0.15, 'sine', 0.22, 0.08);   // E6
    playTone(1567.98, 0.15, 'sine', 0.25, 0.16);   // G6
    playTone(2093.00, 0.6, 'sine', 0.35, 0.24);    // C7 — high sparkle
    // Harmonic shimmer
    playTone(2093.00, 0.8, 'triangle', 0.1, 0.3);
    playTone(2637.02, 0.6, 'sine', 0.08, 0.4);     // E7 — ethereal overtone
    // Sparkle noise
    playNoise(0.5, 0.04, 0.25, 6000);
    // Deep sub for gravity
    playTone(130.81, 0.8, 'sine', 0.15, 0.2);      // C3
}

/**
 * 💿 Platinum Rarity Reveal — metallic shine
 */
export function playPlatinumReveal() {
    if (!soundEnabled) return;
    playTone(783.99, 0.15, 'sine', 0.2, 0);        // G5
    playTone(987.77, 0.15, 'sine', 0.22, 0.1);     // B5
    playTone(1174.66, 0.15, 'sine', 0.25, 0.2);    // D6
    playTone(1567.98, 0.5, 'sine', 0.3, 0.3);      // G6
    // Metallic shimmer
    playTone(1567.98, 0.6, 'triangle', 0.08, 0.35);
    playNoise(0.3, 0.03, 0.3, 4000);
    playTone(196.00, 0.6, 'sine', 0.12, 0.2);      // G3 sub
}

/**
 * 🥇 Gold Rarity Reveal — warm brass fanfare
 */
export function playGoldReveal() {
    if (!soundEnabled) return;
    playTone(523.25, 0.15, 'sawtooth', 0.1, 0);    // C5
    playTone(659.25, 0.15, 'sawtooth', 0.1, 0.1);  // E5
    playTone(783.99, 0.4, 'sawtooth', 0.12, 0.2);  // G5
    // Warm body
    playTone(523.25, 0.5, 'sine', 0.2, 0.15);
    playTone(783.99, 0.5, 'sine', 0.25, 0.25);
    playTone(130.81, 0.5, 'sine', 0.1, 0.15);      // C3 sub
}

/**
 * 🥈 Silver Rarity Reveal — clean chime
 */
export function playSilverReveal() {
    if (!soundEnabled) return;
    playTone(659.25, 0.15, 'sine', 0.18, 0);       // E5
    playTone(783.99, 0.15, 'sine', 0.2, 0.1);      // G5  
    playTone(987.77, 0.35, 'sine', 0.22, 0.2);     // B5
    playTone(164.81, 0.4, 'sine', 0.08, 0.15);     // E3 sub
}

/**
 * Play the appropriate rarity reveal sound based on tier
 */
export function playRarityReveal(tier) {
    if (!soundEnabled) return;
    switch (tier?.toLowerCase()) {
        case 'diamond': return playDiamondReveal();
        case 'platinum': return playPlatinumReveal();
        case 'gold': return playGoldReveal();
        case 'silver': return playSilverReveal();
        default: return playVerificationSuccess();
    }
}

/**
 * 📊 Progress tick — subtle counting sound for progress bars
 */
export function playProgressTick() {
    if (!soundEnabled) return;
    playTone(1000 + Math.random() * 200, 0.03, 'sine', 0.04, 0);
}

export default {
    playVerificationSuccess,
    playError,
    playUnlock,
    playClick,
    playRarityReveal,
    playDiamondReveal,
    playPlatinumReveal,
    playGoldReveal,
    playSilverReveal,
    playProgressTick,
    setSoundEnabled,
    setMasterVolume,
};

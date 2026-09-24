/**
 * Web3, Block by Block — Hardened Mobile & Accessible Audio/Web3 Engine
 */

// -------------------------------------------------------------
// 0. PERSISTENT AUDIO & HAPTIC SYSTEM
// -------------------------------------------------------------
const AudioManager = (function () {
  const STORAGE_KEY = 'web3_tour_sound_settings';

  // State defaults
  let state = {
    volume: 0.7,
    sfxEnabled: true,
    ambientEnabled: false,
    hapticEnabled: true
  };

  // Check stored user preferences
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      state = Object.assign(state, JSON.parse(saved));
    }
  } catch (_) {}

  // Check device reduced-motion & battery/muted preferences
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) {
    state.ambientEnabled = false; // Never auto-drone on reduced-motion
  }

  let audioCtx = null;
  let masterGain = null;
  let ambientNodes = null;

  function initContext() {
    if (!audioCtx && typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
        masterGain = audioCtx.createGain();
        masterGain.gain.setValueAtTime(state.volume, audioCtx.currentTime);
        masterGain.connect(audioCtx.destination);
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) {}
  }

  // Play crisp procedural mechanical click
  function playClick(freq = 1200, type = 'sine', duration = 0.028) {
    if (!state.sfxEnabled) return;
    const ctx = initContext();
    if (!ctx || !masterGain) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + duration);

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (_) {}
  }

  // Play affirmative success chime
  function playSuccess() {
    if (!state.sfxEnabled) return;
    const ctx = initContext();
    if (!ctx || !masterGain) return;

    try {
      const notes = [587.33, 880]; // D5 -> A5
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = ctx.currentTime + idx * 0.08;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.1, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.22);

        osc.connect(gain);
        gain.connect(masterGain);

        osc.start(startTime);
        osc.stop(startTime + 0.22);
      });
    } catch (_) {}
  }

  // Generative low-frequency spatial drone
  function startAmbientDrone() {
    if (!state.ambientEnabled) return;
    const ctx = initContext();
    if (!ctx || ambientNodes || !masterGain) return;

    try {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const droneGain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(65.41, ctx.currentTime); // C2
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(65.91, ctx.currentTime); // slight binaural detune

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(160, ctx.currentTime);

      droneGain.gain.setValueAtTime(0.001, ctx.currentTime);
      droneGain.gain.exponentialRampToValueAtTime(0.06, ctx.currentTime + 3);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(droneGain);
      droneGain.connect(masterGain);

      osc1.start();
      osc2.start();

      ambientNodes = { osc1, osc2, droneGain };
    } catch (_) {}
  }

  function stopAmbientDrone() {
    if (ambientNodes && audioCtx) {
      try {
        const { osc1, osc2, droneGain } = ambientNodes;
        droneGain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 1.2);
        setTimeout(() => {
          try {
            osc1.stop();
            osc2.stop();
          } catch (_) {}
          ambientNodes = null;
        }, 1300);
      } catch (_) {
        ambientNodes = null;
      }
    }
  }

  function setVolume(val) {
    state.volume = Math.max(0, Math.min(1, val));
    if (masterGain && audioCtx) {
      masterGain.gain.setValueAtTime(state.volume, audioCtx.currentTime);
    }
    saveState();
  }

  function toggleSFX(enabled) {
    state.sfxEnabled = enabled;
    saveState();
  }

  function toggleAmbient(enabled) {
    state.ambientEnabled = enabled;
    saveState();
    if (enabled) startAmbientDrone();
    else stopAmbientDrone();
  }

  function toggleHaptic(enabled) {
    state.hapticEnabled = enabled;
    saveState();
  }

  function triggerHaptic(duration = 20) {
    if (!state.hapticEnabled) return;
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate(duration); } catch (_) {}
    }
  }

  return {
    getState: () => ({ ...state }),
    playClick,
    playSuccess,
    setVolume,
    toggleSFX,
    toggleAmbient,
    toggleHaptic,
    triggerHaptic,
    initContext
  };
})();

// Helper: Toast notifications
function showToast(message, icon = '⚡') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span aria-hidden="true">${icon}</span><span>${message}</span>`;
  container.appendChild(toast);

  AudioManager.triggerHaptic(25);

  setTimeout(() => {
    toast.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    setTimeout(() => toast.remove(), 250);
  }, 2800);
}

// -------------------------------------------------------------
// 1. SOUND SETTINGS MODAL BINDINGS
// -------------------------------------------------------------
(function initSoundModal() {
  const openBtn = document.getElementById('sound-panel-btn');
  const modal = document.getElementById('sound-modal');
  const closeBtn = document.getElementById('sound-modal-close');
  const btnIcon = document.getElementById('sound-btn-icon');

  const volSlider = document.getElementById('volume-slider');
  const volDisplay = document.getElementById('volume-val-display');
  const sfxToggle = document.getElementById('toggle-sfx');
  const ambientToggle = document.getElementById('toggle-ambient');
  const hapticToggle = document.getElementById('toggle-haptic');

  if (!openBtn || !modal) return;

  // Initialize form controls from saved state
  const cur = AudioManager.getState();
  if (volSlider) {
    volSlider.value = Math.round(cur.volume * 100);
    volDisplay.textContent = `${volSlider.value}%`;
  }
  if (sfxToggle) sfxToggle.checked = cur.sfxEnabled;
  if (ambientToggle) ambientToggle.checked = cur.ambientEnabled;
  if (hapticToggle) hapticToggle.checked = cur.hapticEnabled;

  function updateIcon() {
    const s = AudioManager.getState();
    if (!s.sfxEnabled && !s.ambientEnabled) {
      btnIcon.textContent = '🔇';
      openBtn.classList.add('is-muted');
    } else {
      btnIcon.textContent = '🔊';
      openBtn.classList.remove('is-muted');
    }
  }
  updateIcon();

  function openModal() {
    modal.hidden = false;
    openBtn.setAttribute('aria-expanded', 'true');
    closeBtn.focus();
    AudioManager.initContext();
  }

  function closeModal() {
    modal.hidden = true;
    openBtn.setAttribute('aria-expanded', 'false');
    openBtn.focus();
    updateIcon();
  }

  openBtn.addEventListener('click', openModal);
  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hidden) closeModal();
  });

  // Controls
  volSlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10);
    volDisplay.textContent = `${val}%`;
    AudioManager.setVolume(val / 100);
  });

  sfxToggle.addEventListener('change', (e) => {
    AudioManager.toggleSFX(e.target.checked);
    if (e.target.checked) AudioManager.playClick(800);
    updateIcon();
  });

  ambientToggle.addEventListener('change', (e) => {
    AudioManager.toggleAmbient(e.target.checked);
    updateIcon();
  });

  hapticToggle.addEventListener('change', (e) => {
    AudioManager.toggleHaptic(e.target.checked);
    if (e.target.checked) AudioManager.triggerHaptic(30);
  });
})();

// Attach general sound clicks to buttons
document.addEventListener('click', (e) => {
  const clickable = e.target.closest('button, .hero__cta, .vote-btn, .sub-btn, .glow-action-btn, .wallet-provider-btn');
  if (clickable) {
    AudioManager.playClick();
  }
});

// -------------------------------------------------------------
// 2. ONE-TAP COPY UTILITY
// -------------------------------------------------------------
(function initCopyButtons() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-copy-inline');
    if (!btn || btn.id === 'btn-switch-network') return;

    const targetId = btn.getAttribute('data-copy-target');
    const targetEl = document.getElementById(targetId);
    if (!targetEl) return;

    const text = targetEl.textContent.trim();
    if (!text || text === '—') return;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        btn.textContent = 'Copied!';
        btn.classList.add('copied');
        AudioManager.playSuccess();
        showToast('Copied to clipboard', '📋');
        setTimeout(() => {
          btn.textContent = 'Copy';
          btn.classList.remove('copied');
        }, 1800);
      }).catch(() => {
        showToast('Unable to copy', '⚠️');
      });
    }
  });
})();

// -------------------------------------------------------------
// 3. HERO MEMPOOL TICKER (PAUSES ON SCROLL)
// -------------------------------------------------------------
(function heroBlock() {
  const hashEl = document.getElementById('hero-block-hash');
  const indexEl = document.getElementById('hero-block-index');
  const prevEl = document.getElementById('hero-block-prev');
  const gasEl = document.getElementById('hero-gas-fee');
  const cardEl = document.getElementById('hero-block-card');
  const heroEl = document.getElementById('hero');
  const miningStatusEl = document.getElementById('mining-status');

  if (!indexEl || !hashEl) return;

  function randomHash() {
    const chars = '0123456789abcdef';
    let out = '0x';
    for (let i = 0; i < 16; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
  }

  let blockNumber = 1;
  let tickerInterval = null;

  function tick() {
    indexEl.textContent = '#' + String(blockNumber).padStart(6, '0');
    prevEl.textContent = blockNumber === 1 ? 'genesis' : randomHash();
    hashEl.textContent = randomHash();
    if (gasEl) gasEl.textContent = `${Math.floor(Math.random() * 8) + 12} Gwei`;

    if (cardEl) {
      cardEl.classList.add('flash-mined');
      setTimeout(() => cardEl.classList.remove('flash-mined'), 400);
    }
    blockNumber++;
  }

  function startTicker() {
    if (tickerInterval) return;
    tick();
    tickerInterval = setInterval(tick, 3200);
    if (miningStatusEl) miningStatusEl.textContent = 'Mining Block…';
  }

  function stopTicker() {
    if (tickerInterval) {
      clearInterval(tickerInterval);
      tickerInterval = null;
      if (miningStatusEl) miningStatusEl.textContent = 'Paused (Battery Saver)';
    }
  }

  if ('IntersectionObserver' in window && heroEl) {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) startTicker();
        else stopTicker();
      },
      { threshold: 0.1 }
    );
    observer.observe(heroEl);
  } else {
    startTicker();
  }
})();

// -------------------------------------------------------------
// 4. BLOCK 01: DEBOUNCED SHA-256 HASHER
// -------------------------------------------------------------
(function interactiveHasher() {
  const input = document.getElementById('hasher-input');
  const result = document.getElementById('hasher-result');
  if (!input || !result) return;

  let debounceTimer = null;

  async function sha256(str) {
    if (!window.crypto || !window.crypto.subtle) {
      return '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8';
    }
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  async function update() {
    result.textContent = 'Hashing…';
    const hash = await sha256(input.value);
    result.textContent = hash;
    AudioManager.playClick(1400, 'triangle', 0.015);
  }

  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(update, 160);
  });

  update();
})();

// -------------------------------------------------------------
// 5. BLOCK 02: NODE OUTAGE RESILIENCE SIMULATOR
// -------------------------------------------------------------
(function nodeSimulator() {
  const btn = document.getElementById('btn-toggle-nodes');
  const badge = document.getElementById('network-health-badge');
  const grid = document.getElementById('nodes-grid');
  if (!btn || !grid) return;

  let isOutage = false;

  btn.addEventListener('click', () => {
    isOutage = !isOutage;
    const nodes = grid.querySelectorAll('.node-item');
    AudioManager.triggerHaptic(30);

    if (isOutage) {
      nodes[1].className = 'node-item node-offline';
      nodes[3].className = 'node-item node-offline';
      nodes[4].className = 'node-item node-offline';
      badge.textContent = '50% Nodes Active';
      badge.className = 'status-pill status-pill--warn';
      btn.textContent = 'Restore All Nodes';
      AudioManager.playClick(440, 'sawtooth', 0.05);
      showToast('3 nodes offline. Network consensus unaffected.', '🛡️');
    } else {
      nodes.forEach((n) => (n.className = 'node-item node-online'));
      badge.textContent = '100% Consensus';
      badge.className = 'status-pill status-pill--online';
      btn.textContent = 'Simulate 50% Node Outage';
      AudioManager.playSuccess();
      showToast('All validator nodes synced.', '✅');
    }
  });
})();

// -------------------------------------------------------------
// 6. BLOCK 03: TESTNET FAUCET SIMULATOR
// -------------------------------------------------------------
(function faucetSimulator() {
  const btn = document.getElementById('btn-faucet');
  const balanceEl = document.getElementById('faucet-balance');
  const receipt = document.getElementById('faucet-tx-receipt');
  const txMsg = document.getElementById('faucet-tx-msg');
  if (!btn || !balanceEl) return;

  let balance = 0.0;

  btn.addEventListener('click', () => {
    balance += 0.05;
    balanceEl.textContent = balance.toFixed(3);

    const randomTx = '0x' + Math.random().toString(16).substring(2, 8) + '…';
    txMsg.textContent = `Dripped 0.050 tETH (Tx: ${randomTx})`;
    receipt.classList.remove('hidden');

    AudioManager.playSuccess();
    AudioManager.triggerHaptic(40);
    showToast('+0.050 Testnet ETH added', '💧');
  });
})();

// -------------------------------------------------------------
// 7. BLOCK 04: SMART CONTRACT STATE MACHINE
// -------------------------------------------------------------
(function contractSimulator() {
  const btn = document.getElementById('btn-run-contract');
  const step1 = document.getElementById('step-deposit');
  const step2 = document.getElementById('step-verify');
  const step3 = document.getElementById('step-mint');
  if (!btn || !step1) return;

  let isExecuting = false;

  btn.addEventListener('click', () => {
    if (isExecuting) return;
    isExecuting = true;
    btn.disabled = true;
    btn.textContent = 'Contract Executing…';

    step1.classList.remove('active');
    step2.classList.remove('active');
    step3.classList.remove('active');

    // Step 1: Escrow
    step1.classList.add('active');
    AudioManager.playClick(600);
    AudioManager.triggerHaptic(20);
    showToast('Contract: Escrowing 1 ETH deposit...', '📥');

    setTimeout(() => {
      // Step 2: Verification
      step2.classList.add('active');
      AudioManager.playClick(900);
      AudioManager.triggerHaptic(20);
      showToast('Contract: Verifying rules on-chain...', '🔍');

      setTimeout(() => {
        // Step 3: Minting
        step3.classList.add('active');
        AudioManager.playSuccess();
        AudioManager.triggerHaptic(50);
        showToast('Contract: VIP Ticket NFT Minted!', '🎟️');
        btn.disabled = false;
        btn.textContent = 'Trigger Contract Logic';
        isExecuting = false;
      }, 850);
    }, 850);
  });
})();

// -------------------------------------------------------------
// 8. BLOCK 05: 3D NFT CARD (TOUCH, MOUSE & KEYBOARD ACCESSIBILITY)
// -------------------------------------------------------------
(function nftTiltEngine() {
  const card = document.getElementById('nft-card');
  if (!card) return;

  let ticking = false;
  let keyRotateX = 0;
  let keyRotateY = 0;

  function updateTransform(xPct, yPct) {
    const rotateX = yPct * -14;
    const rotateY = xPct * 14;
    card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
  }

  function handleMove(clientX, clientY) {
    if (ticking) return;
    ticking = true;

    requestAnimationFrame(() => {
      const rect = card.getBoundingClientRect();
      const x = clientX - rect.left - rect.width / 2;
      const y = clientY - rect.top - rect.height / 2;
      const xPct = Math.max(-1, Math.min(1, x / (rect.width / 2)));
      const yPct = Math.max(-1, Math.min(1, y / (rect.height / 2)));
      updateTransform(xPct, yPct);
      ticking = false;
    });
  }

  // Mouse tilt
  card.addEventListener('mousemove', (e) => handleMove(e.clientX, e.clientY));
  card.addEventListener('mouseleave', () => {
    card.style.transform = 'rotateX(0deg) rotateY(0deg) scale(1)';
  });

  // Touch tilt (prevents scroll lock gesture fighting)
  card.addEventListener('touchmove', (e) => {
    if (e.touches && e.touches[0]) {
      handleMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, { passive: true });

  card.addEventListener('touchend', () => {
    setTimeout(() => {
      card.style.transform = 'rotateX(0deg) rotateY(0deg) scale(1)';
    }, 400);
  });

  // Keyboard accessibility
  card.addEventListener('keydown', (e) => {
    const step = 0.35;
    if (e.key === 'ArrowUp') {
      keyRotateX = Math.max(-1, keyRotateX - step);
      updateTransform(keyRotateY, keyRotateX);
      e.preventDefault();
    } else if (e.key === 'ArrowDown') {
      keyRotateX = Math.min(1, keyRotateX + step);
      updateTransform(keyRotateY, keyRotateX);
      e.preventDefault();
    } else if (e.key === 'ArrowLeft') {
      keyRotateY = Math.max(-1, keyRotateY - step);
      updateTransform(keyRotateY, keyRotateX);
      e.preventDefault();
    } else if (e.key === 'ArrowRight') {
      keyRotateY = Math.min(1, keyRotateY + step);
      updateTransform(keyRotateY, keyRotateX);
      e.preventDefault();
    } else if (e.key === 'Enter') {
      keyRotateX = 0;
      keyRotateY = 0;
      card.style.transform = 'rotateX(0deg) rotateY(0deg) scale(1)';
      AudioManager.playClick(900);
    }
  });
})();

// -------------------------------------------------------------
// 9. BLOCK 06: DAO GOVERNANCE SIMULATOR
// -------------------------------------------------------------
(function daoSimulator() {
  const btnFor = document.getElementById('btn-vote-for');
  const btnAgainst = document.getElementById('btn-vote-against');
  const forPctEl = document.getElementById('vote-for-pct');
  const againstPctEl = document.getElementById('vote-against-pct');
  const forBar = document.getElementById('vote-for-bar');
  const againstBar = document.getElementById('vote-against-bar');
  if (!btnFor || !btnAgainst) return;

  let forVotes = 740;
  let againstVotes = 260;

  function updateTally() {
    const total = forVotes + againstVotes;
    const forPct = Math.round((forVotes / total) * 100);
    const againstPct = 100 - forPct;

    forPctEl.textContent = `${forPct}%`;
    againstPctEl.textContent = `${againstPct}%`;
    forBar.style.width = `${forPct}%`;
    againstBar.style.width = `${againstPct}%`;
  }

  btnFor.addEventListener('click', () => {
    forVotes += 100;
    updateTally();
    AudioManager.playClick(1100);
    AudioManager.triggerHaptic(30);
    showToast('Cast 100 $DAO votes FOR proposal', '🗳️');
  });

  btnAgainst.addEventListener('click', () => {
    againstVotes += 100;
    updateTally();
    AudioManager.playClick(400);
    AudioManager.triggerHaptic(30);
    showToast('Cast 100 $DAO votes AGAINST proposal', '🗳️');
  });
})();

// -------------------------------------------------------------
// 10. LAZY SCROLL REVEALS
// -------------------------------------------------------------
(function scrollObserver() {
  const reveals = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) {
    reveals.forEach((r) => r.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 }
  );

  reveals.forEach((r) => observer.observe(r));
})();

// -------------------------------------------------------------
// 11. HARDENED WALLET CONNECTION & NETWORK SWITCHING ENGINE
// -------------------------------------------------------------
(function hardenedWalletEngine() {
  const modal = document.getElementById('wallet-modal');
  const openButtons = [
    document.getElementById('wallet-btn'),
    document.getElementById('wallet-btn-2'),
    document.getElementById('hero-wallet-trigger')
  ];
  const closeBtn = document.getElementById('wallet-modal-close');
  const labels = [
    document.getElementById('wallet-label'),
    document.getElementById('wallet-label-2')
  ];
  const details = document.getElementById('wallet-details');
  const addressEl = document.getElementById('wallet-address');
  const networkEl = document.getElementById('wallet-network');
  const balanceEl = document.getElementById('wallet-balance');
  const statusEl = document.getElementById('wallet-status');

  const errorBox = document.getElementById('wallet-error-box');
  const errorTitle = document.getElementById('wallet-error-title');
  const errorDesc = document.getElementById('wallet-error-desc');

  const networkSection = document.getElementById('network-switch-section');
  const networkSelect = document.getElementById('network-select');
  const switchBtn = document.getElementById('btn-switch-network');
  const confirmSwitchBtn = document.getElementById('btn-confirm-switch');
  const disconnectBtn = document.getElementById('btn-disconnect-wallet');

  const NETWORKS = {
    '0x1': { name: 'Ethereum Mainnet', rpc: 'https://eth.llamarpc.com' },
    '0xaa36a7': { name: 'Sepolia Testnet', rpc: 'https://rpc.sepolia.org' },
    '0x89': { name: 'Polygon PoS', rpc: 'https://polygon-rpc.com' },
    '0x2105': { name: 'Base', rpc: 'https://mainnet.base.org' },
    '0xa4b1': { name: 'Arbitrum One', rpc: 'https://arb1.arbitrum.io/rpc' },
    '0xa': { name: 'Optimism', rpc: 'https://mainnet.optimism.io' }
  };

  function shortAddress(addr) {
    if (!addr) return '—';
    return addr.slice(0, 6) + '…' + addr.slice(-4);
  }

  function setLabels(text) {
    labels.forEach((l) => { if (l) l.textContent = text; });
  }

  function setButtonState(isConnected) {
    openButtons.forEach((b) => {
      if (b) b.classList.toggle('is-connected', isConnected);
    });
  }

  function showError(title, desc) {
    errorTitle.textContent = title;
    errorDesc.textContent = desc;
    errorBox.classList.remove('hidden');
    AudioManager.playClick(320, 'sawtooth');
  }

  function clearError() {
    errorBox.classList.add('hidden');
  }

  function openModal() {
    clearError();
    modal.hidden = false;
    openButtons[0].setAttribute('aria-expanded', 'true');
    closeBtn.focus();
  }

  function closeModal() {
    modal.hidden = true;
    openButtons[0].setAttribute('aria-expanded', 'false');
  }

  openButtons.forEach((btn) => {
    if (btn) btn.addEventListener('click', openModal);
  });
  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hidden) closeModal();
  });

  async function updateWalletUI(account) {
    try {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      const balanceHex = await window.ethereum.request({
        method: 'eth_getBalance',
        params: [account, 'latest']
      });

      const rawEth = parseInt(balanceHex, 16) / 1e18;
      const formattedBalance = isNaN(rawEth) ? '0.0000 ETH' : `${rawEth.toFixed(4)} ETH`;

      addressEl.textContent = account;
      networkEl.textContent = NETWORKS[chainId]?.name || `Chain ${chainId}`;
      if (balanceEl) balanceEl.textContent = formattedBalance;

      details.hidden = false;
      networkSection.classList.remove('hidden');
      statusEl.textContent = 'Provider linked. Read-only session active.';
      setLabels(shortAddress(account));
      setButtonState(true);
      closeModal();
      AudioManager.playSuccess();
      showToast(`Connected: ${shortAddress(account)}`, '🦊');
    } catch (_) {
      statusEl.textContent = 'Connected, but could not read chain state.';
    }
  }

  function disconnectWallet() {
    details.hidden = true;
    networkSection.classList.add('hidden');
    addressEl.textContent = '—';
    networkEl.textContent = '—';
    if (balanceEl) balanceEl.textContent = '—';
    statusEl.textContent = 'Wallet disconnected.';
    setLabels('Connect wallet');
    setButtonState(false);
    showToast('Session disconnected', '🔌');
  }

  if (disconnectBtn) {
    disconnectBtn.addEventListener('click', disconnectWallet);
  }

  // Network Switch Request Handler
  async function switchNetwork(targetChainId) {
    if (typeof window.ethereum === 'undefined') return;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: targetChainId }]
      });
      showToast(`Switched to ${NETWORKS[targetChainId]?.name || targetChainId}`, '🌐');
    } catch (err) {
      // Chain not added to user wallet error (4902)
      if (err.code === 4902 && NETWORKS[targetChainId]) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: targetChainId,
              chainName: NETWORKS[targetChainId].name,
              rpcUrls: [NETWORKS[targetChainId].rpc]
            }]
          });
          showToast(`Added and switched to ${NETWORKS[targetChainId].name}`, '🌐');
        } catch (addErr) {
          showError('Network Add Failed', addErr.message || 'Could not add network.');
        }
      } else if (err.code === 4001) {
        showError('Request Rejected', 'Network switch prompt was rejected.');
      } else {
        showError('Switch Error', err.message || 'Could not change network.');
      }
    }
  }

  if (switchBtn) {
    switchBtn.addEventListener('click', () => {
      openModal();
      networkSection.classList.remove('hidden');
    });
  }

  if (confirmSwitchBtn) {
    confirmSwitchBtn.addEventListener('click', () => {
      const selected = networkSelect.value;
      switchNetwork(selected);
    });
  }

  // Handle Provider Connect clicks in modal
  document.querySelectorAll('.wallet-provider-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      clearError();

      if (typeof window.ethereum === 'undefined') {
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        if (isMobile) {
          showError(
            'Mobile dApp Browser Required',
            'To connect on mobile, open this page inside the built-in browser of MetaMask, Coinbase Wallet, or Phantom.'
          );
        } else {
          showError(
            'No Web3 Extension Found',
            'Please install the MetaMask or Coinbase Wallet browser extension to connect.'
          );
        }
        return;
      }

      try {
        setLabels('Connecting…');
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts && accounts.length > 0) {
          await updateWalletUI(accounts[0]);
        } else {
          disconnectWallet();
        }
      } catch (err) {
        setLabels('Connect wallet');
        if (err.code === 4001) {
          showError('Request Cancelled', 'You declined the connection request in your wallet extension.');
        } else if (err.code === -32002) {
          showError('Request Pending', 'A connection request is already waiting in your wallet extension. Please open it.');
        } else {
          showError('Connection Failed', err.message || 'An unknown error occurred while connecting.');
        }
      }
    });
  });

  // Event Listeners for Account / Chain changes
  if (typeof window.ethereum !== 'undefined') {
    window.ethereum.request({ method: 'eth_accounts' })
      .then((accounts) => {
        if (accounts && accounts.length > 0) updateWalletUI(accounts[0]);
      })
      .catch(() => {});

    window.ethereum.on('accountsChanged', (accounts) => {
      if (accounts && accounts.length > 0) updateWalletUI(accounts[0]);
      else disconnectWallet();
    });

    window.ethereum.on('chainChanged', () => window.location.reload());
  }
})();

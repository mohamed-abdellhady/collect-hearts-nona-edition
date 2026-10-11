"use strict";

// ========================================
// FOR nona - COLLECT THE HEARTS 💗
// Game + Volume Settings + Generated Sounds + Levels + Timer
// ========================================

const $ = (id) => document.getElementById(id);

const startScreen = $("startScreen");
const gameScreen = $("gameScreen");
const endScreen = $("endScreen");
const pauseOverlay = $("pauseOverlay");
const settingsOverlay = $("settingsOverlay");

const playButton = $("playButton");
const replayButton = $("replayButton");
const homeButton = $("homeButton");
const pauseButton = $("pauseButton");
const resumeButton = $("resumeButton");

const settingsButton = $("settingsButton");
const pauseSettingsButton = $("pauseSettingsButton");
const closeSettingsButton = $("closeSettingsButton");

const canvas = $("gameCanvas");
const ctx = canvas ? canvas.getContext("2d") : null;

const scoreText = $("score");
const bestScoreText = $("bestScore");
const gameBestText = $("gameBest");
const livesText = $("lives");
const levelText = $("level");
const timerText = $("timer");

const endEmoji = $("endEmoji");
const endTitle = $("endTitle");
const endMessage = $("endMessage");
const finalScoreText = $("finalScore");

const W = canvas ? canvas.width : 360;
const H = canvas ? canvas.height : 500;
const MAX_LIVES = 3;

// ========================================
// VOLUME SETTINGS
// ========================================

const volumeDefaults = {
    music: 60,
    heart: 80,
    bomb: 70,
    win: 90,
    gameOver: 70
};

let volumes = loadVolumes();
let audioContext = null;
let musicTimer = null;
let musicStep = 0;
let settingsOpenedFromPause = false;

const volumeControls = [
    { key: "music", input: "musicVolume", label: "musicVolumeValue" },
    { key: "heart", input: "heartVolume", label: "heartVolumeValue" },
    { key: "bomb", input: "bombVolume", label: "bombVolumeValue" },
    { key: "win", input: "winVolume", label: "winVolumeValue" },
    { key: "gameOver", input: "gameOverVolume", label: "gameOverVolumeValue" }
];

function loadVolumes() {
    try {
        const saved = JSON.parse(localStorage.getItem("nonaVolumes"));
        return {
            ...volumeDefaults,
            ...(saved && typeof saved === "object" ? saved : {})
        };
    } catch {
        return { ...volumeDefaults };
    }
}

function saveVolumes() {
    try {
        localStorage.setItem("nonaVolumes", JSON.stringify(volumes));
    } catch {}
}

function updateVolumeLabels() {
    for (const control of volumeControls) {
        const input = $(control.input);
        const label = $(control.label);
        if (!input || !label) continue;
        input.value = volumes[control.key];
        label.textContent = `${volumes[control.key]}%`;
    }
}

function getAudioContext() {
    if (!audioContext) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return null;
        audioContext = new AudioContextClass();
    }
    if (audioContext.state === "suspended") {
        audioContext.resume().catch(() => {});
    }
    return audioContext;
}

function playTone(frequency, duration, type, volume, delay = 0) {
    if (volume <= 0) return;
    const audio = getAudioContext();
    if (!audio) return;

    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    const startAt = audio.currentTime + delay;

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startAt);

    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), startAt + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

    oscillator.connect(gain);
    gain.connect(audio.destination);

    oscillator.start(startAt);
    oscillator.stop(startAt + duration + 0.03);

    oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
    };
}

function playHeartSound() {
    const volume = volumes.heart / 100 * 0.12;
    if (volume <= 0) return;
    playTone(660, 0.10, "sine", volume);
    playTone(880, 0.14, "sine", volume, 0.07);
}

function playBombSound() {
    const volume = volumes.bomb / 100 * 0.18;
    if (volume <= 0) return;
    playTone(150, 0.24, "triangle", volume);
    playTone(85, 0.30, "sawtooth", volume * 0.65, 0.08);
}

function playGameOverSound() {
    const volume = volumes.gameOver / 100 * 0.13;
    if (volume <= 0) return;
    playTone(440, 0.20, "sine", volume);
    playTone(349, 0.24, "sine", volume, 0.20);
    playTone(262, 0.36, "sine", volume, 0.42);
}

function playVictorySound() {
    const volume = volumes.win / 100 * 0.13;
    if (volume <= 0) return;
    playTone(523, 0.15, "sine", volume);
    playTone(659, 0.15, "sine", volume, 0.13);
    playTone(784, 0.15, "sine", volume, 0.26);
    playTone(1047, 0.40, "sine", volume, 0.39);
}

function playLevelUpSound() {
    const volume = volumes.win / 100 * 0.11;
    if (volume <= 0) return;
    playTone(523, 0.12, "sine", volume);
    playTone(659, 0.12, "sine", volume, 0.10);
    playTone(784, 0.18, "sine", volume, 0.20);
    playTone(1047, 0.25, "sine", volume, 0.32);
}

// ========================================
// BACKGROUND MUSIC
// ========================================

const melody = [
    523, 659, 784, 659,
    587, 698, 880, 698,
    523, 659, 784, 1047,
    880, 784, 659, 587
];

function playMusicNote(frequency) {
    const volume = volumes.music / 100 * 0.045;
    if (volume <= 0) return;
    playTone(frequency, 0.22, "sine", volume);
}

function startMusic() {
    if (musicTimer !== null || volumes.music <= 0) return;
    getAudioContext();
    musicStep = 0;

    musicTimer = setInterval(() => {
        if (!running || !gameScreen || gameScreen.hidden) return;
        if (volumes.music <= 0) {
            stopMusic();
            return;
        }
        playMusicNote(melody[musicStep % melody.length]);
        musicStep++;
    }, 260);
}

function stopMusic() {
    if (musicTimer !== null) {
        clearInterval(musicTimer);
        musicTimer = null;
    }
}

function updateMusic() {
    if (volumes.music <= 0) {
        stopMusic();
    } else if (running) {
        startMusic();
    }
}

// ========================================
// SETTINGS OPEN / CLOSE
// ========================================

function openSettings(fromPause = false) {
    if (!running) return;
    settingsOpenedFromPause = fromPause;
    if (!paused) pauseGame();
    if (pauseOverlay) pauseOverlay.hidden = true;
    if (settingsOverlay) settingsOverlay.hidden = false;
    updateVolumeLabels();
}

function closeSettings() {
    if (settingsOverlay) settingsOverlay.hidden = true;
    if (settingsOpenedFromPause) {
        if (pauseOverlay) pauseOverlay.hidden = false;
        if (pauseButton) pauseButton.textContent = "RESUME ▶";
    } else {
        resumeGame();
    }
}

for (const control of volumeControls) {
    const input = $(control.input);
    if (!input) continue;
    input.addEventListener("input", () => {
        volumes[control.key] = Number(input.value);
        const label = $(control.label);
        if (label) label.textContent = `${input.value}%`;
        saveVolumes();
        if (control.key === "music") updateMusic();
    });
}

if (settingsButton) settingsButton.addEventListener("click", () => openSettings(false));
if (pauseSettingsButton) pauseSettingsButton.addEventListener("click", () => openSettings(true));
if (closeSettingsButton) closeSettingsButton.addEventListener("click", closeSettings);

updateVolumeLabels();

// ========================================
// GAME STATE
// ========================================

let score = 0;
let lives = MAX_LIVES;
let bestScore = loadBestScore();
let currentLevel = 1;

let items = [];
let particles = [];

let basketX = W / 2;
let frame = 0;
let spawnTimer = 0;
let lastTime = 0;
let animationId = 0;

let running = false;
let paused = false;
let moveTarget = null;

const basket = {
    y: H - 48,
    width: 65
};

// Timer variables
let startTime = 0;
let elapsedTime = 0;
let timerInterval = null;

// ========================================
// BEST SCORE
// ========================================

function loadBestScore() {
    try {
        return Number(localStorage.getItem("nonaBestScore")) || 0;
    } catch {
        return 0;
    }
}

function saveBestScore() {
    try {
        localStorage.setItem("nonaBestScore", String(bestScore));
    } catch {}
}

function updateBestScore() {
    if (score > bestScore) {
        bestScore = score;
        saveBestScore();
    }
    if (bestScoreText) bestScoreText.textContent = bestScore;
    if (gameBestText) gameBestText.textContent = bestScore;
}

// ========================================
// TIMER FUNCTIONS
// ========================================

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const mm = String(mins).padStart(2, "0");
    const ss = String(secs).padStart(2, "0");
    return mm + ":" + ss;
}

function updateTimer() {
    if (!running || paused) return;
    elapsedTime = Math.floor((Date.now() - startTime) / 1000);
    if (timerText) timerText.textContent = formatTime(elapsedTime);
}

function startTimer() {
    startTime = Date.now() - (elapsedTime * 1000);
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(updateTimer, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

// ========================================
// DRAW FUNCTIONS
// ========================================

function drawBackground() {
    if (!ctx) return;
    const gradient = ctx.createLinearGradient(0, 0, 0, H);
    gradient.addColorStop(0, "#fff2f8");
    gradient.addColorStop(1, "#ffd5e8");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);

    for (let i = 0; i < 22; i++) {
        const x = (i * 79 + 21) % W;
        const y = (i * 113 + frame * 0.35) % H;
        ctx.globalAlpha = 0.35 + (i % 3) * 0.15;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(x, y, 2 + (i % 3), 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
}

function drawBasket() {
    if (!ctx) return;
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "45px Arial";
    ctx.fillText("🧺", basketX, basket.y);
    ctx.restore();
}

function drawItems() {
    if (!ctx) return;
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const item of items) {
        ctx.font = `${item.size}px Arial`;
        ctx.fillText(item.type, item.x, item.y);
    }
    ctx.restore();
}

function burst(x, y) {
    for (let i = 0; i < 7; i++) {
        particles.push({
            x, y,
            vx: Math.random() * 4 - 2,
            vy: -(Math.random() * 2 + 1),
            life: 30
        });
    }
}

function updateParticles() {
    for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
    }
    particles = particles.filter((p) => p.life > 0);
}

function drawParticles() {
    if (!ctx) return;
    ctx.save();
    ctx.textAlign = "center";
    ctx.font = "16px Arial";
    for (const p of particles) {
        ctx.globalAlpha = Math.max(0, p.life / 30);
        ctx.fillText("💗", p.x, p.y);
    }
    ctx.restore();
}

// ========================================
// SPAWN + UPDATE
// ========================================

function spawnItem() {
    const level = Math.floor(score / 100) + 1;
    const bombChance = Math.min(0.42, 0.14 + (level - 1) * 0.045);
    const isBomb = Math.random() < bombChance;
    const hearts = ["💗", "💖", "💕", "❤️"];

    const baseSpeed = 1.6 + (level - 1) * 0.55;
    const speed = Math.min(8.5, baseSpeed + score * 0.005 + Math.random() * 0.7);

    items.push({
        x: 23 + Math.random() * (W - 46),
        y: -30,
        size: isBomb ? 28 : 30,
        type: isBomb ? "💣" : hearts[Math.floor(Math.random() * hearts.length)],
        speed: speed,
        bomb: isBomb,
        done: false
    });
}

function updateStats() {
    if (scoreText) scoreText.textContent = score;
    currentLevel = Math.floor(score / 100) + 1;
    if (levelText) levelText.textContent = currentLevel;

    if (livesText) {
        livesText.textContent = "❤️".repeat(lives) + "🩶".repeat(MAX_LIVES - lives);
    }
    updateBestScore();
}

function updateGame(delta) {
    frame++;

    if (moveTarget !== null) {
        basketX += (moveTarget - basketX) * 0.32;
    }
    basketX = Math.max(34, Math.min(W - 34, basketX));

    spawnTimer += delta;
    const level = Math.floor(score / 100) + 1;
    const spawnInterval = Math.max(260, 860 - level * 70 - score * 0.9);

    if (spawnTimer >= spawnInterval) {
        spawnItem();
        spawnTimer = 0;
    }

    const step = delta / 16.67;

    for (const item of items) {
        item.y += item.speed * step;

        const caught =
            Math.abs(item.x - basketX) < basket.width * 0.48 &&
            item.y > basket.y - 24 &&
            item.y < basket.y + 13;

        if (!caught || item.done) continue;

        item.done = true;
        burst(item.x, item.y);

        if (item.bomb) {
            playBombSound();
            lives--;
            updateStats();
            if (lives <= 0) {
                finishGame();
                return;
            }
        } else {
            playHeartSound();
            score++;

            const newLevel = Math.floor(score / 100) + 1;
            if (newLevel > currentLevel) {
                currentLevel = newLevel;
                playLevelUpSound();
                basket.width = Math.max(48, 65 - (currentLevel - 1) * 2.2);
            }
            updateStats();
        }
    }

    items = items.filter((item) => !item.done && item.y < H + 40);
    updateParticles();
}

function drawGame() {
    drawBackground();
    drawItems();
    drawBasket();
    drawParticles();
}

function gameLoop(timestamp) {
    if (!running || paused) return;

    const delta = lastTime ? Math.min(timestamp - lastTime, 40) : 16.67;
    lastTime = timestamp;

    updateGame(delta);

    if (running && !paused) {
        drawGame();
        animationId = requestAnimationFrame(gameLoop);
    }
}

// ========================================
// START / FINISH / PAUSE
// ========================================

function startGame() {
    cancelAnimationFrame(animationId);
    stopTimer();

    score = 0;
    lives = MAX_LIVES;
    currentLevel = 1;
    basket.width = 65;
    elapsedTime = 0;

    items = [];
    particles = [];
    basketX = W / 2;
    frame = 0;
    spawnTimer = 0;
    lastTime = 0;
    moveTarget = null;

    running = true;
    paused = false;

    updateStats();
    if (timerText) timerText.textContent = "00:00";

    if (startScreen) startScreen.hidden = true;
    if (gameScreen) gameScreen.hidden = false;
    if (endScreen) endScreen.hidden = true;
    if (pauseOverlay) pauseOverlay.hidden = true;
    if (settingsOverlay) settingsOverlay.hidden = true;

    if (pauseButton) pauseButton.textContent = "PAUSE Ⅱ";

    drawGame();

    if (volumes.music > 0) startMusic();
    startTimer();

    animationId = requestAnimationFrame(gameLoop);
}

function finishGame() {
    running = false;
    paused = false;

    cancelAnimationFrame(animationId);
    stopMusic();
    stopTimer();

    updateBestScore();

    if (gameScreen) gameScreen.hidden = true;
    if (endScreen) endScreen.hidden = false;

    if (finalScoreText) finalScoreText.textContent = score;

    if (score >= 500) {
        if (endEmoji) endEmoji.textContent = "👑💖";
        if (endTitle) endTitle.textContent = "AMAZINGGGGG!";
        if (endMessage) endMessage.textContent = "amazinggggg nona 🥰";
        playVictorySound();
    } else if (score >= 200) {
        if (endEmoji) endEmoji.textContent = "😍❤️";
        if (endTitle) endTitle.textContent = "the best nona";
        if (endMessage) endMessage.textContent = "very good hanoon😍😍♥️";
        playGameOverSound();
    } else if (score >= 100) {
        if (endEmoji) endEmoji.textContent = "😍";
        if (endTitle) endTitle.textContent = "GOOD GIRL";
        if (endMessage) endMessage.textContent = "good girl nona😍";
        playGameOverSound();
    } else {
        if (endEmoji) endEmoji.textContent = "🥰💗";
        if (endTitle) endTitle.textContent = "TRY AGAIN";
        if (endMessage) endMessage.textContent = "try again nona don't be sad 🥰";
        playGameOverSound();
    }
}

function pauseGame() {
    if (!running || paused) return;
    paused = true;
    cancelAnimationFrame(animationId);
    stopTimer();
    if (pauseOverlay) pauseOverlay.hidden = false;
    if (pauseButton) pauseButton.textContent = "RESUME ▶";
}

function resumeGame() {
    if (!running || !paused) return;
    paused = false;
    lastTime = 0;
    if (pauseOverlay) pauseOverlay.hidden = true;
    if (settingsOverlay) settingsOverlay.hidden = true;
    if (pauseButton) pauseButton.textContent = "PAUSE Ⅱ";
    startTimer();
    animationId = requestAnimationFrame(gameLoop);
}

function togglePause() {
    if (paused) resumeGame();
    else pauseGame();
}

function goHome() {
    running = false;
    paused = false;
    cancelAnimationFrame(animationId);
    stopMusic();
    stopTimer();

    items = [];
    particles = [];
    moveTarget = null;

    if (settingsOverlay) settingsOverlay.hidden = true;
    if (pauseOverlay) pauseOverlay.hidden = true;

    updateBestScore();

    if (endScreen) endScreen.hidden = true;
    if (gameScreen) gameScreen.hidden = true;
    if (startScreen) startScreen.hidden = false;
}

// ========================================
// CONTROLS
// ========================================

function setPointerPosition(event) {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0) return;
    const scaleX = W / rect.width;
    moveTarget = (event.clientX - rect.left) * scaleX;
    moveTarget = Math.max(34, Math.min(W - 34, moveTarget));
}

if (canvas) {
    canvas.addEventListener("pointerdown", (event) => {
        if (!running || paused) return;
        setPointerPosition(event);
        if (canvas.setPointerCapture) canvas.setPointerCapture(event.pointerId);
    });

    canvas.addEventListener("pointermove", (event) => {
        if (!running || paused) return;
        if (event.buttons > 0 || event.pointerType === "touch") {
            setPointerPosition(event);
        }
    });
}

if (playButton) playButton.addEventListener("click", startGame);
if (replayButton) replayButton.addEventListener("click", startGame);
if (homeButton) homeButton.addEventListener("click", goHome);
if (pauseButton) pauseButton.addEventListener("click", togglePause);
if (resumeButton) resumeButton.addEventListener("click", resumeGame);

// ========================================
// INITIAL
// ========================================

if (bestScoreText) bestScoreText.textContent = bestScore;
if (gameBestText) gameBestText.textContent = bestScore;
if (levelText) levelText.textContent = currentLevel;
if (timerText) timerText.textContent = "00:00";

drawGame();
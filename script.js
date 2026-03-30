document.addEventListener('DOMContentLoaded', () => {
    // --- Constants & State ---
    const ROWS = 6;
    const COLS = 4;
    let currentRow = 0;
    let currentCol = 0;
    let grid = Array(ROWS).fill().map(() => Array(COLS).fill(""));

    // Select secret word
    const secretWord = WORDS[Math.floor(Math.random() * WORDS.length)];
    console.log("Secret (shh!):", secretWord);

    let isGameOver = false;
    let isSoundOn = true;
    let isMusicOn = false;

    // --- Audio Context & Oscillators (Synth) ---
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioCtx = new AudioContext();
    document.getElementById('music-toggle').textContent = "Music 🔇";

    function playTone(freq, type = 'sine', duration = 0.1, vol = 0.1) {
        if (!isSoundOn) return;

        // Browser Autoplay Policy fix: attempt to resume
        if (audioCtx.state === 'suspended') {
            audioCtx.resume().catch(() => { });
        }

        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

        gainNode.gain.setValueAtTime(vol, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);

        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    }

    function playPopSound() {
        playTone(400 + Math.random() * 200, 'sine', 0.1, 0.1);
    }

    function playErrorSound() {
        playTone(150, 'sawtooth', 0.2, 0.1);
        setTimeout(() => playTone(120, 'sawtooth', 0.2, 0.1), 100);
    }
    function playWinSound() {
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
            setTimeout(() => playTone(freq, 'triangle', 0.3, 0.1), i * 100);
        });
    }

    function playLoseSound() {
        [261.63, 293.66, 329.63, 349.23].forEach((freq, i) => {
            setTimeout(() => playTone(freq, 'triangle', 0.3, 0.1), i * 100);
        });
    }

    // --- Music System ---
    let musicTimeout;
    let currentNoteIndex = 0;

    // Simple Note Map
    const NOTES = {
        'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
        'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46, 'G5': 783.99, 'A5': 880.00,
        'REST': 0
    };

    // Melody: Array of { note, duration (in ms) }
    // Brandenburg-Style Melody (Durations Halved)
    const MELODY = [
        { n: "G4", d: 150 }, { n: "B4", d: 150 }, { n: "D5", d: 100 }, { n: "G5", d: 150 },
        { n: "F#5", d: 100 }, { n: "E5", d: 100 }, { n: "D5", d: 100 }, { n: "C5", d: 150 },

        { n: "B4", d: 150 }, { n: "A4", d: 150 }, { n: "B4", d: 100 }, { n: "G4", d: 150 },
        { n: "REST", d: 150 },

        { n: "D5", d: 150 }, { n: "F#5", d: 150 }, { n: "A5", d: 100 }, { n: "D6", d: 150 },
        { n: "C6", d: 100 }, { n: "B5", d: 100 }, { n: "A5", d: 100 }, { n: "G5", d: 150 },

        { n: "F#5", d: 150 }, { n: "E5", d: 150 }, { n: "F#5", d: 100 }, { n: "D5", d: 150 },
        { n: "REST", d: 150 },

        { n: "G4", d: 150 }, { n: "A4", d: 150 }, { n: "B4", d: 100 }, { n: "C5", d: 150 },
        { n: "B4", d: 100 }, { n: "A4", d: 100 }, { n: "G4", d: 150 },

        { n: "D5", d: 150 }, { n: "C5", d: 150 }, { n: "B4", d: 100 }, { n: "A4", d: 150 },
        { n: "G4", d: 150 }, { n: "REST", d: 150 }
    ];



    function toggleMusic() {
        isMusicOn = !isMusicOn;
        if (isMusicOn) {
            currentNoteIndex = 0;
            startMusic();
            document.getElementById('music-toggle').textContent = "Music 🎵";
            document.getElementById('music-toggle').style.opacity = "1";
        } else {
            stopMusic();
            document.getElementById('music-toggle').textContent = "Music 🔇";
            document.getElementById('music-toggle').style.opacity = "0.5";
        }
    }

    function startMusic() {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        playNextNote();
    }

    function playNextNote() {
        if (!isMusicOn) return;

        const { n, d } = MELODY[currentNoteIndex % MELODY.length];
        const freq = NOTES[n] || NOTES['REST'];

        if (freq > 0) {
            playTone(freq, 'square', d / 1000 * 0.8, 0.03); // Slightly shorter for staccato feel
        }

        currentNoteIndex++;
        musicTimeout = setTimeout(playNextNote, d);
    }

    function stopMusic() {
        clearTimeout(musicTimeout);
    }

    // --- UI Setup ---
    const gridContainer = document.getElementById('grid-container');
    const keyboardContainer = document.getElementById('keyboard-container');
    const messageEl = document.getElementById('game-message');

    // Create Grid
    for (let r = 0; r < ROWS; r++) {
        const rowDiv = document.createElement('div');
        rowDiv.classList.add('grid-row');
        rowDiv.id = `row-${r}`;
        for (let c = 0; c < COLS; c++) {
            const tile = document.createElement('div');
            tile.classList.add('tile');
            tile.id = `tile-${r}-${c}`;
            rowDiv.appendChild(tile);
        }
        gridContainer.appendChild(rowDiv);
    }

    // Start Grawlix Animation
    startGrawlixAnimation();

    function startGrawlixAnimation() {
        const row = 0;
        const duration = 2000; // 2 seconds
        const intervalTime = 100;
        const chars = ['@', '#', '$', '%', '&', '!', '?', '*', '§', '£', '¥'];

        const rowDiv = document.getElementById(`row-${row}`);
        rowDiv.classList.add('shake'); // Use existing shake for some movement

        let interval = setInterval(() => {
            // Play glitchy sound
            if (Math.random() > 0.3) {
                playTone(100 + Math.random() * 600, 'sawtooth', 0.05, 0.2);
            }

            for (let c = 0; c < COLS; c++) {
                const char = chars[Math.floor(Math.random() * chars.length)];
                const tile = document.getElementById(`tile-${row}-${c}`);
                tile.textContent = char;
                tile.style.backgroundColor = `hsl(${Math.random() * 360}, 70%, 50%)`;
                tile.style.borderColor = "white";
                tile.style.transform = `scale(${0.8 + Math.random() * 0.4}) rotate(${Math.random() * 20 - 10}deg)`;
            }
        }, intervalTime);

        setTimeout(() => {
            clearInterval(interval);
            rowDiv.classList.remove('shake');
            // Clean up
            for (let c = 0; c < COLS; c++) {
                const tile = document.getElementById(`tile-${row}-${c}`);
                tile.textContent = "";
                tile.style.backgroundColor = "";
                tile.style.borderColor = "";
                tile.style.transform = "";
            }
        }, duration);
    }

    // Create Keyboard
    const keys = [
        "QWERTYUIOP",
        "ASDFGHJKL",
        "ZXCVBNM"
    ];

    keys.forEach((rowStr, i) => {
        const rowDiv = document.createElement('div');
        rowDiv.classList.add('keyboard-row');

        if (i === 2) {
            // Enter key
            const enterKey = createKey("ENTER", 'big');
            enterKey.onclick = submitGuess;
            rowDiv.appendChild(enterKey);
        }

        for (let char of rowStr) {
            const key = createKey(char);
            key.onclick = () => handleInput(char);
            rowDiv.appendChild(key);
        }

        if (i === 2) {
            // Backspace
            const bsKey = createKey("⌫", 'big');
            bsKey.onclick = removeLetter;
            rowDiv.appendChild(bsKey);
        }

        keyboardContainer.appendChild(rowDiv);
    });

    function createKey(char, extraClass = '') {
        const btn = document.createElement('button');
        btn.textContent = char;
        btn.classList.add('key');
        if (extraClass) btn.classList.add(extraClass);
        btn.id = `key-${char}`;
        return btn;
    }

    // --- Input Handling ---
    document.addEventListener('keydown', (e) => {
        if (isGameOver) {
            if (e.key === 'Enter') restartGame();
            return;
        }

        const key = e.key.toUpperCase();
        if (key === "ENTER") submitGuess();
        else if (key === "BACKSPACE") removeLetter();
        else if (/^[A-Z]$/.test(key)) handleInput(key);
    });

    // Toggle Buttons
    document.getElementById('sound-toggle').onclick = () => {
        isSoundOn = !isSoundOn;
        if (isSoundOn) {
            document.getElementById('sound-toggle').textContent = "Sound 🔊";
            document.getElementById('sound-toggle').style.opacity = "1";
        } else {
            document.getElementById('sound-toggle').textContent = "Sound 🔇";
            document.getElementById('sound-toggle').style.opacity = "0.5";
        }


    };
    document.getElementById('music-toggle').onclick = toggleMusic;
    document.getElementById('start-btn').onclick = restartGame;
    // Help Modal Logic
    const helpModal = document.getElementById('help-modal');
    const closeHelp = document.getElementById('close-help');
    const closeModalBtn = document.getElementById('close-modal-btn');

    document.getElementById('help-btn').onclick = () => {
        helpModal.classList.remove('hidden');
    };

    closeHelp.onclick = () => {
        helpModal.classList.add('hidden');
    };

    if (closeModalBtn) {
        closeModalBtn.onclick = () => {
            helpModal.classList.add('hidden');
        };
    }

    window.onclick = (event) => {
        if (event.target === helpModal) {
            helpModal.classList.add('hidden');
        }
    };


    // --- Game Logic ---
    function handleInput(key) {
        if (currentCol < COLS) {
            grid[currentRow][currentCol] = key;
            const tile = document.getElementById(`tile-${currentRow}-${currentCol}`);
            tile.textContent = key;
            tile.classList.add('pop');
            tile.style.borderColor = "#888"; // slight darken on fill
            tile.addEventListener('animationend', () => tile.classList.remove('pop'));

            playPopSound();
            currentCol++;
        }
    }

    function removeLetter() {
        if (currentCol > 0) {
            currentCol--;
            grid[currentRow][currentCol] = "";
            const tile = document.getElementById(`tile-${currentRow}-${currentCol}`);
            tile.textContent = "";
            tile.style.borderColor = "rgba(255, 255, 255, 0.4)";
            playPopSound();
        }
    }

    async function submitGuess() {
        if (currentCol !== COLS) {
            showMessage("Not enough letters");
            shakeRow();
            return;
        }

        const guess = grid[currentRow].join("");
        if (!WORDS.includes(guess)) {
            showMessage("Not in word list");
            shakeRow();
            return;
        }

        // Check Word
        const result = checkGuess(guess, secretWord);
        await animateReveal(result, guess);

        if (guess === secretWord) {
            showMessage("You win! 🎉", true);
            playWinSound();
            triggerWinConfetti();
            isGameOver = true;
        } else if (currentRow === ROWS - 1) {
            showMessage(`You lose! Word was ${secretWord}`, true);
            playLoseSound();
            isGameOver = true;
        } else {
            currentRow++;
            currentCol = 0;
        }
    }

    function restartGame() {
        // Reset State
        currentRow = 0;
        currentCol = 0;
        grid = Array(ROWS).fill().map(() => Array(COLS).fill(""));
        isGameOver = false;

        // Pick new word
        // Note: secretWord is const in original scope, we need to change it to let
        // But since it's top-level const in the file, we can't reassign if we don't change variable declaration
        // I will need to handle variable declaration change in a separate edit or assume I can change it here? 
        // Wait, 'const secretWord' is at line 9. I can't reach it from here with replace_file_content unless I replace the whole file or matching block.
        // I'll make a separate edit to change 'const secretWord' to 'let secretWord' or wrapping it in a function.
        // For now, let's just make restartGame RELOAD because I cannot easily change the 'const' variable at the top of the file without a large replace.
        // User asked: "require a key press to hide it and restart the game".
        // Reloading is a valid restart.

        location.reload();
    }

    function triggerWinConfetti() {
        const count = 200;
        const defaults = {
            origin: { y: 0.7 }
        };

        function fire(particleRatio, opts) {
            confetti(Object.assign({}, defaults, opts, {
                particleCount: Math.floor(count * particleRatio)
            }));
        }

        fire(0.25, { spread: 26, startVelocity: 55 });
        fire(0.2, { spread: 60 });
        fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
        fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
        fire(0.1, { spread: 120, startVelocity: 45 });
    }

    function shakeRow() {
        const row = document.getElementById(`row-${currentRow}`);
        row.classList.add('shake');
        playErrorSound();
        row.addEventListener('animationend', () => row.classList.remove('shake'));
    }

    function showMessage(msg) {
        messageEl.textContent = msg;
        messageEl.classList.remove('hidden');
        setTimeout(() => messageEl.classList.add('hidden'), 3000);
    }

    function checkGuess(guess, secret) {
        let guessArr = guess.split('');
        let secretArr = secret.split('');
        let result = Array(4).fill('absent');

        // Pass 1: Correct
        for (let i = 0; i < 4; i++) {
            if (guessArr[i] === secretArr[i]) {
                result[i] = 'correct';
                secretArr[i] = null;
                guessArr[i] = null;
            }
        }

        // Pass 2: Present
        for (let i = 0; i < 4; i++) {
            if (guessArr[i] && secretArr.includes(guessArr[i])) {
                result[i] = 'present';
                secretArr[secretArr.indexOf(guessArr[i])] = null;
            }
        }
        return result;
    }

    function animateReveal(result, guess) {
        return new Promise(resolve => {
            const row = document.getElementById(`row-${currentRow}`);
            const tiles = row.children;

            for (let i = 0; i < 4; i++) {
                setTimeout(() => {
                    tiles[i].classList.add(result[i]);
                    // Update Keyboard
                    updateKey(guess[i], result[i]);

                    // Play sound based on result ?? Maybe too noisy
                }, i * 300);
            }

            setTimeout(resolve, 4 * 300 + 200);
        });
    }

    function updateKey(char, status) {
        const keyBtn = document.getElementById(`key-${char}`);
        if (!keyBtn) return;

        // Priority: Correct > Present > Absent
        if (keyBtn.classList.contains('correct')) return;
        if (keyBtn.classList.contains('present') && status === 'absent') return;

        // Remove old status to upgrade
        keyBtn.classList.remove('list');
        // Actually just add new class, CSS order doesn't matter if we don't remove. 
        // But usually safer to just add and let CSS specificity or order handle it.
        // My CSS has: .key.correct { ... } so if I add correct it overrides others if defined later.

        // Safer to remove conflicting classes if logic gets complex, but here:
        if (status === 'correct') {
            keyBtn.classList.remove('present', 'absent');
            keyBtn.classList.add('correct');
        } else if (status === 'present') {
            keyBtn.classList.remove('absent');
            keyBtn.classList.add('present');
        } else {
            keyBtn.classList.add('absent');
        }
    }
});

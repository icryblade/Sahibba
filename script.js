const socket = io();

// DOM Elements
const grid = document.getElementById('grid');
const wordDisplay = document.getElementById('word-display');
const startButton = document.getElementById('start-button');
const timeSelect = document.getElementById('time-select');
const timerDisplay = document.getElementById('timer');
const scoreDisplay = document.getElementById('score-display');
const wordList = document.getElementById('word-list');
const nameInput = document.getElementById('name-input');
const nameButton = document.getElementById('name-button');
const chopButton = document.getElementById('chop-button');
const refreshButton = document.getElementById('refresh-button');
const jokerGrid = document.getElementById('joker-grid');

// Game Variables
let score = 0;
let timeLeft = 0;
let timer;
let selectedWord = [];
let letters = [];
let playerName = '';
let isGameStarted = false;
let refreshCount = 2;
let jokerCards = [];
let hasWildcard = false;
let gridLetters = [];
let wildcardUsed = false;
let dictionary = []; // Dictionary to store valid words

// Load the dictionary
function initializeGame() {
    fetch('dictionary.json')
        .then(response => response.json())
        .then(data => {
            // Convert dictionary to lowercase for consistent matching
            dictionary = data.map(word => word.toLowerCase());
            startButton.disabled = false; // Enable start button after dictionary loads
        })
        .catch(error => {
            console.error('Error loading dictionary:', error);
            alert('Kamus tidak dapat dimuatkan. Sila muat semula halaman.');
        });
}

// Generate letters with vowel control and single wildcard
function generateLetters() {
    const vowels = 'aeiou';
    const consonants = 'bcdfghjklmnpqrstvwxyz';
    
    // Ensure exactly 30 letters (6x5 grid)
    const vowelCount = Math.min(Math.floor(Math.random() * 5) + 7, 25); // Max 25 vowels
    const consonantCount = 30 - vowelCount - (hasWildcard ? 1 : 0);

    let letters = [];
    
    // Add vowels
    for (let i = 0; i < vowelCount; i++) {
        letters.push(vowels[Math.floor(Math.random() * vowels.length)]);
    }
    
    // Add consonants
    for (let i = 0; i < consonantCount; i++) {
        letters.push(consonants[Math.floor(Math.random() * consonants.length)]);
    }
    
    // Add wildcard if none exists
    if (!hasWildcard && Math.random() < 0.3) {
        letters.push('*');
        hasWildcard = true;
    }
    
    // Shuffle and create grid
    letters = letters.sort(() => Math.random() - 0.5);
    
    grid.innerHTML = letters.map(letter => {
        const isVowel = vowels.includes(letter);
        const isWildcard = letter === '*';
        return `<div class="${isVowel ? 'vowel' : ''} ${isWildcard ? 'wildcard' : ''}">
                  ${isWildcard ? '*' : letter}
                </div>`;
    }).join('');
    
    addLetterListeners();
}

// Handle wildcard usage
function handleWildcardUse() {
    hasWildcard = false;
    generateLetters(); // Regenerate letters with possible new wildcard
}

// Generate wildcard cards
function generateWildcardCards() {
    jokerGrid.innerHTML = '';
    jokerCards = [];
    for (let i = 0; i < 3; i++) {
        jokerGrid.innerHTML += `<div>*</div>`;
    }
    addWildcardListeners();
}

// Add click listeners to letters
function addLetterListeners() {
    const letterElements = document.querySelectorAll('.grid div');
    letterElements.forEach((letter) => {
        letter.addEventListener('click', () => {
            if (!letter.classList.contains('selected')) {
                selectedWord.push(letter.textContent || '*'); // Use '*' for wildcard
                updateWordDisplay();
                letter.classList.add('selected');
                letter.style.visibility = 'hidden'; // Hide selected letter
            }
        });
    });
}

// Add click listeners to wildcard cards
function addWildcardListeners() {
    const wildcardElements = document.querySelectorAll('.joker-grid div');
    wildcardElements.forEach((wildcard) => {
        wildcard.addEventListener('click', () => {
            selectedWord.push('*'); // Use '*' for wildcard
            updateWordDisplay();
            wildcard.remove();
        });
    });
}

// Update word display
function updateWordDisplay() {
    wordDisplay.innerHTML = selectedWord.map((letter) => `<div>${letter}</div>`).join('');
    addWordDisplayListeners();
    Sortable.create(wordDisplay, {
        animation: 150,
        onEnd: () => {
            selectedWord = Array.from(wordDisplay.children).map((child) => child.textContent);
        }
    });
}

// Add click listeners to word display letters
function addWordDisplayListeners() {
    const wordLetters = document.querySelectorAll('.word-display div');
    wordLetters.forEach((letter, index) => {
        letter.addEventListener('click', () => {
            const removedLetter = selectedWord.splice(index, 1)[0];
            updateWordDisplay();
            // Show the letter back in the grid
            const gridLetters = document.querySelectorAll('.grid div');
            gridLetters.forEach((gridLetter) => {
                if (gridLetter.textContent === removedLetter || (removedLetter === '*' && gridLetter.classList.contains('wildcard'))) {
                    gridLetter.style.visibility = 'visible';
                    gridLetter.classList.remove('selected');
                }
            });
        });
    });
}

// Modified checkWord function with improved validation
function checkWord() {
    if (timeLeft <= 0) {  // ⛔ Prevent submission if time is up
        alert('Masa tamat! Anda tidak boleh menghantar jawapan lagi.');
        return;

// Disable game interactions
    chopButton.disabled = true;  // Disable check button
    refreshButton.disabled = true; // Disable refresh
    document.querySelectorAll('.grid div').forEach(letter => letter.style.pointerEvents = 'none'); // Disable letter clicks
    }


    const rawWord = selectedWord.join('');
    const sanitizedWord = rawWord.toLowerCase().replace(/[^a-z*]/gi, ''); // Remove non-alphabetic characters
    
    if (!sanitizedWord) {
        alert('Perkataan tidak sah: ' + rawWord);
        resetSelection();
        return;
    }

    // Convert wildcard '*' to regex pattern '.'
    const regexPattern = new RegExp(`^${sanitizedWord.replace(/\*/g, '.')}$`, 'i');

    // Check if the word is in the dictionary
    const isValid = dictionary.some(dictWord => {
        if (dictWord.length !== sanitizedWord.length) return false;
        return regexPattern.test(dictWord);
    });

    if (isValid) {
        // Update score and interface
        const wordScore = sanitizedWord.replace(/\*/g, '').length; // Count only non-wildcard letters
    score += wordScore; // Add to total score

    // Update UI
    scoreDisplay.textContent = `Skor: ${score}`;
    wordList.innerHTML += `<li>${rawWord} (+${wordScore} mark)</li>`; // Show marks next to word
    
    generateLetters();
        // Do not regenerate wildcard cards to prevent them from resetting
    } else {
        alert('Perkataan tidak sah: ' + rawWord);
    }

    resetSelection();
}

// Function to reset selection
function resetSelection() {
    const gridLetters = document.querySelectorAll('.grid div');
    gridLetters.forEach(gridLetter => {
        if (selectedWord.includes(gridLetter.textContent)) {
            gridLetter.style.visibility = 'visible';
            gridLetter.classList.remove('selected');
        }
    });
    selectedWord = [];
    updateWordDisplay();
}



// Start the game
startButton.addEventListener('click', () => {
    if (!playerName) {
        alert('Sila masukkan nama anda.');
        return;
    }
    if (dictionary.length === 0) {
        alert('Kamus sedang dimuatkan. Sila cuba sebentar lagi.');
        return;
    }
    if (!isGameStarted) {
        timeLeft = parseInt(timeSelect.value);
        timeSelect.disabled = true;
        // Disable name input & button after game starts
        nameInput.disabled = true;
        nameButton.disabled = true;

        
        startTimer();
        generateLetters();
        generateWildcardCards();
        isGameStarted = true;
    }
});

// Refresh alphabet
refreshButton.addEventListener('click', () => {
    if (refreshCount > 0) {
        generateLetters();
        refreshCount--;
        refreshButton.textContent = `Refresh Alphabet (${refreshCount}x)`;
    } else {
        alert('Tiada lagi refresh tersedia.');
    }
});

// Start the timer
function startTimer() {
    timer = setInterval(() => {
        timeLeft--;
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerDisplay.textContent = `Masa: ${minutes}:${seconds.toString().padStart(2, '0')}`;
        if (timeLeft <= 60) {
            timerDisplay.classList.add('blink');
        }
        if (timeLeft === 0) {
            clearInterval(timer);
            alert('Masa tamat!');
            submitScore();
        }
    }, 1000);
}

// Submit score to server
function submitScore() {
    if (playerName) {
        socket.emit('submit-score', { name: playerName, score });
    }
}

// Update word list
socket.on('update-scores', (scores) => {
    wordList.innerHTML = '';
    for (const [, words] of Object.entries(scores)) {
        if (Array.isArray(words)) {
            wordList.innerHTML += `<li>${words.join(', ')}</li>`;
        } else {
            console.error('Expected an array but got:', words);
        }
    }
});

// Handle name submission
nameButton.addEventListener('click', () => {
    if (isGameStarted) {  
        // ⛔ Prevent name change if game started
        alert('Anda tidak boleh menukar nama selepas permainan bermula!');
        return;
    }
    const name = nameInput.value.trim();
    if (name) {
        playerName = name;
        alert(`Nama anda: ${playerName}`);
    } else {
        alert('Sila masukkan nama anda.');
    }
});

// Handle CHOPP button
chopButton.addEventListener('click', checkWord);

// Initialize the game when the page loads
initializeGame();
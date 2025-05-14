let currentGuess = '';
let currentRow = 0;
let wordToGuess = '';
const maxGuesses = 6;
const wordLength = 5;
let words = [];
let gameOver = false;

async function loadWords() {
  const response = await fetch('mots.json');
  words = await response.json();
  wordToGuess = words[Math.floor(Math.random() * words.length)].toLowerCase();
}

function createGrid() {
  const grid = document.getElementById('grid');
  for (let i = 0; i < maxGuesses * wordLength; i++) {
    const tile = document.createElement('div');
    tile.classList.add('tile');
    tile.setAttribute('id', `tile-${i}`);
    grid.appendChild(tile);
  }
}

function createKeyboard() {
  const rows = [
    'A Z E R T Y U I O P'.split(' '),
    'Q S D F G H J K L M'.split(' '),
    ['←', 'W', 'X', 'C', 'V', 'B', 'N', 'ENTRER']
  ];

  const keyboard = document.getElementById('keyboard');
  rows.forEach(row => {
    const rowEl = document.createElement('div');
    rowEl.classList.add('keyboard-row');

    row.forEach(key => {
      const keyEl = document.createElement('button');
      keyEl.textContent = key;
      keyEl.classList.add('key');
      keyEl.addEventListener('click', () => handleKey(key));
      rowEl.appendChild(keyEl);
    });

    keyboard.appendChild(rowEl);
  });

  // Ajouter le bouton "Voir la réponse"
  const revealBtn = document.createElement('button');
  revealBtn.textContent = 'Voir la réponse';
  revealBtn.classList.add('key');
  revealBtn.style.marginTop = '10px';
  revealBtn.addEventListener('click', revealAnswer);
  keyboard.appendChild(revealBtn);

  // Ajouter le bouton "Réinitialiser"
  const resetBtn = document.createElement('button');
  resetBtn.textContent = 'Réinitialiser';
  resetBtn.classList.add('key');
  resetBtn.style.marginTop = '10px';
  resetBtn.addEventListener('click', resetGame);
  resetBtn.style.display = 'none';  // Initialement masqué
  keyboard.appendChild(resetBtn);
}

function handleKey(key) {
  if (gameOver) return;
  const message = document.getElementById('message');
  message.textContent = '';

  if (key === '←') {
    currentGuess = currentGuess.slice(0, -1);
  } else if (key === 'ENTRER') {
    if (currentGuess.length !== wordLength) return;
    if (!words.includes(currentGuess)) {
      message.textContent = 'Mot inconnu';
      return;
    }
    checkGuess();
  } else {
    if (currentGuess.length < wordLength) {
      currentGuess += key.toLowerCase();
    }
  }
  updateGrid();
}

function updateGrid() {
  for (let i = 0; i < wordLength; i++) {
    const tile = document.getElementById(`tile-${currentRow * wordLength + i}`);
    tile.textContent = currentGuess[i] || '';
  }
}

function checkGuess() {
  for (let i = 0; i < wordLength; i++) {
    const letter = currentGuess[i];
    const tile = document.getElementById(`tile-${currentRow * wordLength + i}`);
    const keyEl = [...document.querySelectorAll('.key')].find(k => k.textContent.toLowerCase() === letter);

    if (wordToGuess[i] === letter) {
      tile.style.backgroundColor = '#538d4e';
      keyEl?.classList.add('correct');
    } else if (wordToGuess.includes(letter)) {
      tile.style.backgroundColor = '#b59f3b';
      keyEl?.classList.add('present');
    } else {
      tile.style.backgroundColor = '#3a3a3c';
      keyEl?.classList.add('absent');
    }
  }

  if (currentGuess === wordToGuess) {
    document.getElementById('message').textContent = 'Bravo ! 🎉';
    gameOver = true;
  } else if (++currentRow === maxGuesses) {
    document.getElementById('message').textContent = `Le mot était : ${wordToGuess}`;
    gameOver = true;
  } else {
    currentGuess = '';
  }

  showResetButton();
}

function revealAnswer() {
  if (gameOver) return;
  gameOver = true;
  const message = document.getElementById('message');
  message.textContent = `Le mot était : ${wordToGuess}`;

  showResetButton();
}

function showResetButton() {
  // Sélectionner le bouton "Réinitialiser" de manière explicite en utilisant le texte du bouton
  const resetBtn = [...document.querySelectorAll('.key')].find(button => button.textContent === 'Réinitialiser');
  if (resetBtn) {
    resetBtn.style.display = 'inline-block'; // Affiche le bouton de réinitialisation
  }
}

function resetGame() {
  gameOver = false;
  currentGuess = '';
  currentRow = 0;
  wordToGuess = words[Math.floor(Math.random() * words.length)].toLowerCase();
  
  // Réinitialiser les cases de la grille
  for (let i = 0; i < maxGuesses * wordLength; i++) {
    const tile = document.getElementById(`tile-${i}`);
    tile.textContent = '';
    tile.style.backgroundColor = '';
  }

  // Réinitialiser le clavier
  const keys = document.querySelectorAll('.key');
  keys.forEach(key => {
    key.classList.remove('correct', 'present', 'absent');
  });

  // Masquer le bouton de réinitialisation
  const resetBtn = [...document.querySelectorAll('.key')].find(button => button.textContent === 'Réinitialiser');
  if (resetBtn) {
    resetBtn.style.display = 'none';
  }

  // Masquer les messages
  document.getElementById('message').textContent = '';
}

window.onload = async () => {
  await loadWords();
  createGrid();
  createKeyboard();
};

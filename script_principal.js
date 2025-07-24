// script_principal.js

// Variables globales
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const player = {
  x: 100,
  y: 100,
  size: 30,
  speed: 3,
};

let inGameMinutes = 0; // temps en minutes dans le jeu, à incrémenter

// Variables Firebase (exemple, adapte avec ton init)
const db = firebase.database();
const uid = "user123";  // Récupéré après auth
const currentWorld = "world1";

let lastTime = 0;

function clearScreen() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// Exemple simple de déplacement joueur (adapté à ton code)
function updatePlayer() {
  // Ici tu peux gérer clavier/souris pour déplacer player.x / player.y
  // Exemple : player.x += player.speed;
}

// Incrémente le temps de jeu (par ex. 1 seconde = 1 minute ingame)
function updateInGameTime(deltaTime) {
  inGameMinutes += deltaTime / 1000; // 1 sec réel = 1 min jeu
  if (inGameMinutes >= 24 * 60) inGameMinutes = 0; // cycle 24h
}

// Boucle de jeu principale
function gameLoop(timestamp = 0) {
  const deltaTime = timestamp - lastTime;
  lastTime = timestamp;

  clearScreen();

  updatePlayer();
  updateInGameTime(deltaTime);

  // Appelle les fonctions du module health_and_mobs.js
  generateMonsters();
  updateMonsters(deltaTime);
  applyMonsterDamage(timestamp);
  
  // Dessine le joueur (exemple)
  ctx.fillStyle = "green";
  ctx.beginPath();
  ctx.arc(canvas.width / 2, canvas.height / 2, player.size / 2, 0, Math.PI * 2);
  ctx.fill();

  drawMonsters();
  drawHearts();

  requestAnimationFrame(gameLoop);
}

// Démarre la boucle
requestAnimationFrame(gameLoop);

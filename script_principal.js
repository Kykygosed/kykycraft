const firebaseConfig = {
  apiKey: "AIzaSyBPq6Wfxzq02MfK69BFxHm9_FUjDGTmAcw",
  authDomain: "kykychat-24c7f.firebaseapp.com",
  databaseURL: "https://kykychat-24c7f-default-rtdb.firebaseio.com",
  projectId: "kykychat-24c7f",
  storageBucket: "kykychat-24c7f.appspot.com",
  messagingSenderId: "342562811927",
  appId: "1:342562811927:web:0fed1e1f511c4fddcfec52"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const coordsEl = document.getElementById("coords");
const menuPopup = document.getElementById("menuPopup");
const menuBtn = document.getElementById("menuBtn");
const resumeBtn = document.getElementById("resumeBtn");
const quitBtn = document.getElementById("quitBtn");

let player = { x: 100, y: 100, size: 20 };
let uid = "";
let currentWorld = "";
let inGameMinutes = 0;
let currentDay = 1;
let treePositions = [];
const treeImg = new Image();
treeImg.src = "tree.png";

const timeDisplay = document.createElement("div");
timeDisplay.style.position = "fixed";
timeDisplay.style.top = "10px";
timeDisplay.style.left = "10px";
timeDisplay.style.color = "white";
timeDisplay.style.fontSize = "12px";
timeDisplay.style.zIndex = "10";
timeDisplay.style.background = "rgba(0,0,0,0.5)";
timeDisplay.style.padding = "5px 10px";
timeDisplay.style.borderRadius = "5px";
document.body.appendChild(timeDisplay);

const isMobile = /Mobi|Android/i.test(navigator.userAgent);
if (isMobile) menuBtn.style.display = "block";

const mapImg = new Image();
mapImg.src = "map.png";

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

function drawInfiniteMap() {
  const tileW = mapImg.width;
  const tileH = mapImg.height;
  const offsetX = - (player.x % tileW);
  const offsetY = - (player.y % tileH);
  const tilesX = Math.ceil(canvas.width / tileW) + 1;
  const tilesY = Math.ceil(canvas.height / tileH) + 1;

  for (let y = 0; y < tilesY; y++) {
    for (let x = 0; x < tilesX; x++) {
      ctx.drawImage(mapImg, offsetX + x * tileW, offsetY + y * tileH);
    }
  }
}

function getGameTimeStr() {
  const hours = Math.floor(inGameMinutes / 60) % 24;
  const minutes = Math.floor(inGameMinutes % 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

function updateLighting() {
  const hour = Math.floor(inGameMinutes / 60) % 24;
  let opacity = 0;

  if (hour >= 21 || hour < 5) {
    opacity = 0.5;
  } else if (hour >= 18 && hour < 21) {
    opacity = (hour - 18) / 3 * 0.5;
  } else if (hour >= 5 && hour < 8) {
    opacity = (1 - (hour - 5) / 3) * 0.5;
  }

  ctx.fillStyle = `rgba(0,0,0,${opacity.toFixed(2)})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  return opacity;
}

auth.onAuthStateChanged(async user => {
  if (!user) return location.href = "index.html";
  uid = user.uid;
  document.getElementById("loading").style.display = "flex";

  const playingSnap = await db.ref(`users/${uid}/playing`).once("value");
  currentWorld = playingSnap.val();
  if (!currentWorld || currentWorld === "Ecran d'accueil") return location.href = "play.html";

  const coordsSnap = await db.ref(`users/${uid}/worlds/${currentWorld}/playerinfos/coords`).once("value");
  if (coordsSnap.exists()) {
    const val = coordsSnap.val();
    player.x = parseFloat(val.x) || 100;
    player.y = parseFloat(val.y) || 100;
  }

  const dateSnap = await db.ref(`users/${uid}/worlds/${currentWorld}/date`).once("value");
  if (dateSnap.exists()) {
    const [h, m] = dateSnap.val().split(":").map(Number);
    inGameMinutes = h * 60 + m;
  }

  const daySnap = await db.ref(`users/${uid}/worlds/${currentWorld}/day`).once("value");
  if (daySnap.exists()) currentDay = daySnap.val();

  await loadOrGenerateTrees();
  await db.ref(`presence/${uid}`).set(true);

  document.getElementById("loading").style.display = "none";
  requestAnimationFrame(gameLoop);
});

async function loadOrGenerateTrees() {
  const treesRef = db.ref(`users/${uid}/worlds/${currentWorld}/worldinfo/trees`);
  const snap = await treesRef.once("value");

  if (snap.exists()) {
    treePositions = Object.values(snap.val());
  } else {
    const positions = [];
    const baseX = player.x;
    const baseY = player.y;
    for (let i = 0; i < 60; i++) {
      const x = baseX + Math.random() * 1000 - 500;
      const y = baseY + Math.random() * 1000 - 500;
      positions.push({ x: Math.round(x), y: Math.round(y) });
    }
    treePositions = positions;
    for (let i = 0; i < positions.length; i++) {
      await treesRef.child(`${positions[i].x}_${positions[i].y}`).set(positions[i]);
    }
  }
}

function updateFirebaseCoords() {
  db.ref(`users/${uid}/worlds/${currentWorld}/playerinfos/coords`).set({
    x: player.x.toFixed(2),
    y: player.y.toFixed(2)
  });
}

const keys = {};
window.addEventListener("keydown", e => {
  keys[e.key.toLowerCase()] = true;
  if (e.key === "Escape") openMenu();
});
window.addEventListener("keyup", e => {
  keys[e.key.toLowerCase()] = false;
});

function handleMovement() {
  const speed = 3;
  if (keys["z"]) player.y -= speed;
  if (keys["s"]) player.y += speed;
  if (keys["q"]) player.x -= speed;
  if (keys["d"]) player.x += speed;
}

let lastTimeUpdate = Date.now();
function updateGameTime() {
  const now = Date.now();
  const delta = (now - lastTimeUpdate) / 1000;
  lastTimeUpdate = now;

  inGameMinutes += delta * 0.24; // 60 min IRL = 1 jour

  if (inGameMinutes >= 1440) {
    inGameMinutes -= 1440;
    currentDay++;
  }

  db.ref(`users/${uid}/worlds/${currentWorld}/date`).set(getGameTimeStr());
  db.ref(`users/${uid}/worlds/${currentWorld}/day`).set(currentDay);
}

function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawInfiniteMap();

  const playerScreenX = canvas.width / 2 - player.size / 2;
  const playerScreenY = canvas.height / 2 - player.size / 2;

  handleMovement();
  updateGameTime();
  updateFirebaseCoords();

  ctx.fillStyle = "red";
  ctx.fillRect(playerScreenX, playerScreenY, player.size, player.size);

  let opacity = updateLighting();

  for (const tree of treePositions) {
    const screenX = canvas.width / 2 + (tree.x - player.x);
    const screenY = canvas.height / 2 + (tree.y - player.y);
    ctx.drawImage(treeImg, screenX - 16, screenY - 32, 32, 64);
    if (opacity > 0) {
      ctx.fillStyle = `rgba(0,0,0,${opacity.toFixed(2)})`;
      ctx.fillRect(screenX - 16, screenY - 32, 32, 64);
    }
  }

  coordsEl.textContent = `X: ${player.x.toFixed(2)} Y: ${player.y.toFixed(2)}`;
  timeDisplay.textContent = `Jour ${currentDay} - ${getGameTimeStr()}`;

  requestAnimationFrame(gameLoop);
}

function openMenu() {
  menuPopup.style.display = "block";
  menuBtn.style.display = "none";
}
function closeMenu() {
  menuPopup.style.display = "none";
  if (isMobile) menuBtn.style.display = "block";
}
menuBtn.onclick = openMenu;
resumeBtn.onclick = () => closeMenu();
quitBtn.onclick = async () => {
  updateFirebaseCoords();
  await db.ref(`users/${uid}/playing`).set("Ecran d'accueil");
  await db.ref(`presence/${uid}`).set(false);
  await db.ref(`users/${uid}/worlds/${currentWorld}/date`).set(getGameTimeStr());
  await db.ref(`users/${uid}/worlds/${currentWorld}/day`).set(currentDay);
  location.href = "play.html";
};

window.addEventListener("beforeunload", async () => {
  await db.ref(`presence/${uid}`).set(false);
  await db.ref(`users/${uid}/playing`).set("Ecran d'accueil");
});
auth.onAuthStateChanged(async user => {
  if (!user) {
    // Pas connecté, on renvoie à la page de connexion
    return location.href = "index.html";
  }

  uid = user.uid;
  document.getElementById("loading").style.display = "flex";

  try {
    // Récupérer le monde courant dans lequel joue l'utilisateur
    const playingSnap = await db.ref(`users/${uid}/playing`).once("value");
    currentWorld = playingSnap.val();

    // Si pas de monde ou "Ecran d'accueil", renvoyer vers la page play
    if (!currentWorld || currentWorld === "Ecran d'accueil") {
      return location.href = "play.html";
    }

    // Charger la position du joueur
    const coordsSnap = await db.ref(`users/${uid}/worlds/${currentWorld}/playerinfos/coords`).once("value");
    if (coordsSnap.exists()) {
      const val = coordsSnap.val();
      player.x = parseFloat(val.x) || 100;
      player.y = parseFloat(val.y) || 100;
    }

    // Charger la date / heure du jeu
    const dateSnap = await db.ref(`users/${uid}/worlds/${currentWorld}/date`).once("value");
    if (dateSnap.exists()) {
      const [h, m] = dateSnap.val().split(":").map(Number);
      inGameMinutes = h * 60 + m;
    }

    // Charger le jour actuel
    const daySnap = await db.ref(`users/${uid}/worlds/${currentWorld}/day`).once("value");
    if (daySnap.exists()) {
      currentDay = daySnap.val();
    }

    // Charger ou générer les positions des arbres
    await loadOrGenerateTrees();

    // Marquer l'utilisateur comme présent
    await db.ref(`presence/${uid}`).set(true);

  } catch (error) {
    console.error("Erreur lors du chargement des données :", error);
    alert("Une erreur est survenue lors du chargement du jeu.");
    return location.href = "play.html";
  }

  // Tout est prêt, masquer le chargement et démarrer le jeu
  document.getElementById("loading").style.display = "none";
  requestAnimationFrame(gameLoop);
});

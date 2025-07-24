// health_and_mobs.js

// Variables vie
const heartImg = new Image();
heartImg.src = "heart.png";

let heartsMax = 10;
let heartsCurrent = heartsMax;

let monsters = [];
const monsterSize = 20;
const monsterSpeed = 1.2;
const monsterDamageInterval = 1000; // ms
let lastDamageTime = 0;

let isDead = false;
let isSpectator = false;
let respawnPoint = { x: 100, y: 100 };

// Création overlay mort + boutons
const deathOverlay = document.createElement("div");
deathOverlay.style.position = "fixed";
deathOverlay.style.top = "0";
deathOverlay.style.left = "0";
deathOverlay.style.width = "100vw";
deathOverlay.style.height = "100vh";
deathOverlay.style.backgroundColor = "rgba(0,0,0,0.95)";
deathOverlay.style.color = "white";
deathOverlay.style.fontFamily = "'Press Start 2P', cursive";
deathOverlay.style.fontSize = "24px";
deathOverlay.style.display = "none";
deathOverlay.style.flexDirection = "column";
deathOverlay.style.justifyContent = "center";
deathOverlay.style.alignItems = "center";
deathOverlay.style.zIndex = "1000";

const deathMessage = document.createElement("div");
deathMessage.textContent = "Vous avez succombé.";
deathMessage.style.marginBottom = "20px";

const btnContainer = document.createElement("div");
btnContainer.style.display = "flex";
btnContainer.style.gap = "20px";

const respawnBtn = document.createElement("button");
respawnBtn.textContent = "Réapparaître";
respawnBtn.style.fontFamily = "'Press Start 2P', cursive";
respawnBtn.style.fontSize = "16px";
respawnBtn.style.padding = "10px 20px";
respawnBtn.style.cursor = "pointer";

const returnBtn = document.createElement("button");
returnBtn.textContent = "Retour à l'accueil";
returnBtn.style.fontFamily = "'Press Start 2P', cursive";
returnBtn.style.fontSize = "16px";
returnBtn.style.padding = "10px 20px";
returnBtn.style.cursor = "pointer";

const watchBtn = document.createElement("button");
watchBtn.textContent = "Regarder";
watchBtn.style.fontFamily = "'Press Start 2P', cursive";
watchBtn.style.fontSize = "16px";
watchBtn.style.padding = "10px 20px";
watchBtn.style.cursor = "pointer";
watchBtn.style.display = "none";

btnContainer.appendChild(respawnBtn);
btnContainer.appendChild(watchBtn);
btnContainer.appendChild(returnBtn);
deathOverlay.appendChild(deathMessage);
deathOverlay.appendChild(btnContainer);
document.body.appendChild(deathOverlay);

// Dessine les cœurs en bas à gauche
function drawHearts() {
  const heartSize = 32;
  const padding = 5;
  for (let i = 0; i < heartsMax; i++) {
    const x = padding + i * (heartSize + padding);
    const y = canvas.height - heartSize - padding;
    if (i < heartsCurrent) {
      ctx.drawImage(heartImg, x, y, heartSize, heartSize);
    } else {
      ctx.globalAlpha = 0.3;
      ctx.drawImage(heartImg, x, y, heartSize, heartSize);
      ctx.globalAlpha = 1.0;
    }
  }
}

// Génère les monstres la nuit
function generateMonsters() {
  const hour = Math.floor(inGameMinutes / 60) % 24;
  if (hour >= 17 || hour < 8) {
    if (monsters.length < 10) {
      const spawnRadius = 500;
      const angle = Math.random() * 2 * Math.PI;
      const distance = 300 + Math.random() * (spawnRadius - 300);
      const mx = player.x + Math.cos(angle) * distance;
      const my = player.y + Math.sin(angle) * distance;
      monsters.push({ x: mx, y: my, size: monsterSize });
    }
  } else {
    monsters = [];
  }
}

function isMonsterVisible(monster) {
  const screenX = canvas.width / 2 + (monster.x - player.x);
  const screenY = canvas.height / 2 + (monster.y - player.y);
  return (
    screenX >= -monster.size &&
    screenX <= canvas.width + monster.size &&
    screenY >= -monster.size &&
    screenY <= canvas.height + monster.size
  );
}

function updateMonsters(deltaTime) {
  for (const m of monsters) {
    if (isMonsterVisible(m)) {
      const dx = player.x - m.x;
      const dy = player.y - m.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 1) {
        m.x += (dx / dist) * monsterSpeed;
        m.y += (dy / dist) * monsterSpeed;
      }
    } else {
      m.x += (Math.random() - 0.5) * 0.5;
      m.y += (Math.random() - 0.5) * 0.5;
    }
  }
}

function drawMonsters() {
  ctx.fillStyle = "blue";
  for (const m of monsters) {
    const screenX = canvas.width / 2 + (m.x - player.x);
    const screenY = canvas.height / 2 + (m.y - player.y);
    ctx.fillRect(screenX - m.size / 2, screenY - m.size / 2, m.size, m.size);
  }
}

function applyMonsterDamage(timeNow) {
  if (timeNow - lastDamageTime < monsterDamageInterval) return;
  lastDamageTime = timeNow;

  for (const m of monsters) {
    const dist = Math.hypot(m.x - player.x, m.y - player.y);
    if (dist < monsterSize / 2 + player.size / 2) {
      if (!isSpectator && !isDead) {
        heartsCurrent = Math.max(heartsCurrent - 1, 0);
        // Mise à jour Firebase (adapter selon ton contexte)
        db.ref(`users/${uid}/worlds/${currentWorld}/playerinfos/hearts`).set(heartsCurrent);
        if (heartsCurrent <= 0) {
          handleDeath();
        }
      }
      break;
    }
  }
}

function handleDeath() {
  isDead = true;
  deathOverlay.style.display = "flex";
  respawnBtn.style.display = isSpectator ? "none" : "inline-block";
  watchBtn.style.display = isSpectator ? "inline-block" : "none";
}

async function respawnPlayer() {
  heartsCurrent = heartsMax;
  player.x = respawnPoint.x;
  player.y = respawnPoint.y;
  isDead = false;
  deathOverlay.style.display = "none";
  await db.ref(`users/${uid}/worlds/${currentWorld}/playerinfos/hearts`).set(heartsCurrent);
  await db.ref(`users/${uid}/worlds/${currentWorld}/playerinfos/coords`).set({ x: player.x, y: player.y });
}

function enterSpectatorMode() {
  isSpectator = true;
  isDead = false;
  deathOverlay.style.display = "none";
}

// Gestion boutons
respawnBtn.onclick = () => respawnPlayer();
returnBtn.onclick = () => location.href = "index.html";
watchBtn.onclick = () => {
  enterSpectatorMode();
  deathOverlay.style.display = "none";
};

// Charger la vie et le mode spectateur depuis Firebase au lancement
async function loadHeartsAndMode() {
  const heartsSnap = await db.ref(`users/${uid}/worlds/${currentWorld}/playerinfos/hearts`).once("value");
  if (heartsSnap.exists()) {
    heartsCurrent = heartsSnap.val();
  } else {
    heartsCurrent = heartsMax;
    await db.ref(`users/${uid}/worlds/${currentWorld}/playerinfos/hearts`).set(heartsCurrent);
  }
  const uniqueSnap = await db.ref(`users/${uid}/worlds/${currentWorld}/unique`).once("value");
  if (uniqueSnap.exists()) {
    isSpectator = uniqueSnap.val() === true || uniqueSnap.val() === "true";
  }
}
loadHeartsAndMode();

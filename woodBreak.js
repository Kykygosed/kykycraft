// variables globales
let treePositions = [];
let woodInventory = 0;

// Firebase database reference
const db = firebase.database();
const uid = "userIdExemple"; // à remplacer par l'UID réel
const currentWorld = "world1"; // à adapter

// Exemple position joueur, à mettre à jour en temps réel dans ton jeu
const player = { x: 0, y: 0 };

// Fonction pour charger ou générer les arbres dans Firebase
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
    for (let pos of positions) {
      await treesRef.child(`${pos.x}_${pos.y}`).set(pos);
    }
  }
}

// Fonction pour afficher les arbres dans le DOM
function renderTrees() {
  const container = document.getElementById("tree-container");
  container.innerHTML = ""; // vide l'affichage avant rendu

  treePositions.forEach(pos => {
    const treeEl = document.createElement("div");
    treeEl.className = "tree";
    treeEl.dataset.id = `${pos.x}_${pos.y}`;

    // Style basique, à adapter selon ton jeu (ex: position absolue sur la carte)
    treeEl.style.position = "absolute";
    treeEl.style.left = `${pos.x}px`;
    treeEl.style.top = `${pos.y}px`;
    treeEl.style.width = "40px";
    treeEl.style.height = "60px";
    treeEl.style.background = "green";
    treeEl.style.border = "2px solid darkgreen";
    treeEl.style.borderRadius = "10px";

    container.appendChild(treeEl);
  });
}

// Fonction pour casser un arbre
async function breakTree(treeElement, x, y) {
  // Supprime arbre de l'affichage
  treeElement.remove();

  // Supprime arbre de la liste en mémoire
  treePositions = treePositions.filter(pos => !(pos.x === x && pos.y === y));

  // Supprime arbre de Firebase
  const treeRef = db.ref(`users/${uid}/worlds/${currentWorld}/worldinfo/trees/${x}_${y}`);
  await treeRef.remove();

  // Ajoute du bois à l'inventaire
  woodInventory++;
  console.log(`Bois récolté ! Total bois : ${woodInventory}`);
  updateWoodUI();
}

// Affiche l'inventaire de bois dans le DOM (exemple)
function updateWoodUI() {
  const woodCount = document.getElementById("wood-count");
  if (woodCount) {
    woodCount.textContent = `Bois : ${woodInventory}`;
  }
}

// Détecte la proximité du joueur avec les arbres, affiche bouton "Casser"
function startTreeProximityDetection() {
  setInterval(() => {
    treePositions.forEach(pos => {
      const treeElement = document.querySelector(`.tree[data-id="${pos.x}_${pos.y}"]`);
      if (!treeElement) return;

      const dx = player.x - pos.x;
      const dy = player.y - pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      let breakBtn = treeElement.querySelector('.break-button');

      if (dist < 50) {
        if (!breakBtn) {
          breakBtn = document.createElement('button');
          breakBtn.className = 'break-button';
          breakBtn.textContent = 'Casser';
          breakBtn.style.position = 'absolute';
          breakBtn.style.left = '40px';
          breakBtn.style.top = '-20px';

          breakBtn.addEventListener('click', () => {
            breakTree(treeElement, pos.x, pos.y);
          });

          treeElement.appendChild(breakBtn);
        }
      } else {
        if (breakBtn) breakBtn.remove();
      }
    });
  }, 200);
}

// Exemple d'update de la position joueur (à remplacer par ton code réel)
function updatePlayerPosition(x, y) {
  player.x = x;
  player.y = y;
}

// Fonction principale d'initialisation
async function initGame() {
  await loadOrGenerateTrees();
  renderTrees();
  updateWoodUI();
  startTreeProximityDetection();

  // Pour test, simuler le joueur au centre de la zone
  updatePlayerPosition(0, 0);
}

initGame();

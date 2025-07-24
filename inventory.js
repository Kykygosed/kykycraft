// ⚠️ Toujours en haut du fichier
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, set, get, onValue, update, remove } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// ✅ Configuration correcte
const firebaseConfig = {
  apiKey: "AIzaSyBPq6Wfxzq02MfK69BFxHm9_FUjDGTmAcw",
  authDomain: "kykychat-24c7f.firebaseapp.com",
  databaseURL: "https://kykychat-24c7f-default-rtdb.firebaseio.com",
  projectId: "kykychat-24c7f",
  storageBucket: "kykychat-24c7f.firebasestorage.app",
  messagingSenderId: "342562811927",
  appId: "1:342562811927:web:0fed1e1f511c4fddcfec52"
};
// ✅ Initialisation
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

// --- Variables globales ---
let uid = null;
let worldName = null;
let inventory = Array(36).fill(null); // 36 slots
let selectedSlot = null;
let itemsOnGround = [];
let canvas = document.getElementById("canvas");
let ctx = canvas.getContext("2d");

// --- Arbres en jeu (exemple) ---
let trees = [
  { id: "tree1", x: 200, y: 300, hp: 3 },
  { id: "tree2", x: 500, y: 250, hp: 3 }
];

// --- Chargement utilisateur ---
onAuthStateChanged(auth, async (user) => {
  if (user) {
    uid = user.uid;
    const playingSnap = await get(ref(db, `users/${uid}/playing`));
    worldName = playingSnap.val();
    loadInventory();
    loadGroundItems();
  } else {
    alert("Non connecté.");
  }
});

// --- Casser un arbre ---
canvas.addEventListener("click", (e) => {
  const mx = e.offsetX, my = e.offsetY;
  for (let tree of trees) {
    if (Math.abs(tree.x - mx) < 32 && Math.abs(tree.y - my) < 32) {
      tree.hp -= 1;
      if (tree.hp <= 0) {
        // Drop item
        dropItem(tree.x, tree.y, "tronc", 1);
        // Retirer de Firebase
        remove(ref(db, `users/${uid}/worlds/${worldName}/worldinfos/trees/${tree.id}`));
        // Retirer localement
        trees = trees.filter(t => t.id !== tree.id);
      }
    }
  }
});

// --- Drop item au sol ---
function dropItem(x, y, type, amount) {
  const id = Date.now();
  const item = { id, x, y, type, amount };
  set(ref(db, `users/${uid}/worlds/${worldName}/worldinfos/items/${id}`), item);
}

// --- Charger items au sol ---
function loadGroundItems() {
  const path = `users/${uid}/worlds/${worldName}/worldinfos/items`;
  onValue(ref(db, path), (snap) => {
    const val = snap.val();
    itemsOnGround = val ? Object.values(val) : [];
  });
}

// --- Ramasser items ---
function checkItemPickup(playerX, playerY) {
  for (let item of itemsOnGround) {
    if (Math.abs(playerX - item.x) < 16 && Math.abs(playerY - item.y) < 16) {
      addToInventory(item.type, item.amount);
      remove(ref(db, `users/${uid}/worlds/${worldName}/worldinfos/items/${item.id}`));
    }
  }
}

// --- Ajouter à l’inventaire ---
function addToInventory(type, amount) {
  for (let i = 0; i < inventory.length; i++) {
    const slot = inventory[i];
    if (slot && slot.type === type && slot.amount < 32) {
      const space = 32 - slot.amount;
      const toAdd = Math.min(space, amount);
      slot.amount += toAdd;
      amount -= toAdd;
      if (amount === 0) break;
    }
  }
  if (amount > 0) {
    for (let i = 0; i < inventory.length; i++) {
      if (!inventory[i]) {
        inventory[i] = { type, amount: Math.min(32, amount) };
        amount -= 32;
        if (amount <= 0) break;
      }
    }
  }
  saveInventory();
}

// --- Sauvegarder l’inventaire ---
function saveInventory() {
  set(ref(db, `users/${uid}/worlds/${worldName}/playerinfos/inventory`), inventory);
}

// --- Charger l’inventaire ---
function loadInventory() {
  onValue(ref(db, `users/${uid}/worlds/${worldName}/playerinfos/inventory`), (snap) => {
    const val = snap.val();
    if (val) inventory = val;
    renderInventory();
  });
}

// --- Rendu de l’inventaire ---
function renderInventory() {
  const invDiv = document.getElementById("inventory");
  invDiv.innerHTML = "";
  inventory.forEach((slot, i) => {
    const el = document.createElement("div");
    el.className = "slot";
    el.dataset.index = i;
    if (slot) {
      el.innerHTML = `<img src="tronc.png"><span>${slot.amount}</span>`;
    }
    invDiv.appendChild(el);
  });
}

// --- Interaction inventaire ---
let heldItem = null;
document.addEventListener("keydown", (e) => {
  if (e.key === "e") {
    const inv = document.getElementById("inventory");
    inv.style.display = inv.style.display === "none" ? "grid" : "none";
  }
});

document.getElementById("inventory").addEventListener("click", (e) => {
  const index = e.target.closest(".slot").dataset.index;
  const slot = inventory[index];
  if (heldItem) {
    if (!slot) {
      inventory[index] = heldItem;
      heldItem = null;
    } else if (slot.type === heldItem.type && slot.amount < 32) {
      const space = 32 - slot.amount;
      const toAdd = Math.min(space, heldItem.amount);
      slot.amount += toAdd;
      heldItem.amount -= toAdd;
      if (heldItem.amount === 0) heldItem = null;
    } else {
      [inventory[index], heldItem] = [heldItem, slot];
    }
  } else if (slot) {
    heldItem = slot;
    inventory[index] = null;
  }
  renderInventory();
  saveInventory();
});

// --- Rendu / Boucle principale ---
let playerX = 100, playerY = 100;
function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Dessiner arbres
  for (let tree of trees) {
    ctx.fillStyle = "green";
    ctx.fillRect(tree.x - 16, tree.y - 32, 32, 64);
  }

  // Dessiner items au sol
  for (let item of itemsOnGround) {
    let img = new Image();
    img.src = "tronc.png";
    ctx.drawImage(img, item.x - 8, item.y - 8, 16, 16);
  }

  // Dessiner joueur
  ctx.fillStyle = "blue";
  ctx.fillRect(playerX - 8, playerY - 8, 16, 16);

  // Collision avec items
  checkItemPickup(playerX, playerY);

  requestAnimationFrame(gameLoop);
}
gameLoop();

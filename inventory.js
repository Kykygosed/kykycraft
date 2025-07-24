import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getDatabase, ref, get, set, onValue, remove, push } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
  const firebaseConfig = {
  apiKey: "AIzaSyBPq6Wfxzq02MfK69BFxHm9_FUjDGTmAcw",
  authDomain: "kykychat-24c7f.firebaseapp.com",
  databaseURL: "https://kykychat-24c7f-default-rtdb.firebaseio.com",
  projectId: "kykychat-24c7f",
  storageBucket: "kykychat-24c7f.appspot.com",
  messagingSenderId: "342562811927",
  appId: "1:342562811927:web:0fed1e1f511c4fddcfec52"
};
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

let playerUID = null;
let currentWorld = null;
let inventory = {};
let drops = {};
let trees = [];

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let player = { x: 100, y: 100, size: 32 };
let inventoryVisible = false;
let selectedSlot = null;

function drawPlayer() {
  ctx.fillStyle = "blue";
  ctx.fillRect(player.x, player.y, player.size, player.size);
}

function drawTrees() {
  ctx.fillStyle = "green";
  for (let tree of trees) {
    ctx.fillRect(tree.x, tree.y, 32, 32);
  }
}

function drawDrops() {
  for (let [id, item] of Object.entries(drops)) {
    const img = new Image();
    img.src = "tronc.png";
    ctx.drawImage(img, item.x, item.y, 24, 24);
  }
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawPlayer();
  drawTrees();
  drawDrops();
  requestAnimationFrame(render);
}

function isColliding(a, b, size = 32) {
  return (
    a.x < b.x + size &&
    a.x + size > b.x &&
    a.y < b.y + size &&
    a.y + size > b.y
  );
}

function saveInventory() {
  if (playerUID && currentWorld) {
    const invRef = ref(db, `users/${playerUID}/worlds/${currentWorld}/playerinfos/inventory`);
    set(invRef, inventory);
  }
}

function loadInventory() {
  const invRef = ref(db, `users/${playerUID}/worlds/${currentWorld}/playerinfos/inventory`);
  onValue(invRef, (snap) => {
    if (snap.exists()) inventory = snap.val();
    else inventory = {};
    renderInventory();
  });
}

function renderInventory() {
  const inv = document.getElementById("inventory");
  inv.innerHTML = "";
  Object.keys(inventory).forEach((slot) => {
    const item = inventory[slot];
    const div = document.createElement("div");
    div.className = "invslot";
    div.style.display = "inline-block";
    div.style.width = "40px";
    div.style.height = "40px";
    div.style.border = "1px solid black";
    div.style.margin = "4px";
    div.style.textAlign = "center";
    div.dataset.slot = slot;

    if (item && item.type === "tronc") {
      const img = document.createElement("img");
      img.src = "tronc.png";
      img.style.width = "32px";
      div.appendChild(img);
      div.appendChild(document.createTextNode(item.count));
    }

    div.addEventListener("click", () => {
      if (selectedSlot === null && item) {
        selectedSlot = slot;
      } else if (selectedSlot !== null) {
        if (slot === selectedSlot) {
          selectedSlot = null;
        } else {
          // swap
          const temp = inventory[slot];
          inventory[slot] = inventory[selectedSlot];
          inventory[selectedSlot] = temp;
          selectedSlot = null;
          saveInventory();
        }
      }
    });

    div.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      if (selectedSlot !== null && inventory[selectedSlot]) {
        if (!inventory[slot]) {
          inventory[slot] = { ...inventory[selectedSlot], count: 1 };
        } else if (inventory[slot].type === inventory[selectedSlot].type && inventory[slot].count < 32) {
          inventory[slot].count++;
        }
        inventory[selectedSlot].count--;
        if (inventory[selectedSlot].count <= 0) delete inventory[selectedSlot];
        saveInventory();
      }
    });

    inv.appendChild(div);
  });
}

function addToInventory(itemType, count = 1) {
  for (let slot = 0; slot < 36; slot++) {
    const key = slot.toString();
    if (inventory[key] && inventory[key].type === itemType && inventory[key].count < 32) {
      const available = 32 - inventory[key].count;
      const toAdd = Math.min(count, available);
      inventory[key].count += toAdd;
      count -= toAdd;
      if (count <= 0) break;
    }
  }
  if (count > 0) {
    for (let slot = 0; slot < 36; slot++) {
      const key = slot.toString();
      if (!inventory[key]) {
        const toAdd = Math.min(32, count);
        inventory[key] = { type: itemType, count: toAdd };
        count -= toAdd;
        if (count <= 0) break;
      }
    }
  }
  saveInventory();
}

function tryBreakTree(x, y) {
  for (let i = 0; i < trees.length; i++) {
    const t = trees[i];
    if (isColliding(player, t)) {
      const treeRef = ref(db, `users/${playerUID}/worlds/${currentWorld}/worldinfos/trees/${t.id}`);
      remove(treeRef);
      trees.splice(i, 1);

      const dropRef = push(ref(db, `users/${playerUID}/worlds/${currentWorld}/worldinfos/items`));
      set(dropRef, {
        type: "tronc",
        x: t.x,
        y: t.y,
      });
      break;
    }
  }
}

function checkDropCollision() {
  for (let [id, item] of Object.entries(drops)) {
    if (isColliding(player, item, 24)) {
      addToInventory("tronc");
      remove(ref(db, `users/${playerUID}/worlds/${currentWorld}/worldinfos/items/${id}`));
    }
  }
}

function loadWorldData() {
  const treesRef = ref(db, `users/${playerUID}/worlds/${currentWorld}/worldinfos/trees`);
  onValue(treesRef, (snap) => {
    trees = [];
    snap.forEach((child) => {
      trees.push({ id: child.key, ...child.val() });
    });
  });

  const dropsRef = ref(db, `users/${playerUID}/worlds/${currentWorld}/worldinfos/items`);
  onValue(dropsRef, (snap) => {
    drops = {};
    snap.forEach((child) => {
      drops[child.key] = child.val();
    });
  });

  loadInventory();
}

document.addEventListener("keydown", (e) => {
  if (e.key === "e") {
    inventoryVisible = !inventoryVisible;
    document.getElementById("inventory").style.display = inventoryVisible ? "block" : "none";
  } else if (e.key === " ") {
    tryBreakTree(player.x, player.y);
  } else if (e.key === "ArrowUp") player.y -= 10;
  else if (e.key === "ArrowDown") player.y += 10;
  else if (e.key === "ArrowLeft") player.x -= 10;
  else if (e.key === "ArrowRight") player.x += 10;

  checkDropCollision();
});

onAuthStateChanged(auth, async (user) => {
  if (user) {
    playerUID = user.uid;
    const playingRef = ref(db, `users/${playerUID}/playing`);
    const snap = await get(playingRef);
    if (snap.exists()) {
      currentWorld = snap.val();
      loadWorldData();
      render();
    } else {
      alert("Aucun monde en cours.");
    }
  } else {
    alert("Non connecté.");
  }
});

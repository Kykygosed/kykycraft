// inventory.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, onValue, set, push, remove } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBPq6Wfxzq02MfK69BFxHm9_FUjDGTmAcw",
  authDomain: "kykychat-24c7f.firebaseapp.com",
  databaseURL: "https://kykychat-24c7f-default-rtdb.firebaseio.com",
  projectId: "kykychat-24c7f",
  storageBucket: "kykychat-24c7f.firebasestorage.app",
  messagingSenderId: "342562811927",
  appId: "1:342562811927:web:0fed1e1f511c4fddcfec52"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

let uid = null;
let currentWorld = null;
let inventory = [];
let selectedItem = null;
let movingStack = null;

function renderInventory() {
  const inv = document.getElementById("inventory");
  if (!inv) return;
  inv.innerHTML = "";
  inventory.forEach((item, i) => {
    const slot = document.createElement("div");
    slot.className = "inv-slot";
    if (item) {
      const img = document.createElement("img");
      img.src = "tronc.png";
      img.className = "inv-img";
      slot.appendChild(img);
      const count = document.createElement("span");
      count.className = "inv-count";
      count.textContent = item.count;
      slot.appendChild(count);
    }
    slot.addEventListener("click", () => {
      if (movingStack) {
        if (!item) {
          inventory[i] = { ...movingStack };
          movingStack = null;
        } else {
          // swap
          const temp = { ...inventory[i] };
          inventory[i] = { ...movingStack };
          movingStack = temp;
        }
        updateInventory();
      } else {
        movingStack = item;
        inventory[i] = null;
      }
      renderInventory();
    });
    slot.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      if (movingStack) {
        if (!item) {
          inventory[i] = { ...movingStack, count: 1 };
          movingStack.count--;
        } else if (item.count < 32 && item.type === movingStack.type) {
          item.count++;
          movingStack.count--;
        }
        if (movingStack.count <= 0) movingStack = null;
        updateInventory();
        renderInventory();
      }
    });
    inv.appendChild(slot);
  });
}

function updateInventory() {
  if (!uid || !currentWorld) return;
  const invRef = ref(db, `users/${uid}/worlds/${currentWorld}/playerinfos/inventory`);
  set(invRef, inventory);
}

function pickupItem(type) {
  let added = false;
  for (let slot of inventory) {
    if (slot && slot.type === type && slot.count < 32) {
      slot.count++;
      added = true;
      break;
    }
  }
  if (!added) {
    const emptyIndex = inventory.findIndex(i => i === null);
    if (emptyIndex !== -1) {
      inventory[emptyIndex] = { type, count: 1 };
    }
  }
  updateInventory();
  renderInventory();
}

onAuthStateChanged(auth, user => {
  if (!user) return;
  uid = user.uid;

  const playingRef = ref(db, `users/${uid}/playing`);
  onValue(playingRef, snap => {
    currentWorld = snap.val();
    const invRef = ref(db, `users/${uid}/worlds/${currentWorld}/playerinfos/inventory`);
    onValue(invRef, snap => {
      inventory = snap.val() || Array(27).fill(null);
      renderInventory();
    });
  });
});

window.addEventListener("keydown", e => {
  if (e.key === "e") {
    const inv = document.getElementById("inventory");
    if (inv.style.display === "none") {
      inv.style.display = "grid";
    } else {
      inv.style.display = "none";
    }
  }
});

// Expose pickupItem for other scripts
window.pickupItem = pickupItem;

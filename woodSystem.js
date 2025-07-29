// === Variables globales ===
let heldTree = null;
let holdStartTime = 0;
const holdDuration = 1500; // en ms
let droppedItems = [];
const woodImg = new Image();
woodImg.src = "wood.png";
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");


// === Couper un arbre si on reste appuyé ===
canvas.addEventListener("mousedown", (e) => {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  for (let tree of treePositions) {
    const screenX = canvas.width / 2 + (tree.x - player.x);
    const screenY = canvas.height / 2 + (tree.y - player.y);

    const dist = Math.hypot(mouseX - screenX, mouseY - screenY);
    if (dist < 32) {
      heldTree = tree;
      holdStartTime = Date.now();
      break;
    }
  }
});

canvas.addEventListener("mouseup", () => {
  heldTree = null;
});

// === Fonction pour supprimer un arbre et laisser du bois ===
function cutTree(tree) {
  const key = `${tree.x}_${tree.y}`;
  db.ref(`users/${uid}/worlds/${currentWorld}/worldinfo/trees/${key}`).remove();
  treePositions = treePositions.filter(t => t !== tree);

  droppedItems.push({
    type: "bois",
    x: tree.x,
    y: tree.y
  });
}

// === Ramasser un bois au sol ===
canvas.addEventListener("click", async (e) => {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  for (let i = 0; i < droppedItems.length; i++) {
    const item = droppedItems[i];
    const screenX = canvas.width / 2 + (item.x - player.x);
    const screenY = canvas.height / 2 + (item.y - player.y);
    const dist = Math.hypot(mouseX - screenX, mouseY - screenY);
    const distFromPlayer = Math.hypot(item.x - player.x, item.y - player.y);

    if (dist < 32 && distFromPlayer < 50) {
      await addItemToHotbar("bois");
      droppedItems.splice(i, 1);
      break;
    }
  }
});

// === Ajout dans la hotbar avec stacking ===
async function addItemToHotbar(itemName) {
  const hotbarRef = db.ref(`users/${uid}/worlds/${currentWorld}/playerinfos/hotbar`);
  const snap = await hotbarRef.once("value");
  let hotbar = snap.val();

  for (let slot = 1; slot <= 5; slot++) {
    const val = hotbar[slot];
    if (val && val.startsWith(itemName)) {
      let count = parseInt(val.match(/\((\d+)\)/)?.[1]) || 1;
      count++;
      hotbar[slot] = `${itemName} (${count})`;
      await hotbarRef.set(hotbar);
      return;
    }
  }

  for (let slot = 1; slot <= 5; slot++) {
    if (!hotbar[slot] || hotbar[slot] === "EMPTY") {
      hotbar[slot] = `${itemName} (1)`;
      await hotbarRef.set(hotbar);
      return;
    }
  }

  alert("Inventaire plein !");
}

// === Dessiner les bois au sol ===
function drawDroppedItems() {
  for (let item of droppedItems) {
    const screenX = canvas.width / 2 + (item.x - player.x);
    const screenY = canvas.height / 2 + (item.y - player.y);
    ctx.drawImage(woodImg, screenX - 16, screenY - 16, 32, 32);
  }
}

// === Appelle ceci dans ta gameLoop() ===
function handleHeldTree() {
  if (heldTree && Date.now() - holdStartTime >= holdDuration) {
    cutTree(heldTree);
    heldTree = null;
  }
}

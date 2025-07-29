// woodSystem.js

// Supposé que tu as déjà firebase initialisé et les variables suivantes définies :
// - userId
// - worldName
// - canvas (ton <canvas id="gameCanvas">)
// - hotbarRef (référence Firebase vers users/userId/worlds/worldName/hotbar)

const db = firebase.database();
const treeRef = db.ref(`users/${userId}/worlds/${worldName}/worldinfos/trees`);

const treePositions = []; // [ { x, y } ]
const droppedWoods = [];  // [ { x, y } ]

canvas.addEventListener("mousedown", (e) => {
  const { offsetX, offsetY } = e;
  const tree = getTreeAt(offsetX, offsetY);
  if (tree) {
    setTimeout(() => {
      removeTree(tree);
      dropWoodAt(tree.x, tree.y);
    }, 1000); // reste appuyé 1s
  }
});

canvas.addEventListener("click", (e) => {
  const { offsetX, offsetY } = e;
  const wood = getWoodAt(offsetX, offsetY);
  if (wood) {
    collectWood(wood);
  }
});

function getTreeAt(x, y) {
  return treePositions.find(tree => Math.abs(tree.x - x) < 20 && Math.abs(tree.y - y) < 20);
}

function removeTree(tree) {
  treeRef.orderByChild("x").equalTo(tree.x).once("value", (snap) => {
    snap.forEach(child => {
      if (child.val().y === tree.y) {
        child.ref.remove();
      }
    });
  });
  const idx = treePositions.indexOf(tree);
  if (idx > -1) treePositions.splice(idx, 1);
}

function dropWoodAt(x, y) {
  droppedWoods.push({ x, y });
  drawDroppedWoods();
}

function getWoodAt(x, y) {
  return droppedWoods.find(w => Math.abs(w.x - x) < 20 && Math.abs(w.y - y) < 20);
}

function collectWood(wood) {
  hotbarRef.once("value", snap => {
    const data = snap.val() || {};
    let found = false;

    for (let i = 1; i <= 5; i++) {
      const slot = data[i];
      if (slot?.startsWith("bois")) {
        const match = slot.match(/\((\d+)\)/);
        const count = match ? parseInt(match[1]) + 1 : 2;
        data[i] = `bois (${count})`;
        found = true;
        break;
      }
    }

    if (!found) {
      for (let i = 1; i <= 5; i++) {
        if (!data[i] || data[i] === "EMPTY") {
          data[i] = "bois (1)";
          break;
        }
      }
    }

    hotbarRef.set(data);
    const idx = droppedWoods.indexOf(wood);
    if (idx > -1) droppedWoods.splice(idx, 1);
    drawDroppedWoods();
  });
}

function drawDroppedWoods() {
  const ctx = canvas.getContext("2d");
  // Appelle d’abord drawWorld() pour ne pas dessiner par-dessus les arbres
  drawWorld();
  droppedWoods.forEach(wood => {
    const img = new Image();
    img.src = "wood.png";
    img.onload = () => ctx.drawImage(img, wood.x - 16, wood.y - 16, 32, 32);
  });
}

// Si tu as déjà une fonction pour dessiner le monde, appelle drawDroppedWoods dedans aussi.

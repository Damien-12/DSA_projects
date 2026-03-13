// ───────────────────────────────────────────────
//  AVL Tree Visualizer – Enhanced Edition v2
// ───────────────────────────────────────────────

class Node {
    constructor(value) {
        this.value = value;
        this.left = null;
        this.right = null;
        this.height = 1;
    }
}

let root = null;
let lastRotation = "None";
let previousPositions = {};
let highlightSet = new Set();
let activeEdges = new Set(); // "fromVal->toVal" strings for highlighted edges
let zoomLevel = 1;
let history = [];
let animationTimers = [];

// ── AVL helpers ──────────────────────────────────

function height(n) { return n ? n.height : 0; }
function getBalance(n) { return n ? height(n.left) - height(n.right) : 0; }
function countNodes(n) { return n ? 1 + countNodes(n.left) + countNodes(n.right) : 0; }

function updateHeight(n) {
    if (n) n.height = 1 + Math.max(height(n.left), height(n.right));
}

function findMin(n) {
    if (!n) return null;
    while (n.left) n = n.left;
    return n.value;
}

function findMax(n) {
    if (!n) return null;
    while (n.right) n = n.right;
    return n.value;
}

function rightRotate(y) {
    const x = y.left;
    const T2 = x.right;
    x.right = y;
    y.left = T2;
    updateHeight(y);
    updateHeight(x);
    return x;
}

function leftRotate(x) {
    const y = x.right;
    const T2 = y.left;
    y.left = x;
    x.right = T2;
    updateHeight(x);
    updateHeight(y);
    return y;
}

// ── Insert ──────────────────────────────────────

function insert(node, value) {
    if (!node) return new Node(value);

    if (value < node.value) {
        node.left = insert(node.left, value);
    } else if (value > node.value) {
        node.right = insert(node.right, value);
    } else {
        return node;
    }

    updateHeight(node);
    const balance = getBalance(node);

    if (balance > 1 && value < node.left.value) {
        lastRotation = "Right Rotation";
        return rightRotate(node);
    }
    if (balance < -1 && value > node.right.value) {
        lastRotation = "Left Rotation";
        return leftRotate(node);
    }
    if (balance > 1 && value > node.left.value) {
        node.left = leftRotate(node.left);
        lastRotation = "Left-Right Rotation";
        return rightRotate(node);
    }
    if (balance < -1 && value < node.right.value) {
        node.right = rightRotate(node.right);
        lastRotation = "Right-Left Rotation";
        return leftRotate(node);
    }
    return node;
}

// ── Delete ──────────────────────────────────────

function minValueNode(node) {
    let current = node;
    while (current.left) current = current.left;
    return current;
}

function deleteNode(node, value) {
    if (!node) return null;

    if (value < node.value) {
        node.left = deleteNode(node.left, value);
    } else if (value > node.value) {
        node.right = deleteNode(node.right, value);
    } else {
        if (!node.left || !node.right) {
            node = node.left || node.right;
        } else {
            const temp = minValueNode(node.right);
            node.value = temp.value;
            node.right = deleteNode(node.right, temp.value);
        }
    }

    if (!node) return null;

    updateHeight(node);
    const balance = getBalance(node);

    if (balance > 1 && getBalance(node.left) >= 0) {
        lastRotation = "Right Rotation";
        return rightRotate(node);
    }
    if (balance > 1 && getBalance(node.left) < 0) {
        node.left = leftRotate(node.left);
        lastRotation = "Left-Right Rotation";
        return rightRotate(node);
    }
    if (balance < -1 && getBalance(node.right) <= 0) {
        lastRotation = "Left Rotation";
        return leftRotate(node);
    }
    if (balance < -1 && getBalance(node.right) > 0) {
        node.right = rightRotate(node.right);
        lastRotation = "Right-Left Rotation";
        return leftRotate(node);
    }
    return node;
}

// ── Search / Path helpers ───────────────────────

function search(node, value) {
    if (!node) return false;
    if (value === node.value) return true;
    return value < node.value ? search(node.left, value) : search(node.right, value);
}

function getSearchPath(node, value) {
    const path = [];
    let current = node;
    while (current) {
        path.push(current.value);
        if (value === current.value) break;
        current = value < current.value ? current.left : current.right;
    }
    return path;
}

function getInsertPath(node, value) {
    const path = [];
    let current = node;
    while (current) {
        path.push(current.value);
        if (value === current.value) break;
        current = value < current.value ? current.left : current.right;
    }
    return path;
}

// ── Clear all running animations ────────────────

function clearAnimations() {
    animationTimers.forEach(t => clearTimeout(t));
    animationTimers = [];
    highlightSet = new Set();
    activeEdges = new Set();
}

// ── Animated step-through ───────────────────────
// Walks a path one node at a time with delay, then calls onComplete

function animatePathTraversal(path, delay, onComplete) {
    clearAnimations();
    const edges = [];
    for (let i = 0; i < path.length - 1; i++) {
        edges.push(`${path[i]}->${path[i + 1]}`);
    }

    path.forEach((val, i) => {
        const t = setTimeout(() => {
            highlightSet = new Set(path.slice(0, i + 1));
            activeEdges = new Set(edges.slice(0, i));
            displayTree();
        }, i * delay);
        animationTimers.push(t);
    });

    const t = setTimeout(() => {
        if (onComplete) onComplete();
    }, path.length * delay);
    animationTimers.push(t);
}

// ── History ─────────────────────────────────────

function addHistory(action, detail, type) {
    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    history.unshift({ action, detail, type, time });
    if (history.length > 50) history.pop();
    renderHistory();
}

function renderHistory() {
    const el = document.getElementById("historyList");
    if (history.length === 0) {
        el.innerHTML = '<div class="history-empty">No operations yet</div>';
        return;
    }
    el.innerHTML = history.map(h =>
        `<div class="history-item">
            <span class="h-icon ${h.type}"></span>
            <span class="h-text">${h.detail}</span>
            <span class="h-time">${h.time}</span>
        </div>`
    ).join('');
}

function clearHistory() {
    history = [];
    renderHistory();
}

// ── UI actions ──────────────────────────────────

function insertValue() {
    const input = document.getElementById("valueInput");
    const value = parseInt(input.value, 10);
    if (isNaN(value)) { showToast("Enter a valid number", "error"); return; }

    if (search(root, value)) {
        showToast(`${value} already exists`, "error");
        input.value = "";
        return;
    }

    // Get the path the value would follow BEFORE insertion
    const path = getInsertPath(root, value);

    savePositions();
    lastRotation = "None";
    root = insert(root, value);
    input.value = "";
    input.focus();

    // Animate traversal to the insertion point, then show the new node
    if (path.length > 0) {
        animatePathTraversal(path, 250, () => {
            highlightSet = new Set([value]);
            activeEdges = new Set();
            displayTree();
            addHistory("insert", `Inserted ${value}`, "insert");
            if (lastRotation !== "None") {
                showToast(lastRotation, "rotate");
                addHistory("rotate", lastRotation, "rotate");
            }
            const t2 = setTimeout(() => { clearAnimations(); displayTree(); }, 800);
            animationTimers.push(t2);
        });
    } else {
        highlightSet = new Set([value]);
        displayTree();
        addHistory("insert", `Inserted ${value}`, "insert");
        if (lastRotation !== "None") {
            showToast(lastRotation, "rotate");
            addHistory("rotate", lastRotation, "rotate");
        }
        const t2 = setTimeout(() => { clearAnimations(); displayTree(); }, 800);
        animationTimers.push(t2);
    }
}

function deleteValue() {
    const input = document.getElementById("valueInput");
    const value = parseInt(input.value, 10);
    if (isNaN(value)) { showToast("Enter a value to delete", "error"); return; }

    if (!search(root, value)) {
        showToast(`${value} not found`, "error");
        input.value = "";
        return;
    }

    // Show search path to target first
    const path = getSearchPath(root, value);
    input.value = "";
    input.focus();

    animatePathTraversal(path, 250, () => {
        savePositions();
        lastRotation = "None";
        root = deleteNode(root, value);
        clearAnimations();
        displayTree();
        showToast(`Deleted ${value}`, "info");
        addHistory("delete", `Deleted ${value}`, "delete");
        if (lastRotation !== "None") {
            showToast(lastRotation, "rotate");
            addHistory("rotate", lastRotation, "rotate");
        }
    });
}

function deleteNodeByClick(value) {
    if (!search(root, value)) return;
    const path = getSearchPath(root, value);

    animatePathTraversal(path, 200, () => {
        savePositions();
        lastRotation = "None";
        root = deleteNode(root, value);
        clearAnimations();
        displayTree();
        showToast(`Deleted ${value}`, "info");
        addHistory("delete", `Deleted ${value}`, "delete");
        if (lastRotation !== "None") {
            showToast(lastRotation, "rotate");
            addHistory("rotate", lastRotation, "rotate");
        }
    });
}

function searchValue() {
    const input = document.getElementById("valueInput");
    const value = parseInt(input.value, 10);
    if (isNaN(value)) { showToast("Enter a value to search", "error"); return; }

    const path = getSearchPath(root, value);
    const found = search(root, value);
    input.value = "";
    input.focus();

    // Animate step-by-step search
    animatePathTraversal(path, 350, () => {
        if (found) {
            showToast(`Found ${value}`, "success");
            addHistory("search", `Found ${value}`, "search");
        } else {
            showToast(`${value} not found`, "error");
            addHistory("search", `${value} not found`, "search");
        }
        // Hold final state a bit then clear
        const t = setTimeout(() => { clearAnimations(); displayTree(); }, 1500);
        animationTimers.push(t);
    });
}

function resetTree() {
    clearAnimations();
    root = null;
    previousPositions = {};
    lastRotation = "None";
    zoomLevel = 1;
    displayTree();
    document.getElementById("traversalResult").textContent = "";
    showToast("Tree reset", "info");
    addHistory("reset", "Tree reset", "reset");
}

function generateRandom() {
    clearAnimations();
    root = null;
    previousPositions = {};
    lastRotation = "None";

    const count = 7 + Math.floor(Math.random() * 8);
    const values = new Set();
    while (values.size < count) {
        values.add(Math.floor(Math.random() * 199) - 99);
    }

    for (const v of values) {
        root = insert(root, v);
    }

    displayTree();
    showToast(`Generated ${count} random nodes`, "success");
    addHistory("insert", `Random tree (${count} nodes)`, "insert");
}

function bulkInsertPrompt() {
    const input = prompt("Enter comma-separated values (e.g. 10, 20, 5, 15):");
    if (!input) return;

    const values = input.split(",")
        .map(s => parseInt(s.trim(), 10))
        .filter(v => !isNaN(v));

    if (values.length === 0) {
        showToast("No valid numbers found", "error");
        return;
    }

    clearAnimations();
    savePositions();
    let inserted = 0;
    for (const v of values) {
        if (!search(root, v)) {
            root = insert(root, v);
            inserted++;
        }
    }

    highlightSet = new Set(values);
    displayTree();
    showToast(`Inserted ${inserted} node${inserted !== 1 ? 's' : ''}`, "success");
    addHistory("insert", `Bulk insert: ${inserted} nodes`, "insert");

    const t = setTimeout(() => { clearAnimations(); displayTree(); }, 1500);
    animationTimers.push(t);
}

function highlightMin() {
    if (!root) { showToast("Tree is empty", "error"); return; }
    clearAnimations();
    // Walk to min with animation
    const path = [];
    let n = root;
    while (n) { path.push(n.value); if (!n.left) break; n = n.left; }

    animatePathTraversal(path, 300, () => {
        showToast(`Min: ${path[path.length - 1]}`, "success");
        const t = setTimeout(() => { clearAnimations(); displayTree(); }, 1500);
        animationTimers.push(t);
    });
}

function highlightMax() {
    if (!root) { showToast("Tree is empty", "error"); return; }
    clearAnimations();
    const path = [];
    let n = root;
    while (n) { path.push(n.value); if (!n.right) break; n = n.right; }

    animatePathTraversal(path, 300, () => {
        showToast(`Max: ${path[path.length - 1]}`, "success");
        const t = setTimeout(() => { clearAnimations(); displayTree(); }, 1500);
        animationTimers.push(t);
    });
}

// ── Zoom ────────────────────────────────────────

function zoomIn() {
    zoomLevel = Math.min(zoomLevel + 0.15, 2.5);
    displayTree();
}

function zoomOut() {
    zoomLevel = Math.max(zoomLevel - 0.15, 0.4);
    displayTree();
}

function zoomReset() {
    zoomLevel = 1;
    displayTree();
}

// ── Toast notifications ─────────────────────────

function showToast(msg, type) {
    const container = document.getElementById("toast-container");
    const t = document.createElement("div");
    t.className = `toast toast-${type}`;
    t.textContent = msg;
    container.appendChild(t);
    setTimeout(() => t.remove(), 2400);
}

// ── Keyboard shortcut ───────────────────────────

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("valueInput").addEventListener("keydown", e => {
        if (e.key === "Enter") {
            e.preventDefault();
            if (e.shiftKey) deleteValue();
            else if (e.ctrlKey || e.metaKey) searchValue();
            else insertValue();
        }
    });
});

// ── Tree layout computation ─────────────────────

const NODE_RADIUS = 22;
const LEVEL_HEIGHT = 80;
const X_SPACING = 55;
const PADDING_TOP = 45;
const PADDING_X = 40;

function computeLayout(node) {
    const positions = {};
    let index = 0;

    function inorderWalk(n, depth) {
        if (!n) return;
        inorderWalk(n.left, depth + 1);
        positions[n.value] = {
            x: PADDING_X + index * X_SPACING,
            y: PADDING_TOP + depth * LEVEL_HEIGHT,
            balance: getBalance(n),
            node: n
        };
        index++;
        inorderWalk(n.right, depth + 1);
    }

    inorderWalk(node, 0);
    return { positions, width: PADDING_X * 2 + Math.max(0, index - 1) * X_SPACING };
}

// ── Store old positions for animation ───────────

function savePositions() {
    if (!root) { previousPositions = {}; return; }
    const { positions } = computeLayout(root);
    previousPositions = {};
    for (const key in positions) {
        previousPositions[key] = { x: positions[key].x, y: positions[key].y };
    }
}

// ── SVG Rendering ───────────────────────────────

function displayTree() {
    const svg = document.getElementById("tree-svg");
    const container = document.getElementById("tree-container");
    const emptyState = document.getElementById("empty-state");

    // Stats
    document.getElementById("statNodes").textContent = countNodes(root);
    document.getElementById("statHeight").textContent = height(root);
    document.getElementById("statMin").textContent = root ? findMin(root) : "–";
    document.getElementById("statMax").textContent = root ? findMax(root) : "–";
    document.getElementById("rotationInfo").textContent = lastRotation;

    if (!root) {
        svg.innerHTML = "";
        svg.style.height = "0";
        emptyState.style.display = "flex";
        return;
    }

    emptyState.style.display = "none";
    const { positions, width } = computeLayout(root);

    const baseWidth = Math.max(width, container.clientWidth);
    const baseHeight = PADDING_TOP + height(root) * LEVEL_HEIGHT + 50;

    const svgWidth = baseWidth / zoomLevel;
    const svgHeight = baseHeight / zoomLevel;

    const offsetX = Math.max(0, (container.clientWidth / zoomLevel - width) / 2);

    svg.setAttribute("viewBox", `0 0 ${svgWidth} ${svgHeight}`);
    svg.style.height = baseHeight + "px";

    let edgesHtml = "";
    let nodesHtml = "";

    const defs = `<defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <linearGradient id="nodeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#60a5fa"/>
            <stop offset="100%" stop-color="#3b82f6"/>
        </linearGradient>
        <linearGradient id="nodeGradHighlight" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#a78bfa"/>
            <stop offset="100%" stop-color="#7c3aed"/>
        </linearGradient>
        <linearGradient id="nodeGradWarn" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#fbbf24"/>
            <stop offset="100%" stop-color="#f59e0b"/>
        </linearGradient>
        <linearGradient id="nodeGradFound" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#4ade80"/>
            <stop offset="100%" stop-color="#22c55e"/>
        </linearGradient>
        <marker id="arrowHead" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
            <path d="M0,0 L6,2 L0,4" fill="rgba(100,160,255,0.4)" />
        </marker>
        <marker id="arrowHeadHL" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
            <path d="M0,0 L6,2 L0,4" fill="rgba(167,139,250,0.8)" />
        </marker>
    </defs>`;

    function buildEdges(node) {
        if (!node) return;
        const p = positions[node.value];
        if (node.left && positions[node.left.value]) {
            const c = positions[node.left.value];
            edgesHtml += buildEdgeLine(p.x + offsetX, p.y, c.x + offsetX, c.y, node.value, node.left.value);
        }
        if (node.right && positions[node.right.value]) {
            const c = positions[node.right.value];
            edgesHtml += buildEdgeLine(p.x + offsetX, p.y, c.x + offsetX, c.y, node.value, node.right.value);
        }
        buildEdges(node.left);
        buildEdges(node.right);
    }

    function buildEdgeLine(x1, y1, x2, y2, fromVal, toVal) {
        // Straight line from bottom of parent to top of child
        const startY = y1 + NODE_RADIUS;
        const endY = y2 - NODE_RADIUS;

        const edgeKey = `${fromVal}->${toVal}`;
        const isHL = activeEdges.has(edgeKey);
        const strokeColor = isHL ? "rgba(167,139,250,0.7)" : "rgba(100,160,255,0.2)";
        const strokeW = isHL ? 3 : 1.8;
        const marker = isHL ? "url(#arrowHeadHL)" : "url(#arrowHead)";
        const glowFilter = isHL ? ' filter="url(#glow)"' : '';

        // Animate from old to new position
        let animLine = "";
        if (previousPositions[fromVal] && previousPositions[toVal]) {
            const ox1 = previousPositions[fromVal].x + offsetX;
            const oy1 = previousPositions[fromVal].y + NODE_RADIUS;
            const ox2 = previousPositions[toVal].x + offsetX;
            const oy2 = previousPositions[toVal].y - NODE_RADIUS;
            animLine = `
                <animate attributeName="x1" from="${ox1}" to="${x1}" dur="0.4s" fill="freeze" calcMode="spline" keySplines="0.4 0 0.2 1"/>
                <animate attributeName="y1" from="${oy1}" to="${startY}" dur="0.4s" fill="freeze" calcMode="spline" keySplines="0.4 0 0.2 1"/>
                <animate attributeName="x2" from="${ox2}" to="${x2}" dur="0.4s" fill="freeze" calcMode="spline" keySplines="0.4 0 0.2 1"/>
                <animate attributeName="y2" from="${oy2}" to="${endY}" dur="0.4s" fill="freeze" calcMode="spline" keySplines="0.4 0 0.2 1"/>`;
        } else {
            // New edge: draw-in effect
            animLine = `<animate attributeName="opacity" from="0" to="1" dur="0.35s" fill="freeze"/>`;
        }

        return `<line class="edge${isHL ? ' edge-highlight' : ''}" x1="${x1}" y1="${startY}" x2="${x2}" y2="${endY}" stroke="${strokeColor}" stroke-width="${strokeW}" marker-end="${marker}"${glowFilter}>${animLine}</line>`;
    }

    function buildNodes(node) {
        if (!node) return;
        const p = positions[node.value];
        const cx = p.x + offsetX;
        const cy = p.y;
        const isHL = highlightSet.has(node.value);
        const bal = p.balance;

        let grad;
        if (isHL) grad = "url(#nodeGradHighlight)";
        else if (Math.abs(bal) > 1) grad = "url(#nodeGradWarn)";
        else grad = "url(#nodeGrad)";

        let animateTransform = "";
        if (previousPositions[node.value]) {
            const ox = previousPositions[node.value].x + offsetX;
            const oy = previousPositions[node.value].y;
            if (Math.abs(ox - cx) > 1 || Math.abs(oy - cy) > 1) {
                animateTransform = `<animateTransform attributeName="transform" type="translate" from="${ox - cx} ${oy - cy}" to="0 0" dur="0.4s" fill="freeze" calcMode="spline" keySplines="0.4 0 0.2 1"/>`;
            }
        }

        const extraClass = isHL ? " search-hit" : "";
        const shadow = `<circle cx="${cx}" cy="${cy + 3}" r="${NODE_RADIUS}" fill="rgba(0,0,0,0.15)"/>`;

        // Ripple ring for highlighted nodes
        const ripple = isHL ? `<circle cx="${cx}" cy="${cy}" r="${NODE_RADIUS}" fill="none" stroke="rgba(167,139,250,0.5)" stroke-width="2"><animate attributeName="r" from="${NODE_RADIUS}" to="38" dur="0.8s" fill="freeze"/><animate attributeName="opacity" from="0.6" to="0" dur="0.8s" fill="freeze"/></circle>` : '';

        const safeValue = parseInt(node.value, 10);
        nodesHtml += `
            <g class="node-group${extraClass}" onclick="deleteNodeByClick(${safeValue})">
                ${ripple}
                ${shadow}
                <circle class="node-circle" cx="${cx}" cy="${cy}" r="${NODE_RADIUS}" fill="${grad}" stroke="rgba(255,255,255,0.1)" stroke-width="1.5"/>
                <text class="node-text" x="${cx}" y="${cy}">${node.value}</text>
                <text class="node-balance" x="${cx}" y="${cy - NODE_RADIUS - 7}">bf:${bal}</text>
                ${animateTransform}
            </g>`;

        buildNodes(node.left);
        buildNodes(node.right);
    }

    buildEdges(root);
    buildNodes(root);

    svg.innerHTML = defs + edgesHtml + nodesHtml;
}

// ── Traversals ──────────────────────────────────

function inorder(node, result) {
    if (!node) return;
    inorder(node.left, result);
    result.push(node.value);
    inorder(node.right, result);
}

function preorder(node, result) {
    if (!node) return;
    result.push(node.value);
    preorder(node.left, result);
    preorder(node.right, result);
}

function postorder(node, result) {
    if (!node) return;
    postorder(node.left, result);
    postorder(node.right, result);
    result.push(node.value);
}

function levelorder(node, result) {
    if (!node) return;
    const queue = [node];
    while (queue.length > 0) {
        const current = queue.shift();
        result.push(current.value);
        if (current.left) queue.push(current.left);
        if (current.right) queue.push(current.right);
    }
}

function showTraversal(type) {
    clearAnimations();
    const result = [];
    if (type === "inorder") inorder(root, result);
    else if (type === "preorder") preorder(root, result);
    else if (type === "postorder") postorder(root, result);
    else levelorder(root, result);

    // Highlight active button
    document.querySelectorAll(".traversal-btns .btn-sm").forEach(b => b.classList.remove("active"));
    const labels = { inorder: "In-Order", preorder: "Pre-Order", postorder: "Post-Order", levelorder: "Level" };
    document.querySelectorAll(".traversal-btns .btn-sm").forEach(b => {
        if (b.textContent.trim() === labels[type]) b.classList.add("active");
    });

    const el = document.getElementById("traversalResult");
    if (result.length === 0) {
        el.textContent = "(empty)";
        return;
    }

    // Animate: highlight one node at a time, build text
    el.textContent = "";
    const STEP = 300;

    result.forEach((v, i) => {
        const t = setTimeout(() => {
            highlightSet = new Set([v]);
            activeEdges = new Set();
            displayTree();
            el.textContent += (i > 0 ? " → " : "") + v;
        }, i * STEP);
        animationTimers.push(t);
    });

    const t = setTimeout(() => {
        clearAnimations();
        displayTree();
    }, result.length * STEP + 800);
    animationTimers.push(t);
}

// ── Initial render ──────────────────────────────
displayTree();
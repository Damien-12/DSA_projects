// ───────────────────────────────────────────────
//  AVL Tree Visualizer – Full rewrite with SVG
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
let previousPositions = {};  // for smooth transitions

// ── AVL helpers ──────────────────────────────────

function height(n) { return n ? n.height : 0; }
function getBalance(n) { return n ? height(n.left) - height(n.right) : 0; }
function countNodes(n) { return n ? 1 + countNodes(n.left) + countNodes(n.right) : 0; }

function updateHeight(n) {
    if (n) n.height = 1 + Math.max(height(n.left), height(n.right));
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
        return node; // no duplicates
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

// ── Search helper (checks if value exists) ──────

function search(node, value) {
    if (!node) return false;
    if (value === node.value) return true;
    return value < node.value ? search(node.left, value) : search(node.right, value);
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

    savePositions();
    lastRotation = "None";
    root = insert(root, value);
    input.value = "";
    input.focus();
    displayTree(value);

    if (lastRotation !== "None") showToast(lastRotation, "rotate");
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

    savePositions();
    lastRotation = "None";
    root = deleteNode(root, value);
    input.value = "";
    input.focus();
    displayTree(-1);

    showToast(`Deleted ${value}`, "info");
    if (lastRotation !== "None") showToast(lastRotation, "rotate");
}

function resetTree() {
    root = null;
    previousPositions = {};
    lastRotation = "None";
    displayTree(-1);
    document.getElementById("traversalResult").textContent = "";
    showToast("Tree reset", "info");
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
            e.shiftKey ? deleteValue() : insertValue();
        }
    });
});

// ── Tree layout computation ─────────────────────
// Uses inorder index for x-spread, depth for y.

const NODE_RADIUS = 22;
const LEVEL_HEIGHT = 75;
const X_SPACING = 52;
const PADDING_TOP = 50;
const PADDING_X = 40;

function computeLayout(node) {
    const positions = {};
    let index = 0;

    function inorder(n, depth) {
        if (!n) return;
        inorder(n.left, depth + 1);
        positions[n.value] = {
            x: PADDING_X + index * X_SPACING,
            y: PADDING_TOP + depth * LEVEL_HEIGHT,
            balance: getBalance(n),
            node: n
        };
        index++;
        inorder(n.right, depth + 1);
    }

    inorder(node, 0);
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

function displayTree(highlightValue) {
    const svg = document.getElementById("tree-svg");
    const container = document.getElementById("tree-container");
    const emptyState = document.getElementById("empty-state");

    // Stats
    document.getElementById("statNodes").textContent = countNodes(root);
    document.getElementById("statHeight").textContent = height(root);
    document.getElementById("rotationInfo").textContent = lastRotation;

    if (!root) {
        svg.innerHTML = "";
        svg.style.height = "0";
        emptyState.style.display = "flex";
        return;
    }

    emptyState.style.display = "none";
    const { positions, width } = computeLayout(root);

    const svgWidth = Math.max(width, container.clientWidth);
    const svgHeight = PADDING_TOP + height(root) * LEVEL_HEIGHT + 40;

    // Center tree if narrower than container
    const offsetX = Math.max(0, (container.clientWidth - width) / 2);

    svg.setAttribute("viewBox", `0 0 ${svgWidth} ${svgHeight}`);
    svg.style.height = svgHeight + "px";

    // Build SVG content
    let edgesHtml = "";
    let nodesHtml = "";

    // Defs: glow filter + gradient
    let defs = `<defs>
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
    </defs>`;

    function buildEdges(node) {
        if (!node) return;
        const p = positions[node.value];
        if (node.left && positions[node.left.value]) {
            const c = positions[node.left.value];
            edgesHtml += buildEdgePath(p.x + offsetX, p.y, c.x + offsetX, c.y, node.value, node.left.value);
        }
        if (node.right && positions[node.right.value]) {
            const c = positions[node.right.value];
            edgesHtml += buildEdgePath(p.x + offsetX, p.y, c.x + offsetX, c.y, node.value, node.right.value);
        }
        buildEdges(node.left);
        buildEdges(node.right);
    }

    function buildEdgePath(x1, y1, x2, y2, fromVal, toVal) {
        // Curved edge
        const midY = (y1 + y2) / 2;
        const d = `M ${x1} ${y1 + NODE_RADIUS} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2 - NODE_RADIUS}`;

        // Animation: old → new
        let animateD = "";
        if (previousPositions[fromVal] && previousPositions[toVal]) {
            const ox1 = previousPositions[fromVal].x + offsetX;
            const oy1 = previousPositions[fromVal].y;
            const ox2 = previousPositions[toVal].x + offsetX;
            const oy2 = previousPositions[toVal].y;
            const omid = (oy1 + oy2) / 2;
            const oldD = `M ${ox1} ${oy1 + NODE_RADIUS} C ${ox1} ${omid}, ${ox2} ${omid}, ${ox2} ${oy2 - NODE_RADIUS}`;
            animateD = `<animate attributeName="d" from="${oldD}" to="${d}" dur="0.45s" fill="freeze" calcMode="spline" keySplines="0.4 0 0.2 1"/>`;
        } else {
            animateD = `<animate attributeName="opacity" from="0" to="1" dur="0.4s" fill="freeze"/>`;
        }

        return `<path class="edge" d="${d}">${animateD}</path>`;
    }

    function buildNodes(node) {
        if (!node) return;
        const p = positions[node.value];
        const cx = p.x + offsetX;
        const cy = p.y;
        const isNew = highlightValue === node.value;
        const bal = p.balance;
        const grad = isNew ? "url(#nodeGradHighlight)" : (Math.abs(bal) > 1 ? "url(#nodeGradWarn)" : "url(#nodeGrad)");

        // Animate position from old to new
        let animateX = "", animateY = "";
        if (previousPositions[node.value]) {
            const ox = previousPositions[node.value].x + offsetX;
            const oy = previousPositions[node.value].y;
            if (Math.abs(ox - cx) > 1 || Math.abs(oy - cy) > 1) {
                animateX = `<animateTransform attributeName="transform" type="translate" from="${ox - cx} ${oy - cy}" to="0 0" dur="0.45s" fill="freeze" calcMode="spline" keySplines="0.4 0 0.2 1"/>`;
            }
        }

        const appearAnim = isNew
            ? `style="animation: nodeAppear 0.4s ease both; transform-origin: ${cx}px ${cy}px;"`
            : "";

        // Drop shadow
        const shadow = `<circle cx="${cx}" cy="${cy + 3}" r="${NODE_RADIUS}" fill="rgba(0,0,0,0.25)" filter="url(#glow)"/>`;

        nodesHtml += `
            <g class="node-group" ${appearAnim}>
                ${shadow}
                <circle class="node-circle" cx="${cx}" cy="${cy}" r="${NODE_RADIUS}" fill="${grad}" stroke="rgba(255,255,255,0.15)" stroke-width="1.5"/>
                <text class="node-text" x="${cx}" y="${cy}">${node.value}</text>
                <text class="node-balance" x="${cx}" y="${cy - NODE_RADIUS - 8}">bf: ${bal}</text>
                ${animateX}
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

function showTraversal(type) {
    const result = [];
    if (type === "inorder") inorder(root, result);
    else if (type === "preorder") preorder(root, result);
    else postorder(root, result);

    const el = document.getElementById("traversalResult");
    if (result.length === 0) {
        el.textContent = "(empty)";
        return;
    }

    // Animate values appearing one by one
    el.textContent = "";
    result.forEach((v, i) => {
        setTimeout(() => {
            el.textContent += (i > 0 ? "  →  " : "") + v;
        }, i * 120);
    });
}

// initial render
displayTree(-1);
const editor = document.getElementById('bf-editor');
const runBtn = document.getElementById('run-btn');
const resetBtn = document.getElementById('reset-btn');
const outputArea = document.getElementById('bf-output');
const inputField = document.getElementById('bf-input');
const screenInput = document.getElementById('screen-input');
const memoryView = document.getElementById('memory-view');
const screen = document.getElementById('screen');
const ctx = screen.getContext('2d');
const colorScreenToggle = document.getElementById('color-screen-toggle');
const colorLegendGrid = document.getElementById('color-legend-grid');
const gameModeToggle = document.getElementById('game-mode-toggle');
const outputSection = document.getElementById('output-section');
const gameScreenSection = document.getElementById('game-screen-section');

const memorySize = 0.25 * 1024 * 1024; // 0.25 MB of memory
let memory = new Uint8Array(memorySize);
let pointer = 0;
let output = '';
let input = '';
let isRunning = false;
let stopRequested = false;

function resetState() {
    memory = new Uint8Array(memorySize);
    pointer = 0;
    output = '';
    input = '';
    outputArea.value = '';
    inputField.value = '';
    renderMemory();
    renderScreen();
}

function renderMemory() {
    let html = '';
    for (let i = 0; i < memorySize; i++) {
        if (i >= 2048) break; // Show first 2048 cells for performance
        if (i % 16 === 0) {
            html += `<span class="memaddr">${i.toString(16).padStart(4, '0').toUpperCase()}:</span> `;
        }
        html += `<span class="memcell${i === pointer ? ' active' : ''}">${memory[i]}</span>`;
        if ((i + 1) % 16 === 0) html += '<br>';
    }
    memoryView.innerHTML = html;
}

function getColorForValue(val) {
    const hue = (val % 16) * 22.5;
    const brightness = 5 + Math.floor(val / 16) * 6;
    return `hsl(${hue}, 100%, ${brightness}%)`;
}

function renderScreen() {
    ctx.clearRect(0, 0, 320, 320);
    for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
            let val = memory[y * 16 + x];
            if (colorScreenToggle && colorScreenToggle.checked) {
                ctx.fillStyle = getColorForValue(val);
            } else {
                ctx.fillStyle = `rgb(${val},${val},${val})`;
            }
            ctx.fillRect(x * 20, y * 20, 20, 20);
        }
    }
}

function highlightSyntax(code, activeIndex = -1) {
    let result = '';
    let bfIndex = 0;
    for (let i = 0; i < code.length; i++) {
        const ch = code[i];
        if (/[\+\-\[\]<>.,]/.test(ch)) {
            if (bfIndex === activeIndex) {
                result += `<span class="bf-cmd bf-cmd-active">${ch}</span>`;
            } else {
                result += `<span class="bf-cmd">${ch}</span>`;
            }
            bfIndex++;
        } else {
            result += ch;
        }
    }
    return result;
}

function updateEditorHighlighting() {
    const selection = window.getSelection();
    let caretOffset = 0;
    if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const preCaretRange = range.cloneRange();
        preCaretRange.selectNodeContents(editor);
        preCaretRange.setEnd(range.endContainer, range.endOffset);
        caretOffset = preCaretRange.toString().length;
    }
    const text = editor.innerText;
    editor.innerHTML = highlightSyntax(text);
    setCaretPosition(editor, caretOffset);
}

function setCaretPosition(el, offset) {
    el.focus();
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
    let currentNode = null;
    let currentOffset = 0;
    while (walker.nextNode()) {
        const node = walker.currentNode;
        if (currentOffset + node.length >= offset) {
            currentNode = node;
            break;
        }
        currentOffset += node.length;
    }
    if (currentNode) {
        const sel = window.getSelection();
        const range = document.createRange();
        range.setStart(currentNode, offset - currentOffset);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
    }
}

function placeCaretAtEnd(el) {
    el.focus();
    if (typeof window.getSelection != "undefined"
        && typeof document.createRange != "undefined") {
        let range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        let sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    }
}

function setEditorHighlightAt(bfIndex) {
    const text = editor.innerText;
    editor.innerHTML = highlightSyntax(text, bfIndex);
}

function updateGameModeUI() {
    if (gameModeToggle && gameModeToggle.checked) {
        outputSection.style.display = 'none';
        gameScreenSection.style.display = '';
    } else {
        outputSection.style.display = '';
        gameScreenSection.style.display = 'none';
    }
}

async function runBrainfuck(code, gameMode = false) {
    let mem = new Uint8Array(memorySize);
    mem.set(memory);
    let ptr = pointer;
    let out = '';
    let pc = 0;
    let stack = [];
    let codeArr = code.replace(/[^\+\-\[\]<>.,]/g, '').split('');
    isRunning = true;
    stopRequested = false;
    runBtn.textContent = 'Stop';
    runBtn.classList.add('stop');

    const UI_UPDATE_INTERVAL = 256;
    let steps = 0;

    function updateUI() {
        memory = mem;
        pointer = ptr;
        if (gameMode) {
            renderMemory();
            renderScreen();
        } else {
            output = out;
            outputArea.value = output;
            outputArea.scrollTop = outputArea.scrollHeight;
            renderMemory();
        }
    }

    while (pc < codeArr.length && !stopRequested) {
        if (!gameMode && steps % UI_UPDATE_INTERVAL === 0) {
            setEditorHighlightAt(pc);
            updateUI();
            await new Promise(requestAnimationFrame);
        }
        let cmd = codeArr[pc];
        switch (cmd) {
            case '>': ptr = (ptr + 1) % memorySize; break;
            case '<': ptr = (ptr - 1 + memorySize) % memorySize; break;
            case '+': mem[ptr] = (mem[ptr] + 1) % 256; break;
            case '-': mem[ptr] = (mem[ptr] - 1 + 256) % 256; break;
            case '.':
                if (gameMode) {
                    updateUI();
                    await new Promise(requestAnimationFrame);
                } else {
                    out += String.fromCharCode(mem[ptr]);
                }
                break;
            case ',':
                if (gameMode) {
                    if (screenInput.value.length > 0) {
                        mem[ptr] = screenInput.value.charCodeAt(0);
                        screenInput.value = screenInput.value.slice(1);
                    } else {
                        mem[ptr] = 0;
                    }
                } else {
                    if (inputField.value.length > 0) {
                        mem[ptr] = inputField.value.charCodeAt(0);
                        inputField.value = inputField.value.slice(1);
                    } else {
                        mem[ptr] = 0;
                    }
                }
                break;
            case '[':
                if (mem[ptr] === 0) {
                    let open = 1;
                    while (open > 0) {
                        pc++;
                        if (codeArr[pc] === '[') open++;
                        if (codeArr[pc] === ']') open--;
                    }
                } else {
                    stack.push(pc);
                }
                break;
            case ']':
                if (mem[ptr] !== 0) {
                    pc = stack[stack.length - 1];
                } else {
                    stack.pop();
                }
                break;
        }
        pc++;
        steps++;
    }

    setEditorHighlightAt(-1);
    updateEditorHighlighting();
    updateUI();
    isRunning = false;
    runBtn.textContent = 'Run';
    runBtn.classList.remove('stop');
}

function setUp() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
            this.classList.add('active');
            document.getElementById(this.dataset.tab).classList.add('active');
        });
    });

    editor.addEventListener('input', updateEditorHighlighting);
    editor.addEventListener('paste', e => {
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData).getData('text');
        document.execCommand('insertText', false, text);
    });

    gameModeToggle.addEventListener('change', updateGameModeUI);
    updateGameModeUI();

    runBtn.addEventListener('click', () => {
        if (isRunning) {
            stopRequested = true;
            runBtn.textContent = 'Run';
            runBtn.classList.remove('stop');
            return;
        }
        resetState();
        const code = editor.innerText;
        runBrainfuck(code, gameModeToggle.checked);
    });

    resetBtn.addEventListener('click', () => {
        resetState();
    });

    resetState();
    editor.innerHTML = '';
    updateEditorHighlighting();

    for (let i = 0; i < 256; i++) {
        const sw = document.createElement('span');
        const color = getColorForValue(i);
        sw.style.display = 'inline-block';
        sw.style.width = '18px';
        sw.style.height = '18px';
        sw.style.background = color;
        sw.title = `${i}: ${color}`;
        sw.style.border = '1px solid #181818';
        colorLegendGrid.appendChild(sw);
    }
}

setUp();
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

function resetState(resetInputs = true) {
    memory = new Uint8Array(memorySize);
    pointer = 0;
    output = '';
    input = '';
    outputArea.value = '';
    if (resetInputs) {
        inputField.value = '';
        screenInput.value = '';
    }
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

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Add this helper (anywhere above highlightSyntax)
function escapeHtml(s) {
  return s.replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
}

// Replace your highlightSyntax with this safe version
function highlightSyntax(code, activeIndex = -1) {
  let result = '';
  let bfIndex = 0;

  for (let i = 0; i < code.length; i++) {
    const ch = code[i];
    const isCmd = /[+\-\[\]<>.,]/.test(ch);
    const esc = escapeHtml(ch);

    if (isCmd) {
      const cls = (bfIndex === activeIndex) ? 'bf-cmd bf-cmd-active' : 'bf-cmd';
      result += `<span class="${cls}">${esc}</span>`;
      bfIndex++;
    } else {
      result += esc;
    }
  }
  return result;
}

let lastHighlightedContent = '';
let highlightOverlay = null;

function createHighlightOverlay() {
    if (!highlightOverlay) {
        const container = editor.parentNode;
        
        highlightOverlay = document.createElement('div');
        highlightOverlay.className = 'highlight-overlay';
        
        highlightOverlay.style.position = 'absolute';
        highlightOverlay.style.top = '0';
        highlightOverlay.style.left = '0';
        highlightOverlay.style.right = '0';
        highlightOverlay.style.bottom = '0';
        highlightOverlay.style.pointerEvents = 'none';
        highlightOverlay.style.whiteSpace = 'pre';
        highlightOverlay.style.overflow = 'hidden';
        highlightOverlay.style.zIndex = '1';
        highlightOverlay.style.color = '#666';
        
        const computedStyle = window.getComputedStyle(editor);
        highlightOverlay.style.fontFamily = computedStyle.fontFamily;
        highlightOverlay.style.fontSize = computedStyle.fontSize;
        highlightOverlay.style.lineHeight = computedStyle.lineHeight;
        highlightOverlay.style.padding = computedStyle.padding;
        highlightOverlay.style.border = computedStyle.border;
        highlightOverlay.style.borderColor = 'transparent';
        highlightOverlay.style.borderRadius = computedStyle.borderRadius;
        highlightOverlay.style.margin = computedStyle.margin;
        highlightOverlay.style.boxSizing = computedStyle.boxSizing;
        
        container.style.position = 'relative';
        container.appendChild(highlightOverlay);
        
        editor.style.position = 'relative';
        editor.style.zIndex = '2';
        editor.style.background = 'transparent';
        editor.style.color = 'rgba(230, 230, 230, 0.1)';
        editor.style.caretColor = '#e6e6e6';
        
        const syncScroll = () => {
            highlightOverlay.scrollTop = editor.scrollTop;
            highlightOverlay.scrollLeft = editor.scrollLeft;
        };
        
        editor.addEventListener('scroll', syncScroll);
        
        setTimeout(syncScroll, 0);
    }
}

function updateEditorHighlighting() {
    const text = editor.value || '';
    
    if (text === lastHighlightedContent) {
        return;
    }
    
    lastHighlightedContent = text;
    
    if (!highlightOverlay) {
        createHighlightOverlay();
    }
    
    if (text.length > 10000) {
        highlightOverlay.innerHTML = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return;
    }
    
    highlightOverlay.innerHTML = highlightSyntax(text);
}

function placeCaretAtEnd(el) {
    el.focus();
    if (el.setSelectionRange) {
        const len = el.value.length;
        el.setSelectionRange(len, len);
    } else if (typeof window.getSelection != "undefined" && typeof document.createRange != "undefined") {
        let range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        let sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    }
}

function setEditorHighlightAt(bfIndex) {
    if (!highlightOverlay) {
        createHighlightOverlay();
    }
    const text = editor.value || '';
    highlightOverlay.innerHTML = highlightSyntax(text, bfIndex);
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

function highlightBfCodeElements() {
    document.querySelectorAll('.bf-code').forEach(pre => {
        const originalCode = pre.textContent || pre.innerText;
        pre.innerHTML = highlightSyntax(originalCode);
    });
}

function setupExampleClickHandlers() {
    document.querySelectorAll('.example pre.bf-code').forEach(pre => {
        const code = pre.textContent || pre.innerText;
        if (!code.includes('(Not yet solved')) {
            pre.style.cursor = 'pointer';
            pre.title = 'Click to load this example into the editor';
            
            pre.addEventListener('click', () => {
                editor.value = code;
                updateEditorHighlighting();
                
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
                document.querySelector('[data-tab="code-tab"]').classList.add('active');
                document.getElementById('code-tab').classList.add('active');
                
                editor.focus();
                placeCaretAtEnd(editor);
            });
        }
    });
}

function setupRevealCodeButtons() {
    document.querySelectorAll('.reveal-code-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const example = this.closest('.example');
            const codeBlock = example.querySelector('.bf-code');
            
            codeBlock.style.display = 'block';
            this.style.display = 'none';
            
            const originalCode = codeBlock.textContent || codeBlock.innerText;
            codeBlock.innerHTML = highlightSyntax(originalCode);
            
            if (!originalCode.includes('(Not yet solved')) {
                codeBlock.style.cursor = 'pointer';
                codeBlock.title = 'Click to load this example into the editor';
                
                codeBlock.addEventListener('click', () => {
                    editor.value = originalCode;
                    updateEditorHighlighting();
                    
                    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
                    document.querySelector('[data-tab="code-tab"]').classList.add('active');
                    document.getElementById('code-tab').classList.add('active');
                    
                    editor.focus();
                    placeCaretAtEnd(editor);
                });
            }
        });
    });
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

    const debouncedHighlighting = debounce(updateEditorHighlighting, 50);
    
    editor.addEventListener('input', debouncedHighlighting);
    
    editor.addEventListener('paste', () => {
        setTimeout(debouncedHighlighting, 0);
    });

    editor.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            if (!isRunning) {
                resetState();
                const code = editor.value || '';
                runBrainfuck(code, gameModeToggle.checked);
            }
        }
        
        if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
            e.preventDefault();
            resetState();
        }
        
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = editor.selectionStart;
            const end = editor.selectionEnd;
            
            if (e.shiftKey) {
                const beforeTab = editor.value.lastIndexOf('\t', start - 1);
                if (beforeTab !== -1 && beforeTab === start - 1) {
                    editor.value = editor.value.substring(0, start - 1) + editor.value.substring(end);
                    editor.selectionStart = editor.selectionEnd = start - 1;
                }
            } else {
                editor.value = editor.value.substring(0, start) + '\t' + editor.value.substring(end);
                editor.selectionStart = editor.selectionEnd = start + 1;
            }
            
            updateEditorHighlighting();
        }
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
        resetState(false);
        const code = editor.value || '';
        runBrainfuck(code, gameModeToggle.checked);
    });

    resetBtn.addEventListener('click', () => {
        resetState();
    });

    resetState();
    
    editor.value = '';
    
    setTimeout(() => {
        updateEditorHighlighting();
    }, 100);

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

    // Apply syntax highlighting to all pre.bf-code elements
    highlightBfCodeElements();
    
    // Setup click handlers for examples
    setupExampleClickHandlers();
    
    // Setup reveal code buttons
    setupRevealCodeButtons();
}

setUp();

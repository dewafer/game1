// 配置常量
const CONFIG = {
    SCROLL_LENGTH: 40,          // 显示窗口长度
    SEARCH_DEPTH: 3,           // 查找正文的最小深度
    PROXY_URL: 'http://127.0.0.1:8080/proxy'
};

// DOM元素集中管理
const DOM = {
    targetTextDiv: document.getElementById('targetText'),
    inputArea: document.getElementById('inputArea'),
    inputDisplay: document.getElementById('inputDisplay'),
    errorRateSpan: document.getElementById('errorRate'),
    charSpeedSpan: document.getElementById('charSpeed'),
    wordSpeedSpan: document.getElementById('wordSpeed'),
    freqTableDiv: document.getElementById('freqTable'),
    urlInput: document.getElementById('urlInput'),
    fetchBtn: document.getElementById('fetchBtn'),
    skipBtn: document.getElementById('skipBtn'),
    fileInput: document.getElementById('fileInput'),
    loadFileBtn: document.getElementById('loadFileBtn')
};

// 游戏状态
let gameState = {
    targetText: DOM.targetTextDiv.textContent,
    startTime: null
};

function skipCurrentWindow() {
    const userInput = DOM.inputArea.value;
    let start = userInput.length;
    let end = start + CONFIG.SCROLL_LENGTH;
    let skipText = gameState.targetText.slice(start, end);
    DOM.inputArea.value = userInput + skipText;
    updateVisibleText();
    updateInputDisplay();
}

function resetGameStats() {
    DOM.errorRateSpan.textContent = '0%';
    DOM.charSpeedSpan.textContent = '0 字符/分钟';
    DOM.wordSpeedSpan.textContent = '0 单词/分钟';
    gameState.startTime = null;
    DOM.freqTableDiv.innerHTML = renderFreqTable({});
    updateInputDisplay();
}

function updateVisibleText() {
    let userInput = DOM.inputArea.value;
    let inputLen = userInput.length;
    let start = Math.max(0, inputLen - CONFIG.SCROLL_LENGTH);
    let end = inputLen + CONFIG.SCROLL_LENGTH;
    let display = '';
    
    // 已输入部分
    for (let i = start; i < inputLen; i++) {
        if (i < gameState.targetText.length) {
            if (userInput[i] === undefined) {
                display += `<span style='color:#bbb;'> </span>`;
            } else if (userInput[i] === gameState.targetText[i]) {
                display += `<span style='color:#bbb;'>${gameState.targetText[i]}</span>`;
            } else {
                display += `<span style='color:red;'>${gameState.targetText[i]}</span>`;
            }
        }
    }
    
    // 光标
    display += '<span style="color:#2196f3;font-weight:bold;">|</span>';
    
    // 未输入部分
    for (let i = inputLen; i < end; i++) {
        if (i < gameState.targetText.length) {
            display += gameState.targetText[i];
        }
    }
    
    DOM.targetTextDiv.innerHTML = display;
}

function updateInputDisplay() {
    let userInput = DOM.inputArea.value;
    let inputLen = userInput.length;
    let start = Math.max(0, inputLen - CONFIG.SCROLL_LENGTH);
    let end = Math.min(inputLen, start + CONFIG.SCROLL_LENGTH);
    let display = '';
    
    // 已输入部分（滚动显示）
    for (let i = start; i < end; i++) {
        if (i < gameState.targetText.length) {
            if (userInput[i] === gameState.targetText[i]) {
                display += `<span style='color:#4caf50; background:#e8f5e8;'>${userInput[i]}</span>`;
            } else {
                display += `<span style='color:#f44336; background:#ffebee;'>${userInput[i]}</span>`;
            }
        } else {
            display += `<span style='color:#666;'>${userInput[i]}</span>`;
        }
    }
    
    // 添加光标
    display += '<span style="color:#2196f3;font-weight:bold;">|</span>';
    
    // 如果没有内容，显示提示
    if (inputLen === 0) {
        display = '<span style="color:#999;">开始输入...</span>';
    }
    
    DOM.inputDisplay.innerHTML = display;
}

function calculateTypingStats(userInput) {
    // 计算错误率
    let errors = 0;
    let total = userInput.length;
    for (let i = 0; i < userInput.length; i++) {
        if (userInput[i] !== gameState.targetText[i]) errors++;
    }
    const errorRate = total === 0 ? 0 : (errors / total * 100).toFixed(2);
    
    // 计算速度
    if (!gameState.startTime && total > 0) {
        gameState.startTime = Date.now();
    }
    let elapsedMin = ((Date.now() - gameState.startTime) / 60000);
    let charSpeed = elapsedMin > 0 ? (total / elapsedMin).toFixed(2) : '0';
    let wordCount = userInput.trim().split(/\s+/).filter(Boolean).length;
    let wordSpeed = elapsedMin > 0 ? (wordCount / elapsedMin).toFixed(2) : '0';
    
    return { errorRate, charSpeed, wordSpeed };
}

function updateStatsDisplay(userInput) {
    const stats = calculateTypingStats(userInput);
    
    DOM.errorRateSpan.textContent = stats.errorRate + '%';
    DOM.charSpeedSpan.textContent = stats.charSpeed + ' 字符/分钟';
    DOM.wordSpeedSpan.textContent = stats.wordSpeed + ' 单词/分钟';
    
    // 字频统计
    const freq = getCharFrequency(userInput);
    DOM.freqTableDiv.innerHTML = renderFreqTable(freq);
}

function getCharFrequency(str) {
    const freq = {};
    for (const ch of str) {
        if (ch === ' ' || ch === '\n') continue;
        freq[ch] = (freq[ch] || 0) + 1;
    }
    return freq;
}

function renderFreqTable(freq) {
    let html = '<table><tr><th>字符</th><th>频率</th></tr>';
    for (const ch in freq) {
        html += `<tr><td>${ch}</td><td>${freq[ch]}</td></tr>`;
    }
    html += '</table>';
    return html;
}

function handleInput() {
    const userInput = DOM.inputArea.value;
    updateStatsDisplay(userInput);
    updateVisibleText();
    updateInputDisplay();
}

function collectNodesAtDepth(node, depth) {
    const candidates = [];
    
    function collect(currentNode, currentDepth) {
        if (currentDepth === 0) {
            candidates.push(currentNode);
        } else {
            for (let child of currentNode.children) {
                collect(child, currentDepth - 1);
            }
        }
    }
    
    collect(node, depth);
    return candidates;
}

function findBestContentNode(body) {
    let candidates = [];
    
    // 尝试从指定深度开始查找
    candidates = collectNodesAtDepth(body, CONFIG.SEARCH_DEPTH);
    
    // 如果没有足够深度的节点，则回退到更浅层
    let fallbackDepth = CONFIG.SEARCH_DEPTH - 1;
    while (candidates.length === 0 && fallbackDepth >= 0) {
        candidates = collectNodesAtDepth(body, fallbackDepth);
        fallbackDepth--;
    }
    
    // 找到文本最多的节点
    let maxText = '';
    let maxNode = null;
    for (let node of candidates) {
        let allText = node.innerText ? node.innerText.replace(/\s+/g, ' ').trim() : '';
        if (allText.length > maxText.length) {
            maxText = allText;
            maxNode = node;
        }
    }
    
    return maxText;
}

async function fetchWebContent(url) {
    const proxyUrl = `${CONFIG.PROXY_URL}?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxyUrl);
    const html = await res.text();
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const body = doc.body;
    
    if (!body) {
        throw new Error('无法解析网页内容');
    }
    
    const content = findBestContentNode(body);
    if (!content) {
        throw new Error('未找到合适正文');
    }
    
    return content;
}

async function handleFetch() {
    DOM.inputArea.value = '';
    const url = DOM.urlInput.value.trim();
    
    if (!url) {
        alert('请输入网页地址');
        return;
    }
    
    DOM.targetTextDiv.textContent = '正在抓取网页正文...';
    
    try {
        const content = await fetchWebContent(url);
        gameState.targetText = content;
        DOM.inputArea.value = '';
        updateVisibleText();
        resetGameStats();
    } catch (e) {
        DOM.targetTextDiv.textContent = '抓取失败: ' + e.message;
        gameState.targetText = '';
    }
}

function handleFileLoad() {
    // 清除之前的文件选择
    DOM.fileInput.value = '';
    // 触发文件选择对话框
    DOM.fileInput.click();
}

function handleFileChange(event) {
    const file = event.target.files[0];
    if (!file) {
        return;
    }
    
    if (!file.name.toLowerCase().endsWith('.txt')) {
        alert('请选择.txt文件');
        return;
    }
    
    DOM.targetTextDiv.textContent = '正在读取文件内容...';
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            let content = e.target.result;
            // 清理和格式化文本内容
            content = content.replace(/\r\n/g, '\n') // 统一换行符
                           .replace(/\r/g, '\n')
                           .replace(/\s+/g, ' ')    // 合并多个空格
                           .trim();
            
            if (content.length === 0) {
                DOM.targetTextDiv.textContent = '文件内容为空';
                gameState.targetText = '';
                return;
            }
            
            gameState.targetText = content;
            DOM.inputArea.value = '';
            updateVisibleText();
            resetGameStats();
            
        } catch (error) {
            DOM.targetTextDiv.textContent = '文件读取失败: ' + error.message;
            gameState.targetText = '';
        }
    };
    
    reader.onerror = function() {
        DOM.targetTextDiv.textContent = '文件读取失败';
        gameState.targetText = '';
    };
    
    reader.readAsText(file, 'UTF-8');
}

// 事件监听器注册
function initEventListeners() {
    DOM.inputArea.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            skipCurrentWindow();
        }
    });

    DOM.inputArea.addEventListener('input', handleInput);
    DOM.fetchBtn.addEventListener('click', handleFetch);
    DOM.skipBtn.addEventListener('click', skipCurrentWindow);
    DOM.loadFileBtn.addEventListener('click', handleFileLoad);
    DOM.fileInput.addEventListener('change', handleFileChange);
    
    // 点击输入显示区时聚焦到隐藏的输入框
    DOM.inputDisplay.addEventListener('click', () => {
        DOM.inputArea.focus();
    });
    
    // 只有在输入显示区被点击或者用户在输入时才保持焦点
    DOM.inputArea.addEventListener('blur', (e) => {
        // 如果焦点转移到URL输入框或按钮，不要重新聚焦
        const relatedTarget = e.relatedTarget;
        if (relatedTarget && (
            relatedTarget.id === 'urlInput' || 
            relatedTarget.id === 'fetchBtn' || 
            relatedTarget.id === 'skipBtn' ||
            relatedTarget.id === 'loadFileBtn'
        )) {
            return;
        }
        // 延迟聚焦，让其他元素有机会获得焦点
        setTimeout(() => {
            if (document.activeElement === document.body || 
                document.activeElement === DOM.inputDisplay) {
                DOM.inputArea.focus();
            }
        }, 50);
    });
}

// 初始化应用
function init() {
    initEventListeners();
    resetGameStats();
}

// 启动应用
init();

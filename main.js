const charSpeedSpan = document.getElementById('charSpeed');
const wordSpeedSpan = document.getElementById('wordSpeed');
let startTime = null;
let targetText = document.getElementById('targetText').textContent;
const targetTextDiv = document.getElementById('targetText');
const inputArea = document.getElementById('inputArea');
const errorRateSpan = document.getElementById('errorRate');
const freqTableDiv = document.getElementById('freqTable');
const urlInput = document.getElementById('urlInput');
const fetchBtn = document.getElementById('fetchBtn');

function updateVisibleText() {
    const scrollLen = 40; // 显示窗口长度，可调整
    let userInput = inputArea.value;
    let inputLen = userInput.length;
    let start = Math.max(0, inputLen - scrollLen);
    let end = inputLen + scrollLen;
    let display = '';
    // 已输入部分
    for (let i = start; i < inputLen; i++) {
        if (i < targetText.length) {
            if (userInput[i] === undefined) {
                display += `<span style='color:#bbb;'> </span>`;
            } else if (userInput[i] === targetText[i]) {
                display += `<span style='color:#bbb;'>${targetText[i]}</span>`;
            } else {
                display += `<span style='color:red;'>${targetText[i]}</span>`;
            }
        }
    }
    // 光标
    display += '<span style="color:#2196f3;font-weight:bold;">|</span>';
    // 未输入部分
    for (let i = inputLen; i < end; i++) {
        if (i < targetText.length) {
            display += targetText[i];
        }
    }
    targetTextDiv.innerHTML = display;
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

inputArea.addEventListener('input', () => {
    const userInput = inputArea.value;
    let errors = 0;
    let total = userInput.length;
    for (let i = 0; i < userInput.length; i++) {
        if (userInput[i] !== targetText[i]) errors++;
    }
    const errorRate = total === 0 ? 0 : (errors / total * 100).toFixed(2);
    errorRateSpan.textContent = errorRate + '%';

    // 统计速度
    if (!startTime && total > 0) {
        startTime = Date.now();
    }
    let elapsedMin = ((Date.now() - startTime) / 60000);
    let charSpeed = elapsedMin > 0 ? (total / elapsedMin).toFixed(2) : '0';
    let wordCount = userInput.trim().split(/\s+/).filter(Boolean).length;
    let wordSpeed = elapsedMin > 0 ? (wordCount / elapsedMin).toFixed(2) : '0';
    charSpeedSpan.textContent = charSpeed + ' 字符/分钟';
    wordSpeedSpan.textContent = wordSpeed + ' 单词/分钟';

    // 字频统计
    const freq = getCharFrequency(userInput);
    freqTableDiv.innerHTML = renderFreqTable(freq);

    // 目标文本滚动显示
    updateVisibleText();
});

fetchBtn.addEventListener('click', async () => {
    inputArea.value = '';
    const url = urlInput.value.trim();
    if (!url) {
        alert('请输入网页地址');
        return;
    }
    targetTextDiv.textContent = '正在抓取网页正文...';
    try {
        // 通过本地代理服务抓取网页内容
        const proxyUrl = `http://127.0.0.1:8080/proxy?url=${encodeURIComponent(url)}`;
        const res = await fetch(proxyUrl);
        const html = await res.text();
        // 只抓取 <main> 标签中的内容
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        let main = doc.querySelector('main');
        let text = main ? main.innerText : '';
        text = text.replace(/\s+/g, ' ').trim();
        if (!text) {
            targetTextDiv.textContent = '未找到 <main> 正文';
            targetText = '';
        } else {
            targetText = text;
            inputArea.value = '';
            updateVisibleText();
        }
    errorRateSpan.textContent = '0%';
    charSpeedSpan.textContent = '0 字符/分钟';
    wordSpeedSpan.textContent = '0 单词/分钟';
    startTime = null;
    freqTableDiv.innerHTML = renderFreqTable({});
    } catch (e) {
        targetTextDiv.textContent = '抓取失败: ' + e.message;
        targetText = '';
    }
});

// 初始化字频表
freqTableDiv.innerHTML = renderFreqTable({});

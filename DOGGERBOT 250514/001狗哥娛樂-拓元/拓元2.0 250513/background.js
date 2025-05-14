'use strict';

import heartbeatconnect from './modules/heartbeatconnect.js';

// 初始化擴充功能
chrome.runtime.onInstalled.addListener(function() {
    let default_status = 'OFF';
    chrome.action.setBadgeText({ text: default_status });
    chrome.storage.local.set({ status: default_status });

    fetch("data/settings.json")
        .then((resp) => resp.json())
        .then((settings) => {
            chrome.storage.local.set({ settings: settings });
            console.log("dump settings.json to extension storage");
        })
        .catch(error => {
            console.log('error is', error);
        });
});

// 狀態切換
function set_status_to(flag) {
    let nextState = flag ? 'ON' : 'OFF';
    chrome.storage.local.set({ status: nextState });
    chrome.action.setBadgeText({ text: nextState });
}

chrome.action.onClicked.addListener(async (tab) => {
    chrome.storage.local.get('status', function(items) {
        let next_flag = !(items.status && items.status === 'ON');
        set_status_to(next_flag);
    });
});

// 心跳機制
let heartbeatInterval;

async function runHeartbeat() {
    heartbeatconnect.start();
}

async function startHeartbeat() {
    runHeartbeat().then(() => {
        heartbeatInterval = setInterval(runHeartbeat, 1000);
    });
}

async function stopHeartbeat() {
    clearInterval(heartbeatInterval);
}

startHeartbeat();

// OCR 處理
async function ocr(data_url, image_data, tabId) {
    fetch(data_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_data: image_data })
    })
    .then(response => {
        if (response.ok) return response.json();
        else throw new Error(response.status === 404 ? 'error 404' : 'some other error: ' + response.status);
    })
    .then((data) => {
        chrome.tabs.sendMessage(tabId, data);
    })
    .catch(error => {
        console.log('OCR error:', error);
    });
}

// 訊息監聽（僅保留 OCR）
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "ocr") {
        const tabId = sender.tab.id;
        ocr(request.data.url, request.data.image_data, tabId);
    }
});

// 初始化避免過熱的時間戳記
chrome.storage.local.set({ last_reload_timestamp: [] });
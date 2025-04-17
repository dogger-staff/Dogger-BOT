const storage = chrome.storage.local;
var settings = null;


function click_button() {
    $("body > div.buynow > a button[onclick].red").click();  
    setTimeout(function() {
        location.reload();
    }, 1000);
}

// 讀取 settings（保留原始結構，但不執行其他操作）
storage.get('settings', function (items) {
    if (items.settings) {
        settings = items.settings;
        console.log('Settings loaded:', settings);
    } else {
        console.log('No settings found');
    }
});

// 讀取 status 並根據狀態執行
storage.get('status', function (items) {
    console.log('Status retrieved:', items.status);
    if (items.status && items.status === 'ON') {
        console.log('Status is ON, calling click_button');
        click_button();
    } else {
        console.log('No status found or status is not ON:', items.status);
    }
});
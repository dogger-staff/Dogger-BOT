const storage = chrome.storage.local;
const currentUrl = window.location.href;
var settings = null;


function click_button() {
    if (currentUrl.includes("UTK0201_.aspx")) {
        const newUrl = currentUrl.replace("UTK0201_.aspx", "UTK0201_00.aspx");
        location.href = newUrl;
    }else if(currentUrl.includes("utk0201_.aspx")) {
        const newUrl = currentUrl.replace("utk0201_.aspx", "UTK0201_00.aspx");
        location.href = newUrl;
    }
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
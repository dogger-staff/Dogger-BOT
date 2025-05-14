// 尋找按鈕
let submitButton = document.querySelector('a.btn.btn-primary.btn-block[href*="__doPostBack"][onclick*="showProcess"][onclick*="setMemberTypeNO"]');

// 檢查是否找到按鈕並點擊
if (submitButton) {
    console.log('找到送出按鈕，執行點擊');
    submitButton.click(); // 模擬點擊
} else {
    console.log('未找到送出按鈕');
}
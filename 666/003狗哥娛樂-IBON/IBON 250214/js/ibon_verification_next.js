var myInterval = null;

function dom_ready() {
    let ret = false;
    const inputValue = $("#ctl00_ContentPlaceHolder1_Txt_id_name").val();  // 獲取信用卡前8碼輸入框的值

    // 檢查輸入框是否包含有效的8位數字
    if (inputValue && inputValue.length === 8 && !isNaN(inputValue)) {
        // 當輸入框有有效的8位數字時
        console.log("Valid input detected:", inputValue);
        
        // 執行送出按鈕的點擊操作
        $("a.btn.btn-primary.btn-block").click();  // 模擬點擊送出按鈕
        ret = true;
        if (myInterval) clearInterval(myInterval);  // 清除間隔
    }
    
    return ret;
}

// 初次檢查，如果未準備好則開始輪詢
if (!dom_ready()) {
    myInterval = setInterval(() => {
        if (dom_ready()) {
            console.log("Valid input detected, action completed.");
        }
    }, 100);  // 每 100ms 檢查一次
}

 

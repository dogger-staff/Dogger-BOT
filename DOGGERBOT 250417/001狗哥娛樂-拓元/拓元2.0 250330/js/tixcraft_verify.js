const storage = chrome.storage.local;

function setUserGuessStringAndSubmit() {
    storage.get('settings', function (result) {
        const userGuessString = result.settings?.advanced?.user_guess_string?.replace(/"/g, "") || "";
        const inputElement = document.querySelector('input[name="checkCode"]');
        const submitButton = document.querySelector('button[type="submit"].btn-primary');
        
        // 獲取特定的 div 元素
        const promoDiv = document.querySelector('div.col-md-12.col-xs-12.text-center.mg-c.mg-top');
        
        if (inputElement && submitButton && promoDiv) {
            // 檢查 div 內容是否包含特定關鍵字
            const divContent = promoDiv.textContent || promoDiv.innerText;
            const has6 = divContent.includes('6碼');
            const has8 = divContent.includes('8碼');
            
            let finalInput = userGuessString;
            
            // 根據條件截取不同長度的字串
            if (has6 && !has8) {
                // 只包含 CODE，取前6碼
                finalInput = userGuessString.slice(0, 6);
            } else if (has6 && !has8) {
                // 只包含 ABC，取前8碼
                finalInput = userGuessString.slice(0, 8);
            }
            // 如果兩者都有或都沒有，使用完整字串，不需要額外處理
            
            inputElement.value = finalInput;
            
            if (finalInput) {
                setTimeout(() => {
                    submitButton.click();
                }, 0);
            }
        }
    });
}

setUserGuessStringAndSubmit();
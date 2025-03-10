var myInterval = null;

function dom_ready() {
    let ret = false;
    const inputValue = $("#ctl00_ContentPlaceHolder1_CHK").val();  // 获取输入框的值

    // 检查输入框是否包含有效的数字
    if (inputValue && inputValue !== '驗證碼' && !isNaN(inputValue)) {
        // 当输入框有有效数字时
        console.log("Valid input detected:", inputValue);
        
        // 执行点击操作，目标为特定的 <a> 元素
        $('a.btn.btn-primary.btn-block[onclick="showProcess();setMemberTypeNO(\'0\');"]').click();
        ret = true;
        if (myInterval) clearInterval(myInterval);  // 清除间隔
    }
    
    return ret;
}

// 初次检查，如果未准备好则开始轮询
if (!dom_ready()) {
    myInterval = setInterval(() => {
        if (dom_ready()) {
            console.log("Valid input detected, action completed.");
        }
    }, 100);  // 每 100ms 检查一次
 }

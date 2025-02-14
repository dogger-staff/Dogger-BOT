const storage = chrome.storage.local;

// 从 storage 中撈取 user_guess_string 并设置到输入框中，然后点击提交按钮
function setUserGuessStringAndSubmit() {
    storage.get('settings', function (result) {
        const userGuessString = result.settings?.advanced?.user_guess_string?.replace(/"/g, ""); // 获取 user_guess_string 并移除引号
        const inputElement = document.querySelector('input[name="checkCode"]');
        const submitButton = document.querySelector('button[type="submit"].btn-primary');

        if (inputElement && submitButton) {
            inputElement.value = userGuessString || ""; // 设置输入框的值

            // 如果 user_guess_string 有值，等待 0.2 秒后点击提交按钮
            if (userGuessString) {
                setTimeout(() => {
                    submitButton.click(); // 点击提交按钮
                }, 200); // 200 毫秒
            }
        }
    });
}

// 调用函数
setUserGuessStringAndSubmit();

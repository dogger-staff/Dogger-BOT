const storage = chrome.storage.local;

function setUserGuessStringAndSubmit() {//輸入驗證問題
    storage.get('settings', function (result) {
        const userGuessString = result.settings?.advanced?.user_guess_string?.replace(/"/g, "");
        const inputElement = document.querySelector('input[name="checkCode"]');
        const submitButton = document.querySelector('button[type="submit"].btn-primary');

        if (inputElement && submitButton) {
            inputElement.value = userGuessString || "";
            if (userGuessString) {
                setTimeout(() => {
                    submitButton.click();
                }, 0);
            }
        }
    });
}

setUserGuessStringAndSubmit();

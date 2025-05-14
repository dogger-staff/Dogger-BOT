const storage = chrome.storage.local;
var settings = null;

function ibon_verification_main() {
    let user_guess_string_array = [];
    if (settings) {
        if (settings.advanced.user_guess_string.length > 0) {
            if (settings.advanced.user_guess_string != '""') {
                user_guess_string_array = JSON.parse('[' + settings.advanced.user_guess_string + ']');
            }
        }
    }

    let target_row = null;
    let all_row = $("div.editor-box > div > div.form-group > input[type='text']");
    if (all_row.length > 0 && user_guess_string_array.length > 0) {
        //console.log("input count:" + all_row.length);
        let travel_index = 0;
        all_row.each(function () {
            let current_index = all_row.index(this);
            //console.log("current_index:" + current_index);
            if (current_index + 1 <= user_guess_string_array.length) {
                //console.log("input data:" + user_guess_string_array[current_index]);
                $(this).val(user_guess_string_array[current_index]);
            }
        });

        // 輸入完成後，自動點擊「送出」按鈕
        let submitButton = $('a.btn.btn-primary.btn-block[href*="__doPostBack"][onclick*="showProcess"][onclick*="setMemberTypeNO"]');
        if (submitButton.length > 0) {
            console.log('找到送出按鈕，執行點擊');
            submitButton.click(); // 模擬點擊按鈕
        } else {
            console.log('未找到送出按鈕');
        }
    } else {
        console.log('無輸入框或無使用者字串資料');
    }
}

storage.get('settings', function (items) {
    if (items.settings) {
        settings = items.settings;
    }
});

storage.get('status', function (items) {
    if (items.status && items.status == 'ON') {
        ibon_verification_main();
    } else {
        console.log('no status found');
    }
});
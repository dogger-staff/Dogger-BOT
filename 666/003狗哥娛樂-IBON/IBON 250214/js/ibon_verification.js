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

    // 直接定位特定的輸入框
    let target_input = $("#ctl00_ContentPlaceHolder1_Txt_id_name");
    
    if (target_input.length > 0 && user_guess_string_array.length > 0) {
        // 只取數組第一個值，因為只有一個輸入框
        target_input.val(user_guess_string_array[0]);
    } else {
        if (target_input.length === 0) {
            console.log('未找到目標輸入框');
        }
        if (user_guess_string_array.length === 0) {
            console.log('未找到有效的填充數據');
        }
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
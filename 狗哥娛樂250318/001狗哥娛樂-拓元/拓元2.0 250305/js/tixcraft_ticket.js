const storage = chrome.storage.local;
var settings = null;

$('input[type=checkbox]').each(function () { // 會員服務條款勾選
    $(this).prop('checked', true);
});

function tixcraft_ticket_clean_exclude(settings) { // 刪除排除關鍵字票種
    let exclude_keyword_array = [];
    if (settings) {
        if (settings.keyword_exclude.length > 0) {
            if (settings.keyword_exclude != '""') {
                exclude_keyword_array = JSON.parse('[' + settings.keyword_exclude + ']');
            }
        }
    }
    for (let i = 0; i < exclude_keyword_array.length; i++) {
        $("#ticketPriceList > tbody > tr").each(function () {
            let html_text = $(this).text();
            if (html_text.indexOf(exclude_keyword_array[i]) > -1) {
                $(this).remove();
            }
        });
    }
}

function tixcraft_assign_ticket_number(settings) { // 控制票種張數
    let area_keyword_array = [];
    if (settings) {
        if (settings.area_auto_select.area_keyword.length > 0) {
            if (settings.area_auto_select.area_keyword != '""') {
                area_keyword_array = JSON.parse('[' + settings.area_auto_select.area_keyword + ']');
            }
        }
    }
    
    let target_row = null;
    let all_row = $("#ticketPriceList > tbody > tr");
    if (all_row.length > 0) {
        if (all_row.length == 1) {
            // 單一選擇
            target_row = all_row;
        } else {
            // 多選邏輯
            all_row.each(function () {
                let is_match_keyword = false;
                if (area_keyword_array.length) {
                    let html_text = $(this).text();
                    for (let i = 0; i < area_keyword_array.length; i++) {
                        console.log("area_keyword:" + area_keyword_array[i]);
                        if (area_keyword_array[i].indexOf(" ") > -1) {
                            // TODO: 多關鍵字 AND 邏輯
                        } else {
                            if (html_text.indexOf(area_keyword_array[i]) > -1) {
                                is_match_keyword = true;
                                target_row = $(this);
                                break;
                            }
                        }
                    }
                } else {
                    if (all_row.index(this) == 0) {
                        is_match_keyword = true;
                        target_row = $(this);
                    }
                }
                if (is_match_keyword) {
                    return;
                }
            });
        }
        
        let ticket_options = target_row.find("option");
        if (ticket_options.length) {
            let is_ticket_number_assign = false;
            if (settings.ticket_number > 0) {
                ticket_options.each(function () {
                    if ($(this).val() == settings.ticket_number) {
                        $(this).prop('selected', true);
                        is_ticket_number_assign = true;
                        return false;
                    }
                });
            }
            if (!is_ticket_number_assign) {
                ticket_options.last().prop('selected', true);
            }
        }
    }
}

var myInterval = null;

function get_ocr_image() { // 獲取驗證碼圖片數據
    let image_data = "";
    const currentUrl = window.location.href;
    const domain = currentUrl.split('/')[2];
    let image_id = 'TicketForm_verifyCode-image';
    let img = document.getElementById(image_id);
    if (img != null) {
        let canvas = document.createElement('canvas');
        let context = canvas.getContext('2d');
        canvas.height = img.naturalHeight;
        canvas.width = img.naturalWidth;
        context.drawImage(img, 0, 0);
        let img_data = canvas.toDataURL();
        if (img_data) {
            image_data = img_data.split(",")[1];
        }
    }
    return image_data;
}

var last_captcha_answer = "";

chrome.runtime.onMessage.addListener((message) => { // 處理 OCR 回傳結果
    if (message.answer.length === 4) {
        // 驗證碼為 4 個字元，填入並根據 next 決定是否提交
        tixcraft_set_ocr_answer(message.answer);
        last_captcha_answer = message.answer;
    } else {
        // 驗證碼不是 4 個字元，重新更換驗證碼並觸發 OCR
        console.log("Invalid captcha answer, retrying OCR...");
        const captchaImage = document.getElementById("TicketForm_verifyCode-image");
        if (captchaImage) {
            captchaImage.click();
        }
        setTimeout(() => {
            let remote_url_string = get_remote_url(settings);
            let image_data = get_ocr_image();
            if (image_data.length > 0) {
                tixcraft_get_ocr_answer(remote_url_string, image_data);
            }
        }, 800); // 等待 800 毫秒確保圖片更新
    }
});

function tixcraft_set_ocr_answer(answer) { // 填入驗證碼並根據 next 決定是否提交
    if (answer.length > 0) {
        $('#TicketForm_verifyCode').val(answer);
        storage.get(['order_start_time', 'settings'], (items) => {
            if (items.settings && items.settings.next.enable) { // 只有 next.enable 為 true 時提交
                const startTime = items.order_start_time || Date.now(); // 若無 startTime，預設當前時間
                const currentTime = Date.now();
                const elapsedTime = (currentTime - startTime) / 1000; // 轉換為秒
                const minSeconds = items.settings.advanced.submit_order_min_seconds || 0; // 預設為 0
                const delay = Math.max(0, minSeconds - elapsedTime); // 確保延遲不為負數

                setTimeout(function() {
                    $("button[type='submit']").click(); // 送出訂單
                    console.log('Order submitted after delay:', delay);
                }, delay * 1000); // 延遲剩餘秒數
            } else {
                console.log('Next is disabled, stopping after entering captcha.');
            }
        });
    }
}

async function tixcraft_get_ocr_answer(api_url, image_data) { // 發送 OCR 請求
    let bundle = {
        action: 'ocr',
        data: {
            'url': api_url + 'ocr',
            'image_data': image_data,
        }
    };
    const return_answer = await chrome.runtime.sendMessage(bundle);
}

function tixcraft_orc_image_ready(api_url) { // 檢查驗證碼圖片是否準備好
    let ret = false;
    let image_data = get_ocr_image();
    if (image_data.length > 0) {
        ret = true;
        if (myInterval) clearInterval(myInterval);
        tixcraft_get_ocr_answer(api_url, image_data);
    }
    return ret;
}

storage.get('settings', function (items) { // 載入設置並清理排除關鍵字
    if (items.settings) {
        settings = items.settings;
        tixcraft_ticket_clean_exclude(settings);
    } else {
        console.log('no settings found');
    }
});

function get_remote_url(settings) { // 獲取遠端 OCR URL
    let remote_url_string = "";
    if (settings) {
        let remote_url_array = [];
        if (settings.advanced.remote_url.length > 0) {
            remote_url_array = JSON.parse('[' + settings.advanced.remote_url + ']');
        }
        if (remote_url_array.length) {
            remote_url_string = remote_url_array[0];
        }
    }
    return remote_url_string;
}

storage.get('status', function (items) { // 檢查狀態並執行主要邏輯
    if (items.status && items.status == 'ON') {
        tixcraft_assign_ticket_number(settings);
        
        // OCR 處理
        if (settings.ocr_captcha.enable) {
            let remote_url_string = get_remote_url(settings);
            if (!tixcraft_orc_image_ready(remote_url_string)) {
                myInterval = setInterval(() => {
                    tixcraft_orc_image_ready(remote_url_string);
                }, 100);
            }
        }
    } else {
        console.log('no status found');
    }
});
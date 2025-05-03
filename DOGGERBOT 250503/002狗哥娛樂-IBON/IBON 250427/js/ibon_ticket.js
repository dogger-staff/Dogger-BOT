const storage = chrome.storage.local;
var settings = null;
var myInterval = null;

// 删除不必要的内容
$("footer").remove();

function ibon_ticket_clean_exclude(settings) // 删除排除关键字票种
{
    let exclude_keyword_array = [];
    if(settings) {
        if(settings.keyword_exclude.length > 0) {
            if(settings.keyword_exclude != '""') {
                exclude_keyword_array = JSON.parse('[' + settings.keyword_exclude + ']');
            }
        }
    }

    // 遍历排除的关键字
    for (let i = 0; i < exclude_keyword_array.length; i++) {
        // 遍历表格中的每一行
        $("#ctl00_ContentPlaceHolder1_DataGrid > tbody > tr").each(function () {
            let html_text = $(this).text();  // 获取当前行的文本内容

            // 如果行内的文本包含排除关键字，则删除该行
            if(html_text.indexOf(exclude_keyword_array[i]) > -1) {
                $(this).remove();  // 删除该行
            }
        });
    }
}


function ibon_assign_ticket_number(ticket_number) {
    let $main_table = $("table.table");
    if ($main_table.length > 0) {
        console.log("found main table");
        let $ticket_options = $main_table.find("select:first option");
        if ($ticket_options.length) {
            let is_ticket_number_assign = false;
            if (ticket_number > 0) {
                console.log("target ticket_number:" + ticket_number);
                $ticket_options.each(function () {
                    if ($(this).val() == ticket_number) {
                        $(this).prop('selected', true);
                        is_ticket_number_assign = true;
                        return false;
                    }
                });
            }
            console.log("is_ticket_number_assign:" + is_ticket_number_assign);
            if (!is_ticket_number_assign) {
                $ticket_options.last().prop('selected', true);
            }
        }
    }
}

function ibon_assign_adjacent_seat(flag) {
    if (flag) {
        $('input[type=checkbox]').each(function () {
            $(this).prop('checked', true);
        });
    }
}


function traverseShadowDOM(element, selector, callback, checkText = null) {
    // 檢查當前元素是否匹配選擇器
    const matchedElements = element.querySelectorAll(selector);
    for (let matchedElement of matchedElements) {
        if (checkText) {
            // 如果提供了文本檢查，確保元素文本匹配
            if (matchedElement.textContent.trim() === checkText) {
                callback(matchedElement);
                return true;
            }
        } else {
            callback(matchedElement);
            return true;
        }
    }

    // 如果當前元素有 Shadow DOM，則進入 Shadow DOM
    if (element.shadowRoot) {
        const foundInShadow = traverseShadowDOM(element.shadowRoot, selector, callback, checkText);
        if (foundInShadow) return true;
    }

    // 遍歷子元素
    const children = element.children;
    if (children) {
        for (let i = 0; i < children.length; i++) {
            const foundInChild = traverseShadowDOM(children[i], selector, callback, checkText);
            if (foundInChild) return true;
        }
    }

    return false;
}

function ibon_get_ocr_image() {
    let image_data = "";
    let imgFound = false;

    // 遍歷 Shadow DOM 查找驗證碼圖片
    traverseShadowDOM(document.documentElement, "img[src*='pic.aspx?TYPE=UTK0201_001']", (img) => {
        let canvas = document.createElement('canvas');
        let context = canvas.getContext('2d');
        canvas.height = img.naturalHeight;
        canvas.width = img.naturalWidth;
        context.drawImage(img, 0, 0);
        let img_data = canvas.toDataURL();
        if (img_data) {
            image_data = img_data.split(",")[1];
        } else {
            console.log("Failed to extract image data.");
        }
        imgFound = true;
    });

    if (!imgFound) {
        console.log("Captcha image not found in Shadow DOM.");
    }

    return image_data;
}

chrome.runtime.onMessage.addListener((message) => {
    ibon_set_ocr_answer(message.answer);
});

function ibon_set_ocr_answer(answer) {
    console.log("Setting OCR answer: " + answer);
    if (answer.length > 0) {
        let inputFound = false;

        // 輸入框在 Shadow DOM 外，直接使用 document.querySelector
        const input = document.querySelector("#ctl00_ContentPlaceHolder1_CHK");
        if (input) {
            $(input).val(answer);
            inputFound = true;
        } else {
            return;
        }

        // 已移除“點擊下一步按鈕”的邏輯
    } else {
        console.log("No answer received from OCR.");
    }
}

async function ibon_get_ocr_answer(api_url, image_data) {
    let bundle = {
        action: 'ocr',
        data: {
            'url': api_url + 'ocr',
            'image_data': image_data,
        }
    };

    const return_answer = await chrome.runtime.sendMessage(bundle);
}

function ibon_orc_image_ready(api_url) {
    let ret = false;
    let image_data = ibon_get_ocr_image();
    if (image_data.length > 0) {
        ret = true;
        if (myInterval) clearInterval(myInterval);
        ibon_get_ocr_answer(api_url, image_data);
    } else {
        console.log("Image data not ready.");
    }
    return ret;
}

function ibon_focus_on_captcha() {
    // 輸入框在 Shadow DOM 外，直接使用 document.querySelector
    const input = document.querySelector("#ctl00_ContentPlaceHolder1_CHK");
    if (input) {
        input.focus();
    } else {
        console.log("Captcha input field not found for focusing.");
    }
}

function get_remote_url(settings) {
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
storage.get('settings', function (items) {
    if (items.settings) {
        settings = items.settings;
        ibon_ticket_clean_exclude(settings);
    }
});

storage.get('status', function (items) {
    if (items.status && items.status == 'ON') {
        ibon_assign_ticket_number(settings.ticket_number);
        ibon_assign_adjacent_seat(settings.advanced.disable_adjacent_seat);

        if (settings && settings.ocr_captcha.enable) {
            let remote_url_string = get_remote_url(settings);
            if (!ibon_orc_image_ready(remote_url_string)) {
                myInterval = setInterval(() => {
                    ibon_orc_image_ready(remote_url_string);
                }, 100);
            }
        } else {
            ibon_focus_on_captcha();
        }
    } else {
        console.log('no status found');
    }
});
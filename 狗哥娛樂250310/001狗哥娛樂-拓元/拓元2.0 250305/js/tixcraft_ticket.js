const storage = chrome.storage.local;
var settings = null;


$('input[type=checkbox]').each(function ()//會員服務條款勾選
{
    $(this).prop('checked', true);
});


function tixcraft_ticket_clean_exclude(settings) //刪除排除關鍵字票種
{
    let exclude_keyword_array = [];
    if(settings) {
        if(settings.keyword_exclude.length > 0) {
            if(settings.keyword_exclude!='""') {
                exclude_keyword_array = JSON.parse('[' + settings.keyword_exclude +']');
            }
        }
    }
    for (let i = 0; i < exclude_keyword_array.length; i++) {
        $("#ticketPriceList > tbody > tr").each(function ()
        {
            let html_text=$(this).text();
            //console.log("html:"+html_text);
            if(html_text.indexOf(exclude_keyword_array[i])>-1) {
                $(this).remove();
            }
        });
    }
}

function tixcraft_assign_ticket_number(settings)//控制票種張數
{
    let area_keyword_array = [];
    if(settings) {
        if(settings.area_auto_select.area_keyword.length > 0) {
            if(settings.area_auto_select.area_keyword!='""') {
                area_keyword_array = JSON.parse('[' +  settings.area_auto_select.area_keyword +']');
            }
        }
    }
    //let target_area = [];
    
    let target_row=null;
    let all_row = $("#ticketPriceList > tbody > tr");
    if (all_row.length > 0)
    {
        if (all_row.length == 1) {
            // single select.
            target_row=all_row;
        } else {
            // single select.
            all_row.each(function ()
            {
                //console.log(all_row.index(this));
                let is_match_keyword = false;
                if(area_keyword_array.length) {
                    let html_text=$(this).text();
                    //console.log("html:"+html_text);

                    // TOOD: multi item matched, need sort.
                    for (let i = 0; i < area_keyword_array.length; i++) {
                        // target_area = get_target_area_with_order(settings, matched_block);
                        console.log("area_keyword:"+area_keyword_array[i]);

                        if(area_keyword_array[i].indexOf(" ")>-1) {
                            // TODO: muti keywords with AND logic.
                        } else {
                            if(html_text.indexOf(area_keyword_array[i])>-1) {
                                is_match_keyword = true;
                                target_row=$(this);
                                break;
                            }
                        }
                    }
                } else {
                    if(all_row.index(this)==0) {
                        is_match_keyword = true;
                        target_row=$(this);
                    }
                }
                //console.log("is_match_keyword:"+is_match_keyword);
                if(is_match_keyword) {
                    return;
                }
            });
        }
        
        let ticket_options = target_row.find("option");
        if (ticket_options.length)
        {
            let is_ticket_number_assign = false;
            if (settings.ticket_number > 0)
            {
                ticket_options.each(function ()
                {
                    if ($(this).val() == settings.ticket_number)
                    {
                        $(this).prop('selected', true);
                        is_ticket_number_assign = true;
                        return false;
                    }
                });
            }
            if (!is_ticket_number_assign)
            {
                ticket_options.last().prop('selected', true);
            }
        }
    }
}

var myInterval = null;

function get_ocr_image()
{
    //console.log("get_ocr_image");
    let image_data = "";

    // PS: tixcraft have different domain to use the same content script.
    const currentUrl = window.location.href;
    const domain = currentUrl.split('/')[2];

    let image_id = 'TicketForm_verifyCode-image';
    let img = document.getElementById(image_id);
    if(img!=null) {
        let canvas = document.createElement('canvas');
        let context = canvas.getContext('2d');
        canvas.height = img.naturalHeight;
        canvas.width = img.naturalWidth;
        context.drawImage(img, 0, 0);
        let img_data = canvas.toDataURL();
        if(img_data) {
            image_data = img_data.split(",")[1];
            //console.log(image_data);
        }
    }
    return image_data;
}

var last_captcha_answer = "";

chrome.runtime.onMessage.addListener((message) => {
    if (message.answer.length === 4) {
        // 驗證碼為4個字元，填入並提交表單
        tixcraft_set_ocr_answer(message.answer);
        last_captcha_answer = message.answer;
    } else {
        // 驗證碼不是4個字元，重新更換驗證碼並觸發OCR
        console.log("Invalid captcha answer, retrying OCR...");

        // 點擊驗證碼圖片以更換
        const captchaImage = document.getElementById("TicketForm_verifyCode-image");
        if (captchaImage) {
            captchaImage.click();
        }

        // 等待圖片更新後再次觸發OCR（不刷新頁面）
        setTimeout(() => {
            let remote_url_string = get_remote_url(settings);
            let image_data = get_ocr_image();
            if (image_data.length > 0) {
                tixcraft_get_ocr_answer(remote_url_string, image_data);
            }
        }, 800); // 等待800毫秒確保圖片更新
    }
});

function tixcraft_set_ocr_answer(answer)
{
    //console.log("answer:"+answer);
    if(answer.length > 0) {
        $('#TicketForm_verifyCode').val(answer);
        // 獲取開始時間並計算延遲（基於訂單最短提交秒數）
        storage.get(['order_start_time', 'settings'], (items) => {
            if (items.order_start_time && items.settings) {
                const startTime = items.order_start_time;
                const currentTime = Date.now();
                const elapsedTime = (currentTime - startTime) / 1000; // 轉換為秒
                const minSeconds = items.settings.advanced.submit_order_min_seconds || 0; // 預設為 0（不延遲）
                const delay = Math.max(0, minSeconds - elapsedTime); // 確保延遲不為負數

                setTimeout(function() {
                    $("button[type='submit']").click();  // 送出訂單
                }, delay * 1000); // 延遲剩餘秒數（如果 minSeconds 為 0，則不延遲）
            } else {
                // 如果沒有開始時間，默認不延遲
                setTimeout(function() {
                    $("button[type='submit']").click();  // 送出訂單
                }, 0);
            }
        });
    }
}

async function tixcraft_get_ocr_answer(api_url, image_data)
{
    let bundle = {
      action: 'ocr',
      data: {
        'url': api_url + 'ocr',
        'image_data':image_data,
      }
    };
    
    const return_answer = await chrome.runtime.sendMessage(bundle);
    //console.log(return_answer);

    // fail due to CORS error
    //ocr(bundle.data.url, bundle.data.image_data, bundle.data.callback);
}

function tixcraft_orc_image_ready(api_url)
{
    let ret=false;
    let image_data = get_ocr_image();
    if(image_data.length>0) {
        ret=true;
        if(myInterval) clearInterval(myInterval);
        tixcraft_get_ocr_answer(api_url, image_data);
    }
    //console.log("orc_image_ready:"+ret);
    return ret;
}

storage.get('settings', function (items)
{
    if (items.settings)
    {
        settings = items.settings;
        tixcraft_ticket_clean_exclude(settings);
    } else {
        console.log('no settings found');
    }
});

function get_remote_url(settings)
{
    let remote_url_string = "";
    if(settings) {
        let remote_url_array = [];
        if(settings.advanced.remote_url.length > 0) {
            remote_url_array = JSON.parse('[' +  settings.advanced.remote_url +']');
        }
        if(remote_url_array.length) {
            remote_url_string = remote_url_array[0];
        }
    }
    return remote_url_string;
}

storage.get('status', function (items)
{
    if (items.status && items.status=='ON')
    {
    

        //console.log("ticket_number:"+ settings.ticket_number);
        tixcraft_assign_ticket_number(settings);
        
        // ocr
        if(settings.ocr_captcha.enable) {
            let remote_url_string = get_remote_url(settings);
            if(!tixcraft_orc_image_ready(remote_url_string)) {
                myInterval = setInterval(() => {
                    tixcraft_orc_image_ready(remote_url_string);
                }, 100);
            }
        }

    } else {
        console.log('no status found');
    }
});
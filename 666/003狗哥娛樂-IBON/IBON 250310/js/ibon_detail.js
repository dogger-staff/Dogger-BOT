const storage = chrome.storage.local;
var settings = null;

function ibon_detail_ajax_done(game_info) {
    let date_keyword_array = [];
    if (settings) {
        if (settings.date_auto_select.date_keyword.length > 0) {
            date_keyword_array = JSON.parse('[' + settings.date_auto_select.date_keyword + ']');
        }
    }

    let reload = false;
    let target_href = "";

    if (game_info.Item.GIHtmls.length) {
        let one_can_buy = false;
        let matched_block = [];  // 存放所有匹配的場次

        for (let i = 0; i < game_info.Item.GIHtmls.length; i++) {
            let rs = game_info.Item.GIHtmls[i];

            if (game_info.Item.GIHtmls.length == 1) {
                // 單筆場次處理
                if (rs.Href == null || rs.CanBuy == false) {
                    reload = true;
                } else {
                    one_can_buy = true;
                    target_href = rs.Href;
                }
                if (reload) break;
            } else {
                // 多筆場次處理
                if (settings) {
                    let is_match_row = false;

                    if (date_keyword_array.length) {
                        for (let j = 0; j < date_keyword_array.length; j++) {
                            if (rs.ShowSaleDate.indexOf(date_keyword_array[j]) > -1 ||
                                rs.GameInfoName.indexOf(date_keyword_array[j]) > -1) {
                                is_match_row = true;
                                break;
                            }
                        }
                    } else {
                        is_match_row = true;  // 若沒有關鍵字，則匹配所有場次
                    }

                    if (is_match_row) {
                        matched_block.push(rs);
                    }
                }
            }
        }

        // **使用 `get_target_date_with_order` 來選擇適合的場次**
        if (matched_block.length > 0) {
            let target_event = get_target_date_with_order(settings, matched_block);
            if (target_event && target_event.Href != null && target_event.CanBuy != false) {
                one_can_buy = true;
                target_href = target_event.Href;
            }
        }

        if (!reload) {
            if (one_can_buy == false) reload = true;
        }
    }

    if (reload) {
        let auto_reload_page_interval = 0.0;
        if (settings) {
            auto_reload_page_interval = settings.advanced.auto_reload_page_interval;
        }
        if (auto_reload_page_interval == 0) {
            location.reload();
        } else {
            console.log('We are going to reload after a few seconds.');
            setTimeout(function () {
                location.reload();
            }, auto_reload_page_interval * 1000);
        }
    } else {
        if (target_href.length > 0) {
            location.href = "https://ticket.ibon.com.tw/" + target_href;
        }
    }
}

function ibon_event_status_check()
{
    const currentUrl = window.location.href; 
    const event_code = currentUrl.split('/')[5];
    //console.log(currentUrl);
    //console.log(event_code);
    if(event_code){
        let api_url = "https://ticketapi.ibon.com.tw/api/ActivityInfo/GetGameInfoList";
        dataJSON = {
            id: parseInt(event_code, 10),
            hasDeadline: true,
            SystemBrowseType: 0
        }
        $.ajax({
            url: api_url,
            data: JSON.stringify(dataJSON),
            type: "POST",
            dataType: "json",
            xhrFields: {
                withCredentials: true
            },
            headers: {
                "x-xsrf-token": getCookie("XSRF-TOKEN")
            },
            contentType: "application/json",
            success: function(returnData){
                ibon_detail_ajax_done(returnData);

            },
            error: function(xhr, ajaxOptions, thrownError){
            }
        });
    }
}

storage.get('settings', function (items)
{
    if (items.settings)
    {
        settings = items.settings;
    }
});

storage.get('status', function (items)
{
    if (items.status && items.status=='ON')
    {
        console.log("start to ibon detail.");
        //console.log(document.cookie);
        //console.log(getCookie("XSRF-TOKEN"));
        ibon_event_status_check();
    } else {
        console.log('no status found');
    }
});

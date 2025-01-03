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
    let matched_rows = []; // 用於存放匹配的行

    if (game_info.Item.GIHtmls.length) {
        // one of game able to buy.
        let one_can_buy = false;

        for (let i = 0; i < game_info.Item.GIHtmls.length; i++) {
            let rs = game_info.Item.GIHtmls[i];
            if (game_info.Item.GIHtmls.length == 1) {
                // single row.
                if (rs.Href == null) {
                    reload = true;
                } else {
                    if (rs.CanBuy == false) {
                        reload = true;
                    } else {
                        one_can_buy = true;
                        target_href = rs.Href;
                    }
                }
                if (reload) {
                    break;
                }
            } else {
                // multi rows.
                if (settings) {
                    let is_match_row = false;
                    if (date_keyword_array.length) {
                        for (let j = 0; j < date_keyword_array.length; j++) {
                            if (rs.ShowSaleDate.indexOf(date_keyword_array[j]) > -1 || rs.GameInfoName.indexOf(date_keyword_array[j]) > -1) {
                                is_match_row = true;
                                break;
                            }
                        }
                    } else {
                        // empty keyword.
                        is_match_row = true;
                    }

                    if (is_match_row && rs.Href != null && rs.CanBuy != false) {
                        matched_rows.push(rs); // 匹配的行加入陣列
                    }
                }
            }
        }

        // 根據選擇模式選擇目標行
        if (matched_rows.length > 0) {
            let target_row = select_target_row(settings, matched_rows);
            if (target_row) {
                one_can_buy = true;
                target_href = target_row.Href;
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

function select_target_row(settings, matched_rows) {
    let target_row = null;

    if (matched_rows.length) {
        let last_index = matched_rows.length - 1;
        let center_index = 0;
        let random_index = 0;
        if (matched_rows.length > 1) {
            center_index = parseInt(last_index / 2);
            random_index = getRandom(0, last_index);
        }

        if (settings.date_auto_select.mode == "from top to bottom")
            target_row = matched_rows[0];
        if (settings.date_auto_select.mode == "from bottom to top")
            target_row = matched_rows[last_index];
        if (settings.date_auto_select.mode == "center")
            target_row = matched_rows[center_index];
        if (settings.date_auto_select.mode == "random")
            target_row = matched_rows[random_index];
    }

    return target_row;
}

function getRandom(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function ibon_event_status_check() {
    const currentUrl = window.location.href;
    const event_code = currentUrl.split('/')[5];
    if (event_code) {
        let api_url = "https://ticketapi.ibon.com.tw/api/ActivityInfo/GetGameInfoList";
        dataJSON = {
            id: parseInt(event_code, 10),
            hasDeadline: true,
            SystemBrowseType: 0
        };
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
            success: function (returnData) {
                ibon_detail_ajax_done(returnData);
            },
            error: function (xhr, ajaxOptions, thrownError) {
                console.error(xhr.status, thrownError);
            }
        });
    }
}

storage.get('settings', function (items) {
    if (items.settings) {
        settings = items.settings;
    }
});

storage.get('status', function (items) {
    if (items.status && items.status == 'ON') {
        console.log("start to ibon detail.");
        ibon_event_status_check();
    } else {
        console.log('no status found');
    }
});

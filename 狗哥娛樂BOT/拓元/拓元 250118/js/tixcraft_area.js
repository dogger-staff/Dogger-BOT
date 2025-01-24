const storage = chrome.storage.local;
var settings = null;

// 清除無連結的列表項目、圖片和頁腳
document.querySelectorAll("ul.area-list > li:not(:has(a))").forEach(item => item.remove());
document.querySelectorAll("#selectseat div div img").forEach(img => img.remove());
document.querySelectorAll("footer").forEach(footer => footer.remove());

// 排除關鍵字的函數
function tixcraft_clean_exclude(settings) {
    let exclude_keyword_array = [];

    // 檢查 settings 並解析排除關鍵字
    if (settings && settings.keyword_exclude && settings.keyword_exclude.length > 0) {
        if (settings.keyword_exclude !== '""') {
            exclude_keyword_array = JSON.parse('[' + settings.keyword_exclude + ']');
        }
    }

    // 遍歷排除關鍵字陣列
    exclude_keyword_array.forEach(keyword => {
        const listItems = document.querySelectorAll("ul.area-list > li > a");
        listItems.forEach(anchor => {
            if (anchor.textContent.includes(keyword)) {
                const parentLi = anchor.parentElement;
                if (parentLi) {
                    parentLi.remove();
                }
            }
        });
    });
}

// 區域關鍵字自動選擇
function tixcraft_area_keyword(settings) {
    let area_keyword_array = [];
    if (settings) {
        if (settings.area_auto_select.area_keyword.length > 0) {
            if (settings.area_auto_select.area_keyword != '""') {
                area_keyword_array = JSON.parse('[' + settings.area_auto_select.area_keyword + ']');
            }
        }
    }

    let target_area = null;
    if (area_keyword_array.length) {
        for (let i = 0; i < area_keyword_array.length; i++) {
            const query_string = area_keyword_array[i] === ""
                ? "ul.area-list > li > a"
                : `ul.area-list > li > a:contains('${area_keyword_array[i]}')`;

            const matched_block = Array.from(document.querySelectorAll(query_string));
            target_area = get_target_area_with_order(settings, matched_block);

            if (target_area && target_area.length) {
                console.log("match keyword:" + area_keyword_array[i]);
                break;
            }
        }
    } else {
        const matched_block = Array.from(document.querySelectorAll("ul.area-list > li > a"));
        target_area = get_target_area_with_order(settings, matched_block);
    }

    if (target_area) {
        const link_id = target_area.getAttribute("id");
        if (link_id) {
            const body = document.body.innerHTML;
            if (body.includes('var areaUrlList =')) {
                const javascript_right = body.split('var areaUrlList =')[1];
                let areaUrlHtml = javascript_right?.split("};")[0] + "}";
                const areaUrlList = areaUrlHtml ? JSON.parse(areaUrlHtml) : null;

                if (areaUrlList && areaUrlList[link_id]) {
                    setTimeout(() => {
                        window.location.href = areaUrlList[link_id];
                    }, 0); // 區域延遲
                }
            }
        }
    } else {
        console.log("No target area found.");
    }
}

// 執行區域邏輯
function tixcraft_area_main(settings) {
    if (settings) {
        tixcraft_clean_exclude(settings);
        tixcraft_area_keyword(settings);
    }
}

// 自動重載頁面
async function do_reload_if_not_overheat(settings) {
    let { auto_reload_page_interval, auto_reload_overheat_count, auto_reload_overheat_cd } = settings.advanced;
    storage.get('last_reload_timestamp', function (items) {
        if (items.last_reload_timestamp) {
            const now = new Date().getTime();
            const overheat_second = 2.5;
            const new_timestamp = items.last_reload_timestamp.filter(each_time =>
                now - each_time <= overheat_second * 1000
            );

            if (new_timestamp.length >= auto_reload_overheat_count) {
                console.log("Overheat, slowing down!");
                auto_reload_page_interval = auto_reload_overheat_cd;
            }

            new_timestamp.push(now);
            storage.set({ last_reload_timestamp: new_timestamp });

            if (auto_reload_page_interval === 0) {
                location.reload();
            } else {
                setTimeout(() => location.reload(), auto_reload_page_interval * 1000);
            }
        }
    });
}

// 自動重新載入區域
function area_auto_reload() {
    let reload = false;
    if (document.querySelectorAll("ul.area-list > li:has(a)").length) {
        if (settings) {
            tixcraft_area_main(settings);
        }
    } else {
        reload = true;
    }

    if (reload && settings) {
        do_reload_if_not_overheat(settings);
    }
}

// 初始化邏輯
function init_tixcraft() {
    // 獲取設定並執行排除邏輯
    storage.get('settings', function (items) {
        if (items.settings) {
            settings = items.settings;
            tixcraft_clean_exclude(settings); // 無條件執行
        }
    });

    // 狀態檢查，僅影響其他功能
    storage.get('status', function (items) {
        if (items.status && items.status == 'ON') {
            area_auto_reload();
        } else {
            console.log('Status is OFF or not found.');
        }
    });
}

// 啟動
init_tixcraft();

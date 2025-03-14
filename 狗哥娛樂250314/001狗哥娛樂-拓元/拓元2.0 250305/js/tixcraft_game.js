const storage = chrome.storage.local;
var settings = null;
var myInterval = null;

$("div.masthead-wrap").remove();

function date_clean() //刪除無法購買的日期
{
    const rows = document.querySelectorAll('#gameList td');
    for (let i = 0; i < rows.length; i++) {
        if (['暫停販售', '截止', '已售完', '身心障礙'].some(keyword => rows[i].textContent.includes(keyword))) {
            rows[i].parentElement.remove();
        }
    }
}

function date_keyword(settings) //控制關鍵字選日期
{
    let date_keyword_array = [];
    if(settings) {
        if(settings.date_auto_select.date_keyword.length > 0) {
            if(settings.date_auto_select.date_keyword!='""') {
                date_keyword_array = JSON.parse('[' +  settings.date_auto_select.date_keyword +']');
            }
        }
    }
    let target_date=null;
    if(date_keyword_array.length) {
        for (let i = 0; i < date_keyword_array.length; i++) {
            let query_string = "#gameList td:contains('"+ date_keyword_array[i] +"')";
            if(date_keyword_array[i]=="") {
                query_string = "#gameList td"
            }
            let matched_block=[];
            $(query_string).each(function ()
            {
                matched_block.push($(this));
            });
            target_date = get_target_date_with_order(settings, matched_block);
            if (target_date) {
                console.log("match keyword:" + date_keyword_array[i]);
                break;
            }
        }
    } else {
        let query_string = "#gameList td";
        let matched_block=[];
        $(query_string).each(function ()
        {
            matched_block.push($(this));
        });
        target_date = get_target_date_with_order(settings, matched_block);
    }
    
    if (target_date) {
        let button_tag = "button";
        const currentUrl = window.location.href; 
        const domain = currentUrl.split('/')[2];
        if(domain=="ticketmaster.sg") {
            button_tag = "a";
        }

        let link = target_date.parent().find(button_tag).attr("data-href");
        if (link) {
            // 記錄開始時間
            const startTime = Date.now();
            chrome.storage.local.set({ order_start_time: startTime }, () => {
                clearInterval(myInterval);
                setTimeout(() => {
                    window.location.href = link;
                }, 0);  ////////////////////////////日期延遲
            });
        }
    } 
}

function date_main(settings)  //控制匹配關鍵字速度
{
    myInterval = setInterval(() => {
        date_keyword(settings);
    }, 100);
}

async function do_reload_if_not_overheat(settings) //控制刷新過熱
{
    let auto_reload_page_interval = settings.advanced.auto_reload_page_interval;
    const auto_reload_overheat_count = settings.advanced.auto_reload_overheat_count;
    const auto_reload_overheat_cd = settings.advanced.auto_reload_overheat_cd;
    chrome.storage.local.get('last_reload_timestamp', function(items) {
        if (items.last_reload_timestamp) {
            let new_timestamp = [];
            const now = new Date().getTime();
            const overheat_second = 2.5;
            for (let i = 0; i < items.last_reload_timestamp.length; i++) {
                let each_time = items.last_reload_timestamp[i];
                let current_diff = now - each_time;
                if (current_diff <= overheat_second * 1000) {
                    new_timestamp.push(each_time);
                }
            }
            if(new_timestamp.length >= auto_reload_overheat_count) {
                console.log("overheat, slow down!");
                auto_reload_page_interval = auto_reload_overheat_cd;
            }
            new_timestamp.push(now);
            chrome.storage.local.set({
                last_reload_timestamp: new_timestamp
            });
            if(auto_reload_page_interval == 0) {
                location.reload();
            } else {
                setTimeout(function () {
                    location.reload();
                }, auto_reload_page_interval * 1000);
            }
        }
    });
}

function date_auto_reload() //控制網頁刷新
{
    let reload=false;
    
    let button_tag = "button";
    const currentUrl = window.location.href; 
    const domain = currentUrl.split('/')[2];
    if(domain=="ticketmaster.sg") {
        button_tag = "a";
    }

    const query_string = "#gameList " + button_tag;
    if ($(query_string).length) {
        if (settings) {
            date_main(settings);
        }
    } else {
        reload=true;
    }
    
    if(reload) {
        if(settings) {
            do_reload_if_not_overheat(settings);
        }
    }
}

storage.get('settings', function (items)
{
    if (items.settings)
    {
        settings = items.settings;
    }
    date_clean();
});

storage.get('status', function (items)
{
    if (items.status && items.status=='ON')
    {
        date_auto_reload();
    } else {
        console.log('no status found');
    }
});
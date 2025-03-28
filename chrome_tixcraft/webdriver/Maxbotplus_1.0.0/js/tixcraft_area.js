const storage = chrome.storage.local;
var settings = null;

$("ul.area-list > li:not(:has(a))").remove();
$("#selectseat div div img").remove();
$("footer").remove();

function tixcraft_clean_exclude(settings) 
{
    let exclude_keyword_array = [];
    if(settings) {
        if(settings.keyword_exclude.length > 0) {
            if(settings.keyword_exclude != '""') {
                exclude_keyword_array = JSON.parse('[' + settings.keyword_exclude +']');
            }
        }
    }

    for (let i = 0; i < exclude_keyword_array.length; i++) {
        $("ul.area-list > li > a:contains('"+ exclude_keyword_array[i] +"')").each(function ()
        {
            $(this).parent().remove();
        }
        );
    }
}

function tixcraft_area_keyword(settings) 
{
    let area_keyword_array = [];
    if(settings) {
        if(settings.area_auto_select.area_keyword.length > 0) {
            if(settings.area_auto_select.area_keyword!='""') {
                area_keyword_array = JSON.parse('[' +  settings.area_auto_select.area_keyword +']');
            }
        }
    }
    // console.log(area_keyword_array);
    let target_area=null;
    if(area_keyword_array.length) {
        for (let i = 0; i < area_keyword_array.length; i++) {
            let query_string = "ul.area-list > li > a:contains('"+ area_keyword_array[i] +"')";
            if(area_keyword_array[i]=="") {
                query_string = "ul.area-list > li > a"
            }
            let matched_block=[];
            $(query_string).each(function ()
            {
                matched_block.push($(this));
            });
            target_area = get_target_area_with_order(settings, matched_block);
            if (target_area.length) {
                console.log("match keyword:" + area_keyword_array[i]);
                break;
            }
        }
    } else {
        let query_string = "ul.area-list > li > a";
        let matched_block=[];
        $(query_string).each(function ()
        {
            matched_block.push($(this));
        });
        target_area = get_target_area_with_order(settings, matched_block);
    }
    
    if (target_area) {
        let link_id = target_area.attr("id");
        //console.log("link_id: " + link_id);
        if(link_id) {
            let body = document.body.innerHTML;
            let areaUrlList = null;
            if(body.indexOf('var areaUrlList =')>-1) {
                const javasrit_right = body.split('var areaUrlList =')[1];
                let areaUrlHtml = "";
                if(javasrit_right) {
                    areaUrlHtml = javasrit_right.split("};")[0];
                }
                if(areaUrlHtml.length > 0) {
                    areaUrlHtml = areaUrlHtml + "}";
                    areaUrlList = JSON.parse(areaUrlHtml);
                }
                //console.log(areaUrlHtml);
            }
            
            let new_url = null;
            if(areaUrlList) {
                let new_url = areaUrlList[link_id];
                if (new_url) {
                    //console.log(new_url);
                    window.location.href = new_url
                }
            }
        }
    } else {
        console.log("not target_area found.")
    }
}

function tixcraft_area_main(settings) {
    if(settings) {
        //console.log("area_mode:"+ settings.area_auto_select.mode);
        //console.log("area_keyword:"+ settings.area_auto_select.area_keyword);
        //console.log("keyword_exclude:"+ settings.keyword_exclude);
        tixcraft_clean_exclude(settings);
        tixcraft_area_keyword(settings);
    }
}

async function do_reload_if_not_overheat(settings) {
    let auto_reload_page_interval = settings.advanced.auto_reload_page_interval;
    const auto_reload_overheat_count = settings.advanced.auto_reload_overheat_count;
    const auto_reload_overheat_cd = settings.advanced.auto_reload_overheat_cd;
    chrome.storage.local.get('last_reload_timestamp', function(items) {
        if (items.last_reload_timestamp) {
            let new_timestamp = [];
            const now = new Date().getTime();
            const overheat_second = 2.5;
            //for (let i = items.last_reload_timestamp.length - 1; i >= 0; i--) {
            for (let i = 0; i < items.last_reload_timestamp.length; i++) {
                let each_time = items.last_reload_timestamp[i];
                let current_diff = now - each_time;
                if (current_diff <= overheat_second * 1000) {
                    //last_reload_timestamp.splice(i, 1);
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

            //const rootElement = document.documentElement;
            //rootElement.remove();
            if(auto_reload_page_interval == 0) {
                //console.log('Start to reload now.');
                location.reload();
            } else {
                //console.log('We are going to reload after few seconeds.');
                setTimeout(function () {
                    location.reload();
                }, auto_reload_page_interval * 1000);
            }
        }
    });
}

function area_auto_reload()
{
    let reload=false;
    if ($("ul.area-list > li:has(a)").length) {
        if (settings)
        {
            tixcraft_area_main(settings);
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
});

storage.get('status', function (items)
{
    if (items.status && items.status=='ON')
    {
        area_auto_reload();
    } else {
        console.log('no status found');
    }
});

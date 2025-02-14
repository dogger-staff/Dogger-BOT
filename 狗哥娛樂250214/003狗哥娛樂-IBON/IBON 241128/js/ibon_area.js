const storage = chrome.storage.local; 
var settings = null;

//console.log("start ibon area");

// price row.
$("table.table > tbody > tr.disabled").remove();
$("table.table > tbody > tr.sold-out").remove();
$("div.map > div > img").remove();
$("footer").remove();

var $tr = $("table.table > tbody > tr[onclick]");
//console.log("$tr.length:"+$tr.length);
if ($tr.length == 1) {
    //console.log("$tr.html:"+$tr.html());
    $tr.click();
}

function ibon_area_ready(settings) {
    let area_keyword_array = [];
    if (settings) {
        if (settings.area_auto_select.area_keyword.length > 0) {
            if (settings.area_auto_select.area_keyword != '""') {
                area_keyword_array = JSON.parse('[' + settings.area_auto_select.area_keyword + ']');
            }
        }
    }

    let target_row = null;
    let all_row = $("table.table > tbody > tr[onclick]");
    if (all_row.length > 0) {
        if (all_row.length == 1) {
            // single select.
            target_row = all_row;
        } else {
            // multi select.
            let matched_rows = [];

            all_row.each(function () {
                let is_match_keyword = false;
                if (area_keyword_array.length) {
                    let html_text = $(this).text();
                    //console.log("html:"+html_text);

                    for (let i = 0; i < area_keyword_array.length; i++) {
                        if (html_text.indexOf(area_keyword_array[i]) > -1) {
                            is_match_keyword = true;
                            matched_rows.push($(this));
                            break;
                        }
                    }
                } else {
                    matched_rows.push($(this));
                }
            });

            // Apply mode sorting or selection logic
            if (settings && settings.area_auto_select.mode) {
                switch (settings.area_auto_select.mode) {
                    case "from top to bottom":
                        target_row = matched_rows[0];
                        break;
                    case "from bottom to top":
                        target_row = matched_rows[matched_rows.length - 1];
                        break;
                    case "center":
                        target_row = matched_rows[Math.floor(matched_rows.length / 2)];
                        break;
                    case "random":
                        target_row = matched_rows[Math.floor(Math.random() * matched_rows.length)];
                        break;
                    default:
                        target_row = matched_rows[0]; // Default to top
                        break;
                }
            } else {
                target_row = matched_rows[0]; // Default to top
            }
        }

        if (target_row) {
            // Add the selected row's ID to the hidden div
            let done_div = "<div style='display:none' id='maxbot'>" + target_row.attr("id") + "</div>";
            $("body").append(done_div);
        }
    } else {
        location.reload();
    }
}

function ibon_area_clean_exclude(settings) {
    let exclude_keyword_array = [];
    if (settings) {
        if (settings.keyword_exclude.length > 0) {
            if (settings.keyword_exclude != '""') {
                exclude_keyword_array = JSON.parse('[' + settings.keyword_exclude + ']');
            }
        }
    }
    for (let i = 0; i < exclude_keyword_array.length; i++) {
        $("table.table > tbody > tr").each(function () {
            let html_text = $(this).text();
            if (html_text.indexOf(exclude_keyword_array[i]) > -1) {
                $(this).remove();
            }
        });
    }
}

function ibon_area_main() {
    let reload = false;
    let $tr = $("table.table > tbody > tr[onclick]");
    if ($tr.length == 0) {
        reload = true;
    }
    if (reload) {
        let auto_reload_page_interval = 0.0;
        if (settings) {
            auto_reload_page_interval = settings.advanced.auto_reload_page_interval;
        }
        if (auto_reload_page_interval == 0) {
            location.reload();
        } else {
            console.log('We are going to reload after few seconds.');
            setTimeout(function () {
                location.reload();
            }, auto_reload_page_interval * 1000);
        }
    } else {
        ibon_area_clean_exclude(settings);
        ibon_area_ready(settings);
    }
}

storage.get('settings', function (items) {
    if (items.settings) {
        settings = items.settings;
    }
});

storage.get('status', function (items) {
    if (items.status && items.status == 'ON') {
        ibon_area_main();
    } else {
        console.log('no status found');
    }
});

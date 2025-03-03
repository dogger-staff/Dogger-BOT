const storage = chrome.storage.local;
var settings = null;

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
    } else {
        console.log('no status found');
    }
});

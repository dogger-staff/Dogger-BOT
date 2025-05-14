function get_target_area_with_order(settings, matched_block) {
    let target_area = null;

    if (matched_block.length) {
        let last_index = matched_block.length - 1;
        let center_index = parseInt(last_index / 2);
        let random_index = getRandom(0, last_index);

        if (settings.area_auto_select.mode == "from top to bottom") {
            target_area = matched_block[0];
        } else if (settings.area_auto_select.mode == "from bottom to top") {
            target_area = matched_block[last_index];
        } else if (settings.area_auto_select.mode == "center") {
            target_area = matched_block[center_index];
        } else if (settings.area_auto_select.mode == "random") {
            target_area = matched_block[random_index];
        } else if (settings.area_auto_select.mode == "most") {
            let bestScore = -1;

            matched_block.forEach(function ($el) {
                let text = $el.text();
                let score = 0;

                // 熱賣中最高優先
                if (text.includes("熱賣中")) {
                    score = 100000; // 給很高分確保優先
                } else {
                    // 嘗試取得「剩餘 xx」的數字
                    let match = text.match(/剩餘\s*(\d+)/);
                    if (match && match[1]) {
                        score = parseInt(match[1]);
                    }
                }

                if (score > bestScore) {
                    bestScore = score;
                    target_area = $el;
                }
            });
        }
    }

    return target_area;
}



function get_target_date_with_order(settings, matched_block)//控制日期選擇
{
    let target_area = null;

    if(matched_block.length) {
        let last_index = matched_block.length-1
        let center_index = 0;
        let random_index = 0;
        if(matched_block.length>1) {
            center_index = parseInt(last_index/2);
            random_index = getRandom(0,last_index)
        }
        if(settings.date_auto_select.mode=="from top to bottom")
            target_area = matched_block[0];
        if(settings.date_auto_select.mode=="from bottom to top")
            target_area = matched_block[last_index];
        if(settings.date_auto_select.mode=="center")
            target_area = matched_block[center_index];
        if(settings.date_auto_select.mode=="random")
            target_area = matched_block[random_index];
    }

    return target_area;
}

function getRandom(min,max){//控制隨機
    return Math.floor(Math.random()*(max-min+1))+min;
};
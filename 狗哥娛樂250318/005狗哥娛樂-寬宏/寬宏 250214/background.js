/*
 * extension process crashes or your extension is manually stopped at
 * chrome://serviceworker-internals
 */
'use strict';

chrome.runtime.onInstalled.addListener(function(){
    //console.log("onInstalled");

    let default_status='ON';
    chrome.action.setBadgeText({
        text: default_status
    });

    chrome.storage.local.set(
    {
        status: default_status
    }
    );
    
    const default_webserver_runing=false;

    fetch("data/settings.json")
    .then((resp) => resp.json())
    .then((settings) =>
    {
        chrome.storage.local.set(
        {
            settings: settings,
        }
        );
        console.log("dump settings.json to extension storage");
    }
    ).catch(error =>
    {
        console.log('error is', error)
    }
    );
});

chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((e) => {
  const msg = `Navigation blocked to ${e.request.url} on tab ${e.request.tabId}.`;
  //console.log(msg);
});

function set_status_to(flag)
{
    let nextState = 'ON';
    if(!flag) nextState = 'OFF';

    chrome.storage.local.set(
    {
        status: nextState
    }
    );

    chrome.action.setBadgeText({
        text: nextState
    });
}

chrome.action.onClicked.addListener(async (tab) => {
    chrome.storage.local.get('status', function (items)
    {
        let next_flag = true;
        if (items.status && items.status=='ON')
        {
            next_flag = false;
        }
        //console.log("next_flag:"+next_flag);
        set_status_to(next_flag);
    });
});

import heartbeatconnect from './modules/heartbeatconnect.js';

let heartbeatInterval;

async function runHeartbeat()
{
    //console.log("runHeartbeat");
    heartbeatconnect.start();
}

async function startHeartbeat()
{
    runHeartbeat().then(() =>
    {
        heartbeatInterval = setInterval(runHeartbeat, 1 * 1000);
    }
    );
}

async function stopHeartbeat()
{
    clearInterval(heartbeatInterval);
}

startHeartbeat();

async function ocr(data_url, image_data, tabId)
{
    //console.log("data_url:"+data_url);
    fetch(data_url,{
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          image_data: image_data
        })
    })
    .then(response =>
    {
        if (response.ok)
        {
            return response.json();
        }
        else if (response.status === 404)
        {
            let result_json={"answer": "", "fail": 'error 404'};
            //console.log(result_json);
            //sendResponse(result_json);
            return Promise.reject('error 404')
        }
        else
        {
            let result_json={"answer": "", "fail": response.status};
            //console.log(result_json);
            //sendResponse(result_json);
            return Promise.reject('some other error: ' + response.status)
        }
    }
    )
    .then((data) =>
    {
        if (data)
        {
            let result_json=data;
            console.log(result_json);
            //sendResponse(result_json);
            chrome.tabs.sendMessage(tabId, result_json);
        }
    }
    )
    .catch(error =>
    {
        //console.log('error is', error)
        let result_json={"answer": "", "fail": error};
        //console.log(result_json);
        //sendResponse(result_json);
    }
    );
}

// for avoid overheat.
chrome.storage.local.set(
{
    last_reload_timestamp: []
}
);


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    let request_json = request;
    let result_json={"answer": "pong from background"};
    if(request_json.action=="decrypt") {
        //console.log(typeof crypto_decrypt);
        let answer="";
        if(typeof crypto_decrypt === 'function') {
            answer=crypto_decrypt(request_json.data.text,request_json.data.key,request_json.data.iv);
        }
        result_json={"answer": answer};
        sendResponse(result_json);
    }

    if(request_json.action=="ocr") {
        const tabId = sender.tab.id;
        ocr(request_json.data.url, request_json.data.image_data, tabId);
    }

    if(request_json.action=="status") {
        result_json={"status": answer};
        const tabId = sender.tab.id;
        chrome.tabs.sendMessage(tabId, result_json);
    }

});



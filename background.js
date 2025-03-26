function initBadge() {
    chrome.storage.local.get('activeGrokAccount', (data) => {
        updateBadgeFromValue(data.activeGrokAccount);
    });
}

function updateBadgeFromValue(accountName) {
    if (accountName) {
        const badgeText = accountName.charAt(0).toUpperCase();
        chrome.action.setBadgeText({ text: badgeText });
        chrome.action.setBadgeBackgroundColor({ color: '#4285f4' });
    } else {
        chrome.action.setBadgeText({ text: '' });
    }
}

chrome.webRequest.onCompleted.addListener(
    (details) => {
        if (details.method === 'POST') {
            if ((details.url.includes('/conversations/') && details.url.includes('/responses')) || details.url.includes('/conversations/new')) {
                chrome.tabs.query({ url: '*://grok.com/*' }, function (tabs) {
                    tabs.forEach((tab) => {
                        chrome.tabs.sendMessage(tab.id, { action: 'refreshLimits' });
                    });
                });
            }
        }
    },
    { urls: ['*://grok.com/rest/*'] }
);

chrome.runtime.onStartup.addListener(initBadge);
chrome.runtime.onInstalled.addListener(initBadge);
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.activeGrokAccount) {
        updateBadgeFromValue(changes.activeGrokAccount.newValue);
    }
});

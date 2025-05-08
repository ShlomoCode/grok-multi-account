function formatDate(date) {
    const now = new Date();
    const diffMs = now - date;

    const minutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMs / 3600000);
    const days = Math.floor(diffMs / 86400000);

    const formatUnit = (value, singular, plural) => `לפני ${value} ${value === 1 ? singular : plural}`;

    if (hours < 1) return formatUnit(minutes, 'דקה', 'דקות');

    if (days < 1) {
        const remainingMinutes = minutes % 60;
        if (remainingMinutes === 0) return formatUnit(hours, 'שעה', 'שעות');
        return `${formatUnit(hours, 'שעה', 'שעות')} ו-${remainingMinutes} ${remainingMinutes === 1 ? 'דקה' : 'דקות'}`;
    }

    return formatUnit(days, 'יום', 'ימים');
}

function showStatus(message, isError = false) {
    const statusDiv = document.createElement('div');
    statusDiv.textContent = message;
    statusDiv.className = `status-message ${isError ? 'status-error' : 'status-success'}`;

    const statusMessages = document.getElementById('statusMessages');
    statusMessages.appendChild(statusDiv);

    setTimeout(() => {
        statusDiv.style.opacity = '0';
        setTimeout(() => statusDiv.remove(), 500);
    }, 3000);
}

function updateBadge(accountName) {
    if (!accountName) {
        chrome.action.setBadgeText({ text: '' });
        return;
    }

    chrome.action.setBadgeText({ text: accountName.charAt(0).toUpperCase() });
    chrome.action.setBadgeBackgroundColor({ color: '#4285f4' });
}

function reloadGrokTabs() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.url?.includes('grok.com')) {
            chrome.tabs.reload(tabs[0].id);
        }
    });
}

function createAccountElement(account, index) {
    const accountItem = document.createElement('div');
    accountItem.className = 'account-item';

    const accountInfo = document.createElement('div');
    accountInfo.className = 'account-info';

    const nameElement = document.createElement('div');
    nameElement.textContent = account.name;
    nameElement.className = 'account-name';

    const lastUsedElement = document.createElement('div');
    lastUsedElement.className = 'last-used';
    lastUsedElement.textContent = account.lastLogout ? `התנתק לאחרונה ${formatDate(new Date(account.lastLogout))}` : 'טרם התנתק';

    accountInfo.append(nameElement, lastUsedElement);

    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'buttons-container';

    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'מחק';
    deleteButton.className = 'delete-btn';
    deleteButton.addEventListener('click', () => deleteAccount(account.name));

    const switchButton = document.createElement('button');
    switchButton.textContent = 'החלף לחשבון זה';
    switchButton.className = 'switch-btn';
    switchButton.addEventListener('click', () => switchToAccount(account));

    buttonsContainer.append(deleteButton, switchButton);
    accountItem.append(accountInfo, buttonsContainer);

    return accountItem;
}

function updateAccountLogoutTime(newActiveAccountName) {
    chrome.storage.local.get(['grokAccounts', 'activeGrokAccount'], ({ grokAccounts = [], activeGrokAccount }) => {
        const currentTime = new Date().getTime();

        if (activeGrokAccount && activeGrokAccount !== newActiveAccountName) {
            const activeIndex = grokAccounts.findIndex((acc) => acc.name === activeGrokAccount);
            if (activeIndex !== -1) {
                grokAccounts[activeIndex].lastLogout = currentTime;
            }
        }

        chrome.storage.local.set(
            {
                grokAccounts,
                activeGrokAccount: newActiveAccountName,
            },
            () => updateBadge(newActiveAccountName)
        );
    });
}

function updateCookies(account) {
    chrome.cookies.getAll({}, (allCookies) => {
        const grokCookies = allCookies.filter((cookie) => cookie.domain === 'grok.com' || cookie.domain === '.grok.com' || cookie.domain.endsWith('.grok.com'));

        grokCookies.forEach((cookie) => {
            const cookieDomain = cookie.domain.startsWith('.') ? cookie.domain.substring(1) : cookie.domain;
            chrome.cookies.remove({
                url: `https://${cookieDomain}${cookie.path}`,
                name: cookie.name,
            });
        });

        account.cookies.forEach((cookie) => {
            const cookieDomain = cookie.domain.startsWith('.') ? cookie.domain.substring(1) : cookie.domain;

            const newCookie = {
                url: `https://${cookieDomain}${cookie.path}`,
                name: cookie.name,
                value: cookie.value,
                domain: cookie.domain,
                path: cookie.path,
                secure: cookie.secure,
                httpOnly: cookie.httpOnly,
                sameSite: cookie.sameSite,
            };

            if (cookie.expirationDate) {
                newCookie.expirationDate = cookie.expirationDate;
            }

            chrome.cookies.set(newCookie);
        });

        showStatus(`הוחלף לחשבון "${account.name}"`);
        reloadGrokTabs();
    });
}

function loadAccounts() {
    chrome.storage.local.get('grokAccounts', ({ grokAccounts = [] }) => {
        const accountsList = document.getElementById('accountsList');
        accountsList.innerHTML = '';

        if (grokAccounts.length === 0) {
            accountsList.innerHTML = '<p style="text-align: center;">אין חשבונות שמורים. הוסף חשבון חדש למטה.</p>';
            return;
        }

        const sortedAccounts = [...grokAccounts].sort((a, b) => (b.lastLogout || 0) - (a.lastLogout || 0));
        sortedAccounts.forEach((account, index) => {
            accountsList.appendChild(createAccountElement(account, index));
        });
    });
}

function switchToAccount(account) {
    updateAccountLogoutTime(account.name);
    updateCookies(account);
}

function deleteAccount(accountName) {
    if (confirm('האם אתה בטוח שברצונך למחוק חשבון זה?')) {
        chrome.storage.local.get(['grokAccounts', 'activeGrokAccount'], ({ grokAccounts = [], activeGrokAccount }) => {
            const accountIndex = grokAccounts.findIndex((acc) => acc.name === accountName);

            if (accountIndex === -1) {
                showStatus('לא נמצא חשבון למחיקה', true);
                return;
            }

            // Check if we're deleting the active account
            if (activeGrokAccount === accountName) {
                chrome.storage.local.set({ activeGrokAccount: null }, () => {
                    updateBadge(null);
                });
            }

            grokAccounts.splice(accountIndex, 1);
            chrome.storage.local.set({ grokAccounts }, () => {
                showStatus(`החשבון "${accountName}" נמחק בהצלחה`);
                loadAccounts();
            });
        });
    }
}

function saveAccount() {
    const accountName = document.getElementById('accountName').value.trim();

    if (!accountName) {
        alert('אנא הזן שם לחשבון');
        return;
    }

    chrome.cookies.getAll({ domain: 'grok.com' }, (grokCookies) => {
        chrome.storage.local.get(['grokAccounts', 'activeGrokAccount'], ({ grokAccounts = [] }) => {
            const existingIndex = grokAccounts.findIndex((acc) => acc.name === accountName);
            const currentTime = new Date().getTime();

            if (existingIndex !== -1) {
                if (!confirm(`חשבון בשם "${accountName}" כבר קיים. האם ברצונך לעדכן אותו?`)) return;
                grokAccounts[existingIndex].cookies = grokCookies;
                grokAccounts[existingIndex].lastLogout = currentTime;
            } else {
                grokAccounts.push({
                    name: accountName,
                    cookies: grokCookies,
                    lastLogout: currentTime,
                });

                chrome.storage.local.set({ activeGrokAccount: accountName }, () => {
                    updateBadge(accountName);
                });
            }

            chrome.storage.local.set({ grokAccounts }, () => {
                showStatus(`החשבון "${accountName}" נשמר בהצלחה`);
                document.getElementById('accountName').value = '';
                loadAccounts();
            });
        });
    });
}

async function deleteAllCookies() {
    const urls = ['https://grok.com', 'https://accounts.x.ai', 'https://x.ai'];
    let allCookies = (await Promise.all(urls.map((url) => chrome.cookies.getAll({ url })))).flat();
    for (const cookie of allCookies) {
        const url = `https://${cookie.domain.replace(/^\./, '')}${cookie.path}`;
        await chrome.cookies.remove({
            storeId: cookie.storeId,
            url,
            name: cookie.name,
        });
    }
}

async function addNewAccount() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const [currentTab] = tabs;
    
    await deleteAllCookies();
    await chrome.storage.local.set({ activeGrokAccount: null });
    updateBadge(null);

    if (currentTab?.url?.includes('grok.com')) {
        await chrome.tabs.update(currentTab.id, { url: 'https://accounts.x.ai/sign-in' });
    } else {
        await chrome.tabs.create({ url: 'https://accounts.x.ai/sign-in' });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadAccounts();
    document.getElementById('saveCurrentCookies').addEventListener('click', saveAccount);
    document.getElementById('addNewAccount').addEventListener('click', addNewAccount);

    chrome.storage.local.get('activeGrokAccount', ({ activeGrokAccount }) => {
        if (activeGrokAccount) updateBadge(activeGrokAccount);
    });
});

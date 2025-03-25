function createOrUpdateLimitCounter(remainingCount, waitTimeSeconds) {
    let counterText;
    let textColor;
    
    if (remainingCount > 0) {
        counterText = `${remainingCount} Messages Remaining`;
        textColor = '';
    } else {
        const resetTime = new Date(Date.now() + waitTimeSeconds * 1000);
        const hours = resetTime.getHours();
        const minutes = resetTime.getMinutes();
        const formattedTime = `${hours}:${minutes.toString().padStart(2, '0')}`;
        
        counterText = `No messages left. Reset at ${formattedTime}`;
        textColor = '#ff0000';
    }

    let counterElement = document.getElementById('grok-limit-counter');

    if (!counterElement) {
        counterElement = document.createElement('span');
        counterElement.id = 'grok-limit-counter';
        counterElement.style.cssText = `
            font-size: 13px;
            font-weight: bold;
            margin-right: 8px;
        `;

        const targetContainer = document.querySelector('.absolute.flex.flex-row.items-center.gap-0\\.5.ml-auto.end-3');
        if (targetContainer) {
            targetContainer.insertBefore(counterElement, targetContainer.firstChild);
        } else {
            return false;
        }
    }

    counterElement.textContent = counterText;
    counterElement.style.color = textColor;
    return true;
}

async function fetchRateLimits() {
    try {
        const response = await fetch('https://grok.com/rest/rate-limits', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                requestKind: 'DEFAULT',
                modelName: 'grok-3',
            }),
            credentials: 'include',
        });

        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }

        const data = await response.json();
        
        if (!createOrUpdateLimitCounter(data.remainingQueries, data.waitTimeSeconds)) {
            setTimeout(() => fetchRateLimits(), 1000);
        }
    } catch (error) {
        console.error('Error fetching rate limits:', error);
    }
}

function initializeWithObserver() {
    const targetElementExists = () => !!document.querySelector('.absolute.flex.flex-row.items-center.gap-0\\.5.ml-auto.end-3');

    if (targetElementExists()) {
        fetchRateLimits();
    }

    const observer = new MutationObserver((mutations, obs) => {
        if (targetElementExists()) {
            fetchRateLimits();
            obs.disconnect();
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'refreshLimits') {
        fetchRateLimits();
    }
});

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initializeWithObserver();
    });
} else {
    initializeWithObserver();
}
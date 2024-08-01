// ==UserScript==
// @name         YouTube Ad Blocker Enhanced
// @namespace    https://github.com/SonyPan82/YoutubeNOadd
// @version      0.1
// @description  An enhanced script to remove YouTube ads, including static ads and video ads.
// @match        *://*.youtube.com/*
// @exclude      *://accounts.youtube.com/*
// @exclude      *://www.youtube.com/live_chat_replay*
// @exclude      *://www.youtube.com/persist_identity*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=YouTube.com
// @grant        none
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';

    // Constants
    const AD_SELECTORS = {
        MASTHEAD: '#masthead-ad',
        HOMEPAGE_VIDEO: 'ytd-rich-item-renderer.style-scope.ytd-rich-grid-row #content:has(.ytd-display-ad-renderer)',
        PLAYER_OVERLAY: '.video-ads.ytp-ad-module',
        PROMO_RENDERER: 'tp-yt-paper-dialog:has(yt-mealbar-promo-renderer)',
        ENGAGEMENT_PANEL: 'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-ads"]',
        RELATED_ADS: '#related #player-ads',
        RELATED_VIDEOS: '#related ytd-ad-slot-renderer',
        SEARCH_PAGE: 'ytd-ad-slot-renderer',
        MEMBER_OVERLAY: 'ytd-popup-container:has(a[href="/premium"])',
        MOBILE_COMPANION: 'ytm-companion-ad-renderer'
    };

    const SCRIPT_ID = 'youtube-ad-blocker-enhanced';
    const DEBUG = false;

    // Utility functions
    const log = (msg) => {
        if (DEBUG) {
            console.log(`[${SCRIPT_ID}] ${new Date().toISOString()} - ${msg}`);
        }
    };

    const setRunFlag = (name) => {
        const style = document.createElement('style');
        style.id = name;
        (document.head || document.body).appendChild(style);
    };

    const getRunFlag = (name) => document.getElementById(name);

    const checkRunFlag = (name) => {
        if (getRunFlag(name)) {
            return true;
        }
        setRunFlag(name);
        return false;
    };

    // Ad removal functions
    const generateRemoveADCssText = (selectors) => {
        return Object.values(selectors).map(selector => `${selector}{display:none!important}`).join(' ');
    };

    const generateRemoveADHTMLElement = () => {
        if (checkRunFlag(`${SCRIPT_ID}-css`)) {
            log('Ad blocking CSS already generated');
            return;
        }

        const style = document.createElement('style');
        style.textContent = generateRemoveADCssText(AD_SELECTORS);
        (document.head || document.body).appendChild(style);
        log('Ad blocking CSS generated successfully');
    };

    // Touch event simulation
    const nativeTouch = function () {
        const touch = new Touch({
            identifier: Date.now(),
            target: this,
            clientX: 12,
            clientY: 34,
            radiusX: 56,
            radiusY: 78,
            rotationAngle: 0,
            force: 1
        });

        const touchStartEvent = new TouchEvent('touchstart', {
            bubbles: true,
            cancelable: true,
            view: window,
            touches: [touch],
            targetTouches: [touch],
            changedTouches: [touch]
        });

        const touchEndEvent = new TouchEvent('touchend', {
            bubbles: true,
            cancelable: true,
            view: window,
            touches: [],
            targetTouches: [],
            changedTouches: [touch]
        });

        this.dispatchEvent(touchStartEvent);
        this.dispatchEvent(touchEndEvent);
    };

    // Auto-play function
    const autoPlayAfterAd = () => {
        setInterval(() => {
            const video = document.querySelector('.ad-showing video') || document.querySelector('video');
            if (video && video.paused && video.currentTime < 1) {
                video.play().catch(e => log(`Auto-play error: ${e.message}`));
                log("Video auto-played");
            }
        }, 1000);
    };

    // Ad skipping function
    const skipAd = () => {
        try {
            const video = document.querySelector('.ad-showing video') || document.querySelector('video');
            const skipButton = document.querySelector('.ytp-ad-skip-button, .ytp-skip-ad-button, .ytp-ad-skip-button-modern');
            const shortAdMsg = document.querySelector('.video-ads.ytp-ad-module .ytp-ad-player-overlay, .ytp-ad-button-icon');

            // Remove premium popups
            document.querySelectorAll('ytd-popup-container').forEach(container => {
                if (container.querySelector('a[href="/premium"]')) {
                    container.remove();
                    log('Removed premium popup');
                }
            });

            // Handle backdrop
            const targetBackdrop = Array.from(document.querySelectorAll('tp-yt-iron-overlay-backdrop'))
                .find(backdrop => backdrop.style.zIndex === '2201');
            if (targetBackdrop) {
                targetBackdrop.className = '';
                targetBackdrop.removeAttribute('opened');
                log('Closed overlay backdrop');
            }

            if (video && (skipButton || shortAdMsg) && !window.location.href.includes('https://m.youtube.com/')) {
                video.muted = true;
            }

            if (skipButton && video.currentTime > 0.5) {
                video.currentTime = video.duration;
                log('Skipped button ad');
                return;
            }

            if (skipButton) {
                skipButton.click();
                nativeTouch.call(skipButton);
                log('Clicked skip button');
            } else if (shortAdMsg && video.currentTime > 0.5) {
                video.currentTime = video.duration;
                log('Forced ad end');
            }
        } catch (error) {
            log(`Error in skipAd: ${error.message}`);
        }
    };

    // Main ad removal function
    const removePlayerAD = () => {
        if (checkRunFlag(`${SCRIPT_ID}-player`)) {
            log('Player ad removal already running');
            return;
        }

        const startObserve = () => {
            const targetNode = document.querySelector('.video-ads.ytp-ad-module');
            if (!targetNode) {
                log('Searching for ad module node');
                return false;
            }

            const observer = new MutationObserver(skipAd);
            observer.observe(targetNode, {
                childList: true,
                subtree: true
            });
            setInterval(skipAd, 1000);
            log('Ad observer started');
        };

        const observeInterval = setInterval(() => {
            if (document.querySelector('.video-ads.ytp-ad-module')) {
                startObserve();
                clearInterval(observeInterval);
            }
        }, 1000);

        log('Player ad removal initialized');
    };

    // Main function
    const main = () => {
        generateRemoveADHTMLElement();
        removePlayerAD();
        autoPlayAfterAd();
    };

    // Run the script
    if (document.readyState === 'loading') {
        log('Script will run on DOMContentLoaded');
        document.addEventListener('DOMContentLoaded', main);
    } else {
        log('Script running immediately');
        main();
    }

    // Handle navigation changes (for single-page applications)
    let lastUrl = location.href;
    new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            main();
        }
    }).observe(document, {
        subtree: true,
        childList: true
    });

})();

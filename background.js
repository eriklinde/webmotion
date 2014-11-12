/**

Part of the WebMotion (http://www.webmotion.info/) Chrome Extension,
built by Erik Linde. WebMotion highlights one letter in every link, and lets
users follow that link by pressing it on their keyboard
(a.k.a. mouseless web surfing)

This file contains the code for the popup menu that goes in the web browser toolbar.
Let's users enable / disable WebMotion, as well as disable WebMotion on certain sites

Runs when chrome starts; contains the code to communicate with Chrome's background services.

*/




// these will be fetched from Chrome Storage when Chrome launches, and only changed
// upon callback when we update the storage (ie we don't have to keep calling the storage. Can keep them locally.)
var blockedRootDomains;
var blockedFullDomains;
var blockedPages;


chrome.storage.sync.get(['blockedRootDomains', 'blockedFullDomains', 'blockedPages'], function(items) {
	if (items.blockedRootDomains === undefined || items.blockedFullDomains === undefined || items.blockedPages === undefined) {
		// The very first time a user uses WebMotion
		chrome.storage.sync.set({'blockedRootDomains': webMotionHelpers.defaultForbiddenDomains,
			'blockedFullDomains': [],
			'blockedPages': []},
			function() {}
		);
	}
	else {
		// Normal usage. Whenever chrome is started.
		blockedRootDomains = items.blockedRootDomains;
		blockedFullDomains = items.blockedFullDomains;
		blockedPages = items.blockedPages;
	}
});


chrome.storage.onChanged.addListener(function(changes, areaName) {
	if (changes.hasOwnProperty('blockedRootDomains') && changes.blockedRootDomains.hasOwnProperty('newValue')) {
		blockedRootDomains = changes.blockedRootDomains.newValue;
	}
	if (changes.hasOwnProperty('blockedFullDomains') && changes.blockedFullDomains.hasOwnProperty('newValue')) {
		blockedFullDomains = changes.blockedFullDomains.newValue;
	}
	if (changes.hasOwnProperty('blockedPages') && changes.blockedPages.hasOwnProperty('newValue')) {
		blockedPages = changes.blockedPages.newValue;
	}
})


chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	if (request.msg == 'new_tab_follow') {
		chrome.tabs.create({url: request.url, active: true, index: sender.tab.index + 1}, function(tab) {
		});
	}
	else if (request.msg == 'new_tab_no_follow') {
		chrome.tabs.create({url: request.url, active: false, index: sender.tab.index + 1}, function(tab) {
		});
	}
	else if (request.msg == 'close_selected_tab') {
		chrome.tabs.getSelected(function(tab) {
			var indexOfCurrentTab = tab.index;
			chrome.tabs.remove(tab.id);
		});
	}
	else if (request.msg == 'add_to_block_list') {
		chrome.tabs.getSelected(function(tab) {
			if (request.type == 'fullDomain') {
				if (!(blockedFullDomains.containsString(webMotionHelpers.extractFullDomainFromURL(tab.url)))) {
					// only add if it's not already there
					blockedFullDomains.push(webMotionHelpers.extractFullDomainFromURL(tab.url));
					deactivateRelevantTabsAfterAddingToBlockList({'url' : webMotionHelpers.extractFullDomainFromURL(tab.url), 'type' : 'fullDomain'})
					chrome.storage.sync.set({'blockedFullDomains': blockedFullDomains}, function() {});
				}
			}
			else if (request.type == 'rootDomain') {
				if (!(blockedRootDomains.containsString(webMotionHelpers.extractRootDomainFromURL(tab.url)))) {
					// only add if it's not already there
					blockedRootDomains.push(webMotionHelpers.extractRootDomainFromURL(tab.url));
					deactivateRelevantTabsAfterAddingToBlockList({'url' : webMotionHelpers.extractRootDomainFromURL(tab.url), 'type' : 'rootDomain'})
					chrome.storage.sync.set({'blockedRootDomains': blockedRootDomains}, function() {});
				}
			}
			else if (request.type == 'page') {
				if (!(blockedPages.containsString(tab.url))) {
					// only add if it's not already there
					blockedPages.push(tab.url);
					deactivateRelevantTabsAfterAddingToBlockList({'url' : tab.url, 'type' : 'page'})
					chrome.storage.sync.set({'blockedPages': blockedPages}, function() {});
				}
			}
		});
	}
	else if (request.msg == 'remove_from_block_list') {
		chrome.tabs.getSelected(function(tab) {
			if (request.type == 'fullDomain') {
				if ((blockedFullDomains.containsString(webMotionHelpers.extractFullDomainFromURL(tab.url)))) {
					var index = blockedFullDomains.indexOf(webMotionHelpers.extractFullDomainFromURL(tab.url));
					if (index > -1) {
 					   blockedFullDomains.splice(index, 1);
					}
					chrome.storage.sync.set({'blockedFullDomains': blockedFullDomains}, function() {
						activateRelevantTabsAfterRemovingFromBlockList({'url' : webMotionHelpers.extractFullDomainFromURL(tab.url), 'type' : 'fullDomain'});
					});
				}
			}
			else if (request.type == 'rootDomain') {
				if ((blockedRootDomains.containsString(webMotionHelpers.extractRootDomainFromURL(tab.url)))) {
					var index = blockedRootDomains.indexOf(webMotionHelpers.extractRootDomainFromURL(tab.url));
					if (index > -1) {
 					   blockedRootDomains.splice(index, 1);
					}
					chrome.storage.sync.set({'blockedRootDomains': blockedRootDomains}, function() {
						activateRelevantTabsAfterRemovingFromBlockList({'url' : webMotionHelpers.extractRootDomainFromURL(tab.url), 'type' : 'rootDomain'});
					});
				}
			}
			else if (request.type == 'page') {
				if ((blockedPages.containsString(tab.url))) {
					var index = blockedPages.indexOf(tab.url);
					if (index > -1) {
 					   blockedPages.splice(index, 1);
					}
					chrome.storage.sync.set({'blockedPages': blockedPages}, function() {
						activateRelevantTabsAfterRemovingFromBlockList({'url' : tab.url, 'type' : 'page'});
					});
				}
			}
		});
	}


	else if (request.msg == 'step_tabs') {
		chrome.tabs.getSelected(function(currentTab) {
			chrome.tabs.getAllInWindow(currentTab.windowId, function(tabCollection) {
				chrome.tabs.update(currentTab.id, {active: false, selected: false, highlighted: false});
				if (request.direction == 'left') {
					if (currentTab.index == 0) {
						chrome.tabs.update(tabCollection[tabCollection.length - 1].id, {active: true, selected: true, highlighted: true});
					}
					else {
						chrome.tabs.update(tabCollection[currentTab.index - 1].id, {active: true, selected: true, highlighted: true});
					}
				}
				else if (request.direction == 'right') {
					if (currentTab.index == tabCollection.length - 1) {
						chrome.tabs.update(tabCollection[0].id, {active: true, selected: true, highlighted: true});
					}
					else {
						chrome.tabs.update(tabCollection[currentTab.index + 1].id, {active: true, selected: true, highlighted: true});
					}
				}
			});
		});
	}
	else if (request.msg == 'get_viewport_dimensions') {
		sendResponse({height: sender.tab.height, width: sender.tab.width});
	}
	else if (request.msg == 'extract_domain') {
		sendResponse({fullDomain: webMotionHelpers.extractFullDomainFromURL(request.data), rootDomain:webMotionHelpers.extractRootDomainFromURL(request.data)});
	}
	else if (request.msg == 'update_all_icons') {
		// updates color for all icons in every tab
		chrome.windows.getAll({populate: true}, function(windowCollection) {
			for(var i = 0; i <= windowCollection.length - 1; i++) {
				for(var j = 0; j <= windowCollection[i].tabs.length - 1; j++) {
					if (request.active) {
						//set to 'active', ie colored version
						chrome.browserAction.setIcon({path:"icon38.png", tabId:windowCollection[i].tabs[j].id});
					}
					else {
						// set to black and white version (inactive)
						chrome.browserAction.setIcon({path:"icon38_bw.png", tabId:windowCollection[i].tabs[j].id});
					}
				}
			}
		});
	}
	else if (request.msg == 'change_webmotion_active_status') {
		chrome.windows.getAll({populate: true}, function(windowCollection) {
			for(var i = 0; i <= windowCollection.length - 1; i++) {
				for(var j = 0; j <= windowCollection[i].tabs.length - 1; j++) {
					if (request.active) {
						var localBlocks = new Object();
						localBlocks.blockedRootDomains = blockedRootDomains;
						localBlocks.blockedFullDomains = blockedFullDomains;
						localBlocks.blockedPages = blockedPages;

						if (!(webMotionHelpers.isURLBlocked(windowCollection[i].tabs[j].url, localBlocks))) {
							chrome.tabs.executeScript(windowCollection[i].tabs[j].id, {code: "webMotionHelpers.activateWebMotion(true, true);"}, function() {});
						}
						else {
							// if blocked, just initialize the h, l keys.
							chrome.tabs.executeScript(windowCollection[i].tabs[j].id, {code: "webMotionHelpers.initializeAlwaysOnKeyListeners();"}, function() {});
						}
					}
					else {
						chrome.tabs.executeScript(windowCollection[i].tabs[j].id, {code: "webMotionHelpers.deactivateWebMotion(true);"}, function() {});
					}
				}
			}
		});
	}
	else if (request.msg == 'get_local_blocks') {
		// this is extremely quick as we do not go via the local storage.
		// we assume that the local variables blockedFullDomains and blockedPages are up-to-date.
		sendResponse({'blockedRootDomains' : blockedRootDomains, 'blockedFullDomains' : blockedFullDomains, 'blockedPages' : blockedPages});
	}

});

function deactivateRelevantTabsAfterAddingToBlockList(urlObj) {
	chrome.windows.getAll({populate: true}, function(windowCollection) {
		for(var i = 0; i <= windowCollection.length - 1; i++) {
			for(var j = 0; j <= windowCollection[i].tabs.length - 1; j++) {
				if (urlObj.type == 'fullDomain') {
					if (webMotionHelpers.extractFullDomainFromURL(windowCollection[i].tabs[j].url) == urlObj.url) {
						chrome.tabs.executeScript(windowCollection[i].tabs[j].id, {code: "webMotionHelpers.deactivateWebMotion(false);"}, function() {});
					}
				}
				else if (urlObj.type == 'rootDomain') {
					if (webMotionHelpers.extractRootDomainFromURL(windowCollection[i].tabs[j].url) == urlObj.url) {
						chrome.tabs.executeScript(windowCollection[i].tabs[j].id, {code: "webMotionHelpers.deactivateWebMotion(false);"}, function() {});
					}
				}
				else if (urlObj.type == 'page') {
					if (windowCollection[i].tabs[j].url == urlObj.url) {
						chrome.tabs.executeScript(windowCollection[i].tabs[j].id, {code: "webMotionHelpers.deactivateWebMotion(false);"}, function() {});
					}
				}
			}
		}
	});
}

function activateRelevantTabsAfterRemovingFromBlockList(urlObj) {
	chrome.windows.getAll({populate: true}, function(windowCollection) {
		for(var i = 0; i <= windowCollection.length - 1; i++) {
			for(var j = 0; j <= windowCollection[i].tabs.length - 1; j++) {
				// we need to manually supply the blocklist to webMotionHelpers as it may not have been initialized.
				var localBlocks = new Object();
				localBlocks.blockedRootDomains = blockedRootDomains;
				localBlocks.blockedFullDomains = blockedFullDomains;
				localBlocks.blockedPages = blockedPages;
				if (urlObj.type == 'fullDomain') {
					if (webMotionHelpers.extractFullDomainFromURL(windowCollection[i].tabs[j].url) == urlObj.url && !(webMotionHelpers.isURLBlocked(windowCollection[i].tabs[j].url, localBlocks))) {
						chrome.tabs.executeScript(windowCollection[i].tabs[j].id, {code: "webMotionHelpers.activateWebMotion(true, false);"}, function() {});
					}
				}
				else if (urlObj.type == 'rootDomain') {
					if (webMotionHelpers.extractRootDomainFromURL(windowCollection[i].tabs[j].url) == urlObj.url && !(webMotionHelpers.isURLBlocked(windowCollection[i].tabs[j].url, localBlocks))) {
						chrome.tabs.executeScript(windowCollection[i].tabs[j].id, {code: "webMotionHelpers.activateWebMotion(true, false);"}, function() {});
					}
				}
				else if (urlObj.type == 'page') {
					if (windowCollection[i].tabs[j].url == urlObj.url && !(webMotionHelpers.isURLBlocked(windowCollection[i].tabs[j].url, localBlocks))) {
						chrome.tabs.executeScript(windowCollection[i].tabs[j].id, {code: "webMotionHelpers.activateWebMotion(true, false);"}, function() {});
					}
				}
			}
		}
	});
}


Array.prototype.containsString=function(str) {
	return $.inArray(str, this) != -1;
}


chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	// var response = null;
	if (request.msg == 'new_tab_follow') {
		// console.log(sender);
		// console.log(sender.tab);
		// console.log(sender.tab.index);
		chrome.tabs.create({url: request.url, active: true, index: sender.tab.index + 1}, function(tab) {
			// spawnedTabs[tab.id] = sender.tab.id;
		});
	}
	else if (request.msg == 'new_tab_no_follow') {
		chrome.tabs.create({url: request.url, active: false, index: sender.tab.index + 1}, function(tab) {
			// spawnedTabs[tab.id] = sender.tab.id;
		});
	}
	else if (request.msg == 'close_selected_tab') {
		chrome.tabs.getSelected(function(tab) {
			var indexOfCurrentTab = tab.index;
			chrome.tabs.remove(tab.id);
			// spawnedTabs[tab.id] = sender.tab.id;
			// delete spawnedTabs[tab.id];
			// chrome.tabs.update(spawnedTabs[tab.id], {active: true, selected: true, highlighted: true});					
			// chrome.tabs.update(spawnedTabs[tab.id], {active: true, selected: true, highlighted: true});					
		});
	}
	else if (request.msg == 'step_tabs') {
		chrome.tabs.getSelected(function(currentTab) {
			chrome.tabs.getAllInWindow(currentTab.windowId, function(tabCollection) {
				// console.log(tabCollection);
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
		// chrome.browserAction.setIcon({path:"icon38_bw.png", tabId:sender.tab.id});
		// alert(_webMotionHelpers);
		sendResponse({height: sender.tab.height, width: sender.tab.width});
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
});


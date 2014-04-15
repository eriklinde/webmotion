// holds a collection of all the tabs we spawn so that we can keep track of their parents.
// var spawnedTabs = new Object;

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
		sendResponse({height: sender.tab.height, width: sender.tab.width});
	}
});
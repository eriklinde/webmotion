(function () {
	chrome.storage.local.get(function(response) {		
		if (!(response.inactive)) {
			chrome.runtime.sendMessage({msg: 'get_local_blocks'}, function(response) {
				webMotionHelpers.terminateAllEventHandlers(true);
				webMotionHelpers.blockedRootDomains = response.blockedRootDomains;
				webMotionHelpers.blockedFullDomains = response.blockedFullDomains;
				webMotionHelpers.blockedPages = response.blockedPages;
				var urlBlocked = webMotionHelpers.isURLBlocked(window.location.href);
				webMotionHelpers.initializeStandardKeyListeners();
				webMotionHelpers.initializeAlwaysOnKeyListeners();
				$(document).ready(function() {
					if (window.location.href == 'http://www.webmotion.info/') {
						$('#highlighted').replaceWith('r');
					}
					if (!(urlBlocked)) {
						webMotionHelpers.activateWebMotion(false, false);							
					}
				});

			});				
		}
		else {
			chrome.runtime.sendMessage({msg: 'update_all_icons', active: false}, function(response) {});
		}
	});

	// more "readable" versions of basic javascript functions
	String.prototype.replaceAt=function(index, character) {
		return this.substr(0, index) + character + this.substr(index+1);
	}
	String.prototype.containsString=function(str) {
		return this.indexOf(str) != -1
	}
	Array.prototype.containsString=function(str) {
		return $.inArray(str, this) != -1
	}

})();
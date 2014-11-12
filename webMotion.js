/**

Part of the WebMotion (http://www.webmotion.info/) Chrome Extension,
built by Erik Linde. WebMotion highlights one letter in every link, and lets
users follow that link by pressing it on their keyboard
(a.k.a. mouseless web surfing)

Initiates WebMotion when user goes to a new website.

*/

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

	// Syntactic sugar
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

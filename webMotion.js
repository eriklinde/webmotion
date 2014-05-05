
// WebMotion - A Chrome extension for simple, mouseless web browsing



// REMAINING TODO THINGS
// TODO: Make it be able to process links with HTML-escaped characters, example: "TV & Media", or "Tag name: <input>". Currently disregarding these.
// Make sure it works here: http://www.teslamotors.com/blog/when-life-gives-you-lemons
// make sure that the only shortcut links that work for a "non working" domain are the h and l keys.
// For already traveled link : use the traveled link color?
// aftonbladet
// callback när man klickar
// langst ner: pilen gor att det inte funkar: http://donmelton.com/2014/04/10/memories-of-steve/
// for google, kanske ta bort fokus från html och lägga någon annanstans så att man kan navigera?
// If many links point to the same location, and have the same name, such as a user name, then use that same name / letter as in the first one.

// customize vilka tangenter som ska ha vilken konfiguration. Piltangenterna ska oxå funka.
// ampersand http://www.gogreenlights.co.uk/moreinfo.html

// customiza färgen
// discreet mode.

// kanske enbart det översta text input field måste highlightas
// textfield boxes (just do the first one)
// detect facebook box.

(function () {
	
	// Initializes certain listeners needed
	
	
		// chrome.runtime.sendMessage({msg: 'alert_keep_track'}, function(response) {});
		// var stat = Date.now();
		// console.log(Date.now());
		
		// chrome.runtime.sendMessage({msg: 'print_time', active: false}, function(response) {});
	chrome.storage.local.get(function(response) {
		
		if (response.active) {
			chrome.runtime.sendMessage({msg: 'get_local_blocks'}, function(response) {
				console.log('OBTAINED BLOCKLIST');
				console.log(response);
				webMotionHelpers.blockedRootDomains = response.blockedRootDomains;
				webMotionHelpers.blockedFullDomains = response.blockedFullDomains;
				webMotionHelpers.blockedPages = response.blockedPages;
				var urlBlocked = webMotionHelpers.isURLBlocked(window.location.href);
				if (!(urlBlocked)) {
					webMotionHelpers.initializeKeyListeners();
				}
				
				$(document).ready(function() {
					if (!(urlBlocked)) {
						webMotionHelpers.activateWebMotion();
					}
				});

			});				
		}
		else {
			chrome.runtime.sendMessage({msg: 'update_all_icons', active: false}, function(response) {});
		}
	});
	

	// chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	//      First, validate the message's structure 
	    
	//     if (request.from && (request.from === "popup")) {




	//         sendResponse(999);
	//     }
	// });



	// "more readable versions of basic javascript methods"
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
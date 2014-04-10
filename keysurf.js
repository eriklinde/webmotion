// TODO: Make it be able to process links with HTML-escaped characters, example: "TV & Media", or "Tag name: <input>". Currently disregarding these.
// Make sure it works here: http://www.teslamotors.com/blog/when-life-gives-you-lemons
(function () {
	var timeouts = []; //contains the ID's of all setTimeouts.
	
	var modifiableLinks = []; // simply a collection of the current pages links
	var viewportHeight;

	// here we will keep track of the two most recently pressed keypresses. Alphanumeric only.
	var keyPresses = [{character: 'dummy1', timeStamp: 100000, timeOutID: null},{character: 'dummy2', timeStamp: 200000, timeOutID: null},{character: 'dummy3', timeStamp: 300000, timeOutID: null}];

	// Initializes certain listeners needed
	keysurfHelpers.initializeSpecialKeyListeners();
	keysurfHelpers.initializeFocusBlurListeners();
	initializeWindowScrollListener();
	
	$(document).ready(function() {
		chrome.runtime.sendMessage({msg: 'get_viewport_height'}, function(response) {
			keysurfHelpers.viewPortHeight = response;
			processLinks();
		});
	});

	$(document).on('keypress', 'html', function(e) {
		var pressedChar = String.fromCharCode(e.keyCode).toLowerCase();
		if (keysurfHelpers.isAlphanumeric(pressedChar)) {
			handleAlphaNumericKeyPress(pressedChar);
		}
	});

	function processLinks() {		
		// Check to make sure we are not on Google, Facebook, Twitter, etc. They have their own shortcut system.
		if (keysurfHelpers.isDomainAllowed()) {
			modifiableLinks = [];
			keysurfHelpers.takenAbbreviations = [];
			resetAllLinks();
			// Gather all the links we (potentially) need to modify
			modifiableLinks = gatherLegitimateLinks();
			modifiableLinks = sortLinkSetByFontSize(modifiableLinks);

			
			// process each link (ie, figure out which letter to be the shortcut, alter the underlying html, etc)
			for (i=0; i <= modifiableLinks.length - 1; i++) {
				keysurfHelpers.analyzeAndModifyLink(modifiableLinks[i].linkObj);
			}
		}
	}

	function handleAlphaNumericKeyPress(pressedChar) {		
		if (keysurfHelpers.noInputFieldsActive()) {
			if (keysurfHelpers.reservedShortcuts.containsString(pressedChar)) {
				// user pressed one of the 'reserved keys', example hjkl
				switch(pressedChar)
				{	
					case 'x':
					chrome.runtime.sendMessage({msg: 'close_selected_tab'}, function(response) {});
					break;
					case 'j':
					keysurfHelpers.scrollWindow(300);
					break;
					case 'k':
					keysurfHelpers.scrollWindow(-300);
					break;
					case 'b':
					window.history.go(-1);
					break;
					// case 'f':
					// window.history.go(+1);
					// break;
					case 'h':
					chrome.runtime.sendMessage({msg: 'step_tabs', direction: 'left'}, function(response) {});
					break;
					case 'l':
					chrome.runtime.sendMessage({msg: 'step_tabs', direction: 'right'}, function(response) {});
					break;
					default:
					break;
				}
			}	
			else if (keysurfHelpers.isDomainAllowed()) {
				// user pressed 'red' key (ie not one of the reserved keys)
				// first push the key to the keylog
				resetAllTimeOuts();
				keyPresses.push({character: pressedChar, timeStamp: Date.now(), timeOutID: null});
				if (keyPresses[keyPresses.length - 1].character != keyPresses[keyPresses.length - 2].character) {
					// "new" character was pressed
					// first reset all timeouts. For example if we press w w and then e, we don't really care what happened
					// previously. It should already have been executed (true?)
					// Then set a timeout (and push the timeoutID to the timeouts array); if timeout passes without 
					// interference, cancel all timeouts and go to link in current window
					
					var timeOutID = window.setTimeout(function(localChar) {
						resetKeyPresses();
						window.location = keysurfHelpers.keyMap[localChar];	
					}, 300, pressedChar);
					keyPresses[keyPresses.length - 1].timeOutID = timeOutID;
				}
				else if ((keyPresses[keyPresses.length - 1].character == keyPresses[keyPresses.length - 2].character) && (keyPresses[keyPresses.length - 2].character != keyPresses[keyPresses.length - 3].character)) {
					
					
					if (keyPresses[keyPresses.length - 1].timeStamp - keyPresses[keyPresses.length - 2].timeStamp < 300) {
						// set new timeout to go to link in NEW tab, and wait 500 ms before executing (waiting for third click.)
						var timeOutID = window.setTimeout(function(localChar) {
							// open in new tab, and follow
							resetKeyPresses();
							chrome.runtime.sendMessage({msg: 'new_tab_follow', url: keysurfHelpers.keyMap[pressedChar]}, function(response) {});
						}, 300, pressedChar);
						keyPresses[keyPresses.length - 1].timeOutID = timeOutID;
					}
					else {
						//consider this identical to the first one, ie consider the keys separate despite they were the same
						// set timeout to follow link in THIS tab.
						var timeOutID = window.setTimeout(function(localChar) {
							resetKeyPresses();
							window.location = keysurfHelpers.keyMap[localChar];
						}, 300, pressedChar);
						keyPresses[keyPresses.length - 1].timeOutID = timeOutID;
					}
				}
				else if ((keyPresses[keyPresses.length - 1].character == keyPresses[keyPresses.length - 2].character) && (keyPresses[keyPresses.length - 2].character == keyPresses[keyPresses.length - 3].character)) {					
					if (keyPresses[keyPresses.length - 1].timeStamp - keyPresses[keyPresses.length - 2].timeStamp < 300) {
						//note that this 500 + the previosu 500 must add up to 1000?
						// clear keypresses + open up in new tab (don't follow tab)
						// no timer necessary
						resetKeyPresses();	
						chrome.runtime.sendMessage({msg: 'new_tab_no_follow', url: keysurfHelpers.keyMap[pressedChar]}, function(response) {});
					}
					else {
						//consider this identical to the first one, ie consider the keys separate despite they were the same
						// set timeout to follow link in THIS tab.
						var timeOutID = window.setTimeout(function(localChar) {
							resetKeyPresses();
							window.location = keysurfHelpers.keyMap[localChar];
						}, 300, pressedChar);
						keyPresses[keyPresses.length - 1].timeOutID = timeOutID;
					}
				}
			}							
		} 
	}

	function resetKeyPresses() {
		// removes everything except the first 3 dummy elements.
		// never reset keypresses without resetting timeouts first
		keyPresses.splice(3);
	}

	function resetAllTimeOuts() {
		// never reset keypresses without resetting timeouts first
		for (var i = 0; i <= keyPresses.length - 1; i++) {
			if (keyPresses[i].timeOutID != null) {
				clearTimeout(keyPresses[i].timeOutID);
				keyPresses[i].timeOutID = null;
			}
		}					
	}

	function resetAllLinks() {
		$('keysurf').each(function(index, value) {
			$(this).replaceWith($(this).text());		
		});
	}

	function gatherLegitimateLinks() {
		var modifiableLinks = [];
		$('a:visible').each(function(index) {				
			if (keysurfHelpers.isLinkLegitimate($(this))) {
				var link = {linkObj:$(this), fontSize: parseInt($(this).css('font-size')), shortCut:"", originalOrder:index, absoluteURL: $(this).prop("href")};
				modifiableLinks.push(link);
			}		
		});
		// modifiableLinks = modifiableLinks.is(":visible");
		return modifiableLinks;
	}

	function sortLinkSetByFontSize(modifiableLinks) {
		modifiableLinks.sort(function(a,b){
			if(a.fontSize === b.fontSize)
			{
				var x = a.originalOrder, y = b.originalOrder;
				return x < y ? -1 : x > y ? 1 : 0;
			}
			return b.fontSize - a.fontSize;
		});	
		return modifiableLinks;
	}

	function initializeWindowScrollListener() {
		$(window).scroll(function() {
			clearTimeout($.data(this, 'scrollTimer'));
			$.data(this, 'scrollTimer', setTimeout(function() {
        		// do something
        		processLinks();
        	}, 50));
		});
	}


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

// WebMotion - A Chrome extension for simple, mouseless web browsing

// TODO: Make it be able to process links with HTML-escaped characters, example: "TV & Media", or "Tag name: <input>". Currently disregarding these.
// Make sure it works here: http://www.teslamotors.com/blog/when-life-gives-you-lemons
// make sure that the only shortcut links that work for a "non working" domain are the h and l keys.
// For already traveled link : use the traveled link color?
// aftonbladet
// callback när man klickar
// langst ner: pilen gor att det inte funkar: http://donmelton.com/2014/04/10/memories-of-steve/
// for google, kanske ta bort fokus från html och lägga någon annanstans så att man kan navigera?

// http://www.techstars.com/ why is letters being capitlized
// "add current domain to blocked sites"
// missar första keypress på de flesta sidor, eller?

// vill den ska funka på Gmail.
// customize vilka tangenter som ska ha vilken konfiguration. Piltangenterna ska oxå funka.
// ampersand http://www.gogreenlights.co.uk/moreinfo.html
// alt knappen ska växla, ej behöva hålla ner
// mät även om länkarna är synliga i sidled
// scrolla smoothare
// customiza färgen
// installningar att underline, bold, färg...
// w går av / på för alla sidor. 
// Först o främst hitta tangenter i närheten av HJKL
// kanske enbart det översta text input field måste highlightas
// textfield boxes (just do the first one)
// detect facebook box.

(function () {
	var timeouts = []; //contains the ID's of all setTimeouts.
	
	var modifiableLinks = []; // simply a collection of the current pages links
	var modifiableLinksAlt = [];
	var viewportHeight;

	// here we will keep track of the two most recently pressed keypresses. Alphanumeric only.
	var keyPresses = [{character: 'dummy1', timeStamp: 100000, timeOutID: null},{character: 'dummy2', timeStamp: 200000, timeOutID: null},{character: 'dummy3', timeStamp: 300000, timeOutID: null}];

	// Initializes certain listeners needed
	webMotionHelpers.initializeSpecialKeyListeners();
	webMotionHelpers.initializeFocusBlurListeners();
	initializeWindowScrollListener();
	
	$(document).ready(function() {
		chrome.runtime.sendMessage({msg: 'get_viewport_height'}, function(response) {
			webMotionHelpers.viewPortHeight = response;
			processLinks();
		});
	});

	$(document).on('keydown', 'html', function(e) {
		var pressedChar = String.fromCharCode(e.keyCode).toLowerCase();
		if (webMotionHelpers.isAlphanumeric(pressedChar)) {
			handleAlphaNumericKeyPress(pressedChar);
		}
	});

	function processLinks() {		
		// Check to make sure we are not on Google, Facebook, Twitter, etc. They have their own shortcut system.
		if (webMotionHelpers.isDomainAllowed()) {
			modifiableLinks = [];
			modifiableLinksAlt = [];
			webMotionHelpers.takenAbbreviations = [];
			webMotionHelpers.takenAbbreviationsAlt = [];
			resetAllLinks();
			// Gather all the links we (potentially) need to modify
			modifiableLinks = gatherLegitimateLinks();
			modifiableLinks = sortLinkSetByFontSize(modifiableLinks);

			// process each link (ie, figure out which letter to be the shortcut, alter the underlying html, etc)
			
			for (var i=0; i <= modifiableLinks.length - 1; i++) {
				var reprocessForAltKey = webMotionHelpers.analyzeAndModifyLink(modifiableLinks[i].linkObj, false);
				if (reprocessForAltKey) {
					modifiableLinksAlt.push(modifiableLinks[i]);
				}
			}

			for (var i=0; i <= modifiableLinksAlt.length - 1; i++) {
				var reprocessForAltKey = webMotionHelpers.analyzeAndModifyLink(modifiableLinksAlt[i].linkObj, true);
			}
		}
	}

	function handleAlphaNumericKeyPress(pressedChar) {
		if (webMotionHelpers.noInputFieldsActive()) {
			// alert(webMotionHelpers.specialCharactersPressed());
			if (webMotionHelpers.reservedShortcuts.containsString(pressedChar) && (webMotionHelpers.isDomainAllowed() || webMotionHelpers.alwaysPermissibleShortcuts.containsString(pressedChar)) && !(webMotionHelpers.specialCharactersPressed())) {
				// user pressed one of the 'reserved keys', example hjkl
				switch(pressedChar)
				{	
					case 'x':
					chrome.runtime.sendMessage({msg: 'close_selected_tab'}, function(response) {});
					break;
					case 'j':
					webMotionHelpers.scrollWindow(300);
					break;
					case 'k':
					webMotionHelpers.scrollWindow(-300);
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
			else if (webMotionHelpers.isDomainAllowed() && webMotionHelpers.getKeymap(webMotionHelpers.altPressed)[pressedChar] != null && (!(webMotionHelpers.specialCharactersPressed()) || webMotionHelpers.altPressed)) {
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
						window.location = webMotionHelpers.getKeymapValue(localChar, webMotionHelpers.altPressed);	
					}, 300, pressedChar);
					keyPresses[keyPresses.length - 1].timeOutID = timeOutID;
				}
				else if ((keyPresses[keyPresses.length - 1].character == keyPresses[keyPresses.length - 2].character) && (keyPresses[keyPresses.length - 2].character != keyPresses[keyPresses.length - 3].character)) {
					if (keyPresses[keyPresses.length - 1].timeStamp - keyPresses[keyPresses.length - 2].timeStamp < 300) {
						// set new timeout to go to link in NEW tab, and wait 500 ms before executing (waiting for third click.)
						var timeOutID = window.setTimeout(function(localChar) {
							// open in new tab, and follow
							resetKeyPresses();
							chrome.runtime.sendMessage({msg: 'new_tab_follow', url: webMotionHelpers.getKeymapValue(pressedChar, webMotionHelpers.altPressed)}, function(response) {});
						}, 300, pressedChar);
						keyPresses[keyPresses.length - 1].timeOutID = timeOutID;
					}
					else {
						//consider this identical to the first one, ie consider the keys separate despite they were the same
						// set timeout to follow link in THIS tab.
						var timeOutID = window.setTimeout(function(localChar) {
							resetKeyPresses();
							window.location = webMotionHelpers.getKeymapValue(localChar, webMotionHelpers.altPressed);
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
						chrome.runtime.sendMessage({msg: 'new_tab_no_follow', url: webMotionHelpers.getKeymapValue(pressedChar, webMotionHelpers.altPressed)}, function(response) {});
					}
					else {
						//consider this identical to the first one, ie consider the keys separate despite they were the same
						// set timeout to follow link in THIS tab.
						var timeOutID = window.setTimeout(function(localChar) {
							resetKeyPresses();
							window.location = webMotionHelpers.getKeymapValue(localChar, webMotionHelpers.altPressed);
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
		$('webmotion').each(function(index, value) {
			$(this).replaceWith($(this).text());		
		});
	}

	function gatherLegitimateLinks() {
		var modifiableLinks = [];
		$('a:visible').each(function(index) {				
			if (webMotionHelpers.isLinkLegitimate($(this))) {
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
        	}, 70));
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
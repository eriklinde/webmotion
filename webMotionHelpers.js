var webMotionHelpers = (function() {

	var _webMotionHelpers = {};
	_webMotionHelpers.modifiableLinks = []; // simply a collection of the current pages links
	_webMotionHelpers.modifiableLinksAlt = [];
	_webMotionHelpers.ctrlPressed = false;
	_webMotionHelpers.shiftPressed = false;
	_webMotionHelpers.altPressed = false;
	_webMotionHelpers.cmdPressed = false;
	_webMotionHelpers.standardColor = '#e84c3d';
	_webMotionHelpers.alternativeColor = '#5280bb';
	_webMotionHelpers.viewPortHeight;
	_webMotionHelpers.viewPortWidth;
	_webMotionHelpers.keyMap = {}; // maps the keys to the URLs
	_webMotionHelpers.keyMapAlt = {}; 
	_webMotionHelpers.takenAbbreviations = []; // maintains a list of all the user up letter / letter combos
	_webMotionHelpers.takenAbbreviationsAlt = []; 
	_webMotionHelpers.blockedRootDomains; 	
	_webMotionHelpers.blockedFullDomains; 
	_webMotionHelpers.blockedPages;
	_webMotionHelpers.twoLevelTLDs;
	_webMotionHelpers.DOMElemForEscaping;
	// here we will keep track of the two most recently pressed keypresses. Alphanumeric only.
	_webMotionHelpers.keyPresses = [{character: 'dummy1', timeStamp: 100000, timeOutID: null},{character: 'dummy2', timeStamp: 200000, timeOutID: null},{character: 'dummy3', timeStamp: 300000, timeOutID: null}];

	//the HTML entities of &, <, >, " and SPACE.  these will not be made into clickable letters.
	_webMotionHelpers.reservedHTMLCharacters = ["&amp;", "&lt;", "&gt;", "&quot;", "&nbsp;"];
	//these we use these to close website, go back and forth between tabs, etc.
	_webMotionHelpers.reservedShortcuts = ['x', 'b', 'j', 'k'];
	_webMotionHelpers.alwaysPermissibleShortcuts = ['h', 'l']; // even in forbidden domains (basically just left and right)
	_webMotionHelpers.defaultForbiddenDomains = ['google.com', 'google.co.in', 'google.co.uk', 'google.fr', 'google.es', 'google.ru', 'google.jp', 'google.it', 'google.com.br', 'google.com.mx', 'google.ca', 'google.com.hk', 'google.de', 'gmail.com', 'facebook.com', 'twitter.com', , 'notezilla.io', 'notezilla.info', '0.0.0.0'];


	_webMotionHelpers.initializeStandardKeyListeners = function() {		
		// console.log('sheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeet');
		// alert();
		_webMotionHelpers.initializeSpecialKeyListeners();//cmd, shift, alt, etc.
		_webMotionHelpers.initializeAlphaNumericKeyListeners();
	}
	_webMotionHelpers.initializeAlwaysOnKeyListeners = function() {		
		// console.log('sheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeetsheeet');
		$(document).on('keydown', 'html', function(e) {
			var pressedChar = String.fromCharCode(e.keyCode).toLowerCase();
			if (_webMotionHelpers.alwaysPermissibleShortcuts.containsString(pressedChar)) {
				_webMotionHelpers.handleAlwaysPermissibleKeyPress(pressedChar);
			}
		});
	}

	_webMotionHelpers.activateWebMotion = function(activateKeyListeners) {
		_webMotionHelpers.DOMElemForEscaping = document.createElement("textarea");
		_webMotionHelpers.initializeFocusBlurListeners();
		_webMotionHelpers.initializeWindowScrollListener();
		if (activateKeyListeners) {
			_webMotionHelpers.initializeStandardKeyListeners();
			_webMotionHelpers.initializeAlwaysOnKeyListeners();
		}
		chrome.runtime.sendMessage({msg: 'get_viewport_dimensions'}, function(response) {
			_webMotionHelpers.viewPortHeight = response.height;
			_webMotionHelpers.viewPortWidth = response.width;
			_webMotionHelpers.processLinks();
		});	
	}

	_webMotionHelpers.extractFullDomainFromURL = function(url) {		
		// returns "www.stackoverflow.com"
		// console.log(7775);
    	if(url.search(/^https?\:\/\//) != -1) {    		
        	url = url.match(/^https?\:\/\/([^\/?#]+)(?:[\/?#]|$)/i, "");
    	}
    	else {
        	url = url.match(/^([^\/?#]+)(?:[\/?#]|$)/i, "");
        }
        // console.log(7776);
        // console.log(url[1]);
        if (_webMotionHelpers.isValidDomain(url[1])) {
        	return url[1];
        }
        else {
        	return null;
        }    	
	}

	_webMotionHelpers.extractRootDomainFromURL = function(url) {
		// NOTE: this can handle 2 level TLDs, (co.uk, etc), but not 3 level!
		// list of 2 level TLDs from: 
		// http://mxr.mozilla.org/mozilla-central/source/netwerk/dns/effective_tld_names.dat?raw=1
		var fullDomain = _webMotionHelpers.extractFullDomainFromURL(url);
		if (fullDomain == null) {
			return null;
		}
		else {
			var lastTwoSegments = fullDomain.match(/[a-z0-9]+\.[a-z0-9]+$/i)[0];  // -> 'stackoverflow.com', 'co.uk'
			var nbrSegmentsNeeded = 2; //nbrSegmentsNeeded == cnn.com, etc... SOMETHING.SOMETHING.
			// As opposed to cnn.co.uk... 3 segments...
			if (_webMotionHelpers.twoLevelTLDs.containsString(lastTwoSegments)) {
				nbrSegmentsNeeded = 3;
			}
			if (nbrSegmentsNeeded == 2) {
				return fullDomain.match(/[a-z0-9\-]+\.[a-z0-9\-]+$/i)[0];
			}
			else {
				return fullDomain.match(/[a-z0-9\-]+\.[a-z0-9\-]+\.[a-z0-9\-]+$/i)[0];
			}
		}
	}

	_webMotionHelpers.isValidDomain = function(domain) {		
		//return (domain.match(/[a-z0-9\-]+\.[a-z0-9\-]+\.[a-z0-9\-]+$/i) != null || domain.match(/[a-z0-9\-]+\.[a-z0-9\-]+$/i) != null);
		// return (domain.match(/[a-z0-9\-]+\.[a-z0-9\-]+\.[a-z0-9\-]$/i) != null);
		return (domain.match(/^(?:[\-a-z0-9]+\.)+[a-z]{2,6}$/i) != null);
		
	}

	_webMotionHelpers.deactivateWebMotion = function(killAlwaysOnShortcuts) {
		_webMotionHelpers.terminateAllEventHandlers(killAlwaysOnShortcuts);
		_webMotionHelpers.resetAllLinks();
	}

	_webMotionHelpers.terminateAllEventHandlers = function(killAlwaysOnShortcuts) {
		$(document).off();
		if (!(killAlwaysOnShortcuts)) {
			// reinstate the always permissible shortcuts
			_webMotionHelpers.initializeAlwaysOnKeyListeners();
		}
	}


	_webMotionHelpers.gatherLegitimateLinks = function() {
		var modifiableLinks = [];
		$('a:visible').each(function(index) {				
			if (_webMotionHelpers.isLinkLegitimate($(this))) {
				var link = {linkObj:$(this), fontSize: parseInt($(this).css('font-size')), shortCut:"", originalOrder:index, absoluteURL: $(this).prop("href")};
				modifiableLinks.push(link);
			}		
		});
		// modifiableLinks = modifiableLinks.is(":visible");
		return modifiableLinks;
	}

	_webMotionHelpers.sortLinkSetByFontSize = function(modifiableLinks) {
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

	_webMotionHelpers.initializeWindowScrollListener = function() {
		$(window).scroll(function() {
			clearTimeout($.data(this, 'scrollTimer'));
			$.data(this, 'scrollTimer', setTimeout(function() {
        		// do something
        		_webMotionHelpers.processLinks();
        	}, 70));
		});
	}


	_webMotionHelpers.processLinks = function() {		
		// Check to make sure we are not on Google, Facebook, Twitter, etc. They have their own shortcut system.
		// if (webMotionHelpers.isDomainAllowed()) {
			_webMotionHelpers.modifiableLinks = [];
			_webMotionHelpers.modifiableLinksAlt = [];
			webMotionHelpers.takenAbbreviations = [];
			webMotionHelpers.takenAbbreviationsAlt = [];
			webMotionHelpers.resetAllLinks();
			// Gather all the links we (potentially) need to modify
			_webMotionHelpers.modifiableLinks = _webMotionHelpers.gatherLegitimateLinks();
			_webMotionHelpers.modifiableLinks = _webMotionHelpers.sortLinkSetByFontSize(_webMotionHelpers.modifiableLinks);

			// process each link (ie, figure out which letter to be the shortcut, alter the underlying html, etc)
			
			for (var i=0; i <= _webMotionHelpers.modifiableLinks.length - 1; i++) {
				var reprocessForAltKey = webMotionHelpers.analyzeAndModifyLink(_webMotionHelpers.modifiableLinks[i].linkObj, false);
				if (reprocessForAltKey) {
					_webMotionHelpers.modifiableLinksAlt.push(_webMotionHelpers.modifiableLinks[i]);
				}
			}

			for (var i=0; i <= _webMotionHelpers.modifiableLinksAlt.length - 1; i++) {
				var reprocessForAltKey = webMotionHelpers.analyzeAndModifyLink(_webMotionHelpers.modifiableLinksAlt[i].linkObj, true);
			}
		// }
	}


	_webMotionHelpers.specialCharactersPressed = function() {
		// console.log('*****');
		// console.log(_webMotionHelpers.ctrlPressed);
		// console.log(_webMotionHelpers.shiftPressed);
		// console.log(_webMotionHelpers.altPressed);
		// console.log(_webMotionHelpers.cmdPressed);
		return ((_webMotionHelpers.ctrlPressed) || (_webMotionHelpers.shiftPressed) || (_webMotionHelpers.altPressed) || (_webMotionHelpers.cmdPressed));
	}

	_webMotionHelpers.resetKeyPresses = function () {
		// removes everything except the first 3 dummy elements.
		// never reset keypresses without resetting timeouts first
		_webMotionHelpers.keyPresses.splice(3);
	}


	_webMotionHelpers.areRegularsHighlighted = function() {
		return ($('webmotion.regular').size() > 0 && $('webmotion.regular').first().attr('data-active') == 'true');
	}

	_webMotionHelpers.htmlDecode = function(str) {
		var e = document.createElement('div');
		e.innerHTML = str;
		return e.childNodes.length === 0 ? "" : e.childNodes[0].nodeValue;
	}

	_webMotionHelpers.analyzeAndModifyLink = function(linkObj, alternative) {
		// Figures out who the possible candiates are inside the link text, and maps them to their position in the innerHTML of that link.
		// If alternative == true, then everything will be pushed to the 'backup' arrays used when user presses ALT key
		// console.log('***** 1');
		// console.log(linkObj.text());
		var letterMappings = _webMotionHelpers.genereateLetterToHTMLMapping(linkObj); // contains the text() mapped to the underlying HTML
		if (letterMappings.length == 0) {
			// no available text inside link. Could be image. For now, do nothing.
			// console.log('***** 2');
			return false; 
		}
		else {
			// console.log('***** 3');
			var letterIndex = 0;
			var chosenLetter = null; 
			var chosenLetterOrigPos = null;
			// console.log(letterMappings);
			while ((getTakenAbbreviations(alternative).containsString(letterMappings[letterIndex].processedLetter) || _webMotionHelpers.reservedShortcuts.containsString(letterMappings[letterIndex].processedLetter) || _webMotionHelpers.alwaysPermissibleShortcuts.containsString(letterMappings[letterIndex].processedLetter)) && letterIndex < letterMappings.length - 1) {
				letterIndex++;
				// console.log('***** 4');
			}
			// console.log(letterIndex);
			if (!(getTakenAbbreviations(alternative).containsString(letterMappings[letterIndex].processedLetter)) && !(_webMotionHelpers.reservedShortcuts.containsString(letterMappings[letterIndex].processedLetter) || _webMotionHelpers.alwaysPermissibleShortcuts.containsString(letterMappings[letterIndex].processedLetter))) {
				// console.log('***** 5');
				chosenLetter = letterMappings[letterIndex].processedLetter;
				// console.log(chosenLetter);
				chosenLetterOrigPos = letterMappings[letterIndex].originalPosition;
				// console.log(chosenLetterOrigPos);
				pushToTakenAbbreviations(chosenLetter, alternative);
				var existingInnerHTML = linkObj.html();
				// console.log(existingInnerHTML);
				// console.log(unescape(existingInnerHTML));
				var colorToUse = _webMotionHelpers.standardColor;
				var deltaE = _webMotionHelpers.colorDistance(colorToUse,linkObj.css('color'));
				if (deltaE < 50) {
					colorToUse = _webMotionHelpers.alternativeColor;
				}

				
				

				if (_webMotionHelpers.hasBackgroundColorProperty(linkObj)) {
					// console.log('***** 6');
					var deltaE = _webMotionHelpers.colorDistance(_webMotionHelpers.standardColor,linkObj.css('background-color'));
					if (deltaE < 50) {
						colorToUse = _webMotionHelpers.alternativeColor;
					}
				}
				else {
					// console.log('***** 7');
					// get all the background elements of the parents.
					var parentWithBG = _webMotionHelpers.getFirstParentElementWithBGProperty(linkObj);
					if (parentWithBG) {
						var deltaE = _webMotionHelpers.colorDistance(_webMotionHelpers.standardColor,parentWithBG.css('background-color'));
						if (deltaE < 50) {
							colorToUse = _webMotionHelpers.alternativeColor;
						}
					}
				}
				var newLetter = linkObj.html()[chosenLetterOrigPos];

				// Deal with text-transform: capitalize here (if present)
				//the rationale is that if the text capitalizes
				// and we insert a tag, that tag will inherit from capitalize. And thus could result in MEntors, for example as
				// on the tech stars page. We'll change the capitalize on the host link to 'none' and then instead just capitalize the first
				// letter.
				if (linkObj.css('text-transform') == 'capitalize') {
					// console.log('***** 8');
					// First remove 'capitalize' from the link (otherwise, our tag will be capitalized as well)
					linkObj.css('text-transform', 'none');
					var firstLetter = existingInnerHTML[letterMappings[0].originalPosition]; 
					// then manually capitalize the first letter of the link and insert it. It's not perfect, but good enough.
					// (it misses all subsequent words where letters should be capitalized, but I think this is still better)
					// than having the result be something like MEntors.
					var newFirstLetter = firstLetter.toUpperCase();
					existingInnerHTML.replaceAt(letterMappings[0].originalPosition, newFirstLetter);
					// then, if the chosen letter is also the first one in the first word, be sure to capitalize it.
					if (chosenLetterOrigPos == 0) {
						// console.log('***** 9');
						// known bug: if the letter is enclosed in an HTML tag such as span, chosenLetterOrigPos will
						// not equal 0. So there is a microsmall chance that the following will happen:
						// 1) capitalize will be present in the link
						// 2) enclosed in a tag, so that chosenLetterOrigPos > 0.
						// 3) Letter isn't already uppercased because the author assumed it would be automatically uppercased
						// by the CSS.
						newLetter = newLetter.toUpperCase();
					}
				} 


				if (alternative) {
					// console.log('***** 10');
					newInnerHTML = existingInnerHTML.replaceAt(chosenLetterOrigPos, "<webmotion data-active='false' data-modified-color='"+colorToUse+"' data-original-color='"+linkObj.css('color')+"' data-original-fontweight='"+linkObj.css('font-weight')+"' class='alternative' style=\"\">"+newLetter+"</webmotion>");
				}
				else {
					// console.log('***** 11');
					// console.log(newLetter);
					newInnerHTML = existingInnerHTML.replaceAt(chosenLetterOrigPos, "<webmotion data-active='true' data-modified-color='"+colorToUse+"' data-original-color='"+linkObj.css('color')+"' data-original-fontweight='"+linkObj.css('font-weight')+"' class='regular' style=\"color:"+colorToUse+";font-weight:bold;\">"+newLetter+"</webmotion>");
				}
				
				linkObj.html(newInnerHTML);
				setKeymapKeyValue(chosenLetter, linkObj.prop('href'), alternative);
				return false;
			}
			else {
				// console.log('***** 12');
				return true;
			}
		}
	}

	_webMotionHelpers.initializeAlphaNumericKeyListeners = function() {
		$(document).on('keydown', 'html', function(e) {
			var pressedChar = String.fromCharCode(e.keyCode).toLowerCase();
			if (_webMotionHelpers.isAlphanumeric(pressedChar)) {
				_webMotionHelpers.handleAlphaNumericKeyPress(pressedChar);
			}
		});
	}



	_webMotionHelpers.resetAllTimeOuts = function() {
		// never reset keypresses without resetting timeouts first
		for (var i = 0; i <= _webMotionHelpers.keyPresses.length - 1; i++) {
			if (_webMotionHelpers.keyPresses[i].timeOutID != null) {
				clearTimeout(_webMotionHelpers.keyPresses[i].timeOutID);
				_webMotionHelpers.keyPresses[i].timeOutID = null;
			}
		}					
	}

	_webMotionHelpers.resetAllLinks = function() {
		$('webmotion').each(function(index, value) {
			$(this).replaceWith($(this).text());		
		});
	}

	_webMotionHelpers.handleAlwaysPermissibleKeyPress = function(pressedChar) {
		if (!(_webMotionHelpers.specialCharactersPressed()) && _webMotionHelpers.noInputFieldsActive()) {
			switch(pressedChar)
				{	
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
	}

	_webMotionHelpers.handleAlphaNumericKeyPress = function(pressedChar) {

		if (_webMotionHelpers.noInputFieldsActive()) {

			// alert(webMotionHelpers.specialCharactersPressed());
			// if (_webMotionHelpers.reservedShortcuts.containsString(pressedChar) && (_webMotionHelpers.isDomainAllowed() || _webMotionHelpers.alwaysPermissibleShortcuts.containsString(pressedChar)) && !(_webMotionHelpers.specialCharactersPressed())) {
			// console.log("_webMotionHelpers.reservedShortcuts.containsString(pressedChar)");
			// console.log(_webMotionHelpers.reservedShortcuts.containsString(pressedChar));
			if (_webMotionHelpers.reservedShortcuts.containsString(pressedChar) && !(_webMotionHelpers.specialCharactersPressed())) {
				// user pressed one of the 'reserved keys', example hjkl

				switch(pressedChar)
				{	
					case 'x':

					chrome.runtime.sendMessage({msg: 'close_selected_tab'}, function(response) {});
					break;
					case 'j':
					_webMotionHelpers.scrollWindow(250);
					break;
					case 'k':
					_webMotionHelpers.scrollWindow(-250);
					break;
					case 'b':
					window.history.go(-1);
					break;
					// case 'f':
					// window.history.go(+1);
					// break;
					// case 'h':
					// chrome.runtime.sendMessage({msg: 'step_tabs', direction: 'left'}, function(response) {});
					// break;
					// case 'l':
					// chrome.runtime.sendMessage({msg: 'step_tabs', direction: 'right'}, function(response) {});
					// break;
					default:
					break;
				}
			}	
			// else if (_webMotionHelpers.isDomainAllowed() && _webMotionHelpers.getKeymap(!(_webMotionHelpers.areRegularsHighlighted()))[pressedChar] != null && (!(_webMotionHelpers.specialCharactersPressed()))) {
			else if (_webMotionHelpers.getKeymap(!(_webMotionHelpers.areRegularsHighlighted()))[pressedChar] != null && (!(_webMotionHelpers.specialCharactersPressed()))) {
				// user pressed 'red' key (ie not one of the reserved keys)
				// first push the key to the keylog
				_webMotionHelpers.resetAllTimeOuts();
				_webMotionHelpers.keyPresses.push({character: pressedChar, timeStamp: Date.now(), timeOutID: null});
				if (_webMotionHelpers.keyPresses[_webMotionHelpers.keyPresses.length - 1].character != _webMotionHelpers.keyPresses[_webMotionHelpers.keyPresses.length - 2].character) {
					// "new" character was pressed
					// first reset all timeouts. For example if we press w w and then e, we don't really care what happened
					// previously. It should already have been executed (true?)
					// Then set a timeout (and push the timeoutID to the timeouts array); if timeout passes without 
					// interference, cancel all timeouts and go to link in current window
					
					var timeOutID = window.setTimeout(function(localChar) {
						_webMotionHelpers.resetKeyPresses();
						window.location = _webMotionHelpers.getKeymapValue(localChar, !(_webMotionHelpers.areRegularsHighlighted()));	
					}, 300, pressedChar);
					_webMotionHelpers.keyPresses[_webMotionHelpers.keyPresses.length - 1].timeOutID = timeOutID;
				}
				else if ((_webMotionHelpers.keyPresses[_webMotionHelpers.keyPresses.length - 1].character == _webMotionHelpers.keyPresses[_webMotionHelpers.keyPresses.length - 2].character) && (_webMotionHelpers.keyPresses[_webMotionHelpers.keyPresses.length - 2].character != _webMotionHelpers.keyPresses[_webMotionHelpers.keyPresses.length - 3].character)) {
					if (_webMotionHelpers.keyPresses[_webMotionHelpers.keyPresses.length - 1].timeStamp - _webMotionHelpers.keyPresses[_webMotionHelpers.keyPresses.length - 2].timeStamp < 300) {
						// set new timeout to go to link in NEW tab, and wait 500 ms before executing (waiting for third click.)
						var timeOutID = window.setTimeout(function(localChar) {
							// open in new tab, and follow
							_webMotionHelpers.resetKeyPresses();
							chrome.runtime.sendMessage({msg: 'new_tab_follow', url: _webMotionHelpers.getKeymapValue(pressedChar, !(_webMotionHelpers.areRegularsHighlighted()))}, function(response) {});
						}, 300, pressedChar);
						_webMotionHelpers.keyPresses[_webMotionHelpers.keyPresses.length - 1].timeOutID = timeOutID;
					}
					else {
						//consider this identical to the first one, ie consider the keys separate despite they were the same
						// set timeout to follow link in THIS tab.
						var timeOutID = window.setTimeout(function(localChar) {
							_webMotionHelpers.resetKeyPresses();
							window.location = _webMotionHelpers.getKeymapValue(localChar, !(_webMotionHelpers.areRegularsHighlighted()));
						}, 300, pressedChar);
						_webMotionHelpers.keyPresses[_webMotionHelpers.keyPresses.length - 1].timeOutID = timeOutID;
					}
				}
				else if ((_webMotionHelpers.keyPresses[_webMotionHelpers.keyPresses.length - 1].character == _webMotionHelpers.keyPresses[_webMotionHelpers.keyPresses.length - 2].character) && (_webMotionHelpers.keyPresses[_webMotionHelpers.keyPresses.length - 2].character == _webMotionHelpers.keyPresses[_webMotionHelpers.keyPresses.length - 3].character)) {					
					if (_webMotionHelpers.keyPresses[_webMotionHelpers.keyPresses.length - 1].timeStamp - _webMotionHelpers.keyPresses[_webMotionHelpers.keyPresses.length - 2].timeStamp < 300) {
						//note that this 500 + the previosu 500 must add up to 1000?
						// clear keypresses + open up in new tab (don't follow tab)
						// no timer necessary
						_webMotionHelpers.resetKeyPresses();	
						chrome.runtime.sendMessage({msg: 'new_tab_no_follow', url: _webMotionHelpers.getKeymapValue(pressedChar, !(_webMotionHelpers.areRegularsHighlighted()))}, function(response) {});
					}
					else {
						//consider this identical to the first one, ie consider the keys separate despite they were the same
						// set timeout to follow link in THIS tab.
						var timeOutID = window.setTimeout(function(localChar) {
							_webMotionHelpers.resetKeyPresses();
							window.location = _webMotionHelpers.getKeymapValue(localChar, !(_webMotionHelpers.areRegularsHighlighted()));
						}, 300, pressedChar);
						_webMotionHelpers.keyPresses[_webMotionHelpers.keyPresses.length - 1].timeOutID = timeOutID;
					}
				}
			}							
		} 
	}
	_webMotionHelpers.initializeSpecialKeyListeners = function() {
		// x

		$(document).on("keydown", function(e) {
			if (e.keyCode == 91 || e.keyCode == 93) {
				_webMotionHelpers.cmdPressed = true;	
			}
			else if (e.keyCode == 16) {
				_webMotionHelpers.shiftPressed = true;
			}
			else if (e.keyCode == 17) {
				_webMotionHelpers.ctrlPressed = true;
			}
			// altPressed is deal with elsewhere
		});

		$(document).on("keyup", function(e) {
			if (e.keyCode == 91 || e.keyCode == 93) {
				_webMotionHelpers.cmdPressed = false;	
			}
			else if (e.keyCode == 16) {
				_webMotionHelpers.shiftPressed = false;
			}
			else if (e.keyCode == 17) {
				_webMotionHelpers.ctrlPressed = false;
			}
			else if (e.keyCode == 18) {
				_webMotionHelpers.altPressed = false;
			}
		});

		$(document).on("keydown", function(e) {
			if (e.keyCode == 18) {
				_webMotionHelpers.altPressed = true;

				if (_webMotionHelpers.areRegularsHighlighted()) {
					// highlight the alternatives
					$('webmotion.regular').each(function() {
						var originalColor = $(this).attr('data-original-color');
						var originalFontweight = $(this).attr('data-original-fontweight');
						$(this).css('color', originalColor).css('font-weight', originalFontweight);
						$(this).attr('data-active','false');
					});
					$('webmotion.alternative').each(function() {
						var newColor = $(this).attr('data-modified-color');
						$(this).css('color', newColor).css('font-weight', 'bold');
						$(this).attr('data-active','true');
					});
				}
				else {
					//highlight the regulars
					$('webmotion.alternative').each(function() {
						var originalColor = $(this).attr('data-original-color');
						var originalFontweight = $(this).attr('data-original-fontweight');
						$(this).css('color', originalColor).css('font-weight', originalFontweight);
						$(this).attr('data-active','false');
					});
					$('webmotion.regular').each(function() {
						var newColor = $(this).attr('data-modified-color');
						$(this).css('color', newColor).css('font-weight', 'bold');
						$(this).attr('data-active','true');
					});
				}
			}
		});


}

_webMotionHelpers.initializeTabNavigationListeners = function(elem) {

}


_webMotionHelpers.getFirstParentElementWithBGProperty = function(elem) {
	var allParents = elem.parents();
	var counter;
	for (counter = 0; counter <= allParents.length - 1; counter++) {
		if (_webMotionHelpers.hasBackgroundColorProperty($(allParents[counter]))) {
			return $(allParents[counter]);
		}
	}
	return false;
}	

_webMotionHelpers.hasBackgroundColorProperty = function(elem) {
		// if we do this the traditional elem.css('background-color')
		// way, seems we are getting rgb(0,0,0) as a response even if it's 
		// not set.
		return (elem.css('background-color') != 'rgba(0, 0, 0, 0)');
	}

	_webMotionHelpers.hasWhiteBackground = function(elem) {
		return (elem.css('background-color').containsString("rgb(0, 0, 0)") || elem.css('background-color').containsString("rgba(0, 0, 0, 0)"));
	}

	// _webMotionHelpers.isDomainAllowed = function() {
	// 	var domainAllowed = true;
	// 	for (var domainCounter = 0; domainCounter <= this.forbiddenDomains.length - 1; domainCounter++) {
	// 		if (document.domain.indexOf(this.forbiddenDomains[domainCounter]) != -1) {
	// 			domainAllowed = false;
	// 		}
	// 	}
	// 	return domainAllowed;
	// 	// return false;
	// }


	_webMotionHelpers.colorDistance = function(color1, color2) {
		// takes two colors as inputs. Strings are fine. RGB assumed.
		// converts the two colors to LAB space by using Shushik/i-color/ library
		// then calculates Delta-E, which represents the euclidian distance between them.
		// Wikipedia: 'The idea is that a dE of 1.0 is the smallest color difference the human eye can see'
		var color1 = ColorHelper.convert(color1, 'lab');
		var color2 = ColorHelper.convert(color2, 'lab');
		var lDiff = color1.l - color2.l;
		var aDiff = color1.a - color2.a;
		var bDiff = color1.b - color2.b;
		// -> "Delta-E"
		return Math.sqrt((Math.pow(lDiff, 2) + Math.pow(aDiff, 2) + Math.pow(bDiff, 2)));
	}	

	_webMotionHelpers.initializeFocusBlurListeners = function() {

		window.addEventListener("focus", function(event) { 
			this.cmdPressed = false;
			this.shiftPressed = false;
			this.altPressed = false;
			this.ctrlPressed = false;

		}, false);

		window.addEventListener("blur", function(event) { 
			this.cmdPressed = false;
			this.shiftPressed = false;
			this.altPressed = false;
			this.ctrlPressed = false;

		}, false);
	}


	_webMotionHelpers.isElementInView = function(elem) {
		var docViewTop = $(window).scrollTop();
		var docViewBottom = docViewTop + this.viewPortHeight;
		
		var docViewLeft = $(window).scrollLeft();
		var docViewRight = docViewLeft + this.viewPortWidth;

		var elemTop = $(elem).offset().top;
		var elemBottom = elemTop + $(elem).height();
		
		var elemLeft = $(elem).offset().left;
		var elemRight = elemLeft + $(elem).width();

		return ((elemBottom <= docViewBottom) && (elemTop >= docViewTop) && (elemLeft >= docViewLeft) && (elemRight <= docViewRight));
	}

	_webMotionHelpers.isAlphanumeric = function(str) {
		return /[a-z0-9A-Z]/.test(str);
	}

	_webMotionHelpers.noInputFieldsActive = function() {
		// true if user is currently typing inside a text field or a text area.
		// special case for facebook... 
		var el = document.activeElement;
		var inputFieldsActive = el && ((el.tagName.toLowerCase() == 'input' && (el.type == 'text' || el.type == 'password' || el.type == 'email' || el.type == 'search' || el.type == 'url' || el.type == 'tel' || el.type == 'time' || el.type == 'number' )) || el.tagName.toLowerCase() == 'textarea');

		if (_webMotionHelpers.extractRootDomainFromURL(window.location.href) == 'facebook.com') {
			return !($("#headNav div.innerWrap div.textInput div[role='textbox']").attr('aria-expanded') == 'true' || inputFieldsActive);
		}
		else {
			return !(inputFieldsActive);			
		}
	}
	
	_webMotionHelpers.scrollWindow = function(px) {
		var sign = '+';
		if (px < 0) {
			sign = '-';
		}
		
		$.scrollTo(sign + '=' + Math.abs(px) + 'px', 250, {
			axis: 'y',
			easing: 'easeInOutCubic',
			onAfter: function() {
				//Do we need to change the hash?
			}
		});
	}

	_webMotionHelpers.isLinkLegitimate = function(DOMElem) {
		// To be legitimate: dom element / link must meet the following criteria:
		// 1) Be in view
		// 2) have non blank href attribute
		// 3) Not contain the string javascript (NOTE: THIS SHOULD BE IMPROVED TO SAY: NOT START WITHT HE STRING JAVASCRIPT)
		// 4) Not reference the current page (testing this both with leading /, as well as without... ie testing both on /news and news.)
		// Also contain at least one letter or number.
		
		// Must contain at least one alpha numeric character
		var positiveTextRequirements = new RegExp("[A-Za-z0-9]+");

		// Will be disregarded if contains 1 or more of the below: &, <, >, etc,
		var negativeTextRequirements = new RegExp("[\&\<\>]+");
		var textIndentation = Math.abs(parseInt(DOMElem.css('text-indent')));

		// return this.isElementInView(DOMElem) && DOMElem.attr('href') != undefined && DOMElem.attr('href') != "" && DOMElem.attr('href') != "#" && (textIndentation < 50) && positiveTextRequirements.test(DOMElem.text()) && !(negativeTextRequirements.test(DOMElem.text())) && !(DOMElem.attr('href').containsString("javascript")) && DOMElem.css('display') != "none" && DOMElem.css('visibility') != "hidden" && window.location.href != DOMElem.prop('href');
		return this.isElementInView(DOMElem) && DOMElem.attr('href') != undefined && DOMElem.attr('href') != "" && DOMElem.attr('href') != "#" && (textIndentation < 50) && positiveTextRequirements.test(DOMElem.text()) && !(DOMElem.attr('href').containsString("javascript")) && DOMElem.css('display') != "none" && DOMElem.css('visibility') != "hidden" && window.location.href != DOMElem.prop('href');

	}


	_webMotionHelpers.genereateLetterToHTMLMapping = function(linkDOMElem) {
		/*
		This method takes a link DOM element from jQuery (ie <a id='test' href='/xyz'>Hello there!</a>, etc) and looks at the html / text inside the link (in this example: "Hello there!"), 
		and figures out which of the letters in that string are actually candidates for being replaced with a hotkey (and formatted as red). 

		It also maps those candidates to the position of that letter in the string. So for example, 'h' will be mapped to 0, 'o' will be mapped to 5. If the innerHTML is not
		just text but rather an html expression, it still works: for example innerHTML is "<b>Hello</b>": 'h' -> 3

		It removes duplicates, lower cases everything, and ignores non-alphanumeric characters. It also removes any of the letters considered a reserved shortcut, 
		as defined above by _webMotionHelpers.reservedShortcuts.

		The actual output of the above example will look like this:

		[{"processedLetter":"h","originalPosition":0},{"processedLetter":"e","originalPosition":1},{"processedLetter":"l","originalPosition":2},{"processedLetter":"o","originalPosition":4},{"processedLetter":"t","originalPosition":6},{"processedLetter":"r","originalPosition":9}] 

		It can also handle complex things, such as this one: 

		<a id='test' href='x'>Hello <em>brother</em>, how the <span><b>DEUCE</b></span> are you???</a>, which would return: 

		[{"processedLetter":"h","originalPosition":0},{"processedLetter":"e","originalPosition":1},{"processedLetter":"l","originalPosition":2},{"processedLetter":"o","originalPosition":4},{"processedLetter":"b","originalPosition":10},{"processedLetter":"r","originalPosition":11},{"processedLetter":"t","originalPosition":13},{"processedLetter":"w","originalPosition":26},{"processedLetter":"d","originalPosition":41},{"processedLetter":"u","originalPosition":43},{"processedLetter":"c","originalPosition":44},{"processedLetter":"a","originalPosition":58},{"processedLetter":"y","originalPosition":62}] 
		*/
		// console.log('+++++++++++++++++++++++++++++++++++++++++++++');

		var nodesContainer = [];
		var nodesCumulativeHTMLLength = 0;
		linkDOMElem.contents().each(function(index, value) {
			// console.log('value');
			// console.log(value);
			// console.log($(value));
			var isPureText = ($(this).context.nodeName == '#text');
			if (isPureText) {
				// charOffset = if we have three nodes, the first one has an offset of 0, the second 
				// has an offset of the length of the first, and the third one has an offset of the 2 first ones
				// used to be this!!!!
				// console.log('textStr');
				
				// var textStr = $(this).text();
				// console.log(textStr);

				// textStr = textStr.replace('&','&amp;');
				// console.log(textStr);
				// console.log(98798789);
				// console.log($(this).text());
				// console.log(value.innerHTML);
				// var a = document.createElement('div');
				// console.log('a.innerHTML');
				// console.log(a.innerHTML);
				// var newContent = document.createTextNode("Hi there and greetings!");
				// console.log(newContent.innerHTML);
				// var newDiv = document.createElement("div"); 
				  // var newContent = document.createTextNode('Hi there & greetings!'); 
				  // convert "A&B" to "A&amp;B"
				  _webMotionHelpers.DOMElemForEscaping.innerHTML = $(this).text();
				  var escapedText = _webMotionHelpers.DOMElemForEscaping.innerHTML;
				  // console.log(escapedText);

				  // newDiv.appendChild(newContent); //add the text node to the newly created div.
				// console.log('newDiv.innerHTML');
				  // console.log(newDiv.innerHTML);
				nodesContainer.push({txt: escapedText, html: escapedText, charOffset: nodesCumulativeHTMLLength});
				// document.write
				// nodesContainer.push({txt: $(this).text(), html: _webMotionHelpers.htmlDecode($(this).context.innerText), charOffset: nodesCumulativeHTMLLength});
				// console.log('havstam');
				nodesCumulativeHTMLLength += escapedText.length;
				// console.log('havstam2');
			}
			else {
				// console.log('bertile');
				// console.log($(this).context.outerHTML);
				_webMotionHelpers.DOMElemForEscaping.innerHTML = $(this).text();
				var escapedText = _webMotionHelpers.DOMElemForEscaping.innerHTML;
				// console.log('******');
				// console.log(escapedText);
				// console.log($(this).text());
				// console.log('******');
				nodesContainer.push({txt: escapedText, html: $(this).context.outerHTML, charOffset: nodesCumulativeHTMLLength});
				nodesCumulativeHTMLLength += $(this).context.outerHTML.length;
			}
		});
		var metaMiniMapping = [];
		// for example, in the 'Hello world!' example, we only need to add 1 instance of 'l'... we are keeping track of what we have added with
		// this array.
		var uniqueLettersInNodes = [];
		for(var i = 0;i <= nodesContainer.length - 1; i++) {
			var miniMapping = [];

			// var temp = "This is a string.";
			// the g in the regular expression says to search the whole string 
			// rather than just find the first occurrence
			// console.log('nodesContainer');
			// console.log(nodesContainer);
			
			// console.log('this sucks...');
			// console.log(nodesContainer[i].html);
			// console.log(nodesContainer[i].txt);
			// console.log(nodesContainer[i].html.split(nodesContainer[i].txt));
			if (nodesContainer[i].html.split(nodesContainer[i].txt).length-1 == 1) {
				// the above means we only deal with <em>hello</em>. ie if there is something weird going on, we wont' touch it.
				// console.log('eldprovet');
				// console.log(nodesContainer[i].txt);
				var startPos = nodesContainer[i].html.indexOf(nodesContainer[i].txt);

				// now we must figure out if there are any forbidden characters. Any characters within for example &amp; ie a, m,  and p are forbidden.
				var forbiddenPositions = [];

				for(var ind = 0; ind <= _webMotionHelpers.reservedHTMLCharacters.length - 1; ind++) {
					// search globally in the string using regex "g", retrieve all matches

					var regEx = new RegExp(_webMotionHelpers.reservedHTMLCharacters[ind], "g"), result, indices = [];
					while ( (result = regEx.exec(nodesContainer[i].txt)) ) {
    					indices.push(result.index);
					}
					// Indices will contain the search results, for example: for search string "&Hej&A&" => "&amp;Hej&amp;A&amp;" 
					// if searching for "&amp;", resulting indices => [0, 8, 14] (ie 3 matches)
					for(var e = 0; e <= indices.length - 1; e++) {

						for(var f = 0; f <= _webMotionHelpers.reservedHTMLCharacters[ind].length - 1; f++ ) {
							forbiddenPositions.push(indices[e] + f + startPos);							
						}
					}
					// if string is as follows: <em>&amp;B&amp;HAJ&lt;</em>, then forbiddenPositions will be:
					// 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 18, 19, 20, 21
					// (Note it may not be in order...)


					// _webMotionHelpers.reservedHTMLCharacters[ind]
				}
				// console.log(JSON.stringify(forbiddenPositions));
				for (var j = startPos; j <= startPos + nodesContainer[i].txt.length - 1; j++) {
					var currentLetter = nodesContainer[i].html[j].toLowerCase();

					// We only want the letter if it's alpha numeric and if we haven't already seen it, and if it's not a reserved shortcut.
					// Note: *** adding to list of criteria: we also don't want it if it's among the forbidden letters.
					// NOTE: WE ACTUALLY DO WANT THE LETTERS EVEN IF IT'S A RESERVED SHORTCUT. SO COMMENTING OUT 
					// THAT AND REPLACING SO THIS HAPPENS. WE WANT THIS BECAUSE OF FOR A WORD LIKE "back", IF CAPITALIZE IS PRESENT
					// WE WANT TO BE ABLE TO CAPITALIZE THE FIRST WORD IF NEEDED. THUS WE MUST KNOW ABOUT IT.
					// if (this.isAlphanumeric(currentLetter) && !(this.reservedShortcuts.containsString(currentLetter)) && !(
						// console.log('Petter von der Niklasson');
						// console.log(j);
						
						// if (this.isAlphanumeric(currentLetter) && !(uniqueLettersInNodes.containsString(currentLetter))) {
						// we r modifying the below to include the constraint that we don't want an escaped character to slip in there...
						if (this.isAlphanumeric(currentLetter) && (forbiddenPositions.indexOf(j) == -1) && !(uniqueLettersInNodes.containsString(currentLetter))) {
							miniMapping.push({processedLetter: currentLetter, originalPosition: j + nodesContainer[i].charOffset});				
							uniqueLettersInNodes.push(currentLetter);
						}
					}
				// we only want to deal with stuff where there is no ambiguity. Ie we don't want to 
				// go down the rabbithole of something like <span>pan</span>, etc...
				// However, <span>Pan</span> should be fine. Which will be the case with the above code as well, as it is case-sensivite.
			}
			// now we append the current minimapping to the larger metaMiniMapping
			// console.log('grand master fat slim');
			// console.log(JSON.stringify(miniMapping));
			metaMiniMapping.push.apply(metaMiniMapping, miniMapping);
		}
		
		return metaMiniMapping;
	}

	// A bunch of getters and setters in lieu of accessing variables by reference (which is not possible in Javascript)
	function getTakenAbbreviations(alternative) {
		if (alternative) {
			return _webMotionHelpers.takenAbbreviationsAlt;		
		}	
		else {
			return _webMotionHelpers.takenAbbreviations;		
		}
	}
	function pushToTakenAbbreviations(chosenLetter, alternative) {
		if (alternative) {
			_webMotionHelpers.takenAbbreviationsAlt.push(chosenLetter);		
		}	
		else {
			_webMotionHelpers.takenAbbreviations.push(chosenLetter);		
		}
	}

	function setKeymapKeyValue(key, value, alternative) {
		if (alternative) {
			_webMotionHelpers.keyMapAlt[key] = value;
		}
		else {
			_webMotionHelpers.keyMap[key] = value;
		} 
	}

	_webMotionHelpers.getKeymap = function(alternative) {
		if (alternative) {
			return _webMotionHelpers.keyMapAlt;
		}
		else {
			return _webMotionHelpers.keyMap;
		} 
	}




	_webMotionHelpers.isURLBlocked = function(url, blockArgs) {	
		// blockArgs are optional, if not there, we will use
		// _webMotionHelpers.blockedRootDomains
		// _webMotionHelpers.blockedFullDomains 
		// _webMotionHelpers.blockedPages instead.
		// The reason for this is that we can't always assume that _webMotionHelpers.blockedRootDomains etc have been initialized. Need the option of supplying
		// them manually as well. For example, they won't have been initialized
		// when calling from popup.js.

		var localBlocks = new Object();
		// console.log('hulk hogan');
		// console.log(blockArgs);
		// console.log(typeof blockArgs);
		// console.log(typeof blockArgs === "undefined");

		if (typeof blockArgs === "undefined") {
			localBlocks = _webMotionHelpers;
			// console.log('yo yo ma');
		}
		else {
			localBlocks = blockArgs;
			// console.log('yeah yeah mah!');
		}
		// console.log(localBlocks);
		
		// console.log('he he hey!!');
		// console.log(url);
		// console.log(2);
		// console.log(localBlocks.blockedRootDomains);
		if (localBlocks.blockedRootDomains.containsString(_webMotionHelpers.extractRootDomainFromURL(url))) {
			// console.log(1);
			return true; 
		}
		if (localBlocks.blockedFullDomains.containsString(_webMotionHelpers.extractFullDomainFromURL(url))) {
			// console.log(2);
			return true; 
		}
		if (localBlocks.blockedPages.containsString(url)) {
			// console.log(3);
			return true; 
		}
		// console.log(4);
		return false;
	}

	_webMotionHelpers.getKeymapValue = function(key, alternative) {
		if (alternative) {
			return _webMotionHelpers.keyMapAlt[key];
		}
		else {
			return _webMotionHelpers.keyMap[key];
		} 
	}
_webMotionHelpers.twoLevelTLDs = ["com.ac",
"co.uk",
"edu.ac",
"gov.ac",
"net.ac",
"mil.ac",
"org.ac",
"nom.ad",
"co.ae",
"net.ae",
"org.ae",
"sch.ae",
"ac.ae",
"gov.ae",
"mil.ae",
"accident-investigation.aero",
"accident-prevention.aero",
"aerobatic.aero",
"aeroclub.aero",
"aerodrome.aero",
"agents.aero",
"aircraft.aero",
"airline.aero",
"airport.aero",
"air-surveillance.aero",
"airtraffic.aero",
"air-traffic-control.aero",
"ambulance.aero",
"amusement.aero",
"association.aero",
"author.aero",
"ballooning.aero",
"broker.aero",
"caa.aero",
"cargo.aero",
"catering.aero",
"certification.aero",
"championship.aero",
"charter.aero",
"civilaviation.aero",
"club.aero",
"conference.aero",
"consultant.aero",
"consulting.aero",
"control.aero",
"council.aero",
"crew.aero",
"design.aero",
"dgca.aero",
"educator.aero",
"emergency.aero",
"engine.aero",
"engineer.aero",
"entertainment.aero",
"equipment.aero",
"exchange.aero",
"express.aero",
"federation.aero",
"flight.aero",
"freight.aero",
"fuel.aero",
"gliding.aero",
"government.aero",
"groundhandling.aero",
"group.aero",
"hanggliding.aero",
"homebuilt.aero",
"insurance.aero",
"journal.aero",
"journalist.aero",
"leasing.aero",
"logistics.aero",
"magazine.aero",
"maintenance.aero",
"marketplace.aero",
"media.aero",
"microlight.aero",
"modelling.aero",
"navigation.aero",
"parachuting.aero",
"paragliding.aero",
"passenger-association.aero",
"pilot.aero",
"press.aero",
"production.aero",
"recreation.aero",
"repbody.aero",
"res.aero",
"research.aero",
"rotorcraft.aero",
"safety.aero",
"scientist.aero",
"services.aero",
"show.aero",
"skydiving.aero",
"software.aero",
"student.aero",
"taxi.aero",
"trader.aero",
"trading.aero",
"trainer.aero",
"union.aero",
"workinggroup.aero",
"works.aero",
"gov.af",
"com.af",
"org.af",
"net.af",
"edu.af",
"com.ag",
"org.ag",
"net.ag",
"co.ag",
"nom.ag",
"off.ai",
"com.ai",
"net.ai",
"org.ai",
"com.al",
"edu.al",
"gov.al",
"mil.al",
"net.al",
"org.al",
"com.an",
"net.an",
"org.an",
"edu.an",
"ed.ao",
"gv.ao",
"og.ao",
"co.ao",
"pb.ao",
"it.ao",
"com.ar",
"edu.ar",
"gob.ar",
"int.ar",
"mil.ar",
"net.ar",
"org.ar",
"tur.ar",
"e164.arpa",
"in-addr.arpa",
"ip6.arpa",
"iris.arpa",
"uri.arpa",
"urn.arpa",
"gov.as",
"ac.at",
"co.at",
"gv.at",
"or.at",
"com.au",
"net.au",
"org.au",
"edu.au",
"gov.au",
"asn.au",
"id.au",
"csiro.au",
"info.au",
"conf.au",
"oz.au",
"act.au",
"nsw.au",
"nt.au",
"qld.au",
"sa.au",
"tas.au",
"vic.au",
"wa.au",
"com.aw",
"com.az",
"net.az",
"int.az",
"gov.az",
"org.az",
"edu.az",
"info.az",
"pp.az",
"mil.az",
"name.az",
"pro.az",
"biz.az",
"org.ba",
"net.ba",
"edu.ba",
"gov.ba",
"mil.ba",
"unsa.ba",
"unbi.ba",
"co.ba",
"com.ba",
"rs.ba",
"biz.bb",
"com.bb",
"edu.bb",
"gov.bb",
"info.bb",
"net.bb",
"org.bb",
"store.bb",
"ac.be",
"gov.bf",
"a.bg",
"b.bg",
"c.bg",
"d.bg",
"e.bg",
"f.bg",
"g.bg",
"h.bg",
"i.bg",
"j.bg",
"k.bg",
"l.bg",
"m.bg",
"n.bg",
"o.bg",
"p.bg",
"q.bg",
"r.bg",
"s.bg",
"t.bg",
"u.bg",
"v.bg",
"w.bg",
"x.bg",
"y.bg",
"z.bg",
"0.bg",
"1.bg",
"2.bg",
"3.bg",
"4.bg",
"5.bg",
"6.bg",
"7.bg",
"8.bg",
"9.bg",
"com.bh",
"edu.bh",
"net.bh",
"org.bh",
"gov.bh",
"co.bi",
"com.bi",
"edu.bi",
"or.bi",
"org.bi",
"asso.bj",
"barreau.bj",
"gouv.bj",
"com.bm",
"edu.bm",
"gov.bm",
"net.bm",
"org.bm",
"com.bo",
"edu.bo",
"gov.bo",
"gob.bo",
"int.bo",
"org.bo",
"net.bo",
"mil.bo",
"tv.bo",
"adm.br",
"adv.br",
"agr.br",
"am.br",
"arq.br",
"art.br",
"ato.br",
"b.br",
"bio.br",
"blog.br",
"bmd.br",
"cim.br",
"cng.br",
"cnt.br",
"com.br",
"coop.br",
"ecn.br",
"eco.br",
"edu.br",
"emp.br",
"eng.br",
"esp.br",
"etc.br",
"eti.br",
"far.br",
"flog.br",
"fm.br",
"fnd.br",
"fot.br",
"fst.br",
"g12.br",
"ggf.br",
"gov.br",
"imb.br",
"ind.br",
"inf.br",
"jor.br",
"jus.br",
"leg.br",
"lel.br",
"mat.br",
"med.br",
"mil.br",
"mp.br",
"mus.br",
"net.br",
"nom.br",
"not.br",
"ntr.br",
"odo.br",
"org.br",
"ppg.br",
"pro.br",
"psc.br",
"psi.br",
"qsl.br",
"radio.br",
"rec.br",
"slg.br",
"srv.br",
"taxi.br",
"teo.br",
"tmp.br",
"trd.br",
"tur.br",
"tv.br",
"vet.br",
"vlog.br",
"wiki.br",
"zlg.br",
"com.bs",
"net.bs",
"org.bs",
"edu.bs",
"gov.bs",
"com.bt",
"edu.bt",
"gov.bt",
"net.bt",
"org.bt",
"co.bw",
"org.bw",
"gov.by",
"mil.by",
"com.by",
"of.by",
"com.bz",
"net.bz",
"org.bz",
"edu.bz",
"gov.bz",
"ab.ca",
"bc.ca",
"mb.ca",
"nb.ca",
"nf.ca",
"nl.ca",
"ns.ca",
"nt.ca",
"nu.ca",
"on.ca",
"pe.ca",
"qc.ca",
"sk.ca",
"yk.ca",
"gc.ca",
"gov.cd",
"org.ci",
"or.ci",
"com.ci",
"co.ci",
"edu.ci",
"ed.ci",
"ac.ci",
"net.ci",
"go.ci",
"asso.ci",
"int.ci",
"presse.ci",
"md.ci",
"gouv.ci",
"gov.cl",
"gob.cl",
"co.cl",
"mil.cl",
"gov.cm",
"ac.cn",
"com.cn",
"edu.cn",
"gov.cn",
"net.cn",
"org.cn",
"mil.cn",
"ah.cn",
"bj.cn",
"cq.cn",
"fj.cn",
"gd.cn",
"gs.cn",
"gz.cn",
"gx.cn",
"ha.cn",
"hb.cn",
"he.cn",
"hi.cn",
"hl.cn",
"hn.cn",
"jl.cn",
"js.cn",
"jx.cn",
"ln.cn",
"nm.cn",
"nx.cn",
"qh.cn",
"sc.cn",
"sd.cn",
"sh.cn",
"sn.cn",
"sx.cn",
"tj.cn",
"xj.cn",
"xz.cn",
"yn.cn",
"zj.cn",
"hk.cn",
"mo.cn",
"tw.cn",
"arts.co",
"com.co",
"edu.co",
"firm.co",
"gov.co",
"info.co",
"int.co",
"mil.co",
"net.co",
"nom.co",
"org.co",
"rec.co",
"web.co",
"ac.cr",
"co.cr",
"ed.cr",
"fi.cr",
"go.cr",
"or.cr",
"sa.cr",
"com.cu",
"edu.cu",
"org.cu",
"net.cu",
"gov.cu",
"inf.cu",
"com.cw",
"edu.cw",
"net.cw",
"org.cw",
"gov.cx",
"com.dm",
"net.dm",
"org.dm",
"edu.dm",
"gov.dm",
"art.do",
"com.do",
"edu.do",
"gob.do",
"gov.do",
"mil.do",
"net.do",
"org.do",
"sld.do",
"web.do",
"com.dz",
"org.dz",
"net.dz",
"gov.dz",
"edu.dz",
"asso.dz",
"pol.dz",
"art.dz",
"com.ec",
"info.ec",
"net.ec",
"fin.ec",
"k12.ec",
"med.ec",
"pro.ec",
"org.ec",
"edu.ec",
"gov.ec",
"gob.ec",
"mil.ec",
"edu.ee",
"gov.ee",
"riik.ee",
"lib.ee",
"med.ee",
"com.ee",
"pri.ee",
"aip.ee",
"org.ee",
"fie.ee",
"com.eg",
"edu.eg",
"eun.eg",
"gov.eg",
"mil.eg",
"name.eg",
"net.eg",
"org.eg",
"sci.eg",
"com.es",
"nom.es",
"org.es",
"gob.es",
"edu.es",
"aland.fi",
"com.fr",
"asso.fr",
"nom.fr",
"prd.fr",
"presse.fr",
"tm.fr",
"aeroport.fr",
"assedic.fr",
"avocat.fr",
"avoues.fr",
"cci.fr",
"chambagri.fr",
"chirurgiens-dentistes.fr",
"experts-comptables.fr",
"geometre-expert.fr",
"gouv.fr",
"greta.fr",
"huissier-justice.fr",
"medecin.fr",
"notaires.fr",
"pharmacien.fr",
"port.fr",
"veterinaire.fr",
"com.ge",
"edu.ge",
"gov.ge",
"org.ge",
"mil.ge",
"net.ge",
"pvt.ge",
"co.gg",
"net.gg",
"org.gg",
"com.gh",
"edu.gh",
"gov.gh",
"org.gh",
"mil.gh",
"com.gi",
"ltd.gi",
"gov.gi",
"mod.gi",
"edu.gi",
"org.gi",
"ac.gn",
"com.gn",
"edu.gn",
"gov.gn",
"org.gn",
"net.gn",
"com.gp",
"net.gp",
"mobi.gp",
"edu.gp",
"org.gp",
"asso.gp",
"com.gr",
"edu.gr",
"net.gr",
"org.gr",
"gov.gr",
"com.gt",
"edu.gt",
"gob.gt",
"ind.gt",
"mil.gt",
"net.gt",
"org.gt",
"co.gy",
"com.gy",
"net.gy",
"com.hk",
"edu.hk",
"gov.hk",
"idv.hk",
"net.hk",
"org.hk",
"com.hn",
"edu.hn",
"org.hn",
"net.hn",
"mil.hn",
"gob.hn",
"iz.hr",
"from.hr",
"name.hr",
"com.hr",
"com.ht",
"shop.ht",
"firm.ht",
"info.ht",
"adult.ht",
"net.ht",
"pro.ht",
"org.ht",
"med.ht",
"art.ht",
"coop.ht",
"pol.ht",
"asso.ht",
"edu.ht",
"rel.ht",
"gouv.ht",
"perso.ht",
"co.hu",
"info.hu",
"org.hu",
"priv.hu",
"sport.hu",
"tm.hu",
"2000.hu",
"agrar.hu",
"bolt.hu",
"casino.hu",
"city.hu",
"erotica.hu",
"erotika.hu",
"film.hu",
"forum.hu",
"games.hu",
"hotel.hu",
"ingatlan.hu",
"jogasz.hu",
"konyvelo.hu",
"lakas.hu",
"media.hu",
"news.hu",
"reklam.hu",
"sex.hu",
"shop.hu",
"suli.hu",
"szex.hu",
"tozsde.hu",
"utazas.hu",
"video.hu",
"ac.id",
"biz.id",
"co.id",
"desa.id",
"go.id",
"mil.id",
"my.id",
"net.id",
"or.id",
"sch.id",
"web.id",
"gov.ie",
"ac.im",
"co.im",
"com.im",
"net.im",
"org.im",
"tt.im",
"tv.im",
"co.in",
"firm.in",
"net.in",
"org.in",
"gen.in",
"ind.in",
"nic.in",
"ac.in",
"edu.in",
"res.in",
"gov.in",
"mil.in",
"eu.int",
"com.io",
"gov.iq",
"edu.iq",
"mil.iq",
"com.iq",
"org.iq",
"net.iq",
"ac.ir",
"co.ir",
"gov.ir",
"id.ir",
"net.ir",
"org.ir",
"sch.ir",
"net.is",
"com.is",
"edu.is",
"gov.is",
"org.is",
"int.is",
"gov.it",
"edu.it",
"abr.it",
"abruzzo.it",
"aosta-valley.it",
"aostavalley.it",
"bas.it",
"basilicata.it",
"cal.it",
"calabria.it",
"cam.it",
"campania.it",
"emilia-romagna.it",
"emiliaromagna.it",
"emr.it",
"friuli-v-giulia.it",
"friuli-ve-giulia.it",
"friuli-vegiulia.it",
"friuli-venezia-giulia.it",
"friuli-veneziagiulia.it",
"friuli-vgiulia.it",
"friuliv-giulia.it",
"friulive-giulia.it",
"friulivegiulia.it",
"friulivenezia-giulia.it",
"friuliveneziagiulia.it",
"friulivgiulia.it",
"fvg.it",
"laz.it",
"lazio.it",
"lig.it",
"liguria.it",
"lom.it",
"lombardia.it",
"lombardy.it",
"lucania.it",
"mar.it",
"marche.it",
"mol.it",
"molise.it",
"piedmont.it",
"piemonte.it",
"pmn.it",
"pug.it",
"puglia.it",
"sar.it",
"sardegna.it",
"sardinia.it",
"sic.it",
"sicilia.it",
"sicily.it",
"taa.it",
"tos.it",
"toscana.it",
"trentino-a-adige.it",
"trentino-aadige.it",
"trentino-alto-adige.it",
"trentino-altoadige.it",
"trentino-s-tirol.it",
"trentino-stirol.it",
"trentino-sud-tirol.it",
"trentino-sudtirol.it",
"trentino-sued-tirol.it",
"trentino-suedtirol.it",
"trentinoa-adige.it",
"trentinoaadige.it",
"trentinoalto-adige.it",
"trentinoaltoadige.it",
"trentinos-tirol.it",
"trentinostirol.it",
"trentinosud-tirol.it",
"trentinosudtirol.it",
"trentinosued-tirol.it",
"trentinosuedtirol.it",
"tuscany.it",
"umb.it",
"umbria.it",
"val-d-aosta.it",
"val-daosta.it",
"vald-aosta.it",
"valdaosta.it",
"valle-aosta.it",
"valle-d-aosta.it",
"valle-daosta.it",
"valleaosta.it",
"valled-aosta.it",
"valledaosta.it",
"vallee-aoste.it",
"valleeaoste.it",
"vao.it",
"vda.it",
"ven.it",
"veneto.it",
"ag.it",
"agrigento.it",
"al.it",
"alessandria.it",
"alto-adige.it",
"altoadige.it",
"an.it",
"ancona.it",
"andria-barletta-trani.it",
"andria-trani-barletta.it",
"andriabarlettatrani.it",
"andriatranibarletta.it",
"ao.it",
"aosta.it",
"aoste.it",
"ap.it",
"aq.it",
"aquila.it",
"ar.it",
"arezzo.it",
"ascoli-piceno.it",
"ascolipiceno.it",
"asti.it",
"at.it",
"av.it",
"avellino.it",
"ba.it",
"balsan.it",
"bari.it",
"barletta-trani-andria.it",
"barlettatraniandria.it",
"belluno.it",
"benevento.it",
"bergamo.it",
"bg.it",
"bi.it",
"biella.it",
"bl.it",
"bn.it",
"bo.it",
"bologna.it",
"bolzano.it",
"bozen.it",
"br.it",
"brescia.it",
"brindisi.it",
"bs.it",
"bt.it",
"bz.it",
"ca.it",
"cagliari.it",
"caltanissetta.it",
"campidano-medio.it",
"campidanomedio.it",
"campobasso.it",
"carbonia-iglesias.it",
"carboniaiglesias.it",
"carrara-massa.it",
"carraramassa.it",
"caserta.it",
"catania.it",
"catanzaro.it",
"cb.it",
"ce.it",
"cesena-forli.it",
"cesenaforli.it",
"ch.it",
"chieti.it",
"ci.it",
"cl.it",
"cn.it",
"co.it",
"como.it",
"cosenza.it",
"cr.it",
"cremona.it",
"crotone.it",
"cs.it",
"ct.it",
"cuneo.it",
"cz.it",
"dell-ogliastra.it",
"dellogliastra.it",
"en.it",
"enna.it",
"fc.it",
"fe.it",
"fermo.it",
"ferrara.it",
"fg.it",
"fi.it",
"firenze.it",
"florence.it",
"fm.it",
"foggia.it",
"forli-cesena.it",
"forlicesena.it",
"fr.it",
"frosinone.it",
"ge.it",
"genoa.it",
"genova.it",
"go.it",
"gorizia.it",
"gr.it",
"grosseto.it",
"iglesias-carbonia.it",
"iglesiascarbonia.it",
"im.it",
"imperia.it",
"is.it",
"isernia.it",
"kr.it",
"la-spezia.it",
"laquila.it",
"laspezia.it",
"latina.it",
"lc.it",
"le.it",
"lecce.it",
"lecco.it",
"li.it",
"livorno.it",
"lo.it",
"lodi.it",
"lt.it",
"lu.it",
"lucca.it",
"macerata.it",
"mantova.it",
"massa-carrara.it",
"massacarrara.it",
"matera.it",
"mb.it",
"mc.it",
"me.it",
"medio-campidano.it",
"mediocampidano.it",
"messina.it",
"mi.it",
"milan.it",
"milano.it",
"mn.it",
"mo.it",
"modena.it",
"monza-brianza.it",
"monza-e-della-brianza.it",
"monza.it",
"monzabrianza.it",
"monzaebrianza.it",
"monzaedellabrianza.it",
"ms.it",
"mt.it",
"na.it",
"naples.it",
"napoli.it",
"no.it",
"novara.it",
"nu.it",
"nuoro.it",
"og.it",
"ogliastra.it",
"olbia-tempio.it",
"olbiatempio.it",
"or.it",
"oristano.it",
"ot.it",
"pa.it",
"padova.it",
"padua.it",
"palermo.it",
"parma.it",
"pavia.it",
"pc.it",
"pd.it",
"pe.it",
"perugia.it",
"pesaro-urbino.it",
"pesarourbino.it",
"pescara.it",
"pg.it",
"pi.it",
"piacenza.it",
"pisa.it",
"pistoia.it",
"pn.it",
"po.it",
"pordenone.it",
"potenza.it",
"pr.it",
"prato.it",
"pt.it",
"pu.it",
"pv.it",
"pz.it",
"ra.it",
"ragusa.it",
"ravenna.it",
"rc.it",
"re.it",
"reggio-calabria.it",
"reggio-emilia.it",
"reggiocalabria.it",
"reggioemilia.it",
"rg.it",
"ri.it",
"rieti.it",
"rimini.it",
"rm.it",
"rn.it",
"ro.it",
"roma.it",
"rome.it",
"rovigo.it",
"sa.it",
"salerno.it",
"sassari.it",
"savona.it",
"si.it",
"siena.it",
"siracusa.it",
"so.it",
"sondrio.it",
"sp.it",
"sr.it",
"ss.it",
"suedtirol.it",
"sv.it",
"ta.it",
"taranto.it",
"te.it",
"tempio-olbia.it",
"tempioolbia.it",
"teramo.it",
"terni.it",
"tn.it",
"to.it",
"torino.it",
"tp.it",
"tr.it",
"trani-andria-barletta.it",
"trani-barletta-andria.it",
"traniandriabarletta.it",
"tranibarlettaandria.it",
"trapani.it",
"trentino.it",
"trento.it",
"treviso.it",
"trieste.it",
"ts.it",
"turin.it",
"tv.it",
"ud.it",
"udine.it",
"urbino-pesaro.it",
"urbinopesaro.it",
"va.it",
"varese.it",
"vb.it",
"vc.it",
"ve.it",
"venezia.it",
"venice.it",
"verbania.it",
"vercelli.it",
"verona.it",
"vi.it",
"vibo-valentia.it",
"vibovalentia.it",
"vicenza.it",
"viterbo.it",
"vr.it",
"vs.it",
"vt.it",
"vv.it",
"co.je",
"net.je",
"org.je",
"com.jo",
"org.jo",
"net.jo",
"edu.jo",
"sch.jo",
"gov.jo",
"mil.jo",
"name.jo",
"ac.jp",
"ad.jp",
"co.jp",
"ed.jp",
"go.jp",
"gr.jp",
"lg.jp",
"ne.jp",
"or.jp",
"aichi.jp",
"akita.jp",
"aomori.jp",
"chiba.jp",
"ehime.jp",
"fukui.jp",
"fukuoka.jp",
"fukushima.jp",
"gifu.jp",
"gunma.jp",
"hiroshima.jp",
"hokkaido.jp",
"hyogo.jp",
"ibaraki.jp",
"ishikawa.jp",
"iwate.jp",
"kagawa.jp",
"kagoshima.jp",
"kanagawa.jp",
"kochi.jp",
"kumamoto.jp",
"kyoto.jp",
"mie.jp",
"miyagi.jp",
"miyazaki.jp",
"nagano.jp",
"nagasaki.jp",
"nara.jp",
"niigata.jp",
"oita.jp",
"okayama.jp",
"okinawa.jp",
"osaka.jp",
"saga.jp",
"saitama.jp",
"shiga.jp",
"shimane.jp",
"shizuoka.jp",
"tochigi.jp",
"tokushima.jp",
"tokyo.jp",
"tottori.jp",
"toyama.jp",
"wakayama.jp",
"yamagata.jp",
"yamaguchi.jp",
"yamanashi.jp",
"org.kg",
"net.kg",
"com.kg",
"edu.kg",
"gov.kg",
"mil.kg",
"edu.ki",
"biz.ki",
"net.ki",
"org.ki",
"gov.ki",
"info.ki",
"com.ki",
"org.km",
"nom.km",
"gov.km",
"prd.km",
"tm.km",
"edu.km",
"mil.km",
"ass.km",
"com.km",
"coop.km",
"asso.km",
"presse.km",
"medecin.km",
"notaires.km",
"pharmaciens.km",
"veterinaire.km",
"gouv.km",
"net.kn",
"org.kn",
"edu.kn",
"gov.kn",
"com.kp",
"edu.kp",
"gov.kp",
"org.kp",
"rep.kp",
"tra.kp",
"ac.kr",
"co.kr",
"es.kr",
"go.kr",
"hs.kr",
"kg.kr",
"mil.kr",
"ms.kr",
"ne.kr",
"or.kr",
"pe.kr",
"re.kr",
"sc.kr",
"busan.kr",
"chungbuk.kr",
"chungnam.kr",
"daegu.kr",
"daejeon.kr",
"gangwon.kr",
"gwangju.kr",
"gyeongbuk.kr",
"gyeonggi.kr",
"gyeongnam.kr",
"incheon.kr",
"jeju.kr",
"jeonbuk.kr",
"jeonnam.kr",
"seoul.kr",
"ulsan.kr",
"edu.ky",
"gov.ky",
"com.ky",
"org.ky",
"net.ky",
"org.kz",
"edu.kz",
"net.kz",
"gov.kz",
"mil.kz",
"com.kz",
"int.la",
"net.la",
"info.la",
"edu.la",
"gov.la",
"per.la",
"com.la",
"org.la",
"com.lb",
"edu.lb",
"gov.lb",
"net.lb",
"org.lb",
"com.lc",
"net.lc",
"co.lc",
"org.lc",
"edu.lc",
"gov.lc",
"gov.lk",
"sch.lk",
"net.lk",
"int.lk",
"com.lk",
"org.lk",
"edu.lk",
"ngo.lk",
"soc.lk",
"web.lk",
"ltd.lk",
"assn.lk",
"grp.lk",
"hotel.lk",
"com.lr",
"edu.lr",
"gov.lr",
"org.lr",
"net.lr",
"co.ls",
"org.ls",
"gov.lt",
"com.lv",
"edu.lv",
"gov.lv",
"org.lv",
"mil.lv",
"id.lv",
"net.lv",
"asn.lv",
"conf.lv",
"com.ly",
"net.ly",
"gov.ly",
"plc.ly",
"edu.ly",
"sch.ly",
"med.ly",
"org.ly",
"id.ly",
"co.ma",
"net.ma",
"gov.ma",
"org.ma",
"ac.ma",
"press.ma",
"tm.mc",
"asso.mc",
"co.me",
"net.me",
"org.me",
"edu.me",
"ac.me",
"gov.me",
"its.me",
"priv.me",
"org.mg",
"nom.mg",
"gov.mg",
"prd.mg",
"tm.mg",
"edu.mg",
"mil.mg",
"com.mg",
"com.mk",
"org.mk",
"net.mk",
"edu.mk",
"gov.mk",
"inf.mk",
"name.mk",
"com.ml",
"edu.ml",
"gouv.ml",
"gov.ml",
"net.ml",
"org.ml",
"presse.ml",
"gov.mn",
"edu.mn",
"org.mn",
"com.mo",
"net.mo",
"org.mo",
"edu.mo",
"gov.mo",
"gov.mr",
"com.ms",
"edu.ms",
"gov.ms",
"net.ms",
"org.ms",
"com.mt",
"edu.mt",
"net.mt",
"org.mt",
"com.mu",
"net.mu",
"org.mu",
"gov.mu",
"ac.mu",
"co.mu",
"or.mu",
"academy.museum",
"agriculture.museum",
"air.museum",
"airguard.museum",
"alabama.museum",
"alaska.museum",
"amber.museum",
"ambulance.museum",
"american.museum",
"americana.museum",
"americanantiques.museum",
"americanart.museum",
"amsterdam.museum",
"and.museum",
"annefrank.museum",
"anthro.museum",
"anthropology.museum",
"antiques.museum",
"aquarium.museum",
"arboretum.museum",
"archaeological.museum",
"archaeology.museum",
"architecture.museum",
"art.museum",
"artanddesign.museum",
"artcenter.museum",
"artdeco.museum",
"arteducation.museum",
"artgallery.museum",
"arts.museum",
"artsandcrafts.museum",
"asmatart.museum",
"assassination.museum",
"assisi.museum",
"association.museum",
"astronomy.museum",
"atlanta.museum",
"austin.museum",
"australia.museum",
"automotive.museum",
"aviation.museum",
"axis.museum",
"badajoz.museum",
"baghdad.museum",
"bahn.museum",
"bale.museum",
"baltimore.museum",
"barcelona.museum",
"baseball.museum",
"basel.museum",
"baths.museum",
"bauern.museum",
"beauxarts.museum",
"beeldengeluid.museum",
"bellevue.museum",
"bergbau.museum",
"berkeley.museum",
"berlin.museum",
"bern.museum",
"bible.museum",
"bilbao.museum",
"bill.museum",
"birdart.museum",
"birthplace.museum",
"bonn.museum",
"boston.museum",
"botanical.museum",
"botanicalgarden.museum",
"botanicgarden.museum",
"botany.museum",
"brandywinevalley.museum",
"brasil.museum",
"bristol.museum",
"british.museum",
"britishcolumbia.museum",
"broadcast.museum",
"brunel.museum",
"brussel.museum",
"brussels.museum",
"bruxelles.museum",
"building.museum",
"burghof.museum",
"bus.museum",
"bushey.museum",
"cadaques.museum",
"california.museum",
"cambridge.museum",
"can.museum",
"canada.museum",
"capebreton.museum",
"carrier.museum",
"cartoonart.museum",
"casadelamoneda.museum",
"castle.museum",
"castres.museum",
"celtic.museum",
"center.museum",
"chattanooga.museum",
"cheltenham.museum",
"chesapeakebay.museum",
"chicago.museum",
"children.museum",
"childrens.museum",
"childrensgarden.museum",
"chiropractic.museum",
"chocolate.museum",
"christiansburg.museum",
"cincinnati.museum",
"cinema.museum",
"circus.museum",
"civilisation.museum",
"civilization.museum",
"civilwar.museum",
"clinton.museum",
"clock.museum",
"coal.museum",
"coastaldefence.museum",
"cody.museum",
"coldwar.museum",
"collection.museum",
"colonialwilliamsburg.museum",
"coloradoplateau.museum",
"columbia.museum",
"columbus.museum",
"communication.museum",
"communications.museum",
"community.museum",
"computer.museum",
"computerhistory.museum",
"contemporary.museum",
"contemporaryart.museum",
"convent.museum",
"copenhagen.museum",
"corporation.museum",
"corvette.museum",
"costume.museum",
"countryestate.museum",
"county.museum",
"crafts.museum",
"cranbrook.museum",
"creation.museum",
"cultural.museum",
"culturalcenter.museum",
"culture.museum",
"cyber.museum",
"cymru.museum",
"dali.museum",
"dallas.museum",
"database.museum",
"ddr.museum",
"decorativearts.museum",
"delaware.museum",
"delmenhorst.museum",
"denmark.museum",
"depot.museum",
"design.museum",
"detroit.museum",
"dinosaur.museum",
"discovery.museum",
"dolls.museum",
"donostia.museum",
"durham.museum",
"eastafrica.museum",
"eastcoast.museum",
"education.museum",
"educational.museum",
"egyptian.museum",
"eisenbahn.museum",
"elburg.museum",
"elvendrell.museum",
"embroidery.museum",
"encyclopedic.museum",
"england.museum",
"entomology.museum",
"environment.museum",
"environmentalconservation.museum",
"epilepsy.museum",
"essex.museum",
"estate.museum",
"ethnology.museum",
"exeter.museum",
"exhibition.museum",
"family.museum",
"farm.museum",
"farmequipment.museum",
"farmers.museum",
"farmstead.museum",
"field.museum",
"figueres.museum",
"filatelia.museum",
"film.museum",
"fineart.museum",
"finearts.museum",
"finland.museum",
"flanders.museum",
"florida.museum",
"force.museum",
"fortmissoula.museum",
"fortworth.museum",
"foundation.museum",
"francaise.museum",
"frankfurt.museum",
"franziskaner.museum",
"freemasonry.museum",
"freiburg.museum",
"fribourg.museum",
"frog.museum",
"fundacio.museum",
"furniture.museum",
"gallery.museum",
"garden.museum",
"gateway.museum",
"geelvinck.museum",
"gemological.museum",
"geology.museum",
"georgia.museum",
"giessen.museum",
"glas.museum",
"glass.museum",
"gorge.museum",
"grandrapids.museum",
"graz.museum",
"guernsey.museum",
"halloffame.museum",
"hamburg.museum",
"handson.museum",
"harvestcelebration.museum",
"hawaii.museum",
"health.museum",
"heimatunduhren.museum",
"hellas.museum",
"helsinki.museum",
"hembygdsforbund.museum",
"heritage.museum",
"histoire.museum",
"historical.museum",
"historicalsociety.museum",
"historichouses.museum",
"historisch.museum",
"historisches.museum",
"history.museum",
"historyofscience.museum",
"horology.museum",
"house.museum",
"humanities.museum",
"illustration.museum",
"imageandsound.museum",
"indian.museum",
"indiana.museum",
"indianapolis.museum",
"indianmarket.museum",
"intelligence.museum",
"interactive.museum",
"iraq.museum",
"iron.museum",
"isleofman.museum",
"jamison.museum",
"jefferson.museum",
"jerusalem.museum",
"jewelry.museum",
"jewish.museum",
"jewishart.museum",
"jfk.museum",
"journalism.museum",
"judaica.museum",
"judygarland.museum",
"juedisches.museum",
"juif.museum",
"karate.museum",
"karikatur.museum",
"kids.museum",
"koebenhavn.museum",
"koeln.museum",
"kunst.museum",
"kunstsammlung.museum",
"kunstunddesign.museum",
"labor.museum",
"labour.museum",
"lajolla.museum",
"lancashire.museum",
"landes.museum",
"lans.museum",
"larsson.museum",
"lewismiller.museum",
"lincoln.museum",
"linz.museum",
"living.museum",
"livinghistory.museum",
"localhistory.museum",
"london.museum",
"losangeles.museum",
"louvre.museum",
"loyalist.museum",
"lucerne.museum",
"luxembourg.museum",
"luzern.museum",
"mad.museum",
"madrid.museum",
"mallorca.museum",
"manchester.museum",
"mansion.museum",
"mansions.museum",
"manx.museum",
"marburg.museum",
"maritime.museum",
"maritimo.museum",
"maryland.museum",
"marylhurst.museum",
"media.museum",
"medical.museum",
"medizinhistorisches.museum",
"meeres.museum",
"memorial.museum",
"mesaverde.museum",
"michigan.museum",
"midatlantic.museum",
"military.museum",
"mill.museum",
"miners.museum",
"mining.museum",
"minnesota.museum",
"missile.museum",
"missoula.museum",
"modern.museum",
"moma.museum",
"money.museum",
"monmouth.museum",
"monticello.museum",
"montreal.museum",
"moscow.museum",
"motorcycle.museum",
"muenchen.museum",
"muenster.museum",
"mulhouse.museum",
"muncie.museum",
"museet.museum",
"museumcenter.museum",
"museumvereniging.museum",
"music.museum",
"national.museum",
"nationalfirearms.museum",
"nationalheritage.museum",
"nativeamerican.museum",
"naturalhistory.museum",
"naturalhistorymuseum.museum",
"naturalsciences.museum",
"nature.museum",
"naturhistorisches.museum",
"natuurwetenschappen.museum",
"naumburg.museum",
"naval.museum",
"nebraska.museum",
"neues.museum",
"newhampshire.museum",
"newjersey.museum",
"newmexico.museum",
"newport.museum",
"newspaper.museum",
"newyork.museum",
"niepce.museum",
"norfolk.museum",
"north.museum",
"nrw.museum",
"nuernberg.museum",
"nuremberg.museum",
"nyc.museum",
"nyny.museum",
"oceanographic.museum",
"oceanographique.museum",
"omaha.museum",
"online.museum",
"ontario.museum",
"openair.museum",
"oregon.museum",
"oregontrail.museum",
"otago.museum",
"oxford.museum",
"pacific.museum",
"paderborn.museum",
"palace.museum",
"paleo.museum",
"palmsprings.museum",
"panama.museum",
"paris.museum",
"pasadena.museum",
"pharmacy.museum",
"philadelphia.museum",
"philadelphiaarea.museum",
"philately.museum",
"phoenix.museum",
"photography.museum",
"pilots.museum",
"pittsburgh.museum",
"planetarium.museum",
"plantation.museum",
"plants.museum",
"plaza.museum",
"portal.museum",
"portland.museum",
"portlligat.museum",
"posts-and-telecommunications.museum",
"preservation.museum",
"presidio.museum",
"press.museum",
"project.museum",
"public.museum",
"pubol.museum",
"quebec.museum",
"railroad.museum",
"railway.museum",
"research.museum",
"resistance.museum",
"riodejaneiro.museum",
"rochester.museum",
"rockart.museum",
"roma.museum",
"russia.museum",
"saintlouis.museum",
"salem.museum",
"salvadordali.museum",
"salzburg.museum",
"sandiego.museum",
"sanfrancisco.museum",
"santabarbara.museum",
"santacruz.museum",
"santafe.museum",
"saskatchewan.museum",
"satx.museum",
"savannahga.museum",
"schlesisches.museum",
"schoenbrunn.museum",
"schokoladen.museum",
"school.museum",
"schweiz.museum",
"science.museum",
"scienceandhistory.museum",
"scienceandindustry.museum",
"sciencecenter.museum",
"sciencecenters.museum",
"science-fiction.museum",
"sciencehistory.museum",
"sciences.museum",
"sciencesnaturelles.museum",
"scotland.museum",
"seaport.museum",
"settlement.museum",
"settlers.museum",
"shell.museum",
"sherbrooke.museum",
"sibenik.museum",
"silk.museum",
"ski.museum",
"skole.museum",
"society.museum",
"sologne.museum",
"soundandvision.museum",
"southcarolina.museum",
"southwest.museum",
"space.museum",
"spy.museum",
"square.museum",
"stadt.museum",
"stalbans.museum",
"starnberg.museum",
"state.museum",
"stateofdelaware.museum",
"station.museum",
"steam.museum",
"steiermark.museum",
"stjohn.museum",
"stockholm.museum",
"stpetersburg.museum",
"stuttgart.museum",
"suisse.museum",
"surgeonshall.museum",
"surrey.museum",
"svizzera.museum",
"sweden.museum",
"sydney.museum",
"tank.museum",
"tcm.museum",
"technology.museum",
"telekommunikation.museum",
"television.museum",
"texas.museum",
"textile.museum",
"theater.museum",
"time.museum",
"timekeeping.museum",
"topology.museum",
"torino.museum",
"touch.museum",
"town.museum",
"transport.museum",
"tree.museum",
"trolley.museum",
"trust.museum",
"trustee.museum",
"uhren.museum",
"ulm.museum",
"undersea.museum",
"university.museum",
"usa.museum",
"usantiques.museum",
"usarts.museum",
"uscountryestate.museum",
"usculture.museum",
"usdecorativearts.museum",
"usgarden.museum",
"ushistory.museum",
"ushuaia.museum",
"uslivinghistory.museum",
"utah.museum",
"uvic.museum",
"valley.museum",
"vantaa.museum",
"versailles.museum",
"viking.museum",
"village.museum",
"virginia.museum",
"virtual.museum",
"virtuel.museum",
"vlaanderen.museum",
"volkenkunde.museum",
"wales.museum",
"wallonie.museum",
"war.museum",
"washingtondc.museum",
"watchandclock.museum",
"watch-and-clock.museum",
"western.museum",
"westfalen.museum",
"whaling.museum",
"wildlife.museum",
"williamsburg.museum",
"windmill.museum",
"workshop.museum",
"york.museum",
"yorkshire.museum",
"yosemite.museum",
"youth.museum",
"zoological.museum",
"zoology.museum",
"aero.mv",
"biz.mv",
"com.mv",
"coop.mv",
"edu.mv",
"gov.mv",
"info.mv",
"int.mv",
"mil.mv",
"museum.mv",
"name.mv",
"net.mv",
"org.mv",
"pro.mv",
"ac.mw",
"biz.mw",
"co.mw",
"com.mw",
"coop.mw",
"edu.mw",
"gov.mw",
"int.mw",
"museum.mw",
"net.mw",
"org.mw",
"com.mx",
"org.mx",
"gob.mx",
"edu.mx",
"net.mx",
"com.my",
"net.my",
"org.my",
"gov.my",
"edu.my",
"mil.my",
"name.my",
"info.na",
"pro.na",
"name.na",
"school.na",
"or.na",
"dr.na",
"us.na",
"mx.na",
"ca.na",
"in.na",
"cc.na",
"tv.na",
"ws.na",
"mobi.na",
"co.na",
"com.na",
"org.na",
"asso.nc",
"com.nf",
"net.nf",
"per.nf",
"rec.nf",
"web.nf",
"arts.nf",
"firm.nf",
"info.nf",
"other.nf",
"store.nf",
"com.ng",
"edu.ng",
"name.ng",
"net.ng",
"org.ng",
"sch.ng",
"gov.ng",
"mil.ng",
"mobi.ng",
"bv.nl",
"fhs.no",
"vgs.no",
"fylkesbibl.no",
"folkebibl.no",
"museum.no",
"idrett.no",
"priv.no",
"mil.no",
"stat.no",
"dep.no",
"kommune.no",
"herad.no",
"aa.no",
"ah.no",
"bu.no",
"fm.no",
"hl.no",
"hm.no",
"jan-mayen.no",
"mr.no",
"nl.no",
"nt.no",
"of.no",
"ol.no",
"oslo.no",
"rl.no",
"sf.no",
"st.no",
"svalbard.no",
"tm.no",
"tr.no",
"va.no",
"vf.no",
"akrehamn.no",
"algard.no",
"arna.no",
"brumunddal.no",
"bryne.no",
"bronnoysund.no",
"drobak.no",
"egersund.no",
"fetsund.no",
"floro.no",
"fredrikstad.no",
"hokksund.no",
"honefoss.no",
"jessheim.no",
"jorpeland.no",
"kirkenes.no",
"kopervik.no",
"krokstadelva.no",
"langevag.no",
"leirvik.no",
"mjondalen.no",
"mo-i-rana.no",
"mosjoen.no",
"nesoddtangen.no",
"orkanger.no",
"osoyro.no",
"raholt.no",
"sandnessjoen.no",
"skedsmokorset.no",
"slattum.no",
"spjelkavik.no",
"stathelle.no",
"stavern.no",
"stjordalshalsen.no",
"tananger.no",
"tranby.no",
"vossevangen.no",
"afjord.no",
"agdenes.no",
"al.no",
"alesund.no",
"alstahaug.no",
"alta.no",
"alaheadju.no",
"alvdal.no",
"amli.no",
"amot.no",
"andebu.no",
"andoy.no",
"andasuolo.no",
"ardal.no",
"aremark.no",
"arendal.no",
"aseral.no",
"asker.no",
"askim.no",
"askvoll.no",
"askoy.no",
"asnes.no",
"audnedaln.no",
"aukra.no",
"aure.no",
"aurland.no",
"aurskog-holand.no",
"austevoll.no",
"austrheim.no",
"averoy.no",
"balestrand.no",
"ballangen.no",
"balat.no",
"balsfjord.no",
"bahccavuotna.no",
"bamble.no",
"bardu.no",
"beardu.no",
"beiarn.no",
"bajddar.no",
"baidar.no",
"berg.no",
"bergen.no",
"berlevag.no",
"bearalvahki.no",
"bindal.no",
"birkenes.no",
"bjarkoy.no",
"bjerkreim.no",
"bjugn.no",
"bodo.no",
"badaddja.no",
"budejju.no",
"bokn.no",
"bremanger.no",
"bronnoy.no",
"bygland.no",
"bykle.no",
"barum.no",
"bievat.no",
"bomlo.no",
"batsfjord.no",
"bahcavuotna.no",
"dovre.no",
"drammen.no",
"drangedal.no",
"dyroy.no",
"donna.no",
"eid.no",
"eidfjord.no",
"eidsberg.no",
"eidskog.no",
"eidsvoll.no",
"eigersund.no",
"elverum.no",
"enebakk.no",
"engerdal.no",
"etne.no",
"etnedal.no",
"evenes.no",
"evenassi.no",
"evje-og-hornnes.no",
"farsund.no",
"fauske.no",
"fuossko.no",
"fuoisku.no",
"fedje.no",
"fet.no",
"finnoy.no",
"fitjar.no",
"fjaler.no",
"fjell.no",
"flakstad.no",
"flatanger.no",
"flekkefjord.no",
"flesberg.no",
"flora.no",
"fla.no",
"folldal.no",
"forsand.no",
"fosnes.no",
"frei.no",
"frogn.no",
"froland.no",
"frosta.no",
"frana.no",
"froya.no",
"fusa.no",
"fyresdal.no",
"forde.no",
"gamvik.no",
"gangaviika.no",
"gaular.no",
"gausdal.no",
"gildeskal.no",
"giske.no",
"gjemnes.no",
"gjerdrum.no",
"gjerstad.no",
"gjesdal.no",
"gjovik.no",
"gloppen.no",
"gol.no",
"gran.no",
"grane.no",
"granvin.no",
"gratangen.no",
"grimstad.no",
"grong.no",
"kraanghke.no",
"grue.no",
"gulen.no",
"hadsel.no",
"halden.no",
"halsa.no",
"hamar.no",
"hamaroy.no",
"habmer.no",
"hapmir.no",
"hammerfest.no",
"hammarfeasta.no",
"haram.no",
"hareid.no",
"harstad.no",
"hasvik.no",
"aknoluokta.no",
"hattfjelldal.no",
"aarborte.no",
"haugesund.no",
"hemne.no",
"hemnes.no",
"hemsedal.no",
"hitra.no",
"hjartdal.no",
"hjelmeland.no",
"hobol.no",
"hof.no",
"hol.no",
"hole.no",
"holmestrand.no",
"holtalen.no",
"hornindal.no",
"horten.no",
"hurdal.no",
"hurum.no",
"hvaler.no",
"hyllestad.no",
"hagebostad.no",
"hoyanger.no",
"hoylandet.no",
"ha.no",
"ibestad.no",
"inderoy.no",
"iveland.no",
"jevnaker.no",
"jondal.no",
"jolster.no",
"karasjok.no",
"karasjohka.no",
"karlsoy.no",
"galsa.no",
"karmoy.no",
"kautokeino.no",
"guovdageaidnu.no",
"klepp.no",
"klabu.no",
"kongsberg.no",
"kongsvinger.no",
"kragero.no",
"kristiansand.no",
"kristiansund.no",
"krodsherad.no",
"kvalsund.no",
"rahkkeravju.no",
"kvam.no",
"kvinesdal.no",
"kvinnherad.no",
"kviteseid.no",
"kvitsoy.no",
"kvafjord.no",
"giehtavuoatna.no",
"kvanangen.no",
"navuotna.no",
"kafjord.no",
"gaivuotna.no",
"larvik.no",
"lavangen.no",
"lavagis.no",
"loabat.no",
"lebesby.no",
"davvesiida.no",
"leikanger.no",
"leirfjord.no",
"leka.no",
"leksvik.no",
"lenvik.no",
"leangaviika.no",
"lesja.no",
"levanger.no",
"lier.no",
"lierne.no",
"lillehammer.no",
"lillesand.no",
"lindesnes.no",
"lindas.no",
"lom.no",
"loppa.no",
"lahppi.no",
"lund.no",
"lunner.no",
"luroy.no",
"luster.no",
"lyngdal.no",
"lyngen.no",
"ivgu.no",
"lardal.no",
"lerdal.no",
"lodingen.no",
"lorenskog.no",
"loten.no",
"malvik.no",
"masoy.no",
"muosat.no",
"mandal.no",
"marker.no",
"marnardal.no",
"masfjorden.no",
"meland.no",
"meldal.no",
"melhus.no",
"meloy.no",
"meraker.no",
"moareke.no",
"midsund.no",
"midtre-gauldal.no",
"modalen.no",
"modum.no",
"molde.no",
"moskenes.no",
"moss.no",
"mosvik.no",
"malselv.no",
"malatvuopmi.no",
"namdalseid.no",
"aejrie.no",
"namsos.no",
"namsskogan.no",
"naamesjevuemie.no",
"laakesvuemie.no",
"nannestad.no",
"narvik.no",
"narviika.no",
"naustdal.no",
"nedre-eiker.no",
"nesna.no",
"nesodden.no",
"nesseby.no",
"unjarga.no",
"nesset.no",
"nissedal.no",
"nittedal.no",
"nord-aurdal.no",
"nord-fron.no",
"nord-odal.no",
"norddal.no",
"nordkapp.no",
"davvenjarga.no",
"nordre-land.no",
"nordreisa.no",
"raisa.no",
"nore-og-uvdal.no",
"notodden.no",
"naroy.no",
"notteroy.no",
"odda.no",
"oksnes.no",
"oppdal.no",
"oppegard.no",
"orkdal.no",
"orland.no",
"orskog.no",
"orsta.no",
"osen.no",
"osteroy.no",
"ostre-toten.no",
"overhalla.no",
"ovre-eiker.no",
"oyer.no",
"oygarden.no",
"oystre-slidre.no",
"porsanger.no",
"porsangu.no",
"porsgrunn.no",
"radoy.no",
"rakkestad.no",
"rana.no",
"ruovat.no",
"randaberg.no",
"rauma.no",
"rendalen.no",
"rennebu.no",
"rennesoy.no",
"rindal.no",
"ringebu.no",
"ringerike.no",
"ringsaker.no",
"rissa.no",
"risor.no",
"roan.no",
"rollag.no",
"rygge.no",
"ralingen.no",
"rodoy.no",
"romskog.no",
"roros.no",
"rost.no",
"royken.no",
"royrvik.no",
"rade.no",
"salangen.no",
"siellak.no",
"saltdal.no",
"salat.no",
"samnanger.no",
"sandefjord.no",
"sandnes.no",
"sandoy.no",
"sarpsborg.no",
"sauda.no",
"sauherad.no",
"sel.no",
"selbu.no",
"selje.no",
"seljord.no",
"sigdal.no",
"siljan.no",
"sirdal.no",
"skaun.no",
"skedsmo.no",
"ski.no",
"skien.no",
"skiptvet.no",
"skjervoy.no",
"skierva.no",
"skjak.no",
"skodje.no",
"skanland.no",
"skanit.no",
"smola.no",
"snillfjord.no",
"snasa.no",
"snoasa.no",
"snaase.no",
"sogndal.no",
"sokndal.no",
"sola.no",
"solund.no",
"songdalen.no",
"sortland.no",
"spydeberg.no",
"stange.no",
"stavanger.no",
"steigen.no",
"steinkjer.no",
"stjordal.no",
"stokke.no",
"stor-elvdal.no",
"stord.no",
"stordal.no",
"storfjord.no",
"omasvuotna.no",
"strand.no",
"stranda.no",
"stryn.no",
"sula.no",
"suldal.no",
"sund.no",
"sunndal.no",
"surnadal.no",
"sveio.no",
"svelvik.no",
"sykkylven.no",
"sogne.no",
"somna.no",
"sondre-land.no",
"sor-aurdal.no",
"sor-fron.no",
"sor-odal.no",
"sor-varanger.no",
"matta-varjjat.no",
"sorfold.no",
"sorreisa.no",
"sorum.no",
"tana.no",
"deatnu.no",
"time.no",
"tingvoll.no",
"tinn.no",
"tjeldsund.no",
"dielddanuorri.no",
"tjome.no",
"tokke.no",
"tolga.no",
"torsken.no",
"tranoy.no",
"tromso.no",
"tromsa.no",
"romsa.no",
"trondheim.no",
"troandin.no",
"trysil.no",
"trana.no",
"trogstad.no",
"tvedestrand.no",
"tydal.no",
"tynset.no",
"tysfjord.no",
"divtasvuodna.no",
"divttasvuotna.no",
"tysnes.no",
"tysvar.no",
"tonsberg.no",
"ullensaker.no",
"ullensvang.no",
"ulvik.no",
"utsira.no",
"vadso.no",
"cahcesuolo.no",
"vaksdal.no",
"valle.no",
"vang.no",
"vanylven.no",
"vardo.no",
"varggat.no",
"vefsn.no",
"vaapste.no",
"vega.no",
"vegarshei.no",
"vennesla.no",
"verdal.no",
"verran.no",
"vestby.no",
"vestnes.no",
"vestre-slidre.no",
"vestre-toten.no",
"vestvagoy.no",
"vevelstad.no",
"vik.no",
"vikna.no",
"vindafjord.no",
"volda.no",
"voss.no",
"varoy.no",
"vagan.no",
"voagat.no",
"vagsoy.no",
"vaga.no",
"biz.nr",
"info.nr",
"gov.nr",
"edu.nr",
"org.nr",
"net.nr",
"com.nr",
"co.om",
"com.om",
"edu.om",
"gov.om",
"med.om",
"museum.om",
"net.om",
"org.om",
"pro.om",
"ac.pa",
"gob.pa",
"com.pa",
"org.pa",
"sld.pa",
"edu.pa",
"net.pa",
"ing.pa",
"abo.pa",
"med.pa",
"nom.pa",
"edu.pe",
"gob.pe",
"nom.pe",
"mil.pe",
"org.pe",
"com.pe",
"net.pe",
"com.pf",
"org.pf",
"edu.pf",
"com.ph",
"net.ph",
"org.ph",
"gov.ph",
"edu.ph",
"ngo.ph",
"mil.ph",
"i.ph",
"com.pk",
"net.pk",
"edu.pk",
"org.pk",
"fam.pk",
"biz.pk",
"web.pk",
"gov.pk",
"gob.pk",
"gok.pk",
"gon.pk",
"gop.pk",
"gos.pk",
"info.pk",
"aid.pl",
"agro.pl",
"atm.pl",
"auto.pl",
"biz.pl",
"com.pl",
"edu.pl",
"gmina.pl",
"gsm.pl",
"info.pl",
"mail.pl",
"miasta.pl",
"media.pl",
"mil.pl",
"net.pl",
"nieruchomosci.pl",
"nom.pl",
"org.pl",
"pc.pl",
"powiat.pl",
"priv.pl",
"realestate.pl",
"rel.pl",
"sex.pl",
"shop.pl",
"sklep.pl",
"sos.pl",
"szkola.pl",
"targi.pl",
"tm.pl",
"tourism.pl",
"travel.pl",
"turystyka.pl",
"6bone.pl",
"art.pl",
"mbone.pl",
"gov.pl",
"ngo.pl",
"irc.pl",
"usenet.pl",
"augustow.pl",
"babia-gora.pl",
"bedzin.pl",
"beskidy.pl",
"bialowieza.pl",
"bialystok.pl",
"bielawa.pl",
"bieszczady.pl",
"boleslawiec.pl",
"bydgoszcz.pl",
"bytom.pl",
"cieszyn.pl",
"czeladz.pl",
"czest.pl",
"dlugoleka.pl",
"elblag.pl",
"elk.pl",
"glogow.pl",
"gniezno.pl",
"gorlice.pl",
"grajewo.pl",
"ilawa.pl",
"jaworzno.pl",
"jelenia-gora.pl",
"jgora.pl",
"kalisz.pl",
"kazimierz-dolny.pl",
"karpacz.pl",
"kartuzy.pl",
"kaszuby.pl",
"katowice.pl",
"kepno.pl",
"ketrzyn.pl",
"klodzko.pl",
"kobierzyce.pl",
"kolobrzeg.pl",
"konin.pl",
"konskowola.pl",
"kutno.pl",
"lapy.pl",
"lebork.pl",
"legnica.pl",
"lezajsk.pl",
"limanowa.pl",
"lomza.pl",
"lowicz.pl",
"lubin.pl",
"lukow.pl",
"malbork.pl",
"malopolska.pl",
"mazowsze.pl",
"mazury.pl",
"mielec.pl",
"mielno.pl",
"mragowo.pl",
"naklo.pl",
"nowaruda.pl",
"nysa.pl",
"olawa.pl",
"olecko.pl",
"olkusz.pl",
"olsztyn.pl",
"opoczno.pl",
"opole.pl",
"ostroda.pl",
"ostroleka.pl",
"ostrowiec.pl",
"ostrowwlkp.pl",
"pila.pl",
"pisz.pl",
"podhale.pl",
"podlasie.pl",
"polkowice.pl",
"pomorze.pl",
"pomorskie.pl",
"prochowice.pl",
"pruszkow.pl",
"przeworsk.pl",
"pulawy.pl",
"radom.pl",
"rawa-maz.pl",
"rybnik.pl",
"rzeszow.pl",
"sanok.pl",
"sejny.pl",
"siedlce.pl",
"slask.pl",
"slupsk.pl",
"sosnowiec.pl",
"stalowa-wola.pl",
"skoczow.pl",
"starachowice.pl",
"stargard.pl",
"suwalki.pl",
"swidnica.pl",
"swiebodzin.pl",
"swinoujscie.pl",
"szczecin.pl",
"szczytno.pl",
"tarnobrzeg.pl",
"tgory.pl",
"turek.pl",
"tychy.pl",
"ustka.pl",
"walbrzych.pl",
"warmia.pl",
"warszawa.pl",
"waw.pl",
"wegrow.pl",
"wielun.pl",
"wlocl.pl",
"wloclawek.pl",
"wodzislaw.pl",
"wolomin.pl",
"wroclaw.pl",
"zachpomor.pl",
"zagan.pl",
"zarow.pl",
"zgora.pl",
"zgorzelec.pl",
"gda.pl",
"gdansk.pl",
"gdynia.pl",
"med.pl",
"sopot.pl",
"gliwice.pl",
"krakow.pl",
"poznan.pl",
"wroc.pl",
"zakopane.pl",
"gov.pn",
"co.pn",
"org.pn",
"edu.pn",
"net.pn",
"com.pr",
"net.pr",
"org.pr",
"gov.pr",
"edu.pr",
"isla.pr",
"pro.pr",
"biz.pr",
"info.pr",
"name.pr",
"est.pr",
"prof.pr",
"ac.pr",
"aca.pro",
"bar.pro",
"cpa.pro",
"jur.pro",
"law.pro",
"med.pro",
"eng.pro",
"edu.ps",
"gov.ps",
"sec.ps",
"plo.ps",
"com.ps",
"org.ps",
"net.ps",
"net.pt",
"gov.pt",
"org.pt",
"edu.pt",
"int.pt",
"publ.pt",
"com.pt",
"nome.pt",
"co.pw",
"ne.pw",
"or.pw",
"ed.pw",
"go.pw",
"belau.pw",
"com.py",
"coop.py",
"edu.py",
"gov.py",
"mil.py",
"net.py",
"org.py",
"com.qa",
"edu.qa",
"gov.qa",
"mil.qa",
"name.qa",
"net.qa",
"org.qa",
"sch.qa",
"com.re",
"asso.re",
"nom.re",
"com.ro",
"org.ro",
"tm.ro",
"nt.ro",
"nom.ro",
"info.ro",
"rec.ro",
"arts.ro",
"firm.ro",
"store.ro",
"www.ro",
"co.rs",
"org.rs",
"edu.rs",
"ac.rs",
"gov.rs",
"in.rs",
"ac.ru",
"com.ru",
"edu.ru",
"int.ru",
"net.ru",
"org.ru",
"pp.ru",
"adygeya.ru",
"altai.ru",
"amur.ru",
"arkhangelsk.ru",
"astrakhan.ru",
"bashkiria.ru",
"belgorod.ru",
"bir.ru",
"bryansk.ru",
"buryatia.ru",
"cbg.ru",
"chel.ru",
"chelyabinsk.ru",
"chita.ru",
"chukotka.ru",
"chuvashia.ru",
"dagestan.ru",
"dudinka.ru",
"e-burg.ru",
"grozny.ru",
"irkutsk.ru",
"ivanovo.ru",
"izhevsk.ru",
"jar.ru",
"joshkar-ola.ru",
"kalmykia.ru",
"kaluga.ru",
"kamchatka.ru",
"karelia.ru",
"kazan.ru",
"kchr.ru",
"kemerovo.ru",
"khabarovsk.ru",
"khakassia.ru",
"khv.ru",
"kirov.ru",
"koenig.ru",
"komi.ru",
"kostroma.ru",
"krasnoyarsk.ru",
"kuban.ru",
"kurgan.ru",
"kursk.ru",
"lipetsk.ru",
"magadan.ru",
"mari.ru",
"mari-el.ru",
"marine.ru",
"mordovia.ru",
"mosreg.ru",
"msk.ru",
"murmansk.ru",
"nalchik.ru",
"nnov.ru",
"nov.ru",
"novosibirsk.ru",
"nsk.ru",
"omsk.ru",
"orenburg.ru",
"oryol.ru",
"palana.ru",
"penza.ru",
"perm.ru",
"pskov.ru",
"ptz.ru",
"rnd.ru",
"ryazan.ru",
"sakhalin.ru",
"samara.ru",
"saratov.ru",
"simbirsk.ru",
"smolensk.ru",
"spb.ru",
"stavropol.ru",
"stv.ru",
"surgut.ru",
"tambov.ru",
"tatarstan.ru",
"tom.ru",
"tomsk.ru",
"tsaritsyn.ru",
"tsk.ru",
"tula.ru",
"tuva.ru",
"tver.ru",
"tyumen.ru",
"udm.ru",
"udmurtia.ru",
"ulan-ude.ru",
"vladikavkaz.ru",
"vladimir.ru",
"vladivostok.ru",
"volgograd.ru",
"vologda.ru",
"voronezh.ru",
"vrn.ru",
"vyatka.ru",
"yakutia.ru",
"yamal.ru",
"yaroslavl.ru",
"yekaterinburg.ru",
"yuzhno-sakhalinsk.ru",
"amursk.ru",
"baikal.ru",
"cmw.ru",
"fareast.ru",
"jamal.ru",
"kms.ru",
"k-uralsk.ru",
"kustanai.ru",
"kuzbass.ru",
"magnitka.ru",
"mytis.ru",
"nakhodka.ru",
"nkz.ru",
"norilsk.ru",
"oskol.ru",
"pyatigorsk.ru",
"rubtsovsk.ru",
"snz.ru",
"syzran.ru",
"vdonsk.ru",
"zgrad.ru",
"gov.ru",
"mil.ru",
"test.ru",
"gov.rw",
"net.rw",
"edu.rw",
"ac.rw",
"com.rw",
"co.rw",
"int.rw",
"mil.rw",
"gouv.rw",
"com.sa",
"net.sa",
"org.sa",
"gov.sa",
"med.sa",
"pub.sa",
"edu.sa",
"sch.sa",
"com.sb",
"edu.sb",
"gov.sb",
"net.sb",
"org.sb",
"com.sc",
"gov.sc",
"net.sc",
"org.sc",
"edu.sc",
"com.sd",
"net.sd",
"org.sd",
"edu.sd",
"med.sd",
"tv.sd",
"gov.sd",
"info.sd",
"a.se",
"ac.se",
"b.se",
"bd.se",
"brand.se",
"c.se",
"d.se",
"e.se",
"f.se",
"fh.se",
"fhsk.se",
"fhv.se",
"g.se",
"h.se",
"i.se",
"k.se",
"komforb.se",
"kommunalforbund.se",
"komvux.se",
"l.se",
"lanbib.se",
"m.se",
"n.se",
"naturbruksgymn.se",
"o.se",
"org.se",
"p.se",
"parti.se",
"pp.se",
"press.se",
"r.se",
"s.se",
"t.se",
"tm.se",
"u.se",
"w.se",
"x.se",
"y.se",
"z.se",
"com.sg",
"net.sg",
"org.sg",
"gov.sg",
"edu.sg",
"per.sg",
"com.sh",
"net.sh",
"gov.sh",
"org.sh",
"mil.sh",
"com.sl",
"net.sl",
"edu.sl",
"gov.sl",
"org.sl",
"art.sn",
"com.sn",
"edu.sn",
"gouv.sn",
"org.sn",
"perso.sn",
"univ.sn",
"com.so",
"net.so",
"org.so",
"co.st",
"com.st",
"consulado.st",
"edu.st",
"embaixada.st",
"gov.st",
"mil.st",
"net.st",
"org.st",
"principe.st",
"saotome.st",
"store.st",
"com.sv",
"edu.sv",
"gob.sv",
"org.sv",
"red.sv",
"gov.sx",
"edu.sy",
"gov.sy",
"net.sy",
"mil.sy",
"com.sy",
"org.sy",
"co.sz",
"ac.sz",
"org.sz",
"ac.th",
"co.th",
"go.th",
"in.th",
"mi.th",
"net.th",
"or.th",
"ac.tj",
"biz.tj",
"co.tj",
"com.tj",
"edu.tj",
"go.tj",
"gov.tj",
"int.tj",
"mil.tj",
"name.tj",
"net.tj",
"nic.tj",
"org.tj",
"test.tj",
"web.tj",
"gov.tl",
"com.tm",
"co.tm",
"org.tm",
"net.tm",
"nom.tm",
"gov.tm",
"mil.tm",
"edu.tm",
"com.tn",
"ens.tn",
"fin.tn",
"gov.tn",
"ind.tn",
"intl.tn",
"nat.tn",
"net.tn",
"org.tn",
"info.tn",
"perso.tn",
"tourism.tn",
"edunet.tn",
"rnrt.tn",
"rns.tn",
"rnu.tn",
"mincom.tn",
"agrinet.tn",
"defense.tn",
"turen.tn",
"com.to",
"gov.to",
"net.to",
"org.to",
"edu.to",
"mil.to",
"co.tt",
"com.tt",
"org.tt",
"net.tt",
"biz.tt",
"info.tt",
"pro.tt",
"int.tt",
"coop.tt",
"jobs.tt",
"mobi.tt",
"travel.tt",
"museum.tt",
"aero.tt",
"name.tt",
"gov.tt",
"edu.tt",
"edu.tw",
"gov.tw",
"mil.tw",
"com.tw",
"net.tw",
"org.tw",
"idv.tw",
"game.tw",
"ebiz.tw",
"club.tw",
"ac.tz",
"co.tz",
"go.tz",
"hotel.tz",
"info.tz",
"me.tz",
"mil.tz",
"mobi.tz",
"ne.tz",
"or.tz",
"sc.tz",
"tv.tz",
"com.ua",
"edu.ua",
"gov.ua",
"in.ua",
"net.ua",
"org.ua",
"cherkassy.ua",
"cherkasy.ua",
"chernigov.ua",
"chernihiv.ua",
"chernivtsi.ua",
"chernovtsy.ua",
"ck.ua",
"cn.ua",
"cr.ua",
"crimea.ua",
"cv.ua",
"dn.ua",
"dnepropetrovsk.ua",
"dnipropetrovsk.ua",
"dominic.ua",
"donetsk.ua",
"dp.ua",
"if.ua",
"ivano-frankivsk.ua",
"kh.ua",
"kharkiv.ua",
"kharkov.ua",
"kherson.ua",
"khmelnitskiy.ua",
"khmelnytskyi.ua",
"kiev.ua",
"kirovograd.ua",
"km.ua",
"kr.ua",
"krym.ua",
"ks.ua",
"kv.ua",
"kyiv.ua",
"lg.ua",
"lt.ua",
"lugansk.ua",
"lutsk.ua",
"lv.ua",
"lviv.ua",
"mk.ua",
"mykolaiv.ua",
"nikolaev.ua",
"od.ua",
"odesa.ua",
"odessa.ua",
"pl.ua",
"poltava.ua",
"rivne.ua",
"rovno.ua",
"rv.ua",
"sb.ua",
"sebastopol.ua",
"sevastopol.ua",
"sm.ua",
"sumy.ua",
"te.ua",
"ternopil.ua",
"uz.ua",
"uzhgorod.ua",
"vinnica.ua",
"vinnytsia.ua",
"vn.ua",
"volyn.ua",
"yalta.ua",
"zaporizhzhe.ua",
"zaporizhzhia.ua",
"zhitomir.ua",
"zhytomyr.ua",
"zp.ua",
"zt.ua",
"co.ua",
"pp.ua",
"co.ug",
"or.ug",
"ac.ug",
"sc.ug",
"go.ug",
"ne.ug",
"com.ug",
"org.ug",
"dni.us",
"fed.us",
"isa.us",
"kids.us",
"nsn.us",
"ak.us",
"al.us",
"ar.us",
"as.us",
"az.us",
"ca.us",
"co.us",
"ct.us",
"dc.us",
"de.us",
"fl.us",
"ga.us",
"gu.us",
"hi.us",
"ia.us",
"id.us",
"il.us",
"in.us",
"ks.us",
"ky.us",
"la.us",
"ma.us",
"md.us",
"me.us",
"mi.us",
"mn.us",
"mo.us",
"ms.us",
"mt.us",
"nc.us",
"nd.us",
"ne.us",
"nh.us",
"nj.us",
"nm.us",
"nv.us",
"ny.us",
"oh.us",
"ok.us",
"or.us",
"pa.us",
"pr.us",
"ri.us",
"sc.us",
"sd.us",
"tn.us",
"tx.us",
"ut.us",
"vi.us",
"vt.us",
"va.us",
"wa.us",
"wi.us",
"wv.us",
"wy.us",
"com.uy",
"edu.uy",
"gub.uy",
"mil.uy",
"net.uy",
"org.uy",
"co.uz",
"com.uz",
"net.uz",
"org.uz",
"com.vc",
"net.vc",
"org.vc",
"gov.vc",
"mil.vc",
"edu.vc",
"co.ve",
"com.ve",
"e12.ve",
"edu.ve",
"gov.ve",
"info.ve",
"mil.ve",
"net.ve",
"org.ve",
"web.ve",
"co.vi",
"com.vi",
"k12.vi",
"net.vi",
"org.vi",
"com.vn",
"net.vn",
"org.vn",
"edu.vn",
"gov.vn",
"int.vn",
"ac.vn",
"biz.vn",
"info.vn",
"name.vn",
"pro.vn",
"health.vn",
"com.ws",
"net.ws",
"org.ws",
"gov.ws",
"edu.ws",
"ae.org",
"ar.com",
"br.com",
"cn.com",
"com.de",
"de.com",
"eu.com",
"gb.com",
"gb.net",
"hu.com",
"hu.net",
"jp.net",
"jpn.com",
"kr.com",
"mex.com",
"no.com",
"qc.com",
"ru.com",
"sa.com",
"se.com",
"se.net",
"uk.com",
"uk.net",
"us.com",
"uy.com",
"za.bz",
"za.com"];

	return _webMotionHelpers;

}());
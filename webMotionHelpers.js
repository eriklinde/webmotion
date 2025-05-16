/**

Part of the WebMotion (http://www.webmotion.info/) Chrome Extension,
built by Erik Linde. WebMotion highlights one letter in every link, and lets
users follow that link by pressing it on their keyboard
(a.k.a. mouseless web surfing)

Contains the core functionality of WebMotion; ie finding an highlighting letters in links; listening to keyboard presses, etc.

*/


var webMotionHelpers = (function() {

	var _webMotionHelpers = {};
	_webMotionHelpers.modifiableLinks = []; // a collection of the current links on a web page
	_webMotionHelpers.modifiableLinksAlt = [];
	_webMotionHelpers.ctrlPressed = false;
	_webMotionHelpers.shiftPressed = false;
	_webMotionHelpers.altPressed = false;
	_webMotionHelpers.cmdPressed = false;
	_webMotionHelpers.premium = true;
	// the color letters will be highlighted in (red)
	_webMotionHelpers.standardColor = '#e84c3d';
	// an alternative color (blue) in case link is already read
	_webMotionHelpers.alternativeColor = '#5280bb';
	_webMotionHelpers.viewPortHeight;
	_webMotionHelpers.viewPortWidth;
	_webMotionHelpers.keyMap = {};
	_webMotionHelpers.keyMapAlt = {};
	_webMotionHelpers.takenAbbreviations = [];
	_webMotionHelpers.takenAbbreviationsAlt = [];
	_webMotionHelpers.blockedRootDomains;
	_webMotionHelpers.blockedFullDomains;
	_webMotionHelpers.DOMElemForEscaping;
	// keeps track of the two most recently pressed alphanumeric keys
	_webMotionHelpers.keyPresses = [{character: 'dummy1', timeStamp: 100000, timeOutID: null},{character: 'dummy2', timeStamp: 200000, timeOutID: null},{character: 'dummy3', timeStamp: 300000, timeOutID: null}];
	//the HTML representation of &, <, >, " and SPACE.  These will not be made into clickable letters.
	_webMotionHelpers.reservedHTMLCharacters = ["&amp;", "&lt;", "&gt;", "&quot;", "&nbsp;"];
	// Reserved keys: used to close website, go back and forth between tabs, etc.
	_webMotionHelpers.reservedShortcuts = ['x', 'b', 'j', 'k', 'h', 'l'];
	_webMotionHelpers.alwaysPermissibleShortcuts = []; // these keys will work even in forbidden domains
	_webMotionHelpers.defaultForbiddenDomains = ['facebook.com', 'google.com', 'google.co.in', 'google.co.uk', 'google.fr', 'google.es', 'google.ru', 'google.jp', 'google.it', 'google.com.br', 'google.com.mx', 'google.ca', 'google.com.hk', 'google.de', 'gmail.com', 'twitter.com', , 'notezilla.io', 'notezilla.info', '0.0.0.0'];

	_webMotionHelpers.initializeStandardKeyListeners = function() {
		_webMotionHelpers.initializeAltKeyListener();//cmd, shift, alt, etc.
		_webMotionHelpers.initializeAlphaNumericKeyListeners();
	}
	_webMotionHelpers.initializeAlwaysOnKeyListeners = function() {
		$(document).on('keydown', function(e) {
			var pressedChar = String.fromCharCode(e.keyCode).toLowerCase();
			if (_webMotionHelpers.alwaysPermissibleShortcuts.containsString(pressedChar)) {
				_webMotionHelpers.handleAlwaysPermissibleKeyPress(pressedChar, e);
			}
		});
	}

	_webMotionHelpers.activateWebMotion = function(activateStandardKeyListeners, activateAlwaysOnListeners) {
		_webMotionHelpers.DOMElemForEscaping = document.createElement("textarea");
		_webMotionHelpers.initializeFocusBlurListeners();
		_webMotionHelpers.initializeWindowScrollListener();
		if (activateAlwaysOnListeners) {
			_webMotionHelpers.initializeAlwaysOnKeyListeners();
		}
		if (activateStandardKeyListeners) {
			_webMotionHelpers.initializeStandardKeyListeners();
		}
		chrome.runtime.sendMessage({msg: 'get_viewport_dimensions'}, function(response) {
			_webMotionHelpers.viewPortHeight = response.height;
			_webMotionHelpers.viewPortWidth = response.width;
			_webMotionHelpers.processLinks();
		});
	}


	_webMotionHelpers.deactivateWebMotion = function(killAlwaysOnShortcuts) {
		// When user turns off WebMotion from the webmotion popup menu
		_webMotionHelpers.terminateAllEventHandlers(killAlwaysOnShortcuts);
		_webMotionHelpers.resetAllLinks();
	}

	_webMotionHelpers.terminateAllEventHandlers = function(killAlwaysOnShortcuts) {
		$(document).off();
		$(window).off(); //terminate the window scroll
		if (!(killAlwaysOnShortcuts)) {
			// reinstate the always permissible shortcuts
			_webMotionHelpers.initializeAlwaysOnKeyListeners();
		}
	}


	_webMotionHelpers.gatherLegitimateLinks = function() {
		// Extracts all links from a web page
		var modifiableLinks = [];
		$('a:visible').each(function(index) {
			if (_webMotionHelpers.isLinkLegitimate($(this))) {
				var link = {linkObj:$(this), fontSize: parseInt($(this).css('font-size')), shortCut:"", originalOrder:index, absoluteURL: $(this).prop("href")};
				modifiableLinks.push(link);
			}
		});
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
				_webMotionHelpers.processLinks();
			}, 70));
		});
	}


	_webMotionHelpers.processLinks = function() {
		// Analyzes all links on a web page and figures out which letter to highlight in each link
		_webMotionHelpers.modifiableLinks = [];
		_webMotionHelpers.modifiableLinksAlt = [];
		webMotionHelpers.takenAbbreviations = [];
		webMotionHelpers.takenAbbreviationsAlt = [];
		webMotionHelpers.resetAllLinks();
			// Gather all the links we (potentially) need to modify
			_webMotionHelpers.modifiableLinks = _webMotionHelpers.gatherLegitimateLinks();
			_webMotionHelpers.modifiableLinks = _webMotionHelpers.sortLinkSetByFontSize(_webMotionHelpers.modifiableLinks);
			// process each link (ie, figure out which letter to be the shortcut, alter the underlying html (ie make one letter red), etc)
			for (var i=0; i <= _webMotionHelpers.modifiableLinks.length - 1; i++) {
				var reprocessForAltKey = webMotionHelpers.analyzeAndModifyLink(_webMotionHelpers.modifiableLinks[i].linkObj, false);
				if (reprocessForAltKey) {
					_webMotionHelpers.modifiableLinksAlt.push(_webMotionHelpers.modifiableLinks[i]);
				}
			}
			for (var i=0; i <= _webMotionHelpers.modifiableLinksAlt.length - 1; i++) {
				var reprocessForAltKey = webMotionHelpers.analyzeAndModifyLink(_webMotionHelpers.modifiableLinksAlt[i].linkObj, true);
			}
		}


		_webMotionHelpers.specialCharactersPressed = function(event) {
			return ((event.ctrlKey) || (event.shiftKey) || (event.altKey) || (event.metaKey));
		}

		_webMotionHelpers.resetKeyPresses = function () {
		// removes everything except the first 3 dummy elements in the keyPresses array
		// Note: never reset keypresses without resetting timeouts first
		_webMotionHelpers.keyPresses.splice(3);
	}

	_webMotionHelpers.areRegularsHighlighted = function() {
		return ($('webmotion.regular').size() > 0 && $('webmotion.regular').first().attr('data-active') == 'true');
	}

	_webMotionHelpers.htmlDecode = function(str) {
		// Encodes the string "Hello > world" into "Hello &gt; world"
		var e = document.createElement('div');
		e.innerHTML = str;
		return e.childNodes.length === 0 ? "" : e.childNodes[0].nodeValue;
	}

	_webMotionHelpers.analyzeAndModifyLink = function(linkObj, alternative) {
		// Figures out which the possible candiates inside a text link are (to be colored red), and maps them to their position in the innerHTML of that link.
		// If alternative === true, then everything will be pushed to the 'backup' arrays used when user presses ALT key
		var letterMappings = _webMotionHelpers.genereateLetterToHTMLMapping(linkObj); // contains the text() mapped to the underlying HTML
		if (letterMappings.length == 0) {
			// no available text inside link (likely an image). For now, do nothing but suggested improvement might be to superimpose a number or letter
			// on top of the image so that image links can be followed as well
			return false;
		}
		else {
			var letterIndex = 0;
			var chosenLetter = null;
			var chosenLetterOrigPos = null;
			while ((getTakenAbbreviations(alternative).containsString(letterMappings[letterIndex].processedLetter) || _webMotionHelpers.reservedShortcuts.containsString(letterMappings[letterIndex].processedLetter) || _webMotionHelpers.alwaysPermissibleShortcuts.containsString(letterMappings[letterIndex].processedLetter)) && letterIndex < letterMappings.length - 1) {
				letterIndex++;
			}
			if (!(getTakenAbbreviations(alternative).containsString(letterMappings[letterIndex].processedLetter)) && !(_webMotionHelpers.reservedShortcuts.containsString(letterMappings[letterIndex].processedLetter) || _webMotionHelpers.alwaysPermissibleShortcuts.containsString(letterMappings[letterIndex].processedLetter))) {
				chosenLetter = letterMappings[letterIndex].processedLetter;
				chosenLetterOrigPos = letterMappings[letterIndex].originalPosition;
				pushToTakenAbbreviations(chosenLetter, alternative);
				var existingInnerHTML = linkObj.html();
				var colorToUse = _webMotionHelpers.standardColor;
				var deltaE = _webMotionHelpers.colorDistance(colorToUse,linkObj.css('color'));
				if (deltaE < 50) {
					colorToUse = _webMotionHelpers.alternativeColor;
				}

				if (_webMotionHelpers.hasBackgroundColorProperty(linkObj)) {
					var deltaE = _webMotionHelpers.colorDistance(_webMotionHelpers.standardColor,linkObj.css('background-color'));
					if (deltaE < 50) {
						colorToUse = _webMotionHelpers.alternativeColor;
					}
				}
				else {
					// get all the background elements of the parents. Anaylyzes them in order to make sure that a letter is not colored red
					// on top of a red background. Uses color distance to check how close the background is to the color red.
					var parentWithBG = _webMotionHelpers.getFirstParentElementWithBGProperty(linkObj);
					if (parentWithBG) {
						var deltaE = _webMotionHelpers.colorDistance(_webMotionHelpers.standardColor,parentWithBG.css('background-color'));
						if (deltaE < 50) {
							colorToUse = _webMotionHelpers.alternativeColor;
						}
					}
				}
				var newLetter = linkObj.html()[chosenLetterOrigPos];
				// Deal with CSS "Capitalize" text-transform attribute.
				// the rationale is that if the text capitalizes
				// and we insert a tag, that tag will inherit from capitalize. And thus could result in MEntors, for example as
				// on the tech stars page. We'll change the capitalize on the host link to 'none' and then instead just capitalize the first
				// letter.
				if (linkObj.css('text-transform') == 'capitalize') {
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
					newInnerHTML = existingInnerHTML.replaceAt(chosenLetterOrigPos, "<webmotion data-active='false' data-modified-color='"+colorToUse+"' data-original-color='"+linkObj.css('color')+"' data-original-fontweight='"+linkObj.css('font-weight')+"' class='alternative' style=\"\">"+newLetter+"</webmotion>");
				}
				else {
					newInnerHTML = existingInnerHTML.replaceAt(chosenLetterOrigPos, "<webmotion data-active='true' data-modified-color='"+colorToUse+"' data-original-color='"+linkObj.css('color')+"' data-original-fontweight='"+linkObj.css('font-weight')+"' class='regular' style=\"color:"+colorToUse+";font-weight:bold;\">"+newLetter+"</webmotion>");
				}

				linkObj.html(newInnerHTML);
				setKeymapKeyValue(chosenLetter, linkObj.prop('href'), alternative);
				return false;
			}
			else {
				return true;
			}
		}
	}

	_webMotionHelpers.initializeAlphaNumericKeyListeners = function() {
		$(document).on('keydown', function(e) {
			var pressedChar = String.fromCharCode(e.keyCode).toLowerCase();
			if (_webMotionHelpers.isAlphanumeric(pressedChar) || _webMotionHelpers.isArrowKey(e.keyCode)) {
				_webMotionHelpers.handleAlphaNumericKeyPress(pressedChar, e);
			}
			else {
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

	_webMotionHelpers.handleAlwaysPermissibleKeyPress = function(pressedChar, e) {
		if (!(_webMotionHelpers.specialCharactersPressed(e)) && _webMotionHelpers.noInputFieldsActive()) {
			switch(pressedChar)
			{
				default:
				break;
			}
		}
	}

	_webMotionHelpers.handleAlphaNumericKeyPress = function(pressedChar, e) {
		if (_webMotionHelpers.noInputFieldsActive()) {
			var siteAllowed = !(_webMotionHelpers.isURLBlocked(window.location.href));
			var noSpecialKeys = !(_webMotionHelpers.specialCharactersPressed(e));
			var ctrlAndAltKeys = e.ctrlKey && e.altKey;
			// Operation will be permitted (ie reserved keys will be handled) if site is allowed and
			var handleReservedKeys = _webMotionHelpers.reservedShortcuts.containsString(pressedChar) && ((siteAllowed && (!e.metaKey && !e.altKey && !e.ctrlKey) || ctrlAndAltKeys) || (!(siteAllowed) && ctrlAndAltKeys));
			var handleArrowKeys = (_webMotionHelpers.isArrowKey(e.keyCode) && e.shiftKey) && ((siteAllowed && !(e.metaKey) && !(e.altKey) && !(e.ctrlKey) || ctrlAndAltKeys) || (!(siteAllowed) && ctrlAndAltKeys));
			if (handleReservedKeys) {
				switch(pressedChar)
				{
					case 'h':
					chrome.runtime.sendMessage({msg: 'step_tabs', direction: 'left'}, function(response) {});
					break;
					case 'l':
					chrome.runtime.sendMessage({msg: 'step_tabs', direction: 'right'}, function(response) {});
					break;
					case 'x':
					chrome.runtime.sendMessage({msg: 'close_selected_tab'}, function(response) {});
					break;
					case 'j':
					if (e.shiftKey) {
						chrome.runtime.sendMessage({msg: 'get_viewport_dimensions'}, function(response) {
							_webMotionHelpers.scrollWindow(response.height - 50);
						});
					}
					else {
						_webMotionHelpers.scrollWindow(250);
					}
					break;
					case 'k':
					if (e.shiftKey) {
						chrome.runtime.sendMessage({msg: 'get_viewport_dimensions'}, function(response) {
							_webMotionHelpers.scrollWindow(-response.height + 50);
						});
					}
					else {
						_webMotionHelpers.scrollWindow(-250);
					}
					break;
					case 'b':
					window.history.go(-1);
					break;
					default:
					break;
				}
			}
			else if (handleArrowKeys) {
				switch(e.keyCode)
				{
					case 37:
					chrome.runtime.sendMessage({msg: 'step_tabs', direction: 'left'}, function(response) {});
					break;
					case 39:
					chrome.runtime.sendMessage({msg: 'step_tabs', direction: 'right'}, function(response) {});
					break;
					case 40:
					_webMotionHelpers.scrollWindow(250);
					break;
					case 38:
					_webMotionHelpers.scrollWindow(-250);
					break;
					default:
					break;
				}
			}
			else if (_webMotionHelpers.getKeymap(!(_webMotionHelpers.areRegularsHighlighted()))[pressedChar] != null && (!(_webMotionHelpers.specialCharactersPressed(e)))) {
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
						if (_webMotionHelpers.premium) {

							chrome.runtime.sendMessage({msg: 'new_tab_no_follow', url: _webMotionHelpers.getKeymapValue(pressedChar, !(_webMotionHelpers.areRegularsHighlighted()))}, function(response) {});
						}

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
	_webMotionHelpers.initializeAltKeyListener = function() {
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
		// not set. Use this method to make sure an element has a background property.
		return (elem.css('background-color') != 'rgba(0, 0, 0, 0)');
	}

	_webMotionHelpers.hasWhiteBackground = function(elem) {
		return (elem.css('background-color').containsString("rgb(0, 0, 0)") || elem.css('background-color').containsString("rgba(0, 0, 0, 0)"));
	}

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
		// Checks if an element (a link) is currently visible on the screen. If not visible, don't process / highlight.
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

	_webMotionHelpers.isArrowKey = function(keyCode) {
		return (keyCode >= 37 && keyCode <= 40);
	}

	_webMotionHelpers.noInputFieldsActive = function() {
		// Checks to make sure user is not currently typing in any kind of input field. If user is typing in an input field,
		// we do not want to follow links.
		// Note the special case for facebook. Will likely need to add more exceptions of sites which have custom input fields.
		var el = document.activeElement;
		var inputFieldsActive = el && ((el.tagName.toLowerCase() == 'input' && (el.type == 'text' || el.type == 'password' || el.type == 'email' || el.type == 'search' || el.type == 'url' || el.type == 'tel' || el.type == 'time' || el.type == 'number' )) || el.tagName.toLowerCase() == 'textarea');
		// Handle Facebook's special search field
		if (domainUtils.extractRootDomainFromURL(window.location.href) == 'facebook.com') {
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
			}
		});
	}

	_webMotionHelpers.isLinkLegitimate = function(DOMElem) {
		// To be legitimate: dom element / link must meet the following criteria:
		// 1) Be in view
		// 2) have non blank href attribute
		// 3) Not contain the string "javascript" (we don't want to be able to follow these links).
		// 4) Not reference the current page
		// Must contain at least one alpha numeric character
		var positiveTextRequirements = new RegExp("[A-Za-z0-9]+");
		var textIndentation = Math.abs(parseInt(DOMElem.css('text-indent')));

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
			var isPureText = ($(this).context.nodeName == '#text');
			if (isPureText) {
				// charOffset = if we have three nodes, the first one has an offset of 0, the second
				// has an offset of the length of the first, and the third one has an offset of the 2 first ones
				// used to be this!!!!
				_webMotionHelpers.DOMElemForEscaping.innerHTML = $(this).text();
				var escapedText = _webMotionHelpers.DOMElemForEscaping.innerHTML;
				nodesContainer.push({txt: escapedText, html: escapedText, charOffset: nodesCumulativeHTMLLength});
				nodesCumulativeHTMLLength += escapedText.length;
			}
			else {
				_webMotionHelpers.DOMElemForEscaping.innerHTML = $(this).text();
				var escapedText = _webMotionHelpers.DOMElemForEscaping.innerHTML;
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
			if (nodesContainer[i].html.split(nodesContainer[i].txt).length-1 == 1) {
				// the above means we only deal with <em>hello</em>. ie if there is something weird going on, we wont' touch it.
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
				}
				for (var j = startPos; j <= startPos + nodesContainer[i].txt.length - 1; j++) {
					var currentLetter = nodesContainer[i].html[j].toLowerCase();

					// We only want the letter if it's alpha numeric and if we haven't already seen it, and if it's not a reserved shortcut.
					// Note: *** adding to list of criteria: we also don't want it if it's among the forbidden letters.
					// NOTE: WE ACTUALLY DO WANT THE LETTERS EVEN IF IT'S A RESERVED SHORTCUT. SO COMMENTING OUT
					// THAT AND REPLACING SO THIS HAPPENS. WE WANT THIS BECAUSE OF FOR A WORD LIKE "back", IF CAPITALIZE IS PRESENT
					// WE WANT TO BE ABLE TO CAPITALIZE THE FIRST WORD IF NEEDED. THUS WE MUST KNOW ABOUT IT.
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
			metaMiniMapping.push.apply(metaMiniMapping, miniMapping);
		}

		return metaMiniMapping;
	}

	// A bunch of getters and setters...
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
		// blockArgs are optional, if not there / have not been initialized, we will use
		// _webMotionHelpers.blockedRootDomains
		// _webMotionHelpers.blockedFullDomains
		// _webMotionHelpers.blockedPages instead.
		// The reason for this is that we can't always assume that _webMotionHelpers.blockedRootDomains etc have been initialized.
		// Need the option of supplying them manually as well. For example, they won't have been initialized
		// when calling from popup.js.

		var localBlocks = new Object();
		if (typeof blockArgs === "undefined") {
			localBlocks = _webMotionHelpers;
		}
		else {
			localBlocks = blockArgs;
		}
		if (localBlocks.blockedRootDomains.containsString(domainUtils.extractRootDomainFromURL(url))) {
			return true;
		}
		if (localBlocks.blockedFullDomains.containsString(domainUtils.extractFullDomainFromURL(url))) {
			return true;
		}
		if (localBlocks.blockedPages.containsString(url)) {
			return true;
		}
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

	return _webMotionHelpers;

}());

var keysurfHelpers = (function() {

	var _keysurfHelpers = {};
	_keysurfHelpers.ctrlPressed = false;
	_keysurfHelpers.shiftPressed = false;
	_keysurfHelpers.altPressed = false;
	_keysurfHelpers.cmdPressed = false;
	_keysurfHelpers.standardColor = '#e84c3d';
	_keysurfHelpers.alternativeColor = '#5280bb';
	_keysurfHelpers.viewPortHeight;
	_keysurfHelpers.keyMap = {}; // maps the keys to the URLs
	_keysurfHelpers.keyMapAlt = {}; 
	_keysurfHelpers.takenAbbreviations = []; // maintains a list of all the user up letter / letter combos
	_keysurfHelpers.takenAbbreviationsAlt = []; 

	//these we use these to close website, go back and forth between tabs, etc.
	_keysurfHelpers.reservedShortcuts = ['x', 'b', 'h', 'j', 'k', 'l'];
	_keysurfHelpers.alwaysPermissibleShortcuts = ['h', 'l']; // even in forbidden domains (basically just left and right)
	_keysurfHelpers.forbiddenDomains = ['gmail','google', 'facebook.com', 'twitter.com', , 'notezilla.io', '0.0.0.0'];


	_keysurfHelpers.specialCharactersPressed = function() {
		// console.log('*****');
		// console.log(_keysurfHelpers.ctrlPressed);
		// console.log(_keysurfHelpers.shiftPressed);
		// console.log(_keysurfHelpers.altPressed);
		// console.log(_keysurfHelpers.cmdPressed);
		return ((_keysurfHelpers.ctrlPressed) || (_keysurfHelpers.shiftPressed) || (_keysurfHelpers.altPressed) || (_keysurfHelpers.cmdPressed));
	}

	_keysurfHelpers.htmlDecode = function(str) {
		var e = document.createElement('div');
		e.innerHTML = str;
		return e.childNodes.length === 0 ? "" : e.childNodes[0].nodeValue;
	}

	_keysurfHelpers.analyzeAndModifyLink = function(linkObj, alternative) {
		// Figures out who the possible candiates are inside the link text, and maps them to their position in the innerHTML of that link.
		// If alternative == true, then everything will be pushed to the 'backup' arrays used when user presses ALT key
		var letterMappings = _keysurfHelpers.genereateLetterToHTMLMapping(linkObj); // contains the text() mapped to the underlying HTML
		if (letterMappings.length == 0) {
			// no available text inside link. Could be image. For now, do nothing.
			return false; 
		}
		else {
			var letterIndex = 0;
			var chosenLetter = null; 
			var chosenLetterOrigPos = null;
			while (getTakenAbbreviations(alternative).containsString(letterMappings[letterIndex].processedLetter) && letterIndex < letterMappings.length - 1) {
				letterIndex++;
			}
			if (!(getTakenAbbreviations(alternative).containsString(letterMappings[letterIndex].processedLetter))) {

				chosenLetter = letterMappings[letterIndex].processedLetter;
				chosenLetterOrigPos = letterMappings[letterIndex].originalPosition;
				pushToTakenAbbreviations(chosenLetter, alternative);
				var existingInnerHTML = linkObj.html();
				var colorToUse = _keysurfHelpers.standardColor;
				var deltaE = _keysurfHelpers.colorDistance(colorToUse,linkObj.css('color'));
				if (deltaE < 50) {
					colorToUse = _keysurfHelpers.alternativeColor;
				}
				if (_keysurfHelpers.hasBackgroundColorProperty(linkObj)) {
					var deltaE = _keysurfHelpers.colorDistance(_keysurfHelpers.standardColor,linkObj.css('background-color'));
					if (deltaE < 50) {
						colorToUse = _keysurfHelpers.alternativeColor;
					}
				}
				else {
					// get all the background elements of the parents.
					var parentWithBG = _keysurfHelpers.getFirstParentElementWithBGProperty(linkObj);
					if (parentWithBG) {
						var deltaE = _keysurfHelpers.colorDistance(_keysurfHelpers.standardColor,parentWithBG.css('background-color'));
						if (deltaE < 50) {
							colorToUse = _keysurfHelpers.alternativeColor;
						}
					}
				}
				if (alternative) {
					newInnerHTML = existingInnerHTML.replaceAt(chosenLetterOrigPos, "<keysurf data-modified-color='"+colorToUse+"' data-original-color='"+linkObj.css('color')+"' data-original-fontweight='"+linkObj.css('font-weight')+"' class='alternative' style=\"\">"+linkObj.html()[chosenLetterOrigPos]+"</keysurf>");
				}
				else {
					newInnerHTML = existingInnerHTML.replaceAt(chosenLetterOrigPos, "<keysurf data-modified-color='"+colorToUse+"' data-original-color='"+linkObj.css('color')+"' data-original-fontweight='"+linkObj.css('font-weight')+"' class='regular' style=\"color:"+colorToUse+"; font-weight:bold;\">"+linkObj.html()[chosenLetterOrigPos]+"</keysurf>");
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

	_keysurfHelpers.initializeSpecialKeyListeners = function() {

		$(document).on("keydown keyup", function(e) {

			_keysurfHelpers.cmdPressed = (e.keyCode == 91 || e.keyCode == 93);

		});
		$(document).on("keyup keydown", function(e) {
			_keysurfHelpers.shiftPressed = (e.keyCode == 16);
		});
		$(document).on("keyup keydown", function(e) {
			_keysurfHelpers.ctrlPressed = (e.keyCode == 17);
		});

		$(document).on("keydown", function(e) {
			if (e.keyCode == 18) {
				_keysurfHelpers.altPressed = true;
				$('keysurf.regular').each(function() {
					var originalColor = $(this).attr('data-original-color');
					var originalFontweight = $(this).attr('data-original-fontweight');
					$(this).css('color', originalColor).css('font-weight', originalFontweight);
				});
				$('keysurf.alternative').each(function() {
					var newColor = $(this).attr('data-modified-color');
					$(this).css('color', newColor).css('font-weight', 'bold');
				});
			}
		});

		$(document).on("keyup", function(e) {
			if (e.keyCode == 18) {
				_keysurfHelpers.altPressed = false;
				$('keysurf.alternative').each(function() {
					var originalColor = $(this).attr('data-original-color');
					var originalFontweight = $(this).attr('data-original-fontweight');
					$(this).css('color', originalColor).css('font-weight', originalFontweight);
				});
				$('keysurf.regular').each(function() {
					var newColor = $(this).attr('data-modified-color');
					$(this).css('color', newColor).css('font-weight', 'bold');
				});
			}
		});

	}

	_keysurfHelpers.getFirstParentElementWithBGProperty = function(elem) {
		var allParents = elem.parents();
		var counter;
		for (counter = 0; counter <= allParents.length - 1; counter++) {
			if (_keysurfHelpers.hasBackgroundColorProperty($(allParents[counter]))) {
				return $(allParents[counter]);
			}
		}
		return false;
	}	

	_keysurfHelpers.hasBackgroundColorProperty = function(elem) {
		// if we do this the traditional elem.css('background-color')
		// way, seems we are getting rgb(0,0,0) as a response even if it's 
		// not set.
		return (elem.css('background-color') != 'rgba(0, 0, 0, 0)');
	}

	_keysurfHelpers.hasWhiteBackground = function(elem) {
		return (elem.css('background-color').containsString("rgb(0, 0, 0)") || elem.css('background-color').containsString("rgba(0, 0, 0, 0)"));
	}

	_keysurfHelpers.isDomainAllowed = function() {
		var domainAllowed = true;
		for (var domainCounter = 0; domainCounter <= this.forbiddenDomains.length - 1; domainCounter++) {
			if (document.domain.indexOf(this.forbiddenDomains[domainCounter]) != -1) {
				domainAllowed = false;
			}
		}
		return domainAllowed;
		// return false;
	}


	_keysurfHelpers.colorDistance = function(color1, color2) {
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

	_keysurfHelpers.initializeFocusBlurListeners = function() {

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


	_keysurfHelpers.isElementInView = function(elem) {
		var docViewTop = $(window).scrollTop();
		var docViewBottom = docViewTop + this.viewPortHeight;
		var elemTop = $(elem).offset().top;
		var elemBottom = elemTop + $(elem).height();
		return ((elemBottom <= docViewBottom) && (elemTop >= docViewTop));
	}

	_keysurfHelpers.isAlphanumeric = function(str) {
		return /[a-z0-9A-Z]/.test(str);
	}

	_keysurfHelpers.noInputFieldsActive = function() {
		// true if user is currently typing inside a text field or a text area.
		var el = document.activeElement;
		return !(el && ((el.tagName.toLowerCase() == 'input' && (el.type == 'text' || el.type == 'password' || el.type == 'email' || el.type == 'search' || el.type == 'url' || el.type == 'tel' || el.type == 'time' || el.type == 'number' )) || el.tagName.toLowerCase() == 'textarea'));
	}
	
	_keysurfHelpers.scrollWindow = function(px) {
		var sign = '+';
		if (px < 0) {
			sign = '-';
		}
		
		$.scrollTo(sign + '=' + Math.abs(px) + 'px', 150, {
			axis: 'y',
			easing: 'swing',
			onAfter: function() {
				//Do we need to change the hash?
			}
		});
	}

	_keysurfHelpers.isLinkLegitimate = function(DOMElem) {
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

		return this.isElementInView(DOMElem) && DOMElem.attr('href') != undefined && DOMElem.attr('href') != "" && DOMElem.attr('href') != "#" && (textIndentation < 50) && positiveTextRequirements.test(DOMElem.text()) && !(negativeTextRequirements.test(DOMElem.text())) && !(DOMElem.attr('href').containsString("javascript")) && DOMElem.css('display') != "none" && DOMElem.css('visibility') != "hidden" && window.location != DOMElem.prop('href');
	}


	_keysurfHelpers.genereateLetterToHTMLMapping = function(linkDOMElem) {
		/*
		This method takes a link DOM element from jQuery (ie <a id='test' href='/xyz'>Hello there!</a>, etc) and looks at the html / text inside the link (in this example: "Hello there!"), 
		and figures out which of the letters in that string are actually candidates for being replaced with a hotkey (and formatted as red). 

		It also maps those candidates to the position of that letter in the string. So for example, 'h' will be mapped to 0, 'o' will be mapped to 5. If the innerHTML is not
		just text but rather an html expression, it still works: for example innerHTML is "<b>Hello</b>": 'h' -> 3

		It removes duplicates, lower cases everything, and ignores non-alphanumeric characters. It also removes any of the letters considered a reserved shortcut, 
		as defined above by _keysurfHelpers.reservedShortcuts.

		The actual output of the above example will look like this:

		[{"processedLetter":"h","originalPosition":0},{"processedLetter":"e","originalPosition":1},{"processedLetter":"l","originalPosition":2},{"processedLetter":"o","originalPosition":4},{"processedLetter":"t","originalPosition":6},{"processedLetter":"r","originalPosition":9}] 

		It can also handle complex things, such as this one: 

		<a id='test' href='x'>Hello <em>brother</em>, how the <span><b>DEUCE</b></span> are you???</a>, which would return: 

		[{"processedLetter":"h","originalPosition":0},{"processedLetter":"e","originalPosition":1},{"processedLetter":"l","originalPosition":2},{"processedLetter":"o","originalPosition":4},{"processedLetter":"b","originalPosition":10},{"processedLetter":"r","originalPosition":11},{"processedLetter":"t","originalPosition":13},{"processedLetter":"w","originalPosition":26},{"processedLetter":"d","originalPosition":41},{"processedLetter":"u","originalPosition":43},{"processedLetter":"c","originalPosition":44},{"processedLetter":"a","originalPosition":58},{"processedLetter":"y","originalPosition":62}] 
		*/

		var nodesContainer = [];
		var nodesCumulativeHTMLLength = 0;
		linkDOMElem.contents().each(function(index, value) {
			var isPureText = ($(this).context.nodeName == '#text');
			if (isPureText) {
				// charOffset = if we have three nodes, the first one has an offset of 0, the second 
				// has an offset of the length of the first, and the third one has an offset of the 2 first ones
				// used to be this!!!!
				nodesContainer.push({txt: $(this).text(), html: $(this).text(), charOffset: nodesCumulativeHTMLLength});
				// nodesContainer.push({txt: $(this).text(), html: _keysurfHelpers.htmlDecode($(this).context.innerText), charOffset: nodesCumulativeHTMLLength});
				nodesCumulativeHTMLLength += $(this).text().length;
			}
			else {
				nodesContainer.push({txt: $(this).text(), html: $(this).context.outerHTML, charOffset: nodesCumulativeHTMLLength});
				nodesCumulativeHTMLLength += $(this).context.outerHTML.length;
			}
		});
		var metaMiniMapping = [];
		// for example, in the 'Hello world!' example, we only need to add 1 instance of 'l'... we are keeping track of what we have added with
		// this array.
		var uniqueLettersInNodes = [];
		for(var i = 0;i <= nodesContainer.length - 1; i++) {
			var miniMapping = [];

			var temp = "This is a string.";
			// the g in the regular expression says to search the whole string 
			// rather than just find the first occurrence
			if (nodesContainer[i].html.split(nodesContainer[i].txt).length-1 == 1) {
				var startPos = nodesContainer[i].html.indexOf(nodesContainer[i].txt);
				for (var j = startPos; j <= startPos + nodesContainer[i].txt.length - 1; j++) {
					var currentLetter = nodesContainer[i].html[j].toLowerCase();
					// We only want the letter if it's alpha numeric and if we haven't already seen it, and if it's not a reserved shortcut.
					if (this.isAlphanumeric(currentLetter) && !(this.reservedShortcuts.containsString(currentLetter)) && !(uniqueLettersInNodes.containsString(currentLetter))) {
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

	// A bunch of getters and setters in lieu of accessing variables by reference (which is not possible in Javascript)
	function getTakenAbbreviations(alternative) {
		if (alternative) {
			return _keysurfHelpers.takenAbbreviationsAlt;		
		}	
		else {
			return _keysurfHelpers.takenAbbreviations;		
		}
	}
	function pushToTakenAbbreviations(chosenLetter, alternative) {
		if (alternative) {
			_keysurfHelpers.takenAbbreviationsAlt.push(chosenLetter);		
		}	
		else {
			_keysurfHelpers.takenAbbreviations.push(chosenLetter);		
		}
	}

	function setKeymapKeyValue(key, value, alternative) {
		if (alternative) {
			_keysurfHelpers.keyMapAlt[key] = value;
		}
		else {
			_keysurfHelpers.keyMap[key] = value;
		} 
	}

	_keysurfHelpers.getKeymap = function(alternative) {
		if (alternative) {
			return _keysurfHelpers.keyMapAlt;
		}
		else {
			return _keysurfHelpers.keyMap;
		} 
	}


	_keysurfHelpers.getKeymapValue = function(key, alternative) {
		if (alternative) {
			return _keysurfHelpers.keyMapAlt[key];
		}
		else {
			return _keysurfHelpers.keyMap[key];
		} 
	}

	return _keysurfHelpers;

}());
var webMotionHelpers = (function() {

	var _webMotionHelpers = {};
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

	//these we use these to close website, go back and forth between tabs, etc.
	_webMotionHelpers.reservedShortcuts = ['x', 'b', 'h', 'j', 'k', 'l'];
	_webMotionHelpers.alwaysPermissibleShortcuts = ['h', 'l']; // even in forbidden domains (basically just left and right)
	_webMotionHelpers.forbiddenDomains = ['gmail','google', 'facebook.com', 'twitter.com', , 'notezilla.io', 'notezilla.info', '0.0.0.0'];


	_webMotionHelpers.specialCharactersPressed = function() {
		// console.log('*****');
		// console.log(_webMotionHelpers.ctrlPressed);
		// console.log(_webMotionHelpers.shiftPressed);
		// console.log(_webMotionHelpers.altPressed);
		// console.log(_webMotionHelpers.cmdPressed);
		return ((_webMotionHelpers.ctrlPressed) || (_webMotionHelpers.shiftPressed) || (_webMotionHelpers.altPressed) || (_webMotionHelpers.cmdPressed));
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
		var letterMappings = _webMotionHelpers.genereateLetterToHTMLMapping(linkObj); // contains the text() mapped to the underlying HTML
		if (letterMappings.length == 0) {
			// no available text inside link. Could be image. For now, do nothing.
			return false; 
		}
		else {
			var letterIndex = 0;
			var chosenLetter = null; 
			var chosenLetterOrigPos = null;
			while ((getTakenAbbreviations(alternative).containsString(letterMappings[letterIndex].processedLetter) || _webMotionHelpers.reservedShortcuts.containsString(letterMappings[letterIndex].processedLetter)) && letterIndex < letterMappings.length - 1) {
				letterIndex++;
			}
			if (!(getTakenAbbreviations(alternative).containsString(letterMappings[letterIndex].processedLetter)) && !(_webMotionHelpers.reservedShortcuts.containsString(letterMappings[letterIndex].processedLetter))) {

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

	_webMotionHelpers.initializeSpecialKeyListeners = function() {

		$(document).on("keydown keyup", function(e) {

			_webMotionHelpers.cmdPressed = (e.keyCode == 91 || e.keyCode == 93);

		});
		$(document).on("keyup keydown", function(e) {
			_webMotionHelpers.shiftPressed = (e.keyCode == 16);
		});
		$(document).on("keyup keydown", function(e) {
			_webMotionHelpers.ctrlPressed = (e.keyCode == 17);
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

		$(document).on("keyup", function(e) {
			if (e.keyCode == 18) {
				_webMotionHelpers.altPressed = false;
			}
		});

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

	_webMotionHelpers.isDomainAllowed = function() {
		var domainAllowed = true;
		for (var domainCounter = 0; domainCounter <= this.forbiddenDomains.length - 1; domainCounter++) {
			if (document.domain.indexOf(this.forbiddenDomains[domainCounter]) != -1) {
				domainAllowed = false;
			}
		}
		return domainAllowed;
		// return false;
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
		var el = document.activeElement;
		return !(el && ((el.tagName.toLowerCase() == 'input' && (el.type == 'text' || el.type == 'password' || el.type == 'email' || el.type == 'search' || el.type == 'url' || el.type == 'tel' || el.type == 'time' || el.type == 'number' )) || el.tagName.toLowerCase() == 'textarea'));
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

		return this.isElementInView(DOMElem) && DOMElem.attr('href') != undefined && DOMElem.attr('href') != "" && DOMElem.attr('href') != "#" && (textIndentation < 50) && positiveTextRequirements.test(DOMElem.text()) && !(negativeTextRequirements.test(DOMElem.text())) && !(DOMElem.attr('href').containsString("javascript")) && DOMElem.css('display') != "none" && DOMElem.css('visibility') != "hidden" && window.location != DOMElem.prop('href');
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

		var nodesContainer = [];
		var nodesCumulativeHTMLLength = 0;
		linkDOMElem.contents().each(function(index, value) {
			var isPureText = ($(this).context.nodeName == '#text');
			if (isPureText) {
				// charOffset = if we have three nodes, the first one has an offset of 0, the second 
				// has an offset of the length of the first, and the third one has an offset of the 2 first ones
				// used to be this!!!!
				nodesContainer.push({txt: $(this).text(), html: $(this).text(), charOffset: nodesCumulativeHTMLLength});
				// nodesContainer.push({txt: $(this).text(), html: _webMotionHelpers.htmlDecode($(this).context.innerText), charOffset: nodesCumulativeHTMLLength});
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
					// NOTE: WE ACTUALLY DO WANT THE LETTERS EVEN IF IT'S A RESERVED SHORTCUT. SO COMMENTING OUT 
					// THAT AND REPLACING SO THIS HAPPENS. WE WANT THIS BECAUSE OF FOR A WORD LIKE "back", IF CAPITALIZE IS PRESENT
					// WE WANT TO BE ABLE TO CAPITALIZE THE FIRST WORD IF NEEDED. THUS WE MUST KNOW ABOUT IT.
					// if (this.isAlphanumeric(currentLetter) && !(this.reservedShortcuts.containsString(currentLetter)) && !(
					if (this.isAlphanumeric(currentLetter) && !(uniqueLettersInNodes.containsString(currentLetter))) {
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
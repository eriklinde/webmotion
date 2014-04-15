
// WebMotion - A Chrome extension for simple, mouseless web browsing

// TODO: Make it be able to process links with HTML-escaped characters, example: "TV & Media", or "Tag name: <input>". Currently disregarding these.
// Make sure it works here: http://www.teslamotors.com/blog/when-life-gives-you-lemons
// make sure that the only shortcut links that work for a "non working" domain are the h and l keys.
// For already traveled link : use the traveled link color?
// aftonbladet
// callback när man klickar
// langst ner: pilen gor att det inte funkar: http://donmelton.com/2014/04/10/memories-of-steve/
// for google, kanske ta bort fokus från html och lägga någon annanstans så att man kan navigera?

// "add current domain to blocked sites"
// missar första keypress på de flesta sidor, eller?

// vill den ska funka på Gmail.
// customize vilka tangenter som ska ha vilken konfiguration. Piltangenterna ska oxå funka.
// ampersand http://www.gogreenlights.co.uk/moreinfo.html

// customiza färgen
// installningar att underline, bold, färg...
// w går av / på för alla sidor.

// kanske enbart det översta text input field måste highlightas
// textfield boxes (just do the first one)
// detect facebook box.

(function () {
	var timeouts = []; //contains the ID's of all setTimeouts.
	
	var modifiableLinks = []; // simply a collection of the current pages links
	var modifiableLinksAlt = [];
	var viewportHeight;

	
	

	// Initializes certain listeners needed
	
	$(document).ready(function() {
		chrome.storage.local.get(function(response) {
			if (response.active) {
				
				webMotionHelpers.initializeAlphaNumericKeyListeners();
				webMotionHelpers.initializeSpecialKeyListeners();
				webMotionHelpers.initializeFocusBlurListeners();
				initializeWindowScrollListener();
				chrome.runtime.sendMessage({msg: 'get_viewport_dimensions'}, function(response) {
					webMotionHelpers.viewPortHeight = response.height;
					webMotionHelpers.viewPortWidth = response.width;
					processLinks();
				});
			}
			else {
				alert(3);
				chrome.runtime.sendMessage({msg: 'update_all_icons', active: false}, function(response) {});
			}
		});
	});


	function processLinks() {		
		// Check to make sure we are not on Google, Facebook, Twitter, etc. They have their own shortcut system.
		if (webMotionHelpers.isDomainAllowed()) {
			modifiableLinks = [];
			modifiableLinksAlt = [];
			webMotionHelpers.takenAbbreviations = [];
			webMotionHelpers.takenAbbreviationsAlt = [];
			webMotionHelpers.resetAllLinks();
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
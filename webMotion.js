
// WebMotion - A Chrome extension for simple, mouseless web browsing



// REMAINING TODO THINGS
// Make sure it works here: http://www.teslamotors.com/blog/when-life-gives-you-lemons
// make sure that the only shortcut links that work for a "non working" domain are the h and l keys.
// For already traveled link : use the traveled link color?
// aftonbladet
// callback när man klickar
// If many links point to the same location, and have the same name, such as a user name, then use that same name / letter as in the first one.

// kanske enbart det översta text input field måste highlightas
// textfield boxes (just do the first one)


(function () {
	
	// Initializes certain listeners needed
	// console.log(webMotionHelpers.twoLevelTLDs);
	// alert(webMotionHelpers.extractRootDomainFromURL('http://www.xxx.co.uk/wfewf/wef/wefew?32f2ef'));
	// console.log(webMotionHelpers.isValidDomain('news.ww-w.cn-xN.com.msemu'));
	
	chrome.storage.local.get(function(response) {
		
		if (response.active) {
			chrome.runtime.sendMessage({msg: 'get_local_blocks'}, function(response) {
				// console.log('OBTAINED BLOCKLIST');
				// console.log(response);
				webMotionHelpers.blockedRootDomains = response.blockedRootDomains;
				webMotionHelpers.blockedFullDomains = response.blockedFullDomains;
				webMotionHelpers.blockedPages = response.blockedPages;
				var urlBlocked = webMotionHelpers.isURLBlocked(window.location.href);
				// alert();
				if (!(urlBlocked)) {
					// initialize the listeners as soon as we can (ie dont wait for document.ready)
					webMotionHelpers.initializeStandardKeyListeners();
					webMotionHelpers.initializeAlwaysOnKeyListeners();
				}
				else {
					webMotionHelpers.initializeAlwaysOnKeyListeners(); // h & l (move between tabs)
				}
				
				$(document).ready(function() {

					// $('body').html('');
					// $('body').append("<p><a href='rigbkre'>BB <em>A</em>AAA</a></p><p><a href='rigbkre'>ABA<em>A</em></a></p><p><a href='rigbkre'><em>A&C&</em>AAA</a></p><p><a id='msee' href='rigbkre'>A'D</a></p><p><a href='i3ugh34u'>&B&he&lt;j!&</a></p>");
					// alert($('#msee').html());
					// alert(333);
					if (!(urlBlocked)) {
						// setTimeout(function() {
							// alert();
							webMotionHelpers.activateWebMotion(false);	
						// }, 2000);
						
					}
				});

			});				
		}
		else {
			chrome.runtime.sendMessage({msg: 'update_all_icons', active: false}, function(response) {});
		}
	});



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
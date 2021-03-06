/**

Part of the WebMotion (http://www.webmotion.info/) Chrome Extension,
built by Erik Linde. WebMotion highlights one letter in every link, and lets
users follow that link by pressing it on their keyboard
(a.k.a. mouseless web surfing)

This file contains the code for the popup menu that goes in the web browser toolbar.
Let's users enable / disable WebMotion, as well as disable WebMotion on certain sites

*/


(function () {

  var storage = chrome.storage.local;
  $(document).ready(function() {
    var currentUrl;

    chrome.runtime.sendMessage({msg: 'get_local_blocks'}, function(blockList) {
      chrome.tabs.query({'active': true, 'windowId': chrome.windows.WINDOW_ID_CURRENT}, function(tabs) {
        currentUrl = tabs[0].url;

        // create a "fake" link in order to make use of link.pathname and search methods.
        var a = document.createElement('a');
        a.href = currentUrl;
        var path = a.pathname + a.search; // /file.php?id=1

        chrome.runtime.sendMessage({ msg : 'extract_domain', data: tabs[0].url }, function(domains) {

          var nakedDomainPrefix = '*.';
          if (domains.fullDomain == domains.rootDomain) {
            // we dont' want to show both
            // mashable.com
            // and *.mashable.com. Also, we dont' want the *. prefix before the root domain.
            $('#block-full-domain-container').hide();
            nakedDomainPrefix = '';
          }
          else {
            $('#block-full-domain-container').show();
          }

          if (path == '' || path == '/') {
            // if we are basically at the root domain, there is no need to show an individual page.
            $('#block-page-container').hide();
          }
          else {
            $('#block-page-container').show();
          }


          $('#url-field-all').text(shortenString(currentUrl));
          $('#url-field-full-domain').text(shortenString(domains.fullDomain));
          $('#url-field-root-domain').text(nakedDomainPrefix + shortenString(domains.rootDomain));


          if (blockList.blockedPages.containsString(currentUrl)) {
            $('#block-page-checkbox').addClass('js-checkbox-checked');
          }
          else {
            $('#block-page-checkbox').addClass('js-checkbox-unchecked');
          }

          if (blockList.blockedFullDomains.containsString(domains.fullDomain)) {
            $('#block-full-domain-checkbox').addClass('js-checkbox-checked');
          }
          else {
            $('#block-full-domain-checkbox').addClass('js-checkbox-unchecked');
          }

          if (blockList.blockedRootDomains.containsString(domains.rootDomain)) {
            $('#block-root-domain-checkbox').addClass('js-checkbox-checked');
          }
          else {
            $('#block-root-domain-checkbox').addClass('js-checkbox-unchecked');
          }

          chrome.storage.local.get(function(response) {
              if ((response.inactive)) {
                $('#block-options-wrapper').css('opacity','0.5').css('pointer-events','none');
              }
              else {
                $('#block-options-wrapper').css('opacity','1').css('pointer-events','auto');
              }
          });

        })});
    });

    chrome.storage.local.get('inactive', function(response) {
      if (!(response.inactive)) {
        $('#activation-switch').addClass('js-checkbox-checked');
        $('#on-off-statement b').text('ON');
        $('#on-off-statement b').addClass('green');

      }
      else {
        $('#activation-switch').addClass('js-checkbox-unchecked');
        $('#on-off-statement b').text('OFF');
        $('#on-off-statement b').removeClass('green');
      }
    });

    $('.js-checkbox').click(function(e) {
      checkboxTrigger(e);
    });


  });


function checkboxTrigger(event) {
  var type = $(event.target).attr('data-type');
  if ($(event.target).hasClass('js-checkbox-checked')) {
    // user wants to de-activate WebMotion

    if (type == 'activation-switch') {
      storage.set({inactive: true}, function() {
        $('#on-off-statement b').text('OFF');
        $('#on-off-statement b').removeClass('green');

      });
      $('#block-options-wrapper').css('opacity','0.5').css('pointer-events','none');
      chrome.runtime.sendMessage({msg: 'update_all_icons', active: false}, function(response) {});
      chrome.runtime.sendMessage({msg: 'change_webmotion_active_status', active: false}, function(response) {});
    }
    else if (type == 'block-page') {
      chrome.runtime.sendMessage({msg: 'remove_from_block_list', type: 'page'}, function(response) {});
    }
    else if (type == 'block-full-domain') {
      chrome.runtime.sendMessage({msg: 'remove_from_block_list', type: 'fullDomain'}, function(response) {});
    }
    else if (type == 'block-root-domain') {
      chrome.runtime.sendMessage({msg: 'remove_from_block_list', type: 'rootDomain'}, function(response) {});
    }

    $(event.target).removeClass('js-checkbox-checked');
    $(event.target).addClass('js-checkbox-unchecked');
  }
  else {
    if (type == 'activation-switch') {
      // user wants to activate WebMotion
      storage.set({inactive: false}, function() {
        $('#on-off-statement b').text('ON');
        $('#on-off-statement b').addClass('green');
      });
      $('#block-options-wrapper').css('opacity','1').css('pointer-events','auto');
      chrome.runtime.sendMessage({msg: 'update_all_icons', active: true}, function(response) {});
      chrome.runtime.sendMessage({msg: 'change_webmotion_active_status', active: true}, function(response) {});
    }
    else if (type == 'block-page') {
      chrome.runtime.sendMessage({msg: 'add_to_block_list', type: 'page'}, function(response) {});
    }
    else if (type == 'block-full-domain') {
      chrome.runtime.sendMessage({msg: 'add_to_block_list', type: 'fullDomain'}, function(response) {});
    }
    else if (type == 'block-root-domain') {
      chrome.runtime.sendMessage({msg: 'add_to_block_list', type: 'rootDomain'}, function(response) {});
    }

    $(event.target).removeClass('js-checkbox-unchecked');
    $(event.target).addClass('js-checkbox-checked');
  }
}

function shortenString(str) {
  if (str.length > 40) {
    return str.slice(0,36) + '...';
  }
  else {
    return str;
  }
}

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

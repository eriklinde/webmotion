(function () {

  var storage = chrome.storage.local;
  $(document).ready(function() {
    chrome.storage.local.get('active', function(response) {
      if (response.active) {
        $('.js-checkbox').addClass('js-checkbox-checked');
        $('#on-off-statement b').text('ON');
        $('#on-off-statement b').addClass('green');

      }
      else {
        $('.js-checkbox').addClass('js-checkbox-unchecked');
        $('#on-off-statement b').text('OFF');
        $('#on-off-statement b').removeClass('green');
      }
    });

    $('.js-checkbox').click(function() {
      activationSwitch();
    });
    
  });
  
  function activationSwitch() {   
    if ($('.js-checkbox').hasClass('js-checkbox-checked')) {      
      // user wants to de-activate WebMotion
      storage.set({active: false}, function() {
        $('.js-checkbox').removeClass('js-checkbox-checked');
        $('.js-checkbox').addClass('js-checkbox-unchecked');
        $('#on-off-statement b').text('OFF');
        $('#on-off-statement b').removeClass('green');
      });
        chrome.runtime.sendMessage({msg: 'update_all_icons', active: false}, function(response) {});
    }
    else {      
      // user wants to activate WebMotion
      storage.set({active: true}, function() {
        $('#on-off-statement b').text('ON');
        $('.js-checkbox').removeClass('js-checkbox-unchecked');
        $('.js-checkbox').addClass('js-checkbox-checked');
        $('#on-off-statement b').addClass('green');        
      });
      chrome.runtime.sendMessage({msg: 'update_all_icons', active: true}, function(response) {});
    }
  }

})();
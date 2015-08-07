# WebMotion

## A Chrome extension for mouseless web surfing

WebMotion is an extension that automatically scans every new web page you enter for links, and highlights **one letter** in each link. 

![Letter highlighting](https://lh3.googleusercontent.com/dwflNthgmBIacLBs_GKTg_1xB5cEwnUDmxDd106r3uC4dZGUsGBPOciVwCDWb_8VkxnijJ1s6Vg=s1280-h800-e365-rw "Optional title")

Users can then follow a particular link by simply pressing the **highlighted letter** on their keyboard.

![Follow a link by pressing the highlighted letter on your keyboard](https://lh3.googleusercontent.com/_ayZjMKaPzhZPEclUvwByGUgmyqvbsT5OWgn4uUqoCQPBV7Vv3PbCZdWzC4R_h21rE7X5_oL=s1280-h800-e365-rw "Optional title")

## Features

### Only highlights links that are in view

WebMotion is smart enough to only highlight letters in links that are currently **in view** (otherwise there wouldn't be enough letters for every link). Should there be more links visible than the amount of letters on the keyboard, then users can hold down `ALT` to see the remaining links.

### Analyzes link colors and adapts the highlighting color for each link

WebMotion normally highlights the links using a **red** color, but is smart enough to study the link and background color of each link. If **red** is not deemed to stand out enough, the letter is highlighted in **blue** instead. It achieves this by measuring the [color distance](https://en.wikipedia.org/wiki/Color_difference).

### "Double pressing" a letter...

Opens up the link in a new tab.

## Code structure

[webMotion.js](https://github.com/eriklinde/webmotion/blob/master/webMotion.js) (main file)
[webMotionHelpers.js](https://github.com/eriklinde/webmotion/blob/master/webMotionHelpers.js) (contains the bulk of the code)
[background.js](https://github.com/eriklinde/webmotion/blob/master/background.js) (for the back-end (communication with Chrome, etc.))

## Contributions

If you would like to change anything or contribute, please submit a pull request.

## Installation

Please download / install WebMotion from the official Chrome Webstore:

https://chrome.google.com/webstore/detail/webmotion/jeeajpendgpheoimhmaknnmgplbokimf

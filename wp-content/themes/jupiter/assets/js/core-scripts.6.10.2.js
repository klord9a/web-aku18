(function($) {// v5 namespace 
var MK = {
	api 		: {},
	ui 			: {},
	component 	: {},
};

// Global 
window.MK = MK;
'use strict';


console.log( 23423 );
/**
 * Copyright Marc J. Schmidt. See the LICENSE file at the top-level
 * directory of this distribution and at
 * https://github.com/marcj/css-element-queries/blob/master/LICENSE.
 */
(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define(factory);
    } else if (typeof exports === "object") {
        module.exports = factory();
    } else {
        root.ResizeSensor = factory();
    }
}(typeof window !== 'undefined' ? window : this, function () {

    // Make sure it does not throw in a SSR (Server Side Rendering) situation
    if (typeof window === "undefined") {
        return null;
    }
    // Only used for the dirty checking, so the event callback count is limited to max 1 call per fps per sensor.
    // In combination with the event based resize sensor this saves cpu time, because the sensor is too fast and
    // would generate too many unnecessary events.
    var requestAnimationFrame = window.requestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        function (fn) {
            return window.setTimeout(fn, 20);
        };

    /**
     * Iterate over each of the provided element(s).
     *
     * @param {HTMLElement|HTMLElement[]} elements
     * @param {Function}                  callback
     */
    function forEachElement(elements, callback){
        var elementsType = Object.prototype.toString.call(elements);
        var isCollectionTyped = ('[object Array]' === elementsType
            || ('[object NodeList]' === elementsType)
            || ('[object HTMLCollection]' === elementsType)
            || ('[object Object]' === elementsType)
            || ('undefined' !== typeof jQuery && elements instanceof jQuery) //jquery
            || ('undefined' !== typeof Elements && elements instanceof Elements) //mootools
        );
        var i = 0, j = elements.length;
        if (isCollectionTyped) {
            for (; i < j; i++) {
                callback(elements[i]);
            }
        } else {
            callback(elements);
        }
    }

    /**
    * Get element size
    * @param {HTMLElement} element
    * @returns {Object} {width, height}
    */
    function getElementSize(element) {
        if (!element.getBoundingClientRect) {
            return {
                width: element.offsetWidth,
                height: element.offsetHeight
            }
        }

        var rect = element.getBoundingClientRect();
        return {
            width: Math.round(rect.width),
            height: Math.round(rect.height)
        }
    }

    /**
     * Class for dimension change detection.
     *
     * @param {Element|Element[]|Elements|jQuery} element
     * @param {Function} callback
     *
     * @constructor
     */
    var ResizeSensor = function(element, callback) {
        /**
         *
         * @constructor
         */
        function EventQueue() {
            var q = [];
            this.add = function(ev) {
                q.push(ev);
            };

            var i, j;
            this.call = function() {
                for (i = 0, j = q.length; i < j; i++) {
                    q[i].call();
                }
            };

            this.remove = function(ev) {
                var newQueue = [];
                for(i = 0, j = q.length; i < j; i++) {
                    if(q[i] !== ev) newQueue.push(q[i]);
                }
                q = newQueue;
            };

            this.length = function() {
                return q.length;
            }
        }

        /**
         *
         * @param {HTMLElement} element
         * @param {Function}    resized
         */
        function attachResizeEvent(element, resized) {
            if (!element) return;
            if (element.resizedAttached) {
                element.resizedAttached.add(resized);
                return;
            }

            element.resizedAttached = new EventQueue();
            element.resizedAttached.add(resized);

            element.resizeSensor = document.createElement('div');
            element.resizeSensor.dir = 'ltr';
            element.resizeSensor.className = 'resize-sensor';
            var style = 'position: absolute; left: -10px; top: -10px; right: 0; bottom: 0; overflow: hidden; z-index: -1; visibility: hidden;';
            var styleChild = 'position: absolute; left: 0; top: 0; transition: 0s;';

            element.resizeSensor.style.cssText = style;
            element.resizeSensor.innerHTML =
                '<div class="resize-sensor-expand" style="' + style + '">' +
                    '<div style="' + styleChild + '"></div>' +
                '</div>' +
                '<div class="resize-sensor-shrink" style="' + style + '">' +
                    '<div style="' + styleChild + ' width: 200%; height: 200%"></div>' +
                '</div>';
            element.appendChild(element.resizeSensor);

            var position = window.getComputedStyle(element).getPropertyPriority('position');
            if ('absolute' !== position && 'relative' !== position && 'fixed' !== position) {
                element.style.position = 'relative';
            }

            var expand = element.resizeSensor.childNodes[0];
            var expandChild = expand.childNodes[0];
            var shrink = element.resizeSensor.childNodes[1];
            var dirty, rafId, newWidth, newHeight;
            var size = getElementSize(element);
            var lastWidth = size.width;
            var lastHeight = size.height;

            var reset = function() {
                //set display to block, necessary otherwise hidden elements won't ever work
                var invisible = element.offsetWidth === 0 && element.offsetHeight === 0;

                if (invisible) {
                    var saveDisplay = element.style.display;
                    element.style.display = 'block';
                }

                expandChild.style.width = '100000px';
                expandChild.style.height = '100000px';

                expand.scrollLeft = 100000;
                expand.scrollTop = 100000;

                shrink.scrollLeft = 100000;
                shrink.scrollTop = 100000;

                if (invisible) {
                    element.style.display = saveDisplay;
                }
            };
            element.resizeSensor.resetSensor = reset;

            var onResized = function() {
                rafId = 0;

                if (!dirty) return;

                lastWidth = newWidth;
                lastHeight = newHeight;

                if (element.resizedAttached) {
                    element.resizedAttached.call();
                }
            };

            var onScroll = function() {
                var size = getElementSize(element);
                var newWidth = size.width;
                var newHeight = size.height;
                dirty = newWidth != lastWidth || newHeight != lastHeight;

                if (dirty && !rafId) {
                    rafId = requestAnimationFrame(onResized);
                }

                reset();
            };

            var addEvent = function(el, name, cb) {
                if (el.attachEvent) {
                    el.attachEvent('on' + name, cb);
                } else {
                    el.addEventListener(name, cb);
                }
            };

            addEvent(expand, 'scroll', onScroll);
            addEvent(shrink, 'scroll', onScroll);

			// Fix for custom Elements
			requestAnimationFrame(reset);
        }

        forEachElement(element, function(elem){
            attachResizeEvent(elem, callback);
        });

        this.detach = function(ev) {
            ResizeSensor.detach(element, ev);
        };

        this.reset = function() {
            element.resizeSensor.resetSensor();
        };
    };

    ResizeSensor.reset = function(element, ev) {
        forEachElement(element, function(elem){
            elem.resizeSensor.resetSensor();
        });
    };

    ResizeSensor.detach = function(element, ev) {
        forEachElement(element, function(elem){
            if (!elem) return;
            if(elem.resizedAttached && typeof ev === "function"){
                elem.resizedAttached.remove(ev);
                if(elem.resizedAttached.length()) return;
            }
            if (elem.resizeSensor) {
                if (elem.contains(elem.resizeSensor)) {
                    elem.removeChild(elem.resizeSensor);
                }
                delete elem.resizeSensor;
                delete elem.resizedAttached;
            }
        });
    };

    return ResizeSensor;

}));

'use strict';

/**
 * Copyright Marc J. Schmidt. See the LICENSE file at the top-level
 * directory of this distribution and at
 * https://github.com/marcj/css-element-queries/blob/master/LICENSE.
 */
(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define(['./ResizeSensor.js'], factory);
    } else if (typeof exports === "object") {
        module.exports = factory(require('./ResizeSensor.js'));
    } else {
        root.ElementQueries = factory(root.ResizeSensor);
        root.ElementQueries.listen();
    }
}(typeof window !== 'undefined' ? window : this, function (ResizeSensor) {

    /**
     *
     * @type {Function}
     * @constructor
     */
    var ElementQueries = function () {
        //<style> element with our dynamically created styles
        var cssStyleElement;

        //all rules found for element queries
        var allQueries = {};

        //association map to identify which selector belongs to a element from the animationstart event.
        var idToSelectorMapping = [];

        /**
         *
         * @param element
         * @returns {Number}
         */
        function getEmSize(element) {
            if (!element) {
                element = document.documentElement;
            }
            var fontSize = window.getComputedStyle(element, null).fontSize;
            return parseFloat(fontSize) || 16;
        }

        /**
         * Get element size
         * @param {HTMLElement} element
         * @returns {Object} {width, height}
         */
        function getElementSize(element) {
            if (!element.getBoundingClientRect) {
                return {
                    width: element.offsetWidth,
                    height: element.offsetHeight
                }
            }

            var rect = element.getBoundingClientRect();
            return {
                width: Math.round(rect.width),
                height: Math.round(rect.height)
            }
        }

        /**
         *
         * @copyright https://github.com/Mr0grog/element-query/blob/master/LICENSE
         *
         * @param {HTMLElement} element
         * @param {*} value
         * @returns {*}
         */
        function convertToPx(element, value) {
            var numbers = value.split(/\d/);
            var units = numbers[numbers.length - 1];
            value = parseFloat(value);
            switch (units) {
                case "px":
                    return value;
                case "em":
                    return value * getEmSize(element);
                case "rem":
                    return value * getEmSize();
                // Viewport units!
                // According to http://quirksmode.org/mobile/tableViewport.html
                // documentElement.clientWidth/Height gets us the most reliable info
                case "vw":
                    return value * document.documentElement.clientWidth / 100;
                case "vh":
                    return value * document.documentElement.clientHeight / 100;
                case "vmin":
                case "vmax":
                    var vw = document.documentElement.clientWidth / 100;
                    var vh = document.documentElement.clientHeight / 100;
                    var chooser = Math[units === "vmin" ? "min" : "max"];
                    return value * chooser(vw, vh);
                default:
                    return value;
                // for now, not supporting physical units (since they are just a set number of px)
                // or ex/ch (getting accurate measurements is hard)
            }
        }

        /**
         *
         * @param {HTMLElement} element
         * @param {String} id
         * @constructor
         */
        function SetupInformation(element, id) {
            this.element = element;
            var key, option, elementSize, value, actualValue, attrValues, attrValue, attrName;

            var attributes = ['min-width', 'min-height', 'max-width', 'max-height'];

            /**
             * Extracts the computed width/height and sets to min/max- attribute.
             */
            this.call = function () {
                // extract current dimensions
                elementSize = getElementSize(this.element);

                attrValues = {};

                for (key in allQueries[id]) {
                    if (!allQueries[id].hasOwnProperty(key)) {
                        continue;
                    }
                    option = allQueries[id][key];

                    value = convertToPx(this.element, option.value);

                    actualValue = option.property === 'width' ? elementSize.width : elementSize.height;
                    attrName = option.mode + '-' + option.property;
                    attrValue = '';

                    if (option.mode === 'min' && actualValue >= value) {
                        attrValue += option.value;
                    }

                    if (option.mode === 'max' && actualValue <= value) {
                        attrValue += option.value;
                    }

                    if (!attrValues[attrName]) attrValues[attrName] = '';
                    if (attrValue && -1 === (' ' + attrValues[attrName] + ' ').indexOf(' ' + attrValue + ' ')) {
                        attrValues[attrName] += ' ' + attrValue;
                    }
                }

                for (var k in attributes) {
                    if (!attributes.hasOwnProperty(k)) continue;

                    if (attrValues[attributes[k]]) {
                        this.element.setAttribute(attributes[k], attrValues[attributes[k]].substr(1));
                    } else {
                        this.element.removeAttribute(attributes[k]);
                    }
                }
            };
        }

        /**
         * @param {HTMLElement} element
         * @param {Object}      id
         */
        function setupElement(element, id) {
            if (!element.elementQueriesSetupInformation) {
                element.elementQueriesSetupInformation = new SetupInformation(element, id);
            }
            if (!element.elementQueriesSensor) {
                element.elementQueriesSensor = new ResizeSensor(element, function () {
                    element.elementQueriesSetupInformation.call();
                });
            }

            element.elementQueriesSetupInformation.call();
        }

        /**
         * Stores rules to the selector that should be applied once resized.
         *
         * @param {String} selector
         * @param {String} mode min|max
         * @param {String} property width|height
         * @param {String} value
         */
        function queueQuery(selector, mode, property, value) {
            if (typeof(allQueries[selector]) === 'undefined') {
                allQueries[selector] = [];
                // add animation to trigger animationstart event, so we know exactly when a element appears in the DOM

                var id = idToSelectorMapping.length;
                cssStyleElement.innerHTML += '\n' + selector + ' {animation: 0.1s element-queries;}';
                cssStyleElement.innerHTML += '\n' + selector + ' > .resize-sensor {min-width: '+id+'px;}';
                idToSelectorMapping.push(selector);
            }

            allQueries[selector].push({
                mode: mode,
                property: property,
                value: value
            });
        }

        function getQuery(container) {
            var query;
            if (document.querySelectorAll) query = (container) ? container.querySelectorAll.bind(container) : document.querySelectorAll.bind(document);
            if (!query && 'undefined' !== typeof $$) query = $$;
            if (!query && 'undefined' !== typeof jQuery) query = jQuery;

            if (!query) {
                throw 'No document.querySelectorAll, jQuery or Mootools\'s $$ found.';
            }

            return query;
        }

        /**
         * If animationStart didn't catch a new element in the DOM, we can manually search for it
         */
        function findElementQueriesElements(container) {
            var query = getQuery(container);

            for (var selector in allQueries) if (allQueries.hasOwnProperty(mode)) {
                // find all elements based on the extract query selector from the element query rule
                var elements = query(selector, container);

                for (var i = 0, j = elements.length; i < j; i++) {
                    setupElement(elements[i], selector);
                }
            }
        }

        /**
         *
         * @param {HTMLElement} element
         */
        function attachResponsiveImage(element) {
            var children = [];
            var rules = [];
            var sources = [];
            var defaultImageId = 0;
            var lastActiveImage = -1;
            var loadedImages = [];

            for (var i in element.children) {
                if (!element.children.hasOwnProperty(i)) continue;

                if (element.children[i].tagName && element.children[i].tagName.toLowerCase() === 'img') {
                    children.push(element.children[i]);

                    var minWidth = element.children[i].getAttribute('min-width') || element.children[i].getAttribute('data-min-width');
                    //var minHeight = element.children[i].getAttribute('min-height') || element.children[i].getAttribute('data-min-height');
                    var src = element.children[i].getAttribute('data-src') || element.children[i].getAttribute('url');

                    sources.push(src);

                    var rule = {
                        minWidth: minWidth
                    };

                    rules.push(rule);

                    if (!minWidth) {
                        defaultImageId = children.length - 1;
                        element.children[i].style.display = 'block';
                    } else {
                        element.children[i].style.display = 'none';
                    }
                }
            }

            lastActiveImage = defaultImageId;

            function check() {
                var imageToDisplay = false, i;

                for (i in children) {
                    if (!children.hasOwnProperty(i)) continue;

                    if (rules[i].minWidth) {
                        if (element.offsetWidth > rules[i].minWidth) {
                            imageToDisplay = i;
                        }
                    }
                }

                if (!imageToDisplay) {
                    //no rule matched, show default
                    imageToDisplay = defaultImageId;
                }

                if (lastActiveImage !== imageToDisplay) {
                    //image change

                    if (!loadedImages[imageToDisplay]) {
                        //image has not been loaded yet, we need to load the image first in memory to prevent flash of
                        //no content

                        var image = new Image();
                        image.onload = function () {
                            children[imageToDisplay].src = sources[imageToDisplay];

                            children[lastActiveImage].style.display = 'none';
                            children[imageToDisplay].style.display = 'block';

                            loadedImages[imageToDisplay] = true;

                            lastActiveImage = imageToDisplay;
                        };

                        image.src = sources[imageToDisplay];
                    } else {
                        children[lastActiveImage].style.display = 'none';
                        children[imageToDisplay].style.display = 'block';
                        lastActiveImage = imageToDisplay;
                    }
                } else {
                    //make sure for initial check call the .src is set correctly
                    children[imageToDisplay].src = sources[imageToDisplay];
                }
            }

            element.resizeSensor = new ResizeSensor(element, check);
            check();
        }

        function findResponsiveImages() {
            var query = getQuery();

            var elements = query('[data-responsive-image],[responsive-image]');
            for (var i = 0, j = elements.length; i < j; i++) {
                attachResponsiveImage(elements[i]);
            }
        }

        var regex = /,?[\s\t]*([^,\n]*?)((?:\[[\s\t]*?(?:min|max)-(?:width|height)[\s\t]*?[~$\^]?=[\s\t]*?"[^"]*?"[\s\t]*?])+)([^,\n\s\{]*)/mgi;
        var attrRegex = /\[[\s\t]*?(min|max)-(width|height)[\s\t]*?[~$\^]?=[\s\t]*?"([^"]*?)"[\s\t]*?]/mgi;

        /**
         * @param {String} css
         */
        function extractQuery(css) {
            var match, smatch, attrs, attrMatch;

            css = css.replace(/'/g, '"');
            while (null !== (match = regex.exec(css))) {
                smatch = match[1] + match[3];
                attrs = match[2];

                while (null !== (attrMatch = attrRegex.exec(attrs))) {
                    queueQuery(smatch, attrMatch[1], attrMatch[2], attrMatch[3]);
                }
            }
        }

        /**
         * @param {CssRule[]|String} rules
         */
        function readRules(rules) {
            var selector = '';

            if (!rules) {
                return;
            }

            if ('string' === typeof rules) {
                rules = rules.toLowerCase();
                if (-1 !== rules.indexOf('min-width') || -1 !== rules.indexOf('max-width')) {
                    extractQuery(rules);
                }
            } else {
                for (var i = 0, j = rules.length; i < j; i++) {
                    if (1 === rules[i].type) {
                        selector = rules[i].selectorText || rules[i].cssText;
                        if (-1 !== selector.indexOf('min-height') || -1 !== selector.indexOf('max-height')) {
                            extractQuery(selector);
                        } else if (-1 !== selector.indexOf('min-width') || -1 !== selector.indexOf('max-width')) {
                            extractQuery(selector);
                        }
                    } else if (4 === rules[i].type) {
                        readRules(rules[i].cssRules || rules[i].rules);
                    } else if (3 === rules[i].type) {
                        readRules(rules[i].styleSheet.cssRules);
                    }
                }
            }
        }

        var defaultCssInjected = false;

        /**
         * Searches all css rules and setups the event listener to all elements with element query rules..
         */
        this.init = function () {
            var animationStart = 'animationstart';
            if (typeof document.documentElement.style['webkitAnimationName'] !== 'undefined') {
                animationStart = 'webkitAnimationStart';
            } else if (typeof document.documentElement.style['MozAnimationName'] !== 'undefined') {
                animationStart = 'mozanimationstart';
            } else if (typeof document.documentElement.style['OAnimationName'] !== 'undefined') {
                animationStart = 'oanimationstart';
            }

            document.body.addEventListener(animationStart, function (e) {
                var element = e.target;
                var styles = window.getComputedStyle(element, null);

                if (-1 !== styles.getPropertyValue('animation-name').indexOf('element-queries')) {
                    element.elementQueriesSensor = new ResizeSensor(element, function () {
                        if (element.elementQueriesSetupInformation) {
                            element.elementQueriesSetupInformation.call();
                        }
                    });

                    var sensorStyles = window.getComputedStyle(element.resizeSensor, null);
                    var id = sensorStyles.getPropertyValue('min-width');
                    id = parseInt(id.replace('px', ''));
                    setupElement(e.target, idToSelectorMapping[id]);
                }
            });

            if (!defaultCssInjected) {
                cssStyleElement = document.createElement('style');
                cssStyleElement.type = 'text/css';
                cssStyleElement.innerHTML = '[responsive-image] > img, [data-responsive-image] {overflow: hidden; padding: 0; } [responsive-image] > img, [data-responsive-image] > img {width: 100%;}';

                //safari wants at least one rule in keyframes to start working
                cssStyleElement.innerHTML += '\n@keyframes element-queries { 0% { visibility: inherit; } }';
                document.getElementsByTagName('head')[0].appendChild(cssStyleElement);
                defaultCssInjected = true;
            }

            for (var i = 0, j = document.styleSheets.length; i < j; i++) {
                try {
                    if (document.styleSheets[i].href && 0 === document.styleSheets[i].href.indexOf('file://')) {
                        console.log("CssElementQueries: unable to parse local css files, " + document.styleSheets[i].href);
                    }

                    readRules(document.styleSheets[i].cssRules || document.styleSheets[i].rules || document.styleSheets[i].cssText);
                } catch (e) {
                }
            }

            // findElementQueriesElements();
            findResponsiveImages();
        };

        /**
         * Go through all collected rules (readRules()) and attach the resize-listener.
         * Not necessary to call it manually, since we detect automatically when new elements
         * are available in the DOM. However, sometimes handy for dirty DOM modifications.
         *
         * @param {HTMLElement} container only elements of the container are considered (document.body if not set)
         */
        this.findElementQueriesElements = function (container) {
            findElementQueriesElements(container);
        };

        this.update = function () {
            this.init();
        };
    };

    ElementQueries.update = function () {
        ElementQueries.instance.update();
    };

    /**
     * Removes all sensor and elementquery information from the element.
     *
     * @param {HTMLElement} element
     */
    ElementQueries.detach = function (element) {
        if (element.elementQueriesSetupInformation) {
            //element queries
            element.elementQueriesSensor.detach();
            delete element.elementQueriesSetupInformation;
            delete element.elementQueriesSensor;

        } else if (element.resizeSensor) {
            //responsive image

            element.resizeSensor.detach();
            delete element.resizeSensor;
        }
    };

    ElementQueries.init = function () {
        if (!ElementQueries.instance) {
            ElementQueries.instance = new ElementQueries();
        }

        ElementQueries.instance.init();
    };

    var domLoaded = function (callback) {
        /* Mozilla, Chrome, Opera */
        if (document.addEventListener) {
            document.addEventListener('DOMContentLoaded', callback, false);
        }
        /* Safari, iCab, Konqueror */
        else if (/KHTML|WebKit|iCab/i.test(navigator.userAgent)) {
            var DOMLoadTimer = setInterval(function () {
                if (/loaded|complete/i.test(document.readyState)) {
                    callback();
                    clearInterval(DOMLoadTimer);
                }
            }, 10);
        }
        /* Other web browsers */
        else window.onload = callback;
    };

    ElementQueries.findElementQueriesElements = function (container) {
        ElementQueries.instance.findElementQueriesElements(container);
    };

    ElementQueries.listen = function () {
        domLoaded(ElementQueries.init);
    };

    return ElementQueries;

}));

(function($) {
	'use strict';

	$.exists = function(selector) {
	    return ($(selector).length > 0);
	};

	/**
	 * Helper to enable caching async scripts
	 * https://api.jquery.com/jquery.getscript/
	 * http://www.vrdmn.com/2013/07/overriding-jquerygetscript-to-include.html
	 * 
	 * @param  {String}   script url
	 * @param  {Function} callback     
	 */
	$.getCachedScript = function( url ) {
		var options = {
			dataType: "script",
			cache: true,
			url: url
		};
	 
	    // Use $.ajax() since it is more flexible than $.getScript
	    // Return the jqXHR object so we can chain callbacks
	  	return $.ajax( options );
	};



	// Fn to allow an event to fire after all images are loaded
	// usage:
	// $.ajax({
	//     cache: false,
	//     url: 'ajax/content.php',
	//     success: function(data) {
	//         $('#divajax').html(data).imagesLoaded().then(function(){
	//             // do stuff after images are loaded here
	//         });
	//     }
	// });
	$.fn.mk_imagesLoaded = function () {

	    // Edit: in strict mode, the var keyword is needed
	    var $imgs = this.find('img[src!=""]');
	    // if there's no images, just return an already resolved promise
	    if (!$imgs.length) {return $.Deferred().resolve().promise();}

	    // for each image, add a deferred object to the array which resolves when the image is loaded (or if loading fails)
	    var dfds = [];  
	    $imgs.each(function(){
	        var dfd = $.Deferred();
	        dfds.push(dfd);
	        var img = new Image();
	        img.onload = function(){dfd.resolve();};
	        img.onerror = function(){dfd.resolve();};
	        img.src = this.src;
	    });

	    // return a master promise object which will resolve when all the deferred objects have resolved
	    // IE - when all the images are loaded
	    return $.when.apply($,dfds);

	};

}(jQuery));
/**
* Detect Element Resize
*
* https://github.com/sdecima/javascript-detect-element-resize
* Sebastian Decima
*
* version: 0.5.3
**/

(function () {
	var attachEvent = document.attachEvent,
		stylesCreated = false;
	
	if (!attachEvent) {
		var requestFrame = (function(){
			var raf = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame ||
								function(fn){ return window.setTimeout(fn, 20); };
			return function(fn){ return raf(fn); };
		})();
		
		var cancelFrame = (function(){
			var cancel = window.cancelAnimationFrame || window.mozCancelAnimationFrame || window.webkitCancelAnimationFrame ||
								   window.clearTimeout;
		  return function(id){ return cancel(id); };
		})();

		function resetTriggers(element){
			var triggers = element.__resizeTriggers__,
				expand = triggers.firstElementChild,
				contract = triggers.lastElementChild,
				expandChild = expand.firstElementChild;
			contract.scrollLeft = contract.scrollWidth;
			contract.scrollTop = contract.scrollHeight;
			expandChild.style.width = expand.offsetWidth + 1 + 'px';
			expandChild.style.height = expand.offsetHeight + 1 + 'px';
			expand.scrollLeft = expand.scrollWidth;
			expand.scrollTop = expand.scrollHeight;
		};

		function checkTriggers(element){
			return element.offsetWidth != element.__resizeLast__.width ||
						 element.offsetHeight != element.__resizeLast__.height;
		}
		
		function scrollListener(e){
			var element = this;
			resetTriggers(this);
			if (this.__resizeRAF__) cancelFrame(this.__resizeRAF__);
			this.__resizeRAF__ = requestFrame(function(){
				if (checkTriggers(element)) {
					element.__resizeLast__.width = element.offsetWidth;
					element.__resizeLast__.height = element.offsetHeight;
					element.__resizeListeners__.forEach(function(fn){
						fn.call(element, e);
					});
				}
			});
		};
		
		/* Detect CSS Animations support to detect element display/re-attach */
		var animation = false,
			animationstring = 'animation',
			keyframeprefix = '',
			animationstartevent = 'animationstart',
			domPrefixes = 'Webkit Moz O ms'.split(' '),
			startEvents = 'webkitAnimationStart animationstart oAnimationStart MSAnimationStart'.split(' '),
			pfx  = '';
		{
			var elm = document.createElement('fakeelement');
			if( elm.style.animationName !== undefined ) { animation = true; }    
			
			if( animation === false ) {
				for( var i = 0; i < domPrefixes.length; i++ ) {
					if( elm.style[ domPrefixes[i] + 'AnimationName' ] !== undefined ) {
						pfx = domPrefixes[ i ];
						animationstring = pfx + 'Animation';
						keyframeprefix = '-' + pfx.toLowerCase() + '-';
						animationstartevent = startEvents[ i ];
						animation = true;
						break;
					}
				}
			}
		}
		
		var animationName = 'resizeanim';
		var animationKeyframes = '@' + keyframeprefix + 'keyframes ' + animationName + ' { from { opacity: 0; } to { opacity: 0; } } ';
		var animationStyle = keyframeprefix + 'animation: 1ms ' + animationName + '; ';
	}
	
	function createStyles() {
		if (!stylesCreated) {
			//opacity:0 works around a chrome bug https://code.google.com/p/chromium/issues/detail?id=286360
			var css = (animationKeyframes ? animationKeyframes : '') +
					'.resize-triggers { ' + (animationStyle ? animationStyle : '') + 'visibility: hidden; opacity: 0; } ' +
					'.resize-triggers, .resize-triggers > div, .contract-trigger:before { content: \" \"; display: block; position: absolute; top: 0; left: 0; height: 100%; width: 100%; overflow: hidden; } .resize-triggers > div { background: #eee; overflow: auto; } .contract-trigger:before { width: 200%; height: 200%; }',
				head = document.head || document.getElementsByTagName('head')[0],
				style = document.createElement('style');
			
			style.type = 'text/css';
			if (style.styleSheet) {
				style.styleSheet.cssText = css;
			} else {
				style.appendChild(document.createTextNode(css));
			}

			head.appendChild(style);
			stylesCreated = true;
		}
	}
	
	window.addResizeListener = function(element, fn){
		if (attachEvent) element.attachEvent('onresize', fn);
		else {
			if (!element.__resizeTriggers__) {
				if (getComputedStyle(element).position == 'static') element.style.position = 'relative';
				createStyles();
				element.__resizeLast__ = {};
				element.__resizeListeners__ = [];
				(element.__resizeTriggers__ = document.createElement('div')).className = 'resize-triggers';
				element.__resizeTriggers__.innerHTML = '<div class="expand-trigger"><div></div></div>' +
																						'<div class="contract-trigger"></div>';
				element.appendChild(element.__resizeTriggers__);
				resetTriggers(element);
				element.addEventListener('scroll', scrollListener, true);
				
				/* Listen for a css animation to detect element display/re-attach */
				animationstartevent && element.__resizeTriggers__.addEventListener(animationstartevent, function(e) {
					if(e.animationName == animationName)
						resetTriggers(element);
				});
			}
			element.__resizeListeners__.push(fn);
		}
	};
	
	window.removeResizeListener = function(element, fn){
		if (attachEvent) element.detachEvent('onresize', fn);
		else {
			element.__resizeListeners__.splice(element.__resizeListeners__.indexOf(fn), 1);
			if (!element.__resizeListeners__.length) {
					element.removeEventListener('scroll', scrollListener);
					element.__resizeTriggers__ = !element.removeChild(element.__resizeTriggers__);
			}
		}
	}
})();
/**
* @preserve HTML5 Shiv 3.7.3 | @afarkas @jdalton @jon_neal @rem | MIT/GPL2 Licensed
*/
;(function(window, document) {
/*jshint evil:true */
  /** version */
  var version = '3.7.3';

  /** Preset options */
  var options = window.html5 || {};

  /** Used to skip problem elements */
  var reSkip = /^<|^(?:button|map|select|textarea|object|iframe|option|optgroup)$/i;

  /** Not all elements can be cloned in IE **/
  var saveClones = /^(?:a|b|code|div|fieldset|h1|h2|h3|h4|h5|h6|i|label|li|ol|p|q|span|strong|style|table|tbody|td|th|tr|ul)$/i;

  /** Detect whether the browser supports default html5 styles */
  var supportsHtml5Styles;

  /** Name of the expando, to work with multiple documents or to re-shiv one document */
  var expando = '_html5shiv';

  /** The id for the the documents expando */
  var expanID = 0;

  /** Cached data for each document */
  var expandoData = {};

  /** Detect whether the browser supports unknown elements */
  var supportsUnknownElements;

  (function() {
    try {
        var a = document.createElement('a');
        a.innerHTML = '<xyz></xyz>';
        //if the hidden property is implemented we can assume, that the browser supports basic HTML5 Styles
        supportsHtml5Styles = ('hidden' in a);

        supportsUnknownElements = a.childNodes.length == 1 || (function() {
          // assign a false positive if unable to shiv
          (document.createElement)('a');
          var frag = document.createDocumentFragment();
          return (
            typeof frag.cloneNode == 'undefined' ||
            typeof frag.createDocumentFragment == 'undefined' ||
            typeof frag.createElement == 'undefined'
          );
        }());
    } catch(e) {
      // assign a false positive if detection fails => unable to shiv
      supportsHtml5Styles = true;
      supportsUnknownElements = true;
    }

  }());

  /*--------------------------------------------------------------------------*/

  /**
   * Creates a style sheet with the given CSS text and adds it to the document.
   * @private
   * @param {Document} ownerDocument The document.
   * @param {String} cssText The CSS text.
   * @returns {StyleSheet} The style element.
   */
  function addStyleSheet(ownerDocument, cssText) {
    var p = ownerDocument.createElement('p'),
        parent = ownerDocument.getElementsByTagName('head')[0] || ownerDocument.documentElement;

    p.innerHTML = 'x<style>' + cssText + '</style>';
    return parent.insertBefore(p.lastChild, parent.firstChild);
  }

  /**
   * Returns the value of `html5.elements` as an array.
   * @private
   * @returns {Array} An array of shived element node names.
   */
  function getElements() {
    var elements = html5.elements;
    return typeof elements == 'string' ? elements.split(' ') : elements;
  }

  /**
   * Extends the built-in list of html5 elements
   * @memberOf html5
   * @param {String|Array} newElements whitespace separated list or array of new element names to shiv
   * @param {Document} ownerDocument The context document.
   */
  function addElements(newElements, ownerDocument) {
    var elements = html5.elements;
    if(typeof elements != 'string'){
      elements = elements.join(' ');
    }
    if(typeof newElements != 'string'){
      newElements = newElements.join(' ');
    }
    html5.elements = elements +' '+ newElements;
    shivDocument(ownerDocument);
  }

   /**
   * Returns the data associated to the given document
   * @private
   * @param {Document} ownerDocument The document.
   * @returns {Object} An object of data.
   */
  function getExpandoData(ownerDocument) {
    var data = expandoData[ownerDocument[expando]];
    if (!data) {
        data = {};
        expanID++;
        ownerDocument[expando] = expanID;
        expandoData[expanID] = data;
    }
    return data;
  }

  /**
   * returns a shived element for the given nodeName and document
   * @memberOf html5
   * @param {String} nodeName name of the element
   * @param {Document|DocumentFragment} ownerDocument The context document.
   * @returns {Object} The shived element.
   */
  function createElement(nodeName, ownerDocument, data){
    if (!ownerDocument) {
        ownerDocument = document;
    }
    if(supportsUnknownElements){
        return ownerDocument.createElement(nodeName);
    }
    if (!data) {
        data = getExpandoData(ownerDocument);
    }
    var node;

    if (data.cache[nodeName]) {
        node = data.cache[nodeName].cloneNode();
    } else if (saveClones.test(nodeName)) {
        node = (data.cache[nodeName] = data.createElem(nodeName)).cloneNode();
    } else {
        node = data.createElem(nodeName);
    }

    // Avoid adding some elements to fragments in IE < 9 because
    // * Attributes like `name` or `type` cannot be set/changed once an element
    //   is inserted into a document/fragment
    // * Link elements with `src` attributes that are inaccessible, as with
    //   a 403 response, will cause the tab/window to crash
    // * Script elements appended to fragments will execute when their `src`
    //   or `text` property is set
    return node.canHaveChildren && !reSkip.test(nodeName) && !node.tagUrn ? data.frag.appendChild(node) : node;
  }

  /**
   * returns a shived DocumentFragment for the given document
   * @memberOf html5
   * @param {Document} ownerDocument The context document.
   * @returns {Object} The shived DocumentFragment.
   */
  function createDocumentFragment(ownerDocument, data){
    if (!ownerDocument) {
        ownerDocument = document;
    }
    if(supportsUnknownElements){
        return ownerDocument.createDocumentFragment();
    }
    data = data || getExpandoData(ownerDocument);
    var clone = data.frag.cloneNode(),
        i = 0,
        elems = getElements(),
        l = elems.length;
    for(;i<l;i++){
        clone.createElement(elems[i]);
    }
    return clone;
  }

  /**
   * Shivs the `createElement` and `createDocumentFragment` methods of the document.
   * @private
   * @param {Document|DocumentFragment} ownerDocument The document.
   * @param {Object} data of the document.
   */
  function shivMethods(ownerDocument, data) {
    if (!data.cache) {
        data.cache = {};
        data.createElem = ownerDocument.createElement;
        data.createFrag = ownerDocument.createDocumentFragment;
        data.frag = data.createFrag();
    }


    ownerDocument.createElement = function(nodeName) {
      //abort shiv
      if (!html5.shivMethods) {
          return data.createElem(nodeName);
      }
      return createElement(nodeName, ownerDocument, data);
    };

    ownerDocument.createDocumentFragment = Function('h,f', 'return function(){' +
      'var n=f.cloneNode(),c=n.createElement;' +
      'h.shivMethods&&(' +
        // unroll the `createElement` calls
        getElements().join().replace(/[\w\-:]+/g, function(nodeName) {
          data.createElem(nodeName);
          data.frag.createElement(nodeName);
          return 'c("' + nodeName + '")';
        }) +
      ');return n}'
    )(html5, data.frag);
  }

  /*--------------------------------------------------------------------------*/

  /**
   * Shivs the given document.
   * @memberOf html5
   * @param {Document} ownerDocument The document to shiv.
   * @returns {Document} The shived document.
   */
  function shivDocument(ownerDocument) {
    if (!ownerDocument) {
        ownerDocument = document;
    }
    var data = getExpandoData(ownerDocument);

    if (html5.shivCSS && !supportsHtml5Styles && !data.hasCSS) {
      data.hasCSS = !!addStyleSheet(ownerDocument,
        // corrects block display not defined in IE6/7/8/9
        'article,aside,dialog,figcaption,figure,footer,header,hgroup,main,nav,section{display:block}' +
        // adds styling not present in IE6/7/8/9
        'mark{background:#FF0;color:#000}' +
        // hides non-rendered elements
        'template{display:none}'
      );
    }
    if (!supportsUnknownElements) {
      shivMethods(ownerDocument, data);
    }
    return ownerDocument;
  }

  /*--------------------------------------------------------------------------*/

  /**
   * The `html5` object is exposed so that more elements can be shived and
   * existing shiving can be detected on iframes.
   * @type Object
   * @example
   *
   * // options can be changed before the script is included
   * html5 = { 'elements': 'mark section', 'shivCSS': false, 'shivMethods': false };
   */
  var html5 = {

    /**
     * An array or space separated string of node names of the elements to shiv.
     * @memberOf html5
     * @type Array|String
     */
    'elements': options.elements || 'abbr article aside audio bdi canvas data datalist details dialog figcaption figure footer header hgroup main mark meter nav output picture progress section summary template time video',

    /**
     * current version of html5shiv
     */
    'version': version,

    /**
     * A flag to indicate that the HTML5 style sheet should be inserted.
     * @memberOf html5
     * @type Boolean
     */
    'shivCSS': (options.shivCSS !== false),

    /**
     * Is equal to true if a browser supports creating unknown/HTML5 elements
     * @memberOf html5
     * @type boolean
     */
    'supportsUnknownElements': supportsUnknownElements,

    /**
     * A flag to indicate that the document's `createElement` and `createDocumentFragment`
     * methods should be overwritten.
     * @memberOf html5
     * @type Boolean
     */
    'shivMethods': (options.shivMethods !== false),

    /**
     * A string to describe the type of `html5` object ("default" or "default print").
     * @memberOf html5
     * @type String
     */
    'type': 'default',

    // shivs the document according to the specified `html5` object options
    'shivDocument': shivDocument,

    //creates a shived element
    createElement: createElement,

    //creates a shived documentFragment
    createDocumentFragment: createDocumentFragment,

    //extends list of elements
    addElements: addElements
  };

  /*--------------------------------------------------------------------------*/

  // expose html5
  window.html5 = html5;

  // shiv the document
  shivDocument(document);

  if(typeof module == 'object' && module.exports){
    module.exports = html5;
  }

}(typeof window !== "undefined" ? window : this, document));
/*! matchMedia() polyfill - Test a CSS media type/query in JS. Authors & copyright (c) 2012: Scott Jehl, Paul Irish, Nicholas Zakas, David Knight. Dual MIT/BSD license */

window.matchMedia || (window.matchMedia = function() {
    "use strict";

    // For browsers that support matchMedium api such as IE 9 and webkit
    var styleMedia = (window.styleMedia || window.media);

    // For those that don't support matchMedium
    if (!styleMedia) {
        var style       = document.createElement('style'),
            script      = document.getElementsByTagName('script')[0],
            info        = null;

        style.type  = 'text/css';
        style.id    = 'matchmediajs-test';

        script.parentNode.insertBefore(style, script);

        // 'style.currentStyle' is used by IE <= 8 and 'window.getComputedStyle' for all other browsers
        info = ('getComputedStyle' in window) && window.getComputedStyle(style, null) || style.currentStyle;

        styleMedia = {
            matchMedium: function(media) {
                var text = '@media ' + media + '{ #matchmediajs-test { width: 1px; } }';

                // 'style.styleSheet' is used by IE <= 8 and 'style.textContent' for all other browsers
                if (style.styleSheet) {
                    style.styleSheet.cssText = text;
                } else {
                    style.textContent = text;
                }

                // Test if media query is true or false
                return info.width === '1px';
            }
        };
    }

    return function(media) {
        return {
            matches: styleMedia.matchMedium(media || 'all'),
            media: media || 'all'
        };
    };
}());

/*!
 * The MIT License
 *
 * Copyright (c) 2012 James Allardice
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 */

( function ( global ) {

  'use strict';

  //
  // Test for support. We do this as early as possible to optimise for browsers
  // that have native support for the attribute.
  //

  var test = document.createElement('input');
  var nativeSupport = test.placeholder !== void 0;

  global.Placeholders = {
    nativeSupport: nativeSupport,
    disable: nativeSupport ? noop : disablePlaceholders,
    enable: nativeSupport ? noop : enablePlaceholders
  };

  if ( nativeSupport ) {
    return;
  }

  //
  // If we reach this point then the browser does not have native support for
  // the attribute.
  //

  // The list of input element types that support the placeholder attribute.
  var validTypes = [
    'text',
    'search',
    'url',
    'tel',
    'email',
    'password',
    'number',
    'textarea'
  ];

  // The list of keycodes that are not allowed when the polyfill is configured
  // to hide-on-input.
  var badKeys = [

    // The following keys all cause the caret to jump to the end of the input
    // value.

    27, // Escape
    33, // Page up
    34, // Page down
    35, // End
    36, // Home

    // Arrow keys allow you to move the caret manually, which should be
    // prevented when the placeholder is visible.

    37, // Left
    38, // Up
    39, // Right
    40, // Down

    // The following keys allow you to modify the placeholder text by removing
    // characters, which should be prevented when the placeholder is visible.

    8, // Backspace
    46 // Delete
  ];

  // Styling variables.
  var placeholderStyleColor = '#ccc';
  var placeholderClassName = 'placeholdersjs';
  var classNameRegExp = new RegExp('(?:^|\\s)' + placeholderClassName + '(?!\\S)');

  // The various data-* attributes used by the polyfill.
  var ATTR_CURRENT_VAL = 'data-placeholder-value';
  var ATTR_ACTIVE = 'data-placeholder-active';
  var ATTR_INPUT_TYPE = 'data-placeholder-type';
  var ATTR_FORM_HANDLED = 'data-placeholder-submit';
  var ATTR_EVENTS_BOUND = 'data-placeholder-bound';
  var ATTR_OPTION_FOCUS = 'data-placeholder-focus';
  var ATTR_OPTION_LIVE = 'data-placeholder-live';
  var ATTR_MAXLENGTH = 'data-placeholder-maxlength';

  // Various other variables used throughout the rest of the script.
  var UPDATE_INTERVAL = 100;
  var head = document.getElementsByTagName('head')[ 0 ];
  var root = document.documentElement;
  var Placeholders = global.Placeholders;
  var keydownVal;

  // Get references to all the input and textarea elements currently in the DOM
  // (live NodeList objects to we only need to do this once).
  var inputs = document.getElementsByTagName('input');
  var textareas = document.getElementsByTagName('textarea');

  // Get any settings declared as data-* attributes on the root element.
  // Currently the only options are whether to hide the placeholder on focus
  // or input and whether to auto-update.
  var hideOnInput = root.getAttribute(ATTR_OPTION_FOCUS) === 'false';
  var liveUpdates = root.getAttribute(ATTR_OPTION_LIVE) !== 'false';

  // Create style element for placeholder styles (instead of directly setting
  // style properties on elements - allows for better flexibility alongside
  // user-defined styles).
  var styleElem = document.createElement('style');
  styleElem.type = 'text/css';

  // Create style rules as text node.
  var styleRules = document.createTextNode(
    '.' + placeholderClassName + ' {' +
      'color:' + placeholderStyleColor + ';' +
    '}'
  );

  // Append style rules to newly created stylesheet.
  if ( styleElem.styleSheet ) {
    styleElem.styleSheet.cssText = styleRules.nodeValue;
  } else {
    styleElem.appendChild(styleRules);
  }

  // Prepend new style element to the head (before any existing stylesheets,
  // so user-defined rules take precedence).
  head.insertBefore(styleElem, head.firstChild);

  // Set up the placeholders.
  var placeholder;
  var elem;

  for ( var i = 0, len = inputs.length + textareas.length; i < len; i++ ) {

    // Find the next element. If we've already done all the inputs we move on
    // to the textareas.
    elem = i < inputs.length ? inputs[ i ] : textareas[ i - inputs.length ];

    // Get the value of the placeholder attribute, if any. IE10 emulating IE7
    // fails with getAttribute, hence the use of the attributes node.
    placeholder = elem.attributes.placeholder;

    // If the element has a placeholder attribute we need to modify it.
    if ( placeholder ) {

      // IE returns an empty object instead of undefined if the attribute is
      // not present.
      placeholder = placeholder.nodeValue;

      // Only apply the polyfill if this element is of a type that supports
      // placeholders and has a placeholder attribute with a non-empty value.
      if ( placeholder && inArray(validTypes, elem.type) ) {
        newElement(elem);
      }
    }
  }

  // If enabled, the polyfill will repeatedly check for changed/added elements
  // and apply to those as well.
  var timer = setInterval(function () {
    for ( var i = 0, len = inputs.length + textareas.length; i < len; i++ ) {
      elem = i < inputs.length ? inputs[ i ] : textareas[ i - inputs.length ];

      // Only apply the polyfill if this element is of a type that supports
      // placeholders, and has a placeholder attribute with a non-empty value.
      placeholder = elem.attributes.placeholder;

      if ( placeholder ) {

        placeholder = placeholder.nodeValue;

        if ( placeholder && inArray(validTypes, elem.type) ) {

          // If the element hasn't had event handlers bound to it then add
          // them.
          if ( !elem.getAttribute(ATTR_EVENTS_BOUND) ) {
            newElement(elem);
          }

          // If the placeholder value has changed or not been initialised yet
          // we need to update the display.
          if (
            placeholder !== elem.getAttribute(ATTR_CURRENT_VAL) ||
            ( elem.type === 'password' && !elem.getAttribute(ATTR_INPUT_TYPE) )
          ) {

            // Attempt to change the type of password inputs (fails in IE < 9).
            if (
              elem.type === 'password' &&
              !elem.getAttribute(ATTR_INPUT_TYPE) &&
              changeType(elem, 'text')
            ) {
              elem.setAttribute(ATTR_INPUT_TYPE, 'password');
            }

            // If the placeholder value has changed and the placeholder is
            // currently on display we need to change it.
            if ( elem.value === elem.getAttribute(ATTR_CURRENT_VAL) ) {
              elem.value = placeholder;
            }

            // Keep a reference to the current placeholder value in case it
            // changes via another script.
            elem.setAttribute(ATTR_CURRENT_VAL, placeholder);
          }
        }
      } else if ( elem.getAttribute(ATTR_ACTIVE) ) {
        hidePlaceholder(elem);
        elem.removeAttribute(ATTR_CURRENT_VAL);
      }
    }

    // If live updates are not enabled cancel the timer.
    if ( !liveUpdates ) {
      clearInterval(timer);
    }
  }, UPDATE_INTERVAL);

  // Disabling placeholders before unloading the page prevents flash of
  // unstyled placeholders on load if the page was refreshed.
  addEventListener(global, 'beforeunload', function () {
    Placeholders.disable();
  });

  //
  // Utility functions
  //

  // No-op (used in place of public methods when native support is detected).
  function noop() {}

  // Avoid IE9 activeElement of death when an iframe is used.
  //
  // More info:
  //  - http://bugs.jquery.com/ticket/13393
  //  - https://github.com/jquery/jquery/commit/85fc5878b3c6af73f42d61eedf73013e7faae408
  function safeActiveElement() {
    try {
      return document.activeElement;
    } catch ( err ) {}
  }

  // Check whether an item is in an array. We don't use Array.prototype.indexOf
  // so we don't clobber any existing polyfills. This is a really simple
  // alternative.
  function inArray( arr, item ) {
    for ( var i = 0, len = arr.length; i < len; i++ ) {
      if ( arr[ i ] === item ) {
        return true;
      }
    }
    return false;
  }

  // Cross-browser DOM event binding
  function addEventListener( elem, event, fn ) {
    if ( elem.addEventListener ) {
      return elem.addEventListener(event, fn, false);
    }
    if ( elem.attachEvent ) {
      return elem.attachEvent('on' + event, fn);
    }
  }

  // Move the caret to the index position specified. Assumes that the element
  // has focus.
  function moveCaret( elem, index ) {
    var range;
    if ( elem.createTextRange ) {
      range = elem.createTextRange();
      range.move('character', index);
      range.select();
    } else if ( elem.selectionStart ) {
      elem.focus();
      elem.setSelectionRange(index, index);
    }
  }

  // Attempt to change the type property of an input element.
  function changeType( elem, type ) {
    try {
      elem.type = type;
      return true;
    } catch ( e ) {
      // You can't change input type in IE8 and below.
      return false;
    }
  }

  function handleElem( node, callback ) {

    // Check if the passed in node is an input/textarea (in which case it can't
    // have any affected descendants).
    if ( node && node.getAttribute(ATTR_CURRENT_VAL) ) {
      callback(node);
    } else {

      // If an element was passed in, get all affected descendants. Otherwise,
      // get all affected elements in document.
      var handleInputs = node ? node.getElementsByTagName('input') : inputs;
      var handleTextareas = node ? node.getElementsByTagName('textarea') : textareas;

      var handleInputsLength = handleInputs ? handleInputs.length : 0;
      var handleTextareasLength = handleTextareas ? handleTextareas.length : 0;

      // Run the callback for each element.
      var len = handleInputsLength + handleTextareasLength;
      var elem;
      for ( var i = 0; i < len; i++ ) {

        elem = i < handleInputsLength ?
          handleInputs[ i ] :
          handleTextareas[ i - handleInputsLength ];

        callback(elem);
      }
    }
  }

  // Return all affected elements to their normal state (remove placeholder
  // value if present).
  function disablePlaceholders( node ) {
    handleElem(node, hidePlaceholder);
  }

  // Show the placeholder value on all appropriate elements.
  function enablePlaceholders( node ) {
    handleElem(node, showPlaceholder);
  }

  // Hide the placeholder value on a single element. Returns true if the
  // placeholder was hidden and false if it was not (because it wasn't visible
  // in the first place).
  function hidePlaceholder( elem, keydownValue ) {

    var valueChanged = !!keydownValue && elem.value !== keydownValue;
    var isPlaceholderValue = elem.value === elem.getAttribute(ATTR_CURRENT_VAL);

    if (
      ( valueChanged || isPlaceholderValue ) &&
      elem.getAttribute(ATTR_ACTIVE) === 'true'
    ) {

      elem.removeAttribute(ATTR_ACTIVE);
      elem.value = elem.value.replace(elem.getAttribute(ATTR_CURRENT_VAL), '');
      elem.className = elem.className.replace(classNameRegExp, '');

      // Restore the maxlength value. Old FF returns -1 if attribute not set.
      // See GH-56.
      var maxLength = elem.getAttribute(ATTR_MAXLENGTH);
      if ( parseInt(maxLength, 10) >= 0 ) {
        elem.setAttribute('maxLength', maxLength);
        elem.removeAttribute(ATTR_MAXLENGTH);
      }

      // If the polyfill has changed the type of the element we need to change
      // it back.
      var type = elem.getAttribute(ATTR_INPUT_TYPE);
      if ( type ) {
        elem.type = type;
      }

      return true;
    }

    return false;
  }

  // Show the placeholder value on a single element. Returns true if the
  // placeholder was shown and false if it was not (because it was already
  // visible).
  function showPlaceholder( elem ) {

    var val = elem.getAttribute(ATTR_CURRENT_VAL);

    if ( elem.value === '' && val ) {

      elem.setAttribute(ATTR_ACTIVE, 'true');
      elem.value = val;
      elem.className += ' ' + placeholderClassName;

      // Store and remove the maxlength value.
      var maxLength = elem.getAttribute(ATTR_MAXLENGTH);
      if ( !maxLength ) {
        elem.setAttribute(ATTR_MAXLENGTH, elem.maxLength);
        elem.removeAttribute('maxLength');
      }

      // If the type of element needs to change, change it (e.g. password
      // inputs).
      var type = elem.getAttribute(ATTR_INPUT_TYPE);
      if ( type ) {
        elem.type = 'text';
      } else if ( elem.type === 'password' && changeType(elem, 'text') ) {
        elem.setAttribute(ATTR_INPUT_TYPE, 'password');
      }

      return true;
    }

    return false;
  }

  // Returns a function that is used as a focus event handler.
  function makeFocusHandler( elem ) {
    return function () {

      // Only hide the placeholder value if the (default) hide-on-focus
      // behaviour is enabled.
      if (
        hideOnInput &&
        elem.value === elem.getAttribute(ATTR_CURRENT_VAL) &&
        elem.getAttribute(ATTR_ACTIVE) === 'true'
      ) {

        // Move the caret to the start of the input (this mimics the behaviour
        // of all browsers that do not hide the placeholder on focus).
        moveCaret(elem, 0);
      } else {

        // Remove the placeholder.
        hidePlaceholder(elem);
      }
    };
  }

  // Returns a function that is used as a blur event handler.
  function makeBlurHandler( elem ) {
    return function () {
      showPlaceholder(elem);
    };
  }

  // Returns a function that is used as a submit event handler on form elements
  // that have children affected by this polyfill.
  function makeSubmitHandler( form ) {
    return function () {

        // Turn off placeholders on all appropriate descendant elements.
        disablePlaceholders(form);
    };
  }

  // Functions that are used as a event handlers when the hide-on-input
  // behaviour has been activated - very basic implementation of the 'input'
  // event.
  function makeKeydownHandler( elem ) {
    return function ( e ) {
      keydownVal = elem.value;

      // Prevent the use of the arrow keys (try to keep the cursor before the
      // placeholder).
      if (
        elem.getAttribute(ATTR_ACTIVE) === 'true' &&
        keydownVal === elem.getAttribute(ATTR_CURRENT_VAL) &&
        inArray(badKeys, e.keyCode)
      ) {
        if ( e.preventDefault ) {
            e.preventDefault();
        }
        return false;
      }
    };
  }

  function makeKeyupHandler(elem) {
    return function () {
      hidePlaceholder(elem, keydownVal);

      // If the element is now empty we need to show the placeholder
      if ( elem.value === '' ) {
        elem.blur();
        moveCaret(elem, 0);
      }
    };
  }

  function makeClickHandler(elem) {
    return function () {
      if (
        elem === safeActiveElement() &&
        elem.value === elem.getAttribute(ATTR_CURRENT_VAL) &&
        elem.getAttribute(ATTR_ACTIVE) === 'true'
      ) {
        moveCaret(elem, 0);
      }
    };
  }

  // Bind event handlers to an element that we need to affect with the
  // polyfill.
  function newElement( elem ) {

    // If the element is part of a form, make sure the placeholder string is
    // not submitted as a value.
    var form = elem.form;
    if ( form && typeof form === 'string' ) {

      // Get the real form.
      form = document.getElementById(form);

      // Set a flag on the form so we know it's been handled (forms can contain
      // multiple inputs).
      if ( !form.getAttribute(ATTR_FORM_HANDLED) ) {
        addEventListener(form, 'submit', makeSubmitHandler(form));
        form.setAttribute(ATTR_FORM_HANDLED, 'true');
      }
    }

    // Bind event handlers to the element so we can hide/show the placeholder
    // as appropriate.
    addEventListener(elem, 'focus', makeFocusHandler(elem));
    addEventListener(elem, 'blur', makeBlurHandler(elem));

    // If the placeholder should hide on input rather than on focus we need
    // additional event handlers
    if (hideOnInput) {
      addEventListener(elem, 'keydown', makeKeydownHandler(elem));
      addEventListener(elem, 'keyup', makeKeyupHandler(elem));
      addEventListener(elem, 'click', makeClickHandler(elem));
    }

    // Remember that we've bound event handlers to this element.
    elem.setAttribute(ATTR_EVENTS_BOUND, 'true');
    elem.setAttribute(ATTR_CURRENT_VAL, placeholder);

    // If the element doesn't have a value and is not focussed, set it to the
    // placeholder string.
    if ( hideOnInput || elem !== safeActiveElement() ) {
      showPlaceholder(elem);
    }
  }

}(this) );
// IE spupport comes in IE10
(function rAFPolyfill() {
    var lastTime, vendors, x;
    lastTime = 0;
    vendors = ["webkit", "moz"];
    x = 0;
    while (x < vendors.length && !window.requestAnimationFrame) {
      window.requestAnimationFrame = window[vendors[x] + "RequestAnimationFrame"];
      window.cancelAnimationFrame = window[vendors[x] + "CancelAnimationFrame"] || window[vendors[x] + "CancelRequestAnimationFrame"];
      ++x;
    }
    if (!window.requestAnimationFrame) {
      window.requestAnimationFrame = function(callback, element) {
        var currTime, id, timeToCall;
        currTime = new Date().getTime();
        timeToCall = Math.max(0, 16 - (currTime - lastTime));
        id = window.setTimeout(function() {
          callback(currTime + timeToCall);
        }, timeToCall);
        lastTime = currTime + timeToCall;
        return id;
      };
    }
    if (!window.cancelAnimationFrame) {
      window.cancelAnimationFrame = function(id) {
        clearTimeout(id);
      };
    }
})();



(function($) {
	'use strict';

	var MK = window.MK || {};

	/**
	 * MK.core holds most important methods that bootstraps whole application
	 * 
	 * @type {Object}
	 */
	MK.core = {};



	/**
	 * State for referance of already loaded script files
	 * @type {Array}
	 */
	var _loadedDependencies = [];

	/**
	 * State of queue represented as pairs of script ref => callback
	 * @type {Object}
	 */
	var _inQueue = {};
	
	/**
	 * Initializes all components in given scope (object or DOM reference) based on data attribute and 'pointer' css class '.js-el'.
	 * DOM work is reduced by single traversing for pointer class and later filtering through cached object. It expects init() method
	 * on every component. Component itself should be defined in MK.component namespace and assign to DOM element via data-mk-component.
	 * Use it once on DOM ready with document as a scope. For partial initialization after ajax operations pass as a scope element
	 * where new DOM was inserted.
	 * 
	 * @param  {string|object}
	 */
	MK.core.initAll = function( scope ) {
		var $el = $( scope ).find( '.js-el' ), // single traversing
			$components = $el.filter( '[data-mk-component]' ),
			component = null;


		// initialize  component
		var init = function init(name, el) {
			var $el = $(el);

			if ( $el.data('init-' + name) ) return; // do not initialize the same module twice

			if ( typeof MK.component[ name ] !== 'function' ) console.log('Component init error: ', name);
			else {
				component = new MK.component[ name ]( el );
				component.init();
				$el.data('init-' + name, true); // mark as initialised
				// TODO add name
				MK.utils.eventManager.publish('component-inited');
			}
		};

		$components.each( function() {
			var self = this,
				$this = $( this ),
				names = $this.data( 'mk-component' );

			if( typeof names === 'string' ) {
				var name = names; // containes only single name. Keep it transparent.
				init(name, self);
			} else {
				names.forEach( function( name ) {
					init(name, self);
				});
			} 
		}); 
	};

	/**
	 * Async loader for 3rd party plugins available from within theme or external CDNs / APIs.
	 * Take one argument as callback which is run when loading is finished. Also keeps track of already loaded scripts 
	 * and prevent duplication. Holds in queue multiple callbacks that where defined in different places but depend on the 
	 * same plugin.
	 *
	 * TODO: heavy test for multiple dependencies and crosssharing one dependency and different one dependency in queue, 
	 * bulletproof with single dependency
	 *
	 * @example MK.core.loadDependencies([MK.core.path.plugins + 'plugin.js'], function() {
	 *          	// do something when plugin is loaded
	 * 			})
	 * 
	 * @param  {array}
	 * @param  {function}
	 */
	MK.core.loadDependencies = function( dependencies, callback ) {
		var _callback = callback || function() {};

        if( !dependencies ) {
        	// If no dependencies defined then run _callback imidietelly
        	_callback(); 
        	return;
        }

		// Check for new dependencies
        var newDeps = dependencies.map( function( dep ) {
            if( _loadedDependencies.indexOf( dep ) === -1 ) {
            	 if( typeof _inQueue[ dep ] === 'undefined' ) {
        			// console.log( dep );
                	return dep;
                } else {
                	_inQueue[ dep ].push( _callback );
                	return true;
                }
            } else {
            	return false;
            }
        });

        // The dependency is not new but it's not resolved yet
        // Callback is added to queue that will be run after the script is loaded
        // Don't run callback just yet.
        if( newDeps[0] === true ) {
        	// console.log('Waiting for ' + dependencies[0]);
        	return;
        }

        // Dependency was loaded previously. We can run callback safely
        if( newDeps[0] === false ) {
        	_callback();
        	return;
        }

        // Create queue and relationship script -> callback array to track
        // all callbacks that waits for ths script
        var queue = newDeps.map( function( script ) {
        	// console.log( script );
        	_inQueue[ script ] = [ _callback ];
            return $.getCachedScript( script );
        });

        // Callbacks invoking
        var onLoad = function onLoad() {
        	var index;
        	newDeps.map( function( loaded ) {
        		_inQueue[ loaded ].forEach( function( callback ) {
        			callback();
        		});
        		delete _inQueue[ loaded ];
                _loadedDependencies.push( loaded );
        	});
        };

        // Run callbacks when promise is resolved
        $.when.apply( null, queue ).done( onLoad );
	};

	/**
	 * Single namespace for all paths recuired in application.
	 * @type {Object}
	 */
	MK.core.path = {
		theme   : mk_theme_dir,
		plugins : mk_theme_js_path + '/plugins/async/min/',
		ajaxUrl : window.PHP.ajax
	};


})(jQuery);
(function($) {
	'use strict';

    var MK = window.MK || {};
	MK.utils = window.MK.utils || {};

    /**
     * Enables to evaluate common methods through DOM JSON references by invoking from object with bracket notation MK.utils[var][var]
     * @type {Object}
     */
    MK.utils.actions = {};

    MK.utils.actions.activate = function (el) {
        $(el).addClass('is-active');
    };
        
    MK.utils.actions.deactivate = function (el) {
        $(el).removeClass('is-active');
    };

}(jQuery));
(function($) {
	'use strict';

    var MK = window.MK || {};
	MK.utils = window.MK.utils || {};

    /**
     * Gets user browser and its version
     * @return {Object} => {name, version}
     */
	MK.utils.browser = (function() {
        var dataBrowser = [
            {string: navigator.userAgent, subString: "Edge", identity: "Edge"},
            {string: navigator.userAgent, subString: "Chrome", identity: "Chrome"},
            {string: navigator.userAgent, subString: "MSIE", identity: "IE"},
            {string: navigator.userAgent, subString: "Trident", identity: "IE"},
            {string: navigator.userAgent, subString: "Firefox", identity: "Firefox"},
            {string: navigator.userAgent, subString: "Safari", identity: "Safari"},
            {string: navigator.userAgent, subString: "Opera", identity: "Opera"}
        ];

		var versionSearchString = null;
        var searchString = function (data) {
            for (var i = 0; i < data.length; i++) {
                var dataString = data[i].string;
                versionSearchString = data[i].subString;

                if (dataString.indexOf(data[i].subString) !== -1) {
                    return data[i].identity;
                }
            }
        };
        
        var searchVersion = function (dataString) {
            var index = dataString.indexOf(versionSearchString);
            if (index === -1) {
                return;
            }

            var rv = dataString.indexOf("rv:");
            if (versionSearchString === "Trident" && rv !== -1) {
                return parseFloat(dataString.substring(rv + 3));
            } else {
                return parseFloat(dataString.substring(index + versionSearchString.length + 1));
            }
        };

        var name = searchString(dataBrowser) || "Other";
        var version = searchVersion(navigator.userAgent) || searchVersion(navigator.appVersion) || "Unknown";

        // Expose for css
        $('html').addClass(name).addClass(name + version);


        return {
        	name : name,
        	version : version
        };
        
	})();

    /**
     * Gets user operating system
     * @return {String}
     */
	MK.utils.OS = (function() {
		if (navigator.appVersion.indexOf("Win")!=-1) return "Windows";
		if (navigator.appVersion.indexOf("Mac")!=-1) return "OSX";
		if (navigator.appVersion.indexOf("X11")!=-1) return "UNIX";
		if (navigator.appVersion.indexOf("Linux")!=-1) return "Linux";
	})();
	
    /**
     * Check if mobile device.
     * @return {Boolean}
     */
	MK.utils.isMobile = function() {
        // Problems with bigger tablets as users raport differences with behaviour. Switch to navigator sniffing
		// return ('ontouchstart' in document.documentElement) && matchMedia( '(max-width: 1024px)' ).matches;
     
        // http://www.abeautifulsite.net/detecting-mobile-devices-with-javascript/
        // if it still brings problem try to move to more sophisticated solution like
        // apachemobilefilter.org
        // detectright.com
        // web.wurfl.io
        // 
        // Seems as best solution here:
        // hgoebl.github.io/mobile-detect.js

        function android() {
            return navigator.userAgent.match(/Android/i);
        }

        function blackBerry() {
            return navigator.userAgent.match(/BlackBerry/i);
        }

        function iOS() {
            return navigator.userAgent.match(/iPhone|iPad|iPod/i);
        }

        function opera() {
            return navigator.userAgent.match(/Opera Mini/i);
        }

        function windows() {
            return navigator.userAgent.match(/IEMobile/i);
        }

        return (android() || blackBerry() || iOS() || opera() || windows() || matchMedia( '(max-width: 1024px)' ).matches); 
            
	};

    /**
     * Check if menu is switched to responsive state based on user width settings
     * @return {Boolean} 
     */
    MK.utils.isResponsiveMenuState = function() {
        return window.matchMedia( '(max-width: '+ mk_responsive_nav_width +'px)').matches;
    };



    MK.utils.getUrlParameter = function getUrlParameter(sParam) {
        var sPageURL = decodeURIComponent(window.location.search.substring(1)),
            sURLVariables = sPageURL.split('&'),
            sParameterName,
            i;

        for (i = 0; i < sURLVariables.length; i++) {
            sParameterName = sURLVariables[i].split('=');

            if (sParameterName[0] === sParam) {
                return sParameterName[1] === undefined ? true : sParameterName[1];
            }
        }
    };


    MK.utils.isSmoothScroll = (function() {
        var isUserChoice = (mk_smooth_scroll === 'true');

        // We notify our app about smooth scroll option when user choose it from admin panel.
        return isUserChoice;
    }());

    MK.utils.showBackgroundVideo = (function() {
        var isUserChoice = (mk_show_background_video === 'true');

        return isUserChoice;
    }());

}(jQuery));

(function($) {
	'use strict';

    var MK = window.MK || {};
	MK.utils = window.MK.utils || {};

	/**
	 * Basic implementation of pub / sub pattern to avoid tight coupling with direct module communication
	 * @type {Object}
	 */
	MK.utils.eventManager = {};

	/**
	 * Subscribe to custom event and run callbacks
	 * @param  {String}
	 * @param  {Function}
	 *
	 * @usage MK.utils.eventManager.subscribe('event', function(e, params) {} )
	 */
	MK.utils.eventManager.subscribe = function(evt, func) {
		$(this).on(evt, func);
	};

	/**
	 * Unsubscribe from custom event
	 * @param  {String}
	 * @param  {Function}
	 */
	MK.utils.eventManager.unsubscribe = function(evt, func) {
		$(this).off(evt, func);
	};

	/**
	 * Publish custom event to notify appliaction about state change
	 * @param  {String}
	 * 
	 * @usage MK.utils.eventManager.publish('event', {
	 *        	param: val
	 *        })
	 */
	MK.utils.eventManager.publish = function(evt, params) {
		$(this).trigger(evt, [params]);
	};

}(jQuery));
(function($) {
	'use strict';

    var MK = window.MK || {};
	MK.utils = window.MK.utils || {};

	/**
	 * Control browser fullscreen mode
	 * @type {Object}
	 */
	MK.utils.fullscreen = {};

	// TODO: move to namespace
	MK.utils.launchIntoFullscreen = function ( element ) {
	    if(element.requestFullscreen) {
	     	element.requestFullscreen();
	  	} else if(element.mozRequestFullScreen) {
	    	element.mozRequestFullScreen();
	  	} else if(element.webkitRequestFullscreen) {
	    	element.webkitRequestFullscreen();
	  	} else if(element.msRequestFullscreen) {
	    	element.msRequestFullscreen();
	  	}
	};

	MK.utils.exitFullscreen = function () {
	  	if(document.exitFullscreen) {
	    	document.exitFullscreen();
	  	} else if(document.mozCancelFullScreen) {
	    	document.mozCancelFullScreen();
	  	} else if(document.webkitExitFullscreen) {
	    	document.webkitExitFullscreen();
	  	}
	};

}(jQuery));
(function($) {
	'use strict';

    var MK = window.MK || {};
	MK.utils = window.MK.utils || {};

	MK.utils.misc = {};
	// TODO: move to namespace

	/**
	 * Get all top offsets from jQuery collection
	 * 
	 * @param  {$Objects}
	 * @return {Aray}
	 */
	MK.utils.offsets = function( $els ) {
		return $.map( $els, function( el ) {
			return $( el ).offset().top;
		});
	};

	/**
	 * Retrive from array of numbers first number that is higher than given parameter
	 * 
	 * @param  {Number}
	 * @param  {Array}
	 * @return {Number}
	 */
	MK.utils.nextHigherVal = function( val, arr ) {
		var i = 0,
			higher = null;

		var check = function() {
			if( val > arr[ i ]) {
				i += 1;
				check();
			} else {
				higher = arr[ i ];
			}
		};
		check();

		return higher;
	};


    MK.utils.throttle = function( delay, fn ) {
        var last;
        var deferTimer;

        return function() {
            var context = this;
            var args = arguments;
            var now = +new Date;
            if( last && now < last + delay ) {
            	clearTimeout( deferTimer );
            	deferTimer = setTimeout( function() { 
            		last = now; fn.apply( context, args ); 
            	}, delay );
          	} else {
            	last = now;
            	fn.apply( context, args );
          	}
        };
    };

    MK.utils.isElementInViewport = function( el ) {
        var elemTop = el.getBoundingClientRect().top;
	    var isVisible = (elemTop < window.innerHeight);
	    return isVisible;
    };

})(jQuery); 
(function($) {
	'use strict';

    var MK = window.MK || {};
	MK.utils = window.MK.utils || {};

	/**
	 * Scrolls page to static pixel offset
	 * @param  {Number}
	 */
	MK.utils.scrollTo = function( offset ) {
		$('html, body').stop().animate({
			scrollTop: offset
			}, {
	  		duration: 1200,
	  		easing: "easeInOutExpo"
		});
	};

	/**
	 * Scrolls to element passed in as object or DOM reference
	 * @param  {String|Object}
	 */
	MK.utils.scrollToAnchor = function( hash ) {
		// Escape meta-chars from hash name only.
		hash = hash.substring(1).replace(/[!"#$%&'()*+,./:;<=>?@[\]^`{|}~]/g, "\\$&");
		hash = "#" + hash;
		var $target = $( hash );
		// console.log( hash );

		if( ! $target.length ) return;

		var offset  = $target.offset().top;
		offset = offset - MK.val.offsetHeaderHeight( offset );

		if( hash === '#top-of-page' ) window.history.replaceState( undefined, undefined, ' ' );
		else window.history.replaceState( undefined, undefined, hash );

		MK.utils.scrollTo( offset );
	};

	/**
	 * Controls native scroll behaviour
	 * @return {Object} => {disable, enable}
	 */
	MK.utils.scroll = (function() {
        // 37 - left arror, 38 - up arrow, 39 right arrow, 40 down arrow
	    var keys = [38, 40];

        function preventDefault(e) {
          e = e || window.event;
          e.preventDefault();
          e.returnValue = false;  
        }

        function wheel(e) {
          preventDefault(e);
        }

        function keydown(e) {
            for (var i = keys.length; i--;) {
                if (e.keyCode === keys[i]) {
                    preventDefault(e);
                    return;
                }
            }
        }

        function disableScroll() {
            if (window.addEventListener) {
                window.addEventListener('DOMMouseScroll', wheel, false);
            }
          	window.onmousewheel = document.onmousewheel = wheel;
          	document.onkeydown = keydown;
        }

        function enableScroll() {            
          	if (window.removeEventListener) {
                window.removeEventListener('DOMMouseScroll', wheel, false);
            }
            window.onmousewheel = document.onmousewheel = document.onkeydown = null; 
        }	

        return {
        	disable : disableScroll,
        	enable  : enableScroll
        };

	})();

	/**
	 * Checks if passed link element has anchor inside current page. Returns string like '#anchor' if so or false
	 * @param  {String|Object}
	 * @return {String|Boolean}
	 */
	MK.utils.detectAnchor = function( el ) {
		var $this = $( el ),
			loc = window.location,
			currentPage = loc.origin + loc.pathname,
			href = $this.attr( 'href' ),
			linkSplit = (href) ? href.split( '#' ) : '',
			hrefPage  = linkSplit[0] ? linkSplit[0] : '', 
			hrefHash  = linkSplit[1] ? linkSplit[1] : '';

		if( typeof hrefHash !== 'undefined' && hrefHash !== '' ) {
			return '#' + hrefHash;
		} else {
			return false;
		}
	};

	/**
	 * This should be invoked only on page load. 
	 * Scrolls to anchor from  address bar
	 */
	MK.utils.scrollToURLHash = function() {
		var loc = window.location,
			hash = loc.hash;

		if ( hash.length && hash.substring(1).length ) {
			// !loading is added early after DOM is ready to prevent native jump to anchor
			hash = hash.replace( '!loading', '' );

			// Wait for one second before animating 
			// Most of UI animations should be done by then and async operations complited
			setTimeout( function() {
				MK.utils.scrollToAnchor( hash );
			}, 1000 ); 

			// Right after reset back address bar
			setTimeout( function() {
				window.history.replaceState(undefined, undefined, hash);
			}, 1001);
		}
	};

	/**
	 * Scroll Spy implementation. Spy dynamic offsets of elements or static pixel offset
	 * @param  {Number|Element}
	 * @param  {Object} => callback object {before, active, after}
	 */
	MK.utils.scrollSpy = function( toSpy, config ) {
		var $window   = $( window ),
	        container = document.getElementById( 'mk-theme-container' ),
	        isObj     = ( typeof toSpy === 'object' ),
	        offset    = (isObj) ? MK.val.dynamicOffset( toSpy, config.position, config.threshold ) : function() { return toSpy; },
	        height    = (isObj) ? MK.val.dynamicHeight( toSpy ) : function() { return 0; },
	        cacheVals = {},
	        _p 		  = 'before'; // current position

		var checkPosition = function() {
	    	var s = MK.val.scroll(), 
	    		o = offset(),
	    		h = height();

	        if( s < o && _p !== 'before' ) {
	        	// console.log( toSpy, 'before' );
	        	if( config.before ) config.before();
	        	_p = 'before';
	        } 
	        else if( s >= o && s <= o + h && _p !== 'active' ) {
	        	// console.log( toSpy, 'active' );
	        	if( config.active ) config.active( o );
	        	_p = 'active';
	        }
	        else if( s > o + h && _p !== 'after' ) {
	        	// console.log( toSpy, 'after' );
	        	if( config.after) config.after( o + h );
	        	_p = 'after';
	        }
		};

		var rAF = function() {
			window.requestAnimationFrame( checkPosition );
		};

		var exportVals = function() {
			return cacheVals;    
		};

		var updateCache = function() {
	    	var o = offset(),
	    		h = height();
	    		
	        cacheVals = {
	        	before : o - $window.height(),
	        	active : o,
	        	after : o + h
	        };
		};

		if( config.cache ) {
			config.cache( exportVals );
		}

	    checkPosition();
	    $window.on( 'load', checkPosition );
	    $window.on( 'resize', checkPosition );
	    $window.on( 'mouseup', checkPosition );
   		window.addResizeListener( container, checkPosition );

	    $window.on( 'scroll', rAF ); 

   		updateCache();
	    $window.on( 'load', updateCache );
	    $window.on( 'resize', updateCache );
   		window.addResizeListener( container, updateCache );
	};

}(jQuery));
(function($) {
    'use strict';

    // Create delagation event handler to behave as "live" listener. We may provide new elements with ajax etc later
    // Just add js-taphover class whatever element you'd like to immidietely bring hover on touch devices
    $("body").on("click touchend", '.js-taphover', function (e) {
        var $link = $(e.currentTarget); // grab target
        var $target = $(e.target);

        // Rather than ":hover" state we operate on ".hover" class which gives us more control and chance to emulate it on click
        // yet it is easy to reason about in our CSS
        if ($link.hasClass('hover')) {
            return true;
        } else if ( MK.utils.isMobile() ) {
            if ( ($target.hasClass('hover-icon') || $target.closest('.hover-icon').length) && !$target.closest('.js-taphover').hasClass('hover') ) {
                e.preventDefault();
            }
            $link.addClass('hover');
            $('.js-taphover').not(e.currentTarget).removeClass('hover'); // remove it from previous element
            e.stopPropagation(); // do not leak to document root if expected element was touched
        }
    });

    // Whenever click leaks to the root romve all hover classes
    $(document).on("click", function(e) {
        $('.js-taphover').removeClass('hover');
    });

}(jQuery));
// (function() {
//     'use strict';

//     // Make sure the video behaves like background-size: cover
//     window.videoCover = function( holderSelector, videoSelector ) {
//         var videos = document.querySelectorAll( videoSelector ),
//             holder = document.querySelectorAll( holderSelector )[0];

//         [].forEach.call(videos, function(video) {

//             var videoAspectRatio;

//             resizeBackground(); 

//             video.onloadedmetadata = function() {
//                 // get images aspect ratio
//                 videoAspectRatio = this.height / this.width;
//                 // attach resize event and fire it once
//                 window.onresize = resizeBackground;
//                 resizeBackground();
//             };

//             function resizeBackground() {
//                 // get window size and aspect ratio
//                 var holderWidth = holder.innerWidth,
//                     holderHeight = holder.innerHeight,
//                     holderAspectRatio = holderHeight / holderWidth;

//                 //compare holder ratio to image ratio so you know which way the image should fill
//                 if ( holderAspectRatio < videoAspectRatio ) {
//                     // we are fill width
//                     video.style.width = holderWidth + "px";
//                     // and applying the correct aspect to the height now
//                     video.style.height = (holderWidth * videoAspectRatio) + "px"; // this can be margin if your element is not positioned relatively, absolutely or fixed
//                     // make sure image is always centered
//                     video.style.left = "0px";
//                     video.style.top = (holderHeight - (holderWidth * videoAspectRatio)) / 2 + "px";
//                 } else { // same thing as above but filling height instead
//                     video.style.height = holderHeight + "px";
//                     video.style.width = (holderHeight / videoAspectRatio) + "px";
//                     video.style.left = (holderWidth - (holderHeight / videoAspectRatio)) / 2 + "px";
//                     video.style.top = "0px";
//                 }
//             }

//         });
//     };

// }());
// 
// 
// 
// TODO it is temp only. make it as a plugin

(function($) {
    'use strict';

    var $videoHolder = $('.mk-center-video'),
        $wrapper = $videoHolder.parent(),
        baseAspectRatio = 56.25;

    var wrapperHeight,
        wrapperWidth,
        wrapperAspectRatio;

    function calc() {
        wrapperHeight = $wrapper.height();
        wrapperWidth = $wrapper.width();
        wrapperAspectRatio = (wrapperHeight / wrapperWidth) * 100;
    } 

    function apply() {        
        var width = (wrapperAspectRatio / baseAspectRatio) * 100,
            widthOverflow = (width - 100);

        $videoHolder.css({
            'padding-top': wrapperAspectRatio + '%',
            'width': width + '%',
            'left': -(widthOverflow / 2) + '%'
        }); 
    }

    function reset() {
        $videoHolder.css({
            'padding-top': baseAspectRatio + '%',
            'width': 100 + '%',
            'left': 0
        });
    }

    function setCover() {
        reset();
        calc();
        if(wrapperAspectRatio > baseAspectRatio) apply();
    }

    $(window).on('load', setCover);
    $(window).on('resize', setCover);


}(jQuery));
(function($) {
	'use strict';

	var MK = window.MK || {};

	/**
	* 	MK.val is collection of Lambdas responsible for returning up to date values of method type like scrollY or el offset.
	* 	The Lambda is responsible for keeping track of value of a particular property, usually takes as argument an object
	* 	(or DOM reference) and internally creates and updates data that is returned as primitive value - through variable reference.
	*
	*  Benefits of this approach:
	*  - reduced DOM reads
	*  - auto-updating values without need for additional logic where methods are called
	*  - updating values when needed to be updated not read
	*
	*  Downsides:
	*  - Memory overhead with closures and keeping state in memory ( still beter than read state from DOM, but use wisely -
	*    do not use it when you really need static value on runtime )
	*/
	MK.val = {};

	/**
	* Current window offsetY position
	*
	* @uses   MK.val.scroll()
	* @return {number}
	*/
	MK.val.scroll = (function() {
		var offset = 0,
		$window = $(window),
		hasPageYOffset = (window.pageYOffset !== undefined),
		body = (document.documentElement || document.body.parentNode || document.body); // cross browser handling

		var update = function() {
			offset = hasPageYOffset ? window.pageYOffset : body.scrollTop;
		};

		var rAF = function() {
			window.requestAnimationFrame(update);
		};

		update();
		$window.on('load', update);
		$window.on('resize', update);
		$window.on('scroll', rAF);

		return function() {
			return offset;
		};
	})();


	/**
	* Changes number of percent to pixels based on viewport height
	*
	* @uses   MK.val.viewportPercentHeight({percent val})
	* @param  {number}
	* @return {number}
	*/
	MK.val.viewportPercentHeight = function(percent) {
		return $(window).height() * (percent / 100);
	};


	/**
	* Wordpress adminbar height based on wp media queries
	* @return {Number}
	*/
	MK.val.adminbarHeight = function() {
		if (php.hasAdminbar) {
			// apply WP native media-query and sizes
			return (window.matchMedia('( max-width: 782px )').matches) ? 46 : 32;
		} else {
			return 0;
		}
	};


	/**
	* Offset when header becomes sticky. Evaluates viewport % and header height to pixels for according options
	* @return {Number}
	*/
	MK.val.stickyOffset = (function() {
		var $header = $('.mk-header').not('.js-header-shortcode').first();

		// We need to have returning function even when header is disabled
		if (!$header.length) {
			return function() {
				return 0;
			};
		}



		var $toolbar = $header.find('.mk-header-toolbar'),
		config = $header.data(),
		hasToolbar = $toolbar.length,
		toolbarHeight = (hasToolbar) ? $toolbar.height() : 0,
		isVertical = (config.headerStyle === 4),
		headerHeight = (isVertical) ? 0 : config.height;

		var type = ((typeof config.stickyOffset === 'number') ? 'number' : false) ||
		((config.stickyOffset === 'header') ? 'header' : false) ||
		'percent';

		var stickyOffset = 0;
		var setOffset = function() {

			//we calculate toolbar height for When the device is changed Size
			//Toolbar height in responsive state is 0
			toolbarHeight = (hasToolbar) ? $toolbar.height() : 0;

			if (MK.utils.isResponsiveMenuState()) {
				headerHeight = config.responsiveHeight;

				if (hasToolbar) {
					if ($toolbar.is(':hidden')) {
						toolbarHeight = 0;
					}
				}
			}

			if (type === 'number') {
				stickyOffset = config.stickyOffset;
			} else if (type === 'header') {

				stickyOffset = headerHeight + toolbarHeight + MK.val.adminbarHeight(); // add all header components here, make them 0 if needed

			} else if (type === 'percent') {
				stickyOffset = MK.val.viewportPercentHeight(parseInt(config.stickyOffset));
			}
		};

		setOffset();
		$(window).on('resize', setOffset);

		return function() {
			return stickyOffset;
		};
	}());



	/**
	* Gets header height on particular offsetY position. Use to determine logic for fullHeight, smooth scroll etc.
	* Takes one parameter which is offset position we're interested in.
	*
	* @uses   MK.val.offsetHeaderHeight({offset val})
	* @param  {number}
	* @return {number}
	*/
	MK.val.offsetHeaderHeight = (function() { // Closure avoids multiple DOM reads. We need to fetch header config only once.
		var $header = $('.mk-header').not('.js-header-shortcode').first();

		// We need to have returning function even when header is disabled
		if (!$header.length) {
			return function() {
				return 0;
			};
		}

		var $toolbar = $header.find('.mk-header-toolbar'),
		config = $header.data(),
		stickyHeight = config.stickyHeight,
		desktopHeight = config.height,
		mobileHeight = config.responsiveHeight,
		isTransparent = $header.hasClass('transparent-header'),
		isSticky = config.stickyStyle.length,
		isStickyLazy = config.stickyStyle === 'lazy',
		isVertical = config.headerStyle === 4,
		hasToolbar = $toolbar.length,
		toolbarHeight = hasToolbar ? $toolbar.height() : 0,
		bufor = 5;

		/**
		 * The sticky section of header style 2 has fixed height.
		 * The stickey height option does not affect this header style.
		 */
		if ( config.headerStyle === 2 ) {
			stickyHeight = $header.find( '.mk-header-nav-container' ).outerHeight();
		}

		// if header has border bottom we can calculate that (for responsive state)
		var $innerHeader = $header.find('.mk-header-inner');
		var hasInnerHeader = $innerHeader.length;

		var headerHeight = function(offset) {

			toolbarHeight = hasToolbar ? $toolbar.height() : 0
			var stickyOffset = MK.val.stickyOffset();


			if (MK.utils.isResponsiveMenuState()) { //  Header avaible only on top for mobile

				if (hasToolbar && $toolbar.is(':hidden')) {
					toolbarHeight = 0;
				}

				//in responsive state , .mk-header-holder position's changed to "relative"
				//and header's border affected to offset,so borders must be calculated
				var headerBorder = 0;
				headerBorder = parseInt($innerHeader.css('border-bottom-width'));

				var totalHeight = mobileHeight + MK.val.adminbarHeight() + toolbarHeight + headerBorder;

				if (offset <= totalHeight) return totalHeight;
				else return MK.val.adminbarHeight();
			} else {
				if (offset <= stickyOffset) {
					if (isVertical) {
						if (hasToolbar) {
							return toolbarHeight + MK.val.adminbarHeight();
						} else {
							return MK.val.adminbarHeight();
						}
					} else if (isTransparent) {
						return MK.val.adminbarHeight();
					} else {
						return desktopHeight + toolbarHeight + MK.val.adminbarHeight();
					} // For any other return regular desktop height
				} else if (offset > stickyOffset) {
					if (isVertical) {
						return MK.val.adminbarHeight();
					} else if (!isSticky) {
						return MK.val.adminbarHeight();
					} else if (isStickyLazy) {
						return MK.val.adminbarHeight();
					} else if (isSticky) {
						return stickyHeight + MK.val.adminbarHeight();
					}
				}
			}
			// default to 0 to prevent errors ( need to return number )
			// Anyway make sure all scenarios are covered in IFs
			return 0;
		};

		return function(offset) {
			return headerHeight(offset - MK.val.adminbarHeight());
		};
	})();


	/**
	* Gets current offset of given element (passed as object or DOM reference) from top or bottom (default to top)
	* of screen  with possible threshold (default to 0)
	*
	* @uses   MK.val.dynamicOffset({obj reference}, {'top'|'bottom'}, {threshold val})
	* @param  {string|object}
	* @param  {string}
	* @param  {number}
	* @return {number}
	*/
	MK.val.dynamicOffset = function(el, position, threshold) {
		var $window = $(window),
		$el = $(el),
		pos = position || 'top',
		thr = threshold || 0,
		container = document.getElementById('mk-theme-container'),
		currentPos = 0;

		var offset = 0,
		winH = 0,
		rect = 0,
		x = 0;

		var update = function() {
			winH = $window.height();
			rect = $el[0].getBoundingClientRect();
			offset = (rect.top + MK.val.scroll());
			x = (pos === 'top') ? MK.val.offsetHeaderHeight(offset) : winH + (rect.height - thr);
			currentPos = offset - x - 1;
		};

		update();
		$window.on('load', update);
		$window.on('resize', update);
		window.addResizeListener(container, update);

		return function() {
			return currentPos;
		};
	};

	/**
	* Gets current height of given element (passed as object or DOM reference)
	*
	* @uses   MK.val.dynamicHeight({obj reference})
	* @param  {string|object}
	* @return {number}
	*/
	MK.val.dynamicHeight = function(el) {
		var $window = $(window),
		$el = $(el),
		container = document.getElementById('mk-theme-container'),
		currentHeight = 0;

		var update = function() {
			currentHeight = $el.outerHeight();
		};

		update();
		$window.on('load', update);
		$window.on('resize', update);
		window.addResizeListener(container, update);

		return function() {
			return currentHeight;
		};
	};

})(jQuery);

/*
 * jQuery Easing v1.3 - http://gsgd.co.uk/sandbox/jquery/easing/
 *
 */
jQuery.easing["jswing"] = jQuery.easing["swing"];
jQuery.extend(jQuery.easing, {
        def: "easeOutQuad",
        swing: function (a, b, c, d, e) {
                return jQuery.easing[jQuery.easing.def](a, b, c, d, e)
        },
        easeInQuad: function (a, b, c, d, e) {
                return d * (b /= e) * b + c
        },
        easeOutQuad: function (a, b, c, d, e) {
                return -d * (b /= e) * (b - 2) + c
        },
        easeInOutQuad: function (a, b, c, d, e) {
                if ((b /= e / 2) < 1) return d / 2 * b * b + c;
                return -d / 2 * (--b * (b - 2) - 1) + c
        },
        easeInCubic: function (a, b, c, d, e) {
                return d * (b /= e) * b * b + c
        },
        easeOutCubic: function (a, b, c, d, e) {
                return d * ((b = b / e - 1) * b * b + 1) + c
        },
        easeInOutCubic: function (a, b, c, d, e) {
                if ((b /= e / 2) < 1) return d / 2 * b * b * b + c;
                return d / 2 * ((b -= 2) * b * b + 2) + c
        },
        easeInQuart: function (a, b, c, d, e) {
                return d * (b /= e) * b * b * b + c
        },
        easeOutQuart: function (a, b, c, d, e) {
                return -d * ((b = b / e - 1) * b * b * b - 1) + c
        },
        easeInOutQuart: function (a, b, c, d, e) {
                if ((b /= e / 2) < 1) return d / 2 * b * b * b * b + c;
                return -d / 2 * ((b -= 2) * b * b * b - 2) + c
        },
        easeInQuint: function (a, b, c, d, e) {
                return d * (b /= e) * b * b * b * b + c
        },
        easeOutQuint: function (a, b, c, d, e) {
                return d * ((b = b / e - 1) * b * b * b * b + 1) + c
        },
        easeInOutQuint: function (a, b, c, d, e) {
                if ((b /= e / 2) < 1) return d / 2 * b * b * b * b * b + c;
                return d / 2 * ((b -= 2) * b * b * b * b + 2) + c
        },
        easeInSine: function (a, b, c, d, e) {
                return -d * Math.cos(b / e * (Math.PI / 2)) + d + c
        },
        easeOutSine: function (a, b, c, d, e) {
                return d * Math.sin(b / e * (Math.PI / 2)) + c
        },
        easeInOutSine: function (a, b, c, d, e) {
                return -d / 2 * (Math.cos(Math.PI * b / e) - 1) + c
        },
        easeInExpo: function (a, b, c, d, e) {
                return b == 0 ? c : d * Math.pow(2, 10 * (b / e - 1)) + c
        },
        easeOutExpo: function (a, b, c, d, e) {
                return b == e ? c + d : d * (-Math.pow(2, -10 * b / e) + 1) + c
        },
        easeInOutExpo: function (a, b, c, d, e) {
                if (b == 0) return c;
                if (b == e) return c + d;
                if ((b /= e / 2) < 1) return d / 2 * Math.pow(2, 10 * (b - 1)) + c;
                return d / 2 * (-Math.pow(2, -10 * --b) + 2) + c
        },
        easeInCirc: function (a, b, c, d, e) {
                return -d * (Math.sqrt(1 - (b /= e) * b) - 1) + c
        },
        easeOutCirc: function (a, b, c, d, e) {
                return d * Math.sqrt(1 - (b = b / e - 1) * b) + c
        },
        easeInOutCirc: function (a, b, c, d, e) {
                if ((b /= e / 2) < 1) return -d / 2 * (Math.sqrt(1 - b * b) - 1) + c;
                return d / 2 * (Math.sqrt(1 - (b -= 2) * b) + 1) + c
        },
        easeInElastic: function (a, b, c, d, e) {
                var f = 1.70158;
                var g = 0;
                var h = d;
                if (b == 0) return c;
                if ((b /= e) == 1) return c + d;
                if (!g) g = e * .3;
                if (h < Math.abs(d)) {
                        h = d;
                        var f = g / 4
                } else var f = g / (2 * Math.PI) * Math.asin(d / h);
                return -(h * Math.pow(2, 10 * (b -= 1)) * Math.sin((b * e - f) * 2 * Math.PI / g)) + c
        },
        easeOutElastic: function (a, b, c, d, e) {
                var f = 1.70158;
                var g = 0;
                var h = d;
                if (b == 0) return c;
                if ((b /= e) == 1) return c + d;
                if (!g) g = e * .3;
                if (h < Math.abs(d)) {
                        h = d;
                        var f = g / 4
                } else var f = g / (2 * Math.PI) * Math.asin(d / h);
                return h * Math.pow(2, -10 * b) * Math.sin((b * e - f) * 2 * Math.PI / g) + d + c
        },
        easeInOutElastic: function (a, b, c, d, e) {
                var f = 1.70158;
                var g = 0;
                var h = d;
                if (b == 0) return c;
                if ((b /= e / 2) == 2) return c + d;
                if (!g) g = e * .3 * 1.5;
                if (h < Math.abs(d)) {
                        h = d;
                        var f = g / 4
                } else var f = g / (2 * Math.PI) * Math.asin(d / h);
                if (b < 1) return -.5 * h * Math.pow(2, 10 * (b -= 1)) * Math.sin((b * e - f) * 2 * Math.PI / g) + c;
                return h * Math.pow(2, -10 * (b -= 1)) * Math.sin((b * e - f) * 2 * Math.PI / g) * .5 + d + c
        },
        easeInBack: function (a, b, c, d, e, f) {
                if (f == undefined) f = 1.70158;
                return d * (b /= e) * b * ((f + 1) * b - f) + c
        },
        easeOutBack: function (a, b, c, d, e, f) {
                if (f == undefined) f = 1.70158;
                return d * ((b = b / e - 1) * b * ((f + 1) * b + f) + 1) + c
        },
        easeInOutBack: function (a, b, c, d, e, f) {
                if (f == undefined) f = 1.70158;
                if ((b /= e / 2) < 1) return d / 2 * b * b * (((f *= 1.525) + 1) * b - f) + c;
                return d / 2 * ((b -= 2) * b * (((f *= 1.525) + 1) * b + f) + 2) + c
        },
        easeInBounce: function (a, b, c, d, e) {
                return d - jQuery.easing.easeOutBounce(a, e - b, 0, d, e) + c
        },
        easeOutBounce: function (a, b, c, d, e) {
                if ((b /= e) < 1 / 2.75) {
                        return d * 7.5625 * b * b + c
                } else if (b < 2 / 2.75) {
                        return d * (7.5625 * (b -= 1.5 / 2.75) * b + .75) + c
                } else if (b < 2.5 / 2.75) {
                        return d * (7.5625 * (b -= 2.25 / 2.75) * b + .9375) + c
                } else {
                        return d * (7.5625 * (b -= 2.625 / 2.75) * b + .984375) + c
                }
        },
        easeInOutBounce: function (a, b, c, d, e) {
                if (b < e / 2) return jQuery.easing.easeInBounce(a, b * 2, 0, d, e) * .5 + c;
                return jQuery.easing.easeOutBounce(a, b * 2 - e, 0, d, e) * .5 + d * .5 + c
        }
});
// ==================================================
// fancyBox v3.5.7
//
// Licensed GPLv3 for open source use
// or fancyBox Commercial License for commercial use
//
// http://fancyapps.com/fancybox/
// Copyright 2019 fancyApps
//
// ==================================================
(function (window, document, $, undefined) {
	"use strict";

	window.console = window.console || {
	  info: function (stuff) {}
	};

	// If there's no jQuery, fancyBox can't work
	// =========================================

	if (!$) {
	  return;
	}

	// Check if fancyBox is already initialized
	// ========================================

	if ($.fn.fancybox) {
	  console.info("fancyBox already initialized");

	  return;
	}

	// Private default settings
	// ========================

	var defaults = {
	  // Close existing modals
	  // Set this to false if you do not need to stack multiple instances
	  closeExisting: false,

	  // Enable infinite gallery navigation
	  loop: false,

	  // Horizontal space between slides
	  gutter: 50,

	  // Enable keyboard navigation
	  keyboard: true,

	  // Should allow caption to overlap the content
	  preventCaptionOverlap: true,

	  // Should display navigation arrows at the screen edges
	  arrows: true,

	  // Should display counter at the top left corner
	  infobar: true,

	  // Should display close button (using `btnTpl.smallBtn` template) over the content
	  // Can be true, false, "auto"
	  // If "auto" - will be automatically enabled for "html", "inline" or "ajax" items
	  smallBtn: "auto",

	  // Should display toolbar (buttons at the top)
	  // Can be true, false, "auto"
	  // If "auto" - will be automatically hidden if "smallBtn" is enabled
	  toolbar: "auto",

	  // What buttons should appear in the top right corner.
	  // Buttons will be created using templates from `btnTpl` option
	  // and they will be placed into toolbar (class="fancybox-toolbar"` element)
	  buttons: [
		"zoom",
		//"share",
		"slideShow",
		//"fullScreen",
		//"download",
		"thumbs",
		"close"
	  ],

	  // Detect "idle" time in seconds
	  idleTime: 3,

	  // Disable right-click and use simple image protection for images
	  protect: false,

	  // Shortcut to make content "modal" - disable keyboard navigtion, hide buttons, etc
	  modal: false,

	  image: {
		// Wait for images to load before displaying
		//   true  - wait for image to load and then display;
		//   false - display thumbnail and load the full-sized image over top,
		//           requires predefined image dimensions (`data-width` and `data-height` attributes)
		preload: false
	  },

	  ajax: {
		// Object containing settings for ajax request
		settings: {
		  // This helps to indicate that request comes from the modal
		  // Feel free to change naming
		  data: {
			fancybox: true
		  }
		}
	  },

	  iframe: {
		// Iframe template
		tpl: '<iframe id="fancybox-frame{rnd}" name="fancybox-frame{rnd}" class="fancybox-iframe" allowfullscreen="allowfullscreen" allow="autoplay; fullscreen" src=""></iframe>',

		// Preload iframe before displaying it
		// This allows to calculate iframe content width and height
		// (note: Due to "Same Origin Policy", you can't get cross domain data).
		preload: true,

		// Custom CSS styling for iframe wrapping element
		// You can use this to set custom iframe dimensions
		css: {},

		// Iframe tag attributes
		attr: {
		  scrolling: "auto"
		}
	  },

	  // For HTML5 video only
	  video: {
		tpl: '<video class="fancybox-video" controls controlsList="nodownload" poster="{{poster}}">' +
		  '<source src="{{src}}" type="{{format}}" />' +
		  'Sorry, your browser doesn\'t support embedded videos, <a href="{{src}}">download</a> and watch with your favorite video player!' +
		  "</video>",
		format: "", // custom video format
		autoStart: true
	  },

	  // Default content type if cannot be detected automatically
	  defaultType: "image",

	  // Open/close animation type
	  // Possible values:
	  //   false            - disable
	  //   "zoom"           - zoom images from/to thumbnail
	  //   "fade"
	  //   "zoom-in-out"
	  //
	  animationEffect: "zoom",

	  // Duration in ms for open/close animation
	  animationDuration: 366,

	  // Should image change opacity while zooming
	  // If opacity is "auto", then opacity will be changed if image and thumbnail have different aspect ratios
	  zoomOpacity: "auto",

	  // Transition effect between slides
	  //
	  // Possible values:
	  //   false            - disable
	  //   "fade'
	  //   "slide'
	  //   "circular'
	  //   "tube'
	  //   "zoom-in-out'
	  //   "rotate'
	  //
	  transitionEffect: "fade",

	  // Duration in ms for transition animation
	  transitionDuration: 366,

	  // Custom CSS class for slide element
	  slideClass: "",

	  // Custom CSS class for layout
	  baseClass: "",

	  // Base template for layout
	  baseTpl: '<div class="fancybox-container" role="dialog" tabindex="-1">' +
		'<div class="fancybox-bg"></div>' +
		'<div class="fancybox-inner">' +
		'<div class="fancybox-infobar"><span data-fancybox-index></span>&nbsp;/&nbsp;<span data-fancybox-count></span></div>' +
		'<div class="fancybox-toolbar">{{buttons}}</div>' +
		'<div class="fancybox-navigation">{{arrows}}</div>' +
		'<div class="fancybox-stage"></div>' +
		'<div class="fancybox-caption"><div class="fancybox-caption__body"></div></div>' +
		"</div>" +
		"</div>",

	  // Loading indicator template
	  spinnerTpl: '<div class="fancybox-loading"></div>',

	  // Error message template
	  errorTpl: '<div class="fancybox-error"><p>{{ERROR}}</p></div>',

	  btnTpl: {
		download: '<a download data-fancybox-download class="fancybox-button fancybox-button--download" title="{{DOWNLOAD}}" href="javascript:;">' +
		  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M18.62 17.09V19H5.38v-1.91zm-2.97-6.96L17 11.45l-5 4.87-5-4.87 1.36-1.32 2.68 2.64V5h1.92v7.77z"/></svg>' +
		  "</a>",

		zoom: '<button data-fancybox-zoom class="fancybox-button fancybox-button--zoom" title="{{ZOOM}}">' +
		  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M18.7 17.3l-3-3a5.9 5.9 0 0 0-.6-7.6 5.9 5.9 0 0 0-8.4 0 5.9 5.9 0 0 0 0 8.4 5.9 5.9 0 0 0 7.7.7l3 3a1 1 0 0 0 1.3 0c.4-.5.4-1 0-1.5zM8.1 13.8a4 4 0 0 1 0-5.7 4 4 0 0 1 5.7 0 4 4 0 0 1 0 5.7 4 4 0 0 1-5.7 0z"/></svg>' +
		  "</button>",

		close: '<button data-fancybox-close class="fancybox-button fancybox-button--close" title="{{CLOSE}}">' +
		  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 10.6L6.6 5.2 5.2 6.6l5.4 5.4-5.4 5.4 1.4 1.4 5.4-5.4 5.4 5.4 1.4-1.4-5.4-5.4 5.4-5.4-1.4-1.4-5.4 5.4z"/></svg>' +
		  "</button>",

		// Arrows
		arrowLeft: '<button data-fancybox-prev class="fancybox-button fancybox-button--arrow_left" title="{{PREV}}">' +
		  '<div><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M11.28 15.7l-1.34 1.37L5 12l4.94-5.07 1.34 1.38-2.68 2.72H19v1.94H8.6z"/></svg></div>' +
		  "</button>",

		arrowRight: '<button data-fancybox-next class="fancybox-button fancybox-button--arrow_right" title="{{NEXT}}">' +
		  '<div><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M15.4 12.97l-2.68 2.72 1.34 1.38L19 12l-4.94-5.07-1.34 1.38 2.68 2.72H5v1.94z"/></svg></div>' +
		  "</button>",

		// This small close button will be appended to your html/inline/ajax content by default,
		// if "smallBtn" option is not set to false
		smallBtn: '<button type="button" data-fancybox-close class="fancybox-button fancybox-close-small" title="{{CLOSE}}">' +
		  '<svg xmlns="http://www.w3.org/2000/svg" version="1" viewBox="0 0 24 24"><path d="M13 12l5-5-1-1-5 5-5-5-1 1 5 5-5 5 1 1 5-5 5 5 1-1z"/></svg>' +
		  "</button>"
	  },

	  // Container is injected into this element
	  parentEl: "body",

	  // Hide browser vertical scrollbars; use at your own risk
	  hideScrollbar: true,

	  // Focus handling
	  // ==============

	  // Try to focus on the first focusable element after opening
	  autoFocus: true,

	  // Put focus back to active element after closing
	  backFocus: true,

	  // Do not let user to focus on element outside modal content
	  trapFocus: true,

	  // Module specific options
	  // =======================

	  fullScreen: {
		autoStart: false
	  },

	  // Set `touch: false` to disable panning/swiping
	  touch: {
		vertical: true, // Allow to drag content vertically
		momentum: true // Continue movement after releasing mouse/touch when panning
	  },

	  // Hash value when initializing manually,
	  // set `false` to disable hash change
	  hash: null,

	  // Customize or add new media types
	  // Example:
	  /*
		media : {
		  youtube : {
			params : {
			  autoplay : 0
			}
		  }
		}
	  */
	  media: {},

	  slideShow: {
		autoStart: false,
		speed: 3000
	  },

	  thumbs: {
		autoStart: false, // Display thumbnails on opening
		hideOnClose: true, // Hide thumbnail grid when closing animation starts
		parentEl: ".fancybox-container", // Container is injected into this element
		axis: "y" // Vertical (y) or horizontal (x) scrolling
	  },

	  // Use mousewheel to navigate gallery
	  // If 'auto' - enabled for images only
	  wheel: "auto",

	  // Callbacks
	  //==========

	  // See Documentation/API/Events for more information
	  // Example:
	  /*
		afterShow: function( instance, current ) {
		  console.info( 'Clicked element:' );
		  console.info( current.opts.$orig );
		}
	  */

	  onInit: $.noop, // When instance has been initialized

	  beforeLoad: $.noop, // Before the content of a slide is being loaded
	  afterLoad: $.noop, // When the content of a slide is done loading

	  beforeShow: $.noop, // Before open animation starts
	  afterShow: $.noop, // When content is done loading and animating

	  beforeClose: $.noop, // Before the instance attempts to close. Return false to cancel the close.
	  afterClose: $.noop, // After instance has been closed

	  onActivate: $.noop, // When instance is brought to front
	  onDeactivate: $.noop, // When other instance has been activated

	  // Interaction
	  // ===========

	  // Use options below to customize taken action when user clicks or double clicks on the fancyBox area,
	  // each option can be string or method that returns value.
	  //
	  // Possible values:
	  //   "close"           - close instance
	  //   "next"            - move to next gallery item
	  //   "nextOrClose"     - move to next gallery item or close if gallery has only one item
	  //   "toggleControls"  - show/hide controls
	  //   "zoom"            - zoom image (if loaded)
	  //   false             - do nothing

	  // Clicked on the content
	  clickContent: function (current, event) {
		return current.type === "image" ? "zoom" : false;
	  },

	  // Clicked on the slide
	  clickSlide: "close",

	  // Clicked on the background (backdrop) element;
	  // if you have not changed the layout, then most likely you need to use `clickSlide` option
	  clickOutside: "close",

	  // Same as previous two, but for double click
	  dblclickContent: false,
	  dblclickSlide: false,
	  dblclickOutside: false,

	  // Custom options when mobile device is detected
	  // =============================================

	  mobile: {
		preventCaptionOverlap: false,
		idleTime: false,
		clickContent: function (current, event) {
		  return current.type === "image" ? "toggleControls" : false;
		},
		clickSlide: function (current, event) {
		  return current.type === "image" ? "toggleControls" : "close";
		},
		dblclickContent: function (current, event) {
		  return current.type === "image" ? "zoom" : false;
		},
		dblclickSlide: function (current, event) {
		  return current.type === "image" ? "zoom" : false;
		}
	  },

	  // Internationalization
	  // ====================

	  lang: "en",
	  i18n: {
		en: {
		  CLOSE: "Close",
		  NEXT: "Next",
		  PREV: "Previous",
		  ERROR: "The requested content cannot be loaded. <br/> Please try again later.",
		  PLAY_START: "Start slideshow",
		  PLAY_STOP: "Pause slideshow",
		  FULL_SCREEN: "Full screen",
		  THUMBS: "Thumbnails",
		  DOWNLOAD: "Download",
		  SHARE: "Share",
		  ZOOM: "Zoom"
		},
		de: {
		  CLOSE: "Schlie&szlig;en",
		  NEXT: "Weiter",
		  PREV: "Zur&uuml;ck",
		  ERROR: "Die angeforderten Daten konnten nicht geladen werden. <br/> Bitte versuchen Sie es sp&auml;ter nochmal.",
		  PLAY_START: "Diaschau starten",
		  PLAY_STOP: "Diaschau beenden",
		  FULL_SCREEN: "Vollbild",
		  THUMBS: "Vorschaubilder",
		  DOWNLOAD: "Herunterladen",
		  SHARE: "Teilen",
		  ZOOM: "Vergr&ouml;&szlig;ern"
		}
	  }
	};

	// Few useful variables and methods
	// ================================

	var $W = $(window);
	var $D = $(document);

	var called = 0;

	// Check if an object is a jQuery object and not a native JavaScript object
	// ========================================================================
	var isQuery = function (obj) {
	  return obj && obj.hasOwnProperty && obj instanceof $;
	};

	// Handle multiple browsers for "requestAnimationFrame" and "cancelAnimationFrame"
	// ===============================================================================
	var requestAFrame = (function () {
	  return (
		window.requestAnimationFrame ||
		window.webkitRequestAnimationFrame ||
		window.mozRequestAnimationFrame ||
		window.oRequestAnimationFrame ||
		// if all else fails, use setTimeout
		function (callback) {
		  return window.setTimeout(callback, 1000 / 60);
		}
	  );
	})();

	var cancelAFrame = (function () {
	  return (
		window.cancelAnimationFrame ||
		window.webkitCancelAnimationFrame ||
		window.mozCancelAnimationFrame ||
		window.oCancelAnimationFrame ||
		function (id) {
		  window.clearTimeout(id);
		}
	  );
	})();

	// Detect the supported transition-end event property name
	// =======================================================
	var transitionEnd = (function () {
	  var el = document.createElement("fakeelement"),
		t;

	  var transitions = {
		transition: "transitionend",
		OTransition: "oTransitionEnd",
		MozTransition: "transitionend",
		WebkitTransition: "webkitTransitionEnd"
	  };

	  for (t in transitions) {
		if (el.style[t] !== undefined) {
		  return transitions[t];
		}
	  }

	  return "transitionend";
	})();

	// Force redraw on an element.
	// This helps in cases where the browser doesn't redraw an updated element properly
	// ================================================================================
	var forceRedraw = function ($el) {
	  return $el && $el.length && $el[0].offsetHeight;
	};

	// Exclude array (`buttons`) options from deep merging
	// ===================================================
	var mergeOpts = function (opts1, opts2) {
	  var rez = $.extend(true, {}, opts1, opts2);

	  $.each(opts2, function (key, value) {
		if ($.isArray(value)) {
		  rez[key] = value;
		}
	  });

	  return rez;
	};

	// How much of an element is visible in viewport
	// =============================================

	var inViewport = function (elem) {
	  var elemCenter, rez;

	  if (!elem || elem.ownerDocument !== document) {
		return false;
	  }

	  $(".fancybox-container").css("pointer-events", "none");

	  elemCenter = {
		x: elem.getBoundingClientRect().left + elem.offsetWidth / 2,
		y: elem.getBoundingClientRect().top + elem.offsetHeight / 2
	  };

	  rez = document.elementFromPoint(elemCenter.x, elemCenter.y) === elem;

	  $(".fancybox-container").css("pointer-events", "");

	  return rez;
	};

	// Class definition
	// ================

	var FancyBox = function (content, opts, index) {
	  var self = this;

	  self.opts = mergeOpts({
		index: index
	  }, $.fancybox.defaults);

	  if ($.isPlainObject(opts)) {
		self.opts = mergeOpts(self.opts, opts);
	  }

	  if ($.fancybox.isMobile) {
		self.opts = mergeOpts(self.opts, self.opts.mobile);
	  }

	  self.id = self.opts.id || ++called;

	  self.currIndex = parseInt(self.opts.index, 10) || 0;
	  self.prevIndex = null;

	  self.prevPos = null;
	  self.currPos = 0;

	  self.firstRun = true;

	  // All group items
	  self.group = [];

	  // Existing slides (for current, next and previous gallery items)
	  self.slides = {};

	  // Create group elements
	  self.addContent(content);

	  if (!self.group.length) {
		return;
	  }

	  self.init();
	};

	$.extend(FancyBox.prototype, {
	  // Create DOM structure
	  // ====================

	  init: function () {
		var self = this,
		  firstItem = self.group[self.currIndex],
		  firstItemOpts = firstItem.opts,
		  $container,
		  buttonStr;

		if (firstItemOpts.closeExisting) {
		  $.fancybox.close(true);
		}

		// Hide scrollbars
		// ===============

		$("body").addClass("fancybox-active");

		if (
		  !$.fancybox.getInstance() &&
		  firstItemOpts.hideScrollbar !== false &&
		  !$.fancybox.isMobile &&
		  document.body.scrollHeight > window.innerHeight
		) {
		  $("head").append(
			'<style id="fancybox-style-noscroll" type="text/css">.compensate-for-scrollbar{margin-right:' +
			(window.innerWidth - document.documentElement.clientWidth) +
			"px;}</style>"
		  );

		  $("body").addClass("compensate-for-scrollbar");
		}

		// Build html markup and set references
		// ====================================

		// Build html code for buttons and insert into main template
		buttonStr = "";

		$.each(firstItemOpts.buttons, function (index, value) {
		  buttonStr += firstItemOpts.btnTpl[value] || "";
		});

		// Create markup from base template, it will be initially hidden to
		// avoid unnecessary work like painting while initializing is not complete
		$container = $(
			self.translate(
			  self,
			  firstItemOpts.baseTpl
			  .replace("{{buttons}}", buttonStr)
			  .replace("{{arrows}}", firstItemOpts.btnTpl.arrowLeft + firstItemOpts.btnTpl.arrowRight)
			)
		  )
		  .attr("id", "fancybox-container-" + self.id)
		  .addClass(firstItemOpts.baseClass)
		  .data("FancyBox", self)
		  .appendTo(firstItemOpts.parentEl);

		// Create object holding references to jQuery wrapped nodes
		self.$refs = {
		  container: $container
		};

		["bg", "inner", "infobar", "toolbar", "stage", "caption", "navigation"].forEach(function (item) {
		  self.$refs[item] = $container.find(".fancybox-" + item);
		});

		self.trigger("onInit");

		// Enable events, deactive previous instances
		self.activate();

		// Build slides, load and reveal content
		self.jumpTo(self.currIndex);
	  },

	  // Simple i18n support - replaces object keys found in template
	  // with corresponding values
	  // ============================================================

	  translate: function (obj, str) {
		var arr = obj.opts.i18n[obj.opts.lang] || obj.opts.i18n.en;

		return str.replace(/\{\{(\w+)\}\}/g, function (match, n) {
		  return arr[n] === undefined ? match : arr[n];
		});
	  },

	  // Populate current group with fresh content
	  // Check if each object has valid type and content
	  // ===============================================

	  addContent: function (content) {
		var self = this,
		  items = $.makeArray(content),
		  thumbs;

		$.each(items, function (i, item) {
		  var obj = {},
			opts = {},
			$item,
			type,
			found,
			src,
			srcParts;

		  // Step 1 - Make sure we have an object
		  // ====================================

		  if ($.isPlainObject(item)) {
			// We probably have manual usage here, something like
			// $.fancybox.open( [ { src : "image.jpg", type : "image" } ] )

			obj = item;
			opts = item.opts || item;
		  } else if ($.type(item) === "object" && $(item).length) {
			// Here we probably have jQuery collection returned by some selector
			$item = $(item);

			// Support attributes like `data-options='{"touch" : false}'` and `data-touch='false'`
			opts = $item.data() || {};
			opts = $.extend(true, {}, opts, opts.options);

			// Here we store clicked element
			opts.$orig = $item;

			obj.src = self.opts.src || opts.src || $item.attr("href");

			// Assume that simple syntax is used, for example:
			//   `$.fancybox.open( $("#test"), {} );`
			if (!obj.type && !obj.src) {
			  obj.type = "inline";
			  obj.src = item;
			}
		  } else {
			// Assume we have a simple html code, for example:
			//   $.fancybox.open( '<div><h1>Hi!</h1></div>' );
			obj = {
			  type: "html",
			  src: item + ""
			};
		  }

		  // Each gallery object has full collection of options
		  obj.opts = $.extend(true, {}, self.opts, opts);

		  // Do not merge buttons array
		  if ($.isArray(opts.buttons)) {
			obj.opts.buttons = opts.buttons;
		  }

		  if ($.fancybox.isMobile && obj.opts.mobile) {
			obj.opts = mergeOpts(obj.opts, obj.opts.mobile);
		  }

		  // Step 2 - Make sure we have content type, if not - try to guess
		  // ==============================================================

		  type = obj.type || obj.opts.type;
		  src = obj.src || "";

		  if (!type && src) {
			if ((found = src.match(/\.(mp4|mov|ogv|webm)((\?|#).*)?$/i))) {
			  type = "video";

			  if (!obj.opts.video.format) {
				obj.opts.video.format = "video/" + (found[1] === "ogv" ? "ogg" : found[1]);
			  }
			} else if (src.match(/(^data:image\/[a-z0-9+\/=]*,)|(\.(jp(e|g|eg)|gif|png|bmp|webp|svg|ico)((\?|#).*)?$)/i)) {
			  type = "image";
			} else if (src.match(/\.(pdf)((\?|#).*)?$/i)) {
			  type = "iframe";
			  obj = $.extend(true, obj, {
				contentType: "pdf",
				opts: {
				  iframe: {
					preload: false
				  }
				}
			  });
			} else if (src.charAt(0) === "#") {
			  type = "inline";
			}
		  }

		  if (type) {
			obj.type = type;
		  } else {
			self.trigger("objectNeedsType", obj);
		  }

		  if (!obj.contentType) {
			obj.contentType = $.inArray(obj.type, ["html", "inline", "ajax"]) > -1 ? "html" : obj.type;
		  }

		  // Step 3 - Some adjustments
		  // =========================

		  obj.index = self.group.length;

		  if (obj.opts.smallBtn == "auto") {
			obj.opts.smallBtn = $.inArray(obj.type, ["html", "inline", "ajax"]) > -1;
		  }

		  if (obj.opts.toolbar === "auto") {
			obj.opts.toolbar = !obj.opts.smallBtn;
		  }

		  // Find thumbnail image, check if exists and if is in the viewport
		  obj.$thumb = obj.opts.$thumb || null;

		  if (obj.opts.$trigger && obj.index === self.opts.index) {
			obj.$thumb = obj.opts.$trigger.find("img:first");

			if (obj.$thumb.length) {
			  obj.opts.$orig = obj.opts.$trigger;
			}
		  }

		  if (!(obj.$thumb && obj.$thumb.length) && obj.opts.$orig) {
			obj.$thumb = obj.opts.$orig.find("img:first");
		  }

		  if (obj.$thumb && !obj.$thumb.length) {
			obj.$thumb = null;
		  }

		  obj.thumb = obj.opts.thumb || (obj.$thumb ? obj.$thumb[0].src : null);

		  // "caption" is a "special" option, it can be used to customize caption per gallery item
		  if ($.type(obj.opts.caption) === "function") {
			obj.opts.caption = obj.opts.caption.apply(item, [self, obj]);
		  }

		  if ($.type(self.opts.caption) === "function") {
			obj.opts.caption = self.opts.caption.apply(item, [self, obj]);
		  }

		  // Make sure we have caption as a string or jQuery object
		  if (!(obj.opts.caption instanceof $)) {
			obj.opts.caption = obj.opts.caption === undefined ? "" : obj.opts.caption + "";
		  }

		  // Check if url contains "filter" used to filter the content
		  // Example: "ajax.html #something"
		  if (obj.type === "ajax") {
			srcParts = src.split(/\s+/, 2);

			if (srcParts.length > 1) {
			  obj.src = srcParts.shift();

			  obj.opts.filter = srcParts.shift();
			}
		  }

		  // Hide all buttons and disable interactivity for modal items
		  if (obj.opts.modal) {
			obj.opts = $.extend(true, obj.opts, {
			  trapFocus: true,
			  // Remove buttons
			  infobar: 0,
			  toolbar: 0,

			  smallBtn: 0,

			  // Disable keyboard navigation
			  keyboard: 0,

			  // Disable some modules
			  slideShow: 0,
			  fullScreen: 0,
			  thumbs: 0,
			  touch: 0,

			  // Disable click event handlers
			  clickContent: false,
			  clickSlide: false,
			  clickOutside: false,
			  dblclickContent: false,
			  dblclickSlide: false,
			  dblclickOutside: false
			});
		  }

		  // Step 4 - Add processed object to group
		  // ======================================

		  self.group.push(obj);
		});

		// Update controls if gallery is already opened
		if (Object.keys(self.slides).length) {
		  self.updateControls();

		  // Update thumbnails, if needed
		  thumbs = self.Thumbs;

		  if (thumbs && thumbs.isActive) {
			thumbs.create();

			thumbs.focus();
		  }
		}
	  },

	  // Attach an event handler functions for:
	  //   - navigation buttons
	  //   - browser scrolling, resizing;
	  //   - focusing
	  //   - keyboard
	  //   - detecting inactivity
	  // ======================================

	  addEvents: function () {
		var self = this;

		self.removeEvents();

		// Make navigation elements clickable
		// ==================================

		self.$refs.container
		  .on("click.fb-close", "[data-fancybox-close]", function (e) {
			e.stopPropagation();
			e.preventDefault();

			self.close(e);
		  })
		  .on("touchstart.fb-prev click.fb-prev", "[data-fancybox-prev]", function (e) {
			e.stopPropagation();
			e.preventDefault();

			self.previous();
		  })
		  .on("touchstart.fb-next click.fb-next", "[data-fancybox-next]", function (e) {
			e.stopPropagation();
			e.preventDefault();

			self.next();
		  })
		  .on("click.fb", "[data-fancybox-zoom]", function (e) {
			// Click handler for zoom button
			self[self.isScaledDown() ? "scaleToActual" : "scaleToFit"]();
		  });

		// Handle page scrolling and browser resizing
		// ==========================================

		$W.on("orientationchange.fb resize.fb", function (e) {
		  if (e && e.originalEvent && e.originalEvent.type === "resize") {
			if (self.requestId) {
			  cancelAFrame(self.requestId);
			}

			self.requestId = requestAFrame(function () {
			  self.update(e);
			});
		  } else {
			if (self.current && self.current.type === "iframe") {
			  self.$refs.stage.hide();
			}

			setTimeout(
			  function () {
				self.$refs.stage.show();

				self.update(e);
			  },
			  $.fancybox.isMobile ? 600 : 250
			);
		  }
		});

		$D.on("keydown.fb", function (e) {
		  var instance = $.fancybox ? $.fancybox.getInstance() : null,
			current = instance.current,
			keycode = e.keyCode || e.which;

		  // Trap keyboard focus inside of the modal
		  // =======================================

		  if (keycode == 9) {
			if (current.opts.trapFocus) {
			  self.focus(e);
			}

			return;
		  }

		  // Enable keyboard navigation
		  // ==========================

		  if (!current.opts.keyboard || e.ctrlKey || e.altKey || e.shiftKey || $(e.target).is("input,textarea,video,audio,select")) {
			return;
		  }

		  // Backspace and Esc keys
		  if (keycode === 8 || keycode === 27) {
			e.preventDefault();

			self.close(e);

			return;
		  }

		  // Left arrow and Up arrow
		  if (keycode === 37 || keycode === 38) {
			e.preventDefault();

			self.previous();

			return;
		  }

		  // Righ arrow and Down arrow
		  if (keycode === 39 || keycode === 40) {
			e.preventDefault();

			self.next();

			return;
		  }

		  self.trigger("afterKeydown", e, keycode);
		});

		// Hide controls after some inactivity period
		if (self.group[self.currIndex].opts.idleTime) {
		  self.idleSecondsCounter = 0;

		  $D.on(
			"mousemove.fb-idle mouseleave.fb-idle mousedown.fb-idle touchstart.fb-idle touchmove.fb-idle scroll.fb-idle keydown.fb-idle",
			function (e) {
			  self.idleSecondsCounter = 0;

			  if (self.isIdle) {
				self.showControls();
			  }

			  self.isIdle = false;
			}
		  );

		  self.idleInterval = window.setInterval(function () {
			self.idleSecondsCounter++;

			if (self.idleSecondsCounter >= self.group[self.currIndex].opts.idleTime && !self.isDragging) {
			  self.isIdle = true;
			  self.idleSecondsCounter = 0;

			  self.hideControls();
			}
		  }, 1000);
		}
	  },

	  // Remove events added by the core
	  // ===============================

	  removeEvents: function () {
		var self = this;

		$W.off("orientationchange.fb resize.fb");
		$D.off("keydown.fb .fb-idle");

		this.$refs.container.off(".fb-close .fb-prev .fb-next");

		if (self.idleInterval) {
		  window.clearInterval(self.idleInterval);

		  self.idleInterval = null;
		}
	  },

	  // Change to previous gallery item
	  // ===============================

	  previous: function (duration) {
		return this.jumpTo(this.currPos - 1, duration);
	  },

	  // Change to next gallery item
	  // ===========================

	  next: function (duration) {
		return this.jumpTo(this.currPos + 1, duration);
	  },

	  // Switch to selected gallery item
	  // ===============================

	  jumpTo: function (pos, duration) {
		var self = this,
		  groupLen = self.group.length,
		  firstRun,
		  isMoved,
		  loop,
		  current,
		  previous,
		  slidePos,
		  stagePos,
		  prop,
		  diff;

		if (self.isDragging || self.isClosing || (self.isAnimating && self.firstRun)) {
		  return;
		}

		// Should loop?
		pos = parseInt(pos, 10);
		loop = self.current ? self.current.opts.loop : self.opts.loop;

		if (!loop && (pos < 0 || pos >= groupLen)) {
		  return false;
		}

		// Check if opening for the first time; this helps to speed things up
		firstRun = self.firstRun = !Object.keys(self.slides).length;

		// Create slides
		previous = self.current;

		self.prevIndex = self.currIndex;
		self.prevPos = self.currPos;

		current = self.createSlide(pos);

		if (groupLen > 1) {
		  if (loop || current.index < groupLen - 1) {
			self.createSlide(pos + 1);
		  }

		  if (loop || current.index > 0) {
			self.createSlide(pos - 1);
		  }
		}

		self.current = current;
		self.currIndex = current.index;
		self.currPos = current.pos;

		self.trigger("beforeShow", firstRun);

		self.updateControls();

		// Validate duration length
		current.forcedDuration = undefined;

		if ($.isNumeric(duration)) {
		  current.forcedDuration = duration;
		} else {
		  duration = current.opts[firstRun ? "animationDuration" : "transitionDuration"];
		}

		duration = parseInt(duration, 10);

		// Check if user has swiped the slides or if still animating
		isMoved = self.isMoved(current);

		// Make sure current slide is visible
		current.$slide.addClass("fancybox-slide--current");

		// Fresh start - reveal container, current slide and start loading content
		if (firstRun) {
		  if (current.opts.animationEffect && duration) {
			self.$refs.container.css("transition-duration", duration + "ms");
		  }

		  self.$refs.container.addClass("fancybox-is-open").trigger("focus");

		  // Attempt to load content into slide
		  // This will later call `afterLoad` -> `revealContent`
		  self.loadSlide(current);

		  self.preload("image");

		  return;
		}

		// Get actual slide/stage positions (before cleaning up)
		slidePos = $.fancybox.getTranslate(previous.$slide);
		stagePos = $.fancybox.getTranslate(self.$refs.stage);

		// Clean up all slides
		$.each(self.slides, function (index, slide) {
		  $.fancybox.stop(slide.$slide, true);
		});

		if (previous.pos !== current.pos) {
		  previous.isComplete = false;
		}

		previous.$slide.removeClass("fancybox-slide--complete fancybox-slide--current");

		// If slides are out of place, then animate them to correct position
		if (isMoved) {
		  // Calculate horizontal swipe distance
		  diff = slidePos.left - (previous.pos * slidePos.width + previous.pos * previous.opts.gutter);

		  $.each(self.slides, function (index, slide) {
			slide.$slide.removeClass("fancybox-animated").removeClass(function (index, className) {
			  return (className.match(/(^|\s)fancybox-fx-\S+/g) || []).join(" ");
			});

			// Make sure that each slide is in equal distance
			// This is mostly needed for freshly added slides, because they are not yet positioned
			var leftPos = slide.pos * slidePos.width + slide.pos * slide.opts.gutter;

			$.fancybox.setTranslate(slide.$slide, {
			  top: 0,
			  left: leftPos - stagePos.left + diff
			});

			if (slide.pos !== current.pos) {
			  slide.$slide.addClass("fancybox-slide--" + (slide.pos > current.pos ? "next" : "previous"));
			}

			// Redraw to make sure that transition will start
			forceRedraw(slide.$slide);

			// Animate the slide
			$.fancybox.animate(
			  slide.$slide, {
				top: 0,
				left: (slide.pos - current.pos) * slidePos.width + (slide.pos - current.pos) * slide.opts.gutter
			  },
			  duration,
			  function () {
				slide.$slide
				  .css({
					transform: "",
					opacity: ""
				  })
				  .removeClass("fancybox-slide--next fancybox-slide--previous");

				if (slide.pos === self.currPos) {
				  self.complete();
				}
			  }
			);
		  });
		} else if (duration && current.opts.transitionEffect) {
		  // Set transition effect for previously active slide
		  prop = "fancybox-animated fancybox-fx-" + current.opts.transitionEffect;

		  previous.$slide.addClass("fancybox-slide--" + (previous.pos > current.pos ? "next" : "previous"));

		  $.fancybox.animate(
			previous.$slide,
			prop,
			duration,
			function () {
			  previous.$slide.removeClass(prop).removeClass("fancybox-slide--next fancybox-slide--previous");
			},
			false
		  );
		}

		if (current.isLoaded) {
		  self.revealContent(current);
		} else {
		  self.loadSlide(current);
		}

		self.preload("image");
	  },

	  // Create new "slide" element
	  // These are gallery items  that are actually added to DOM
	  // =======================================================

	  createSlide: function (pos) {
		var self = this,
		  $slide,
		  index;

		index = pos % self.group.length;
		index = index < 0 ? self.group.length + index : index;

		if (!self.slides[pos] && self.group[index]) {
		  $slide = $('<div class="fancybox-slide"></div>').appendTo(self.$refs.stage);

		  self.slides[pos] = $.extend(true, {}, self.group[index], {
			pos: pos,
			$slide: $slide,
			isLoaded: false
		  });

		  self.updateSlide(self.slides[pos]);
		}

		return self.slides[pos];
	  },

	  // Scale image to the actual size of the image;
	  // x and y values should be relative to the slide
	  // ==============================================

	  scaleToActual: function (x, y, duration) {
		var self = this,
		  current = self.current,
		  $content = current.$content,
		  canvasWidth = $.fancybox.getTranslate(current.$slide).width,
		  canvasHeight = $.fancybox.getTranslate(current.$slide).height,
		  newImgWidth = current.width,
		  newImgHeight = current.height,
		  imgPos,
		  posX,
		  posY,
		  scaleX,
		  scaleY;

		if (self.isAnimating || self.isMoved() || !$content || !(current.type == "image" && current.isLoaded && !current.hasError)) {
		  return;
		}

		self.isAnimating = true;

		$.fancybox.stop($content);

		x = x === undefined ? canvasWidth * 0.5 : x;
		y = y === undefined ? canvasHeight * 0.5 : y;

		imgPos = $.fancybox.getTranslate($content);

		imgPos.top -= $.fancybox.getTranslate(current.$slide).top;
		imgPos.left -= $.fancybox.getTranslate(current.$slide).left;

		scaleX = newImgWidth / imgPos.width;
		scaleY = newImgHeight / imgPos.height;

		// Get center position for original image
		posX = canvasWidth * 0.5 - newImgWidth * 0.5;
		posY = canvasHeight * 0.5 - newImgHeight * 0.5;

		// Make sure image does not move away from edges
		if (newImgWidth > canvasWidth) {
		  posX = imgPos.left * scaleX - (x * scaleX - x);

		  if (posX > 0) {
			posX = 0;
		  }

		  if (posX < canvasWidth - newImgWidth) {
			posX = canvasWidth - newImgWidth;
		  }
		}

		if (newImgHeight > canvasHeight) {
		  posY = imgPos.top * scaleY - (y * scaleY - y);

		  if (posY > 0) {
			posY = 0;
		  }

		  if (posY < canvasHeight - newImgHeight) {
			posY = canvasHeight - newImgHeight;
		  }
		}

		self.updateCursor(newImgWidth, newImgHeight);

		$.fancybox.animate(
		  $content, {
			top: posY,
			left: posX,
			scaleX: scaleX,
			scaleY: scaleY
		  },
		  duration || 366,
		  function () {
			self.isAnimating = false;
		  }
		);

		// Stop slideshow
		if (self.SlideShow && self.SlideShow.isActive) {
		  self.SlideShow.stop();
		}
	  },

	  // Scale image to fit inside parent element
	  // ========================================

	  scaleToFit: function (duration) {
		var self = this,
		  current = self.current,
		  $content = current.$content,
		  end;

		if (self.isAnimating || self.isMoved() || !$content || !(current.type == "image" && current.isLoaded && !current.hasError)) {
		  return;
		}

		self.isAnimating = true;

		$.fancybox.stop($content);

		end = self.getFitPos(current);

		self.updateCursor(end.width, end.height);

		$.fancybox.animate(
		  $content, {
			top: end.top,
			left: end.left,
			scaleX: end.width / $content.width(),
			scaleY: end.height / $content.height()
		  },
		  duration || 366,
		  function () {
			self.isAnimating = false;
		  }
		);
	  },

	  // Calculate image size to fit inside viewport
	  // ===========================================

	  getFitPos: function (slide) {
		var self = this,
		  $content = slide.$content,
		  $slide = slide.$slide,
		  width = slide.width || slide.opts.width,
		  height = slide.height || slide.opts.height,
		  maxWidth,
		  maxHeight,
		  minRatio,
		  aspectRatio,
		  rez = {};

		if (!slide.isLoaded || !$content || !$content.length) {
		  return false;
		}

		maxWidth = $.fancybox.getTranslate(self.$refs.stage).width;
		maxHeight = $.fancybox.getTranslate(self.$refs.stage).height;

		maxWidth -=
		  parseFloat($slide.css("paddingLeft")) +
		  parseFloat($slide.css("paddingRight")) +
		  parseFloat($content.css("marginLeft")) +
		  parseFloat($content.css("marginRight"));

		maxHeight -=
		  parseFloat($slide.css("paddingTop")) +
		  parseFloat($slide.css("paddingBottom")) +
		  parseFloat($content.css("marginTop")) +
		  parseFloat($content.css("marginBottom"));

		if (!width || !height) {
		  width = maxWidth;
		  height = maxHeight;
		}

		minRatio = Math.min(1, maxWidth / width, maxHeight / height);

		width = minRatio * width;
		height = minRatio * height;

		// Adjust width/height to precisely fit into container
		if (width > maxWidth - 0.5) {
		  width = maxWidth;
		}

		if (height > maxHeight - 0.5) {
		  height = maxHeight;
		}

		if (slide.type === "image") {
		  rez.top = Math.floor((maxHeight - height) * 0.5) + parseFloat($slide.css("paddingTop"));
		  rez.left = Math.floor((maxWidth - width) * 0.5) + parseFloat($slide.css("paddingLeft"));
		} else if (slide.contentType === "video") {
		  // Force aspect ratio for the video
		  // "I say the whole world must learn of our peaceful ways… by force!"
		  aspectRatio = slide.opts.width && slide.opts.height ? width / height : slide.opts.ratio || 16 / 9;

		  if (height > width / aspectRatio) {
			height = width / aspectRatio;
		  } else if (width > height * aspectRatio) {
			width = height * aspectRatio;
		  }
		}

		rez.width = width;
		rez.height = height;

		return rez;
	  },

	  // Update content size and position for all slides
	  // ==============================================

	  update: function (e) {
		var self = this;

		$.each(self.slides, function (key, slide) {
		  self.updateSlide(slide, e);
		});
	  },

	  // Update slide content position and size
	  // ======================================

	  updateSlide: function (slide, e) {
		var self = this,
		  $content = slide && slide.$content,
		  width = slide.width || slide.opts.width,
		  height = slide.height || slide.opts.height,
		  $slide = slide.$slide;

		// First, prevent caption overlap, if needed
		self.adjustCaption(slide);

		// Then resize content to fit inside the slide
		if ($content && (width || height || slide.contentType === "video") && !slide.hasError) {
		  $.fancybox.stop($content);

		  $.fancybox.setTranslate($content, self.getFitPos(slide));

		  if (slide.pos === self.currPos) {
			self.isAnimating = false;

			self.updateCursor();
		  }
		}

		// Then some adjustments
		self.adjustLayout(slide);

		if ($slide.length) {
		  $slide.trigger("refresh");

		  if (slide.pos === self.currPos) {
			self.$refs.toolbar
			  .add(self.$refs.navigation.find(".fancybox-button--arrow_right"))
			  .toggleClass("compensate-for-scrollbar", $slide.get(0).scrollHeight > $slide.get(0).clientHeight);
		  }
		}

		self.trigger("onUpdate", slide, e);
	  },

	  // Horizontally center slide
	  // =========================

	  centerSlide: function (duration) {
		var self = this,
		  current = self.current,
		  $slide = current.$slide;

		if (self.isClosing || !current) {
		  return;
		}

		$slide.siblings().css({
		  transform: "",
		  opacity: ""
		});

		$slide
		  .parent()
		  .children()
		  .removeClass("fancybox-slide--previous fancybox-slide--next");

		$.fancybox.animate(
		  $slide, {
			top: 0,
			left: 0,
			opacity: 1
		  },
		  duration === undefined ? 0 : duration,
		  function () {
			// Clean up
			$slide.css({
			  transform: "",
			  opacity: ""
			});

			if (!current.isComplete) {
			  self.complete();
			}
		  },
		  false
		);
	  },

	  // Check if current slide is moved (swiped)
	  // ========================================

	  isMoved: function (slide) {
		var current = slide || this.current,
		  slidePos,
		  stagePos;

		if (!current) {
		  return false;
		}

		stagePos = $.fancybox.getTranslate(this.$refs.stage);
		slidePos = $.fancybox.getTranslate(current.$slide);

		return (
		  !current.$slide.hasClass("fancybox-animated") &&
		  (Math.abs(slidePos.top - stagePos.top) > 0.5 || Math.abs(slidePos.left - stagePos.left) > 0.5)
		);
	  },

	  // Update cursor style depending if content can be zoomed
	  // ======================================================

	  updateCursor: function (nextWidth, nextHeight) {
		var self = this,
		  current = self.current,
		  $container = self.$refs.container,
		  canPan,
		  isZoomable;

		if (!current || self.isClosing || !self.Guestures) {
		  return;
		}

		$container.removeClass("fancybox-is-zoomable fancybox-can-zoomIn fancybox-can-zoomOut fancybox-can-swipe fancybox-can-pan");

		canPan = self.canPan(nextWidth, nextHeight);

		isZoomable = canPan ? true : self.isZoomable();

		$container.toggleClass("fancybox-is-zoomable", isZoomable);

		$("[data-fancybox-zoom]").prop("disabled", !isZoomable);

		if (canPan) {
		  $container.addClass("fancybox-can-pan");
		} else if (
		  isZoomable &&
		  (current.opts.clickContent === "zoom" || ($.isFunction(current.opts.clickContent) && current.opts.clickContent(current) == "zoom"))
		) {
		  $container.addClass("fancybox-can-zoomIn");
		} else if (current.opts.touch && (current.opts.touch.vertical || self.group.length > 1) && current.contentType !== "video") {
		  $container.addClass("fancybox-can-swipe");
		}
	  },

	  // Check if current slide is zoomable
	  // ==================================

	  isZoomable: function () {
		var self = this,
		  current = self.current,
		  fitPos;

		// Assume that slide is zoomable if:
		//   - image is still loading
		//   - actual size of the image is smaller than available area
		if (current && !self.isClosing && current.type === "image" && !current.hasError) {
		  if (!current.isLoaded) {
			return true;
		  }

		  fitPos = self.getFitPos(current);

		  if (fitPos && (current.width > fitPos.width || current.height > fitPos.height)) {
			return true;
		  }
		}

		return false;
	  },

	  // Check if current image dimensions are smaller than actual
	  // =========================================================

	  isScaledDown: function (nextWidth, nextHeight) {
		var self = this,
		  rez = false,
		  current = self.current,
		  $content = current.$content;

		if (nextWidth !== undefined && nextHeight !== undefined) {
		  rez = nextWidth < current.width && nextHeight < current.height;
		} else if ($content) {
		  rez = $.fancybox.getTranslate($content);
		  rez = rez.width < current.width && rez.height < current.height;
		}

		return rez;
	  },

	  // Check if image dimensions exceed parent element
	  // ===============================================

	  canPan: function (nextWidth, nextHeight) {
		var self = this,
		  current = self.current,
		  pos = null,
		  rez = false;

		if (current.type === "image" && (current.isComplete || (nextWidth && nextHeight)) && !current.hasError) {
		  rez = self.getFitPos(current);

		  if (nextWidth !== undefined && nextHeight !== undefined) {
			pos = {
			  width: nextWidth,
			  height: nextHeight
			};
		  } else if (current.isComplete) {
			pos = $.fancybox.getTranslate(current.$content);
		  }

		  if (pos && rez) {
			rez = Math.abs(pos.width - rez.width) > 1.5 || Math.abs(pos.height - rez.height) > 1.5;
		  }
		}

		return rez;
	  },

	  // Load content into the slide
	  // ===========================

	  loadSlide: function (slide) {
		var self = this,
		  type,
		  $slide,
		  ajaxLoad;

		if (slide.isLoading || slide.isLoaded) {
		  return;
		}

		slide.isLoading = true;

		if (self.trigger("beforeLoad", slide) === false) {
		  slide.isLoading = false;

		  return false;
		}

		type = slide.type;
		$slide = slide.$slide;

		$slide
		  .off("refresh")
		  .trigger("onReset")
		  .addClass(slide.opts.slideClass);

		// Create content depending on the type
		switch (type) {
		  case "image":
			self.setImage(slide);

			break;

		  case "iframe":
			self.setIframe(slide);

			break;

		  case "html":
			self.setContent(slide, slide.src || slide.content);

			break;

		  case "video":
			self.setContent(
			  slide,
			  slide.opts.video.tpl
			  .replace(/\{\{src\}\}/gi, slide.src)
			  .replace("{{format}}", slide.opts.videoFormat || slide.opts.video.format || "")
			  .replace("{{poster}}", slide.thumb || "")
			);

			break;

		  case "inline":
			if ($(slide.src).length) {
			  self.setContent(slide, $(slide.src));
			} else {
			  self.setError(slide);
			}

			break;

		  case "ajax":
			self.showLoading(slide);

			ajaxLoad = $.ajax(
			  $.extend({}, slide.opts.ajax.settings, {
				url: slide.src,
				success: function (data, textStatus) {
				  if (textStatus === "success") {
					self.setContent(slide, data);
				  }
				},
				error: function (jqXHR, textStatus) {
				  if (jqXHR && textStatus !== "abort") {
					self.setError(slide);
				  }
				}
			  })
			);

			$slide.one("onReset", function () {
			  ajaxLoad.abort();
			});

			break;

		  default:
			self.setError(slide);

			break;
		}

		return true;
	  },

	  // Use thumbnail image, if possible
	  // ================================

	  setImage: function (slide) {
		var self = this,
		  ghost;

		// Check if need to show loading icon
		setTimeout(function () {
		  var $img = slide.$image;

		  if (!self.isClosing && slide.isLoading && (!$img || !$img.length || !$img[0].complete) && !slide.hasError) {
			self.showLoading(slide);
		  }
		}, 50);

		//Check if image has srcset
		self.checkSrcset(slide);

		// This will be wrapper containing both ghost and actual image
		slide.$content = $('<div class="fancybox-content"></div>')
		  .addClass("fancybox-is-hidden")
		  .appendTo(slide.$slide.addClass("fancybox-slide--image"));

		// If we have a thumbnail, we can display it while actual image is loading
		// Users will not stare at black screen and actual image will appear gradually
		if (slide.opts.preload !== false && slide.opts.width && slide.opts.height && slide.thumb) {
		  slide.width = slide.opts.width;
		  slide.height = slide.opts.height;

		  ghost = document.createElement("img");

		  ghost.onerror = function () {
			$(this).remove();

			slide.$ghost = null;
		  };

		  ghost.onload = function () {
			self.afterLoad(slide);
		  };

		  slide.$ghost = $(ghost)
			.addClass("fancybox-image")
			.appendTo(slide.$content)
			.attr("src", slide.thumb);
		}

		// Start loading actual image
		self.setBigImage(slide);
	  },

	  // Check if image has srcset and get the source
	  // ============================================
	  checkSrcset: function (slide) {
		var srcset = slide.opts.srcset || slide.opts.image.srcset,
		  found,
		  temp,
		  pxRatio,
		  windowWidth;

		// If we have "srcset", then we need to find first matching "src" value.
		// This is necessary, because when you set an src attribute, the browser will preload the image
		// before any javascript or even CSS is applied.
		if (srcset) {
		  pxRatio = window.devicePixelRatio || 1;
		  windowWidth = window.innerWidth * pxRatio;

		  temp = srcset.split(",").map(function (el) {
			var ret = {};

			el.trim()
			  .split(/\s+/)
			  .forEach(function (el, i) {
				var value = parseInt(el.substring(0, el.length - 1), 10);

				if (i === 0) {
				  return (ret.url = el);
				}

				if (value) {
				  ret.value = value;
				  ret.postfix = el[el.length - 1];
				}
			  });

			return ret;
		  });

		  // Sort by value
		  temp.sort(function (a, b) {
			return a.value - b.value;
		  });

		  // Ok, now we have an array of all srcset values
		  for (var j = 0; j < temp.length; j++) {
			var el = temp[j];

			if ((el.postfix === "w" && el.value >= windowWidth) || (el.postfix === "x" && el.value >= pxRatio)) {
			  found = el;
			  break;
			}
		  }

		  // If not found, take the last one
		  if (!found && temp.length) {
			found = temp[temp.length - 1];
		  }

		  if (found) {
			slide.src = found.url;

			// If we have default width/height values, we can calculate height for matching source
			if (slide.width && slide.height && found.postfix == "w") {
			  slide.height = (slide.width / slide.height) * found.value;
			  slide.width = found.value;
			}

			slide.opts.srcset = srcset;
		  }
		}
	  },

	  // Create full-size image
	  // ======================

	  setBigImage: function (slide) {
		var self = this,
		  img = document.createElement("img"),
		  $img = $(img);

		slide.$image = $img
		  .one("error", function () {
			self.setError(slide);
		  })
		  .one("load", function () {
			var sizes;

			if (!slide.$ghost) {
			  self.resolveImageSlideSize(slide, this.naturalWidth, this.naturalHeight);

			  self.afterLoad(slide);
			}

			if (self.isClosing) {
			  return;
			}

			if (slide.opts.srcset) {
			  sizes = slide.opts.sizes;

			  if (!sizes || sizes === "auto") {
				sizes =
				  (slide.width / slide.height > 1 && $W.width() / $W.height() > 1 ? "100" : Math.round((slide.width / slide.height) * 100)) +
				  "vw";
			  }

			  $img.attr("sizes", sizes).attr("srcset", slide.opts.srcset);
			}

			// Hide temporary image after some delay
			if (slide.$ghost) {
			  setTimeout(function () {
				if (slide.$ghost && !self.isClosing) {
				  slide.$ghost.hide();
				}
			  }, Math.min(300, Math.max(1000, slide.height / 1600)));
			}

			self.hideLoading(slide);
		  })
		  .addClass("fancybox-image")
		  .attr("src", slide.src)
		  .appendTo(slide.$content);

		if ((img.complete || img.readyState == "complete") && $img.naturalWidth && $img.naturalHeight) {
		  $img.trigger("load");
		} else if (img.error) {
		  $img.trigger("error");
		}
	  },

	  // Computes the slide size from image size and maxWidth/maxHeight
	  // ==============================================================

	  resolveImageSlideSize: function (slide, imgWidth, imgHeight) {
		var maxWidth = parseInt(slide.opts.width, 10),
		  maxHeight = parseInt(slide.opts.height, 10);

		// Sets the default values from the image
		slide.width = imgWidth;
		slide.height = imgHeight;

		if (maxWidth > 0) {
		  slide.width = maxWidth;
		  slide.height = Math.floor((maxWidth * imgHeight) / imgWidth);
		}

		if (maxHeight > 0) {
		  slide.width = Math.floor((maxHeight * imgWidth) / imgHeight);
		  slide.height = maxHeight;
		}
	  },

	  // Create iframe wrapper, iframe and bindings
	  // ==========================================

	  setIframe: function (slide) {
		var self = this,
		  opts = slide.opts.iframe,
		  $slide = slide.$slide,
		  $iframe;

		slide.$content = $('<div class="fancybox-content' + (opts.preload ? " fancybox-is-hidden" : "") + '"></div>')
		  .css(opts.css)
		  .appendTo($slide);

		$slide.addClass("fancybox-slide--" + slide.contentType);

		slide.$iframe = $iframe = $(opts.tpl.replace(/\{rnd\}/g, new Date().getTime()))
		  .attr(opts.attr)
		  .appendTo(slide.$content);

		if (opts.preload) {
		  self.showLoading(slide);

		  // Unfortunately, it is not always possible to determine if iframe is successfully loaded
		  // (due to browser security policy)

		  $iframe.on("load.fb error.fb", function (e) {
			this.isReady = 1;

			slide.$slide.trigger("refresh");

			self.afterLoad(slide);
		  });

		  // Recalculate iframe content size
		  // ===============================

		  $slide.on("refresh.fb", function () {
			var $content = slide.$content,
			  frameWidth = opts.css.width,
			  frameHeight = opts.css.height,
			  $contents,
			  $body;

			if ($iframe[0].isReady !== 1) {
			  return;
			}

			try {
			  $contents = $iframe.contents();
			  $body = $contents.find("body");
			} catch (ignore) {}

			// Calculate content dimensions, if it is accessible
			if ($body && $body.length && $body.children().length) {
			  // Avoid scrolling to top (if multiple instances)
			  $slide.css("overflow", "visible");

			  $content.css({
				width: "100%",
				"max-width": "100%",
				height: "9999px"
			  });

			  if (frameWidth === undefined) {
				frameWidth = Math.ceil(Math.max($body[0].clientWidth, $body.outerWidth(true)));
			  }

			  $content.css("width", frameWidth ? frameWidth : "").css("max-width", "");

			  if (frameHeight === undefined) {
				frameHeight = Math.ceil(Math.max($body[0].clientHeight, $body.outerHeight(true)));
			  }

			  $content.css("height", frameHeight ? frameHeight : "");

			  $slide.css("overflow", "auto");
			}

			$content.removeClass("fancybox-is-hidden");
		  });
		} else {
		  self.afterLoad(slide);
		}

		$iframe.attr("src", slide.src);

		// Remove iframe if closing or changing gallery item
		$slide.one("onReset", function () {
		  // This helps IE not to throw errors when closing
		  try {
			$(this)
			  .find("iframe")
			  .hide()
			  .unbind()
			  .attr("src", "//about:blank");
		  } catch (ignore) {}

		  $(this)
			.off("refresh.fb")
			.empty();

		  slide.isLoaded = false;
		  slide.isRevealed = false;
		});
	  },

	  // Wrap and append content to the slide
	  // ======================================

	  setContent: function (slide, content) {
		var self = this;

		if (self.isClosing) {
		  return;
		}

		self.hideLoading(slide);

		if (slide.$content) {
		  $.fancybox.stop(slide.$content);
		}

		slide.$slide.empty();

		// If content is a jQuery object, then it will be moved to the slide.
		// The placeholder is created so we will know where to put it back.
		if (isQuery(content) && content.parent().length) {
		  // Make sure content is not already moved to fancyBox
		  if (content.hasClass("fancybox-content") || content.parent().hasClass("fancybox-content")) {
			content.parents(".fancybox-slide").trigger("onReset");
		  }

		  // Create temporary element marking original place of the content
		  slide.$placeholder = $("<div>")
			.hide()
			.insertAfter(content);

		  // Make sure content is visible
		  content.css("display", "inline-block");
		} else if (!slide.hasError) {
		  // If content is just a plain text, try to convert it to html
		  if ($.type(content) === "string") {
			content = $("<div>")
			  .append($.trim(content))
			  .contents();
		  }

		  // If "filter" option is provided, then filter content
		  if (slide.opts.filter) {
			content = $("<div>")
			  .html(content)
			  .find(slide.opts.filter);
		  }
		}

		slide.$slide.one("onReset", function () {
		  // Pause all html5 video/audio
		  $(this)
			.find("video,audio")
			.trigger("pause");

		  // Put content back
		  if (slide.$placeholder) {
			slide.$placeholder.after(content.removeClass("fancybox-content").hide()).remove();

			slide.$placeholder = null;
		  }

		  // Remove custom close button
		  if (slide.$smallBtn) {
			slide.$smallBtn.remove();

			slide.$smallBtn = null;
		  }

		  // Remove content and mark slide as not loaded
		  if (!slide.hasError) {
			$(this).empty();

			slide.isLoaded = false;
			slide.isRevealed = false;
		  }
		});

		$(content).appendTo(slide.$slide);

		if ($(content).is("video,audio")) {
		  $(content).addClass("fancybox-video");

		  $(content).wrap("<div></div>");

		  slide.contentType = "video";

		  slide.opts.width = slide.opts.width || $(content).attr("width");
		  slide.opts.height = slide.opts.height || $(content).attr("height");
		}

		slide.$content = slide.$slide
		  .children()
		  .filter("div,form,main,video,audio,article,.fancybox-content")
		  .first();

		slide.$content.siblings().hide();

		// Re-check if there is a valid content
		// (in some cases, ajax response can contain various elements or plain text)
		if (!slide.$content.length) {
		  slide.$content = slide.$slide
			.wrapInner("<div></div>")
			.children()
			.first();
		}

		slide.$content.addClass("fancybox-content");

		slide.$slide.addClass("fancybox-slide--" + slide.contentType);

		self.afterLoad(slide);
	  },

	  // Display error message
	  // =====================

	  setError: function (slide) {
		slide.hasError = true;

		slide.$slide
		  .trigger("onReset")
		  .removeClass("fancybox-slide--" + slide.contentType)
		  .addClass("fancybox-slide--error");

		slide.contentType = "html";

		this.setContent(slide, this.translate(slide, slide.opts.errorTpl));

		if (slide.pos === this.currPos) {
		  this.isAnimating = false;
		}
	  },

	  // Show loading icon inside the slide
	  // ==================================

	  showLoading: function (slide) {
		var self = this;

		slide = slide || self.current;

		if (slide && !slide.$spinner) {
		  slide.$spinner = $(self.translate(self, self.opts.spinnerTpl))
			.appendTo(slide.$slide)
			.hide()
			.fadeIn("fast");
		}
	  },

	  // Remove loading icon from the slide
	  // ==================================

	  hideLoading: function (slide) {
		var self = this;

		slide = slide || self.current;

		if (slide && slide.$spinner) {
		  slide.$spinner.stop().remove();

		  delete slide.$spinner;
		}
	  },

	  // Adjustments after slide content has been loaded
	  // ===============================================

	  afterLoad: function (slide) {
		var self = this;

		if (self.isClosing) {
		  return;
		}

		slide.isLoading = false;
		slide.isLoaded = true;

		self.trigger("afterLoad", slide);

		self.hideLoading(slide);

		// Add small close button
		if (slide.opts.smallBtn && (!slide.$smallBtn || !slide.$smallBtn.length)) {
		  slide.$smallBtn = $(self.translate(slide, slide.opts.btnTpl.smallBtn)).appendTo(slide.$content);
		}

		// Disable right click
		if (slide.opts.protect && slide.$content && !slide.hasError) {
		  slide.$content.on("contextmenu.fb", function (e) {
			if (e.button == 2) {
			  e.preventDefault();
			}

			return true;
		  });

		  // Add fake element on top of the image
		  // This makes a bit harder for user to select image
		  if (slide.type === "image") {
			$('<div class="fancybox-spaceball"></div>').appendTo(slide.$content);
		  }
		}

		self.adjustCaption(slide);

		self.adjustLayout(slide);

		if (slide.pos === self.currPos) {
		  self.updateCursor();
		}

		self.revealContent(slide);
	  },

	  // Prevent caption overlap,
	  // fix css inconsistency across browsers
	  // =====================================

	  adjustCaption: function (slide) {
		var self = this,
		  current = slide || self.current,
		  caption = current.opts.caption,
		  preventOverlap = current.opts.preventCaptionOverlap,
		  $caption = self.$refs.caption,
		  $clone,
		  captionH = false;

		$caption.toggleClass("fancybox-caption--separate", preventOverlap);

		if (preventOverlap && caption && caption.length) {
		  if (current.pos !== self.currPos) {
			$clone = $caption.clone().appendTo($caption.parent());

			$clone
			  .children()
			  .eq(0)
			  .empty()
			  .html(caption);

			captionH = $clone.outerHeight(true);

			$clone.empty().remove();
		  } else if (self.$caption) {
			captionH = self.$caption.outerHeight(true);
		  }

		  current.$slide.css("padding-bottom", captionH || "");
		}
	  },

	  // Simple hack to fix inconsistency across browsers, described here (affects Edge, too):
	  // https://bugzilla.mozilla.org/show_bug.cgi?id=748518
	  // ====================================================================================

	  adjustLayout: function (slide) {
		var self = this,
		  current = slide || self.current,
		  scrollHeight,
		  marginBottom,
		  inlinePadding,
		  actualPadding;

		if (current.isLoaded && current.opts.disableLayoutFix !== true) {
		  current.$content.css("margin-bottom", "");

		  // If we would always set margin-bottom for the content,
		  // then it would potentially break vertical align
		  if (current.$content.outerHeight() > current.$slide.height() + 0.5) {
			inlinePadding = current.$slide[0].style["padding-bottom"];
			actualPadding = current.$slide.css("padding-bottom");

			if (parseFloat(actualPadding) > 0) {
			  scrollHeight = current.$slide[0].scrollHeight;

			  current.$slide.css("padding-bottom", 0);

			  if (Math.abs(scrollHeight - current.$slide[0].scrollHeight) < 1) {
				marginBottom = actualPadding;
			  }

			  current.$slide.css("padding-bottom", inlinePadding);
			}
		  }

		  current.$content.css("margin-bottom", marginBottom);
		}
	  },

	  // Make content visible
	  // This method is called right after content has been loaded or
	  // user navigates gallery and transition should start
	  // ============================================================

	  revealContent: function (slide) {
		var self = this,
		  $slide = slide.$slide,
		  end = false,
		  start = false,
		  isMoved = self.isMoved(slide),
		  isRevealed = slide.isRevealed,
		  effect,
		  effectClassName,
		  duration,
		  opacity;

		slide.isRevealed = true;

		effect = slide.opts[self.firstRun ? "animationEffect" : "transitionEffect"];
		duration = slide.opts[self.firstRun ? "animationDuration" : "transitionDuration"];

		duration = parseInt(slide.forcedDuration === undefined ? duration : slide.forcedDuration, 10);

		if (isMoved || slide.pos !== self.currPos || !duration) {
		  effect = false;
		}

		// Check if can zoom
		if (effect === "zoom") {
		  if (slide.pos === self.currPos && duration && slide.type === "image" && !slide.hasError && (start = self.getThumbPos(slide))) {
			end = self.getFitPos(slide);
		  } else {
			effect = "fade";
		  }
		}

		// Zoom animation
		// ==============
		if (effect === "zoom") {
		  self.isAnimating = true;

		  end.scaleX = end.width / start.width;
		  end.scaleY = end.height / start.height;

		  // Check if we need to animate opacity
		  opacity = slide.opts.zoomOpacity;

		  if (opacity == "auto") {
			opacity = Math.abs(slide.width / slide.height - start.width / start.height) > 0.1;
		  }

		  if (opacity) {
			start.opacity = 0.1;
			end.opacity = 1;
		  }

		  // Draw image at start position
		  $.fancybox.setTranslate(slide.$content.removeClass("fancybox-is-hidden"), start);

		  forceRedraw(slide.$content);

		  // Start animation
		  $.fancybox.animate(slide.$content, end, duration, function () {
			self.isAnimating = false;

			self.complete();
		  });

		  return;
		}

		self.updateSlide(slide);

		// Simply show content if no effect
		// ================================
		if (!effect) {
		  slide.$content.removeClass("fancybox-is-hidden");

		  if (!isRevealed && isMoved && slide.type === "image" && !slide.hasError) {
			slide.$content.hide().fadeIn("fast");
		  }

		  if (slide.pos === self.currPos) {
			self.complete();
		  }

		  return;
		}

		// Prepare for CSS transiton
		// =========================
		$.fancybox.stop($slide);

		//effectClassName = "fancybox-animated fancybox-slide--" + (slide.pos >= self.prevPos ? "next" : "previous") + " fancybox-fx-" + effect;
		effectClassName = "fancybox-slide--" + (slide.pos >= self.prevPos ? "next" : "previous") + " fancybox-animated fancybox-fx-" + effect;

		$slide.addClass(effectClassName).removeClass("fancybox-slide--current"); //.addClass(effectClassName);

		slide.$content.removeClass("fancybox-is-hidden");

		// Force reflow
		forceRedraw($slide);

		if (slide.type !== "image") {
		  slide.$content.hide().show(0);
		}

		$.fancybox.animate(
		  $slide,
		  "fancybox-slide--current",
		  duration,
		  function () {
			$slide.removeClass(effectClassName).css({
			  transform: "",
			  opacity: ""
			});

			if (slide.pos === self.currPos) {
			  self.complete();
			}
		  },
		  true
		);
	  },

	  // Check if we can and have to zoom from thumbnail
	  //================================================

	  getThumbPos: function (slide) {
		var rez = false,
		  $thumb = slide.$thumb,
		  thumbPos,
		  btw,
		  brw,
		  bbw,
		  blw;

		if (!$thumb || !inViewport($thumb[0])) {
		  return false;
		}

		thumbPos = $.fancybox.getTranslate($thumb);

		btw = parseFloat($thumb.css("border-top-width") || 0);
		brw = parseFloat($thumb.css("border-right-width") || 0);
		bbw = parseFloat($thumb.css("border-bottom-width") || 0);
		blw = parseFloat($thumb.css("border-left-width") || 0);

		rez = {
		  top: thumbPos.top + btw,
		  left: thumbPos.left + blw,
		  width: thumbPos.width - brw - blw,
		  height: thumbPos.height - btw - bbw,
		  scaleX: 1,
		  scaleY: 1
		};

		return thumbPos.width > 0 && thumbPos.height > 0 ? rez : false;
	  },

	  // Final adjustments after current gallery item is moved to position
	  // and it`s content is loaded
	  // ==================================================================

	  complete: function () {
		var self = this,
		  current = self.current,
		  slides = {},
		  $el;

		if (self.isMoved() || !current.isLoaded) {
		  return;
		}

		if (!current.isComplete) {
		  current.isComplete = true;

		  current.$slide.siblings().trigger("onReset");

		  self.preload("inline");

		  // Trigger any CSS transiton inside the slide
		  forceRedraw(current.$slide);

		  current.$slide.addClass("fancybox-slide--complete");

		  // Remove unnecessary slides
		  $.each(self.slides, function (key, slide) {
			if (slide.pos >= self.currPos - 1 && slide.pos <= self.currPos + 1) {
			  slides[slide.pos] = slide;
			} else if (slide) {
			  $.fancybox.stop(slide.$slide);

			  slide.$slide.off().remove();
			}
		  });

		  self.slides = slides;
		}

		self.isAnimating = false;

		self.updateCursor();

		self.trigger("afterShow");

		// Autoplay first html5 video/audio
		if (!!current.opts.video.autoStart) {
		  current.$slide
			.find("video,audio")
			.filter(":visible:first")
			.trigger("play")
			.one("ended", function () {
			  if (Document.exitFullscreen) {
				Document.exitFullscreen();
			  } else if (this.webkitExitFullscreen) {
				this.webkitExitFullscreen();
			  }

			  self.next();
			});
		}

		// Try to focus on the first focusable element
		if (current.opts.autoFocus && current.contentType === "html") {
		  // Look for the first input with autofocus attribute
		  $el = current.$content.find("input[autofocus]:enabled:visible:first");

		  if ($el.length) {
			$el.trigger("focus");
		  } else {
			self.focus(null, true);
		  }
		}

		// Avoid jumping
		current.$slide.scrollTop(0).scrollLeft(0);
	  },

	  // Preload next and previous slides
	  // ================================

	  preload: function (type) {
		var self = this,
		  prev,
		  next;

		if (self.group.length < 2) {
		  return;
		}

		next = self.slides[self.currPos + 1];
		prev = self.slides[self.currPos - 1];

		if (prev && prev.type === type) {
		  self.loadSlide(prev);
		}

		if (next && next.type === type) {
		  self.loadSlide(next);
		}
	  },

	  // Try to find and focus on the first focusable element
	  // ====================================================

	  focus: function (e, firstRun) {
		var self = this,
		  focusableStr = [
			"a[href]",
			"area[href]",
			'input:not([disabled]):not([type="hidden"]):not([aria-hidden])',
			"select:not([disabled]):not([aria-hidden])",
			"textarea:not([disabled]):not([aria-hidden])",
			"button:not([disabled]):not([aria-hidden])",
			"iframe",
			"object",
			"embed",
			"video",
			"audio",
			"[contenteditable]",
			'[tabindex]:not([tabindex^="-"])'
		  ].join(","),
		  focusableItems,
		  focusedItemIndex;

		if (self.isClosing) {
		  return;
		}

		if (e || !self.current || !self.current.isComplete) {
		  // Focus on any element inside fancybox
		  focusableItems = self.$refs.container.find("*:visible");
		} else {
		  // Focus inside current slide
		  focusableItems = self.current.$slide.find("*:visible" + (firstRun ? ":not(.fancybox-close-small)" : ""));
		}

		focusableItems = focusableItems.filter(focusableStr).filter(function () {
		  return $(this).css("visibility") !== "hidden" && !$(this).hasClass("disabled");
		});

		if (focusableItems.length) {
		  focusedItemIndex = focusableItems.index(document.activeElement);

		  if (e && e.shiftKey) {
			// Back tab
			if (focusedItemIndex < 0 || focusedItemIndex == 0) {
			  e.preventDefault();

			  focusableItems.eq(focusableItems.length - 1).trigger("focus");
			}
		  } else {
			// Outside or Forward tab
			if (focusedItemIndex < 0 || focusedItemIndex == focusableItems.length - 1) {
			  if (e) {
				e.preventDefault();
			  }

			  focusableItems.eq(0).trigger("focus");
			}
		  }
		} else {
		  self.$refs.container.trigger("focus");
		}
	  },

	  // Activates current instance - brings container to the front and enables keyboard,
	  // notifies other instances about deactivating
	  // =================================================================================

	  activate: function () {
		var self = this;

		// Deactivate all instances
		$(".fancybox-container").each(function () {
		  var instance = $(this).data("FancyBox");

		  // Skip self and closing instances
		  if (instance && instance.id !== self.id && !instance.isClosing) {
			instance.trigger("onDeactivate");

			instance.removeEvents();

			instance.isVisible = false;
		  }
		});

		self.isVisible = true;

		if (self.current || self.isIdle) {
		  self.update();

		  self.updateControls();
		}

		self.trigger("onActivate");

		self.addEvents();
	  },

	  // Start closing procedure
	  // This will start "zoom-out" animation if needed and clean everything up afterwards
	  // =================================================================================

	  close: function (e, d) {
		var self = this,
		  current = self.current,
		  effect,
		  duration,
		  $content,
		  domRect,
		  opacity,
		  start,
		  end;

		var done = function () {
		  self.cleanUp(e);
		};

		if (self.isClosing) {
		  return false;
		}

		self.isClosing = true;

		// If beforeClose callback prevents closing, make sure content is centered
		if (self.trigger("beforeClose", e) === false) {
		  self.isClosing = false;

		  requestAFrame(function () {
			self.update();
		  });

		  return false;
		}

		// Remove all events
		// If there are multiple instances, they will be set again by "activate" method
		self.removeEvents();

		$content = current.$content;
		effect = current.opts.animationEffect;
		duration = $.isNumeric(d) ? d : effect ? current.opts.animationDuration : 0;

		current.$slide.removeClass("fancybox-slide--complete fancybox-slide--next fancybox-slide--previous fancybox-animated");

		if (e !== true) {
		  $.fancybox.stop(current.$slide);
		} else {
		  effect = false;
		}

		// Remove other slides
		current.$slide
		  .siblings()
		  .trigger("onReset")
		  .remove();

		// Trigger animations
		if (duration) {
		  self.$refs.container
			.removeClass("fancybox-is-open")
			.addClass("fancybox-is-closing")
			.css("transition-duration", duration + "ms");
		}

		// Clean up
		self.hideLoading(current);

		self.hideControls(true);

		self.updateCursor();

		// Check if possible to zoom-out
		if (
		  effect === "zoom" &&
		  !($content && duration && current.type === "image" && !self.isMoved() && !current.hasError && (end = self.getThumbPos(current)))
		) {
		  effect = "fade";
		}

		if (effect === "zoom") {
		  $.fancybox.stop($content);

		  domRect = $.fancybox.getTranslate($content);

		  start = {
			top: domRect.top,
			left: domRect.left,
			scaleX: domRect.width / end.width,
			scaleY: domRect.height / end.height,
			width: end.width,
			height: end.height
		  };

		  // Check if we need to animate opacity
		  opacity = current.opts.zoomOpacity;

		  if (opacity == "auto") {
			opacity = Math.abs(current.width / current.height - end.width / end.height) > 0.1;
		  }

		  if (opacity) {
			end.opacity = 0;
		  }

		  $.fancybox.setTranslate($content, start);

		  forceRedraw($content);

		  $.fancybox.animate($content, end, duration, done);

		  return true;
		}

		if (effect && duration) {
		  $.fancybox.animate(
			current.$slide.addClass("fancybox-slide--previous").removeClass("fancybox-slide--current"),
			"fancybox-animated fancybox-fx-" + effect,
			duration,
			done
		  );
		} else {
		  // If skip animation
		  if (e === true) {
			setTimeout(done, duration);
		  } else {
			done();
		  }
		}

		return true;
	  },

	  // Final adjustments after removing the instance
	  // =============================================

	  cleanUp: function (e) {
		var self = this,
		  instance,
		  $focus = self.current.opts.$orig,
		  x,
		  y;

		self.current.$slide.trigger("onReset");

		self.$refs.container.empty().remove();

		self.trigger("afterClose", e);

		// Place back focus
		if (!!self.current.opts.backFocus) {
		  if (!$focus || !$focus.length || !$focus.is(":visible")) {
			$focus = self.$trigger;
		  }

		  if ($focus && $focus.length) {
			x = window.scrollX;
			y = window.scrollY;

			$focus.trigger("focus");

			$("html, body")
			  .scrollTop(y)
			  .scrollLeft(x);
		  }
		}

		self.current = null;

		// Check if there are other instances
		instance = $.fancybox.getInstance();

		if (instance) {
		  instance.activate();
		} else {
		  $("body").removeClass("fancybox-active compensate-for-scrollbar");

		  $("#fancybox-style-noscroll").remove();
		}
	  },

	  // Call callback and trigger an event
	  // ==================================

	  trigger: function (name, slide) {
		var args = Array.prototype.slice.call(arguments, 1),
		  self = this,
		  obj = slide && slide.opts ? slide : self.current,
		  rez;

		if (obj) {
		  args.unshift(obj);
		} else {
		  obj = self;
		}

		args.unshift(self);

		if ($.isFunction(obj.opts[name])) {
		  rez = obj.opts[name].apply(obj, args);
		}

		if (rez === false) {
		  return rez;
		}

		if (name === "afterClose" || !self.$refs) {
		  $D.trigger(name + ".fb", args);
		} else {
		  self.$refs.container.trigger(name + ".fb", args);
		}
	  },

	  // Update infobar values, navigation button states and reveal caption
	  // ==================================================================

	  updateControls: function () {
		var self = this,
		  current = self.current,
		  index = current.index,
		  $container = self.$refs.container,
		  $caption = self.$refs.caption,
		  caption = current.opts.caption;

		// Recalculate content dimensions
		current.$slide.trigger("refresh");

		// Set caption
		if (caption && caption.length) {
		  self.$caption = $caption;

		  $caption
			.children()
			.eq(0)
			.html(caption);
		} else {
		  self.$caption = null;
		}

		if (!self.hasHiddenControls && !self.isIdle) {
		  self.showControls();
		}

		// Update info and navigation elements
		$container.find("[data-fancybox-count]").html(self.group.length);
		$container.find("[data-fancybox-index]").html(index + 1);

		$container.find("[data-fancybox-prev]").prop("disabled", !current.opts.loop && index <= 0);
		$container.find("[data-fancybox-next]").prop("disabled", !current.opts.loop && index >= self.group.length - 1);

		if (current.type === "image") {
		  // Re-enable buttons; update download button source
		  $container
			.find("[data-fancybox-zoom]")
			.show()
			.end()
			.find("[data-fancybox-download]")
			.attr("href", current.opts.image.src || current.src)
			.show();
		} else if (current.opts.toolbar) {
		  $container.find("[data-fancybox-download],[data-fancybox-zoom]").hide();
		}

		// Make sure focus is not on disabled button/element
		if ($(document.activeElement).is(":hidden,[disabled]")) {
		  self.$refs.container.trigger("focus");
		}
	  },

	  // Hide toolbar and caption
	  // ========================

	  hideControls: function (andCaption) {
		var self = this,
		  arr = ["infobar", "toolbar", "nav"];

		if (andCaption || !self.current.opts.preventCaptionOverlap) {
		  arr.push("caption");
		}

		this.$refs.container.removeClass(
		  arr
		  .map(function (i) {
			return "fancybox-show-" + i;
		  })
		  .join(" ")
		);

		this.hasHiddenControls = true;
	  },

	  showControls: function () {
		var self = this,
		  opts = self.current ? self.current.opts : self.opts,
		  $container = self.$refs.container;

		self.hasHiddenControls = false;
		self.idleSecondsCounter = 0;

		$container
		  .toggleClass("fancybox-show-toolbar", !!(opts.toolbar && opts.buttons))
		  .toggleClass("fancybox-show-infobar", !!(opts.infobar && self.group.length > 1))
		  .toggleClass("fancybox-show-caption", !!self.$caption)
		  .toggleClass("fancybox-show-nav", !!(opts.arrows && self.group.length > 1))
		  .toggleClass("fancybox-is-modal", !!opts.modal);
	  },

	  // Toggle toolbar and caption
	  // ==========================

	  toggleControls: function () {
		if (this.hasHiddenControls) {
		  this.showControls();
		} else {
		  this.hideControls();
		}
	  }
	});

	$.fancybox = {
	  version: "3.5.7",
	  defaults: defaults,

	  // Get current instance and execute a command.
	  //
	  // Examples of usage:
	  //
	  //   $instance = $.fancybox.getInstance();
	  //   $.fancybox.getInstance().jumpTo( 1 );
	  //   $.fancybox.getInstance( 'jumpTo', 1 );
	  //   $.fancybox.getInstance( function() {
	  //       console.info( this.currIndex );
	  //   });
	  // ======================================================

	  getInstance: function (command) {
		var instance = $('.fancybox-container:not(".fancybox-is-closing"):last').data("FancyBox"),
		  args = Array.prototype.slice.call(arguments, 1);

		if (instance instanceof FancyBox) {
		  if ($.type(command) === "string") {
			instance[command].apply(instance, args);
		  } else if ($.type(command) === "function") {
			command.apply(instance, args);
		  }

		  return instance;
		}

		return false;
	  },

	  // Create new instance
	  // ===================

	  open: function (items, opts, index) {
		return new FancyBox(items, opts, index);
	  },

	  // Close current or all instances
	  // ==============================

	  close: function (all) {
		var instance = this.getInstance();

		if (instance) {
		  instance.close();

		  // Try to find and close next instance
		  if (all === true) {
			this.close(all);
		  }
		}
	  },

	  // Close all instances and unbind all events
	  // =========================================

	  destroy: function () {
		this.close(true);

		$D.add("body").off("click.fb-start", "**");
	  },

	  // Try to detect mobile devices
	  // ============================

	  isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),

	  // Detect if 'translate3d' support is available
	  // ============================================

	  use3d: (function () {
		var div = document.createElement("div");

		return (
		  window.getComputedStyle &&
		  window.getComputedStyle(div) &&
		  window.getComputedStyle(div).getPropertyValue("transform") &&
		  !(document.documentMode && document.documentMode < 11)
		);
	  })(),

	  // Helper function to get current visual state of an element
	  // returns array[ top, left, horizontal-scale, vertical-scale, opacity ]
	  // =====================================================================

	  getTranslate: function ($el) {
		var domRect;

		if (!$el || !$el.length) {
		  return false;
		}

		domRect = $el[0].getBoundingClientRect();

		return {
		  top: domRect.top || 0,
		  left: domRect.left || 0,
		  width: domRect.width,
		  height: domRect.height,
		  opacity: parseFloat($el.css("opacity"))
		};
	  },

	  // Shortcut for setting "translate3d" properties for element
	  // Can set be used to set opacity, too
	  // ========================================================

	  setTranslate: function ($el, props) {
		var str = "",
		  css = {};

		if (!$el || !props) {
		  return;
		}

		if (props.left !== undefined || props.top !== undefined) {
		  str =
			(props.left === undefined ? $el.position().left : props.left) +
			"px, " +
			(props.top === undefined ? $el.position().top : props.top) +
			"px";

		  if (this.use3d) {
			str = "translate3d(" + str + ", 0px)";
		  } else {
			str = "translate(" + str + ")";
		  }
		}

		if (props.scaleX !== undefined && props.scaleY !== undefined) {
		  str += " scale(" + props.scaleX + ", " + props.scaleY + ")";
		} else if (props.scaleX !== undefined) {
		  str += " scaleX(" + props.scaleX + ")";
		}

		if (str.length) {
		  css.transform = str;
		}

		if (props.opacity !== undefined) {
		  css.opacity = props.opacity;
		}

		if (props.width !== undefined) {
		  css.width = props.width;
		}

		if (props.height !== undefined) {
		  css.height = props.height;
		}

		return $el.css(css);
	  },

	  // Simple CSS transition handler
	  // =============================

	  animate: function ($el, to, duration, callback, leaveAnimationName) {
		var self = this,
		  from;

		if ($.isFunction(duration)) {
		  callback = duration;
		  duration = null;
		}

		self.stop($el);

		from = self.getTranslate($el);

		$el.on(transitionEnd, function (e) {
		  // Skip events from child elements and z-index change
		  if (e && e.originalEvent && (!$el.is(e.originalEvent.target) || e.originalEvent.propertyName == "z-index")) {
			return;
		  }

		  self.stop($el);

		  if ($.isNumeric(duration)) {
			$el.css("transition-duration", "");
		  }

		  if ($.isPlainObject(to)) {
			if (to.scaleX !== undefined && to.scaleY !== undefined) {
			  self.setTranslate($el, {
				top: to.top,
				left: to.left,
				width: from.width * to.scaleX,
				height: from.height * to.scaleY,
				scaleX: 1,
				scaleY: 1
			  });
			}
		  } else if (leaveAnimationName !== true) {
			$el.removeClass(to);
		  }

		  if ($.isFunction(callback)) {
			callback(e);
		  }
		});

		if ($.isNumeric(duration)) {
		  $el.css("transition-duration", duration + "ms");
		}

		// Start animation by changing CSS properties or class name
		if ($.isPlainObject(to)) {
		  if (to.scaleX !== undefined && to.scaleY !== undefined) {
			delete to.width;
			delete to.height;

			if ($el.parent().hasClass("fancybox-slide--image")) {
			  $el.parent().addClass("fancybox-is-scaling");
			}
		  }

		  $.fancybox.setTranslate($el, to);
		} else {
		  $el.addClass(to);
		}

		// Make sure that `transitionend` callback gets fired
		$el.data(
		  "timer",
		  setTimeout(function () {
			$el.trigger(transitionEnd);
		  }, duration + 33)
		);
	  },

	  stop: function ($el, callCallback) {
		if ($el && $el.length) {
		  clearTimeout($el.data("timer"));

		  if (callCallback) {
			$el.trigger(transitionEnd);
		  }

		  $el.off(transitionEnd).css("transition-duration", "");

		  $el.parent().removeClass("fancybox-is-scaling");
		}
	  }
	};

	// Default click handler for "fancyboxed" links
	// ============================================

	function _run(e, opts) {
	  var items = [],
		index = 0,
		$target,
		value,
		instance;

	  // Avoid opening multiple times
	  if (e && e.isDefaultPrevented()) {
		return;
	  }

	  e.preventDefault();

	  opts = opts || {};

	  if (e && e.data) {
		opts = mergeOpts(e.data.options, opts);
	  }

	  $target = opts.$target || $(e.currentTarget).trigger("blur");
	  instance = $.fancybox.getInstance();

	  if (instance && instance.$trigger && instance.$trigger.is($target)) {
		return;
	  }

	  if (opts.selector) {
		items = $(opts.selector);
	  } else {
		// Get all related items and find index for clicked one
		value = $target.attr("data-fancybox") || "";

		if (value) {
		  items = e.data ? e.data.items : [];
		  items = items.length ? items.filter('[data-fancybox="' + value + '"]') : $('[data-fancybox="' + value + '"]');
		} else {
		  items = [$target];
		}
	  }

	  index = $(items).index($target);

	  // Sometimes current item can not be found
	  if (index < 0) {
		index = 0;
	  }

	  instance = $.fancybox.open(items, opts, index);

	  // Save last active element
	  instance.$trigger = $target;
	}

	// Create a jQuery plugin
	// ======================

	$.fn.fancybox = function (options) {
	  var selector;

	  options = options || {};
	  selector = options.selector || false;

	  if (selector) {
		// Use body element instead of document so it executes first
		$("body")
		  .off("click.fb-start", selector)
		  .on("click.fb-start", selector, {
			options: options
		  }, _run);
	  } else {
		this.off("click.fb-start").on(
		  "click.fb-start", {
			items: this,
			options: options
		  },
		  _run
		);
	  }

	  return this;
	};

	// Self initializing plugin for all elements having `data-fancybox` attribute
	// ==========================================================================

	$D.on("click.fb-start", "[data-fancybox]", _run);

	// Enable "trigger elements"
	// =========================

	$D.on("click.fb-start", "[data-fancybox-trigger]", function (e) {
	  $('[data-fancybox="' + $(this).attr("data-fancybox-trigger") + '"]')
		.eq($(this).attr("data-fancybox-index") || 0)
		.trigger("click.fb-start", {
		  $trigger: $(this)
		});
	});

	// Track focus event for better accessibility styling
	// ==================================================
	(function () {
	  var buttonStr = ".fancybox-button",
		focusStr = "fancybox-focus",
		$pressed = null;

	  $D.on("mousedown mouseup focus blur", buttonStr, function (e) {
		switch (e.type) {
		  case "mousedown":
			$pressed = $(this);
			break;
		  case "mouseup":
			$pressed = null;
			break;
		  case "focusin":
			$(buttonStr).removeClass(focusStr);

			if (!$(this).is($pressed) && !$(this).is("[disabled]")) {
			  $(this).addClass(focusStr);
			}
			break;
		  case "focusout":
			$(buttonStr).removeClass(focusStr);
			break;
		}
	  });
	})();
  })(window, document, jQuery);
  // ==========================================================================
  //
  // Media
  // Adds additional media type support
  //
  // ==========================================================================
  (function ($) {
	"use strict";

	// Object containing properties for each media type
	var defaults = {
	  youtube: {
		matcher: /(youtube\.com|youtu\.be|youtube\-nocookie\.com)\/(watch\?(.*&)?v=|v\/|u\/|embed\/?)?(videoseries\?list=(.*)|[\w-]{11}|\?listType=(.*)&list=(.*))(.*)/i,
		params: {
		  autoplay: 1,
		  autohide: 1,
		  fs: 1,
		  rel: 0,
		  hd: 1,
		  wmode: "transparent",
		  enablejsapi: 1,
		  html5: 1
		},
		paramPlace: 8,
		type: "iframe",
		url: "https://www.youtube-nocookie.com/embed/$4",
		thumb: "https://img.youtube.com/vi/$4/hqdefault.jpg"
	  },

	  vimeo: {
		matcher: /^.+vimeo.com\/(.*\/)?([\d]+)(.*)?/,
		params: {
		  autoplay: 1,
		  hd: 1,
		  show_title: 1,
		  show_byline: 1,
		  show_portrait: 0,
		  fullscreen: 1
		},
		paramPlace: 3,
		type: "iframe",
		url: "//player.vimeo.com/video/$2"
	  },

	  instagram: {
		matcher: /(instagr\.am|instagram\.com)\/p\/([a-zA-Z0-9_\-]+)\/?/i,
		type: "image",
		url: "//$1/p/$2/media/?size=l"
	  },

	  // Examples:
	  // http://maps.google.com/?ll=48.857995,2.294297&spn=0.007666,0.021136&t=m&z=16
	  // https://www.google.com/maps/@37.7852006,-122.4146355,14.65z
	  // https://www.google.com/maps/@52.2111123,2.9237542,6.61z?hl=en
	  // https://www.google.com/maps/place/Googleplex/@37.4220041,-122.0833494,17z/data=!4m5!3m4!1s0x0:0x6c296c66619367e0!8m2!3d37.4219998!4d-122.0840572
	  gmap_place: {
		matcher: /(maps\.)?google\.([a-z]{2,3}(\.[a-z]{2})?)\/(((maps\/(place\/(.*)\/)?\@(.*),(\d+.?\d+?)z))|(\?ll=))(.*)?/i,
		type: "iframe",
		url: function (rez) {
		  return (
			"//maps.google." +
			rez[2] +
			"/?ll=" +
			(rez[9] ? rez[9] + "&z=" + Math.floor(rez[10]) + (rez[12] ? rez[12].replace(/^\//, "&") : "") : rez[12] + "").replace(/\?/, "&") +
			"&output=" +
			(rez[12] && rez[12].indexOf("layer=c") > 0 ? "svembed" : "embed")
		  );
		}
	  },

	  // Examples:
	  // https://www.google.com/maps/search/Empire+State+Building/
	  // https://www.google.com/maps/search/?api=1&query=centurylink+field
	  // https://www.google.com/maps/search/?api=1&query=47.5951518,-122.3316393
	  gmap_search: {
		matcher: /(maps\.)?google\.([a-z]{2,3}(\.[a-z]{2})?)\/(maps\/search\/)(.*)/i,
		type: "iframe",
		url: function (rez) {
		  return "//maps.google." + rez[2] + "/maps?q=" + rez[5].replace("query=", "q=").replace("api=1", "") + "&output=embed";
		}
	  }
	};

	// Formats matching url to final form
	var format = function (url, rez, params) {
	  if (!url) {
		return;
	  }

	  params = params || "";

	  if ($.type(params) === "object") {
		params = $.param(params, true);
	  }

	  $.each(rez, function (key, value) {
		url = url.replace("$" + key, value || "");
	  });

	  if (params.length) {
		url += (url.indexOf("?") > 0 ? "&" : "?") + params;
	  }

	  return url;
	};

	$(document).on("objectNeedsType.fb", function (e, instance, item) {
	  var url = item.src || "",
		type = false,
		media,
		thumb,
		rez,
		params,
		urlParams,
		paramObj,
		provider;

	  media = $.extend(true, {}, defaults, item.opts.media);

	  // Look for any matching media type
	  $.each(media, function (providerName, providerOpts) {
		rez = url.match(providerOpts.matcher);

		if (!rez) {
		  return;
		}

		type = providerOpts.type;
		provider = providerName;
		paramObj = {};

		if (providerOpts.paramPlace && rez[providerOpts.paramPlace]) {
		  urlParams = rez[providerOpts.paramPlace];

		  if (urlParams[0] == "?") {
			urlParams = urlParams.substring(1);
		  }

		  urlParams = urlParams.split("&");

		  for (var m = 0; m < urlParams.length; ++m) {
			var p = urlParams[m].split("=", 2);

			if (p.length == 2) {
			  paramObj[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
			}
		  }
		}

		params = $.extend(true, {}, providerOpts.params, item.opts[providerName], paramObj);

		url =
		  $.type(providerOpts.url) === "function" ? providerOpts.url.call(this, rez, params, item) : format(providerOpts.url, rez, params);

		thumb =
		  $.type(providerOpts.thumb) === "function" ? providerOpts.thumb.call(this, rez, params, item) : format(providerOpts.thumb, rez);

		if (providerName === "youtube") {
		  url = url.replace(/&t=((\d+)m)?(\d+)s/, function (match, p1, m, s) {
			return "&start=" + ((m ? parseInt(m, 10) * 60 : 0) + parseInt(s, 10));
		  });
		} else if (providerName === "vimeo") {
		  url = url.replace("&%23", "#");
		}

		return false;
	  });

	  // If it is found, then change content type and update the url

	  if (type) {
		if (!item.opts.thumb && !(item.opts.$thumb && item.opts.$thumb.length)) {
		  item.opts.thumb = thumb;
		}

		if (type === "iframe") {
		  item.opts = $.extend(true, item.opts, {
			iframe: {
			  preload: false,
			  attr: {
				scrolling: "no"
			  }
			}
		  });
		}

		$.extend(item, {
		  type: type,
		  src: url,
		  origSrc: item.src,
		  contentSource: provider,
		  contentType: type === "image" ? "image" : provider == "gmap_place" || provider == "gmap_search" ? "map" : "video"
		});
	  } else if (url) {
		item.type = item.opts.defaultType;
	  }
	});

	// Load YouTube/Video API on request to detect when video finished playing
	var VideoAPILoader = {
	  youtube: {
		src: "https://www.youtube.com/iframe_api",
		class: "YT",
		loading: false,
		loaded: false
	  },

	  vimeo: {
		src: "https://player.vimeo.com/api/player.js",
		class: "Vimeo",
		loading: false,
		loaded: false
	  },

	  load: function (vendor) {
		var _this = this,
		  script;

		if (this[vendor].loaded) {
		  setTimeout(function () {
			_this.done(vendor);
		  });
		  return;
		}

		if (this[vendor].loading) {
		  return;
		}

		this[vendor].loading = true;

		script = document.createElement("script");
		script.type = "text/javascript";
		script.src = this[vendor].src;

		if (vendor === "youtube") {
		  window.onYouTubeIframeAPIReady = function () {
			_this[vendor].loaded = true;
			_this.done(vendor);
		  };
		} else {
		  script.onload = function () {
			_this[vendor].loaded = true;
			_this.done(vendor);
		  };
		}

		document.body.appendChild(script);
	  },
	  done: function (vendor) {
		var instance, $el, player;

		if (vendor === "youtube") {
		  delete window.onYouTubeIframeAPIReady;
		}

		instance = $.fancybox.getInstance();

		if (instance) {
		  $el = instance.current.$content.find("iframe");

		  if (vendor === "youtube" && YT !== undefined && YT) {
			player = new YT.Player($el.attr("id"), {
			  events: {
				onStateChange: function (e) {
				  if (e.data == 0) {
					instance.next();
				  }
				}
			  }
			});
		  } else if (vendor === "vimeo" && Vimeo !== undefined && Vimeo) {
			player = new Vimeo.Player($el);

			player.on("ended", function () {
			  instance.next();
			});
		  }
		}
	  }
	};

	$(document).on({
	  "afterShow.fb": function (e, instance, current) {
		if (instance.group.length > 1 && (current.contentSource === "youtube" || current.contentSource === "vimeo")) {
		  VideoAPILoader.load(current.contentSource);
		}
	  }
	});
  })(jQuery);
  // ==========================================================================
  //
  // Guestures
  // Adds touch guestures, handles click and tap events
  //
  // ==========================================================================
  (function (window, document, $) {
	"use strict";

	var requestAFrame = (function () {
	  return (
		window.requestAnimationFrame ||
		window.webkitRequestAnimationFrame ||
		window.mozRequestAnimationFrame ||
		window.oRequestAnimationFrame ||
		// if all else fails, use setTimeout
		function (callback) {
		  return window.setTimeout(callback, 1000 / 60);
		}
	  );
	})();

	var cancelAFrame = (function () {
	  return (
		window.cancelAnimationFrame ||
		window.webkitCancelAnimationFrame ||
		window.mozCancelAnimationFrame ||
		window.oCancelAnimationFrame ||
		function (id) {
		  window.clearTimeout(id);
		}
	  );
	})();

	var getPointerXY = function (e) {
	  var result = [];

	  e = e.originalEvent || e || window.e;
	  e = e.touches && e.touches.length ? e.touches : e.changedTouches && e.changedTouches.length ? e.changedTouches : [e];

	  for (var key in e) {
		if (e[key].pageX) {
		  result.push({
			x: e[key].pageX,
			y: e[key].pageY
		  });
		} else if (e[key].clientX) {
		  result.push({
			x: e[key].clientX,
			y: e[key].clientY
		  });
		}
	  }

	  return result;
	};

	var distance = function (point2, point1, what) {
	  if (!point1 || !point2) {
		return 0;
	  }

	  if (what === "x") {
		return point2.x - point1.x;
	  } else if (what === "y") {
		return point2.y - point1.y;
	  }

	  return Math.sqrt(Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2));
	};

	var isClickable = function ($el) {
	  if (
		$el.is('a,area,button,[role="button"],input,label,select,summary,textarea,video,audio,iframe') ||
		$.isFunction($el.get(0).onclick) ||
		$el.data("selectable")
	  ) {
		return true;
	  }

	  // Check for attributes like data-fancybox-next or data-fancybox-close
	  for (var i = 0, atts = $el[0].attributes, n = atts.length; i < n; i++) {
		if (atts[i].nodeName.substr(0, 14) === "data-fancybox-") {
		  return true;
		}
	  }

	  return false;
	};

	var hasScrollbars = function (el) {
	  var overflowY = window.getComputedStyle(el)["overflow-y"],
		overflowX = window.getComputedStyle(el)["overflow-x"],
		vertical = (overflowY === "scroll" || overflowY === "auto") && el.scrollHeight > el.clientHeight,
		horizontal = (overflowX === "scroll" || overflowX === "auto") && el.scrollWidth > el.clientWidth;

	  return vertical || horizontal;
	};

	var isScrollable = function ($el) {
	  var rez = false;

	  while (true) {
		rez = hasScrollbars($el.get(0));

		if (rez) {
		  break;
		}

		$el = $el.parent();

		if (!$el.length || $el.hasClass("fancybox-stage") || $el.is("body")) {
		  break;
		}
	  }

	  return rez;
	};

	var Guestures = function (instance) {
	  var self = this;

	  self.instance = instance;

	  self.$bg = instance.$refs.bg;
	  self.$stage = instance.$refs.stage;
	  self.$container = instance.$refs.container;

	  self.destroy();

	  self.$container.on("touchstart.fb.touch mousedown.fb.touch", $.proxy(self, "ontouchstart"));
	};

	Guestures.prototype.destroy = function () {
	  var self = this;

	  self.$container.off(".fb.touch");

	  $(document).off(".fb.touch");

	  if (self.requestId) {
		cancelAFrame(self.requestId);
		self.requestId = null;
	  }

	  if (self.tapped) {
		clearTimeout(self.tapped);
		self.tapped = null;
	  }
	};

	Guestures.prototype.ontouchstart = function (e) {
	  var self = this,
		$target = $(e.target),
		instance = self.instance,
		current = instance.current,
		$slide = current.$slide,
		$content = current.$content,
		isTouchDevice = e.type == "touchstart";

	  // Do not respond to both (touch and mouse) events
	  if (isTouchDevice) {
		self.$container.off("mousedown.fb.touch");
	  }

	  // Ignore right click
	  if (e.originalEvent && e.originalEvent.button == 2) {
		return;
	  }

	  // Ignore taping on links, buttons, input elements
	  if (!$slide.length || !$target.length || isClickable($target) || isClickable($target.parent())) {
		return;
	  }
	  // Ignore clicks on the scrollbar
	  if (!$target.is("img") && e.originalEvent.clientX > $target[0].clientWidth + $target.offset().left) {
		return;
	  }

	  // Ignore clicks while zooming or closing
	  if (!current || instance.isAnimating || current.$slide.hasClass("fancybox-animated")) {
		e.stopPropagation();
		e.preventDefault();

		return;
	  }

	  self.realPoints = self.startPoints = getPointerXY(e);

	  if (!self.startPoints.length) {
		return;
	  }

	  // Allow other scripts to catch touch event if "touch" is set to false
	  if (current.touch) {
		e.stopPropagation();
	  }

	  self.startEvent = e;

	  self.canTap = true;
	  self.$target = $target;
	  self.$content = $content;
	  self.opts = current.opts.touch;

	  self.isPanning = false;
	  self.isSwiping = false;
	  self.isZooming = false;
	  self.isScrolling = false;
	  self.canPan = instance.canPan();

	  self.startTime = new Date().getTime();
	  self.distanceX = self.distanceY = self.distance = 0;

	  self.canvasWidth = Math.round($slide[0].clientWidth);
	  self.canvasHeight = Math.round($slide[0].clientHeight);

	  self.contentLastPos = null;
	  self.contentStartPos = $.fancybox.getTranslate(self.$content) || {
		top: 0,
		left: 0
	  };
	  self.sliderStartPos = $.fancybox.getTranslate($slide);

	  // Since position will be absolute, but we need to make it relative to the stage
	  self.stagePos = $.fancybox.getTranslate(instance.$refs.stage);

	  self.sliderStartPos.top -= self.stagePos.top;
	  self.sliderStartPos.left -= self.stagePos.left;

	  self.contentStartPos.top -= self.stagePos.top;
	  self.contentStartPos.left -= self.stagePos.left;

	  $(document)
		.off(".fb.touch")
		.on(isTouchDevice ? "touchend.fb.touch touchcancel.fb.touch" : "mouseup.fb.touch mouseleave.fb.touch", $.proxy(self, "ontouchend"))
		.on(isTouchDevice ? "touchmove.fb.touch" : "mousemove.fb.touch", $.proxy(self, "ontouchmove"));

	  if ($.fancybox.isMobile) {
		document.addEventListener("scroll", self.onscroll, true);
	  }

	  // Skip if clicked outside the sliding area
	  if (!(self.opts || self.canPan) || !($target.is(self.$stage) || self.$stage.find($target).length)) {
		if ($target.is(".fancybox-image")) {
		  e.preventDefault();
		}

		if (!($.fancybox.isMobile && $target.parents(".fancybox-caption").length)) {
		  return;
		}
	  }

	  self.isScrollable = isScrollable($target) || isScrollable($target.parent());

	  // Check if element is scrollable and try to prevent default behavior (scrolling)
	  if (!($.fancybox.isMobile && self.isScrollable)) {
		e.preventDefault();
	  }

	  // One finger or mouse click - swipe or pan an image
	  if (self.startPoints.length === 1 || current.hasError) {
		if (self.canPan) {
		  $.fancybox.stop(self.$content);

		  self.isPanning = true;
		} else {
		  self.isSwiping = true;
		}

		self.$container.addClass("fancybox-is-grabbing");
	  }

	  // Two fingers - zoom image
	  if (self.startPoints.length === 2 && current.type === "image" && (current.isLoaded || current.$ghost)) {
		self.canTap = false;
		self.isSwiping = false;
		self.isPanning = false;

		self.isZooming = true;

		$.fancybox.stop(self.$content);

		self.centerPointStartX = (self.startPoints[0].x + self.startPoints[1].x) * 0.5 - $(window).scrollLeft();
		self.centerPointStartY = (self.startPoints[0].y + self.startPoints[1].y) * 0.5 - $(window).scrollTop();

		self.percentageOfImageAtPinchPointX = (self.centerPointStartX - self.contentStartPos.left) / self.contentStartPos.width;
		self.percentageOfImageAtPinchPointY = (self.centerPointStartY - self.contentStartPos.top) / self.contentStartPos.height;

		self.startDistanceBetweenFingers = distance(self.startPoints[0], self.startPoints[1]);
	  }
	};

	Guestures.prototype.onscroll = function (e) {
	  var self = this;

	  self.isScrolling = true;

	  document.removeEventListener("scroll", self.onscroll, true);
	};

	Guestures.prototype.ontouchmove = function (e) {
	  var self = this;

	  // Make sure user has not released over iframe or disabled element
	  if (e.originalEvent.buttons !== undefined && e.originalEvent.buttons === 0) {
		self.ontouchend(e);
		return;
	  }

	  if (self.isScrolling) {
		self.canTap = false;
		return;
	  }

	  self.newPoints = getPointerXY(e);

	  if (!(self.opts || self.canPan) || !self.newPoints.length || !self.newPoints.length) {
		return;
	  }

	  if (!(self.isSwiping && self.isSwiping === true)) {
		e.preventDefault();
	  }

	  self.distanceX = distance(self.newPoints[0], self.startPoints[0], "x");
	  self.distanceY = distance(self.newPoints[0], self.startPoints[0], "y");

	  self.distance = distance(self.newPoints[0], self.startPoints[0]);

	  // Skip false ontouchmove events (Chrome)
	  if (self.distance > 0) {
		if (self.isSwiping) {
		  self.onSwipe(e);
		} else if (self.isPanning) {
		  self.onPan();
		} else if (self.isZooming) {
		  self.onZoom();
		}
	  }
	};

	Guestures.prototype.onSwipe = function (e) {
	  var self = this,
		instance = self.instance,
		swiping = self.isSwiping,
		left = self.sliderStartPos.left || 0,
		angle;

	  // If direction is not yet determined
	  if (swiping === true) {
		// We need at least 10px distance to correctly calculate an angle
		if (Math.abs(self.distance) > 10) {
		  self.canTap = false;

		  if (instance.group.length < 2 && self.opts.vertical) {
			self.isSwiping = "y";
		  } else if (instance.isDragging || self.opts.vertical === false || (self.opts.vertical === "auto" && $(window).width() > 800)) {
			self.isSwiping = "x";
		  } else {
			angle = Math.abs((Math.atan2(self.distanceY, self.distanceX) * 180) / Math.PI);

			self.isSwiping = angle > 45 && angle < 135 ? "y" : "x";
		  }

		  if (self.isSwiping === "y" && $.fancybox.isMobile && self.isScrollable) {
			self.isScrolling = true;

			return;
		  }

		  instance.isDragging = self.isSwiping;

		  // Reset points to avoid jumping, because we dropped first swipes to calculate the angle
		  self.startPoints = self.newPoints;

		  $.each(instance.slides, function (index, slide) {
			var slidePos, stagePos;

			$.fancybox.stop(slide.$slide);

			slidePos = $.fancybox.getTranslate(slide.$slide);
			stagePos = $.fancybox.getTranslate(instance.$refs.stage);

			slide.$slide
			  .css({
				transform: "",
				opacity: "",
				"transition-duration": ""
			  })
			  .removeClass("fancybox-animated")
			  .removeClass(function (index, className) {
				return (className.match(/(^|\s)fancybox-fx-\S+/g) || []).join(" ");
			  });

			if (slide.pos === instance.current.pos) {
			  self.sliderStartPos.top = slidePos.top - stagePos.top;
			  self.sliderStartPos.left = slidePos.left - stagePos.left;
			}

			$.fancybox.setTranslate(slide.$slide, {
			  top: slidePos.top - stagePos.top,
			  left: slidePos.left - stagePos.left
			});
		  });

		  // Stop slideshow
		  if (instance.SlideShow && instance.SlideShow.isActive) {
			instance.SlideShow.stop();
		  }
		}

		return;
	  }

	  // Sticky edges
	  if (swiping == "x") {
		if (
		  self.distanceX > 0 &&
		  (self.instance.group.length < 2 || (self.instance.current.index === 0 && !self.instance.current.opts.loop))
		) {
		  left = left + Math.pow(self.distanceX, 0.8);
		} else if (
		  self.distanceX < 0 &&
		  (self.instance.group.length < 2 ||
			(self.instance.current.index === self.instance.group.length - 1 && !self.instance.current.opts.loop))
		) {
		  left = left - Math.pow(-self.distanceX, 0.8);
		} else {
		  left = left + self.distanceX;
		}
	  }

	  self.sliderLastPos = {
		top: swiping == "x" ? 0 : self.sliderStartPos.top + self.distanceY,
		left: left
	  };

	  if (self.requestId) {
		cancelAFrame(self.requestId);

		self.requestId = null;
	  }

	  self.requestId = requestAFrame(function () {
		if (self.sliderLastPos) {
		  $.each(self.instance.slides, function (index, slide) {
			var pos = slide.pos - self.instance.currPos;

			$.fancybox.setTranslate(slide.$slide, {
			  top: self.sliderLastPos.top,
			  left: self.sliderLastPos.left + pos * self.canvasWidth + pos * slide.opts.gutter
			});
		  });

		  self.$container.addClass("fancybox-is-sliding");
		}
	  });
	};

	Guestures.prototype.onPan = function () {
	  var self = this;

	  // Prevent accidental movement (sometimes, when tapping casually, finger can move a bit)
	  if (distance(self.newPoints[0], self.realPoints[0]) < ($.fancybox.isMobile ? 10 : 5)) {
		self.startPoints = self.newPoints;
		return;
	  }

	  self.canTap = false;

	  self.contentLastPos = self.limitMovement();

	  if (self.requestId) {
		cancelAFrame(self.requestId);
	  }

	  self.requestId = requestAFrame(function () {
		$.fancybox.setTranslate(self.$content, self.contentLastPos);
	  });
	};

	// Make panning sticky to the edges
	Guestures.prototype.limitMovement = function () {
	  var self = this;

	  var canvasWidth = self.canvasWidth;
	  var canvasHeight = self.canvasHeight;

	  var distanceX = self.distanceX;
	  var distanceY = self.distanceY;

	  var contentStartPos = self.contentStartPos;

	  var currentOffsetX = contentStartPos.left;
	  var currentOffsetY = contentStartPos.top;

	  var currentWidth = contentStartPos.width;
	  var currentHeight = contentStartPos.height;

	  var minTranslateX, minTranslateY, maxTranslateX, maxTranslateY, newOffsetX, newOffsetY;

	  if (currentWidth > canvasWidth) {
		newOffsetX = currentOffsetX + distanceX;
	  } else {
		newOffsetX = currentOffsetX;
	  }

	  newOffsetY = currentOffsetY + distanceY;

	  // Slow down proportionally to traveled distance
	  minTranslateX = Math.max(0, canvasWidth * 0.5 - currentWidth * 0.5);
	  minTranslateY = Math.max(0, canvasHeight * 0.5 - currentHeight * 0.5);

	  maxTranslateX = Math.min(canvasWidth - currentWidth, canvasWidth * 0.5 - currentWidth * 0.5);
	  maxTranslateY = Math.min(canvasHeight - currentHeight, canvasHeight * 0.5 - currentHeight * 0.5);

	  //   ->
	  if (distanceX > 0 && newOffsetX > minTranslateX) {
		newOffsetX = minTranslateX - 1 + Math.pow(-minTranslateX + currentOffsetX + distanceX, 0.8) || 0;
	  }

	  //    <-
	  if (distanceX < 0 && newOffsetX < maxTranslateX) {
		newOffsetX = maxTranslateX + 1 - Math.pow(maxTranslateX - currentOffsetX - distanceX, 0.8) || 0;
	  }

	  //   \/
	  if (distanceY > 0 && newOffsetY > minTranslateY) {
		newOffsetY = minTranslateY - 1 + Math.pow(-minTranslateY + currentOffsetY + distanceY, 0.8) || 0;
	  }

	  //   /\
	  if (distanceY < 0 && newOffsetY < maxTranslateY) {
		newOffsetY = maxTranslateY + 1 - Math.pow(maxTranslateY - currentOffsetY - distanceY, 0.8) || 0;
	  }

	  return {
		top: newOffsetY,
		left: newOffsetX
	  };
	};

	Guestures.prototype.limitPosition = function (newOffsetX, newOffsetY, newWidth, newHeight) {
	  var self = this;

	  var canvasWidth = self.canvasWidth;
	  var canvasHeight = self.canvasHeight;

	  if (newWidth > canvasWidth) {
		newOffsetX = newOffsetX > 0 ? 0 : newOffsetX;
		newOffsetX = newOffsetX < canvasWidth - newWidth ? canvasWidth - newWidth : newOffsetX;
	  } else {
		// Center horizontally
		newOffsetX = Math.max(0, canvasWidth / 2 - newWidth / 2);
	  }

	  if (newHeight > canvasHeight) {
		newOffsetY = newOffsetY > 0 ? 0 : newOffsetY;
		newOffsetY = newOffsetY < canvasHeight - newHeight ? canvasHeight - newHeight : newOffsetY;
	  } else {
		// Center vertically
		newOffsetY = Math.max(0, canvasHeight / 2 - newHeight / 2);
	  }

	  return {
		top: newOffsetY,
		left: newOffsetX
	  };
	};

	Guestures.prototype.onZoom = function () {
	  var self = this;

	  // Calculate current distance between points to get pinch ratio and new width and height
	  var contentStartPos = self.contentStartPos;

	  var currentWidth = contentStartPos.width;
	  var currentHeight = contentStartPos.height;

	  var currentOffsetX = contentStartPos.left;
	  var currentOffsetY = contentStartPos.top;

	  var endDistanceBetweenFingers = distance(self.newPoints[0], self.newPoints[1]);

	  var pinchRatio = endDistanceBetweenFingers / self.startDistanceBetweenFingers;

	  var newWidth = Math.floor(currentWidth * pinchRatio);
	  var newHeight = Math.floor(currentHeight * pinchRatio);

	  // This is the translation due to pinch-zooming
	  var translateFromZoomingX = (currentWidth - newWidth) * self.percentageOfImageAtPinchPointX;
	  var translateFromZoomingY = (currentHeight - newHeight) * self.percentageOfImageAtPinchPointY;

	  // Point between the two touches
	  var centerPointEndX = (self.newPoints[0].x + self.newPoints[1].x) / 2 - $(window).scrollLeft();
	  var centerPointEndY = (self.newPoints[0].y + self.newPoints[1].y) / 2 - $(window).scrollTop();

	  // And this is the translation due to translation of the centerpoint
	  // between the two fingers
	  var translateFromTranslatingX = centerPointEndX - self.centerPointStartX;
	  var translateFromTranslatingY = centerPointEndY - self.centerPointStartY;

	  // The new offset is the old/current one plus the total translation
	  var newOffsetX = currentOffsetX + (translateFromZoomingX + translateFromTranslatingX);
	  var newOffsetY = currentOffsetY + (translateFromZoomingY + translateFromTranslatingY);

	  var newPos = {
		top: newOffsetY,
		left: newOffsetX,
		scaleX: pinchRatio,
		scaleY: pinchRatio
	  };

	  self.canTap = false;

	  self.newWidth = newWidth;
	  self.newHeight = newHeight;

	  self.contentLastPos = newPos;

	  if (self.requestId) {
		cancelAFrame(self.requestId);
	  }

	  self.requestId = requestAFrame(function () {
		$.fancybox.setTranslate(self.$content, self.contentLastPos);
	  });
	};

	Guestures.prototype.ontouchend = function (e) {
	  var self = this;

	  var swiping = self.isSwiping;
	  var panning = self.isPanning;
	  var zooming = self.isZooming;
	  var scrolling = self.isScrolling;

	  self.endPoints = getPointerXY(e);
	  self.dMs = Math.max(new Date().getTime() - self.startTime, 1);

	  self.$container.removeClass("fancybox-is-grabbing");

	  $(document).off(".fb.touch");

	  document.removeEventListener("scroll", self.onscroll, true);

	  if (self.requestId) {
		cancelAFrame(self.requestId);

		self.requestId = null;
	  }

	  self.isSwiping = false;
	  self.isPanning = false;
	  self.isZooming = false;
	  self.isScrolling = false;

	  self.instance.isDragging = false;

	  if (self.canTap) {
		return self.onTap(e);
	  }

	  self.speed = 100;

	  // Speed in px/ms
	  self.velocityX = (self.distanceX / self.dMs) * 0.5;
	  self.velocityY = (self.distanceY / self.dMs) * 0.5;

	  if (panning) {
		self.endPanning();
	  } else if (zooming) {
		self.endZooming();
	  } else {
		self.endSwiping(swiping, scrolling);
	  }

	  return;
	};

	Guestures.prototype.endSwiping = function (swiping, scrolling) {
	  var self = this,
		ret = false,
		len = self.instance.group.length,
		distanceX = Math.abs(self.distanceX),
		canAdvance = swiping == "x" && len > 1 && ((self.dMs > 130 && distanceX > 10) || distanceX > 50),
		speedX = 300;

	  self.sliderLastPos = null;

	  // Close if swiped vertically / navigate if horizontally
	  if (swiping == "y" && !scrolling && Math.abs(self.distanceY) > 50) {
		// Continue vertical movement
		$.fancybox.animate(
		  self.instance.current.$slide, {
			top: self.sliderStartPos.top + self.distanceY + self.velocityY * 150,
			opacity: 0
		  },
		  200
		);
		ret = self.instance.close(true, 250);
	  } else if (canAdvance && self.distanceX > 0) {
		ret = self.instance.previous(speedX);
	  } else if (canAdvance && self.distanceX < 0) {
		ret = self.instance.next(speedX);
	  }

	  if (ret === false && (swiping == "x" || swiping == "y")) {
		self.instance.centerSlide(200);
	  }

	  self.$container.removeClass("fancybox-is-sliding");
	};

	// Limit panning from edges
	// ========================
	Guestures.prototype.endPanning = function () {
	  var self = this,
		newOffsetX,
		newOffsetY,
		newPos;

	  if (!self.contentLastPos) {
		return;
	  }

	  if (self.opts.momentum === false || self.dMs > 350) {
		newOffsetX = self.contentLastPos.left;
		newOffsetY = self.contentLastPos.top;
	  } else {
		// Continue movement
		newOffsetX = self.contentLastPos.left + self.velocityX * 500;
		newOffsetY = self.contentLastPos.top + self.velocityY * 500;
	  }

	  newPos = self.limitPosition(newOffsetX, newOffsetY, self.contentStartPos.width, self.contentStartPos.height);

	  newPos.width = self.contentStartPos.width;
	  newPos.height = self.contentStartPos.height;

	  $.fancybox.animate(self.$content, newPos, 366);
	};

	Guestures.prototype.endZooming = function () {
	  var self = this;

	  var current = self.instance.current;

	  var newOffsetX, newOffsetY, newPos, reset;

	  var newWidth = self.newWidth;
	  var newHeight = self.newHeight;

	  if (!self.contentLastPos) {
		return;
	  }

	  newOffsetX = self.contentLastPos.left;
	  newOffsetY = self.contentLastPos.top;

	  reset = {
		top: newOffsetY,
		left: newOffsetX,
		width: newWidth,
		height: newHeight,
		scaleX: 1,
		scaleY: 1
	  };

	  // Reset scalex/scaleY values; this helps for perfomance and does not break animation
	  $.fancybox.setTranslate(self.$content, reset);

	  if (newWidth < self.canvasWidth && newHeight < self.canvasHeight) {
		self.instance.scaleToFit(150);
	  } else if (newWidth > current.width || newHeight > current.height) {
		self.instance.scaleToActual(self.centerPointStartX, self.centerPointStartY, 150);
	  } else {
		newPos = self.limitPosition(newOffsetX, newOffsetY, newWidth, newHeight);

		$.fancybox.animate(self.$content, newPos, 150);
	  }
	};

	Guestures.prototype.onTap = function (e) {
	  var self = this;
	  var $target = $(e.target);

	  var instance = self.instance;
	  var current = instance.current;

	  var endPoints = (e && getPointerXY(e)) || self.startPoints;

	  var tapX = endPoints[0] ? endPoints[0].x - $(window).scrollLeft() - self.stagePos.left : 0;
	  var tapY = endPoints[0] ? endPoints[0].y - $(window).scrollTop() - self.stagePos.top : 0;

	  var where;

	  var process = function (prefix) {
		var action = current.opts[prefix];

		if ($.isFunction(action)) {
		  action = action.apply(instance, [current, e]);
		}

		if (!action) {
		  return;
		}

		switch (action) {
		  case "close":
			instance.close(self.startEvent);

			break;

		  case "toggleControls":
			instance.toggleControls();

			break;

		  case "next":
			instance.next();

			break;

		  case "nextOrClose":
			if (instance.group.length > 1) {
			  instance.next();
			} else {
			  instance.close(self.startEvent);
			}

			break;

		  case "zoom":
			if (current.type == "image" && (current.isLoaded || current.$ghost)) {
			  if (instance.canPan()) {
				instance.scaleToFit();
			  } else if (instance.isScaledDown()) {
				instance.scaleToActual(tapX, tapY);
			  } else if (instance.group.length < 2) {
				instance.close(self.startEvent);
			  }
			}

			break;
		}
	  };

	  // Ignore right click
	  if (e.originalEvent && e.originalEvent.button == 2) {
		return;
	  }

	  // Skip if clicked on the scrollbar
	  if (!$target.is("img") && tapX > $target[0].clientWidth + $target.offset().left) {
		return;
	  }

	  // Check where is clicked
	  if ($target.is(".fancybox-bg,.fancybox-inner,.fancybox-outer,.fancybox-container")) {
		where = "Outside";
	  } else if ($target.is(".fancybox-slide")) {
		where = "Slide";
	  } else if (
		instance.current.$content &&
		instance.current.$content
		.find($target)
		.addBack()
		.filter($target).length
	  ) {
		where = "Content";
	  } else {
		return;
	  }

	  // Check if this is a double tap
	  if (self.tapped) {
		// Stop previously created single tap
		clearTimeout(self.tapped);
		self.tapped = null;

		// Skip if distance between taps is too big
		if (Math.abs(tapX - self.tapX) > 50 || Math.abs(tapY - self.tapY) > 50) {
		  return this;
		}

		// OK, now we assume that this is a double-tap
		process("dblclick" + where);
	  } else {
		// Single tap will be processed if user has not clicked second time within 300ms
		// or there is no need to wait for double-tap
		self.tapX = tapX;
		self.tapY = tapY;

		if (current.opts["dblclick" + where] && current.opts["dblclick" + where] !== current.opts["click" + where]) {
		  self.tapped = setTimeout(function () {
			self.tapped = null;

			if (!instance.isAnimating) {
			  process("click" + where);
			}
		  }, 500);
		} else {
		  process("click" + where);
		}
	  }

	  return this;
	};

	$(document)
	  .on("onActivate.fb", function (e, instance) {
		if (instance && !instance.Guestures) {
		  instance.Guestures = new Guestures(instance);
		}
	  })
	  .on("beforeClose.fb", function (e, instance) {
		if (instance && instance.Guestures) {
		  instance.Guestures.destroy();
		}
	  });
  })(window, document, jQuery);
  // ==========================================================================
  //
  // SlideShow
  // Enables slideshow functionality
  //
  // Example of usage:
  // $.fancybox.getInstance().SlideShow.start()
  //
  // ==========================================================================
  (function (document, $) {
	"use strict";

	$.extend(true, $.fancybox.defaults, {
	  btnTpl: {
		slideShow: '<button data-fancybox-play class="fancybox-button fancybox-button--play" title="{{PLAY_START}}">' +
		  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M6.5 5.4v13.2l11-6.6z"/></svg>' +
		  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M8.33 5.75h2.2v12.5h-2.2V5.75zm5.15 0h2.2v12.5h-2.2V5.75z"/></svg>' +
		  "</button>"
	  },
	  slideShow: {
		autoStart: false,
		speed: 3000,
		progress: true
	  }
	});

	var SlideShow = function (instance) {
	  this.instance = instance;
	  this.init();
	};

	$.extend(SlideShow.prototype, {
	  timer: null,
	  isActive: false,
	  $button: null,

	  init: function () {
		var self = this,
		  instance = self.instance,
		  opts = instance.group[instance.currIndex].opts.slideShow;

		self.$button = instance.$refs.toolbar.find("[data-fancybox-play]").on("click", function () {
		  self.toggle();
		});

		if (instance.group.length < 2 || !opts) {
		  self.$button.hide();
		} else if (opts.progress) {
		  self.$progress = $('<div class="fancybox-progress"></div>').appendTo(instance.$refs.inner);
		}
	  },

	  set: function (force) {
		var self = this,
		  instance = self.instance,
		  current = instance.current;

		// Check if reached last element
		if (current && (force === true || current.opts.loop || instance.currIndex < instance.group.length - 1)) {
		  if (self.isActive && current.contentType !== "video") {
			if (self.$progress) {
			  $.fancybox.animate(self.$progress.show(), {
				scaleX: 1
			  }, current.opts.slideShow.speed);
			}

			self.timer = setTimeout(function () {
			  if (!instance.current.opts.loop && instance.current.index == instance.group.length - 1) {
				instance.jumpTo(0);
			  } else {
				instance.next();
			  }
			}, current.opts.slideShow.speed);
		  }
		} else {
		  self.stop();
		  instance.idleSecondsCounter = 0;
		  instance.showControls();
		}
	  },

	  clear: function () {
		var self = this;

		clearTimeout(self.timer);

		self.timer = null;

		if (self.$progress) {
		  self.$progress.removeAttr("style").hide();
		}
	  },

	  start: function () {
		var self = this,
		  current = self.instance.current;

		if (current) {
		  self.$button
			.attr("title", (current.opts.i18n[current.opts.lang] || current.opts.i18n.en).PLAY_STOP)
			.removeClass("fancybox-button--play")
			.addClass("fancybox-button--pause");

		  self.isActive = true;

		  if (current.isComplete) {
			self.set(true);
		  }

		  self.instance.trigger("onSlideShowChange", true);
		}
	  },

	  stop: function () {
		var self = this,
		  current = self.instance.current;

		self.clear();

		self.$button
		  .attr("title", (current.opts.i18n[current.opts.lang] || current.opts.i18n.en).PLAY_START)
		  .removeClass("fancybox-button--pause")
		  .addClass("fancybox-button--play");

		self.isActive = false;

		self.instance.trigger("onSlideShowChange", false);

		if (self.$progress) {
		  self.$progress.removeAttr("style").hide();
		}
	  },

	  toggle: function () {
		var self = this;

		if (self.isActive) {
		  self.stop();
		} else {
		  self.start();
		}
	  }
	});

	$(document).on({
	  "onInit.fb": function (e, instance) {
		if (instance && !instance.SlideShow) {
		  instance.SlideShow = new SlideShow(instance);
		}
	  },

	  "beforeShow.fb": function (e, instance, current, firstRun) {
		var SlideShow = instance && instance.SlideShow;

		if (firstRun) {
		  if (SlideShow && current.opts.slideShow.autoStart) {
			SlideShow.start();
		  }
		} else if (SlideShow && SlideShow.isActive) {
		  SlideShow.clear();
		}
	  },

	  "afterShow.fb": function (e, instance, current) {
		var SlideShow = instance && instance.SlideShow;

		if (SlideShow && SlideShow.isActive) {
		  SlideShow.set();
		}
	  },

	  "afterKeydown.fb": function (e, instance, current, keypress, keycode) {
		var SlideShow = instance && instance.SlideShow;

		// "P" or Spacebar
		if (SlideShow && current.opts.slideShow && (keycode === 80 || keycode === 32) && !$(document.activeElement).is("button,a,input")) {
		  keypress.preventDefault();

		  SlideShow.toggle();
		}
	  },

	  "beforeClose.fb onDeactivate.fb": function (e, instance) {
		var SlideShow = instance && instance.SlideShow;

		if (SlideShow) {
		  SlideShow.stop();
		}
	  }
	});

	// Page Visibility API to pause slideshow when window is not active
	$(document).on("visibilitychange", function () {
	  if ( $.fancybox.version != '3.5.7' ) {
		  return;
	  }

	  var instance = $.fancybox.getInstance(),
		SlideShow = instance && instance.SlideShow;

	  if (SlideShow && SlideShow.isActive) {
		if (document.hidden) {
		  SlideShow.clear();
		} else {
		  SlideShow.set();
		}
	  }
	});
  })(document, jQuery);
  // ==========================================================================
  //
  // FullScreen
  // Adds fullscreen functionality
  //
  // ==========================================================================
  (function (document, $) {
	"use strict";

	// Collection of methods supported by user browser
	var fn = (function () {
	  var fnMap = [
		["requestFullscreen", "exitFullscreen", "fullscreenElement", "fullscreenEnabled", "fullscreenchange", "fullscreenerror"],
		// new WebKit
		[
		  "webkitRequestFullscreen",
		  "webkitExitFullscreen",
		  "webkitFullscreenElement",
		  "webkitFullscreenEnabled",
		  "webkitfullscreenchange",
		  "webkitfullscreenerror"
		],
		// old WebKit (Safari 5.1)
		[
		  "webkitRequestFullScreen",
		  "webkitCancelFullScreen",
		  "webkitCurrentFullScreenElement",
		  "webkitCancelFullScreen",
		  "webkitfullscreenchange",
		  "webkitfullscreenerror"
		],
		[
		  "mozRequestFullScreen",
		  "mozCancelFullScreen",
		  "mozFullScreenElement",
		  "mozFullScreenEnabled",
		  "mozfullscreenchange",
		  "mozfullscreenerror"
		],
		["msRequestFullscreen", "msExitFullscreen", "msFullscreenElement", "msFullscreenEnabled", "MSFullscreenChange", "MSFullscreenError"]
	  ];

	  var ret = {};

	  for (var i = 0; i < fnMap.length; i++) {
		var val = fnMap[i];

		if (val && val[1] in document) {
		  for (var j = 0; j < val.length; j++) {
			ret[fnMap[0][j]] = val[j];
		  }

		  return ret;
		}
	  }

	  return false;
	})();

	if (fn) {
	  var FullScreen = {
		request: function (elem) {
		  elem = elem || document.documentElement;

		  elem[fn.requestFullscreen](elem.ALLOW_KEYBOARD_INPUT);
		},
		exit: function () {
		  document[fn.exitFullscreen]();
		},
		toggle: function (elem) {
		  elem = elem || document.documentElement;

		  if (this.isFullscreen()) {
			this.exit();
		  } else {
			this.request(elem);
		  }
		},
		isFullscreen: function () {
		  return Boolean(document[fn.fullscreenElement]);
		},
		enabled: function () {
		  return Boolean(document[fn.fullscreenEnabled]);
		}
	  };

	  $.extend(true, $.fancybox.defaults, {
		btnTpl: {
		  fullScreen: '<button data-fancybox-fullscreen class="fancybox-button fancybox-button--fsenter" title="{{FULL_SCREEN}}">' +
			'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>' +
			'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M5 16h3v3h2v-5H5zm3-8H5v2h5V5H8zm6 11h2v-3h3v-2h-5zm2-11V5h-2v5h5V8z"/></svg>' +
			"</button>"
		},
		fullScreen: {
		  autoStart: false
		}
	  });

	  $(document).on(fn.fullscreenchange, function () {
		var isFullscreen = FullScreen.isFullscreen(),
		  instance = $.fancybox.getInstance();

		if (instance) {
		  // If image is zooming, then force to stop and reposition properly
		  if (instance.current && instance.current.type === "image" && instance.isAnimating) {
			instance.isAnimating = false;

			instance.update(true, true, 0);

			if (!instance.isComplete) {
			  instance.complete();
			}
		  }

		  instance.trigger("onFullscreenChange", isFullscreen);

		  instance.$refs.container.toggleClass("fancybox-is-fullscreen", isFullscreen);

		  instance.$refs.toolbar
			.find("[data-fancybox-fullscreen]")
			.toggleClass("fancybox-button--fsenter", !isFullscreen)
			.toggleClass("fancybox-button--fsexit", isFullscreen);
		}
	  });
	}

	$(document).on({
	  "onInit.fb": function (e, instance) {
		var $container;

		if (!fn) {
		  instance.$refs.toolbar.find("[data-fancybox-fullscreen]").remove();

		  return;
		}

		if (instance && instance.group[instance.currIndex].opts.fullScreen) {
		  $container = instance.$refs.container;

		  $container.on("click.fb-fullscreen", "[data-fancybox-fullscreen]", function (e) {
			e.stopPropagation();
			e.preventDefault();

			FullScreen.toggle();
		  });

		  if (instance.opts.fullScreen && instance.opts.fullScreen.autoStart === true) {
			FullScreen.request();
		  }

		  // Expose API
		  instance.FullScreen = FullScreen;
		} else if (instance) {
		  instance.$refs.toolbar.find("[data-fancybox-fullscreen]").hide();
		}
	  },

	  "afterKeydown.fb": function (e, instance, current, keypress, keycode) {
		// "F"
		if (instance && instance.FullScreen && keycode === 70) {
		  keypress.preventDefault();

		  instance.FullScreen.toggle();
		}
	  },

	  "beforeClose.fb": function (e, instance) {
		if (instance && instance.FullScreen && instance.$refs.container.hasClass("fancybox-is-fullscreen")) {
		  FullScreen.exit();
		}
	  }
	});
  })(document, jQuery);
  // ==========================================================================
  //
  // Thumbs
  // Displays thumbnails in a grid
  //
  // ==========================================================================
  (function (document, $) {
	"use strict";

	var CLASS = "fancybox-thumbs",
	  CLASS_ACTIVE = CLASS + "-active";

	// Make sure there are default values
	$.fancybox.defaults = $.extend(
	  true, {
		btnTpl: {
		  thumbs: '<button data-fancybox-thumbs class="fancybox-button fancybox-button--thumbs" title="{{THUMBS}}">' +
			'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M14.59 14.59h3.76v3.76h-3.76v-3.76zm-4.47 0h3.76v3.76h-3.76v-3.76zm-4.47 0h3.76v3.76H5.65v-3.76zm8.94-4.47h3.76v3.76h-3.76v-3.76zm-4.47 0h3.76v3.76h-3.76v-3.76zm-4.47 0h3.76v3.76H5.65v-3.76zm8.94-4.47h3.76v3.76h-3.76V5.65zm-4.47 0h3.76v3.76h-3.76V5.65zm-4.47 0h3.76v3.76H5.65V5.65z"/></svg>' +
			"</button>"
		},
		thumbs: {
		  autoStart: false, // Display thumbnails on opening
		  hideOnClose: true, // Hide thumbnail grid when closing animation starts
		  parentEl: ".fancybox-container", // Container is injected into this element
		  axis: "y" // Vertical (y) or horizontal (x) scrolling
		}
	  },
	  $.fancybox.defaults
	);

	var FancyThumbs = function (instance) {
	  this.init(instance);
	};

	$.extend(FancyThumbs.prototype, {
	  $button: null,
	  $grid: null,
	  $list: null,
	  isVisible: false,
	  isActive: false,

	  init: function (instance) {
		var self = this,
		  group = instance.group,
		  enabled = 0;

		self.instance = instance;
		self.opts = group[instance.currIndex].opts.thumbs;

		instance.Thumbs = self;

		self.$button = instance.$refs.toolbar.find("[data-fancybox-thumbs]");

		// Enable thumbs if at least two group items have thumbnails
		for (var i = 0, len = group.length; i < len; i++) {
		  if (group[i].thumb) {
			enabled++;
		  }

		  if (enabled > 1) {
			break;
		  }
		}

		if (enabled > 1 && !!self.opts) {
		  self.$button.removeAttr("style").on("click", function () {
			self.toggle();
		  });

		  self.isActive = true;
		} else {
		  self.$button.hide();
		}
	  },

	  create: function () {
		var self = this,
		  instance = self.instance,
		  parentEl = self.opts.parentEl,
		  list = [],
		  src;

		if (!self.$grid) {
		  // Create main element
		  self.$grid = $('<div class="' + CLASS + " " + CLASS + "-" + self.opts.axis + '"></div>').appendTo(
			instance.$refs.container
			.find(parentEl)
			.addBack()
			.filter(parentEl)
		  );

		  // Add "click" event that performs gallery navigation
		  self.$grid.on("click", "a", function () {
			instance.jumpTo($(this).attr("data-index"));
		  });
		}

		// Build the list
		if (!self.$list) {
		  self.$list = $('<div class="' + CLASS + '__list">').appendTo(self.$grid);
		}

		$.each(instance.group, function (i, item) {
		  src = item.thumb;

		  if (!src && item.type === "image") {
			src = item.src;
		  }

		  list.push(
			'<a href="javascript:;" tabindex="0" data-index="' +
			i +
			'"' +
			(src && src.length ? ' style="background-image:url(' + src + ')"' : 'class="fancybox-thumbs-missing"') +
			"></a>"
		  );
		});

		self.$list[0].innerHTML = list.join("");

		if (self.opts.axis === "x") {
		  // Set fixed width for list element to enable horizontal scrolling
		  self.$list.width(
			parseInt(self.$grid.css("padding-right"), 10) +
			instance.group.length *
			self.$list
			.children()
			.eq(0)
			.outerWidth(true)
		  );
		}
	  },

	  focus: function (duration) {
		var self = this,
		  $list = self.$list,
		  $grid = self.$grid,
		  thumb,
		  thumbPos;

		if (!self.instance.current) {
		  return;
		}

		thumb = $list
		  .children()
		  .removeClass(CLASS_ACTIVE)
		  .filter('[data-index="' + self.instance.current.index + '"]')
		  .addClass(CLASS_ACTIVE);

		thumbPos = thumb.position();

		// Check if need to scroll to make current thumb visible
		if (self.opts.axis === "y" && (thumbPos.top < 0 || thumbPos.top > $list.height() - thumb.outerHeight())) {
		  $list.stop().animate({
			  scrollTop: $list.scrollTop() + thumbPos.top
			},
			duration
		  );
		} else if (
		  self.opts.axis === "x" &&
		  (thumbPos.left < $grid.scrollLeft() || thumbPos.left > $grid.scrollLeft() + ($grid.width() - thumb.outerWidth()))
		) {
		  $list
			.parent()
			.stop()
			.animate({
				scrollLeft: thumbPos.left
			  },
			  duration
			);
		}
	  },

	  update: function () {
		var that = this;
		that.instance.$refs.container.toggleClass("fancybox-show-thumbs", this.isVisible);

		if (that.isVisible) {
		  if (!that.$grid) {
			that.create();
		  }

		  that.instance.trigger("onThumbsShow");

		  that.focus(0);
		} else if (that.$grid) {
		  that.instance.trigger("onThumbsHide");
		}

		// Update content position
		that.instance.update();
	  },

	  hide: function () {
		this.isVisible = false;
		this.update();
	  },

	  show: function () {
		this.isVisible = true;
		this.update();
	  },

	  toggle: function () {
		this.isVisible = !this.isVisible;
		this.update();
	  }
	});

	$(document).on({
	  "onInit.fb": function (e, instance) {
		var Thumbs;

		if (instance && !instance.Thumbs) {
		  Thumbs = new FancyThumbs(instance);

		  if (Thumbs.isActive && Thumbs.opts.autoStart === true) {
			Thumbs.show();
		  }
		}
	  },

	  "beforeShow.fb": function (e, instance, item, firstRun) {
		var Thumbs = instance && instance.Thumbs;

		if (Thumbs && Thumbs.isVisible) {
		  Thumbs.focus(firstRun ? 0 : 250);
		}
	  },

	  "afterKeydown.fb": function (e, instance, current, keypress, keycode) {
		var Thumbs = instance && instance.Thumbs;

		// "G"
		if (Thumbs && Thumbs.isActive && keycode === 71) {
		  keypress.preventDefault();

		  Thumbs.toggle();
		}
	  },

	  "beforeClose.fb": function (e, instance) {
		var Thumbs = instance && instance.Thumbs;

		if (Thumbs && Thumbs.isVisible && Thumbs.opts.hideOnClose !== false) {
		  Thumbs.$grid.hide();
		}
	  }
	});
  })(document, jQuery);
  //// ==========================================================================
  //
  // Share
  // Displays simple form for sharing current url
  //
  // ==========================================================================
  (function (document, $) {
	"use strict";

	$.extend(true, $.fancybox.defaults, {
	  btnTpl: {
		share: '<button data-fancybox-share class="fancybox-button fancybox-button--share" title="{{SHARE}}">' +
		  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M2.55 19c1.4-8.4 9.1-9.8 11.9-9.8V5l7 7-7 6.3v-3.5c-2.8 0-10.5 2.1-11.9 4.2z"/></svg>' +
		  "</button>"
	  },
	  share: {
		url: function (instance, item) {
		  return (
			(!instance.currentHash && !(item.type === "inline" || item.type === "html") ? item.origSrc || item.src : false) || window.location
		  );
		},
		tpl: '<div class="fancybox-share">' +
		  "<h1>{{SHARE}}</h1>" +
		  "<p>" +
		  '<a class="fancybox-share__button fancybox-share__button--fb" href="https://www.facebook.com/sharer/sharer.php?u={{url}}">' +
		  '<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><path d="m287 456v-299c0-21 6-35 35-35h38v-63c-7-1-29-3-55-3-54 0-91 33-91 94v306m143-254h-205v72h196" /></svg>' +
		  "<span>Facebook</span>" +
		  "</a>" +
		  '<a class="fancybox-share__button fancybox-share__button--tw" href="https://twitter.com/intent/tweet?url={{url}}&text={{descr}}">' +
		  '<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><path d="m456 133c-14 7-31 11-47 13 17-10 30-27 37-46-15 10-34 16-52 20-61-62-157-7-141 75-68-3-129-35-169-85-22 37-11 86 26 109-13 0-26-4-37-9 0 39 28 72 65 80-12 3-25 4-37 2 10 33 41 57 77 57-42 30-77 38-122 34 170 111 378-32 359-208 16-11 30-25 41-42z" /></svg>' +
		  "<span>Twitter</span>" +
		  "</a>" +
		  '<a class="fancybox-share__button fancybox-share__button--pt" href="https://www.pinterest.com/pin/create/button/?url={{url}}&description={{descr}}&media={{media}}">' +
		  '<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><path d="m265 56c-109 0-164 78-164 144 0 39 15 74 47 87 5 2 10 0 12-5l4-19c2-6 1-8-3-13-9-11-15-25-15-45 0-58 43-110 113-110 62 0 96 38 96 88 0 67-30 122-73 122-24 0-42-19-36-44 6-29 20-60 20-81 0-19-10-35-31-35-25 0-44 26-44 60 0 21 7 36 7 36l-30 125c-8 37-1 83 0 87 0 3 4 4 5 2 2-3 32-39 42-75l16-64c8 16 31 29 56 29 74 0 124-67 124-157 0-69-58-132-146-132z" fill="#fff"/></svg>' +
		  "<span>Pinterest</span>" +
		  "</a>" +
		  "</p>" +
		  '<p><input class="fancybox-share__input" type="text" value="{{url_raw}}" onclick="select()" /></p>' +
		  "</div>"
	  }
	});

	function escapeHtml(string) {
	  var entityMap = {
		"&": "&amp;",
		"<": "&lt;",
		">": "&gt;",
		'"': "&quot;",
		"'": "&#39;",
		"/": "&#x2F;",
		"`": "&#x60;",
		"=": "&#x3D;"
	  };

	  return String(string).replace(/[&<>"'`=\/]/g, function (s) {
		return entityMap[s];
	  });
	}

	$(document).on("click", "[data-fancybox-share]", function () {
	  var instance = $.fancybox.getInstance(),
		current = instance.current || null,
		url,
		tpl;

	  if (!current) {
		return;
	  }

	  if ($.type(current.opts.share.url) === "function") {
		url = current.opts.share.url.apply(current, [instance, current]);
	  }

	  tpl = current.opts.share.tpl
		.replace(/\{\{media\}\}/g, current.type === "image" ? encodeURIComponent(current.src) : "")
		.replace(/\{\{url\}\}/g, encodeURIComponent(url))
		.replace(/\{\{url_raw\}\}/g, escapeHtml(url))
		.replace(/\{\{descr\}\}/g, instance.$caption ? encodeURIComponent(instance.$caption.text()) : "");

	  $.fancybox.open({
		src: instance.translate(instance, tpl),
		type: "html",
		opts: {
		  touch: false,
		  animationEffect: false,
		  afterLoad: function (shareInstance, shareCurrent) {
			// Close self if parent instance is closing
			instance.$refs.container.one("beforeClose.fb", function () {
			  shareInstance.close(null, 0);
			});

			// Opening links in a popup window
			shareCurrent.$content.find(".fancybox-share__button").on('click',function () {
			  window.open(this.href, "Share", "width=550, height=450");
			  return false;
			});
		  },
		  mobile: {
			autoFocus: false
		  }
		}
	  });
	});
  })(document, jQuery);
  // ==========================================================================
  //
  // Hash
  // Enables linking to each modal
  //
  // ==========================================================================
  (function (window, document, $) {
	"use strict";

	// Simple $.escapeSelector polyfill (for jQuery prior v3)
	if (!$.escapeSelector) {
	  $.escapeSelector = function (sel) {
		var rcssescape = /([\0-\x1f\x7f]|^-?\d)|^-$|[^\x80-\uFFFF\w-]/g;
		var fcssescape = function (ch, asCodePoint) {
		  if (asCodePoint) {
			// U+0000 NULL becomes U+FFFD REPLACEMENT CHARACTER
			if (ch === "\0") {
			  return "\uFFFD";
			}

			// Control characters and (dependent upon position) numbers get escaped as code points
			return ch.slice(0, -1) + "\\" + ch.charCodeAt(ch.length - 1).toString(16) + " ";
		  }

		  // Other potentially-special ASCII characters get backslash-escaped
		  return "\\" + ch;
		};

		return (sel + "").replace(rcssescape, fcssescape);
	  };
	}

	// Get info about gallery name and current index from url
	function parseUrl() {
	  var hash = window.location.hash.substr(1),
		rez = hash.split("-"),
		index = rez.length > 1 && /^\+?\d+$/.test(rez[rez.length - 1]) ? parseInt(rez.pop(-1), 10) || 1 : 1,
		gallery = rez.join("-");

	  return {
		hash: hash,
		/* Index is starting from 1 */
		index: index < 1 ? 1 : index,
		gallery: gallery
	  };
	}

	// Trigger click evnt on links to open new fancyBox instance
	function triggerFromUrl(url) {
	  if (url.gallery !== "") {
		// If we can find element matching 'data-fancybox' atribute,
		// then triggering click event should start fancyBox
		$("[data-fancybox='" + $.escapeSelector(url.gallery) + "']")
		  .eq(url.index - 1)
		  .focus()
		  .trigger("click.fb-start");
	  }
	}

	// Get gallery name from current instance
	function getGalleryID(instance) {
	  var opts, ret;

	  if (!instance) {
		return false;
	  }

	  opts = instance.current ? instance.current.opts : instance.opts;
	  ret = opts.hash || (opts.$orig ? opts.$orig.data("fancybox") || opts.$orig.data("fancybox-trigger") : "");

	  return ret === "" ? false : ret;
	}

	// Start when DOM becomes ready
	$(function () {
	  if ( $.fancybox.version != '3.5.7' ) {
		  return;
	  }

	  // Check if user has disabled this module
	  if ($.fancybox.defaults.hash === false) {
		return;
	  }

	  // Update hash when opening/closing fancyBox
	  $(document).on({
		"onInit.fb": function (e, instance) {
		  var url, gallery;

		  if (instance.group[instance.currIndex].opts.hash === false) {
			return;
		  }

		  url = parseUrl();
		  gallery = getGalleryID(instance);

		  // Make sure gallery start index matches index from hash
		  if (gallery && url.gallery && gallery == url.gallery) {
			instance.currIndex = url.index - 1;
		  }
		},

		"beforeShow.fb": function (e, instance, current, firstRun) {
		  var gallery;

		  if (!current || current.opts.hash === false) {
			return;
		  }

		  // Check if need to update window hash
		  gallery = getGalleryID(instance);

		  if (!gallery) {
			return;
		  }

		  // Variable containing last hash value set by fancyBox
		  // It will be used to determine if fancyBox needs to close after hash change is detected
		  instance.currentHash = gallery + (instance.group.length > 1 ? "-" + (current.index + 1) : "");

		  // If current hash is the same (this instance most likely is opened by hashchange), then do nothing
		  if (window.location.hash === "#" + instance.currentHash) {
			return;
		  }

		  if (firstRun && !instance.origHash) {
			instance.origHash = window.location.hash;
		  }

		  if (instance.hashTimer) {
			clearTimeout(instance.hashTimer);
		  }

		  // Update hash
		  instance.hashTimer = setTimeout(function () {
			if ("replaceState" in window.history) {
			  window.history[firstRun ? "pushState" : "replaceState"]({},
				document.title,
				window.location.pathname + window.location.search + "#" + instance.currentHash
			  );

			  if (firstRun) {
				instance.hasCreatedHistory = true;
			  }
			} else {
			  window.location.hash = instance.currentHash;
			}

			instance.hashTimer = null;
		  }, 300);
		},

		"beforeClose.fb": function (e, instance, current) {
		  if (!current || current.opts.hash === false) {
			return;
		  }

		  clearTimeout(instance.hashTimer);

		  // Goto previous history entry
		  if (instance.currentHash && instance.hasCreatedHistory) {
			window.history.back();
		  } else if (instance.currentHash) {
			if ("replaceState" in window.history) {
			  window.history.replaceState({}, document.title, window.location.pathname + window.location.search + (instance.origHash || ""));
			} else {
			  window.location.hash = instance.origHash;
			}
		  }

		  instance.currentHash = null;
		}
	  });

	  // Check if need to start/close after url has changed
	  $(window).on("hashchange.fb", function () {
		var url = parseUrl(),
		  fb = null;

		// Find last fancyBox instance that has "hash"
		$.each(
		  $(".fancybox-container")
		  .get()
		  .reverse(),
		  function (index, value) {
			var tmp = $(value).data("FancyBox");

			if (tmp && tmp.currentHash) {
			  fb = tmp;
			  return false;
			}
		  }
		);

		if (fb) {
		  // Now, compare hash values
		  if (fb.currentHash !== url.gallery + "-" + url.index && !(url.index === 1 && fb.currentHash == url.gallery)) {
			fb.currentHash = null;

			fb.close();
		  }
		} else if (url.gallery !== "") {
		  triggerFromUrl(url);
		}
	  });

	  // Check current hash and trigger click event on matching element to start fancyBox, if needed
	  setTimeout(function () {
		if ( $.fancybox.version != '3.5.7' ) {
			return;
		}

		if (!$.fancybox.getInstance()) {
		  triggerFromUrl(parseUrl());
		}
	  }, 50);
	});
  })(window, document, jQuery);
  // ==========================================================================
  //
  // Wheel
  // Basic mouse weheel support for gallery navigation
  //
  // ==========================================================================
  (function (document, $) {
	"use strict";

	var prevTime = new Date().getTime();

	$(document).on({
	  "onInit.fb": function (e, instance, current) {
		instance.$refs.stage.on("mousewheel DOMMouseScroll wheel MozMousePixelScroll", function (e) {
		  var current = instance.current,
			currTime = new Date().getTime();

		  if (instance.group.length < 2 || current.opts.wheel === false || (current.opts.wheel === "auto" && current.type !== "image")) {
			return;
		  }

		  e.preventDefault();
		  e.stopPropagation();

		  if (current.$slide.hasClass("fancybox-animated")) {
			return;
		  }

		  e = e.originalEvent || e;

		  if (currTime - prevTime < 250) {
			return;
		  }

		  prevTime = currTime;

		  instance[(-e.deltaY || -e.deltaX || e.wheelDelta || -e.detail) < 0 ? "next" : "previous"]();
		});
	  }
	});
  })(document, jQuery);

;
(function ($, window, document, undefined) {

  var pluginName = "MegaMenu",
    defaults = {
      propertyName: "value"
    };

  // Set delay time for mouseout
  var delayOut = 400; // Default delay time is 200

  // the list of menus
  var menus = [];

  function CustomMenu(element, options) {
    this.element = element;

    this.options = $.extend({}, defaults, options);

    this._defaults = defaults;
    this._name = pluginName;

    this.init();
  }

  CustomMenu.prototype = {
    isOpen: false,
    timeout: null,
    init: function () {

      var that = this;

      $(this).each(function(index, menu) {
        that.node = menu.element;
        that.addListeners(menu.element);

        var $menu = $(menu.element);
        $menu.addClass("dropdownJavascript");
        menus.push(menu.element);

        $menu.find('ul > li').each(function(index, submenu) {
          if ($(submenu).find('ul').length > 0 ) {
            $(submenu).addClass('with-menu');
          }
        });
      });
    },
    addListeners: function(menu) {
      var that = this;
      $(menu).on('mouseover',function(e) {
        that.handleMouseOver.call(that, e);
      }).on('mouseout',function(e) {
          that.handleMouseOut.call(that, e);
        });
    },
    handleMouseOver: function (e) {
      var that = this;
      // clear the timeout
      this.clearTimeout();

      // find the parent list item
      //var item = ('target' in e ? e.target : e.srcElement);
      var item = e.target || e.srcElement;
      while (item.nodeName != 'LI' && item != this.node) {
        item = item.parentNode;
      }

      // if the target is within a list item, set the timeout
      if (item.nodeName == 'LI') {
        this.toOpen = item;
        this.timeout = setTimeout(function() {
          that.open.call(that);
        }, this.options.delay);
      }

    },
    handleMouseOut: function () {
      var that = this;
      // clear the timeout
      this.clearTimeout();

      // Check mouseout delay overriding
      var _delayOut = this.options.delay;
      if ( delayOut ) {
        _delayOut = delayOut;
      }

      this.timeout = setTimeout(function() {
        that.close.call(that);
      }, _delayOut );

    },
    clearTimeout: function () {

      // clear the timeout
      if (this.timeout) {
        clearTimeout(this.timeout);
        this.timeout = null;
      }

    },
    open: function () {

      var that = this;
      // store that the menu is open
      this.isOpen = true;

      // loop over the list items with the same parent
      var items = $(this.toOpen).parent().children('li');
      $(items).each(function(index, item) {
        $(item).find("ul").each(function(index, submenu) {
          if (item != that.toOpen) {
            // close the submenu
            $(item).removeClass("dropdownOpen");
            that.close(item);

          } else if (!$(item).hasClass('dropdownOpen')) {

            // open the submenu
            //if ( !$(item).parents('li').hasClass('has-mega-menu') ) {
              $(item).addClass("dropdownOpen");
            //}


            // determine the location of the edges of the submenu
            var left = 0;
            var node = submenu;
            while (node) {
              //abs is because when you make menus right to left
              //the offsetLeft would be negative
              left += Math.abs(node.offsetLeft);
              node = node.offsetParent;
            }
            var right = left + submenu.offsetWidth;


            //We should refactor this code to execute only when menu is vertical
            var menuHeight = $(submenu).outerHeight();
            var parentTop = $(submenu).offset().top - $(window).scrollTop();
            var totalHeight = menuHeight + parentTop;
            var windowHeight = window.innerHeight;

           /* if (totalHeight > windowHeight) {
              var bestTop = (windowHeight - totalHeight) - 20;
              $(submenu).css('margin-top', bestTop + "px");
            }*/

            //remove any previous classes
            $(item).removeClass('dropdownRightToLeft');

            // move the submenu to the right of the item if appropriate
            if (left < 0) $(item).addClass('dropdownLeftToRight');

            // move the submenu to the left of the item if appropriate
            if (right > document.body.clientWidth) {
              $(item).addClass('dropdownRightToLeft');
            }

          }
        });
      });

    },


    close: function (node) {

      // if no node was specified, close all menus
      if (!node) {
        this.isOpen = false;
        node = this.node;
      }

      // loop over the items, closing their submenus
      $(node).find('li').each(function(index, item) {
        $(item).removeClass('dropdownOpen');
      });

    }
  };

  $.fn[pluginName] = function (options) {
    return this.each(function () {
      if (!$.data(this, "plugin_" + pluginName)) {
        $.data(this, "plugin_" + pluginName,
          new CustomMenu(this, options));
      }
    });
  };

})(jQuery, window, document);

/*!
 * modernizr v3.3.1
 * Build https://modernizr.com/download?-cssanimations-csstransitions-touchevents-domprefixes-prefixed-prefixes-setclasses-shiv-testallprops-testprop-teststyles-dontmin
 *
 * Copyright (c)
 *  Faruk Ates
 *  Paul Irish
 *  Alex Sexton
 *  Ryan Seddon
 *  Patrick Kettner
 *  Stu Cox
 *  Richard Herrera

 * MIT License
 */

/*
 * Modernizr tests which native CSS3 and HTML5 features are available in the
 * current UA and makes the results available to you in two ways: as properties on
 * a global `Modernizr` object, and as classes on the `<html>` element. This
 * information allows you to progressively enhance your pages with a granular level
 * of control over the experience.
*/

;(function(window, document, undefined){
  var classes = [];
  

  var tests = [];
  

  /**
   *
   * ModernizrProto is the constructor for Modernizr
   *
   * @class
   * @access public
   */

  var ModernizrProto = {
    // The current version, dummy
    _version: '3.3.1',

    // Any settings that don't work as separate modules
    // can go in here as configuration.
    _config: {
      'classPrefix': '',
      'enableClasses': true,
      'enableJSClass': true,
      'usePrefixes': true
    },

    // Queue of tests
    _q: [],

    // Stub these for people who are listening
    on: function(test, cb) {
      // I don't really think people should do this, but we can
      // safe guard it a bit.
      // -- NOTE:: this gets WAY overridden in src/addTest for actual async tests.
      // This is in case people listen to synchronous tests. I would leave it out,
      // but the code to *disallow* sync tests in the real version of this
      // function is actually larger than this.
      var self = this;
      setTimeout(function() {
        cb(self[test]);
      }, 0);
    },

    addTest: function(name, fn, options) {
      tests.push({name: name, fn: fn, options: options});
    },

    addAsyncTest: function(fn) {
      tests.push({name: null, fn: fn});
    }
  };

  

  // Fake some of Object.create so we can force non test results to be non "own" properties.
  var Modernizr = function() {};
  Modernizr.prototype = ModernizrProto;

  // Leak modernizr globally when you `require` it rather than force it here.
  // Overwrite name so constructor name is nicer :D
  Modernizr = new Modernizr();

  

  /**
   * List of property values to set for css tests. See ticket #21
   * http://git.io/vUGl4
   *
   * @memberof Modernizr
   * @name Modernizr._prefixes
   * @optionName Modernizr._prefixes
   * @optionProp prefixes
   * @access public
   * @example
   *
   * Modernizr._prefixes is the internal list of prefixes that we test against
   * inside of things like [prefixed](#modernizr-prefixed) and [prefixedCSS](#-code-modernizr-prefixedcss). It is simply
   * an array of kebab-case vendor prefixes you can use within your code.
   *
   * Some common use cases include
   *
   * Generating all possible prefixed version of a CSS property
   * ```js
   * var rule = Modernizr._prefixes.join('transform: rotate(20deg); ');
   *
   * rule === 'transform: rotate(20deg); webkit-transform: rotate(20deg); moz-transform: rotate(20deg); o-transform: rotate(20deg); ms-transform: rotate(20deg);'
   * ```
   *
   * Generating all possible prefixed version of a CSS value
   * ```js
   * rule = 'display:' +  Modernizr._prefixes.join('flex; display:') + 'flex';
   *
   * rule === 'display:flex; display:-webkit-flex; display:-moz-flex; display:-o-flex; display:-ms-flex; display:flex'
   * ```
   */

  // we use ['',''] rather than an empty array in order to allow a pattern of .`join()`ing prefixes to test
  // values in feature detects to continue to work
  var prefixes = (ModernizrProto._config.usePrefixes ? ' -webkit- -moz- -o- -ms- '.split(' ') : ['','']);

  // expose these for the plugin API. Look in the source for how to join() them against your input
  ModernizrProto._prefixes = prefixes;

  

  /**
   * is returns a boolean if the typeof an obj is exactly type.
   *
   * @access private
   * @function is
   * @param {*} obj - A thing we want to check the type of
   * @param {string} type - A string to compare the typeof against
   * @returns {boolean}
   */

  function is(obj, type) {
    return typeof obj === type;
  }
  ;

  /**
   * Run through all tests and detect their support in the current UA.
   *
   * @access private
   */

  function testRunner() {
    var featureNames;
    var feature;
    var aliasIdx;
    var result;
    var nameIdx;
    var featureName;
    var featureNameSplit;

    for (var featureIdx in tests) {
      if (tests.hasOwnProperty(featureIdx)) {
        featureNames = [];
        feature = tests[featureIdx];
        // run the test, throw the return value into the Modernizr,
        // then based on that boolean, define an appropriate className
        // and push it into an array of classes we'll join later.
        //
        // If there is no name, it's an 'async' test that is run,
        // but not directly added to the object. That should
        // be done with a post-run addTest call.
        if (feature.name) {
          featureNames.push(feature.name.toLowerCase());

          if (feature.options && feature.options.aliases && feature.options.aliases.length) {
            // Add all the aliases into the names list
            for (aliasIdx = 0; aliasIdx < feature.options.aliases.length; aliasIdx++) {
              featureNames.push(feature.options.aliases[aliasIdx].toLowerCase());
            }
          }
        }

        // Run the test, or use the raw value if it's not a function
        result = is(feature.fn, 'function') ? feature.fn() : feature.fn;


        // Set each of the names on the Modernizr object
        for (nameIdx = 0; nameIdx < featureNames.length; nameIdx++) {
          featureName = featureNames[nameIdx];
          // Support dot properties as sub tests. We don't do checking to make sure
          // that the implied parent tests have been added. You must call them in
          // order (either in the test, or make the parent test a dependency).
          //
          // Cap it to TWO to make the logic simple and because who needs that kind of subtesting
          // hashtag famous last words
          featureNameSplit = featureName.split('.');

          if (featureNameSplit.length === 1) {
            Modernizr[featureNameSplit[0]] = result;
          } else {
            // cast to a Boolean, if not one already
            /* jshint -W053 */
            if (Modernizr[featureNameSplit[0]] && !(Modernizr[featureNameSplit[0]] instanceof Boolean)) {
              Modernizr[featureNameSplit[0]] = new Boolean(Modernizr[featureNameSplit[0]]);
            }

            Modernizr[featureNameSplit[0]][featureNameSplit[1]] = result;
          }

          classes.push((result ? '' : 'no-') + featureNameSplit.join('-'));
        }
      }
    }
  }
  ;

  /**
   * docElement is a convenience wrapper to grab the root element of the document
   *
   * @access private
   * @returns {HTMLElement|SVGElement} The root element of the document
   */

  var docElement = document.documentElement;
  

  /**
   * A convenience helper to check if the document we are running in is an SVG document
   *
   * @access private
   * @returns {boolean}
   */

  var isSVG = docElement.nodeName.toLowerCase() === 'svg';
  

  /**
   * setClasses takes an array of class names and adds them to the root element
   *
   * @access private
   * @function setClasses
   * @param {string[]} classes - Array of class names
   */

  // Pass in an and array of class names, e.g.:
  //  ['no-webp', 'borderradius', ...]
  function setClasses(classes) {
    var className = docElement.className;
    var classPrefix = Modernizr._config.classPrefix || '';

    if (isSVG) {
      className = className.baseVal;
    }

    // Change `no-js` to `js` (independently of the `enableClasses` option)
    // Handle classPrefix on this too
    if (Modernizr._config.enableJSClass) {
      var reJS = new RegExp('(^|\\s)' + classPrefix + 'no-js(\\s|$)');
      className = className.replace(reJS, '$1' + classPrefix + 'js$2');
    }

    if (Modernizr._config.enableClasses) {
      // Add the new classes
      className += ' ' + classPrefix + classes.join(' ' + classPrefix);
      isSVG ? docElement.className.baseVal = className : docElement.className = className;
    }

  }

  ;

/**
  * @optionName html5shiv
  * @optionProp html5shiv
  */

  // Take the html5 variable out of the html5shiv scope so we can return it.
  var html5;
  if (!isSVG) {
    /**
     * @preserve HTML5 Shiv 3.7.3 | @afarkas @jdalton @jon_neal @rem | MIT/GPL2 Licensed
     */
    ;(function(window, document) {
      /*jshint evil:true */
      /** version */
      var version = '3.7.3';

      /** Preset options */
      var options = window.html5 || {};

      /** Used to skip problem elements */
      var reSkip = /^<|^(?:button|map|select|textarea|object|iframe|option|optgroup)$/i;

      /** Not all elements can be cloned in IE **/
      var saveClones = /^(?:a|b|code|div|fieldset|h1|h2|h3|h4|h5|h6|i|label|li|ol|p|q|span|strong|style|table|tbody|td|th|tr|ul)$/i;

      /** Detect whether the browser supports default html5 styles */
      var supportsHtml5Styles;

      /** Name of the expando, to work with multiple documents or to re-shiv one document */
      var expando = '_html5shiv';

      /** The id for the the documents expando */
      var expanID = 0;

      /** Cached data for each document */
      var expandoData = {};

      /** Detect whether the browser supports unknown elements */
      var supportsUnknownElements;

      (function() {
        try {
          var a = document.createElement('a');
          a.innerHTML = '<xyz></xyz>';
          //if the hidden property is implemented we can assume, that the browser supports basic HTML5 Styles
          supportsHtml5Styles = ('hidden' in a);

          supportsUnknownElements = a.childNodes.length == 1 || (function() {
            // assign a false positive if unable to shiv
            (document.createElement)('a');
            var frag = document.createDocumentFragment();
            return (
              typeof frag.cloneNode == 'undefined' ||
                typeof frag.createDocumentFragment == 'undefined' ||
                typeof frag.createElement == 'undefined'
            );
          }());
        } catch(e) {
          // assign a false positive if detection fails => unable to shiv
          supportsHtml5Styles = true;
          supportsUnknownElements = true;
        }

      }());

      /*--------------------------------------------------------------------------*/

      /**
       * Creates a style sheet with the given CSS text and adds it to the document.
       * @private
       * @param {Document} ownerDocument The document.
       * @param {String} cssText The CSS text.
       * @returns {StyleSheet} The style element.
       */
      function addStyleSheet(ownerDocument, cssText) {
        var p = ownerDocument.createElement('p'),
          parent = ownerDocument.getElementsByTagName('head')[0] || ownerDocument.documentElement;

        p.innerHTML = 'x<style>' + cssText + '</style>';
        return parent.insertBefore(p.lastChild, parent.firstChild);
      }

      /**
       * Returns the value of `html5.elements` as an array.
       * @private
       * @returns {Array} An array of shived element node names.
       */
      function getElements() {
        var elements = html5.elements;
        return typeof elements == 'string' ? elements.split(' ') : elements;
      }

      /**
       * Extends the built-in list of html5 elements
       * @memberOf html5
       * @param {String|Array} newElements whitespace separated list or array of new element names to shiv
       * @param {Document} ownerDocument The context document.
       */
      function addElements(newElements, ownerDocument) {
        var elements = html5.elements;
        if(typeof elements != 'string'){
          elements = elements.join(' ');
        }
        if(typeof newElements != 'string'){
          newElements = newElements.join(' ');
        }
        html5.elements = elements +' '+ newElements;
        shivDocument(ownerDocument);
      }

      /**
       * Returns the data associated to the given document
       * @private
       * @param {Document} ownerDocument The document.
       * @returns {Object} An object of data.
       */
      function getExpandoData(ownerDocument) {
        var data = expandoData[ownerDocument[expando]];
        if (!data) {
          data = {};
          expanID++;
          ownerDocument[expando] = expanID;
          expandoData[expanID] = data;
        }
        return data;
      }

      /**
       * returns a shived element for the given nodeName and document
       * @memberOf html5
       * @param {String} nodeName name of the element
       * @param {Document|DocumentFragment} ownerDocument The context document.
       * @returns {Object} The shived element.
       */
      function createElement(nodeName, ownerDocument, data){
        if (!ownerDocument) {
          ownerDocument = document;
        }
        if(supportsUnknownElements){
          return ownerDocument.createElement(nodeName);
        }
        if (!data) {
          data = getExpandoData(ownerDocument);
        }
        var node;

        if (data.cache[nodeName]) {
          node = data.cache[nodeName].cloneNode();
        } else if (saveClones.test(nodeName)) {
          node = (data.cache[nodeName] = data.createElem(nodeName)).cloneNode();
        } else {
          node = data.createElem(nodeName);
        }

        // Avoid adding some elements to fragments in IE < 9 because
        // * Attributes like `name` or `type` cannot be set/changed once an element
        //   is inserted into a document/fragment
        // * Link elements with `src` attributes that are inaccessible, as with
        //   a 403 response, will cause the tab/window to crash
        // * Script elements appended to fragments will execute when their `src`
        //   or `text` property is set
        return node.canHaveChildren && !reSkip.test(nodeName) && !node.tagUrn ? data.frag.appendChild(node) : node;
      }

      /**
       * returns a shived DocumentFragment for the given document
       * @memberOf html5
       * @param {Document} ownerDocument The context document.
       * @returns {Object} The shived DocumentFragment.
       */
      function createDocumentFragment(ownerDocument, data){
        if (!ownerDocument) {
          ownerDocument = document;
        }
        if(supportsUnknownElements){
          return ownerDocument.createDocumentFragment();
        }
        data = data || getExpandoData(ownerDocument);
        var clone = data.frag.cloneNode(),
          i = 0,
          elems = getElements(),
          l = elems.length;
        for(;i<l;i++){
          clone.createElement(elems[i]);
        }
        return clone;
      }

      /**
       * Shivs the `createElement` and `createDocumentFragment` methods of the document.
       * @private
       * @param {Document|DocumentFragment} ownerDocument The document.
       * @param {Object} data of the document.
       */
      function shivMethods(ownerDocument, data) {
        if (!data.cache) {
          data.cache = {};
          data.createElem = ownerDocument.createElement;
          data.createFrag = ownerDocument.createDocumentFragment;
          data.frag = data.createFrag();
        }


        ownerDocument.createElement = function(nodeName) {
          //abort shiv
          if (!html5.shivMethods) {
            return data.createElem(nodeName);
          }
          return createElement(nodeName, ownerDocument, data);
        };

        ownerDocument.createDocumentFragment = Function('h,f', 'return function(){' +
                                                        'var n=f.cloneNode(),c=n.createElement;' +
                                                        'h.shivMethods&&(' +
                                                        // unroll the `createElement` calls
                                                        getElements().join().replace(/[\w\-:]+/g, function(nodeName) {
          data.createElem(nodeName);
          data.frag.createElement(nodeName);
          return 'c("' + nodeName + '")';
        }) +
          ');return n}'
                                                       )(html5, data.frag);
      }

      /*--------------------------------------------------------------------------*/

      /**
       * Shivs the given document.
       * @memberOf html5
       * @param {Document} ownerDocument The document to shiv.
       * @returns {Document} The shived document.
       */
      function shivDocument(ownerDocument) {
        if (!ownerDocument) {
          ownerDocument = document;
        }
        var data = getExpandoData(ownerDocument);

        if (html5.shivCSS && !supportsHtml5Styles && !data.hasCSS) {
          data.hasCSS = !!addStyleSheet(ownerDocument,
                                        // corrects block display not defined in IE6/7/8/9
                                        'article,aside,dialog,figcaption,figure,footer,header,hgroup,main,nav,section{display:block}' +
                                        // adds styling not present in IE6/7/8/9
                                        'mark{background:#FF0;color:#000}' +
                                        // hides non-rendered elements
                                        'template{display:none}'
                                       );
        }
        if (!supportsUnknownElements) {
          shivMethods(ownerDocument, data);
        }
        return ownerDocument;
      }

      /*--------------------------------------------------------------------------*/

      /**
       * The `html5` object is exposed so that more elements can be shived and
       * existing shiving can be detected on iframes.
       * @type Object
       * @example
       *
       * // options can be changed before the script is included
       * html5 = { 'elements': 'mark section', 'shivCSS': false, 'shivMethods': false };
       */
      var html5 = {

        /**
         * An array or space separated string of node names of the elements to shiv.
         * @memberOf html5
         * @type Array|String
         */
        'elements': options.elements || 'abbr article aside audio bdi canvas data datalist details dialog figcaption figure footer header hgroup main mark meter nav output picture progress section summary template time video',

        /**
         * current version of html5shiv
         */
        'version': version,

        /**
         * A flag to indicate that the HTML5 style sheet should be inserted.
         * @memberOf html5
         * @type Boolean
         */
        'shivCSS': (options.shivCSS !== false),

        /**
         * Is equal to true if a browser supports creating unknown/HTML5 elements
         * @memberOf html5
         * @type boolean
         */
        'supportsUnknownElements': supportsUnknownElements,

        /**
         * A flag to indicate that the document's `createElement` and `createDocumentFragment`
         * methods should be overwritten.
         * @memberOf html5
         * @type Boolean
         */
        'shivMethods': (options.shivMethods !== false),

        /**
         * A string to describe the type of `html5` object ("default" or "default print").
         * @memberOf html5
         * @type String
         */
        'type': 'default',

        // shivs the document according to the specified `html5` object options
        'shivDocument': shivDocument,

        //creates a shived element
        createElement: createElement,

        //creates a shived documentFragment
        createDocumentFragment: createDocumentFragment,

        //extends list of elements
        addElements: addElements
      };

      /*--------------------------------------------------------------------------*/

      // expose html5
      window.html5 = html5;

      // shiv the document
      shivDocument(document);

      if(typeof module == 'object' && module.exports){
        module.exports = html5;
      }

    }(typeof window !== "undefined" ? window : this, document));
  }
;

  /**
   * If the browsers follow the spec, then they would expose vendor-specific style as:
   *   elem.style.WebkitBorderRadius
   * instead of something like the following, which would be technically incorrect:
   *   elem.style.webkitBorderRadius

   * Webkit ghosts their properties in lowercase but Opera & Moz do not.
   * Microsoft uses a lowercase `ms` instead of the correct `Ms` in IE8+
   *   erik.eae.net/archives/2008/03/10/21.48.10/

   * More here: github.com/Modernizr/Modernizr/issues/issue/21
   *
   * @access private
   * @returns {string} The string representing the vendor-specific style properties
   */

  var omPrefixes = 'Moz O ms Webkit';
  

  /**
   * List of JavaScript DOM values used for tests
   *
   * @memberof Modernizr
   * @name Modernizr._domPrefixes
   * @optionName Modernizr._domPrefixes
   * @optionProp domPrefixes
   * @access public
   * @example
   *
   * Modernizr._domPrefixes is exactly the same as [_prefixes](#modernizr-_prefixes), but rather
   * than kebab-case properties, all properties are their Capitalized variant
   *
   * ```js
   * Modernizr._domPrefixes === [ "Moz", "O", "ms", "Webkit" ];
   * ```
   */

  var domPrefixes = (ModernizrProto._config.usePrefixes ? omPrefixes.toLowerCase().split(' ') : []);
  ModernizrProto._domPrefixes = domPrefixes;
  

  /**
   * cssToDOM takes a kebab-case string and converts it to camelCase
   * e.g. box-sizing -> boxSizing
   *
   * @access private
   * @function cssToDOM
   * @param {string} name - String name of kebab-case prop we want to convert
   * @returns {string} The camelCase version of the supplied name
   */

  function cssToDOM(name) {
    return name.replace(/([a-z])-([a-z])/g, function(str, m1, m2) {
      return m1 + m2.toUpperCase();
    }).replace(/^-/, '');
  }
  ;

  var cssomPrefixes = (ModernizrProto._config.usePrefixes ? omPrefixes.split(' ') : []);
  ModernizrProto._cssomPrefixes = cssomPrefixes;
  

  /**
   * atRule returns a given CSS property at-rule (eg @keyframes), possibly in
   * some prefixed form, or false, in the case of an unsupported rule
   *
   * @memberof Modernizr
   * @name Modernizr.atRule
   * @optionName Modernizr.atRule()
   * @optionProp atRule
   * @access public
   * @function atRule
   * @param {string} prop - String name of the @-rule to test for
   * @returns {string|boolean} The string representing the (possibly prefixed)
   * valid version of the @-rule, or `false` when it is unsupported.
   * @example
   * ```js
   *  var keyframes = Modernizr.atRule('@keyframes');
   *
   *  if (keyframes) {
   *    // keyframes are supported
   *    // could be `@-webkit-keyframes` or `@keyframes`
   *  } else {
   *    // keyframes === `false`
   *  }
   * ```
   *
   */

  var atRule = function(prop) {
    var length = prefixes.length;
    var cssrule = window.CSSRule;
    var rule;

    if (typeof cssrule === 'undefined') {
      return undefined;
    }

    if (!prop) {
      return false;
    }

    // remove literal @ from beginning of provided property
    prop = prop.replace(/^@/, '');

    // CSSRules use underscores instead of dashes
    rule = prop.replace(/-/g, '_').toUpperCase() + '_RULE';

    if (rule in cssrule) {
      return '@' + prop;
    }

    for (var i = 0; i < length; i++) {
      // prefixes gives us something like -o-, and we want O_
      var prefix = prefixes[i];
      var thisRule = prefix.toUpperCase() + '_' + rule;

      if (thisRule in cssrule) {
        return '@-' + prefix.toLowerCase() + '-' + prop;
      }
    }

    return false;
  };

  ModernizrProto.atRule = atRule;

  


  /**
   * contains checks to see if a string contains another string
   *
   * @access private
   * @function contains
   * @param {string} str - The string we want to check for substrings
   * @param {string} substr - The substring we want to search the first string for
   * @returns {boolean}
   */

  function contains(str, substr) {
    return !!~('' + str).indexOf(substr);
  }

  ;

  /**
   * createElement is a convenience wrapper around document.createElement. Since we
   * use createElement all over the place, this allows for (slightly) smaller code
   * as well as abstracting away issues with creating elements in contexts other than
   * HTML documents (e.g. SVG documents).
   *
   * @access private
   * @function createElement
   * @returns {HTMLElement|SVGElement} An HTML or SVG element
   */

  function createElement() {
    if (typeof document.createElement !== 'function') {
      // This is the case in IE7, where the type of createElement is "object".
      // For this reason, we cannot call apply() as Object is not a Function.
      return document.createElement(arguments[0]);
    } else if (isSVG) {
      return document.createElementNS.call(document, 'http://www.w3.org/2000/svg', arguments[0]);
    } else {
      return document.createElement.apply(document, arguments);
    }
  }

  ;

  /**
   * getBody returns the body of a document, or an element that can stand in for
   * the body if a real body does not exist
   *
   * @access private
   * @function getBody
   * @returns {HTMLElement|SVGElement} Returns the real body of a document, or an
   * artificially created element that stands in for the body
   */

  function getBody() {
    // After page load injecting a fake body doesn't work so check if body exists
    var body = document.body;

    if (!body) {
      // Can't use the real body create a fake one.
      body = createElement(isSVG ? 'svg' : 'body');
      body.fake = true;
    }

    return body;
  }

  ;

  /**
   * injectElementWithStyles injects an element with style element and some CSS rules
   *
   * @access private
   * @function injectElementWithStyles
   * @param {string} rule - String representing a css rule
   * @param {function} callback - A function that is used to test the injected element
   * @param {number} [nodes] - An integer representing the number of additional nodes you want injected
   * @param {string[]} [testnames] - An array of strings that are used as ids for the additional nodes
   * @returns {boolean}
   */

  function injectElementWithStyles(rule, callback, nodes, testnames) {
    var mod = 'modernizr';
    var style;
    var ret;
    var node;
    var docOverflow;
    var div = createElement('div');
    var body = getBody();

    if (parseInt(nodes, 10)) {
      // In order not to give false positives we create a node for each test
      // This also allows the method to scale for unspecified uses
      while (nodes--) {
        node = createElement('div');
        node.id = testnames ? testnames[nodes] : mod + (nodes + 1);
        div.appendChild(node);
      }
    }

    style = createElement('style');
    style.type = 'text/css';
    style.id = 's' + mod;

    // IE6 will false positive on some tests due to the style element inside the test div somehow interfering offsetHeight, so insert it into body or fakebody.
    // Opera will act all quirky when injecting elements in documentElement when page is served as xml, needs fakebody too. #270
    (!body.fake ? div : body).appendChild(style);
    body.appendChild(div);

    if (style.styleSheet) {
      style.styleSheet.cssText = rule;
    } else {
      style.appendChild(document.createTextNode(rule));
    }
    div.id = mod;

    if (body.fake) {
      //avoid crashing IE8, if background image is used
      body.style.background = '';
      //Safari 5.13/5.1.4 OSX stops loading if ::-webkit-scrollbar is used and scrollbars are visible
      body.style.overflow = 'hidden';
      docOverflow = docElement.style.overflow;
      docElement.style.overflow = 'hidden';
      docElement.appendChild(body);
    }

    ret = callback(div, rule);
    // If this is done after page load we don't want to remove the body so check if body exists
    if (body.fake) {
      body.parentNode.removeChild(body);
      docElement.style.overflow = docOverflow;
      // Trigger layout so kinetic scrolling isn't disabled in iOS6+
      docElement.offsetHeight;
    } else {
      div.parentNode.removeChild(div);
    }

    return !!ret;

  }

  ;

  /**
   * testStyles injects an element with style element and some CSS rules
   *
   * @memberof Modernizr
   * @name Modernizr.testStyles
   * @optionName Modernizr.testStyles()
   * @optionProp testStyles
   * @access public
   * @function testStyles
   * @param {string} rule - String representing a css rule
   * @param {function} callback - A function that is used to test the injected element
   * @param {number} [nodes] - An integer representing the number of additional nodes you want injected
   * @param {string[]} [testnames] - An array of strings that are used as ids for the additional nodes
   * @returns {boolean}
   * @example
   *
   * `Modernizr.testStyles` takes a CSS rule and injects it onto the current page
   * along with (possibly multiple) DOM elements. This lets you check for features
   * that can not be detected by simply checking the [IDL](https://developer.mozilla.org/en-US/docs/Mozilla/Developer_guide/Interface_development_guide/IDL_interface_rules).
   *
   * ```js
   * Modernizr.testStyles('#modernizr { width: 9px; color: papayawhip; }', function(elem, rule) {
   *   // elem is the first DOM node in the page (by default #modernizr)
   *   // rule is the first argument you supplied - the CSS rule in string form
   *
   *   addTest('widthworks', elem.style.width === '9px')
   * });
   * ```
   *
   * If your test requires multiple nodes, you can include a third argument
   * indicating how many additional div elements to include on the page. The
   * additional nodes are injected as children of the `elem` that is returned as
   * the first argument to the callback.
   *
   * ```js
   * Modernizr.testStyles('#modernizr {width: 1px}; #modernizr2 {width: 2px}', function(elem) {
   *   document.getElementById('modernizr').style.width === '1px'; // true
   *   document.getElementById('modernizr2').style.width === '2px'; // true
   *   elem.firstChild === document.getElementById('modernizr2'); // true
   * }, 1);
   * ```
   *
   * By default, all of the additional elements have an ID of `modernizr[n]`, where
   * `n` is its index (e.g. the first additional, second overall is `#modernizr2`,
   * the second additional is `#modernizr3`, etc.).
   * If you want to have more meaningful IDs for your function, you can provide
   * them as the fourth argument, as an array of strings
   *
   * ```js
   * Modernizr.testStyles('#foo {width: 10px}; #bar {height: 20px}', function(elem) {
   *   elem.firstChild === document.getElementById('foo'); // true
   *   elem.lastChild === document.getElementById('bar'); // true
   * }, 2, ['foo', 'bar']);
   * ```
   *
   */

  var testStyles = ModernizrProto.testStyles = injectElementWithStyles;
  

  /**
   * fnBind is a super small [bind](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/bind) polyfill.
   *
   * @access private
   * @function fnBind
   * @param {function} fn - a function you want to change `this` reference to
   * @param {object} that - the `this` you want to call the function with
   * @returns {function} The wrapped version of the supplied function
   */

  function fnBind(fn, that) {
    return function() {
      return fn.apply(that, arguments);
    };
  }

  ;

  /**
   * testDOMProps is a generic DOM property test; if a browser supports
   *   a certain property, it won't return undefined for it.
   *
   * @access private
   * @function testDOMProps
   * @param {array.<string>} props - An array of properties to test for
   * @param {object} obj - An object or Element you want to use to test the parameters again
   * @param {boolean|object} elem - An Element to bind the property lookup again. Use `false` to prevent the check
   */
  function testDOMProps(props, obj, elem) {
    var item;

    for (var i in props) {
      if (props[i] in obj) {

        // return the property name as a string
        if (elem === false) {
          return props[i];
        }

        item = obj[props[i]];

        // let's bind a function
        if (is(item, 'function')) {
          // bind to obj unless overriden
          return fnBind(item, elem || obj);
        }

        // return the unbound function or obj or value
        return item;
      }
    }
    return false;
  }

  ;

  /**
   * Create our "modernizr" element that we do most feature tests on.
   *
   * @access private
   */

  var modElem = {
    elem: createElement('modernizr')
  };

  // Clean up this element
  Modernizr._q.push(function() {
    delete modElem.elem;
  });

  

  var mStyle = {
    style: modElem.elem.style
  };

  // kill ref for gc, must happen before mod.elem is removed, so we unshift on to
  // the front of the queue.
  Modernizr._q.unshift(function() {
    delete mStyle.style;
  });

  

  /**
   * domToCSS takes a camelCase string and converts it to kebab-case
   * e.g. boxSizing -> box-sizing
   *
   * @access private
   * @function domToCSS
   * @param {string} name - String name of camelCase prop we want to convert
   * @returns {string} The kebab-case version of the supplied name
   */

  function domToCSS(name) {
    return name.replace(/([A-Z])/g, function(str, m1) {
      return '-' + m1.toLowerCase();
    }).replace(/^ms-/, '-ms-');
  }
  ;

  /**
   * nativeTestProps allows for us to use native feature detection functionality if available.
   * some prefixed form, or false, in the case of an unsupported rule
   *
   * @access private
   * @function nativeTestProps
   * @param {array} props - An array of property names
   * @param {string} value - A string representing the value we want to check via @supports
   * @returns {boolean|undefined} A boolean when @supports exists, undefined otherwise
   */

  // Accepts a list of property names and a single value
  // Returns `undefined` if native detection not available
  function nativeTestProps(props, value) {
    var i = props.length;
    // Start with the JS API: http://www.w3.org/TR/css3-conditional/#the-css-interface
    if ('CSS' in window && 'supports' in window.CSS) {
      // Try every prefixed variant of the property
      while (i--) {
        if (window.CSS.supports(domToCSS(props[i]), value)) {
          return true;
        }
      }
      return false;
    }
    // Otherwise fall back to at-rule (for Opera 12.x)
    else if ('CSSSupportsRule' in window) {
      // Build a condition string for every prefixed variant
      var conditionText = [];
      while (i--) {
        conditionText.push('(' + domToCSS(props[i]) + ':' + value + ')');
      }
      conditionText = conditionText.join(' or ');
      return injectElementWithStyles('@supports (' + conditionText + ') { #modernizr { position: absolute; } }', function(node) {
        return getComputedStyle(node, null).position == 'absolute';
      });
    }
    return undefined;
  }
  ;

  // testProps is a generic CSS / DOM property test.

  // In testing support for a given CSS property, it's legit to test:
  //    `elem.style[styleName] !== undefined`
  // If the property is supported it will return an empty string,
  // if unsupported it will return undefined.

  // We'll take advantage of this quick test and skip setting a style
  // on our modernizr element, but instead just testing undefined vs
  // empty string.

  // Property names can be provided in either camelCase or kebab-case.

  function testProps(props, prefixed, value, skipValueTest) {
    skipValueTest = is(skipValueTest, 'undefined') ? false : skipValueTest;

    // Try native detect first
    if (!is(value, 'undefined')) {
      var result = nativeTestProps(props, value);
      if (!is(result, 'undefined')) {
        return result;
      }
    }

    // Otherwise do it properly
    var afterInit, i, propsLength, prop, before;

    // If we don't have a style element, that means we're running async or after
    // the core tests, so we'll need to create our own elements to use

    // inside of an SVG element, in certain browsers, the `style` element is only
    // defined for valid tags. Therefore, if `modernizr` does not have one, we
    // fall back to a less used element and hope for the best.
    // for strict XHTML browsers the hardly used samp element is used
    var elems = ['modernizr', 'tspan', 'samp'];
    while (!mStyle.style && elems.length) {
      afterInit = true;
      mStyle.modElem = createElement(elems.shift());
      mStyle.style = mStyle.modElem.style;
    }

    // Delete the objects if we created them.
    function cleanElems() {
      if (afterInit) {
        delete mStyle.style;
        delete mStyle.modElem;
      }
    }

    propsLength = props.length;
    for (i = 0; i < propsLength; i++) {
      prop = props[i];
      before = mStyle.style[prop];

      if (contains(prop, '-')) {
        prop = cssToDOM(prop);
      }

      if (mStyle.style[prop] !== undefined) {

        // If value to test has been passed in, do a set-and-check test.
        // 0 (integer) is a valid property value, so check that `value` isn't
        // undefined, rather than just checking it's truthy.
        if (!skipValueTest && !is(value, 'undefined')) {

          // Needs a try catch block because of old IE. This is slow, but will
          // be avoided in most cases because `skipValueTest` will be used.
          try {
            mStyle.style[prop] = value;
          } catch (e) {}

          // If the property value has changed, we assume the value used is
          // supported. If `value` is empty string, it'll fail here (because
          // it hasn't changed), which matches how browsers have implemented
          // CSS.supports()
          if (mStyle.style[prop] != before) {
            cleanElems();
            return prefixed == 'pfx' ? prop : true;
          }
        }
        // Otherwise just return true, or the property name if this is a
        // `prefixed()` call
        else {
          cleanElems();
          return prefixed == 'pfx' ? prop : true;
        }
      }
    }
    cleanElems();
    return false;
  }

  ;

  /**
   * testProp() investigates whether a given style property is recognized
   * Property names can be provided in either camelCase or kebab-case.
   *
   * @memberof Modernizr
   * @name Modernizr.testProp
   * @access public
   * @optionName Modernizr.testProp()
   * @optionProp testProp
   * @function testProp
   * @param {string} prop - Name of the CSS property to check
   * @param {string} [value] - Name of the CSS value to check
   * @param {boolean} [useValue] - Whether or not to check the value if @supports isn't supported
   * @returns {boolean}
   * @example
   *
   * Just like [testAllProps](#modernizr-testallprops), only it does not check any vendor prefixed
   * version of the string.
   *
   * Note that the property name must be provided in camelCase (e.g. boxSizing not box-sizing)
   *
   * ```js
   * Modernizr.testProp('pointerEvents')  // true
   * ```
   *
   * You can also provide a value as an optional second argument to check if a
   * specific value is supported
   *
   * ```js
   * Modernizr.testProp('pointerEvents', 'none') // true
   * Modernizr.testProp('pointerEvents', 'penguin') // false
   * ```
   */

  var testProp = ModernizrProto.testProp = function(prop, value, useValue) {
    return testProps([prop], undefined, value, useValue);
  };
  

  /**
   * testPropsAll tests a list of DOM properties we want to check against.
   * We specify literally ALL possible (known and/or likely) properties on
   * the element including the non-vendor prefixed one, for forward-
   * compatibility.
   *
   * @access private
   * @function testPropsAll
   * @param {string} prop - A string of the property to test for
   * @param {string|object} [prefixed] - An object to check the prefixed properties on. Use a string to skip
   * @param {HTMLElement|SVGElement} [elem] - An element used to test the property and value against
   * @param {string} [value] - A string of a css value
   * @param {boolean} [skipValueTest] - An boolean representing if you want to test if value sticks when set
   */
  function testPropsAll(prop, prefixed, elem, value, skipValueTest) {

    var ucProp = prop.charAt(0).toUpperCase() + prop.slice(1),
    props = (prop + ' ' + cssomPrefixes.join(ucProp + ' ') + ucProp).split(' ');

    // did they call .prefixed('boxSizing') or are we just testing a prop?
    if (is(prefixed, 'string') || is(prefixed, 'undefined')) {
      return testProps(props, prefixed, value, skipValueTest);

      // otherwise, they called .prefixed('requestAnimationFrame', window[, elem])
    } else {
      props = (prop + ' ' + (domPrefixes).join(ucProp + ' ') + ucProp).split(' ');
      return testDOMProps(props, prefixed, elem);
    }
  }

  // Modernizr.testAllProps() investigates whether a given style property,
  // or any of its vendor-prefixed variants, is recognized
  //
  // Note that the property names must be provided in the camelCase variant.
  // Modernizr.testAllProps('boxSizing')
  ModernizrProto.testAllProps = testPropsAll;

  

  /**
   * prefixed returns the prefixed or nonprefixed property name variant of your input
   *
   * @memberof Modernizr
   * @name Modernizr.prefixed
   * @optionName Modernizr.prefixed()
   * @optionProp prefixed
   * @access public
   * @function prefixed
   * @param {string} prop - String name of the property to test for
   * @param {object} [obj] - An object to test for the prefixed properties on
   * @param {HTMLElement} [elem] - An element used to test specific properties against
   * @returns {string|false} The string representing the (possibly prefixed) valid
   * version of the property, or `false` when it is unsupported.
   * @example
   *
   * Modernizr.prefixed takes a string css value in the DOM style camelCase (as
   * opposed to the css style kebab-case) form and returns the (possibly prefixed)
   * version of that property that the browser actually supports.
   *
   * For example, in older Firefox...
   * ```js
   * prefixed('boxSizing')
   * ```
   * returns 'MozBoxSizing'
   *
   * In newer Firefox, as well as any other browser that support the unprefixed
   * version would simply return `boxSizing`. Any browser that does not support
   * the property at all, it will return `false`.
   *
   * By default, prefixed is checked against a DOM element. If you want to check
   * for a property on another object, just pass it as a second argument
   *
   * ```js
   * var rAF = prefixed('requestAnimationFrame', window);
   *
   * raf(function() {
   *  renderFunction();
   * })
   * ```
   *
   * Note that this will return _the actual function_ - not the name of the function.
   * If you need the actual name of the property, pass in `false` as a third argument
   *
   * ```js
   * var rAFProp = prefixed('requestAnimationFrame', window, false);
   *
   * rafProp === 'WebkitRequestAnimationFrame' // in older webkit
   * ```
   *
   * One common use case for prefixed is if you're trying to determine which transition
   * end event to bind to, you might do something like...
   * ```js
   * var transEndEventNames = {
   *     'WebkitTransition' : 'webkitTransitionEnd', * Saf 6, Android Browser
   *     'MozTransition'    : 'transitionend',       * only for FF < 15
   *     'transition'       : 'transitionend'        * IE10, Opera, Chrome, FF 15+, Saf 7+
   * };
   *
   * var transEndEventName = transEndEventNames[ Modernizr.prefixed('transition') ];
   * ```
   *
   * If you want a similar lookup, but in kebab-case, you can use [prefixedCSS](#modernizr-prefixedcss).
   */

  var prefixed = ModernizrProto.prefixed = function(prop, obj, elem) {
    if (prop.indexOf('@') === 0) {
      return atRule(prop);
    }

    if (prop.indexOf('-') != -1) {
      // Convert kebab-case to camelCase
      prop = cssToDOM(prop);
    }
    if (!obj) {
      return testPropsAll(prop, 'pfx');
    } else {
      // Testing DOM property e.g. Modernizr.prefixed('requestAnimationFrame', window) // 'mozRequestAnimationFrame'
      return testPropsAll(prop, obj, elem);
    }
  };

  

  /**
   * testAllProps determines whether a given CSS property is supported in the browser
   *
   * @memberof Modernizr
   * @name Modernizr.testAllProps
   * @optionName Modernizr.testAllProps()
   * @optionProp testAllProps
   * @access public
   * @function testAllProps
   * @param {string} prop - String naming the property to test (either camelCase or kebab-case)
   * @param {string} [value] - String of the value to test
   * @param {boolean} [skipValueTest=false] - Whether to skip testing that the value is supported when using non-native detection
   * @example
   *
   * testAllProps determines whether a given CSS property, in some prefixed form,
   * is supported by the browser.
   *
   * ```js
   * testAllProps('boxSizing')  // true
   * ```
   *
   * It can optionally be given a CSS value in string form to test if a property
   * value is valid
   *
   * ```js
   * testAllProps('display', 'block') // true
   * testAllProps('display', 'penguin') // false
   * ```
   *
   * A boolean can be passed as a third parameter to skip the value check when
   * native detection (@supports) isn't available.
   *
   * ```js
   * testAllProps('shapeOutside', 'content-box', true);
   * ```
   */

  function testAllProps(prop, value, skipValueTest) {
    return testPropsAll(prop, undefined, undefined, value, skipValueTest);
  }
  ModernizrProto.testAllProps = testAllProps;
  
/*!
{
  "name": "CSS Animations",
  "property": "cssanimations",
  "caniuse": "css-animation",
  "polyfills": ["transformie", "csssandpaper"],
  "tags": ["css"],
  "warnings": ["Android < 4 will pass this test, but can only animate a single property at a time"],
  "notes": [{
    "name" : "Article: 'Dispelling the Android CSS animation myths'",
    "href": "https://goo.gl/OGw5Gm"
  }]
}
!*/
/* DOC
Detects whether or not elements can be animated using CSS
*/

  Modernizr.addTest('cssanimations', testAllProps('animationName', 'a', true));

/*!
{
  "name": "CSS Transitions",
  "property": "csstransitions",
  "caniuse": "css-transitions",
  "tags": ["css"]
}
!*/

  Modernizr.addTest('csstransitions', testAllProps('transition', 'all', true));

/*!
{
  "name": "Touch Events",
  "property": "touchevents",
  "caniuse" : "touch",
  "tags": ["media", "attribute"],
  "notes": [{
    "name": "Touch Events spec",
    "href": "https://www.w3.org/TR/2013/WD-touch-events-20130124/"
  }],
  "warnings": [
    "Indicates if the browser supports the Touch Events spec, and does not necessarily reflect a touchscreen device"
  ],
  "knownBugs": [
    "False-positive on some configurations of Nokia N900",
    "False-positive on some BlackBerry 6.0 builds – https://github.com/Modernizr/Modernizr/issues/372#issuecomment-3112695"
  ]
}
!*/
/* DOC
Indicates if the browser supports the W3C Touch Events API.

This *does not* necessarily reflect a touchscreen device:

* Older touchscreen devices only emulate mouse events
* Modern IE touch devices implement the Pointer Events API instead: use `Modernizr.pointerevents` to detect support for that
* Some browsers & OS setups may enable touch APIs when no touchscreen is connected
* Future browsers may implement other event models for touch interactions

See this article: [You Can't Detect A Touchscreen](http://www.stucox.com/blog/you-cant-detect-a-touchscreen/).

It's recommended to bind both mouse and touch/pointer events simultaneously – see [this HTML5 Rocks tutorial](http://www.html5rocks.com/en/mobile/touchandmouse/).

This test will also return `true` for Firefox 4 Multitouch support.
*/

  // Chrome (desktop) used to lie about its support on this, but that has since been rectified: http://crbug.com/36415
  Modernizr.addTest('touchevents', function() {
    var bool;
    if (('ontouchstart' in window) || window.DocumentTouch && document instanceof DocumentTouch) {
      bool = true;
    } else {
      // include the 'heartz' as a way to have a non matching MQ to help terminate the join
      // https://git.io/vznFH
      var query = ['@media (', prefixes.join('touch-enabled),('), 'heartz', ')', '{#modernizr{top:9px;position:absolute}}'].join('');
      testStyles(query, function(node) {
        bool = node.offsetTop === 9;
      });
    }
    return bool;
  });


  // Run each test
  testRunner();

  // Remove the "no-js" class if it exists
  setClasses(classes);

  delete ModernizrProto.addTest;
  delete ModernizrProto.addAsyncTest;

  // Run the things that are supposed to run after the tests
  for (var i = 0; i < Modernizr._q.length; i++) {
    Modernizr._q[i]();
  }

  // Leak Modernizr namespace
  window.Modernizr = Modernizr;


;

})(window, document);
$(function() {
    ParallaxScroll.init();
});

// Credit: https://github.com/alumbo/jquery.parallax-scroll
var ParallaxScroll = {
    /* PUBLIC VARIABLES */
    showLogs: false,
    round: 1000,

    /* PUBLIC FUNCTIONS */
    init: function() {
        this._log("init");
        if (this._inited) {
            this._log("Already Inited");
            this._inited = true;
            return;
        }
        this._requestAnimationFrame = (function(){
          return  window.requestAnimationFrame       || 
                  window.webkitRequestAnimationFrame || 
                  window.mozRequestAnimationFrame    || 
                  window.oRequestAnimationFrame      || 
                  window.msRequestAnimationFrame     || 
                  function(/* function */ callback, /* DOMElement */ element){
                      window.setTimeout(callback, 1000 / 60);
                  };
        })();
        this._onScroll(true);
    },

    /* PRIVATE VARIABLES */
    _inited: false,
    _properties: ['x', 'y', 'z', 'rotateX', 'rotateY', 'rotateZ', 'scaleX', 'scaleY', 'scaleZ', 'scale'],
    _requestAnimationFrame:null,

    /* PRIVATE FUNCTIONS */
    _log: function(message) {
        if (this.showLogs) console.log("Parallax Scroll / " + message);
    },
    _onScroll: function(noSmooth) {
        var scroll = $(document).scrollTop();
        var windowHeight = $(window).height();
        this._log("onScroll " + scroll);
        $("[data-parallax]").each($.proxy(function(index, el) {
            var $el = $(el);
            var properties = [];
            var applyProperties = false;
            var style = $el.data("style");
            if (style == undefined) {
                style = $el.attr("style") || "";
                $el.data("style", style);
            }
            var datas = [$el.data("parallax")];
            var iData;
            for(iData = 2; ; iData++) {
                if($el.data("parallax"+iData)) {
                    datas.push($el.data("parallax-"+iData));
                }
                else {
                    break;
                }
            }
            var datasLength = datas.length;
            for(iData = 0; iData < datasLength; iData ++) {
                var data = datas[iData];
                var scrollFrom = data["from-scroll"];
                if (scrollFrom == undefined) scrollFrom = Math.max(0, $(el).offset().top - windowHeight);
                scrollFrom = scrollFrom | 0;
                var scrollDistance = data["distance"];
                var scrollTo = data["to-scroll"];
                if (scrollDistance == undefined && scrollTo == undefined) scrollDistance = windowHeight;
                scrollDistance = Math.max(scrollDistance | 0, 1);
                var easing = data["easing"];
                var easingReturn = data["easing-return"];
                if (easing == undefined || !$.easing|| !$.easing[easing]) easing = null;
                if (easingReturn == undefined || !$.easing|| !$.easing[easingReturn]) easingReturn = easing;
                if (easing) {
                    var totalTime = data["duration"];
                    if (totalTime == undefined) totalTime = scrollDistance;
                    totalTime = Math.max(totalTime | 0, 1);
                    var totalTimeReturn = data["duration-return"];
                    if (totalTimeReturn == undefined) totalTimeReturn = totalTime;
                    scrollDistance = 1;
                    var currentTime = $el.data("current-time");
                    if(currentTime == undefined) currentTime = 0;
                }
                if (scrollTo == undefined) scrollTo = scrollFrom + scrollDistance;
                scrollTo = scrollTo | 0;
                var smoothness = data["smoothness"];
                if (smoothness == undefined) smoothness = 30;
                smoothness = smoothness | 0;
                if (noSmooth || smoothness == 0) smoothness = 1;
                smoothness = smoothness | 0;
                var scrollCurrent = scroll;
                scrollCurrent = Math.max(scrollCurrent, scrollFrom);
                scrollCurrent = Math.min(scrollCurrent, scrollTo);
                if(easing) {
                    if($el.data("sens") == undefined) $el.data("sens", "back");
                    if(scrollCurrent>scrollFrom) {
                        if($el.data("sens") == "back") {
                            currentTime = 1;
                            $el.data("sens", "go");
                        }
                        else {
                            currentTime++;
                        }
                    }
                    if(scrollCurrent<scrollTo) {
                        if($el.data("sens") == "go") {
                            currentTime = 1;
                            $el.data("sens", "back");
                        }
                        else {
                            currentTime++;
                        }
                    }
                    if(noSmooth) currentTime = totalTime;
                    $el.data("current-time", currentTime);
                }
                this._properties.map($.proxy(function(prop) {
                    var defaultProp = 0;
                    var to = data[prop];
                    if (to == undefined) return;
                    if(prop=="scale" || prop=="scaleX" || prop=="scaleY" || prop=="scaleZ" ) {
                        defaultProp = 1;
                    }
                    else {
                        to = to | 0;
                    }
                    var prev = $el.data("_" + prop);
                    if (prev == undefined) prev = defaultProp;
                    var next = ((to-defaultProp) * ((scrollCurrent - scrollFrom) / (scrollTo - scrollFrom))) + defaultProp;
                    var val = prev + (next - prev) / smoothness;
                    if(easing && currentTime>0 && currentTime<=totalTime) {
                        var from = defaultProp;
                        if($el.data("sens") == "back") {
                            from = to;
                            to = -to;
                            easing = easingReturn;
                            totalTime = totalTimeReturn;
                        }
                        val = $.easing[easing](null, currentTime, from, to, totalTime);
                    }
                    val = Math.ceil(val * this.round) / this.round;
                    if(val==prev&&next==to) val = to;
                    if(!properties[prop]) properties[prop] = 0;
                    properties[prop] += val;
                    if (prev != properties[prop]) {
                        $el.data("_" + prop, properties[prop]);
                        applyProperties = true;
                    }
                }, this));
            }
            if (applyProperties) {
                if (properties["z"] != undefined) {
                    var perspective = data["perspective"];
                    if (perspective == undefined) perspective = 800;
                    var $parent = $el.parent();
                    if(!$parent.data("style")) $parent.data("style", $parent.attr("style") || "");
                    $parent.attr("style", "perspective:" + perspective + "px; -webkit-perspective:" + perspective + "px; "+ $parent.data("style"));
                }
                if(properties["scaleX"] == undefined) properties["scaleX"] = 1;
                if(properties["scaleY"] == undefined) properties["scaleY"] = 1;
                if(properties["scaleZ"] == undefined) properties["scaleZ"] = 1;
                if (properties["scale"] != undefined) {
                    properties["scaleX"] *= properties["scale"];
                    properties["scaleY"] *= properties["scale"];
                    properties["scaleZ"] *= properties["scale"];
                }
                var translate3d = "translate3d(" + (properties["x"] ? properties["x"] : 0) + "px, " + (properties["y"] ? properties["y"] : 0) + "px, " + (properties["z"] ? properties["z"] : 0) + "px)";
                var rotate3d = "rotateX(" + (properties["rotateX"] ? properties["rotateX"] : 0) + "deg) rotateY(" + (properties["rotateY"] ? properties["rotateY"] : 0) + "deg) rotateZ(" + (properties["rotateZ"] ? properties["rotateZ"] : 0) + "deg)";
                var scale3d = "scaleX(" + properties["scaleX"] + ") scaleY(" + properties["scaleY"] + ") scaleZ(" + properties["scaleZ"] + ")";
                var cssTransform = translate3d + " " + rotate3d + " " + scale3d + ";";
                this._log(cssTransform);
                $el.attr("style", "transform:" + cssTransform + " -webkit-transform:" + cssTransform + " " + style);
            }
        }, this));
        if(window.requestAnimationFrame) {
            window.requestAnimationFrame($.proxy(this._onScroll, this, false));
        }
        else {
            this._requestAnimationFrame($.proxy(this._onScroll, this, false));
        }
    }
};
;
(function($, window, undefined) {

	'use strict';

	// global
	var Modernizr = window.Modernizr,
		$body = $('body');

	$.DLMenu = function(options, element) {
		this.$el = $(element);
		this._init(options);
	};

	$.DLMenu.defaults = {
		animationClasses: {
			classin: 'mk-vm-animate-in-' + mk_vertical_header_anim,
			classout: 'mk-vm-animate-out-' + mk_vertical_header_anim
		},
		onLevelClick: function(el, name) {
			return false;
		},
		onLinkClick: function(el, ev) {
			return false;
		}
	};

	$.DLMenu.prototype = {
		_init: function(options) {

			this.options = $.extend(true, {}, $.DLMenu.defaults, options);
			this._config();

			var animEndEventNames = {
					'WebkitAnimation': 'webkitAnimationEnd',
					'OAnimation': 'oAnimationEnd',
					'msAnimation': 'MSAnimationEnd',
					'animation': 'animationend'
				},
				transEndEventNames = {
					'WebkitTransition': 'webkitTransitionEnd',
					'MozTransition': 'transitionend',
					'OTransition': 'oTransitionEnd',
					'msTransition': 'MSTransitionEnd',
					'transition': 'transitionend'
				};

			this.animEndEventName = animEndEventNames[Modernizr.prefixed('animation')] + '.dlmenu';
			this.transEndEventName = transEndEventNames[Modernizr.prefixed('transition')] + '.dlmenu';

			this.animEndEventNameUnsufixed = animEndEventNames[Modernizr.prefixed('animation')];
			this.transEndEventNameUnsufixed = transEndEventNames[Modernizr.prefixed('transition')];

			this.supportAnimations = Modernizr.cssanimations;
			this.supportTransitions = Modernizr.csstransitions;

			this._initEvents();

		},
		_config: function() {
			this.open = false;
			this.$trigger = this.$el.children('.mk-vm-trigger');
			this.$menu = this.$el.children('ul.mk-vm-menu');
			this.$menuitems = this.$menu.find('li:not(.mk-vm-back)');
			this.$back = this.$menu.find('li.mk-vm-back');
		},
		_initEvents: function() {

			var self = this;
			
			$('.mk-vm-menuwrapper a').on('transitionend', function(event) {
				event.stopPropagation();
			});

			this.$menuitems.on('click.dlmenu', 'a', function(event) {

				// Breaks smooth scroll in vertical menu
				// event.stopPropagation();

				var $item = $(event.delegateTarget),
					$submenu = $(event.currentTarget).siblings('ul.sub-menu');

				if ($submenu.length > 0) {
					var $flyin = $submenu.clone().css('opacity', 0).insertAfter(self.$menu);
					var onAnimationEndFn = function() {
						var $parent = $item.parents('.mk-vm-subviewopen:first');
						self.$menu.off(self.animEndEventName).removeClass(self.options.animationClasses.classout).addClass('mk-vm-subview');
						$item.addClass('mk-vm-subviewopen')
						$parent.removeClass('mk-vm-subviewopen').addClass('mk-vm-subview');
						$flyin.remove();

						// Redraw for firefox issues
						var $txt = $item.find('.meni-item-text');
						$txt.css('opacity', 0.99);
						setTimeout(function() { $txt.css('opacity', 1) }, 0);
					};

					setTimeout(function() {
						$flyin.addClass(self.options.animationClasses.classin);
						self.$menu.addClass(self.options.animationClasses.classout);
						if (self.supportAnimations) {
							self.$menu.on(self.animEndEventName, onAnimationEndFn);
						} else {
							onAnimationEndFn.call();
						}

						self.options.onLevelClick($item, $item.children('a:first').text());
					});


					// This caused firefox issue. Test properly if need to bring it back
					// if (self.open) {
					// 	self._closeMenu();
					// } else {
					// 	self._openMenu();
					// }

					return false;

				} else {
					self.options.onLinkClick($item, event);
				}

			});


			// this.$trigger.on('click.dlmenu', function() {

			// 	if (self.open) {
			// 		self._closeMenu();
			// 	} else {
			// 		// if( ! $(this).hasClass('menu-item-has-children') ) return false;
			// 		self._openMenu();
			// 	}
			// 	return false;

			// });

			this.$back.on('click.dlmenu', function(event) {

				var $this = $(this),
					$submenu = $this.parents('ul.sub-menu:first'),
					$item = $submenu.parent(),

					$flyin = $submenu.clone().insertAfter(self.$menu);

				var onAnimationEndFn = function() {
					self.$menu.off(self.animEndEventName).removeClass(self.options.animationClasses.classin);
					$flyin.remove();
				};

				setTimeout(function() {
					$flyin.addClass(self.options.animationClasses.classout);
					self.$menu.addClass(self.options.animationClasses.classin);
					if (self.supportAnimations) {
						self.$menu.on(self.animEndEventName, onAnimationEndFn);
					} else {
						onAnimationEndFn.call();
					}

					$item.removeClass('mk-vm-subviewopen');

					var $subview = $this.parents('.mk-vm-subview:first');
					if ($subview.is('li')) {
						$subview.addClass('mk-vm-subviewopen');
					}
					$subview.removeClass('mk-vm-subview');
				});

				return false;

			});

		},
		closeMenu: function() {
			if (this.open) {
				this._closeMenu();
			}
		},
		_closeMenu: function() {
			var self = this,
				onTransitionEndFn = function() {
					self.$menu.off(self.transEndEventName);
					self._resetMenu();
				};

			this.$menu.removeClass('mk-vm-menuopen');
			this.$menu.addClass('mk-vm-menu-toggle');
			this.$trigger.removeClass('mk-vm-active');

			if (this.supportTransitions) {
				this.$menu.on(this.transEndEventName, onTransitionEndFn);
			} else {
				onTransitionEndFn.call();
			}

			this.open = false;
		},
		openMenu: function() {
			if (!this.open) {
				this._openMenu();
			}
		},
		_openMenu: function() {
			var self = this;
			$body.off('click').on('click.dlmenu', function() {
				self._closeMenu();
			});
			this.$menu.addClass('mk-vm-menuopen mk-vm-menu-toggle').on(this.transEndEventName, function() {
				$(this).removeClass('mk-vm-menu-toggle');
			});
			this.$trigger.addClass('mk-vm-active');
			this.open = true;
		},
		_resetMenu: function() {
			this.$menu.removeClass('mk-vm-subview');
			this.$menuitems.removeClass('mk-vm-subview mk-vm-subviewopen');
		}
	};

	var logError = function(message) {
		if (window.console) {
			window.console.error(message);
		}
	};

	$.fn.dlmenu = function(options) {
		if (typeof options === 'string') {
			var args = Array.prototype.slice.call(arguments, 1);
			this.each(function() {
				var instance = $.data(this, 'dlmenu');
				if (!instance) {
					logError("cannot call methods on dlmenu prior to initialization; " +
						"attempted to call method '" + options + "'");
					return;
				}
				if (!$.isFunction(instance[options]) || options.charAt(0) === "_") {
					logError("no such method '" + options + "' for dlmenu instance");
					return;
				}
				instance[options].apply(instance, args);
			});
		} else {
			this.each(function() {
				var instance = $.data(this, 'dlmenu');
				if (instance) {
					instance._init();
				} else {
					instance = $.data(this, 'dlmenu', new $.DLMenu(options, this));
				}
			});
		}
		return this;
	};

})(jQuery, window);
( function($) {
    'use strict';

	/* 
	 * Define popup / hover states manually to prevent click for IE on touchdevices
	 */

	$('.mk-main-navigation .menu-item-has-children').children('a').attr('aria-haspopup', 'true'); 
	$('.animated-column-item').attr('aria-haspopup', 'true');

})( jQuery );
(function($) {
    'use strict';

    var Accordion = function(el) { 
        // Private
        var that = this,
            $el = $(el),
            initial = $el.data('initialindex'),
            timeout;

        // Public
        this.$el = $el;
        this.$single = $('.' + this.dom.single, $el);
        this.isExpendable = ($el.data('style') === 'toggle-action');

        // Init 
        this.bindClicks();
        // Reveal initial tab on load event (wait for possible images inside)
        $(window).on('load', function() {
            if( initial !== -1 ) that.show(that.$single.eq(initial), true)
        });
        $(window).on('resize', function() {
            clearTimeout(timeout);
            timeout = setTimeout(that.bindClicks.bind(that), 500);
        }); 
    }

    Accordion.prototype.dom = {
        // only class names please!
        single        : 'mk-accordion-single',
        tab           : 'mk-accordion-tab',
        pane          : 'mk-accordion-pane',
        current       : 'current',
        mobileToggle  : 'mobile-false',
        mobileBreakPoint : 767
    }

    Accordion.prototype.bindClicks = function() {
        // Prevent multiple events binding
        this.$single.off('click', '.' + this.dom.tab);

        if( !(window.matchMedia('(max-width: ' + this.dom.mobileBreakPoint +'px)').matches 
          && this.$el.hasClass(this.dom.mobileToggle)) ) {

            this.$single.on('click', '.' + this.dom.tab, this.handleEvent.bind(this));
            // When website is loaded in mobile view and resized to desktop 'current' will 
            // inherit display: none from css. Repair it by calling show() on this element
            var $current = $('.' + this.dom.current, this.$el);
            if($('.' + this.dom.pane, $current).css('display') === 'none') this.show($current);
        }
    }

    Accordion.prototype.handleEvent = function(e) {
        e.preventDefault();
        e.stopPropagation();

        var $single = $(e.delegateTarget);

        if(!$single.hasClass(this.dom.current)) {
            this.show($single);
        }
        else {
            if(this.isExpendable) this.hide($single);
        }
    }

    Accordion.prototype.hide = function($single) {
        $single.removeClass(this.dom.current);
        $('.' + this.dom.pane, $single).slideUp();
    }

    Accordion.prototype.show = function($single, initial) {
        // hide currently opened tab
        if(!this.isExpendable) {
            var that = this;
            this.hide($('.' + this.dom.current, that.$el));
        }

        $single.addClass(this.dom.current);
        $('.' + this.dom.pane, $single).slideDown('', function() {
            if ( initial || ! $(this).parents('.mk-accordion').hasClass('scroll-click') ) {
                return;
            }

            if (typeof $single.prev() === 'undefined') {
                $single = $single.prev()
            }

            window.scrollTo({ top: $single.offset().top - 100, left: 0, behavior: 'smooth' });
        });
    }



    // ///////////////////////////////////////
    //
    // Apply to:
    //
    // ///////////////////////////////////////

	function init() {
		$('.mk-accordion').each(function() {
			new Accordion(this);
		});
	}

	init();
	$(window).on('vc_reload', init);

})(jQuery);

(function($) {

    'use strict';

    var SkillDiagram = function( el ) {
        this.el = el;
    }

    SkillDiagram.prototype = {
        init : function() {
            this.cacheElements();
            this.createDiagram();
            this.$skills.each( this.createSkill.bind( this ) );
        },

        cacheElements : function() {
            this.$el = $( this.el );
            this.$skills = this.$el.find( '.mk-meter-arch');
            this.config  = this.$el.data();
            this.config.radius = this.config.dimension / 2;
        },

        random : function( l, u ) {
            return Math.floor( ( Math.random() * ( u - l + 1 ) ) + l );
        },

        createDiagram : function() {
            var self = this;
            $(this.el).find('svg').remove();

            this.diagram = Raphael( this.el, this.config.dimension, this.config.dimension );

            // Make svg scalable in different screen sizes
            this.diagram.setViewBox(0,0,this.config.dimension,this.config.dimension,true);
            this.diagram.setSize('90%', '90%');

            this.diagram.circle( this.config.radius, this.config.radius, 80 ).attr({
                stroke: 'none',
                fill: this.config.circleColor
            });

            // Export title
            this.title = this.diagram.text( this.config.radius, this.config.radius, this.config.defaultText ).attr({
                font: "22px helvetica",
                fill: this.config.defaultTextColor
            }).toFront();

            this.diagram.customAttributes.arc = function(value, color, rad){
                var v = 3.6 * value,
                    alpha = v == 360 ? 359.99 : v,
                    r  = self.random( 91, 240 ),
                    a  = (r - alpha) * Math.PI/180,
                    b  = r * Math.PI/180,
                    sx = self.config.radius + rad * Math.cos(b),
                    sy = self.config.radius - rad * Math.sin(b),
                    x  = self.config.radius + rad * Math.cos(a),
                    y  = self.config.radius - rad * Math.sin(a),
                    path = [['M', sx, sy], ['A', rad, rad, 0, +(alpha > 180), 1, x, y]];

                return {
                    path: path,
                    stroke: color
                }
            }
        },

        createSkill : function( id, el ) {
            var self   = this,
                $this  = $( el ),
                config = $this.data(),
                radMin = 72,
                radVal = 27,
                newRad = radMin + ( radVal * (id + 1) );

            var $path = this.diagram.path().attr({
                'stroke-width': 28,
                arc: [config.percent, config.color, newRad]
            });

            $path.mouseover( function() {
                self.showSkill( this, config.name, config.percent );
            }).mouseout( function() {
                self.hideSkill( this )
            });
        },

        showSkill : function( self, name, percent ) {
            var $this = self,
                time = 250;

            //solves IE problem
            if(Raphael.type != 'VML') $this.toFront();

            $this.animate({
                'stroke-width': 50,
                'opacity': 0.9,
            }, 800, 'elastic' );

            this.title.stop()
                .animate({ opacity: 0 }, time, '>', function(){
                    this.attr({ text: name + '\n' + percent + '%' }).animate({ opacity: 1 }, time, '<');
                }).toFront();
        },

        hideSkill : function( self ) {
            var $this = self,
                self = this,
                time = 250;

            $this.stop().animate({
                'stroke-width': 28,
                opacity: 1
            }, time * 4, 'elastic' );

            self.title.stop()
                .animate({ opacity: 0 }, time, '>', function(){
                    self.title.attr({ text: self.config.defaultText })
                    .animate({ opacity: 1 }, time, '<');
                });
        }
    }

    var init = function init() {
        if( typeof Raphael === 'undefined' ) return;
        $( '.mk-skill-diagram' ).each( function() {
            var diagram = new SkillDiagram( this );
                diagram.init();
        });
    }

    init();
    $(window).on('vc_reload', init);

})(jQuery);

/*
 * Tab delegation 
 * Action for modules when we don't have access to chidren DOM on processing templates
 * yet we want ass option of opening link in new tab. 
 * Helpful for use with external widgets like flickr
 */

(function($) {

	'use strict';

	$( '[data-js="tab-delegation"]' ).each( tabDelegation );

	function tabDelegation() {
		var $this = $( this ),
			data  = $this.data();

		// Create delegation on parent element to affect async loaded children
		if( data.tab ) $this.on( 'click', 'a', openInTab );
	}

	function openInTab( e ) {
		e.preventDefault(); 

		var $this = $( this ),
			url = $this.attr( 'href' );

		window.open( url, '_blank' );
	}

})(jQuery);
(function($) {
    'use strict';

    var init = function init() {
        var Toggle = function(el) {
        var that = this,
            $el = $(el);

            this.$el = $el;
            $el.on('click', function() {
                $el.hasClass('active-toggle') ? that.close() : that.open()
            });
        };

        Toggle.prototype.dom = {
            pane   : 'mk-toggle-pane',
            active : 'active-toggle'
        };

        Toggle.prototype.open = function() {
            var $this = this.$el;
            $this.addClass(this.dom.active);
            $this.siblings('.' + this.dom.pane).slideDown(200);
        };

        Toggle.prototype.close = function() {
            var $this = this.$el;
            $this.removeClass(this.dom.active);
            $this.siblings('.' + this.dom.pane).slideUp(200);
        };

        // Apply to.
        var $toggle = $('.mk-toggle-title');

        if(!$toggle.length) return;

        $toggle.each(function() {
            new Toggle(this);
        });
    }
    $(window).on('load vc_reload', init);

})(jQuery);

//////////////////////////////////////////////////////////////////////////
//
//   Init all scripts
//
//////////////////////////////////////////////////////////////////////////

// This is bad but we don't have other access to this scope.
// Ajax Portfolio  is defined as plugin and on success needs these to be reinited
// We'll refactor all of this.
window.ajaxInit = function() {
    mk_lightbox_init();
    mk_click_events();
    mk_social_share_global();
   // mk_social_share();
    mk_gallery();
    loop_audio_init();
};

window.ajaxDelayedInit = function() {
    mk_flexslider_init();
    // mk_portfolio_ajax();
};

$(document).ready(function() {
    mk_lightbox_init();
    mk_login_form();
    mk_backgrounds_parallax();
    mk_flexslider_init();
    mk_event_countdown();
    mk_skill_meter();
    mk_milestone();
    mk_ajax_search();
    mk_hover_events();
    mk_portfolio_ajax();
    product_loop_add_cart();
  //  mk_social_share();
    loop_audio_init();
    mk_portfolio_widget();
    mk_contact_form();
    mk_blog_carousel();
    mk_header_searchform();
    mk_click_events();
    mk_text_typer();
    mk_tab_slider_func();
    mkPositionSidebar();

    $(window).on('load', function() {
        mk_unfold_footer();
        mk_tabs();
        mk_accordion_toggles_tooltip();
        mk_gallery();
        mk_theatre_responsive_calculator();
        mk_tabs_responsive();
        mk_start_tour_resize();
        mk_header_social_resize();
        mk_page_section_social_video_bg();
        mk_one_page_scroller();

        setTimeout(function() {
            /*
                Somehow the values are not correctly updated for the screens
                and we need to put setTimeout to fix the issue
            */
            mk_mobile_tablet_responsive_calculator();
        }, 300);

        console.log("ready for rock");
    });


    var onDebouncedResize = function() {
        mk_theatre_responsive_calculator();
        mk_mobile_tablet_responsive_calculator();
        mk_tabs_responsive();
        mk_accordion_toggles_tooltip();
        mk_start_tour_resize();
        mk_header_social_resize();

        setTimeout(function() {
            mk_unfold_footer();
        }, 300);
    };

    var debounceResize = null;
    $(window).on("resize", function() {
        if( debounceResize !== null ) { clearTimeout( debounceResize ); }
        debounceResize = setTimeout( onDebouncedResize, 300 );
    });

    var onDebouncedScroll = function() {
        mk_skill_meter();
        //TODO: Ask to Bart how we can call javascript component
        //mk_charts();
        mk_milestone();
    };

    var debounceScroll = null;
    $(window).on("scroll", function() {
        if( debounceScroll !== null ) { clearTimeout( debounceScroll ); }
        debounceScroll = setTimeout( onDebouncedScroll, 100 );
    });

    if (MK.utils.isMobile()) {
        $('body').addClass('no-transform');
    }

});

/* VC frontend editor  */
/* -------------------------------------------------------------------- */
$(window).on("vc_reload",function () {
    mk_flexslider_init();
    loop_audio_init();
    mk_tab_slider_func();
    mk_event_countdown();
    videoLoadState();
    mk_page_section_social_video_bg();
    mk_hover_events();

    setTimeout(function() {
        mkPositionSidebar();
    }, 200);
});

// Replace this if new event for remove found.
$( document ).on( 'click', '.vc_control-btn-delete', function() {
    $( window ).trigger( 'vc_reload' );
} );

$( document ).on( 'sortupdate', '.ui-sortable', function() {
    $( window ).trigger( 'vc_reload' );
} );

/* Typer */
/* -------------------------------------------------------------------- */
function mk_text_typer() {

    "use strict";

    $('[data-typer-targets]').each(function() {
        var that = this;
        MK.core.loadDependencies([ MK.core.path.plugins + 'jquery.typed.js' ], function() {
            var $this = $(that),
                $first_string = [$this.text()],
                $rest_strings = $this.attr('data-typer-targets').split(','),
                $strings = $first_string.concat($rest_strings);

            $this.text('');

            $this.typed({
                strings: $strings,
                typeSpeed: 30, // typing speed
                backDelay: 1200, // pause before backspacing
                loop: true, // loop on or off (true or false)
                loopCount: false, // number of loops, false = infinite
            });
        });
    });
}



/* Tab Slider */
/* -------------------------------------------------------------------- */

function mk_tab_slider_func() {

    "use strict";

    $('.mk-tab-slider').each(function() {
        var that = this;

        MK.core.loadDependencies([ MK.core.path.plugins + 'jquery.swiper.js' ], function() {
            var $this = $(that),
                id = $this.data('id'),
                $autoplayTime = $this.data('autoplay'),
                $content = $('.mk-slider-content');

            var mk_tab_slider = $this.swiper({
                wrapperClass: 'mk-tab-slider-wrapper',
                slideClass: 'mk-tab-slider-item',
                calculateHeight: true,
                speed: 500,
                autoplay: isTest ? false : $autoplayTime,
                onSlideChangeStart: function() {
                    $('.mk-tab-slider-nav[data-id="' + id + '"]').find(".active").removeClass('active')
                    $('.mk-tab-slider-nav[data-id="' + id + '"]').find("a").eq(mk_tab_slider.activeIndex).addClass('active')
                }
            });

            // Simple repaint for firefox issue (can't handle 100% height after plugin init)
            function repaintFirefox() {
                $content.css('display','block');
                setTimeout(function() {
                    mk_tab_slider.reInit();
                    $content.css('display','table');
                },100);
            }

            $('.mk-tab-slider-nav[data-id="' + id + '"]').find("a").first().addClass('active');

            $('.mk-tab-slider-nav[data-id="' + id + '"]').find("a").on('touchstart mousedown', function(e) {
                e.preventDefault()
                $('.mk-tab-slider-nav[data-id="' + id + '"]').find(".active").removeClass('active')
                $(this).addClass('active')
                mk_tab_slider.swipeTo($(this).index())
            });

            $('.mk-tab-slider-nav[data-id="' + id + '"]').find("a").on('click',function(e) {
                e.preventDefault();
            });

            repaintFirefox();
            $(window).on('resize', repaintFirefox);
        });

    });

}



/* Edge One Pager */
/* -------------------------------------------------------------------- */
function mk_one_page_scroller() {

    "use strict";

    $('.mk-edge-one-pager').each(function() {
        var self = this;

        MK.core.loadDependencies([ MK.core.path.plugins + 'jquery.fullpage.js' ], function() {

            var $this = $(self),
                anchorArr = [];

            $this.find('.section').each(function() {
                anchorArr.push($(this).attr('data-title'));
            });

            var scrollable = true;
            $this.find('.section').each(function() {
                var $section = $(this),
                    $content = $section.find('.edge-slide-content'),
                    sectionHeight = $section.height(),
                    contentHeight = $content.innerHeight();

                if((contentHeight + 30) > $(window).height()) {
                    scrollable = false;
                }
            });

            if(!scrollable){
                $this.find('.section').each(function() {
                    var $section = $(this);
                    $section.addClass('active').css({
                        'padding-bottom': '50px'
                    });
                });
            }

            if(scrollable) {
                $this.fullpage({
                    verticalCentered: false,
                    resize: true,
                    slidesColor: ['#ccc', '#fff'],
                    anchors: anchorArr,
                    scrollingSpeed: 600,
                    easing: 'easeInQuart',
                    menu: false,
                    navigation: true,
                    navigationPosition: 'right',
                    navigationTooltips: false,
                    slidesNavigation: true,
                    slidesNavPosition: 'bottom',
                    loopBottom: false,
                    loopTop: false,
                    loopHorizontal: true,
                    autoScrolling: true,
                    scrollOverflow: false,
                    css3: true,
                    paddingTop: 0,
                    paddingBottom: 0,
                    normalScrollElements: '.mk-header, .mk-responsive-wrap',
                    normalScrollElementTouchThreshold: 5,
                    keyboardScrolling: true,
                    touchSensitivity: 15,
                    continuousVertical: false,
                    animateAnchor: true,

                    onLeave: function(index, nextIndex, direction) {
                        var currentSkin = $this.find('.one-pager-slide').eq(nextIndex - 1).attr('data-header-skin');
                        MK.utils.eventManager.publish( 'firstElSkinChange', currentSkin );
                        $('#fullPage-nav').removeClass('light-skin dark-skin').addClass(currentSkin + '-skin');

                    },
                    afterRender: function() {

                        var $nav = $('#fullPage-nav');

                        setTimeout(function() {
                            var currentSkin = $this.find('.one-pager-slide').eq(0).attr('data-header-skin');
                            MK.utils.eventManager.publish( 'firstElSkinChange', currentSkin );
                            if($nav.length) $nav.removeClass('light-skin dark-skin').addClass(currentSkin + '-skin');
                        }, 300);

                        var $slide = $this.find('.section'),
                            headerHeight = MK.val.offsetHeaderHeight(0),
                            windowHeight = $(window).height();

                        $slide.height(windowHeight - headerHeight);

                        if($nav.length) {
                            $nav.css({
                                'top': 'calc(50% + ' + (headerHeight/2) + 'px)',
                                'marginTop': 0
                            });

                            var style = $this.attr('data-pagination');
                            $nav.addClass('pagination-' + style);
                        }

                        setTimeout(mk_one_pager_resposnive, 1000);
                    },
                    afterResize: function() {
                        var $slide = $this.find('.section'),
                            headerHeight = MK.val.offsetHeaderHeight(0),
                            windowHeight = $(window).height();

                        $slide.height(windowHeight - headerHeight);

                        $('#fullPage-nav').css({
                            'top': 'calc(50% + ' + (headerHeight/2) + 'px)',
                            'marginTop': 0
                        });

                        setTimeout(mk_one_pager_resposnive, 1000);
                        console.log('Reposition pager content.');
                    },
                });
            }

            // Linking to slides available for desktop and mobile scenarios
            function swipeTo(href, e) {
                href = '_' + href; // ensure a char before #
                if (!~href.indexOf('#')) return;
                var section = href.split('#')[1];
                if (~anchorArr.indexOf(section)) {
                    if (typeof e !== 'undefined') e.preventDefault();
                    if (scrollable) $.fn.fullpage.moveTo(section);
                    else MK.utils.scrollToAnchor('[data-title="'+section+'"]');
                }
            }

            // onload
            var loc = window.location;
            if(loc.hash) swipeTo(loc.hash);

            $(document).on('click', 'a', function(e) {
                var $link = $(e.currentTarget);
                swipeTo($link.attr('href'), e);
            });
        });
    });



}


function mk_one_pager_resposnive() {
    "use strict";

    $('.mk-edge-one-pager').each(function() {
        var $pager = $(this),
            headerHeight = MK.val.offsetHeaderHeight(0),
            windowHeight = $(window).height() - headerHeight;

        $pager.find('.one-pager-slide').each(function() {
            var $slide = $(this),
                $content = $slide.find('.edge-slide-content');

            if ($slide.hasClass('left_center') || $slide.hasClass('center_center') || $slide.hasClass('right_center')) {
                var contentHeight  = $content.height(),
                    distanceFromTop = (windowHeight - contentHeight) / 2;

                distanceFromTop  = (distanceFromTop < 50) ? 50 + headerHeight : distanceFromTop;

                $content.css('marginTop', distanceFromTop);
            }

            if ($slide.hasClass('left_bottom') || $slide.hasClass('center_bottom') || $slide.hasClass('right_bottom')) {
                var distanceFromTop = windowHeight - $content.height() - 90;
                $content.css('marginTop', (distanceFromTop));
            }
        });

        /**
         * Fix AM-2853
         *
         * @since 6.0.3
         *
         * At the init of Edge One Pager (EOP), EOP will render all image
         * background of each sections from top to bottom. In this case,
         * the page height will be more than screen height and the scroll
         * bar will appear. At the same time, the full width row will set
         * the container width into 100%. But, after all Slides are set up,
         * EOP height will be 100% of the screen height, so the scroll bar
         * will be disappeared. It's caused spacing issues on the left and
         * right side of the EOP container. To fix this, the row width
         * should be resized and row position should be readjusted.
         */
        var $row = $pager.parents( '.vc_row.vc_row-fluid.mk-fullwidth-true' );

        // Run only if the Edge One Pager is wrapped inside full width row.
        if ( $row.length > 0 ) {
            // Set the wrapper and row width.
            var $wrapper = $( '.mk-main-wrapper-holder' );
            var $grid = $row.children( '.mk-grid' );
            var rowWidth = $row.width();         // Original width.
            var wrapperWidth = $wrapper.width(); // The new width.

            // Run only if original width is smaller than the new width.
            if ( rowWidth >= wrapperWidth || $grid.length > 0 ) {
                return;
            }

            // Get the content left offset.
            var $content = $wrapper.find( '.theme-content' );
            var oriPos = $content.position();
            var oriPadLeft = $content.css( 'padding-left' );
            var oriLeft = parseInt( oriPos.left ) + parseInt( oriPadLeft );

            // Ensure the new width and left position is more than 0.
            if ( wrapperWidth <= 0 || oriLeft <= 0 ) {
                return;
            }

            // Resize the width and left position of row full width.
            $row.css({
                'width': wrapperWidth,
                'left': oriLeft * -1,
            });
        }
    });
}

/* Image Gallery */
/* -------------------------------------------------------------------- */

function mk_gallery() {

    "use strict";

    $('.mk-gallery .mk-gallery-item.hover-overlay_layer .item-holder').each(function() {
        var itemHolder = $(this),
            galleryDesc = itemHolder.find('.gallery-desc');

        function updatePosition() {
            var parentHeight = itemHolder.outerHeight(),
                contentHeight = galleryDesc.innerHeight();

            var paddingVal = (parentHeight - contentHeight) / 2;
            galleryDesc.css({
                'top': paddingVal,
                // 'padding-bottom': paddingVal
            });

            // console.log(parentHeight);
            // console.log(contentHeight);


        }
        updatePosition();

        $(window).on('resize', function() {
            setTimeout(function() {
                updatePosition();
            }, 1000);
        });
    });
    // Execute hover state for mk gallery item
    if ($(window).width() <= 1024) {
        $('.mk-gallery .mk-gallery-item').on('click', function (e) {
            var clicks = $(this).data('clicks');
            if (clicks) {
                // First click
                $(this).toggleClass('hover-state');
            } else {
                // Second click
                $(this).toggleClass('hover-state');
            }
            $(this).data("clicks", !clicks);
        });
    }
}

/* Theatre Slider Responsive Calculator */
/* -------------------------------------------------------------------- */

function mk_theatre_responsive_calculator() {
    var $laptopContainer = $(".laptop-theatre-slider");
    var $computerContainer = $(".desktop-theatre-slider");
    $laptopContainer.each(function() {
        var $this = $(this),
            $window = $(window),
            $windowWidth = $window.outerWidth(),
            $windowHeight = $window.outerHeight(),
            $width = $this.outerWidth(),
            $height = $this.outerHeight(),
            $paddingTop = 38,
            $paddingRight = 143,
            $paddingBottom = 78,
            $paddingLeft = 143;

        var $player = $this.find('.player-container');

        if ($windowWidth > $width) {
            $player.css({
                'padding-left': parseInt(($width * $paddingLeft) / 1200),
                'padding-right': parseInt(($width * $paddingRight) / 1200),
                'padding-top': parseInt(($height * $paddingTop) / 690),
                'padding-bottom': parseInt(($height * $paddingBottom) / 690),
            });
        }

    });

    $computerContainer.each(function() {
        var $this = $(this),
            $window = $(window),
            $windowWidth = $window.outerWidth(),
            $windowHeight = $window.outerHeight(),
            $width = $this.outerWidth(),
            $height = $this.outerHeight(),
            $paddingTop = 60,
            $paddingRight = 52,
            $paddingBottom = 290,
            $paddingLeft = 49;

        var $player = $this.find('.player-container');

        if ($windowWidth > $width) {
            $player.css({
                'padding-left': parseInt(($width * $paddingLeft) / 1200),
                'padding-right': parseInt(($width * $paddingRight) / 1200),
                'padding-top': parseInt(($height * $paddingTop) / 969),
                'padding-bottom': parseInt(($height * $paddingBottom) / 969),
            });
        }

    });

}

/* Mobile and Tablet Slideshow Responsive Calculator */
/* -------------------------------------------------------------------- */
function mk_mobile_tablet_responsive_calculator() {
    var $laptopSlideshow = $(".mk-laptop-slideshow-shortcode");
    var $lcdSlideshow = $(".mk-lcd-slideshow");

    if ($.exists(".mk-laptop-slideshow-shortcode")) {
        $laptopSlideshow.each(function() {
            var $this = $(this),
                $window = $(window),
                $windowWidth = $window.outerWidth(),
                $windowHeight = $window.outerHeight(),
                $width = $this.outerWidth(),
                $height = $this.outerHeight(),
                $paddingTop = 28,
                $paddingRight = 102,
                $paddingBottom = 52,
                $paddingLeft = 102;

            var $player = $this.find(".slideshow-container");

            $player.css({
                "padding-left": parseInt(($width * $paddingLeft) / 836),
                "padding-right": parseInt(($width * $paddingRight) / 836),
                "padding-top": parseInt(($height * $paddingTop) / 481),
                "padding-bottom": parseInt(($height * $paddingBottom) / 481),
            });

        });
    }

    if ($.exists(".mk-lcd-slideshow")) {
        $lcdSlideshow.each(function() {
            var $this = $(this),
                $window = $(window),
                $windowWidth = $window.outerWidth(),
                $windowHeight = $window.outerHeight(),
                $width = $this.outerWidth(),
                $height = $this.outerHeight(),
                $paddingTop = 35,
                $paddingRight = 39,
                $paddingBottom = 213,
                $paddingLeft = 36;

            var $player = $this.find(".slideshow-container");
            $player.css({
                "padding-left": parseInt(($width * $paddingLeft) / 886),
                "padding-right": parseInt(($width * $paddingRight) / 886),
                "padding-top": parseInt(($height * $paddingTop) / 713),
                "padding-bottom": parseInt(($height * $paddingBottom) / 713),
            });
        });
    }
}


/* Start a tour resize function */
/* -------------------------------------------------------------------- */
function mk_start_tour_resize() {

    $('.mk-header-start-tour').each(function() {

        var $windowWidth = $(document).width(),
            $this = $(this),
            $linkWidth = $this.width() + 15,
            $padding = ($windowWidth - mk_responsive_nav_width) / 2;



        function updateStartTour(){
            if($windowWidth < mk_responsive_nav_width){
                $this.removeClass('hidden');
                $this.addClass('show');
            }else{
                if($padding < $linkWidth){
                    $this.removeClass('show');
                    $this.addClass('hidden');
                }else{
                    $this.removeClass('hidden');
                    $this.addClass('show');
                }
            }
        }

        setTimeout(function() {
            updateStartTour();
        }, 300);
    });
}

/* Header social resize function */
/* -------------------------------------------------------------------- */
function mk_header_social_resize() {

    $('.mk-header-social.header-section').each(function() {

        var $windowWidth = $(document).width(),
            $this = $(this),
            $linkWidth = $this.width() + 15,
            $padding = ($windowWidth - mk_responsive_nav_width) / 2;



        function updateStartTour(){
            if($windowWidth < mk_responsive_nav_width){
                $this.removeClass('hidden');
                $this.addClass('show');
            }else{
                if($padding < $linkWidth){
                    $this.removeClass('show');
                    $this.addClass('hidden');
                }else{
                    $this.removeClass('hidden');
                    $this.addClass('show');
                }
            }
        }

        setTimeout(function() {
            updateStartTour();
        }, 300);
    });
}

/* Page Section Socail Video Player Controls */
/* -------------------------------------------------------------------- */

function mk_page_section_social_video_bg() {
    $(".mk-page-section.social-hosted").each(function() {
        var $container = $(this),
            $sound = $container.data('sound'),
            $source = $container.data('source'),
            player,
            timer = 1000;

        if ( $( 'body' ).hasClass( '.compose-mode' ) ) {
            timer = 2000;
        }

        if ($source == 'youtube') {
            var youtube = $container.find('iframe')[0];
            try {
                player = new YT.Player(youtube, {
                    events: {
                        'onReady': function () {
                           player.playVideo();
                           if($sound == false) {
                               player.mute();
                           }
                       }
                    }
                });


            } catch (e) {
            	console.log( e );
            }
        }
        if ($source == 'vimeo') {
            var vimeo = $container.find('iframe')[0];
            player = $f(vimeo);
            setTimeout(function() {
                player.api('play');
                if($sound === false) {
                    player.api('setVolume', 0);
                }
            }, timer);
        }

    });
}

// Pre RequireJS hot bug fixing

function videoLoadState() {
    $('.mk-section-video video').each(function() {
        var mkVideo = this;

        mkVideo.play();
        this.onload = fire();

        function fire() {
            setTimeout(function() {
                $(mkVideo).animate({
                    'opacity': 1
                }, 300);
            }, 1000);
        }
    });
}
videoLoadState();


// Gmap Widget
(function($) {

    $(window).on('load vc_reload', initialize);

    function initialize() {
        var $gmap = $('.gmap_widget');
        if($gmap.length && typeof google !== 'undefined') $gmap.each(run);
    }

    function run() {
        var $mapHolder = $(this);
        var myLatlng = new google.maps.LatLng($mapHolder.data('latitude'), $mapHolder.data('longitude'));
        var mapOptions = $mapHolder.data('options');
            mapOptions.mapTypeId = google.maps.MapTypeId.ROADMAP;
            mapOptions.center = myLatlng;
        var map = new google.maps.Map(this, mapOptions);

        new google.maps.Marker({
            position: myLatlng,
            map: map
        });
    }

}(jQuery));

// Instagram Widget
(function($) {

    $(window).on('load', function() {
        var $feeds = $('.mk-instagram-feeds');
        if($feeds.length) $feeds.each(run);
    });

    function run() {
        var options = $(this).data('options');
            options.template = '<a class="featured-image '+options.tmp_col+'-columns" href="{{link}}" target="_'+options.tmp_target+'"><div class="item-holder"><img src="{{image}}" /><div class="image-hover-overlay"></div></div></a>';
        var feed = new Instafeed(options);
        feed.run();
    }
}(jQuery));


// Flipbox backface visibility fix for chrome
(function($) {
     $(window).on('load', function() {
         setTimeout( function() {
            $('.chrome-flipbox-backface-fix').removeClass('chrome-flipbox-backface-fix');
         }, 300);
     });
}(jQuery));


/* Product in VC Tab Bug Fix
/* -------------------------------------------------------------------- */
(function($) {
    $(window).on('load', function() {
        $('.vc_tta-tab a').on('click', function() {
            setTimeout( function() {
                $(window).trigger('resize');
            }, 100);
        });
    });
}(jQuery));


/* Vertical menu fix when childrens exceed screen height
/* -------------------------------------------------------------------- */
(function($) {
    $(window).on('load', function() {
        $('#mk-vm-menu .menu-item-has-children, #mk-vm-menu .mk-vm-back').on('mouseenter', function() {
            var $header_inner = $(this).closest('.mk-header-inner'),
                $header_inner_height = $header_inner.outerHeight(),
                $header_bg = $header_inner.find('.mk-header-bg'),
                total_height = 0;
            $header_bg.css('height', '100%');
            setTimeout( function() {
                $header_inner.children(':visible').each(function() {
                    total_height += $(this).outerHeight(true);
                });
                total_height -= $header_bg.height();
                if ( total_height < $header_inner_height ) {
                    $header_bg.css('height', '100%');
                } else {
                    $header_bg.css('height', total_height + 'px');
                }
            }, 600);
        });
    });
}(jQuery));


/* Woocommerce varitions lightbox fix
/* -------------------------------------------------------------------- */
(function($) {
    $(window).on('load', function() {

        if ( $('.woo-variation-gallery-thumbnail-wrapper').length > 0 ) {
            return;
        }

        var $variations_form = $('.variations_form');

        if ( $variations_form.length ) {

            var $varitions_selects = $variations_form.find('.variations').find('.value').find('select');
            $varitions_selects.on('change', function() {

                // Woocommerce variations lightbox with galleries
                var $all_img_container = $('.mk-product-image .mk-woocommerce-main-image');
                if ( $all_img_container.length ) {
                    $( $all_img_container ).each( set_lightbox_href );
                }

            });
            $varitions_selects.trigger('change');

        }

    });

    function set_lightbox_href() {

        var $product_img = $( this ).find( 'img' ),
            $lightbox    = $( this ).find( '.mk-lightbox' );

        setTimeout( function() {
            var image_url    = $product_img.attr( 'src' ),
                image_suffix = image_url.substr( image_url.lastIndexOf('.') - image_url.length ), // Get image suffix
                image_url    = image_url.slice( 0 , image_url.lastIndexOf('-') ); // Remove image size
            $lightbox.attr('href', image_url + image_suffix );
        }, 300);
    }

}(jQuery));


/* Remove video section when on mobile */
/* -------------------------------------------------------------------- */
if( ! MK.utils.showBackgroundVideo ) {
	(function($) {
		if ( MK.utils.isMobile() ) {
		  $('.mk-section-video video').remove();
		  $('.mk-section-video').addClass('mk-section-video-disable');
		}
	}(jQuery));
}


/* Yith AJAX Product Filter & Yith Infinite Scrolling Plugin Fix
/* -------------------------------------------------------------------- */
(function($) {
    $(window).on('load', function() {

        $(document).on( 'yith-wcan-ajax-filtered yith_infs_added_elem yith-wcan-ajax-reset-filtered', function(){
            setTimeout( function() {
                MK.utils.eventManager.publish('ajaxLoaded');
                MK.core.initAll( document );
            }, 1000 );
        });

        // Fixed YITH Filter plugin causes issue for dropdown sort
        $(document).on( 'yith-wcan-ajax-filtered yith-wcan-ajax-reset-filtered', function(){
            setTimeout( function() {
                $( '.woocommerce-ordering' ).on( 'change', 'select.orderby', function() {
                    $( this ).closest( 'form' ).submit();
                });
            }, 1000 );
        });

    });
}(jQuery));


/* Toggle loading state in URL for anchor links.
 * - Add a filter to escape meta-chars from hash string.
/* -------------------------------------------------------------------- */
!function(e){var a=window.location,n=a.hash;if(n.length&&n.substring(1).length){var hSuf = n.substring(1).replace(/[!"#$%&'()*+,./:;<=>?@[\]^`{|}~]/g, "\\$&");var r=e(".vc_row, .mk-main-wrapper-holder, .mk-page-section, #comments"),t=r.filter("#"+hSuf);if(!t.length)return;n=n.replace("!loading","");var i=n+"!loading";a.hash=i}}(jQuery);


/* Determine the top spacing of sidebar for full-width page section & row.
/* -------------------------------------------------------------------- */
function mkPositionSidebar() {

	var themeContent = $( '.theme-content' ),
		lastFullWidthChild = themeContent.find( '.vc_row-full-width' ).last(),
		top,
		sidebar = $( '#theme-page > .mk-main-wrapper-holder > .theme-page-wrapper > #mk-sidebar' );

	if ( ! lastFullWidthChild.length ) {
		sidebar.removeAttr( 'style' );
		return;
	}

	top = lastFullWidthChild.offset().top - themeContent.offset().top;
	sidebar.css( 'padding-top', top );
}

function mk_accordion_toggles_tooltip() {

  "use strict";


  /* Message Boxes */
  /* -------------------------------------------------------------------- */

  $('.box-close-btn').on('click', function() {
    $(this).parent().fadeOut(300);
    return false;

  });

}

function mk_portfolio_ajax() {
  "use strict";

  var headerHeight = 0;
  if ($.exists("#wpadminbar")) {
    headerHeight += $("#wpadminbar").height();
  }
  if (!$.exists('.mk-vm-menuwrapper')) {
    headerHeight += parseInt($('.mk-header').attr('data-sticky-height'));
  }

  function init() {
    var $portfolio = $('.portfolio-grid.portfolio-ajax-enabled');
    if (!$portfolio.length) return; // quit if no portfolio wrappers
    MK.core.loadDependencies([ MK.core.path.plugins + 'jquery.ajax.portfolio.js' ], function() {
      // wait for ajax response propagation and insertion
      setTimeout(function() {
        $portfolio.each( function() {
          $(this).ajaxPortfolio({ extraOffset: headerHeight });
        });
      }, 100);
    });
  }

  init();

  // Reinit when ajax loaded stuff
  // We have global reinit on Components. so move the ajaxPortfolio to component namespace as a standalone module to get it right.
  MK.utils.eventManager.subscribe('ajaxLoaded', init);
}

/**
 * Ajax Search on header nav.
 */
function mk_ajax_search() {
    "use strict";

    // Check if ajax search box enabled.
    if (mk_ajax_search_option !== "beside_nav") {
        return;
    }

    // Set minimum length of text to get ajax result.
    var minimumLengthToSearch = 3;
    var $mkAjaxSearchInput = $('#mk-ajax-search-input');
    var security = $mkAjaxSearchInput.siblings('input[name="security"]').val();
    var wpHttpReferer = $mkAjaxSearchInput.siblings('input[name="_wp_http_referer"]').val();
    var querySpliter = (ajaxurl.indexOf('?') > -1) ? '&' : '?';
    var ul = document.getElementById('mk-nav-search-result');
    var searchTerm; // Search term
    var requestCounter = 0;
    var responseCounter = 0;

    // Add listener for getting result quickly while user entering text, past text and etc.
    $mkAjaxSearchInput.on('paste input propertychange', onSearchBoxInput);

    /**
     * Callback function for entering search term listener (e.g. keyup).
     * It will generate AJAX request to get data.
     *
     * @param e
     */
    function onSearchBoxInput(e) {
        var target = e.target || e.srcElement;
        var newValue = target.value;

        // Check if user change the value of text box
        if (searchTerm !== newValue) {
            searchTerm = newValue;
            ul.innerHTML = '';
            if (searchTerm.length >= minimumLengthToSearch) {
                // Show loading icon
                $mkAjaxSearchInput.addClass('ajax-searching');
                requestCounter++;
                $.getJSON(ajaxurl + querySpliter + 'callback=?&action=mk_ajax_search&security=' + security + '&_wp_http_referer=' + wpHttpReferer + '&term=' + searchTerm)
                    .done(showSearchResult)
                    .fail(showErrorMessage);
            }
        }
    }

    /**
     * Callback function for the response of the search request.
     *
     * @param data
     */
    function showSearchResult(data) {
        responseCounter++;

        // Only show response of latest request.
        if (isCorrectResponse()) {
            if (data.length > 0) {
                // Append result to result container
                for (var i = 0; i < data.length; i++) {
                    var item = data[i];
                    $('<li>').append('<a href="' + item.link + '">' + item.image + '<span class="search-title">' + item.label + '</span><span class="search-date">' + item.date + '</span></a>').appendTo(ul);
                }
            } else {
                // Show no result message
                ul.innerHTML = '<li class="mk-nav-search-result-zero">No Result.</li>';
            }

            // Hide loading icon
            $mkAjaxSearchInput.parent('form').removeClass('ajax-searching').addClass('ajax-search-complete');
        }
    }

    /**
     * If any errors, we need a handler to show error message.
     */
    function showErrorMessage() {
        responseCounter++;

        if (isCorrectResponse()) {
            ul.innerHTML = '<li class="mk-nav-search-error-message">Can not search! Please try again.</li>';
        }
    }

    /**
     * Check if the response is right for the request. we show latest response only.
     *
     * @returns {boolean}
     */
    function isCorrectResponse() {
        return requestCounter === responseCounter;
    }
}
/* Background Parallax Effects */
/* -------------------------------------------------------------------- */

function mk_backgrounds_parallax() {

  "use strict";

  if (mk_header_parallax == true) {
    $('.mk-header-bg').addClass('mk-parallax-enabled');
  }
  if (mk_body_parallax == true) {
    $('body').addClass('mk-parallax-enabled');
  }
  if (mk_banner_parallax == true) {
    $('.mk-header').addClass('mk-parallax-enabled');
  }
  if (mk_footer_parallax == true) {
    $('#mk-footer').addClass('mk-parallax-enabled');
  }

  $('.mk-parallax-enabled').each(function () {
    var $this = $( this );
    if (!MK.utils.isMobile()) {
      MK.core.loadDependencies([ MK.core.path.plugins + 'jquery.parallax.js' ], function() {
        $this.parallax("49%", 0.3);
      });
    }
  });

  $('.mk-fullwidth-slideshow.parallax-slideshow').each(function () {
    var $this = $( this );
    if (!MK.utils.isMobile()) {
      MK.core.loadDependencies([ MK.core.path.plugins + 'jquery.parallax.js' ], function() {
        var speed_factor = $this.attr('data-speedFactor');
        $this.parallax("49%", speed_factor);
      });
    }
  });

}
/* Blog, Portfolio Audio */
/* -------------------------------------------------------------------- */

function loop_audio_init() {
  if (!$.exists('.jp-jplayer')) {
    return;
  }

  $('.jp-jplayer.mk-blog-audio').each(function () {
    var $this = $(this);
    var $thisControls = $this.next('.jp-audio');
    var audio = $this.find( '.mk-audio' )[0];

    // Set initial values.
    $thisControls.find('.jp-current-time').text('0:0');
    $thisControls.find('.jp-volume-bar-value').css('width', 25);

    /*
     * When audio data is loaded.
     */
    audio.addEventListener('loadeddata', jsPlayerloaded(audio, $thisControls), false);

    audio.addEventListener('loadedmetadata', function() {
      var minutes = Math.floor(audio.duration / 60);
      var seconds = Math.floor(audio.duration % 60);

      // Update the duration time.
      if (!isNaN(minutes)) {
        $thisControls.find('.jp-duration').text(minutes + ':' + seconds);
      }

      // Show play button when audio is loaded.
      $thisControls.removeClass('jp-audio-loading').addClass('jp-audio-loaded');
    });

    /*
     * When audio is playing.
     */
    audio.addEventListener('timeupdate', function() {
      var minutes = Math.floor(audio.currentTime / 60);
      var seconds = Math.floor(audio.currentTime % 60);

      // Update curren time.
      $thisControls.find('.jp-current-time').text(minutes + ':' + seconds);

      // Convert length of audio to 0 - 100 while keeping ratio.
      var position = ((audio.currentTime - 0) / (audio.duration - 0)) * (100 - 0) + 0;

      // Update position of progress bar.
      $thisControls.find('.jp-play-bar').css('width', position + '%');
    });

    /*
     * When audio is ended.
     */
    audio.addEventListener('ended', function() {
      // Show play button.
      $thisControls.removeClass('jp-audio-playing');

      // Reset the position of progress bar.
      $thisControls.find('.jp-play-bar').css('width', 0);

      // Reset the current time.
      $thisControls.find('.jp-current-time').text('0:0');
    });

    /*
     * Play the audio.
     */
    $thisControls.find('.jp-play').on('click', function() {
      audio.play();

      // Show pause button.
      $thisControls.addClass('jp-audio-playing').removeClass('jp-audio-paused');
    });

    /*
     * Pause the audio..
     */
    $thisControls.find('.jp-pause').on('click', function() {
      audio.pause();

      // Show play button.
      $thisControls.addClass('jp-audio-paused').removeClass('jp-audio-playing');
    });

    /*
     * Mute the audio.
     */
    $thisControls.find('.jp-volume-bar svg').on('click', function() {
      audio.muted = !audio.muted;

      $(this).parent().toggleClass('jp-muted');
    });

    /*
     * Adjust the volume.
     */
    $thisControls.find('.inner-value-adjust').on('click', function(e) {
      // Get the posiiton of mouse click, between 0 to 25.
      var position = e.pageX - $(this).offset().left;

      // Scale the number from 0 - 25 to 0 - 1 while keeping ratio.
      var volume = ((position - 0) / (25 - 0)) * (1 - 0) + 0;

      // Set volume.
      audio.volume = volume;

      // Update the position of volume bar.
      $(this).find('.jp-volume-bar-value').css('width', position);
    });

    /*
     * Adjust current time from progress bar.
     */
    $thisControls.find('.jp-seek-bar').on('click', function(e) {
      // Get the position of mouse click.
      var position = e.pageX - $(this).offset().left;

      // Scale the number from 0 - currentTime to 0 - 100 while keeping ratio.
      var currnetTime = ((position - 0) / ($(this).width() - 0)) * (audio.duration - 0) + 0;

      // Set current time.
      audio.currentTime = currnetTime;

      // Update the position of progress bar.
      $thisControls.find('.jp-play-bar').css('width', currnetTime + '%');
    });
  });

  function jsPlayerloaded(audio, $thisControls) {
    var minutes = Math.floor(audio.duration / 60);
    var seconds = Math.floor(audio.duration % 60);

    // Update the duration time.
    if (!isNaN(minutes)) {
      $thisControls.find('.jp-duration').text(minutes + ':' + seconds);
    }

    // Show play button when audio is loaded.
    $thisControls.removeClass('jp-audio-loading').addClass('jp-audio-loaded');
  }
}

/* Blog Loop Carousel Shortcode */
/* -------------------------------------------------------------------- */


function mk_blog_carousel() {

  "use strict";

  if (!$.exists('.mk-blog-showcase')) {
    return;
  }
  $('.mk-blog-showcase ul li').each(function () {

    $(this).mouseenter( function () {

      $(this).siblings('li').removeClass('mk-blog-first-el').end().addClass('mk-blog-first-el');

    });

  });


}




/**
 * Contact Form
 *
 * Mostly implemented in Vanilla JS instead of jQuery.
 */
function mk_contact_form() {
    "use strict";
    var mkContactForms = document.getElementsByClassName('mk-contact-form');
    if (mkContactForms.length === 0) {
        return;
    }
    var captchaImageHolder = $('.captcha-image-holder');
    var activeClassName = 'is-active';
    var invalidClassName = 'mk-invalid';
    for (var i = 0; i < mkContactForms.length; i++) {
        initializeForm(mkContactForms[i], activeClassName, invalidClassName);
    }
    if (captchaImageHolder.length > 0) {
        $(window).on('load', initializeCaptchas);
    }
    /**
     * Initialize mk forms. e.g add activeClassName for inputs.
     *
     * @param form
     * @param activeClassName
     * @param invalidClassName
     */
    function initializeForm(form, activeClassName, invalidClassName) {
        var inputs = getFormInputs(form);
        for (var i = 0; i < inputs.length; i++) {
            markActiveClass(inputs[i]);
        }
        form.addEventListener('submit', function(e) {
            validateForm(e, invalidClassName);
        });
        /**
         * Set activeClassName for the parent node of the inout
         */
        function setActiveClass() {
            addClass(this.parentNode, activeClassName);
        }
        /**
         * Unset activeClassName from the parent node of the input.
         * We need to unset activeClassName only if the data was empty.
         * e.g. in the line style of the mk-contact-form, we set labels position based on activeClassName.
         */
        function unsetActiveClass() {
            if (this.value === '') {
                removeClass(this.parentNode, activeClassName);
            }
        }
        /**
         * Add event listeners (focus,blur) for input to set and unset activeClassName.
         *
         * @param input
         */
        function markActiveClass(input) {
            input.addEventListener('focus', setActiveClass);
            input.addEventListener('blur', unsetActiveClass);
        }
    }
    /**
     * Validate form when it's submitted. If everything was valid, we with post form in ajax request.
     *
     * @param e
     * @param invalidClassName
     */
    function validateForm(e, invalidClassName) {
        e.preventDefault();
        var form = e.target || e.srcElement;
        var inputs = getFormInputs(form);
        var isValidForm = true;
        var hasCaptchaField = false;
        for (var i = 0; i < inputs.length; i++) {
            var input = inputs[i];
            input.value = String(input.value).trim();
            switch (input.type) {
                case 'hidden':
                    break;
                case 'checkbox':
                    isValidForm = validateCheckBox(input, invalidClassName) && isValidForm;
                    break;
                case 'email':
                    isValidForm = validateEmail(input, invalidClassName) && isValidForm;
                    break;
                case 'textarea':
                    isValidForm = validateText(input, invalidClassName) && isValidForm;
                    break;
                case 'text':
                    /**
                     * Some old browsers such as IE 8 and 9 detect email type as text.
                     * So, we need to extra check for data-type attribute
                     */
                    if (input.dataset.type === 'captcha') {
                        isValidForm = validateText(input, invalidClassName) && isValidForm;
                        hasCaptchaField = true;
                    } else if (input.dataset.type === 'email') {
                        isValidForm = validateEmail(input, invalidClassName) && isValidForm;
                    } else {
                        isValidForm = validateText(input, invalidClassName) && isValidForm;
                    }
                    break;
                default:
                    /**
                     * e.g. validating for radiobox, selectbox and etc.
                     */
                    console.warn('Implement validation for ' + input.name + ':' + input.type);
                    break;
            }
        }
        if (isValidForm) {
            if (hasCaptchaField) {
                validateCaptcha(form, invalidClassName, sendForm);
            } else {
                sendForm(form);
            }
        }
    }
    /**
     * Validate captcha of form. If everything was, we will execute captchaIsValidCallback which as sendForm().
     *
     * @param form
     * @param invalidClassName
     * @param captchaIsValidCallback
     * @returns boolean
     */
    function validateCaptcha(form, invalidClassName, captchaIsValidCallback) {
        var input = form.querySelectorAll('[data-type="captcha"]')[0];
        if (input.value.length === 0) {
            addClass(input, invalidClassName);
            return false;
        } else {
            window.get.captcha(input.value).done(function(data) {
                loadCaptcha();
                input.value = '';
                if (data !== 'ok') {
                    addClass(input, invalidClassName);
                    addClass(input, 'contact-captcha-invalid');
                    removeClass(input, 'contact-captcha-valid');
                    input.placeholder = mk_captcha_invalid_txt;
                } else {
                    removeClass(input, invalidClassName);
                    removeClass(input, 'contact-captcha-invalid');
                    addClass(input, 'contact-captcha-valid');
                    input.placeholder = mk_captcha_correct_txt;
                    captchaIsValidCallback(form);
                }
            });
        }
    }
    /**
     * Send submitted form.
     *
     * @param form
     */
    function sendForm(form) {
        var $form = $(form);
        var data = getFormData(form);
        progressButton.loader($form);
        $.post(ajaxurl, data, function(response) {
            var res = JSON.parse(response);
            if (res.action_Status) {
                progressButton.success($form);
                $form.find('.text-input').val('');
                $form.find('textarea').val('');
                $form.find('input[type=checkbox]').attr("checked", false);
                $form.find('.contact-form-message').slideDown().addClass('state-success').html(res.message);
                setTimeout(function() {
                   $form.find('.contact-form-message').slideUp();  
                }, 5000);
            } else {
                progressButton.error($form);
                $form.find('.contact-form-message').removeClass('state-success').html(res.message);
            }
        });
    }
    /**
     * Initialize all captcha images for first time. All captcha images is always same. e.g. if we have multiple form,
     * all of them will have the same image.
     * It will also add event listener for '.captcha-change-image' objects to reload the captcha.
     */
    function initializeCaptchas() {
        var captchaChangeImageButtons = document.getElementsByClassName('captcha-change-image');
        for (var i = 0; i < captchaChangeImageButtons.length; i++) {
            captchaChangeImageButtons[i].addEventListener('click', loadCaptcha);
        }
    }
    /**
     * Load captcha text and append the image to captcha container.
     * If it used as a callback, it will prevent default behave of the event.
     * e.g. loading new captcha by click on <a> without changing url.
     */
    function loadCaptcha(e) {
        if (e) {
            e.preventDefault();
        }
        $.post(ajaxurl, {
            action: 'mk_create_captcha_image'
        }, appendImage);
        /**
         * The callback function for append or change old image src based on response. T
         * The captchaImageURL is the url of the captcha which is provided in ajax response of mk_create_captcha_image.
         * @param captchaImageURL
         */
        function appendImage(captchaImageURL) {
            if (captchaImageHolder.find('.captcha-image').length === 0) {
                captchaImageHolder.html('<img src="' + captchaImageURL + '" class="captcha-image" alt="captcha txt">');
            } else {
                captchaImageHolder.find('.captcha-image').attr("src", captchaImageURL + '?' + new Date().getTime());
            }
        }
    }
    /**
     * Get form inputs using querySelectorAll().
     * It returns <input> and <textarea> tags. If you need any other tags such as <select>, please update this function.
     *
     * @param form
     * @returns {NodeList}
     */
    function getFormInputs(form) {
        return form.querySelectorAll('input,textarea');
    }
    /**
     * Get data of the form inputs and textareas as a object.
     *
     * @param form
     * @returns {{action: string}}
     */
    function getFormData(form) {
        var data = {
            action: 'mk_contact_form'
        };
        var inputs = getFormInputs(form);
        for (var i = 0; i < inputs.length; i++) {
            data[inputs[i].name] = inputs[i].value;
        }
        return data;
    }
}
/* Ajax Login Form */
/* -------------------------------------------------------------------- */
function mk_login_form() {
    $('form.mk-login-form').each(function() {
        var $this = $(this);
        $this.on('submit', function(e) {
            $('p.mk-login-status', $this).show().text(ajax_login_object.loadingmessage);
            $.ajax({
                type: 'POST',
                dataType: 'json',
                url: ajax_login_object.ajaxurl,
                data: {
                    'action': 'ajaxlogin',
                    'username': $('#username', $this).val(),
                    'password': $('#password', $this).val(),
                    'security': $('#security', $this).val()
                },
                success: function(data) {
                    $('p.mk-login-status', $this).text(data.message);
                    if (data.loggedin === true) {
                        document.location.href = ajax_login_object.redirecturl;
                    }
                }
            });
            e.preventDefault();
        });
    });
}
/* Progress Button */
/* -------------------------------------------------------------------- */
var progressButton = {
    loader: function(form) {
        MK.core.loadDependencies([MK.core.path.plugins + 'tweenmax.js'], function() {
            var $form = form,
                progressBar = $form.find(".mk-progress-button .mk-progress-inner"),
                buttonText = $form.find(".mk-progress-button .mk-progress-button-content"),
                progressButton = new TimelineLite();
            progressButton.to(progressBar, 0, {
                width: "100%",
                scaleX: 0,
                scaleY: 1
            }).to(buttonText, .3, {
                y: -5
            }).to(progressBar, 1.5, {
                scaleX: 1,
                ease: Power2.easeInOut
            }, "-=.1").to(buttonText, .3, {
                y: 0
            }).to(progressBar, .3, {
                scaleY: 0
            });
        });
    },
    success: function(form) {
        MK.core.loadDependencies([MK.core.path.plugins + 'tweenmax.js'], function() {
            var $form = form,
                buttonText = $form.find(".mk-button .mk-progress-button-content, .mk-contact-button .mk-progress-button-content"),
                successIcon = $form.find(".mk-progress-button .state-success"),
                progressButtonSuccess = new TimelineLite({
                    onComplete: hideSuccessMessage
                });
            progressButtonSuccess.to(buttonText, .3, {
                paddingRight: 20,
                ease: Power2.easeInOut
            }, "+=1").to(successIcon, .3, {
                opacity: 1
            }).to(successIcon, 2, {
                opacity: 1
            });

            function hideSuccessMessage() {
                progressButtonSuccess.reverse()
            }
        });
    },
    error: function(form) {
        MK.core.loadDependencies([MK.core.path.plugins + 'tweenmax.js'], function() {
            var $form = form,
                buttonText = $form.find(".mk-button .mk-progress-button-content, .mk-contact-button .mk-progress-button-content"),
                errorIcon = $form.find(".mk-progress-button .state-error"),
                progressButtonError = new TimelineLite({
                    onComplete: hideErrorMessage
                });
            progressButtonError.to(buttonText, .3, {
                paddingRight: 20
            }, "+=1").to(errorIcon, .3, {
                opacity: 1
            }).to(errorIcon, 2, {
                opacity: 1
            });

            function hideErrorMessage() {
                progressButtonError.reverse()
            }
        });
    }
};
function mk_click_events() {
  "use strict";

  var eventtype = 'click'; 

  $(".mk-header-login, .mk-header-signup, .mk-side-dashboard, .mk-quick-contact-wrapper, .mk-dashboard-trigger, .blog-share-container, .news-share-buttons, .main-nav-side-search, #mk-fullscreen-search-wrapper, #fullscreen-navigation").on(eventtype, function(event) {
    if (event.stopPropagation) {
      event.stopPropagation();
    } else if (window.event) {
      window.event.cancelBubble = true;
    }
  });
  $("html").on(eventtype, function() {
    $(".mk-login-register, .mk-header-subscribe, #mk-quick-contact, .single-share-buttons, .single-share-box, .blog-social-share, .news-share-buttons, #mk-nav-search-wrapper").fadeOut(300);
    $('.mk-quick-contact-link').removeClass('quick-contact-active');
    // Removed By Maki for repairing fullnav scroll issue. Hope it odesnt break anything
    // $('body').css('overflow', 'visible');
  });

  $('.mk-fullscreen-search-overlay').on(eventtype,function(){
    $(this).removeClass('mk-fullscreen-search-overlay-show');
  });

  $('.mk-forget-password').on(eventtype, function() {
    $('.mk-forget-panel').siblings().hide().end().show();
  });

  $('.mk-create-account').on(eventtype, function() {
    $('#mk-register-panel').siblings().hide().end().show();
  });

  $('.mk-return-login').on(eventtype, function() {
    $('#mk-login-panel').siblings().hide().end().show();
  });


  $('.mk-quick-contact-link').on(eventtype, function() {
    var $this = $(this),
        $quickContact = $('#mk-quick-contact');
    if (!$this.hasClass('quick-contact-active')) {
      $quickContact.addClass('quick-contact-anim').fadeIn(250);
      $this.addClass('quick-contact-active');
    } else {
      $quickContact.removeClass('quick-contact-anim').fadeOut(100);
      $this.removeClass('quick-contact-active');
    }
    return false;
  });

}

function mk_social_share_global() {

  "use strict";

  var eventtype = 'click';

  $('.twitter-share').on(eventtype, function() {
    var $this = $(this),
        $url = $this.attr('data-url'),
        $title = $this.attr('data-title');

    window.open('http://twitter.com/intent/tweet?text=' + $title + ' ' + $url, "twitterWindow", "height=380,width=660,resizable=0,toolbar=0,menubar=0,status=0,location=0,scrollbars=0");
    return false;
  });

  $('.pinterest-share').on(eventtype, function() {
    var $this = $(this),
        $url = $this.attr('data-url'),
        $title = $this.attr('data-title'),
        $image = $this.attr('data-image');
    window.open('http://pinterest.com/pin/create/button/?url=' + $url + '&media=' + $image + '&description=' + $title, "twitterWindow", "height=320,width=660,resizable=0,toolbar=0,menubar=0,status=0,location=0,scrollbars=0");
    return false;
  });

  $('.facebook-share').on(eventtype, function() {
    var $url = $(this).attr('data-url');
    window.open('https://www.facebook.com/sharer/sharer.php?u=' + $url, "facebookWindow", "height=380,width=660,resizable=0,toolbar=0,menubar=0,status=0,location=0,scrollbars=0");
    return false;
  });

  $('.googleplus-share').on(eventtype, function() {
    var $url = $(this).attr('data-url');
    window.open('https://plus.google.com/share?url=' + $url, "googlePlusWindow", "height=380,width=660,resizable=0,toolbar=0,menubar=0,status=0,location=0,scrollbars=0");
    return false;
  });

  $('.linkedin-share').on(eventtype, function() {
    var $this = $(this),
        $url = $this.attr('data-url'),
        $title = $this.attr('data-title'),
        $desc = $this.attr('data-desc');
    window.open('http://www.linkedin.com/shareArticle?mini=true&url=' + $url + '&title=' + $title + '&summary=' + $desc, "linkedInWindow", "height=380,width=660,resizable=0,toolbar=0,menubar=0,status=0,location=0,scrollbars=0");
    return false;
  });
}


/* Event Count Down */
/* -------------------------------------------------------------------- */

function mk_event_countdown() {
  if ($.exists('.mk-event-countdown')) {

    MK.core.loadDependencies([ MK.core.path.plugins + 'jquery.countdown.js' ], function() {

      $('.mk-event-countdown').each(function () {
        if (isTest) return;
        var $this = $(this),
          $date = $this.attr('data-date'),
          $offset = $this.attr('data-offset');

        $this.downCount({
          date: $date,
          offset: $offset
        });
      });
      
    });
  }
}
/* Flexslider init */
/* -------------------------------------------------------------------- */

function mk_flexslider_init() {

  var $lcd = $('.mk-lcd-slideshow'),
      $laptop = $('.mk-laptop-slideshow-shortcode');

  if($lcd.length) $lcd.find('.mk-lcd-image').fadeIn();
  if($laptop.length) $laptop.find(".mk-laptop-image").fadeIn();

  $('.js-flexslider').each(function () {

    if ($(this).parents('.mk-tabs').length || $(this).parents('.mk-accordion').length) {
      $(this).removeData("flexslider");
    }

    var $this = $(this),
      $selector = $this.attr('data-selector'),
      $animation = $this.attr('data-animation'),
      $easing = $this.attr('data-easing'),
      $direction = $this.attr('data-direction'),
      $smoothHeight = $this.attr('data-smoothHeight') == "true" ? true : false,
      $slideshowSpeed = $this.attr('data-slideshowSpeed'),
      $animationSpeed = $this.attr('data-animationSpeed'),
      $controlNav = $this.attr('data-controlNav') == "true" ? true : false,
      $directionNav = $this.attr('data-directionNav') == "true" ? true : false,
      $pauseOnHover = $this.attr('data-pauseOnHover') == "true" ? true : false,
      $isCarousel = $this.attr('data-isCarousel') == "true" ? true : false;


    if ($selector !== undefined) {
      var $selector_class = $selector;
    } else {
      var $selector_class = ".mk-flex-slides > li";
    }

    if ($isCarousel === true) {
      var $itemWidth = parseInt($this.attr('data-itemWidth')),
        $itemMargin = parseInt($this.attr('data-itemMargin')),
        $minItems = parseInt($this.attr('data-minItems')),
        $maxItems = parseInt($this.attr('data-maxItems')),
        $move = parseInt($this.attr('data-move'));
    } else {
      var $itemWidth = $itemMargin = $minItems = $maxItems = $move = 0;
    }

    MK.core.loadDependencies([ MK.core.path.plugins + 'jquery.flexslider.js' ], function() {
      $this.flexslider({
        selector: $selector_class,
        animation: $animation,
        easing: $easing,
        direction: $direction,
        smoothHeight: $smoothHeight,
        slideshow: !isTest, // autoplay
        slideshowSpeed: $slideshowSpeed,
        animationSpeed: $animationSpeed,
        controlNav: $controlNav,
        directionNav: $directionNav,
        pauseOnHover: $pauseOnHover,
        prevText: "",
        nextText: "",
        itemWidth: $itemWidth,
        itemMargin: $itemMargin,
        minItems: $minItems,
        maxItems: $maxItems,
        move: $move
      });
    });

  });

}

/* Header Search Form */
/* -------------------------------------------------------------------- */

function mk_header_searchform() {

  $('.mk-search-trigger').on('click',function(){
    setTimeout(function() {
        $('#mk-ajax-search-input').focus();
    },500);
  });

  "use strict";

  $('.mk-header-toolbar .mk-header-searchform .text-input').on('focus', function () {

    if ($('.mk-header-toolbar .mk-header-searchform .text-input').hasClass('on-close-state')) {
      $('.mk-header-toolbar .mk-header-searchform .text-input').removeClass('on-close-state').animate({
        'width': '200px'
      }, 200);
      return false;
    }
  });

  $(".mk-header-toolbar .mk-header-searchform").on('click',function (event) {
    if (event.stopPropagation) {
      event.stopPropagation();
    } else if (window.event) {
      window.event.cancelBubble = true;
    }
  });


  $("html").on('click',function () {
    $(this).find(".mk-header-toolbar .mk-header-searchform .text-input").addClass('on-close-state').animate({
      'width': 90
    }, 300);
  });

  // Fix search for edge browser
  if(MK.utils.browser.name === 'Edge') {
    $('#mk-fullscreen-search-input').on('keydown', function(e) {
      if (e.which == 13) {
        e.preventDefault();
        $('#mk-fullscreen-searchform').submit();
      }
    });
  }

}




/* Hover Events */
/* -------------------------------------------------------------------- */

function mk_hover_events() {

  "use strict";

  $('.shopping-cart-header').hover(
    function() {
      $(this).find('.mk-shopping-cart-box').stop(true, true).fadeIn(250);
    },
    function() {
      $(this).find('.mk-shopping-cart-box').stop(true, true).delay(500).fadeOut(250);
    }
  );


  $('.widget-sub-navigation > ul > li, .widget_nav_menu ul.menu > li, .widget_product_categories ul > .cat-item').each(function() {

    var $this = $(this),
        $subLevel = $this.find('ul').first();

    if ($this.hasClass('page_item_has_children') || $this.hasClass('menu-item-has-children') || $this.hasClass('cat-parent')) {
      $this.on('click', function() {
        if($this.hasClass('toggle-active')) {
            $subLevel.stop(true, true).slideUp(700);
            $this.removeClass('toggle-active');
        } else {
            $subLevel.stop(true, true).slideDown(700);
            $this.addClass('toggle-active');
        }
      });

      $subLevel.on('click', function(e){
        e.stopPropagation();
      });
    }

  });

  // var eventtype = mobilecheck() ? 'touchstart' : 'click';
  var eventtype = 'click';

  $('.mk-fullscreen-trigger').on(eventtype, function(e) {
    $('.mk-fullscreen-search-overlay').addClass('mk-fullscreen-search-overlay-show');
    setTimeout(function(){
      $("#mk-fullscreen-search-input").focus();
    }, 300);
    e.preventDefault();
  });

  $('.mk-fullscreen-close').on(eventtype, function(e) {
    $('.mk-fullscreen-search-overlay').removeClass('mk-fullscreen-search-overlay-show');
    e.preventDefault();
  });

}

function mk_unfold_footer() {
  var $this = $('#mk-footer'),
      $spacer = $('#mk-footer-unfold-spacer'),
      $footerHeight = $this.outerHeight();

  // Stick with CSS media query breakpoint to target exact screen width
  if( !window.matchMedia("(max-width: 767px)").matches ) {
      if ($this.hasClass('mk-footer-unfold')) {
        $spacer.css('height', $footerHeight);
      }
  } else {
     $spacer.css('height', 0);
  }
}

/* jQuery fancybox lightbox */
/* -------------------------------------------------------------------- */
function mk_lightbox_init() {

	$(".mk-lightbox").fancybox({
		loop: true,
	});

	$.fancybox.defaults.hash = false;

}


/* Milestone Number Shortcode */
/* -------------------------------------------------------------------- */

function mk_milestone() {

  "use strict";

  if( isTest || !$.exists('.mk-milestone') ) return;

  $('.mk-milestone').each(function () {
    var $this = $(this),
      stop_number = $this.find('.milestone-number').attr('data-stop'),
      animation_speed = parseInt($this.find('.milestone-number').attr('data-speed'));

    var build = function() {
      if (!$this.hasClass('scroll-animated')) {
        $this.addClass('scroll-animated');

        $({
          countNum: $this.find('.milestone-number').text()
        }).animate({
          countNum: stop_number
        }, {
          duration: animation_speed,
          easing: 'linear',
          step: function () {
            $this.find('.milestone-number').text(Math.floor(this.countNum));
          },
          complete: function () {
            $this.find('.milestone-number').text(this.countNum);
          }
        });
      }
    };

    if ( !MK.utils.isMobile() ) {
      // refactored only :in-viewport logic. rest is to-do
      MK.utils.scrollSpy( this, {
          position: 'bottom',
          after: build
      });
    } else {
      build();
    }

  });

}




/* Recent Works Widget */
/* -------------------------------------------------------------------- */

function mk_portfolio_widget() {

  "use strict";

  $('.widget_recent_portfolio li').each(function () {

    $(this).find('.portfolio-widget-thumb').on('hover',function () {

      $(this).siblings('.portfolio-widget-info').animate({
        'opacity': 1
      }, 200);
    }, function () {

      $(this).siblings('.portfolio-widget-info').animate({
        'opacity': 0
      }, 200);
    });

  });
}



/* Skill Meter and Charts */
/* -------------------------------------------------------------------- */
function mk_skill_meter() {
    "use strict";
    if ($.exists('.mk-skill-meter')) {
        if (!MK.utils.isMobile()) {
            $(".mk-skill-meter .progress-outer").each(function() {
                var $this = $(this);

                var build = function() {
                    if (!$this.hasClass('scroll-animated')) {
                        $this.addClass('scroll-animated');
                        $this.animate({
                            width: $this.attr("data-width") + '%'
                        }, 2000);
                    }
                };

                MK.utils.scrollSpy( this, {
                    position: 'bottom',
                    after: build
                });
            });
        } else {
            $(".mk-skill-meter .progress-outer").each(function() {
                var $this = $(this);
                if (!$this.hasClass('scroll-animated')) {
                    $this.addClass('scroll-animated');
                    $this.css({
                        width: $(this).attr("data-width") + '%'
                    });
                }
            });
        }
    }
}

// function mk_charts() {
//     "use strict";

//     if( !$.exists('.mk-chart') ) return;

//     MK.core.loadDependencies([ MK.core.path.plugins + 'jquery.easyPieChart.js' ], function() {

//         $('.mk-chart').each(function() {

//             var $this = $(this),
//                 $parent_width = $(this).parent().width(),
//                 $chart_size = parseInt($this.attr('data-barSize'));

//             if ($parent_width < $chart_size) {
//                 $chart_size = $parent_width;
//                 $this.css('line-height', $chart_size);
//                 $this.find('i').css({
//                     'line-height': $chart_size + 'px'
//                 });
//                 $this.css({
//                     'line-height': $chart_size + 'px'
//                 });
//             }

//             var build = function() {
//                 $this.easyPieChart({
//                     animate: 1300,
//                     lineCap: 'butt',
//                     lineWidth: $this.attr('data-lineWidth'),
//                     size: $chart_size,
//                     barColor: $this.attr('data-barColor'),
//                     trackColor: $this.attr('data-trackColor'),
//                     scaleColor: 'transparent',
//                     onStep: function(value) {
//                         this.$el.find('.chart-percent span').text(Math.ceil(value));
//                     }
//                 });
//             };

//             // refactored only :in-viewport logic. rest is to-do
//             MK.utils.scrollSpy( this, {
//                 position: 'bottom',
//                 after: build
//             });


//         });
//     });
// }
/* Toolbar subscribe form */
/* -------------------------------------------------------------------- */

$( "#mc-embedded-subscribe-form" ).on('submit',function( e ){
    var $this = $(this);

    e.preventDefault();
    $.ajax({
        url: MK.core.path.ajaxUrl,
        type: "POST",
        data: {
            action: "mk_ajax_subscribe",
            email: $this.find( ".mk-subscribe--email" ).val(),
            list_id: $this.find( ".mk-subscribe--list-id" ).val(),
            optin: $this.find( ".mk-subscribe--optin" ).val()
        },
        success: function ( res ) {
            $this.parent().find( ".mk-subscribe--message" ).html( $.parseJSON( res ).message );
        }
    });
});

/**
 * Add class to tag. It's vanilla js instead of jQuery.
 * @param tag
 * @param className
 */
function addClass(tag, className) {
    tag.className += ' ' + className;
}

/**
 * Remove class from tag. It's vanilla js instead of jQuery.
 * Replacing should be with g for replacing all occurrence.
 *
 * @param tag
 * @param className
 */
function removeClass(tag, className) {
    tag.className = tag.className.replace(new RegExp(className, 'g'), '');
}


/**
 * If we're running under Node for testing purpose.
 */
if(typeof exports !== 'undefined') {
    exports.addClass = addClass;
    exports.removeClass = removeClass;
}

/*!
*  javascript-debounce 1.0.0
*
*  A lightweight, dependency-free JavaScript module for debouncing functions based on David Walsh's debounce function.
*
*  Source code available at: https://github.com/jgarber623/javascript-debounce
*
*  (c) 2015-present Jason Garber (http://sixtwothree.org)
*
*  javascript-debounce may be freely distributed under the MIT license.
*/

(function(root, factory) {
	if (typeof define === "function" && define.amd) {
		define([], factory);
	} else if (typeof exports === "object") {
		module.exports = factory();
	} else {
		root.debounce = factory();
	}
})(this, function() {
	"use strict";
	return function(callback, delay) {
		var timeout;
		return function() {
			var context = this, args = arguments;
			clearTimeout(timeout);
			timeout = setTimeout(function() {
				callback.apply(context, args);
			}, delay);
		};
	};
});

/**
 * Validate email address.
 *
 * @param input
 * @param invalidClassName
 * @returns boolean
 */
function validateEmail(input, invalidClassName) {
    var value = input.value.trim();
    if ((input.required || value.length > 0) && !/^([a-z0-9_\.\-\+]+)@([\da-z\.\-]+)\.([a-z\.]{2,63})$/i.test(value)) {
        if (invalidClassName) {
            addClass(input, invalidClassName);
        }
        return false;
    } else {
        if (invalidClassName) {
            removeClass(input, invalidClassName);
        }
        return true;
    }
}
/**
 * Validate text entry.
 *
 * @param input
 * @param invalidClassName
 * @returns boolean
 */
function validateText(input, invalidClassName) {
    var value = input.value.trim();
    if (input.required && value.length === 0) {
        if (invalidClassName) {
            addClass(input, invalidClassName);
        }
        return false;
    } else {
        if (invalidClassName) {
            removeClass(input, invalidClassName);
        }
        return true;
    }
}
/**
 * Validate Checkbox.
 *
 * @param input
 * @param invalidClassName
 * @returns boolean
 */
function validateCheckBox(input, invalidClassName) {
    if (input.required && input.checked == false) {
        if (invalidClassName) {
            addClass(input, invalidClassName);
        }
        return false;
    } else {
        if (invalidClassName) {
            removeClass(input, invalidClassName);
        }
        return true;
    }
}
/**
 * If we're running under Node for testing purpose.
 */
if (typeof exports !== 'undefined') {
    exports.validateEmail = validateEmail;
    exports.validateText = validateText;
}
(function( $ ) {
	'use strict';

    var $wrapper = $('.js-bottom-corner-btns');
    var $contactBtn = $wrapper.find('.js-bottom-corner-btn--contact');
    var $backBtn = $wrapper.find('.js-bottom-corner-btn--back');
    var hasContactBtn = $contactBtn.length;
    var hasBackBtn = $backBtn.length;

    if(!hasBackBtn) return;

    function deactivate() {
        $contactBtn.removeClass('is-active');
        $backBtn.removeClass('is-active');
    }

    function activate() { 
        $contactBtn.addClass('is-active');
        $backBtn.addClass('is-active');
    }

    MK.utils.scrollSpy( 400, {
        before: deactivate,
        after: activate
    });

})( jQuery );
(function($) {
	'use strict';
	
	$('.mk-fullscreen-nav-close, .mk-fullscreen-nav-wrapper, #fullscreen-navigation a').on('click', function(e) {
		
		// Close nav with removing classes
		$('.mk-fullscreen-nav').removeClass('opened');
		$('.mk-dashboard-trigger').removeClass('fullscreen-active');
		$('body').removeClass('fullscreen-nav-opened'); 
		
		var anchor = MK.utils.detectAnchor( this ),
		$this = $( this );
		
		// Scroll to anchor if exists
		if( anchor.length ) {
			// Moved 4 these lines after anchor check because console error. If anchor
			// return false, split part will throw an error because $this is not a link.
			// Fix AM-2027
			var href = $this.attr( 'href' ).split( '#' )[0];
			var url = window.location.href;
			var isSamePage = url.indexOf( href ) !== -1;

			if ( isSamePage ) {
				e.preventDefault();
			}
			MK.utils.scrollToAnchor( anchor );
			
		// Or do nothing if pointless # as href
		// BAD  PRACTICE: it is very popular to use "#" for click elements that we listen to with js.
		// GOOD PRACTICE: prefer "javascript:;" as easier to handle and more readable version
		} else if( $this.attr( 'href' ) === '#' ) {
			e.preventDefault();
		}
	});
	
	$('.fullscreen-navigation-ul .menu-sub-level-arrow').on('click', function(){
		$(this).siblings('.sub-menu').slideToggle();
	});
	
}(jQuery));
(function($) {
	'use strict';

	/**
     * Mega menu
     */
    var $navList = $(".main-navigation-ul");
    var megaMenu = function megaMenu() {

        $navList.MegaMenu({
            type: "vertical",
            delay: 200
        });
    };

    $(window).on('load', megaMenu);

}(jQuery));
(function($) {
	'use strict';

	/**
     * One pager menu hash update. 
     * Smooth scroll is appended globally whenever the click element has corresponding #el
     */    
    var onePageNavItem = function onePageNavItem() {
        var $this = $( this ),
            link = $this.find( 'a' ),
            anchor = MK.utils.detectAnchor( link ); // anchor on current page

        if( !anchor.length ) return;

        $this.removeClass( 'current-menu-item current-menu-ancestor current-menu-parent' );

        var activeNav = function( state ) {
            return function() {
                $this[ state ? 'addClass' : 'removeClass' ]( 'current-menu-item' );
                window.history.replaceState( undefined, undefined, [ state ? anchor : ' ' ] );
            };
        };

        MK.utils.scrollSpy( $( anchor )[0], {
            before : activeNav( false ),
            active : activeNav( true ),
            after  : activeNav( false ),
        });
    };

    var $navItems = $('.js-main-nav').find( 'li' );
    
    $(window).on('load', function() {
        // Wait with spying anchors so we do not assign anchor that is browser scroll to after page load
        // Especially when there are anchors on top - refreshing page can cause grabbing one of them into url
        // and force unwanted scroll
        setTimeout(function() {
            $navItems.each( onePageNavItem );
        }, 1000);
    });
	
}(jQuery));
(function($) {
    'use strict';

    var $window = $(window);
    var $body = $('body');
    var $resMenuWrap = $('.mk-responsive-wrap');
    var $post_nav = $('.mk-post-nav');
    var $toolbar = $('.mk-header-toolbar');
    var $resMenuLink = $('.mk-nav-responsive-link');

    // Flags
    var hasResMenu = ($resMenuWrap.length > 0);

    //initial window and screen height
    var windowHeight = $window.height();
    var screenHeight = screen.height;

    // We keep this handler above hasResMenu flag.
    // Even if our header doesn't contain droppable responsive menu (in favor of fullscreen or side menu) 
    // we still transform tollbar into collapsible menu part in responsive state
    $('.mk-toolbar-resposnive-icon').on('click', function(e) {
        e.preventDefault();
        console.log('clicked');
        if ($body.hasClass('toolbar-opened')) {
            $body.removeClass('toolbar-opened').addClass('toolbar-closed');
            $toolbar.hide();
        } else {
            $body.removeClass('toolbar-closed').addClass('toolbar-opened');
            $toolbar.show();
        }
    });


    if ( ! hasResMenu && ! $('.vc_mk_header') ) return;

    function toggleResMenu(e) {
        e.preventDefault();
        var $this = $(this);
        var $headerInner = $this.parents('header');
        var $resMenu = $headerInner.find('.mk-responsive-wrap');
        var searchBox = $('.responsive-searchform .text-input');
        var adminBarHeight = $('#wpadminbar').height(); /* Fix AM-1918 */

        if ($body.hasClass('mk-opened-nav')) {
            $this.removeClass('is-active');
            $body.removeClass('mk-opened-nav').addClass('mk-closed-nav').trigger('mk-closed-nav');
            $resMenu.hide();
            $post_nav.removeClass('post-nav-backward');
        } else {
            $this.addClass('is-active');
            $body.removeClass('mk-closed-nav').addClass('mk-opened-nav').trigger('mk-opened-nav');
            $resMenu.show();
            $post_nav.addClass('post-nav-backward');

        }

        //for iPhone 5 focus bug , remove search box focused class
        if(searchBox.hasClass('input-focused')){
            searchBox.removeClass('input-focused');
        }
        
    }

    $resMenuLink.each(function() {
        $(this).on('click', toggleResMenu);
    });

    $( window ).on( 'vc_reload', function () {
        $('.vc_mk_header .mk-nav-responsive-link').each(function() {
            $(this).on('click', toggleResMenu);
        });
    } )

    var setResMenuHeight = function() {
        var height = $window.height() - MK.val.offsetHeaderHeight(0);
        $resMenuWrap.css('max-height', height);
    };

    // check if device virtual keyboard is active 
    var isVirtualKeyboard = function() {
        var currentWindowHeight = $window.height();
        var currentScreenHeight = screen.height;
        var searchBox = $('.responsive-searchform .text-input');
        var searchBoxIsFocused = false; 

        //for iPhone 5 focus bug , add class for detect focus state
        searchBox.on('touchstart touchend', function(e) {
            searchBox.addClass('input-focused');
        });

        searchBoxIsFocused = (searchBox.is(':focus') || searchBox.hasClass("input-focused"));

        if ($body.hasClass('mk-opened-nav') && searchBoxIsFocused && currentScreenHeight == screenHeight && currentWindowHeight != windowHeight) {
            return true;
        } else {
            return false;
        }
    };

    var hideResMenu = function hideResMenu() {
        if (MK.utils.isResponsiveMenuState()) {

            //when search box in responsive menu is focused , window resize fired but at this time responsive menu should be open
            if (!isVirtualKeyboard()) {
                // hide toggled menu and its states
                if ($body.hasClass('mk-opened-nav')) {
                    $resMenuLink.filter('.is-active').trigger('click');
                }
                // hide menu wrapper
                $resMenuWrap.hide();

            }
        }
    };

    $resMenuWrap.on('click', 'a', hideResMenu);

}(jQuery));

(function($) {
    'use strict';

    var $header = $('.mk-header');    
    var hasHeader = ($header.length > 0);

    if(!hasHeader && ! $('.vc_mk_header') ) return;
    
    var $sticky_style = $header.attr('data-header-style');

    //if ($sticky_style !== 3) return;

    $('.sidedash-navigation-ul > li').each(function() {
        var $this = $(this);

        $this.children('ul').siblings('a').after('<span class="mk-nav-arrow mk-nav-sub-closed"><svg class="mk-svg-icon" data-name="mk-moon-arrow-down" data-cacheid="2" style=" height:14px; width: 14px; " xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M512 192l-96-96-160 160-160-160-96 96 256 255.999z"></path></svg></span>');
    });

    function toggleSubMenu(e) {
        e.preventDefault();
        var $this = $(this);
        
        if ($this.hasClass('mk-nav-sub-closed')) {
            $this.siblings('ul').slideDown(450).end().removeClass('mk-nav-sub-closed').addClass('mk-nav-sub-opened');
        } else {
            $this.siblings('ul').slideUp(450).end().removeClass('mk-nav-sub-opened').addClass('mk-nav-sub-closed');
        }
    };

    function toggleFullMenu(e) {
        e.preventDefault();
        var $this = $(this),
            $body = $('body'),
            $fullscreen_box = $('.mk-fullscreen-nav');

        if ($this.hasClass('dashboard-style')){
          if (!$this.hasClass('dashboard-active')) {
            $this.addClass('dashboard-active');
            $body.addClass('dashboard-opened');
          } else {
            $this.removeClass('dashboard-active'); 
            $body.removeClass('dashboard-opened');
          }
        }else if($this.hasClass('fullscreen-style')){
          if (!$this.hasClass('fullscreen-active')) {
            $this.addClass('fullscreen-active');
            $body.addClass('fullscreen-nav-opened');
            $fullscreen_box.addClass('opened');
            // MK.utils.scroll.disable();
          } else {
            $this.removeClass('fullscreen-active');
            $body.removeClass('fullscreen-nav-opened');
            $fullscreen_box.removeClass('opened');
          }
        }
    }

    $('.mk-nav-arrow').each(function() {
        $(this).stop(true).on('click', toggleSubMenu);
    });

    $('.mk-dashboard-trigger').each(function() {
        $(this).on('click', toggleFullMenu);
    });

    $( window ).on( 'vc_reload', function () {
        $('.vc_mk_header .mk-dashboard-trigger').each(function() {
            $(this).on('click', toggleFullMenu);
        });

        $('.vc_mk_header .mk-nav-arrow').each(function() {
            $(this).stop(true).on('click', toggleSubMenu);
       });
    } );

    $('html').on('click', function() {
        $('body').removeClass('dashboard-opened');
        $('.mk-dashboard-trigger').removeClass('dashboard-active');
    });

}(jQuery));

(function($) {
	'use strict';

    /**
     * Vertical menu
     */
    var $verticalMenu = $('#mk-vm-menu');
    var verticalMenu = function verticalMenu() {
        if(!$verticalMenu.data('vertical-menu') && !MK.utils.isResponsiveMenuState()) {
            $verticalMenu.dlmenu();
            $verticalMenu.data('vertical-menu', true);
        }
    };

    verticalMenu();
    $(window).on('resize', verticalMenu);
	
}(jQuery));
(function($) {
    'use strict';

    // WPML
    var $lang_item = $('.mk-main-navigation > .main-navigation-ul > .menu-item-language');
    $lang_item.addClass('no-mega-menu').css('visibility', 'visible');
    $('.mk-main-navigation .menu-item-language > a').addClass('menu-item-link');

})(jQuery);
(function($) {
	'use strict';

    var $header = $( '.mk-header' ).first(); // Theme header is always first, do not apply to shortcode headers.
    var hasHeader = ($header.length > 0);

    if(!hasHeader) return;

    var $window = $( window );
    var $document = $( document );
    var $headerHolder = $header.find( '.mk-header-holder' );
    var $paddingWrapper = $header.find('.mk-header-padding-wrapper');
    var config = $header.data();

    /**
     * Flags
     * @type {Boolean}
     */
    var isStickyLazy = (config.stickyStyle === 'lazy');
    var isStickyFixed = (config.stickyStyle === 'fixed');
    var isStickySlide = (config.stickyStyle === 'slide');

    function isSticky() { // Check for sticky compatibility
        //return config.headerStyle !== 4; header style 4 needs sticky state for transparent header.
        return true;
    }

    function isColorable() { // Check for coloring compatibility
        // TODO make it explicit in DOM that header is transparent as this is only scenario for colorable header
        // Monkey patch - exclude header styles that don't fit colorable
        return config.headerStyle !== 4;
    }


    /**
     * Change header skin
     */
	function changeSkin( e, skin ) {
		$header.attr( 'data-transparent-skin', skin );
        // Fix for class based skining
        var contrast = skin === 'light' ? 'dark' : 'light';
        $header.addClass(skin + '-skin');
        $header.removeClass(contrast + '-skin');
	}

    if(isColorable()) MK.utils.eventManager.subscribe( 'firstElSkinChange', changeSkin );


    // Assign sticky scenarions
    if (isSticky() && isStickyLazy) {
      if(config.headerStyle !== 2) {
        lazySticky();
      }
    }
    else if (isSticky() && isStickyFixed) fixedSticky();
    else if (isSticky() && isStickySlide) slideSticky();

    /**
     * Sticky header behavior: Lazy
     */
    function lazySticky() {
        var elClassHidden = 'header--hidden';
        var elClassSticky = 'a-sticky';
        var wScrollCurrent = 0;
        var wScrollBefore = 0;
        var wScrollDiff = 0;
        var wHeight = 0;
        var dHeight = 0;

        var setSizes = function setSizes() {
            dHeight = $document.height();
            wHeight = $window.height();
        };

        var onScroll = function onScroll() {
            wScrollCurrent = MK.val.scroll();
            wScrollDiff = wScrollBefore - wScrollCurrent;

            if( wScrollCurrent <= 0 ) { // scrolled to the very top; element sticks to the top
                $headerHolder.removeClass( elClassHidden );
                $header.removeClass( elClassSticky );
                $('body').trigger('mk:header-unsticky');

            } else if( wScrollDiff > 0 && $headerHolder.hasClass( elClassHidden ) ) { // scrolled up; element slides in
                $headerHolder.removeClass( elClassHidden );
                $header.addClass( elClassSticky );
                $('body').trigger('mk:header-sticky');

            } else if( wScrollDiff < 0 ) { // scrolled down

                if( wScrollCurrent + wHeight >= dHeight && $headerHolder.hasClass( elClassHidden ) ) { // scrolled to the very bottom; element slides in
                    $headerHolder.removeClass( elClassHidden );
                    $header.addClass( elClassSticky );
                    $('body').trigger('mk:header-sticky');
                } else { // scrolled down; element slides out
                    $headerHolder.addClass( elClassHidden );
                    $header.removeClass( elClassSticky );
                    $('body').trigger('mk:header-unsticky');
                }
            }

            wScrollBefore = wScrollCurrent;
        };

        setSizes();
        onScroll();
        $window.on( 'resize', MK.utils.throttle( 100, setSizes ) );
        $window.on( 'scroll', MK.utils.throttle( 500, onScroll ) );
    }


    /**
     * Sticky header behavior: Fixed
     */
    function fixedSticky() {
        var sticked = false;
        var scrollPos;

        var toggleState = function toggleState() {
            scrollPos = MK.val.scroll() + MK.val.adminbarHeight();

            if( (scrollPos > MK.val.stickyOffset() ) && ! MK.utils.isResponsiveMenuState() ) {
                if(sticked) return; // stop if already sticked
                $header.addClass('a-sticky');
                sticked = true;
                $('body').trigger('mk:header-sticky');
            } else {
                if(!sticked) return; // stop if already unsticked
                $header.removeClass('a-sticky');
                sticked = false;
                $('body').trigger('mk:header-unsticky');
            }
        };

        toggleState();
        $window.on( 'scroll', MK.utils.throttle( 100, toggleState) );
        $window.on( 'resize', MK.utils.throttle( 100, toggleState) );
    }


    /**
     * Sticky header behavior: Slide
     */
    function slideSticky() {
        var sticked = false;
        var onScroll = function onScroll() {
            if (MK.val.scroll() > MK.val.stickyOffset()) {
                if(sticked) return; // stop if already sticked
                $header.addClass('pre-sticky');
                $paddingWrapper.addClass('enable-padding');
                setTimeout(function() {
                    $header.addClass('a-sticky');
                    $('body').trigger('mk:header-sticky');
                }, 1);
                sticked = true;
            } else {
                if(!sticked) return; // stop if already unsticked
                $header.removeClass('a-sticky');
                $header.removeClass('pre-sticky');
                $paddingWrapper.removeClass('enable-padding');
                sticked = false;
                $('body').trigger('mk:header-unsticky');
            }
        };

        onScroll();
        $window.on( 'scroll', MK.utils.throttle( 100, onScroll) );
    }

    // TODO
    // var pageIntro = $('body').data('intro'); // block scrolling on page intro


})( jQuery );

(function($){
	'use strict';

	// Do not assign at all if no touch events
	var hasTouchscreen = ('ontouchstart' in document.documentElement);
	if(!hasTouchscreen) return;

	$('.mk-main-navigation .menu-item-has-children').each( normalizeClick );

	function normalizeClick() {
		$(this).on('click', handleClick);
	}

	// Most reasonable way to normalize click and let hover state on first touch yet don't break experience on multiple input devices is to actually check against desired effect.
	// Better way would be to check against expected state but JS doesn't detect :hover so it would be nice to have it normalized globally like expecting .hover class in css
	function handleClick(e) {
		var $this = $(e.currentTarget);
		var $child = $this.find('> ul');
		var isVisible = $child.css('display') !== 'none';

		if(!isVisible) {
			e.preventDefault();
			e.stopPropagation();
		}
	}

}(jQuery));
(function( $ ) {
	'use strict';

	MK.ui.preloader = {
		dom : {
			overlay: '.mk-body-loader-overlay'
		},

		hide : function hide() {
			$( this.dom.overlay ).fadeOut(600, "easeInOutExpo", function() {
				$('body').removeClass('loading');
            //$( this ).remove();
         });
		}
	};  

})( jQuery ); 
(function($) {
	'use strict';

    var _ajaxUrl = MK.core.path.ajaxUrl;
    var _instances = {};

	MK.utils.ajaxLoader = function ajaxLoader(el) {
		// retrun a cached instance to have control over state from within multiple places
		// we may need for example to reset pageId when do filtering. It is really one instance that controls both filtering and pagination / load more
		var id = '#' + ($(el).attr('id'));
		if(typeof _instances[id] !== 'undefined') return _instances[id];

		// else lets start new instance
		this.id = id;
		this.el = el;
		this.isLoading = false;
		this.xhrCounter = 0;
	};

	MK.utils.ajaxLoader.prototype = { 
		init: function init() {
			// prevent double initialization of we return an instance
			if ( this.initialized && typeof window.vc_iframe === 'undefined' ) {
				return;
			}

			this.createInstance();
			this.cacheElements();

			this.initialized = true;
		},

		cacheElements: function cacheElements() {
			this.$container = $(this.el);
			this.id = '#' + (this.$container.attr('id'));
	        this.categories = this.$container.data('loop-categories');

			this.data = {};
			this.data.action = 'mk_load_more';
	        this.data.query = this.$container.data('query');
	        this.data.atts = this.$container.data('loop-atts');
	        this.data.loop_iterator = this.$container.data('loop-iterator');
	        this.data.author = this.$container.data('loop-author');
	        this.data.posts = this.$container.data('loop-posts');
	        this.data.safe_load_more = this.$container.siblings('#safe_load_more').val();
	        this.data._wp_http_referer = this.$container.siblings('input[name="_wp_http_referer"]').val();
	        this.data.paged = 1;
	        this.data.maxPages = this.$container.data('max-pages');
	        this.data.term = this.categories;
		},

		createInstance: function() {
			_instances[this.id] = this;
		},

		load: function load(unique) {
			var self = this;
			var seq = ++this.xhrCounter;
            this.isLoading = true;
			
			// If mk-ajax-loaded-posts span exists, get the post ids
			if ( this.$container.siblings('.mk-ajax-loaded-posts').length ) {
				var loaded_posts = this.$container.siblings('.mk-ajax-loaded-posts').attr('data-loop-loaded-posts');
				
				// Do not send looaded posts for Classic Pagination Navigation
				if ( this.$container.attr('data-pagination-style') != 1 ) {
					self.data.loaded_posts = loaded_posts.split(',');
				}
			}

            return $.when(
	            $.ajax({
	                url 	: _ajaxUrl,
	                type 	: "POST",
	                data 	: self.data
	            })
	        ).done(function(response) {
	        	self.onDone(response, unique, seq);
	        });
		},

		onDone: function(response, unique, seq) {
			if(seq === this.xhrCounter) {
				var self = this;

				response = $.parseJSON(response);
				response.unique = unique;
				response.id = this.id;
				
				// If mk-ajax-loaded-posts span exists, update current post ids 
				// with new post ids from server's response
				if ( this.$container.siblings('.mk-ajax-loaded-posts').length ) {
					this.$container.siblings('.mk-ajax-loaded-posts').attr('data-loop-loaded-posts', response.loaded_posts);
				}

	            this.setData({
	                maxPages: response.maxPages,
	                found_posts: response.found_posts,
	                loop_iterator: response.i
	            });

				// Preload images first by creating object from returned content.
				// mk_imagesLoaded() method will create a promise that gets resolved when all images inside are loaded.
				// Our ajaxLoad is somehow more similar to window.onload event now.
				$(response.content).mk_imagesLoaded().then(function() {
					MK.utils.eventManager.publish('ajaxLoaded', response);
		        	self.isLoading = false;
		        	self.initNewComponents();
				});

	        } else console.log('XHR request nr '+ seq +' aborted');

        },

		setData: function setData(atts) {
			for(var att in atts) {
				if(att === 'term' && atts[att] === '*') this.data.term = '';
				else this.data[att] = atts[att];
			}
		},

		getData: function getData(att) {
			return this.data[att];
		},

		initNewComponents: function initNewComponents() {
            // Legacy scripts reinit
            window.ajaxInit();
            setTimeout(window.ajaxDelayedInit, 1000);
            // New way to init apended things
            MK.core.initAll(this.el);
        }
	};

}(jQuery));
MK.component.BackgroundImageSetter = (function ($) {

	'use strict';

	var module = {};


	/*---------------------------------------------------------------------------------*/
	/* Private Variables
	/*---------------------------------------------------------------------------------*/

	/**
	 *	Take all elements with data-mk-img-set attribute and evaluate best image according to given device orientation and resolution,
	 *	sets style for backround-image on the same node element.	 *
	 */

	var $win = $(window),
		// $layers = $('[data-mk-img-set]'),
		screen = getScreenSize(),
		orientation = getOrientation(),
		device = getDevice(),
		lastOrientation = orientation,
		lastDevice = device;


	/*---------------------------------------------------------------------------------*/
	/* Private Methods
	/*---------------------------------------------------------------------------------*/

	function run($layers) {
		$layers.filter( function() {
			return !this.hasAttribute("mk-img-loaded");
		}).each(applyBg);
	}

	// Keep our main side effect out of calculations so they can be run once before loop of applying bg as a result
	function applyBg() {
		var $this = $(this),
			imgs = $this.data('mk-img-set');

		$this.css('background-image', 'url('+ module.getImage(imgs) +')');
		$this.find('.mk-adaptive-image').attr('src', module.getImage(imgs));
	}

	// Keep track of current screen size while resizing but update device reference
	// and reapply backgrounds only when we discover switch point
	function handleResize($layers) {
		updateScreenSize();
		if(hasSwitched()) {
			updateDevice();
			run($layers);
		}
	}

	function getScreenSize() {
		return {
			w: $win.width(),
			h: $win.height()
		};
	}

	// Name our device classes and add them id which simply means which one is wider
	function getDevice() {
		if     (screen.w > 1024) 	return {class: 'desktop', id: 2};
		else if(screen.w > 736) 	return {class: 'tablet',  id: 1};
		else 					 	return {class: 'mobile',  id: 0};
	}

	function getOrientation() {
		if(screen.w > screen.h) 	return 'landscape';
		else 						return 'portrait';
	}

	function updateScreenSize() {
		screen = getScreenSize();
	}

	function updateDevice() {
		if(lastOrientation !== orientation) orientation = lastOrientation;
		// Switch device only if going from smaller size to bigger.
		// Bigger to smaller is perfectly handled by browsers and doesn't require change and reupload
		if(lastDevice.id > device.id) device = lastDevice;
	}

	function hasSwitched() {
		lastOrientation = getOrientation();
		lastDevice = getDevice();

		if(lastOrientation !== orientation || lastDevice.class !== device.class) return true;
		else return false;
	}


	/*---------------------------------------------------------------------------------*/
	/* Public Methods
	/*---------------------------------------------------------------------------------*/

	// As desired image might be not available we have to evaluate the best match.
	module.getImage = function (imgs) {
		if (imgs['responsive'] === 'false') {
			return (imgs['landscape']['desktop']) ? imgs['landscape']['desktop'] : (imgs['landscape']['external'] ? imgs['landscape']['external'] : '');

		}
		var hasOrientation = !!imgs[orientation];
		// there are only two orientations now and we may get them by string name if both are there
		// or by index of 0 if only one is available. Note Objects has no lexical order so we need to grab key name by its index.
		// Also we may have external file for each orientation which we don't scale internaly so we grab it as it is. If nothing found return an empty string
		var imgOriented = imgs[ (hasOrientation ? orientation : Object.keys(imgs)[0]) ],
			imgExact    = (imgOriented[device.class]) ? imgOriented[device.class] : (imgOriented['external'] ? imgOriented['external'] : '');
		return imgExact;
	}

	module.init = function ($layers) {

		// Run and bind
		run($layers);
		$layers.attr('mk-img-loaded', '');
	};

	module.onResize = function ($layers) {
		$win.on('resize', MK.utils.throttle( 500, function() {
			handleResize($layers);
		}));
	};

	return module;

}(jQuery));


jQuery(function($) {

	var init = function init() {
		// Get All Layers, Excluding Edge Slider and Page Section
		$allLayers = $('[data-mk-img-set]').filter(function(index) {
			return !$(this).hasClass('mk-section-image') && !$(this).hasClass('background-layer') && !$(this).hasClass('mk-video-section-touch');
		});;

		// Handle the resize
		MK.component.BackgroundImageSetter.onResize($allLayers);

		// Set all the BG Layers
		MK.component.BackgroundImageSetter.init($allLayers);
	}
	init();

	$(window).on('vc_reload', init);

});

(function( $ ) {
	'use strict';

	var val = MK.val;

	MK.component.FullHeight = function( el ) {
		var $window = $( window ),
			$this = $( el ),
			config = $this.data( 'fullheight-config' ),
			container = document.getElementById( 'mk-theme-container' ),
			minH = (config && config.min) ? config.min : 0,
			winH = null,
			height = null,
			update_count = 0,
			testing = MK.utils.getUrlParameter('testing'),
			offset = null;

		// We need to provide height on the same specificity level for workaround to IE bug
		// connect.microsoft.com/IE/feedback/details/802625/min-height-and-flexbox-flex-direction-column-dont-work-together-in-ie-10-11-preview
		// stackoverflow.com/questions/19371626/flexbox-not-centering-vertically-in-ie
		if(MK.utils.browser.name === ('IE' || 'Edge')) $this.css( 'height', '1px' );

		var update = function() {

			if(update_count === 0) {
				winH = $window.height();
				// for correct calculate
				offset = $this.offset().top - 1;
				height = Math.max(minH, winH - val.offsetHeaderHeight( offset ));
				$this.css( 'min-height', height );
				if(testing !== undefined )
				update_count++;
			}

		};

		// TODO remove scroll listener by dynamic offset reader
		var init = function() {
			update();
			$window.on( 'resize', update );
			$window.on( 'scroll', update );
			window.addResizeListener( container, update );
		};

		return {
			init : init
		};
	};

})( jQuery );


(function( $ ) {
	'use strict';

	var core  = MK.core,
		utils = MK.utils,
		path  = MK.core.path;


	MK.ui.FullScreenGallery = function( element, settings ) {
		this.element = element;
		this.config = settings;

		this.isFullScreen = false;
	};


	// preload slick PLUGIN TO USE THIS
	MK.ui.FullScreenGallery.prototype = {
		dom : {
			fullScrBtn 		: '.slick-full-screen',
			exitFullScrBtn 	: '.slick-minimize',
			playBtn 		: '.slick-play',
			pauseBtn 		: '.slick-pause',
			shareBtn 		: '.slick-share',
			socialShare 	: '.slick-social-share',
		    wrapper 		: '.slick-slider-wrapper',
			slider 			: '.slick-slides',
			slides 			: '.slick-slide',
			dots 			: '.slick-dot',
			active 			: '.slick-active',
			hiddenClass 	: 'is-hidden',
			dataId 			: 'slick-index'
		},

		tpl: {
			dot  : '<div class="slick-dot"></div>',
			next : '<a href="javascript:;" class="slick-next"> <svg width="33px" height="65px"> <polyline fill="none" stroke="#FFFFFF" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="10" points=" 0.5,0.5 32.5,32.5 0.5,64.5"/> </svg> </a>',
			prev : '<a href="javascript:;" class="slick-prev"> <svg  width="33px" height="65px"> <polyline fill="none" stroke="#FFFFFF" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="10" points=" 32.5,64.5 0.5,32.5 32.5,0.5"/> </svg> </a>'
		},

		init : function() { 
			var self = this;

			// core.loadDependencies([ path.plugins + 'slick.js' ], function() {
				self.cacheElements();
				self.getViewportSizes();
				self.updateSizes( 'window' );
				self.create();
				// update cache with elements propagated by plugin
				self.updateCacheElements();
				self.createPagination();
				self.bindEvents();
			// });
		},

		create : function() {
			var self = this;

			this.slick = this.$gallery.slick({
		        dots: true,
		        arrows: true,
				infinite: true,
				speed: 300,
				slidesToShow: 1,
				centerMode: true,
				centerPadding: '0px',
				variableWidth: true,
				autoplay: false,
				autoplaySpeed: 3000,
        		useTransform: true,
                prevArrow: self.tpl.prev,
                nextArrow: self.tpl.next,
                customPaging: function(slider, i) {
                    return self.tpl.dot;
                },
			});
		},

		cacheElements : function() {
			this.$window = $( window );
			this.$gallery = $( this.element );

			this.$fullScrBtn = $( this.dom.fullScrBtn );
			this.$exitFullScrBtn = $( this.dom.exitFullScrBtn );
			this.$playBtn = $( this.dom.playBtn );
			this.$pauseBtn = $( this.dom.pauseBtn );
			this.$shareBtn = $( this.dom.shareBtn );
			this.$socialShare = $( this.dom.socialShare );

		    this.$wrapper = $( this.dom.wrapper );
			this.$slider = $( this.dom.slider );
			this.$slides = $( this.dom.slides );
			this.$imgs = this.$slides.find( 'img' );
			// store reference to initial images without slides appended by pugin
			// - needed for creating of pagination
			this.$originalImgs = this.$imgs;
		},

		updateCacheElements : function() {
			this.$slides = $( this.dom.slides );
			this.$imgs = this.$slides.find( 'img' );
			this.$dots = $( this.dom.dots );
		},

		bindEvents : function() {
			var self = this;
			this.$fullScrBtn.on( 'click', this.toFullScreen.bind( this ) );
			this.$exitFullScrBtn.on( 'click', this.exitFullScreen.bind( this ) );
			this.$playBtn.on( 'click', this.play.bind( this ) );
			this.$pauseBtn.on( 'click', this.pause.bind( this ) );
			this.$shareBtn.on( 'click', this.toggleShare.bind( this ) );
			this.$socialShare.on( 'click', 'a', this.socialShare.bind( this ) );
			this.$window.on( 'resize', this.onResize.bind( this ) );
			this.$window.on( 'keydown', function(e) {
				if(e.keyCode === 39) self.$gallery.slick('slickNext');
				if(e.keyCode === 37) self.$gallery.slick('slickPrev');
			});
			$( document ).on( 'fullscreenchange mozfullscreenchange webkitfullscreenchange msfullcreenchange', this.exitFullScreen.bind( this ) );
		},

		getViewportSizes : function() {
			this.screen = {
				w: screen.width,
				h: screen.height
			};
			this.window = {
				w: this.$window.width(),
				h: this.$window.height()
			};
		},

		updateSizes : function( viewport ) {
			this.$wrapper.width( this[ viewport ].w );
			this.$wrapper.height( '100%' );
			this.$imgs.height( '100%');
		},

		createPagination : function() {
			var self = this;
			this.$dots.each( function( i ) {
				var img = self.$originalImgs.eq( i ).attr( 'src' );

				$( this ).css({
					'background-image': 'url('+ img +')'
				});
			});	
		},

		play : function(e) {
			e.preventDefault();
			this.$playBtn.addClass( this.dom.hiddenClass );
			this.$pauseBtn.removeClass( this.dom.hiddenClass );
			$( this.element ).slick( 'slickPlay' );
		},

		pause : function(e) {
			e.preventDefault();
			this.$pauseBtn.addClass( this.dom.hiddenClass );
			this.$playBtn.removeClass( this.dom.hiddenClass );
			$( this.element ).slick( 'slickPause' );
		},

		toggleShare : function(e) {
			e.preventDefault();
			this.$socialShare.toggleClass( this.dom.hiddenClass );
		},

		getCurentId : function() {
			return this.$slides.filter( this.dom.active ).data( this.dom.dataId );
		},

		toFullScreen : function() {
			var self = this;

			this.$fullScrBtn.addClass( this.dom.hiddenClass );
			this.$exitFullScrBtn.removeClass( this.dom.hiddenClass );

			this.$slider.hide().fadeIn( 500 );
			utils.launchIntoFullscreen( document.documentElement );
			this.updateSizes( 'screen' );
			$( this.element ).slick( 'slickGoTo', this.getCurentId(), true );

			// Update state with delay so we avoid triggering exitFullScreen fn from 
			// fullscreenchange event
			setTimeout( function() {
				self.isFullScreen = true;
			}, 1000);					
		},

		exitFullScreen : function() {
			if( this.isFullScreen ) { 
				this.$exitFullScrBtn.addClass( this.dom.hiddenClass );
				this.$fullScrBtn.removeClass( this.dom.hiddenClass );

				utils.exitFullscreen();
				this.updateSizes( 'window' );
				$( this.element ).slick( 'slickGoTo', this.getCurentId(), true );

				this.isFullScreen = false;
			}

		},

		onResize : function() {
			this.getViewportSizes();
			this.updateSizes( this.isFullScreen ? 'screen' : 'window' );
			$( this.element ).slick( 'refresh' );  
			$( this.element ).slick( 'slickGoTo', this.getCurentId(), true );
			this.updateCacheElements();
			this.createPagination();
		},

		socialShare : function( e ) {
			e.preventDefault();
			var $this = $( e.currentTarget ),
				network = $this.data( 'network' ),
				id = this.config.id,
				url = this.config.url,
				title = this.$wrapper.find( '.slick-title' ).text(),
				name;
				var picture = this.$slides.filter( this.dom.active ).children().first().attr( 'src' );
			switch( network ) {
				case 'facebook': 
					url = 'https://www.facebook.com/sharer/sharer.php?picture=' + picture+'&u=' + url + '#id=' + id;
					name = 'Facebook Share';
					break;
				case 'twitter':
					url = 'http://twitter.com/intent/tweet?text=' + url + '#id=' + id;
					name = 'Twitter Share';
					break;
				case 'pinterest':
					url = 'http://pinterest.com/pin/create/bookmarklet/?media=' + picture + '&url=' + url + '&is_video=false&description=' + title;
					// other available link paranmeters: media, description
					name = 'Pinterest Share';
					break;

			}

       		window.open( url, name, "height=380 ,width=660, resizable=0, toolbar=0, menubar=0, status=0, location=0, scrollbars=0" );
		}
	};

})( jQuery );
(function($) {
    'use strict';

    MK.component.Grid = function( el ) {
    	var $container = $(el);
    	var config = $container.data( 'grid-config' );
        var isSlideshow = $container.closest('[data-mk-component="SwipeSlideshow"]').length;
        var miniGridConfig = {
            container: el,
            item: config.item + ':not(.is-hidden)',
            gutter: 0 
        };

        var init = function init(){
            // Flags for cancelling usage goes first :
            // Quit early if we discover that Grid is used inside SwipeSlideshow as it brings bug with crossoverriding positioning 
            // + grid is not really needed as we have single row all handled by slider.
            // It happens only in woocommerce carousel as of hardcoded Grid in loop-start.php
            if(isSlideshow) return; 
	        MK.core.loadDependencies([ MK.core.path.plugins + 'minigrid.js' ], create);
        };

        // Remove el hidden without adding proper class
        var prepareForGrid = function prepareForGrid() {
            var $item = $(this);
            var isHidden = ($item.css('display') === 'none');
            if(isHidden) $item.addClass('is-hidden');
            else $item.removeClass('is-hidden');
        };

        var create = function create() {
            var timer = null;

	        function draw() { 
                // Prevent plugin breaking when feeding it with hidden elements
                $container.find(config.item).each( prepareForGrid );
	            minigrid(miniGridConfig);
	        }

            function redraw() {
                if (timer) clearTimeout(timer);
                timer = setTimeout(draw, 100);
            }

            // init
	        draw(); 
            // If reinitializing drop existing event handler
            $(window).off('resize', redraw);
            $(window).on('resize', redraw);
            MK.utils.eventManager.subscribe('item-expanded', redraw);
            MK.utils.eventManager.subscribe('ajaxLoaded', redraw);
            MK.utils.eventManager.subscribe('staticFilter', redraw);
        };

        return {
         	init : init
        };
    };

})(jQuery);








(function( $ ) {
	'use strict';

	/**
	 * A fork from original VC function.
	 * The original one is adding some padding which causes extra padding
	 * on our templates so we customized the codes.
	 *
	 * @since 5.9.8
	 * @since 6.0.1 Improve logic to handle LTR responsive state.
	 * @since 6.0.1 Fix missing padding-left if row has its own padding-left when
	 *              Vertical Header is active.
	 */
	function MkfullWidthRow() {
		var $windowWidth = $(document).width();
		var $elements = $('[data-mk-full-width="true"]');
		var direction = $('body.rtl').length ? 'right' : 'left';
		var verticalHeader = $('body.vertical-header-enabled').length ? true : false;
		var verticalHeaderWidth = ( $( '.header-style-4 .mk-header-inner' ).outerWidth() > 270 ) ? 0 : 270;
		var verticalHeaderRtl = $('body.rtl').length ? -1 : 1;
		var verticalHeaderRtlWidth = $('body.rtl.vertical-header-enabled').length ? verticalHeaderWidth : 0;
		var verticalHeaderRight = $('body.vertical-header-right').length ? -1 : 1;
		var verticalHeaderWidthBoxed = 0;
		var boxed = $('body.mk-boxed-enabled').length;
		var boxedOffset = ( boxed ) ? ( $(window).width() - $('#theme-page').outerWidth() ) / 2 : 0;
		var boxedMaxWidth = ( boxed ) ? $('#theme-page').outerWidth() : 'auto';

		if ( verticalHeader && boxed ) {
			verticalHeaderWidthBoxed = ( $( '.header-style-4 .mk-header-inner' ).outerWidth() > 270 ) ? 0 : verticalHeaderRtl * verticalHeaderRight * 135;
		}

		var transparentHeader = $('.transparent-header').length;
		if ( transparentHeader > 0 ) {
			verticalHeaderWidthBoxed = 0;
		}

		$.each($elements, function(key, item) {
			var $el = $(this);
			var css;
			$el.addClass("vc_hidden");
			var $el_full = $el.next(".vc_row-full-width");
			if ($el_full.length || ($el_full = $el.parent().next(".vc_row-full-width")), $el_full.length) {
				var el_margin_left = parseInt($el.css("margin-left"), 10),
				el_margin_right = parseInt($el.css("margin-right"), 10),
				offset = 0 - $el_full.offset().left - el_margin_left,
				width = $(window).width();
				if (css = {
					position: "relative",
					"box-sizing": "border-box",
					width: $(window).width(),
					maxWidth: boxedMaxWidth
				},
				css[direction] = offset + boxedOffset + verticalHeaderWidthBoxed + ( verticalHeaderRight * verticalHeaderRtlWidth ),
				$el.css(css), !$el.data("mkStretchContent")) {
					var padding = -1 * offset;
					0 > padding && (padding = 0);
					var paddingRight = width - padding - $el_full.width() + el_margin_left + el_margin_right;
					padding = padding - paddingRight;
					if ( 0 > paddingRight && (paddingRight = 0) ) {
						css = {};
						if ( 'right' === direction ) {
							css["padding-left"] = padding + "px";
							css["padding-right"] = 0;
						} else {
							css["padding-right"] = padding + "px";
							css["padding-left"] = 0;
						}

						$el.css(css)
					}
				}

				/**
				 * Fix AM-2974
				 *
				 * When user set padding-left or padding-right in the row, both of them
				 * will be prioritized as important styles. It breaks padding-left set
				 * by Vertical Header to make the row content fit with the content
				 * container. We need to repopulate the padding-{side - based on Vertical
				 * Header position} value.
				 *
				 * Works when:
				 * - Vertical Header is active
				 * - Main layout is not boxed
				 * - Page Section is full layout
				 * - Row is full width layout and content
				 * - Row has its own padding-left and padding-right
				 * - There is no additional padding added
				 *
				 * How it works:
				 * Get current row padding-left and vertical header width. If both of them
				 * are equal, it means row position is correct related to Vertical Header.
				 * If not, we should sum both of them, then declare new padding-{side}
				 * style attribute.
				 *
				 * Tested with:
				 * - Main Layout: Full & Boxed Layout
				 * - Page Section: Full Layout and Non Full Layout
				 * - Row: Full Width, Full Width Content, and Non Full Width
				 * - Header: Non vertical headers
				 * - Transparent Header
				 * - RTL and LTR
				 */
				if ( verticalHeader && ! boxed && ! transparentHeader && ! css.hasOwnProperty( 'padding-left' ) && ! css.hasOwnProperty( 'padding-right' )) {
					// Get row padding-{side} and Vertical Header width.
					var side = 'left';
					if ( verticalHeaderRight === -1 ) {
						side = 'right';
					}
					var el_padding_dir = parseInt( $el.css( 'padding-' + side ), 10 );
					var header_padding_dir = $( '.header-style-4 .mk-header-inner' ).outerWidth();
					// Compare both of row and vertical header padding-{side}.
					if ( el_padding_dir != header_padding_dir) {
						if($windowWidth > mk_responsive_nav_width) {
							$el[0].style.setProperty( 'padding-' + side, header_padding_dir + 'px', 'important' );	
						} else {
							$el[0].style.removeProperty( 'padding-' + side);	
						}
						

						// Reset padding-{side} for page section.
						var $el_page_section = $el.find( '.mk-page-section.full_layout' );
						if ( $el_page_section.length > 0 ) {
							$el_page_section[0].style.setProperty( 'padding-' + side, 'unset', 'important' );
						}
					}
				}

				$el.attr("data-mk-full-width-init", "true"), $el.removeClass("vc_hidden"), $(document).trigger("vc-full-width-row-single", {
					el: $el,
					offset: offset,
					marginLeft: el_margin_left,
					marginRight: el_margin_right,
					elFull: $el_full,
					width: width
				})
			}
		}), $(document).trigger("mk-full-width-row", $elements);
	}

	MkfullWidthRow();
	var debounceResize = null;
	$(window).on("resize", function() {
		if( debounceResize !== null ) { clearTimeout( debounceResize ); }
		debounceResize = setTimeout( MkfullWidthRow, 100 );
	});

})( jQuery );

/*!
 * imagesLoaded PACKAGED v4.1.1
 * JavaScript is all like "You images are done yet or what?"
 * MIT License
 */

!function(t,e){"function"==typeof define&&define.amd?define("ev-emitter/ev-emitter",e):"object"==typeof module&&module.exports?module.exports=e():t.EvEmitter=e()}("undefined"!=typeof window?window:this,function(){function t(){}var e=t.prototype;return e.on=function(t,e){if(t&&e){var i=this._events=this._events||{},n=i[t]=i[t]||[];return-1==n.indexOf(e)&&n.push(e),this}},e.once=function(t,e){if(t&&e){this.on(t,e);var i=this._onceEvents=this._onceEvents||{},n=i[t]=i[t]||{};return n[e]=!0,this}},e.off=function(t,e){var i=this._events&&this._events[t];if(i&&i.length){var n=i.indexOf(e);return-1!=n&&i.splice(n,1),this}},e.emitEvent=function(t,e){var i=this._events&&this._events[t];if(i&&i.length){var n=0,o=i[n];e=e||[];for(var r=this._onceEvents&&this._onceEvents[t];o;){var s=r&&r[o];s&&(this.off(t,o),delete r[o]),o.apply(this,e),n+=s?0:1,o=i[n]}return this}},t}),function(t,e){"use strict";"function"==typeof define&&define.amd?define(["ev-emitter/ev-emitter"],function(i){return e(t,i)}):"object"==typeof module&&module.exports?module.exports=e(t,require("ev-emitter")):t.imagesLoaded=e(t,t.EvEmitter)}(window,function(t,e){function i(t,e){for(var i in e)t[i]=e[i];return t}function n(t){var e=[];if(Array.isArray(t))e=t;else if("number"==typeof t.length)for(var i=0;i<t.length;i++)e.push(t[i]);else e.push(t);return e}function o(t,e,r){return this instanceof o?("string"==typeof t&&(t=document.querySelectorAll(t)),this.elements=n(t),this.options=i({},this.options),"function"==typeof e?r=e:i(this.options,e),r&&this.on("always",r),this.getImages(),h&&(this.jqDeferred=new h.Deferred),void setTimeout(function(){this.check()}.bind(this))):new o(t,e,r)}function r(t){this.img=t}function s(t,e){this.url=t,this.element=e,this.img=new Image}var h=t.jQuery,a=t.console;o.prototype=Object.create(e.prototype),o.prototype.options={},o.prototype.getImages=function(){this.images=[],this.elements.forEach(this.addElementImages,this)},o.prototype.addElementImages=function(t){"IMG"==t.nodeName&&this.addImage(t),this.options.background===!0&&this.addElementBackgroundImages(t);var e=t.nodeType;if(e&&d[e]){for(var i=t.querySelectorAll("img"),n=0;n<i.length;n++){var o=i[n];this.addImage(o)}if("string"==typeof this.options.background){var r=t.querySelectorAll(this.options.background);for(n=0;n<r.length;n++){var s=r[n];this.addElementBackgroundImages(s)}}}};var d={1:!0,9:!0,11:!0};return o.prototype.addElementBackgroundImages=function(t){var e=getComputedStyle(t);if(e)for(var i=/url\((['"])?(.*?)\1\)/gi,n=i.exec(e.backgroundImage);null!==n;){var o=n&&n[2];o&&this.addBackground(o,t),n=i.exec(e.backgroundImage)}},o.prototype.addImage=function(t){var e=new r(t);this.images.push(e)},o.prototype.addBackground=function(t,e){var i=new s(t,e);this.images.push(i)},o.prototype.check=function(){function t(t,i,n){setTimeout(function(){e.progress(t,i,n)})}var e=this;return this.progressedCount=0,this.hasAnyBroken=!1,this.images.length?void this.images.forEach(function(e){e.once("progress",t),e.check()}):void this.complete()},o.prototype.progress=function(t,e,i){this.progressedCount++,this.hasAnyBroken=this.hasAnyBroken||!t.isLoaded,this.emitEvent("progress",[this,t,e]),this.jqDeferred&&this.jqDeferred.notify&&this.jqDeferred.notify(this,t),this.progressedCount==this.images.length&&this.complete(),this.options.debug&&a&&a.log("progress: "+i,t,e)},o.prototype.complete=function(){var t=this.hasAnyBroken?"fail":"done";if(this.isComplete=!0,this.emitEvent(t,[this]),this.emitEvent("always",[this]),this.jqDeferred){var e=this.hasAnyBroken?"reject":"resolve";this.jqDeferred[e](this)}},r.prototype=Object.create(e.prototype),r.prototype.check=function(){var t=this.getIsImageComplete();return t?void this.confirm(0!==this.img.naturalWidth,"naturalWidth"):(this.proxyImage=new Image,this.proxyImage.addEventListener("load",this),this.proxyImage.addEventListener("error",this),this.img.addEventListener("load",this),this.img.addEventListener("error",this),void(this.proxyImage.src=this.img.src))},r.prototype.getIsImageComplete=function(){return this.img.complete&&void 0!==this.img.naturalWidth},r.prototype.confirm=function(t,e){this.isLoaded=t,this.emitEvent("progress",[this,this.img,e])},r.prototype.handleEvent=function(t){var e="on"+t.type;this[e]&&this[e](t)},r.prototype.onload=function(){this.confirm(!0,"onload"),this.unbindEvents()},r.prototype.onerror=function(){this.confirm(!1,"onerror"),this.unbindEvents()},r.prototype.unbindEvents=function(){this.proxyImage.removeEventListener("load",this),this.proxyImage.removeEventListener("error",this),this.img.removeEventListener("load",this),this.img.removeEventListener("error",this)},s.prototype=Object.create(r.prototype),s.prototype.check=function(){this.img.addEventListener("load",this),this.img.addEventListener("error",this),this.img.src=this.url;var t=this.getIsImageComplete();t&&(this.confirm(0!==this.img.naturalWidth,"naturalWidth"),this.unbindEvents())},s.prototype.unbindEvents=function(){this.img.removeEventListener("load",this),this.img.removeEventListener("error",this)},s.prototype.confirm=function(t,e){this.isLoaded=t,this.emitEvent("progress",[this,this.element,e])},o.makeJQueryPlugin=function(e){e=e||t.jQuery,e&&(h=e,h.fn.imagesLoaded=function(t,e){var i=new o(this,t,e);return i.jqDeferred.promise(h(this))})},o.makeJQueryPlugin(),o});

/**
 * ICON FACTORY @ Maki
 * 
 * Javascript part that translates css styles into link to server side manufacturer.
 * By passing extra args we generate icons as needed on server and send them back with ajax and attch them to DOM here.
 *
 * This is temporary solution that helps us switching from font icons to singular svgs without too match overhead. The finalized solution shoulnd be 99% server side.
 * Our main templating is happening there. We should have an icon_factory(name, properties) function that we can call directly in templates to serve us icons. 
 * Post load, js soluition should target only elements that we have no direct access to. We set it as TODO for future as part of progressive development. 
 * When correct factory is done we should be able to use it here and there to progressively kill overhead generated by current solution until we could totally switch it.
 * 
 * Prons:
 * - automated process where we can mimic old behaviour
 * - possible bugs are easy to patch 
 * - far samller download size for assets needed by theme (no font families css and fonts itself to download, which are currently blocking page load time)
 * - icon generation moved to server side where our main templating is already happening
 * - we can easily switch how our Icon should be outputed - inline, img, object, iframe. Whatever our situation requires (img for responsive icons for example)
 *
 * Cons:
 * - possible bugs based on different nature of svgs / fonts. Need to be manually fixed
 * - some manual work to straighten things - litle css refactors here and there
 * - as the mapping the icons happens in server side, it may cause CPU bottlenecks and should be cashed in DB for repetitve usage.
 *
 *
 * TODO Refactor to config obj as parameter for easier passing it. Also decouple more - especially loops
 */
(function ($) {
	'use strict';

	// As long as we can manage this manually it is better like so. We avoid delay based on waiting for ajax to finish
 	// $.get( MK.core.path.theme + '/assets/icons/icon-families.json', createAll);
 	var families = [
		['awesome-icons' , 'mk-icon-'], // [family, prefix]
		['icomoon' 		 , 'mk-moon-'],
		['pe-line-icons' , 'mk-li-'],
		['theme-icons' 	 , 'mk-jupiter-icon-'] 
	];

	// Our css contains this extends for particular families of fonts. For now we automate the process and extend it here as well
	var extend = {
		'awesome-icons' : [], 
		'icomoon' : [],
		'pe-line-icons' : [],
		'theme-icons' : []
	};	
 	
 	// Cache holder for quick access to repeating icons. config / svg
	var _cache = {};
	var _cacheId = 0;
	// Merge configs to call it with single ajax
	var _config = [];
	// Counter for all families. We merge all our families for single ajax request and countdown when to trigger the download.
	var _roundCount = 0;
	// Mapper for icons - config / array with nodes
	var _iconMap = {};


	// Closure to merge $icons together and to run the download when we counted down icon families to 0
 	var getIconsSprite = (function() {
 		var $icons = null;
 		var iterator = 0;

 		function run(callback) {
	 		var config = encodeURIComponent(JSON.stringify(_config));

			$.ajax({
				url : MK.core.path.ajaxUrl,
				// dataType: 'xml',
				method: 'POST',
				data: {action : 'mk_get_icon', iterator: iterator++, config: config},
				success: function(sprite) { 
					callback(sprite, $icons);
					_config = [];
					_iconMap = {};
					$icons = null;
				},
				error: function(err) { 
					console.log('Icon load problem');
				}
			});
		}

		return function(callback, $els, count) {
			if(!$icons) $icons = $els;
			else $icons.add($els);
			// console.log(count);
			if(!count) run(callback);
		};
 	}());

 	// Wait for DOM manipulations and run where really needed
 	$(window).on('load', function() { 
 		setTimeout(function() {
 			createAll(document);
 			if($('.mk-header').length) createAll('.mk-header');
 			if($('.js-flexslider, .mk-flexslider').length) createAll('.js-flexslider, .mk-flexslider');
 			if($('.mk-accordion').length) createAll('.mk-accordion'); 
 		}, 1000); 
 	});

 	MK.utils.eventManager.subscribe('ajaxLoaded', function() {
 		// Wait for actuall DOM insertion
 		setTimeout(createAll, 100, '.js-loop');
 	});

	MK.utils.eventManager.subscribe('ajax-preview', function() {
 		setTimeout(createAll, 100, '.ajax-container');
	});

	MK.utils.eventManager.subscribe('photoAlbum-open', function() {
 		setTimeout(createAll, 100, '.gallery-share');
	});

	MK.utils.eventManager.subscribe('quickViewOpen', function() {
 		setTimeout(createAll, 300, '.mk-modal-content');
	});

 	// Our main runner that creates all icons in given scope
 	function createAll(scope) {
		// iterate through families
 		for(var i = 0, l = families.length; i < l; i++) {
 			var family = families[i][0];
 			var prefix = families[i][1];
 			var $icons = getIcons(family, prefix, scope);
 			if($icons.length) {
 				_roundCount++;
 				// apply arguments from current loop iteration but send createIcons to event loop so it will get trigerred in the same order as this loop finish.
 				// We need it to pass all $icons first so we can merge all families before ajax request.
 				setTimeout(createIcons, 0, $icons, family, prefix);
 			}
 		}
 	}

 	// Grab all els in given scope that contains our prefix, anywhere in class attribute. Extend if needed
 	function getIcons(family, prefix, scope) {
 		var $scope = $(scope);
 		var $icons = $scope.find('[class*='+ prefix +']');
 		var extraClassNames = extend[family];
 		// if nothing to extend just return what we have till now
 		if(!extraClassNames) return $icons; 
 		// Extend it with our css garbish
 		extraClassNames.forEach(function(className) {
 			var $icon = $scope.find(className);
 			$icons = $icons.add($icon);
 		});
 		// serve all
 		return $icons;
 	}


 	function createIcons($icons, family, prefix, i, unicode) {
 		var id   = i || 0;
		var icon = $icons[id];

		// quick check point, if no more icons break recursion
		if(!icon) {
			_roundCount--;
			getIconsSprite(insertIcons, $icons, _roundCount, _config);
			return;
		}

		var css       = getComputedStyle( icon, ':before');
		var classAttr = icon.getAttribute('class');
		var name      = (classAttr) ? matchClass(classAttr.split(' '), prefix) : false;
		var h         = getComputedStyle(icon).fontSize;
		var config    = createConfig(css, name, family, unicode, h);
		var cache 	  = JSON.stringify(config);

		if(!config) {
			// Yep, we have a mess so sometimes we try to call for an icon where it should not exist (no class match or unicode found)
			// As we expect empty response from server, we just skip to next icon

		} else if(_cache[cache]) {
			// Use cached icon when possible
			// 
			if(typeof _iconMap[cache] === 'undefined') _iconMap[cache] = [$icons.eq(id)];
			else _iconMap[cache].push($icons.eq(id));

		} else {
			if(typeof _iconMap[cache] === 'undefined') _iconMap[cache] = [$icons.eq(id)];
			else _iconMap[cache].push($icons.eq(id));

			_cache[cache] = _cacheId.toString(); // number as string so we could do [var] key lookup after reversal
			config.id = _cacheId; // extend config for server only
			_config.push(config);

			_cacheId++; // increment after caching
		}

		createIcons($icons, family, prefix, ++id);
 	}

 	function insertIcons(sprite, $icons) {
 		var $sprite = $(sprite);
 		var $svgs   = $sprite.find('svg');
 		var idMap   = invert(_cache);

 		$sprite.each(function() {
 			var $svg = $(this);
 			var id   = $svg.attr('data-cacheid'); // read as string
 			var configKey = idMap[id];

 			_cache[configKey] = this;
 			// console.log(id, this)
 		});

 		// console.log('sprite',sprite)
 		// 

 		Object.keys(_iconMap).forEach(function (cacheKey) {
		   	_iconMap[cacheKey].forEach(function($icons) {
		   		$icons.each(function() {
		   			var $svg = $(_cache[cacheKey]).clone();
		   			var $icon = $(this);

		   			// console.log($icon[0], _cache[cacheKey]);  
		   			
		   			function remove() {
		   				// exclude problematic stuff
		   				if($icon.parents('.pricing-features')) return;
			   			$icon.not('.mk-jupiter-icon-xing') 
			   				 .not('.mk-jupiter-icon-square-xing')
			   				 .not('.mk-jupiter-icon-simple-xing')
			   				 .find('.mk-svg-icon') 
			   				 .not('[data-name="mk-moon-zoom-in"]')
			   				 .remove(); // and remove else to reapply styles with new loaded svg
		   			}

		   			if($svg.length ) remove();

		   			if(!$icon.find('svg').length) {
		   				if($icon.parents('.widget ul').length) $icon.prepend($svg);
		   				else $icon.append($svg);
					}
		   		});
		   	});
		});

 		// Notify rest of app
		MK.utils.eventManager.publish('iconsInsert');
 	}

 	// Prepare configuration for server side. We need to grab icons and manipulate them a little there
 	function createConfig(css, name, family, unicode, height) {
 		var hasGradient  = checkGradient(css);
 		var hasDirection = extractGradient('direction', css.background);

 		var config = {
 			family: family, 
 			// this is mostly for Extends. Because we've been customizing singular elements and assigning content unicode manually, 
 			// now we don't have any proper anchor for usage with our json map
 			unicode: (unicode) ? unicode : decodeUnicode(css.content), 
 			name: name,
 			// fill: css.color,
 			gradient_type:  hasGradient ? extractGradient('type' , css.background) : false,
 			gradient_start: hasGradient ? extractGradient('start', css.background) : false,
 			gradient_stop:  hasGradient ? extractGradient('stop' , css.background) : false,
 			gradient_direction: hasDirection ? extractGradient('direction', css.background).replace(' ', '-') : false,
 			height: height
 		};

 		// If there is no name or unicode the whole config is invalid
 		if(!config.name && !config.unicode) return false;
 		else return config;
 	}

 	// Extract class name that represents the icon that we try to generate
 	function matchClass(classes, prefix) {
 		// var missing = '';
 		for(var i = 0, l = classes.length; i < l; i++) {
 			if(classes[i].indexOf(prefix) !== -1) return classes[i]; // return first matched class name
 			// else missing += ' .' + classes[i]; // collect not matching classes
 		}
 		// if we didn't returned anything within loop we output notification here. Keep it for testing only
 		// console.log('Possibility of missing icons for element with classes:' + missing);
 	}

 	// Check if background conatains gradient declaration and return bg string if so or false 
 	function checkGradient(css) {
 		var bg = css.background;
 		if(bg.indexOf('radial') !== -1 || bg.indexOf('linear') !== -1) return bg;
 		else return false;
 	}

 	// Extract background attribiutes from bg string.
 	// Multipurpose function which returns part we ask for
 	function extractGradient(attr, grad) {
 		// quit if gradient is falsy
 		// console.log(grad);
 		if(!grad) return false;

 		var isRadial = grad.indexOf('radial')  !== -1;
 		var isLinear = grad.indexOf('linear')  !== -1;
 		var hasDirection = grad.indexOf('(to') !== -1;
 		var f, t; // from, to

 		if(attr === 'type') {
 			if(isRadial) return 'radial';
 			if(isLinear) return 'linear';

 		} else if(attr === 'start') {
 			f = getStrPosition(grad, 'rgb(', 1);
 			t = getStrPosition(grad, '0%'  , 1);

 		} else if(attr === 'stop') {
 			f = getStrPosition(grad, 'rgb(', 2);
 			t = getStrPosition(grad, '100%', 1);

 		} else if(attr === 'direction') {
 			if(!hasDirection) return false;
 			f = getStrPosition(grad, '(to', 1) + 4;
 			t = getStrPosition(grad, ', rgb(', 1);

 		} else {
 			return false;
 		}
 		
 		return grad.slice(f, t);
 	}

 	// Helper for getting indexOf but with lookup for instance of the string
 	// str - string to search
 	// m - what we're looking for
 	// i - instance, starting at 1
 	function getStrPosition(str, m, i) {
	   return str.split(m, i).join(m).length;
	}

	// JS outputs unicode results rather than code representation. This helper function does the job
	function decodeUnicode(content) {
		// escape() kills \ escape signature and outputs it as %u
		// str replace to drop special chars
		// and we bring it all to lowercase to match filenames we keep on server
		if(content && content !== 'none') return escape(content).replace(/%22/g, '').replace('%u', '').toLowerCase();
		else return false; // just in case we haven't provided content to work with
	}

	function invert(obj) {
	  	var new_obj = {};
	  	for (var prop in obj) {
	    	if(obj.hasOwnProperty(prop)) {
	      		new_obj[obj[prop]] = prop;
	    	}
	  	}
	  	return new_obj;
	}

}(jQuery));
(function($, window){
    'use strict';

    var scrollY = MK.val.scroll; 
    var dynamicHeight = MK.val.dynamicHeight;

    var $window = $(window);
    var $containers = $('.js-loop');

    $containers.each( pagination );

	$window.on( 'vc_reload', function() {
		$('.js-loop').each( pagination );
	} );

    function pagination() {
        var unique = Date.now();
        var $container = $(this);
        var $superContainer = $container.parent(); // should contain clearing so it stretches with floating children
        var $loadBtn = $container.siblings('.js-loadmore-holder').find('.js-loadmore-button');
        var $loadScroll = $('.js-load-more-scroll');
        var style = $container.data('pagination-style');
        var maxPages = $container.data('max-pages');
        var id = '#' + ($container.attr('id'));
        var ajaxLoader = new MK.utils.ajaxLoader(id);
        var isLoadBtn = (style === 2);
        var isInfiniteScroll = (style === 3); // add flag for last container
        var scrollCheckPoint = null;
        var isHandlerBinded = false;

        ajaxLoader.init();

        init();

        function init() {
            MK.utils.eventManager.subscribe('ajaxLoaded', onLoad);
            bindHandlers();
            if( isInfiniteScroll ) scrollCheckPoint = spyScrollCheckPoint();

			$window.on( 'vc_reload', function() {
				$window.off('scroll', handleScroll);
			} );
        }

        function bindHandlers() {
            if( isLoadBtn ) $loadBtn.on('click', handleClick);
            if( isInfiniteScroll ) $window.on('scroll', handleScroll); 
            isHandlerBinded = true;
        }

        function unbindHandlers() {
            if( isLoadBtn ) $loadBtn.off('click', handleClick);
            if( isInfiniteScroll ) $window.off('scroll', handleScroll);
            isHandlerBinded = false;
        }

        function handleClick(e) {
            e.preventDefault();
            if(!ajaxLoader.isLoading) loadMore();
        }

        function handleScroll() {
            if((scrollY() > scrollCheckPoint()) && !ajaxLoader.isLoading) loadMore();
        }

        function loadMore() {
            loadingIndicatorStart();
            var page = ajaxLoader.getData('paged');
            ajaxLoader.setData({paged: ++page});
            ajaxLoader.load(unique);
        }

        function onLoad(e, response) {
            if( typeof response !== 'undefined' && response.id === id) {
                // Checking found posts helps to fix all pagination styles 
                if( ajaxLoader.getData('found_posts') <= 0 && ajaxLoader.getData('paged') >= ajaxLoader.getData('maxPages')) loadingIndicatorHide();
                else loadingIndicatorShow();
                if(response.unique === unique) $container.append(response.content);
                loadingIndicatorStop();
            }
        }

        function loadingIndicatorStart() {
            if(isLoadBtn) $loadBtn.addClass('is-active');
            else if(isInfiniteScroll) MK.ui.loader.add('.js-load-more-scroll');

        }

        function loadingIndicatorStop() {
            if(isLoadBtn) $loadBtn.removeClass('is-active');
            else if(isInfiniteScroll) MK.ui.loader.remove('.js-load-more-scroll');
        }

        function loadingIndicatorShow() {
            if(isHandlerBinded) return;
            if(isLoadBtn) $loadBtn.show();
            else if(isInfiniteScroll) $loadScroll.show();
            bindHandlers();
        }

        function loadingIndicatorHide() {
            if(!isHandlerBinded) return;
            if(isLoadBtn) $loadBtn.hide();
            else if(isInfiniteScroll) $loadScroll.hide();
            unbindHandlers();
        }


        function spyScrollCheckPoint() {
            var containerO = 0;
            var containerH = dynamicHeight( $superContainer );
            var winH = dynamicHeight( window );
 
            var setVals = function() {
                containerO = $superContainer.offset().top;
            };

            setVals();
            $window.on('resize', function() { requestAnimationFrame(setVals); });

            return function() {
                return (containerH() + containerO) - (winH() * 2);
            };
        }
    }

})(jQuery, window);
(function($) {
	'use strict';

	MK.component.Pagination = function(el) {
		this.el = el;
	};

	MK.component.Pagination.prototype = {
		init: function init() {
			this.cacheElements(); 
			this.bindEvents();
			this.onInitLoad();
		},

		cacheElements: function cacheElements() {
			this.lastId = 1;
			this.unique = Date.now();
			this.$pagination = $(this.el);
			this.$container = this.$pagination.prev('.js-loop');
			this.$pageLinks = this.$pagination.find('.js-pagination-page');
			this.$nextLink = this.$pagination.find('.js-pagination-next');
			this.$prevLink = this.$pagination.find('.js-pagination-prev');
			this.$current = this.$pagination.find('.js-current-page');
			this.$maxPages = this.$pagination.find('.pagination-max-pages'); // TODO change in DOM and here to js class
			this.containerId = '#' + this.$container.attr('id');
			this.pagePathname = window.location.pathname;
			this.pageSearch = window.location.search;
			this.popState = false;
			this.ajaxLoader = new MK.utils.ajaxLoader('#' + this.$container.attr('id'));
			this.ajaxLoader.init();
		},

		bindEvents: function bindEvents() {
			this.$pageLinks.on('click', this.pageClick.bind(this));
			this.$nextLink.on('click', this.nextClick.bind(this));
			this.$prevLink.on('click', this.prevClick.bind(this)); 
			MK.utils.eventManager.subscribe('ajaxLoaded', this.onLoad.bind(this));
		},

		pageClick: function pageClick(e) {
			e.preventDefault(); 
			var $this = $(e.currentTarget);
			var id = parseFloat($this.attr('data-page-id'));

			if(id > this.ajaxLoader.getData('maxPages') || id < 1) return;
			this.load(id, $this);
			this.updatePagedNumUrl( id );
		},

		nextClick: function nextClick(e) {
			e.preventDefault(); 
			if(this.ajaxLoader.getData('paged') === this.ajaxLoader.getData('maxPages')) return;
			this.load(++this.lastId, $(e.currentTarget));
			this.updatePagedNumUrl( this.lastId );
		},

		prevClick: function prevClick(e) {
			e.preventDefault(); 
			if(this.ajaxLoader.getData('paged') === 1) return;
			this.load(--this.lastId, $(e.currentTarget));
			this.updatePagedNumUrl( this.lastId );
		},

		load: function load(id, $el) {
			this.lastId = id;
			this.ajaxLoader.setData({paged: id});
			this.ajaxLoader.load(this.unique);
			this.removeIndicator();
			MK.ui.loader.add($el);
		},

		onLoad: function success(e, response) {
			if( typeof response !== 'undefined' && response.id === this.containerId) {
				this.updatePagination();
				this.lastId = this.ajaxLoader.getData('paged');

				if(response.unique === this.unique) {
					this.removeIndicator();
					this.scrollPage();
			        this.$container.html(response.content);  
				}   
			}         
        },

        updatePagination: function updatePagination() {
        	var self = this;

        	// Hide / show arrows
        	var isFirst = (this.ajaxLoader.getData('paged') === 1);
        	var isLast = (this.ajaxLoader.getData('paged') === this.ajaxLoader.getData('maxPages'));

        	if(isFirst) this.$prevLink.addClass('is-vis-hidden');
        	else this.$prevLink.removeClass('is-vis-hidden');

        	if(isLast) this.$nextLink.addClass('is-vis-hidden');
        	else this.$nextLink.removeClass('is-vis-hidden');

			// X of Y
			this.$current.html(this.ajaxLoader.getData('paged'));
			this.$maxPages.html(this.ajaxLoader.getData('maxPages'));

			// Move overfloating items
			var displayItems = 10;
			var centerAt = displayItems / 2;

			if(this.ajaxLoader.getData('maxPages') > displayItems) {
				this.$pageLinks.each(function(i) {

					var id = self.lastId - centerAt;
						id = Math.max(id, 1);
						id = Math.min(id, self.ajaxLoader.getData('maxPages') - displayItems + 1);
						id = id + i;

					$(this).html( id ).attr('data-page-id', id).show();

					if(i === 0 && id > 1) $(this).html('...');
					if(i === displayItems - 1 && id < self.ajaxLoader.getData('maxPages')) $(this).html('...');
				});
			} else {
				this.$pageLinks.each(function(i) {
					var $link = $(this);
					var id = i + 1;

					$link.html(id).attr('data-page-id', id);

					if( self.ajaxLoader.getData('maxPages') === 1) {
						self.$pageLinks.hide();
					} else {
						if(i > self.ajaxLoader.getData('maxPages') - 1) $link.hide();
						else $link.show();						
					}

				});
			}

        	// Highlight current only
			this.$pageLinks.filter('[data-page-id="' + this.ajaxLoader.getData('paged') + '"]' ).addClass('current-page')
				 .siblings().removeClass('current-page');

        },

        scrollPage: function scrollPage() {
            var containerOffset = this.$container.offset().top;
            var offset = containerOffset - MK.val.offsetHeaderHeight( containerOffset ) - 20; 

            this.$container.find('a:first').focus()
            MK.utils.scrollTo( offset ); 
        },

        removeIndicator: function removeIndicator() {
        	MK.ui.loader.remove('.js-pagination-page, .js-pagination-next, .js-pagination-prev');
        },

		/**
		 * Set some actions when archive/category page is loaded. Actions list:
		 * - Select the correct paged ID on pagination list.
		 * - Set current paged ID on the label.
		 * - Add event listener onpopstate for handling prev/next button of Browser URL.
		 * - Set info for updatePagedNumUrl() about request comes from popstate.
		 *
		 * @since 5.9.8
		 */
		onInitLoad: function onInitLoad() {
			var initPagedID = this.$pagination.data( 'init-pagination' );
			if ( initPagedID && initPagedID > 1 ) {
				this.$current.html( initPagedID );
				this.$pageLinks.filter( '[data-page-id="' + initPagedID + '"]' ).addClass( 'current-page' ).siblings().removeClass( 'current-page' );
			}

			// Run popstate only if it's supported by the browser.
			if ( 'onpopstate' in window ) {
				var thisPop = this;
				window.onpopstate = function( event ) {
					var id = 1;

					// At start, state is always null. So, we should check it before processing.
					if ( typeof event.state === 'object' && event.state ) {
						var state = event.state;

						// Set paged ID for updating page.
						if ( state.hasOwnProperty( 'MkPagination' ) ) {
							var currentState = state.MkPagination;
							if ( currentState.hasOwnProperty( 'paged' ) ) {
								id = parseFloat( currentState.paged );
							}
						}
					} else {
						id = parseFloat( thisPop.getURLPagedID() );
					}

					// Tell updatePagedNumUrl() if request come from popstate.
					thisPop.popState = true;
					thisPop.$pageLinks.filter( '[data-page-id="' + id + '"]' ).trigger( 'click' );
				}
			}
		},

		/**
		 * Update current pagination browser URL by adding/changing paged number. Only run if
		 * the browser support pushState and the request not coming from popstate.
		 *
		 * WordPress has some ways to set paged number:
		 * 1. page/[number], paged=[number] will be directed here.
		 * 2. page=[number]
		 * So, we should check which one the request is used here.
		 *
		 * @since 5.9.8
		 */
		updatePagedNumUrl: function updatePagedNumUrl( id ) {
			// Check pushState browser support and ignore if request come from popstate.
			if ( 'history' in window && 'pushState' in history && id && ! this.popState ) {
				var fullPage = this.pagePathname + this.pageSearch;
				var isQueryPage = false;

				// Style 1 - /page/[number], as default value.
				var newPage = 'page/' + id + '/';
				var expPage = /page\/\d+\/?/;
				var result = this.pagePathname.match( /\/page\/\d+/ );
				var isPagedExist = ( result ) ? true : false;

				// Style 2 - ?page=[number], only run if /page/ is not exist and URL query var exist.
				if ( ! isPagedExist && this.pageSearch ) {
					isQueryPage = this.pageSearch.match( /page\=\d+/ );
					if ( isQueryPage ) {
						newPage = 'page=' + id;
						expPage = /page\=\d+/;
					}
				}

				// If page number is 1, remove paged number from URL.
				if ( id === 1 ) {
					newPage = '';
					if ( isQueryPage ) {
						expPage = ( this.pageSearch.match( /\&+/ ) ) ? /page\=\d+\&?/ : /\?page\=\d+\&?/;
					}
				}

				// Set new pathname. Do replacement only if the new pathname contains paged number.
				var newURL = this.pagePathname + newPage + this.pageSearch;
				if ( fullPage.match( expPage ) ) {
					newURL = fullPage.replace( expPage, newPage );
				}

				// Set history state and return popstate back to false.
				var historyState = {
					MkPagination: {
						url: newURL,
						paged: id
					}
				}
				this.popState = false;

				// Push new pathname to display/hide the paged number.
				window.history.pushState( historyState, null, newURL );
			}
			this.popState = false;
		},

		/**
		 * Get current URL page ID. Notes:
		 * 1. page/[number], paged=[number] will be directed here.
		 * 2. page=[number]
		 *
		 * @return {integer} Current paged ID. Default 1.
		 */
		getURLPagedID: function getURLPagedID() {
			var pathname = window.location.pathname;
			var search = window.location.search;
			var pagedId = 1;
			var result = '';
			var isPagedExist = false;

			// Search based on style 1.
			result = pathname.match( /\/page\/(\d+)/ );
			if ( result ) {
				isPagedExist = true;
				pagedId = ( result.hasOwnProperty( 1 ) ) ? result[1] : 1;
			}

			// Search based on style 2.
			if ( ! isPagedExist && search ) {
				result = search.match( /page\=(\d+)/ );
				if ( result ) {
					isPagedExist = true;
					pagedId = ( result.hasOwnProperty( 1 ) ) ? result[1] : 1;
				}
			}

			return pagedId;
		}
	};

}(jQuery));
(function($) {
	'use strict';

	// Check if it's inside hidden parent
	// Cannot be position: fixed
	function isHidden(el) {
	    return (el.offsetParent === null);
	}

	MK.component.Masonry = function(el) {
		var $window = $(window);
		var $container = $(el);
		var config = $container.data( 'masonry-config' );
		var $masonryItems = $container.find(config.item);
		var cols = config.cols || 8;
		var $filterItems = null; // assign only when apply filter
		var wall = null;
		
        var init = function init() {
        	MK.core.loadDependencies([ MK.core.path.plugins + 'freewall.js' ], onDepLoad);
        };

        var onDepLoad = function onDepLoad() {
        	masonry();

        	// Events
	        $window.on('resize', onResize);
            MK.utils.eventManager.subscribe('ajaxLoaded', onPostAddition);
			MK.utils.eventManager.subscribe('staticFilter', resize);
        };

	    var masonry = function masonry() {
	    	// Quit for hidden elements for now.
	    	if(isHidden(el)) return;

	    	var newCols;
	    	if(window.matchMedia( '(max-width:600px)' ).matches) newCols = 2;
	    	else if(window.matchMedia( '(max-width:850px)' ).matches) newCols = 4;
	    	else newCols = cols;

	    	var colW = $container.width() / newCols;

	        wall = new Freewall( config.container );

	        // We need to pass settings to a plugin via reset method. Strange but works fine.
			wall.reset({
				selector: config.item + ':not(.is-hidden)',
				gutterX: 0, // set default gutter to 0 and again - apply margins to item holders in css
				gutterY: 0,
				cellW: colW,
				cellH: colW
			});

	        wall.fillHoles();
	        wall.fitWidth();

	        $masonryItems.each(function() {
	        	$(this).data('loaded', true);
	        });
        };


		// Clear attributes after the plugin. It's API method dosn't handle it properly
		var destroyContainer = function destroyContainer() {
			$container.removeAttr('style')
				 .removeData('wall-height')
				 .removeData('wall-width')
				 .removeData('min-width')
				 .removeData('total-col')
				 .removeData('total-row')
				 .removeAttr('data-wall-height')
				 .removeAttr('data-wall-width')
				 .removeAttr('data-min-width')
				 .removeAttr('data-total-col')
				 .removeAttr('data-total-row');
		};

		var destroyItem = function destroyItem() {
			var $item = $(this);
			$item.removeAttr('style')
				 .removeData('delay')
				 .removeData('height')
				 .removeData('width')
				 .removeData('state')
				 .removeAttr('data-delay')
				 .removeAttr('data-height')
				 .removeAttr('data-width')
				 .removeAttr('data-state'); 
		};

		var destroyAll = function destroyAll() {
	    	if( !wall ) return;
    		wall.destroy(); // API destroy
    		destroyContainer();
    		$masonryItems.each( destroyItem ); // run our deeper destroy
		};

		var onResize = function onResize() {
			requestAnimationFrame(resize);
		};

        var refresh = function refresh() {
	    	if( !wall ) return; 
	    	setTimeout(wall.fitWidth.bind(wall), 5);
        };

        var resize = function resize() {
        	destroyAll();
	    	masonry();
        };

        var onPostAddition = function onPostAddition() {
        	$masonryItems = $container.find(config.item);

        	$masonryItems.each(function() {
        		var $item = $(this),
        			isLoaded = $item.data('loaded');

        		if(!isLoaded) $item.css('visibility', 'hidden');
        	});

        	
        	$container.mk_imagesLoaded().then(function() {
        		destroyAll();
        		masonry();
        	});
        };

        return {
         	init : init
        };
	};

}(jQuery));
(function( $ ) {
	'use strict';

	var val = MK.val,
		utils = MK.utils;

	MK.component.Parallax = function( el ) {
		var self = this,
			$this = $( el ),
        	obj = $this[0],
			$window = $( window ),
		    container = document.getElementById( 'mk-theme-container' ),
			config = $this.data( 'parallax-config' ),
			$holder = $( config.holder ),
			headerHeight = null,
			offset = null,
			elHeight = null,
			ticking = false,
			isMobile = null;


		var clientRect = null;

		var update = function() {
			// Clear styles to check for natural styles
			// then apply position and size
			obj.style.transform = null;
			obj.style.top = null;
			obj.style.bottom = null;

			isMobile = MK.utils.isMobile();

			if( isMobile ) {
        		$this.css( 'height', '' );
				return;
			}

			clientRect = $this[ 0 ].getBoundingClientRect();
			offset = clientRect.top;
			elHeight = clientRect.height;
			headerHeight = val.offsetHeaderHeight( offset );
			offset = offset - headerHeight + val.scroll(); 

			setPosition(); 
			setSize( ); 
		};


        var h = 0,
        	winH = 0,
        	proportion = 0,
        	height = 0;

        // Position and background attachement should me moved to CSS but we repair it high specificity here as styles are not reliable currently
        var setSize = function() {
        	$this.css( 'height', '' );
        	winH = $window.height() - headerHeight;
        	h = obj.getBoundingClientRect().height; 

        	if( config.speed <= 1 && config.speed > 0 ) {
        		if( offset === 0 ) {
	        		$this.css({
	        			backgroundAttachment: 'scroll',
	        			'will-change': 'transform'
	        		});
        		} else {
	        		$this.css({
						height : h + ( (winH - h) * config.speed ),
	        			backgroundAttachment: 'scroll',
	        			'will-change': 'transform' 
	        		}); 
	        	}

        	} else if ( config.speed > 1 && h <= winH ) {
        		$this.css({
        			// good for full heights - 2 because it's viewable by 2 screen heights
        			height: ( winH  +  ( ( winH * config.speed ) - winH ) * 2 ),  
        			top: -( ( winH * config.speed ) - winH ),
        			backgroundAttachment: 'scroll',
        			'will-change': 'transform'
        		}); 

        	} else if ( config.speed > 1 && h > winH ) {
        		proportion = h / winH;
        		height = ( winH  +  ( ( winH * config.speed ) - winH ) * (1 + proportion) );
 
        		$this.css({
        			height: height,
        			top: -( height - (winH * config.speed) ),
        			backgroundAttachment: 'scroll',
        			'will-change': 'transform'
        		}); 

        	} else if ( config.speed < 0 && h >= winH ) {
        		height = h * (1  - config.speed);
        		$this.css({
					height: height + (height - h),
        			top: h - height,
        			backgroundAttachment: 'scroll',
        			'will-change': 'transform'
        		});   

        	} else if ( config.speed < 0 && h < winH ) {
        		// candidate to change
        		var display = (winH + h) / winH;
        		height = h * -config.speed * display;
        		$this.css({
					height: h + (height * 2),
        			top: -height,
        			backgroundAttachment: 'scroll',
        			'will-change': 'transform'
        		});         		
        	}
        };


		var currentPoint = null,
			progressVal = null,
			startPoint = null,
			endPoint = null,
			$opacityLayer = config.opacity ? $this.find( config.opacity ) : null,
			scrollY = null;

		var setPosition = function() {
			startPoint = offset - winH;
			endPoint = offset + elHeight + winH - headerHeight;
			scrollY = val.scroll();

			if( scrollY < startPoint || scrollY > endPoint ) { 
				ticking = false;
				return; 
			}

			currentPoint = (( -offset + scrollY ) * config.speed);

            $this.css({
              	'-webkit-transform': 'translateY(' + currentPoint + 'px) translateZ(0)',
              	'-moz-transform': 'translateY(' + currentPoint + 'px) translateZ(0)',
              	'-ms-transform': 'translateY(' + currentPoint + 'px) translateZ(0)',
              	'-o-transform': 'translateY(' + currentPoint + 'px) translateZ(0)',
              	'transform': 'translateY(' + currentPoint + 'px) translateZ(0)'
            });  

			ticking = false;
		};

 
		var requestTick = function() {
			if( !ticking && !isMobile ) {
				ticking = true;
				window.requestAnimationFrame( setPosition );
			}
		};


		var init = function() { 
			// Disable scroll effects when smooth scroll is disabled
			if( !MK.utils.isSmoothScroll ) { return; }

			update();
			setTimeout(update, 100);
			$window.on( 'load', update );
			$window.on( 'resize', update );
	        window.addResizeListener( container, update );
	        
			$window.on( 'scroll', requestTick );
		};
		
 
		return {
			init : init
		};
	};

})( jQuery );
(function($) {
	'use strict';

	MK.component.Preloader = function(el) {
		this.el = el;
	};

	MK.component.Preloader.prototype = {
		init: function init() {
			this.cacheElements();
			this.bindEvents();
		},

		cacheElements: function cacheElements() {
			this.$preloader = $(this.el);
		},

		bindEvents: function bindEvents() {
			this.onLoad(); // all components inited on page load
		},

		onLoad: function onLoad() {
			setTimeout(this.hidePreloader.bind(this), 300);
		},

		hidePreloader: function hidePreloader() {
			this.$preloader.hide();
		}
	};

}(jQuery));

(function($) {
	'use strict';

	// Image added for proportional scaling
	MK.ui.loader = {
		tpl : function() {
			return '<div class="mk-loading-indicator">' + 
						'<div class="mk-loading-indicator__inner">' +
							'<div class="mk-loading-indicator__icon"></div>' +
							'<img style="height:100%; width:auto;" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7">' +
						'</div>' +
					'</div>';
		},

		add : function(item) {
			$(item).append(this.tpl);
		},

		remove : function(item) {
			if(item) $(item).find('.mk-loading-indicator').remove();
			else $('.mk-loading-indicator').remove();
		}
	};

}(jQuery));
(function( $ ) {
	// IE / Edge fix for fixed positioned elements
	// MS clip path doesnt redraw properly so we expirience similar bug like with background attachement fixed on Chrome
	if (MK.utils.browser.name === 'Edge' || MK.utils.browser.name === 'IE') {
	 	var val = 1;
	 	var $edgeClipper = $('.mk-slider-slide'); // edge slider
	 	var $sectionClipper = $('.clipper-true'); // edge slider
	 	var $bgLayer = $('.background-layer'); // page section

    	var onScroll = function onScroll() {
	    	val *= -1;
	    	if( $edgeClipper.length ) $edgeClipper.each( redraw );
	    	if( $sectionClipper.length ) $sectionClipper.each( redraw );
	    	if( $bgLayer.length ) $bgLayer.each( redraw );
    	};

	 	var redraw = function redraw() {
	    	$(this).css('margin-top', val / 100);
	    };

	    $(window).on("scroll", function () {	    	
	    	window.requestAnimationFrame(onScroll);
	    });
	 }
}(jQuery));
MK.component.ResponsiveImageSetter = (function ($) {

	'use strict';

	var module = {};


	/*---------------------------------------------------------------------------------*/
	/* Private Variables
	/*---------------------------------------------------------------------------------*/

	var viewportClass = getViewportClass();
	var isRetina = window.devicePixelRatio >= 2;


	/*---------------------------------------------------------------------------------*/
	/* Private Methods
	/*---------------------------------------------------------------------------------*/

	function run($imgs) {
		$imgs.filter( function() {
			return !this.hasAttribute("mk-img-src-setted");
		}).each(setSrcAttr);
	}

	function setSrcAttr() {
		var $img = $(this);
		var set = $img.data('mk-image-src-set');
		// Set src attribute to img link suitable for our logic. It will load the image.
		if(set['responsive'] === 'false' && isRetina && set['2x']) $img.attr('src', set['2x']);
		else if(set['responsive'] === 'false') $img.attr('src', set.default);
		else if(viewportClass === 1 && isRetina && set['2x']) $img.attr('src', set['2x']); // default x2 for retina
		else if(viewportClass === 0 && set.mobile) $img.attr('src', set.mobile);
		else $img.attr('src', set.default);

		$img.load(function() {
			$(window).trigger('mk-image-loaded')
		})
	}

	function getViewportClass() {
		if(window.matchMedia('(max-width: 736px)').matches) return 0;
		else return 1;
	}

	function handleResize($imgs) {
		if(!$imgs.length) return; // Do not run if empty collection
		var currentViewportClass = getViewportClass();
		// We don't need to reload bigger images when screen size is decreasing as browser already performs resize operation.
		// Run update on for increasing screen size
		if( currentViewportClass > viewportClass) {
			viewportClass = currentViewportClass; // update for further reference
			run($imgs);
		}
	}


	/*---------------------------------------------------------------------------------*/
	/* Public Methods
	/*---------------------------------------------------------------------------------*/

	module.init = function ($imgs) {

		// Do not run if empty collection
		if(!$imgs.length) return;

		// Run and bind to events
		run($imgs);
		$imgs.attr('mk-img-src-setted', '');

	};

	module.onResize = function ($imgs) {

		$(window).on( 'resize', MK.utils.throttle( 500, function() {
			handleResize($imgs);
		}));


	};


	module.handleAjax = function () {
    	setTimeout(function ajaxDelayedCallback() { // give it a chance to insert content first
	    	var $newImgs = $('img[data-mk-image-src-set]').filter( function() {
				return !this.hasAttribute("mk-lazyload");
			});
			if(!$newImgs.length) return;
	    	run($newImgs);
    	}, 100);
    }


	return module;

}(jQuery));


jQuery(function($) {

	var init = function init() {
		// Get All Responsive Images
		$allImages = $('img[data-mk-image-src-set]').filter(function(index) {
			var isNotPortfolioImage = !$(this).hasClass('portfolio-image'),
				isNotBlogImage = $(this).closest('.mk-blog-container').length == 0,
				isNotSwiperImage = !$(this).hasClass('swiper-slide-image'),
				isNotGalleryImage = !$(this).hasClass('mk-gallery-image');
			return isNotPortfolioImage && isNotBlogImage && isNotSwiperImage && isNotGalleryImage;
		});;

		// Handle the resize
		MK.component.ResponsiveImageSetter.onResize($allImages);

		MK.component.ResponsiveImageSetter.init($allImages);

		MK.utils.eventManager.subscribe('ajaxLoaded', MK.component.ResponsiveImageSetter.handleAjax ); // ajax loops
		MK.utils.eventManager.subscribe('ajax-preview', MK.component.ResponsiveImageSetter.handleAjax ); // ajax portfolio
		MK.utils.eventManager.subscribe('quickViewOpen', MK.component.ResponsiveImageSetter.handleAjax );
	}
	init();
	$(window).on('vc_reload', init);

});



(function($) {
	'use strict';

	// 
	// Constructor
	// 
	// /////////////////////////////////////////////////////////

	MK.ui.Slider = function( container, config ) { 

		var defaults = {
				slide 				: '.mk-slider-slide',
	            nav 	     		: '.mk-slider-nav',
                effect              : 'roulete',
                ease 				: 'easeOutQuart', // should not be changed, remove
                slidesPerView       : 1,
                slidesToView        : 1,
                transitionTime      : 700,
                displayTime         : 3000,
                autoplay            : true,
                hasNav              : true,
                hasPagination       : true,
                paginationTpl 		: '<span></span>',
                paginationEl 		: '#pagination',
                draggable           : true,
                fluidHeight 		: false,
                pauseOnHover		: false,
                lazyload			: false,
                activeClass 		: 'is-active',
                edgeSlider	 		: false,
                spinnerTpl 			: '<div class="mk-slider-spinner-wrap"><div class="mk-slider-spinner-fallback"></div><svg class="mk-slider-spinner" viewBox="0 0 66 66" xmlns="http://www.w3.org/2000/svg"><circle class="mk-slider-spinner-path" fill="none" stroke-width="4" stroke-linecap="round" cx="33" cy="33" r="30"></circle></svg></div>',
                onInitialize 		: function() {},
                onAfterSlide 		: function( id ) {},
                onBeforeSlide 		: function( id ) {}
		};

		this.state = {
			id 						: 0,
			moveForward 			: true,
			running   				: false,
            zIFlow					: null,
            stop 					: false,
		};

		this.config = $.extend( defaults, config );
		this.container = container;

		this.initPerView = this.config.slidesPerView;

		// Timer holder
		this.activeTimer = null;
		this.autoplay = null;
		this.timer = null;
		this.timerRemaining = parseInt(this.config.displayTime);

		// Boolean 'Em All, Making sure it's not string
		this.config.lazyload = JSON.parse(this.config.lazyload);
		this.config.edgeSlider = JSON.parse(this.config.edgeSlider);

		// Image Loader Instance
		this.imageLoader = null;

		// Add abort command to imagesLoaded, Placing it inside script makes it to work with different versions
		// of imagesLoaded if loaded by other Plugins
		imagesLoaded.prototype.abort = function() {
			this.progress = this.complete = function() { };
		};
	};

	

	// 
	// Shared methods
	// 
	// /////////////////////////////////////////////////////////

	MK.ui.Slider.prototype = {

		init : function() {
			this.setPerViewItems();
			this.cacheElements();
			this.getSlideSize();
			this.bindEvents();
            this.setSize();
			this.setPos();

			// Hack for preparing 'prev' on first click if needed
			this.updateId( -1 );
			this.updateId( 1 );

			this.val = this.dynamicVal();
			this.timeline = this.prepareTimeline( this.config.transitionTime );

			this.timeline.build();

			if( this.config.hasPagination ) { this.buildPagination(); }
			
			if( this.config.autoplay && document.hasFocus() ) { this.setTimer(); }

			if( typeof this.config.onInitialize === 'function' ) {
				this.config.onInitialize( this.slides );
			}

			if( this.config.fluidHeight === true ) {
				$( this.slides ).height( 'auto' );
				$( this.container ).css( 'transition', 'height ' + 200 + 'ms ease-out' );
				this.setHeight( 0 );
			}


			if( this.config.fluidHeight === 'toHighest' ) {
				this.setHeightToHighest();
			}

			// Create timer per slide if required
			$(this.slides).each(this.createTimer);

			// If it's Edge Slider and Lazy Load is enabled 
			if ( this.config.lazyload && this.config.edgeSlider ) {

				// If It's not a Video Slide
				if ( $(this.slides[this.state.id]).find('video').length === 0 ) {
					// Set the first slide's BG image
					var $slideImg = $(this.slides[this.state.id]).children('[data-mk-img-set]');
					MK.component.BackgroundImageSetter.init( $slideImg );
				}
				$(this.config.spinnerTpl).prependTo( this.$slides );

			} else {

				// Set all slides's BG images
				MK.component.BackgroundImageSetter.init( $(this.slides).children('[data-mk-img-set]') );

			}
			


		},


		cacheElements : function () {
			this.container = this.isNode( this.container ) ? this.container 
				: document.querySelectorAll( this.container )[0];
			this.slides = this.container.querySelectorAll( this.config.slide );
			this.$slides = $(this.slides);

			if( this.config.hasNav ) { this.$nav = $( this.config.nav ); }
			if( this.config.hasPagination ) { this.$pagination = $( this.config.paginationEl ); }
		},


		bindEvents : function() {
			var $window = $( window );

			if( this.config.slidesPerView > 1 ) { $window.on( 'resize', this.setPerViewItems.bind( this ) ); }
			if( this.config.hasNav ) { this.eventsNav(); }
			if( this.config.hasPagination ) { this.eventsPag(); }
			if( this.config.draggable ) { this.dragHandler(); }
			if( this.config.autoplay ) {
				$window.on( 'focus', this.windowActive.bind( this ) );
				$window.on( 'blur', this.windowInactive.bind( this ) );
			}
			if( this.config.pauseOnHover ) {
				$(this.container).on( 'mouseleave', this.setTimer.bind( this ) );
				$(this.container).on( 'mouseenter', this.unsetTimer.bind( this ) );
			}
			if( this.config.fluidHeight === 'toHighest' ) {
				$window.on( 'resize', this.setHeightToHighest.bind( this ) );
			}
		},


		setPerViewItems: function() {
			if(window.matchMedia( '(max-width: 500px)' ).matches) { this.config.slidesPerView = 1; }
			else if(window.matchMedia( '(max-width: 767px)' ).matches && this.initPerView >= 2 ) { this.config.slidesPerView = 2; }
			else if(window.matchMedia( '(max-width: 1024px)' ).matches && this.initPerView >= 3 ) { this.config.slidesPerView = 3; }
			else { this.config.slidesPerView = this.initPerView; }
			
        	if( typeof this.slides === 'undefined' ) return; 
			this.getSlideSize();
			this.setSize();
			this.setPos();
			this.timeline = this.prepareTimeline( this.config.transitionTime );
			this.timeline.build();
		},


		eventsNav : function() {
			this.$nav.on( 'click', 'a', this.handleNav.bind( this ) );
		},


		eventsPag : function() {
			this.$pagination.on( 'click', 'a', this.handlePagination.bind( this ) );
		},


		handleNav : function( e ) {
			e.preventDefault();

			if( this.state.running ) { return; }
			this.state.running = true;

			var $this = $( e.currentTarget ),
				moveForward = $this.data( 'direction' ) === 'next';


			if( this.config.autoplay ) { 
				this.unsetTimer();
				setTimeout( this.setTimer.bind( this ), this.config.transitionTime );
			}

			this.state.moveForward = moveForward;
			this.timeline.build();
			this.timeline.play();

			this.setActive( this.nextId( moveForward ? 1 : -1 ) );
			if( this.config.fluidHeight ) { this.setHeight( this.nextId( moveForward ? 1 : -1 ) ); }
		},


		handlePagination : function( e ) {
			e.preventDefault();

			var $this = $( e.currentTarget ),
				id = $this.index();

			this.goTo( id );
		},


		reset: function() {
			this.state.stop = true;
			this.state.id = 0;
			this.setPos();
			this.unsetTimer();
			this.setTimer();
		},


		goTo : function(id) {
			if( this.state.running ) { return; }
			this.state.running = true;

			var lastId = this.state.id;

			if( lastId === id ) {
				return;
			} else if( lastId < id ) {
				this.state.moveForward = true;
			} else {
				this.state.moveForward = false;
			}

			if( this.config.autoplay ) { 
				this.unsetTimer();
				setTimeout( this.setTimer.bind( this ), this.config.transitionTime );
			}

			this.timeline.build( Math.abs( lastId - id ) );
			this.timeline.play();

			this.setActive( id );
			if( this.config.fluidHeight ) { this.setHeight( id ); } 
		},


		windowActive : function() {
			this.setTimer(false, true);
			$(this.container).removeClass('is-paused'); 
		},


		windowInactive : function() {
			this.unsetTimer();
			$(this.container).addClass('is-paused');
		},


		updateId : function( val ) {
			this.state.id = this.nextId(val);
		},

		nextId : function( val ) {
			var len = this.slides.length,
				insertVal = this.state.id + val;
				insertVal = ( insertVal >= 0 ) ? insertVal : len + val;
				insertVal = ( insertVal >= len ) ? 0 : insertVal;

			return insertVal;
		},


		setStyle : function( obj, style ) {
            var hasT = style.transform,
            	t = {
	                x       : ( hasT ) ? style.transform.translateX : null,
	                y       : ( hasT ) ? style.transform.translateY : null,
	                scale   : ( hasT ) ? style.transform.scale 		: null,
	                rotate  : ( hasT ) ? style.transform.rotate 	: null,
	                rotateX : ( hasT ) ? style.transform.rotateX 	: null,
	                rotateY : ( hasT ) ? style.transform.rotateY 	: null
           		},
				z  = 'translateZ(0)',
            	x  = (t.x) ?  'translateX(' + t.x + '%)' 		: 'translateX(0)',
                y  = (t.y) ?  'translateY(' + t.y + '%)' 		: 'translateY(0)',
                s  = (t.scale)  ?  'scale(' + t.scale + ')' 	: 'scale(1)',
                r  = (t.rotate) ? 'rotate(' + t.rotate + 'deg)' : 'rotate(0)',
                rX = (t.rotateX) ? 'rotateX(' + t.rotateX + 'deg)' : '',
                rY = (t.rotateY) ? 'rotateY(' + t.rotateY + 'deg)' : '',

           		o = style.opacity,
           		h = style.height,
           		w = style.width;

            var c = z + x + y  + s + r + rX + rY;

            if( c.length ) {
	            obj.style.webkitTransform 	= c;
	            obj.style.msTransform 		= c;
	            obj.style.transform 		= c;
	        }

            if( typeof o === 'number' ) { obj.style.opacity = o; }
            if( h ) { obj.style.height  = h + '%'; }
            if( w ) { obj.style.width   = w + '%'; }
		},


		setPos : function() {
        	if( typeof this.slides === 'undefined' ) return; 
		    var id 			= this.state.id,
		    	i 			= 0,
		    	len 		= this.slides.length,
		    	animation 	= this.animation[ this.config.effect ],
		    	axis 		= animation.axis,
				animNext	= animation.next,
				animActi 	= animation.active,
				animPrev 	= animation.prev,
                perView 	= this.config.slidesPerView,
                slideId 	= null,
                zIFlow 		= null,
                style 		= {};

            style.transform = {};


            for( ; i < len; i += 1 ) {
                if(i < perView) {
                	// Position for visible slides. Apply active styles
                	style = animActi;
                    style.transform[ 'translate' + axis ] = i * 100;
                } else {
                	// Rest slides move after edge based on axis and moveForward. Apply Next / Prev styles
                	style = this.state.moveForward ? animNext : animPrev;
                    style.transform[ 'translate' + axis ] =  this.state.moveForward ? perView * 100 : -100;
                }

                this.slides[ i ].style.zIndex = 0;

                slideId = ( i + id ) % len;
                this.setStyle( this.slides[ slideId ], style );
            }
		},


        // When we're setting animation along Y axis we're going to set up height
        // otherwise width. It is shared amongst all slides
        setSize : function() {
        	if( typeof this.slides === 'undefined' ) return; 
        	var i = 0,
		    	len = this.slides.length,
		    	axis = this.animation[ this.config.effect ].axis,
                slideSize = this.slideSize,
        		style = {};

            if( axis === 'Y' ) {
                style.height = slideSize[ axis ];
            } else {
                style.width = slideSize[ axis ];
            }

            for( ; i < len; i += 1 ) {
                this.setStyle( this.slides[ i ], style );
            }
        },


        setHeight : function( id ) {
			var $slides = $( this.slides ),
				$activeSlide = $slides.eq( id );

        	var currentHeight = $activeSlide.height();
        	$( this.container ).height( currentHeight ); 
        },


        setHeightToHighest : function() {
        	// this is becouse of alliginig woocommrece carousel. Too much DOM
        	// Refactor someday
			var $slides = $( this.slides ),
				height = 0;

        	$slides.each(function() {
        		height = Math.max(height, $(this).find('> div').outerHeight());
        	});

        	$( this.container ).height( height ); 
        },


        // Little utility inspired by GreenSock.
        // We export this to this.timeline on init. 
        prepareTimeline : function( time ) {
			var self 		= this,
				iteration 	= 0,
            	totalIter 	= time / (1000 / 60),
            	animLoop 	= [],
            	aL 			= 0, // animation length
            	loops 		= 1,
				ease 		= this.config.ease, 
				currentStyle, timeProg, 
				build, move, add, play, reverse, progress, kill;


			// Build constants, run them only once
			// take out possibly
			var len 		= this.slides.length,
				perView   	= this.config.slidesPerView,
				animation 	= this.animation[ this.config.effect ],
				animAxis 	= animation.axis,
				animNext	= animation.next,
				animActi 	= animation.active,
				animPrev 	= animation.prev,
				style 		= {},
				slideId 	= null,
				zIFlow 		= null;

				style.transform = {};


			build = function( repeats ) {
				var currentEase = ease;
				loops = repeats || loops;

				// console.log('build', loops);

				if( !loops ) { return; }
				if( loops > 1 ) {
					currentEase = 'linearEase';
				}

				// clean before running new build
				kill();
				// set new positions
				self.setPos();

				var id = self.state.id,
					moveForward = self.state.moveForward,
					i = 0,
					axisMove = (moveForward) ? -100 : 100;

				for( ; i <= perView; i += 1 ) {
					slideId = ( (moveForward) ? i + id : i + id - 1 ) % len;
					slideId = ( slideId < 0 ) ? len + slideId : slideId;

					if( i === 0 ) {
						style = moveForward ? animPrev : animActi;
					} else if( i === perView ) {
						style = moveForward ? animActi : animNext;
					} else {
						style = animActi;
	            	}

               	 	zIFlow = (self.state.moveForward) ? animNext.zIndex : animPrev.zIndex; 
	                if( zIFlow ) { 
	                	// console.log( zIFlow );
	                	self.slides[ slideId ].style.zIndex = (zIFlow === '+') ? i + 1 : len - i;
	                }

					style.transform[ 'translate' + animAxis ] = axisMove;
	            	add( self.slides[ slideId ], style, currentEase );
				}
			};

			add = function( slide, toStyles, ease ) {
				if( typeof slide === 'undefined' ) {
					throw 'Add at least one slide';
				}

	            var fromStyles = slide.style,
					style = self.refStyle( toStyles, fromStyles );

				animLoop.push( [slide, style, ease] );
				aL += 1;
			};

			move = function( startProg, mode ) {
				if (isTest) return;
				var currentTotalIter = totalIter;

				if( loops > 1 ) {
				 	currentTotalIter = totalIter / 5;
				}

				if( !self.state.running ) { self.state.running = true; }

				if( startProg ) {
					// update iteration val to cached outside var
					// ceil to handle properly play after mouse up / touch end
					iteration = Math.ceil(startProg * currentTotalIter);
				}
				
				timeProg = iteration / currentTotalIter;
				progress( timeProg );

				// Break loop
				if( iteration >= currentTotalIter && mode === 'play' || 
					iteration <= 0 && mode === 'reverse' ) { 

					self.state.running = false;
					iteration = 0;
					kill();
	            	self.updateId( self.state.moveForward ? 1 : -1 );
					// If we're creating multiple animation loop we trigger outside only first pass to start all game.
					// the rest are triggered as callback
					loops -= 1;
					if( loops > 0 ) {
						build();
						play();
					}

					// if we run all loops reset back the default value
					if( !loops ) {
						loops = 1;
						self.timerRemaining = parseInt(self.config.displayTime);
						self.config.onAfterSlide( self.state.id );
					}

					return; 
				}

				// Run in given mode
				if( mode === 'play') {
					iteration += 1;
				} else {
					iteration -= 1;
				}

				requestAnimationFrame( function() {
					if(self.state.stop) return;
					move( 0, mode );
				});
			};

			play = function( startProg ) {

				var $nextSlide = $(self.slides[ self.nextId(self.state.moveForward ? 1 : -1) ] );

				// If it's Edge Slider and Lazy Load is enabled and It's not a Video Slide
				if ( self.config.lazyload && self.config.edgeSlider ) {

					// Set the next slide's BG Image
					var $slideImg = $nextSlide.find('[data-mk-img-set]');
					if ( $slideImg.length ) {
						MK.component.BackgroundImageSetter.init( $slideImg );
					}

				}

				self.config.onBeforeSlide( self.nextId(self.state.moveForward ? 1 : -1) );
				var start = startProg || 0;
				iteration = 0;
				self.state.stop = false;
				move( start, 'play' );

			};

			reverse = function( startProg ) {
				var start = startProg || 1;
				move( start, 'reverse' );
			};

			progress = function( progVal ) {
            	var aI = 0, 
            		currentStyle;

				for( aI; aI < aL; aI++ ) {
					if( progVal !== 1 && progVal !== 0 ) {
						currentStyle = self.currentStyle( progVal, animLoop[ aI ][ 1 ], animLoop[ aI ][ 2 ] );
					} else if( progVal === 1) {
						currentStyle = self.currentStyle( progVal, animLoop[ aI ][ 1 ], 'linearEase' );
					} else if ( progVal === 0 ) {
						currentStyle = self.currentStyle( progVal, animLoop[ aI ][ 1 ], 'linearEase' );
					} 
					self.setStyle( animLoop[ aI ][ 0 ], currentStyle );
				}
			};

			// Clear previous loop
			kill = function() {
				animLoop = [];
            	aL = 0;
			};


			return {
				build 		: build,
				add 		: add,
				play 		: play,
				reverse 	: reverse,
				progress 	: progress
			};
		},


		// Build reference styles.
		// Return object with array containig initial style and change of its value
		// as required for easing functions
		refStyle : function( toStyles, fromStyles ) {
			var axis = this.animation[ this.config.effect ].axis,
            	style = {},
				initVal, changeVal, endVal, dynamicEnd, styleProp, transProp, transform;

			for( styleProp in toStyles ) {

				if( styleProp === 'transform' ) {
					transform = this.getTransforms( fromStyles );
					style.transform = {};

					for( transProp in toStyles.transform ) {
						// don't care about z
						if( transProp === 'translateZ' ) { continue; }

						initVal = transform[ transProp ] || 0; // if it is undefined it means it's 0
						dynamicEnd = ( transProp === 'translate' + axis ) ? initVal : 0;
						endVal  = toStyles.transform[ transProp ] + dynamicEnd; // it is dynamic, based on slide position in current set
						changeVal = endVal - initVal;
						style.transform[ transProp ] = [ initVal, changeVal ];
					}
				} else if( styleProp === 'zIndex' ) {
					// console.log( 'z' );
					continue;
				} else {
					initVal = parseFloat( fromStyles[ styleProp ] ) || 0; // if it is undefined it means it's 0
					endVal  = toStyles[ styleProp ];
					changeVal = endVal - initVal;
					style[ styleProp ] =  [ initVal, changeVal ];
				}
			}

			return style;
		},


		currentStyle : function( progress, style, ease ) {
			var self = this,
				currentStyle = {},
            	currentVals, styleProp, transProp, prog;

			// Redo same loop but construct currentStyle object out of cached values
			for( styleProp in style ) {

				if( styleProp === 'transform' ) {
					currentStyle.transform = {};

					for( transProp in style.transform ) {
						// remove this line. double check first if needed by logging
						if( transProp === 'translateZ' ) { continue; }

						currentVals = style.transform[ transProp ];
						currentStyle.transform[ transProp ] = 
							// (currentIteration, startValue, changeInValue, totalIterations)
								self.ease[ ease ]( progress, currentVals[ 0 ], currentVals[ 1 ], 1 );
					}
				} else {
					currentVals = style[ styleProp ];
					currentStyle[ styleProp ] = 
						self.ease[ ease ]( progress, currentVals[ 0 ], currentVals[ 1 ], 1 );
				}
			}

			return currentStyle;
		},


		setActive : function( id ) {
			var $slides = $( this.slides ),
				className = this.config.activeClass;

			$slides.removeClass( className );

			if( this.config.hasPagination ) {
				var $pagination = this.$pagination.find( 'a' );
				$pagination.removeClass( className );
				$pagination.eq( id ).addClass( className );
			}

			if( this.activeTimer ) {
				clearTimeout( this.activeTimer );
				if ( this.imageLoader ) {
					this.imageLoader.abort();
				}
			} 
			

			var self = this;

			this.activeTimer = setTimeout( function() {

				var $currentSlide = $slides.eq( id );

				if ( self.config.lazyload && self.config.edgeSlider ) {  // If it's Edge Slider and Lazy Load is enabled

					if ( $currentSlide.find('.mk-section-video').length && $currentSlide.children('.mk-video-section-touch').length ) {  // If it's a Video Slide and has a Preview image
						
						var imgSet = $currentSlide.children('.mk-video-section-touch').data('mk-img-set');
						var exactImg = MK.component.BackgroundImageSetter.getImage( imgSet );
						var $bgImage = $('<img>').attr('src', exactImg );

						self.imageLoader = imagesLoaded( $bgImage[0], function( instance ) {
							$currentSlide.children('.mk-slider-spinner-wrap').addClass('mk-slider-spinner-wrap-hidden');
							setTimeout( function() {
						 		$currentSlide.children('.mk-slider-spinner-wrap').hide();
						 	}, 200);
							$currentSlide.addClass( className );
					 	});

					} else if ( $currentSlide.find('.mk-section-video').length && $currentSlide.children('.mk-video-section-touch').length === 0 ) { // If it's a Video Slide and has NOT a Preview image

						$currentSlide.children('.mk-slider-spinner-wrap').addClass('mk-slider-spinner-wrap-hidden');
						setTimeout( function() {
					 		$currentSlide.children('.mk-slider-spinner-wrap').hide();
					 	}, 200);
						$currentSlide.addClass( className );
						
					} else {  // If it's a Image Slide

						if ( $currentSlide.children('[data-mk-img-set]').length ) {
							// Get the matching Image URL to start lazy loading
							var imgSet = $currentSlide.children('[data-mk-img-set]').data('mk-img-set');
							var exactImg = MK.component.BackgroundImageSetter.getImage( imgSet );
							var $bgImage = $('<img>').attr('src', exactImg );

							// Prevent counting time on slide until the image loads
							self.unsetTimer();
							self.imageLoader = imagesLoaded( $bgImage[0], function( instance ) {
								// Hide spinner, Continue counting time on slide and show the content
							 	$currentSlide.children('.mk-slider-spinner-wrap').addClass('mk-slider-spinner-wrap-hidden');
							 	setTimeout( function() {
							 		$currentSlide.children('.mk-slider-spinner-wrap').hide();
							 	}, 200);
								self.setTimer(false, false, $currentSlide.data('timer') || Number(self.config.displayTime) );
								$currentSlide.addClass( className );
							});
						} else {
							$currentSlide.children('.mk-slider-spinner-wrap').addClass('mk-slider-spinner-wrap-hidden');
						 	setTimeout( function() {
						 		$currentSlide.children('.mk-slider-spinner-wrap').hide();
						 	}, 200);
							self.setTimer(false, false, $currentSlide.data('timer') || Number(self.config.displayTime) );
							$currentSlide.addClass( className );
						}

					}

				} else {

					$currentSlide.addClass( className );

				}
				
				
			}, this.config.transitionTime );
		},

		createTimer : function() {

			var $slide = $(this),
				video = $slide.find('video').get(0);

			if(video) {
				// A hacky but reliable way to ge the video duration
				var interval = setInterval( function() {
					// If the metadata is ready
					if ( video.readyState > 0 ) {
						$slide.data('timer', (video.duration * 1000));
						$slide.attr('data-timer', (video.duration * 1000));
						clearInterval(interval);
					}
				}, 100);
			}

		},
		
		setTimer : function( isFirst, isPaused, fixed_time ) {
			// check for custom timer
			var customTimer = this.$slides.eq(this.nextId(this.state.moveForward ? 1 : -1)).data('timer'),
				trans = parseInt( this.config.transitionTime ),
				interval = customTimer ? customTimer : parseInt( this.config.displayTime ),
				timer = interval + trans;

			var self  = this,
				first = isFirst || true,
				fixed_time = fixed_time || 0,
				create, run;

			this.timer = true;
			this.lastSetTimer = Date.now();

			create = function() {	

				if( self.autoplay ) { clearTimeout( self.autoplay ); }
				if( !self.timer ) {
					return;
				}
				self.state.moveForward = true;
				self.timeline.build();
				self.timeline.play();
				self.setActive( self.nextId( 1 ) );
				if( self.config.fluidHeight ) { self.setHeight( self.nextId( 1 ) ); }
				first = false;
				self.lastSetTimer = Date.now();

				run();
			};

			run = function(newInterval) {
				// check for custom timer
				customTimer = self.$slides.eq(self.nextId(self.state.moveForward ? 1 : -1)).data('timer');
				interval = customTimer ? customTimer : parseInt( self.config.displayTime );
				timer = interval + trans; // update timer with current val

				var time = newInterval || timer;
				self.autoplay = setTimeout( create, time );
			};

			if ( fixed_time ) {
				run( fixed_time );
			} else if (isPaused) {
				run( this.timerRemaining );
			} else {
				run();
			}
		},


		unsetTimer : function() {
			this.timer = false;
			this.lastUnsetTimer = Date.now();
			this.timerRemaining -= this.lastUnsetTimer - this.lastSetTimer;
			if( this.autoplay ) { clearTimeout( this.autoplay ); }
		},


		buildPagination : function() {
			var i   = 0,
				len = this.slides.length,
				tpl = '';

			for( ; i < len; i += 1 ) {
				tpl += '<a href="javascript:;">' + this.config.paginationTpl + '</a>';
			}

			this.$pagination.html( tpl );
			this.setActive( 0 );
		},


		getSlideSize : function() {
			this.slideSize = {
                X: 100 / this.config.slidesPerView,
                Y: 100 / this.config.slidesPerView
            };
		},


		getTransforms : function( style ) {
			// console.log( style );
		    var transform = style.transform || style.webkitTransform || style.mozTransform,
		    	regex = /(\w+)\(([^)]*)\)/g,
				match,
				T = {};

			if( typeof transform !== 'string' ) {
				throw 'Transform prop is not a string.';
			}

		    if( !transform ) { return; }
	
			// Run regex assignment
			while( match = regex.exec( transform ) ) {
				T[ match[ 1 ] ] = parseFloat( match[ 2 ] );
			}

		    return T;
		},

		isNode : function( o ) {
			return (
		    	typeof Node === "object" ? o instanceof Node : 
		   			o && typeof o === "object" && typeof o.nodeType === "number" && typeof o.nodeName==="string"
		  	);
		},


		dragHandler : function() {
			var self = this,
				$container = $( this.container ),
				prevBuild = false, 
				nextBuild = false,
				dragging = false,
				buffor = 5, // helpful for decoupling with click events
				dragStart, dragMove, dragEnd, progress;

			progress = function( moveX ) {
				return moveX / self.val.viewportW();
			};

			dragStart = function( moveX, startX ) {
				// console.log( 'start', moveX, startX );
			};

			dragMove = function( moveX ) {
				// console.log('move');
				if( self.state.running ) return;

				// Don't need to check for existance here

				if( moveX < -buffor ) {

					if( !nextBuild ) {
						self.state.moveForward = true;
						self.timeline.build();
						nextBuild = true;
						prevBuild = false;
						self.unsetTimer();
					} else {
						// turn progress into positive val
						self.timeline.progress( -progress( moveX ) );
					}
					dragging = true;
				} else if( moveX > buffor ) {

					if( !prevBuild ) {
						self.state.moveForward = false;
						self.timeline.build();
						prevBuild = true;
						nextBuild = false;
						self.unsetTimer();
					} else {
						self.timeline.progress( progress( moveX ) );
					}
					dragging = true;
				}
			};

			dragEnd = function( moveX ) {
				if( dragging ) {
					var prog = progress( moveX ),
						absProg = prog < 0 ? -prog : prog;

					if( absProg > 0.1 ) {
						self.timeline.play( absProg );
						self.setActive( self.nextId( prog < 0 ? 1 : -1 ) );
						if( self.config.fluidHeight ) { self.setHeight( self.nextId( prog < 0 ? 1 : -1 ) ); }
					} else {
						self.timeline.reverse( absProg );
						// eventually move this to reverse callbacks	
						if(prog < 0) {
							self.updateId( -1 );
						} else {
							self.updateId( 1 );
						}
					}

					prevBuild = false;
					nextBuild = false;
					dragging = false;
					if( self.config.autoplay ) { self.setTimer( false ); }
				}
			};

			this.drag( $container, dragStart, dragMove, dragEnd );
		},


		drag : function( $el, startFn, moveFn, stopFn ) {

		    var touchX, touchY, movX, movY, go, evt,
		   		prevent, start, move, stop;

		    prevent = function( e ) {
		        e.preventDefault();
		    };

		    start = function( e ) {
		        // $el.on("touchmove", prevent);
		        $el.on("mousemove", prevent);
		        $el.on("touchmove", move);
		        $el.on("mousemove", move);

		        evt = (e.type === 'touchstart') ? e.originalEvent.touches[0] : e;
		        touchX = evt.pageX;

		        if(typeof startFn === 'function') {
		        	startFn(movX, touchX);
		        }
		    };

		    move = function( e ) {
		        evt = (e.type === 'touchmove') ? e.originalEvent.touches[0] : e;
		        movX = evt.pageX - touchX;

	        	if(typeof moveFn === 'function') {
		        	moveFn(movX);
		        }
		    };

		    stop = function( e ) {
		        // $el.off("touchmove", prevent);
		        $el.off("mousemove", prevent);
		        $el.off("touchmove", move);
		        $el.off("mousemove", move);

		    	if(typeof stopFn === 'function') {
		        	stopFn(movX);
		        }
		    };

		    $el.on("touchstart", start);
		    $el.on("mousedown", start);
		    $el.on("touchend", stop);
		    $el.on("touchleave", stop);
		    $el.on("touchcancel", stop);
		    $el.on("mouseup", stop);
		    $el.on("mouseleave", stop);
		},


		dynamicVal : function() {
			var $window = $( window ),
				update, 
				getViewportW, viewportW;

			update = function() {
 				viewportW = $window.width();
			};

			getViewportW = function() {
				return viewportW;
			};

			update();
			$window.on( 'load', update );
			$window.on( 'resize', update );

			return {
				viewportW : getViewportW
			};
		}
	};



	// 
	// Set of default animations
	// 
	// /////////////////////////////////////////////////////////

	MK.ui.Slider.prototype.animation = {

        slide : {
        	axis : 'X', 
            next : { transform: {} },
            active : { transform: {} },
            prev : { transform: {} }
        },

        vertical_slide : {
        	axis : 'Y',
            next : { transform: {} },
            active : { transform: {} },
            prev : { transform: {} }
        },

        perspective_flip : {
        	axis : 'Y',
            next : { 
            	transform: {
            		rotateX : 80
            	} 
            },
            active : { 
            	transform: {
            		rotateX : 0
            	} 
            },
            prev : { 
            	transform: {
            		rotateX : 0
            	} 
            }
        },

        zoom : {
			axis : 'Z',
            next: {
                opacity	: 0,
                transform : {
	                scale : 0.9
	            }
            },
            active: {
                opacity	: 1,
                transform : {
	                scale : 1
	            }
            },
            prev: {
                opacity	: 0,
                transform : {
	                scale : 1.1
	            }
            }
        },

        fade : {
			axis : 'Z',
            next: {
                opacity	: 0,
                transform : {}
            },
            active: {
                opacity	: 1,
                transform : {}
            },
            prev: {
                opacity	: 0,
                transform : {}
            }
        },

        kenburned : {
			axis : 'Z',
            next: {
                opacity	: 0,
                transform : {}
            },
            active: {
                opacity	: 1,
                transform : {}
            },
            prev: {
                opacity	: 0,
                transform : {}
            }
        },

        zoom_out : {
			axis : 'Z',
            next: {
				zIndex : '+',
                opacity	: 1,
                transform : {
	                translateY : 100,
	                scale : 1
	            }
            },
            active: {
                opacity	: 1,
                transform : {
	                translateY : 0,
	                scale : 1
	            }
            },
            prev: {
				zIndex : '+',
                opacity	: 0,
                transform : {
	                translateY : 0,
	                scale : 0.5
	            }
            }
        },

        // Problem with Z-Flow
        horizontal_curtain : {
			axis : 'Z',
            next: {
				zIndex : '+',
                transform : {
	                translateX : 100,
	            }
            },
            active: {
                transform : {
	                translateX : 0,
	            }
            },
            prev: {
				zIndex : '+',
                transform : {
	                translateX : -70,
	            }
            }
        },

		roulete : {
			axis : 'X',
            next: {
                opacity	: 0.5,
                transform : {
	                scale : 0.5,
	                rotate : 10,
	                translateY : 20
	            }
            },
            active: {
                opacity	: 1,
                transform : {
	                scale : 1,
	                rotate : 0,
	                translateY : 0
	            }
            },
            prev: {
                opacity	: 0.3,
                transform : {
	                scale : 0.5,
	                rotate : -10,
	                translateY : 20
	            }
            }
		}
	};



	// 
	// Penner's easing library
	// 
	// /////////////////////////////////////////////////////////

	MK.ui.Slider.prototype.ease = {
		/*
		 *
		 * TERMS OF USE - EASING EQUATIONS
		 * 
		 * Open source under the BSD License. 
		 * 
		 * Copyright Â© 2001 Robert Penner
		 * All rights reserved.
		 * 
		 * Redistribution and use in source and binary forms, with or without modification, 
		 * are permitted provided that the following conditions are met:
		 * 
		 * Redistributions of source code must retain the above copyright notice, this list of 
		 * conditions and the following disclaimer.
		 * Redistributions in binary form must reproduce the above copyright notice, this list 
		 * of conditions and the following disclaimer in the documentation and/or other materials 
		 * provided with the distribution.
		 * 
		 * Neither the name of the author nor the names of contributors may be used to endorse 
		 * or promote products derived from this software without specific prior written permission.
		 * 
		 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY 
		 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
		 * MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
		 * COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
		 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE
		 * GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED 
		 * AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
		 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED 
		 * OF THE POSSIBILITY OF SUCH DAMAGE. 
		 *
		 */
		linearEase : function(currentIteration, startValue, changeInValue, totalIterations) {
			return changeInValue * currentIteration / totalIterations + startValue;
		},

		easeInQuad : function(currentIteration, startValue, changeInValue, totalIterations) {
			return changeInValue * (currentIteration /= totalIterations) * currentIteration + startValue;
		},

		easeOutQuad : function(currentIteration, startValue, changeInValue, totalIterations) {
			return -changeInValue * (currentIteration /= totalIterations) * (currentIteration - 2) + startValue;
		},

		easeInOutQuad : function(currentIteration, startValue, changeInValue, totalIterations) {
			if ((currentIteration /= totalIterations / 2) < 1) {
				return changeInValue / 2 * currentIteration * currentIteration + startValue;
			}
			return -changeInValue / 2 * ((--currentIteration) * (currentIteration - 2) - 1) + startValue;
		},

		easeInCubic : function(currentIteration, startValue, changeInValue, totalIterations) {
			return changeInValue * Math.pow(currentIteration / totalIterations, 3) + startValue;
		},

		easeOutCubic : function(currentIteration, startValue, changeInValue, totalIterations) {
			return changeInValue * (Math.pow(currentIteration / totalIterations - 1, 3) + 1) + startValue;
		},

		easeInOutCubic : function(currentIteration, startValue, changeInValue, totalIterations) {
			if ((currentIteration /= totalIterations / 2) < 1) {
				return changeInValue / 2 * Math.pow(currentIteration, 3) + startValue;
			}
			return changeInValue / 2 * (Math.pow(currentIteration - 2, 3) + 2) + startValue;
		},

		easeInQuart : function(currentIteration, startValue, changeInValue, totalIterations) {
			return changeInValue * Math.pow (currentIteration / totalIterations, 4) + startValue;
		},

		easeOutQuart : function(currentIteration, startValue, changeInValue, totalIterations) {
			return -changeInValue * (Math.pow(currentIteration / totalIterations - 1, 4) - 1) + startValue;
		},

		easeInOutQuart : function(currentIteration, startValue, changeInValue, totalIterations) {
			if ((currentIteration /= totalIterations / 2) < 1) {
				return changeInValue / 2 * Math.pow(currentIteration, 4) + startValue;
			}
			return -changeInValue/2 * (Math.pow(currentIteration - 2, 4) - 2) + startValue;
		},

		easeInQuint : function(currentIteration, startValue, changeInValue, totalIterations) {
			return changeInValue * Math.pow (currentIteration / totalIterations, 5) + startValue;
		},

		easeOutQuint : function(currentIteration, startValue, changeInValue, totalIterations) {
			return changeInValue * (Math.pow(currentIteration / totalIterations - 1, 5) + 1) + startValue;
		},

		easeInOutQuint : function(currentIteration, startValue, changeInValue, totalIterations) {
			if ((currentIteration /= totalIterations / 2) < 1) {
				return changeInValue / 2 * Math.pow(currentIteration, 5) + startValue;
			}
			return changeInValue / 2 * (Math.pow(currentIteration - 2, 5) + 2) + startValue;
		},

		easeInSine : function(currentIteration, startValue, changeInValue, totalIterations) {
			return changeInValue * (1 - Math.cos(currentIteration / totalIterations * (Math.PI / 2))) + startValue;
		},

		easeOutSine : function(currentIteration, startValue, changeInValue, totalIterations) {
			return changeInValue * Math.sin(currentIteration / totalIterations * (Math.PI / 2)) + startValue;
		},

		easeInOutSine : function(currentIteration, startValue, changeInValue, totalIterations) {
			return changeInValue / 2 * (1 - Math.cos(Math.PI * currentIteration / totalIterations)) + startValue;
		},

		easeInExpo : function(currentIteration, startValue, changeInValue, totalIterations) {
			return changeInValue * Math.pow(2, 10 * (currentIteration / totalIterations - 1)) + startValue;
		},

		easeOutExpo : function(currentIteration, startValue, changeInValue, totalIterations) {
			return changeInValue * (-Math.pow(2, -10 * currentIteration / totalIterations) + 1) + startValue;
		},

		easeInOutExpo : function(currentIteration, startValue, changeInValue, totalIterations) {
			if ((currentIteration /= totalIterations / 2) < 1) {
				return changeInValue / 2 * Math.pow(2, 10 * (currentIteration - 1)) + startValue;
			}
			return changeInValue / 2 * (-Math.pow(2, -10 * --currentIteration) + 2) + startValue;
		},

		easeInCirc : function(currentIteration, startValue, changeInValue, totalIterations) {
			return changeInValue * (1 - Math.sqrt(1 - (currentIteration /= totalIterations) * currentIteration)) + startValue;
		},

		easeOutCirc : function(currentIteration, startValue, changeInValue, totalIterations) {
			return changeInValue * Math.sqrt(1 - (currentIteration = currentIteration / totalIterations - 1) * currentIteration) + startValue;
		},

		easeInOutCirc : function(currentIteration, startValue, changeInValue, totalIterations) {
			if ((currentIteration /= totalIterations / 2) < 1) {
				return changeInValue / 2 * (1 - Math.sqrt(1 - currentIteration * currentIteration)) + startValue;
			}
			return changeInValue / 2 * (Math.sqrt(1 - (currentIteration -= 2) * currentIteration) + 1) + startValue;
		}
	};

})(jQuery);
(function( $ ) {
	'use strict';

	var utils = MK.utils;
	var val   = MK.val;

	/**
	 * Keep track of top Level sections so we can easly skip to next one.
	 * We must be explicit about DOM level to nested sections.
	 * The list of sections is static. If you'd need to refreh it on ajax etc do it with pub/sub (not really needed now).
	 * We keep track for the same sections in Footer for mutating window location with '!loading' to prevent native anchor behaviour.
	 */
	var $topLevelSections = $('#theme-page > .vc_row, #theme-page > .mk-main-wrapper-holder, #theme-page > .mk-page-section');

	$( document ).on( 'click', '.mk-skip-to-next', function() {
		var $this = $( this ),
			/**
			 * Static height of button + the space to the bottom of the container.
			 *
			 * @TODO Possible to calculate dynamically.
			 */
			btnHeight = $this.hasClass( 'edge-skip-slider' ) ? 150 : 76,
			offset = $this.offset().top + btnHeight,
			nextOffset = utils.nextHigherVal( utils.offsets( $topLevelSections ), [offset] );

		utils.scrollTo( nextOffset - val.offsetHeaderHeight( nextOffset ) );
	});

})( jQuery );

/* Social Share */
/* -------------------------------------------------------------------- */
(function($) {
    'use strict';

    MK.component.SocialShare = function( el ) {
        var networks = {
			twitter : 'http://twitter.com/intent/tweet?text={title}&url={url}',
			pinterest : 'http://pinterest.com/pin/create/button/?url={url}&media={image}&description={title}',
			facebook : 'https://www.facebook.com/sharer/sharer.php?u={url}',
			googleplus : 'https://plus.google.com/share?url={url}',
			linkedin : 'http://www.linkedin.com/shareArticle?mini=true&url={url}&title={title}&summary={desc}',
			digg : 'http://digg.com/submit?url={url}&title={title}',
			reddit : 'http://reddit.com/submit?url={url}&title={title}',
        };

        this.networks = networks;
        this.el = el;
    };


	MK.component.SocialShare.prototype = {

        init : function() {
            this.cacheElements();
            this.bindEvents();
        },

        cacheElements : function() {
            this.$this  = $( this.el );


        },

        bindEvents : function() {
			var thisObject = this;
			var tempClass = "";
			$.each(this.networks, function( key, value ) {
				  thisObject.$tempClass = $('.' + key + '-share');
				  thisObject.$tempClass.click(thisObject.openSharingDialog.bind(self, this, key));

			});
        },

        openSharingDialog : function(url, site, args) {
			var urlWrapper = url;
			var rx = new RegExp('\{[a-z]*\}','g'), res;
			var match = rx.exec(url);
			while (match != null) {
				var pureAttr = match[0].replace("{", "").replace("}" , "");
				var attValue = $(args.currentTarget).attr('data-' + pureAttr);
				if (attValue === undefined || attValue === null) {
					attValue = "";
				}
				attValue = attValue.replace('#', '%23'); // fix for twitter description
				urlWrapper = urlWrapper.replace(match, attValue);
				match = rx.exec(url);
			}

			window.open(urlWrapper, site + "Window", "height=320,width=660,resizable=0,toolbar=0,menubar=0,status=0,location=0,scrollbars=0");

        },


    };


	//////////////////////////////////////////
    //
    // Apply to:
    //
    // ///////////////////////////////////////

    var $body = $('body');

    if(!$body.length) return;

    $body.each(function() {
        var socialShare = new MK.component.SocialShare(this);
			socialShare.init();
    });

})(jQuery);



//function mk_social_share() {
//
//  "use strict";
//
//  $('.twitter-share').on('click', function () {
//    var $url = $(this).attr('data-url'),
//      $title = $(this).attr('data-title');
//
//    window.open('http://twitter.com/intent/tweet?text=' + $title + ' ' + $url, "twitterWindow", "height=380,width=660,resizable=0,toolbar=0,menubar=0,status=0,location=0,scrollbars=0");
//    return false;
//  });
//
//  $('.pinterest-share').on('click', function () {
//    var $url = $(this).attr('data-url'),
//      $title = $(this).attr('data-title'),
//      $image = $(this).attr('data-image');
//    window.open('http://pinterest.com/pin/create/button/?url=' + $url + '&media=' + $image + '&description=' + $title, "twitterWindow", "height=320,width=660,resizable=0,toolbar=0,menubar=0,status=0,location=0,scrollbars=0");
//    return false;
//  });
//
//  $('.facebook-share').on('click', function () {
//    var $url = $(this).attr('data-url');
//    window.open('https://www.facebook.com/sharer/sharer.php?u=' + $url, "facebookWindow", "height=380,width=660,resizable=0,toolbar=0,menubar=0,status=0,location=0,scrollbars=0");
//    return false;
//  });
//
//  $('.googleplus-share').on('click', function () {
//    var $url = $(this).attr('data-url');
//    window.open('https://plus.google.com/share?url=' + $url, "googlePlusWindow", "height=380,width=660,resizable=0,toolbar=0,menubar=0,status=0,location=0,scrollbars=0");
//    return false;
//  });
//
//  $('.linkedin-share').on('click', function () {
//    var $url = $(this).attr('data-url'),
//      $title = $(this).attr('data-title'),
//      $desc = $(this).attr('data-desc');
//    window.open('http://www.linkedin.com/shareArticle?mini=true&url=' + $url + '&title=' + $title + '&summary=' + $desc, "linkedInWindow", "height=380,width=660,resizable=0,toolbar=0,menubar=0,status=0,location=0,scrollbars=0");
//    return false;
//  });
//}




(function($) {
  'use strict';

  $(document).on('click', function(e) {
    $('.mk-toggle-trigger').removeClass('mk-toggle-active');
  });

  function toggle(e) {
      e.preventDefault();
      e.stopPropagation();
      var $this = $(e.currentTarget);

      if (!$this.hasClass('mk-toggle-active')) {

        $('.mk-box-to-trigger').fadeOut(200);
        $this.parent().find('.mk-box-to-trigger').fadeIn(250);
        $('.mk-toggle-trigger').removeClass('mk-toggle-active');
        $this.addClass('mk-toggle-active');

      } else {

        $('.mk-box-to-trigger').fadeOut(200);
        $this.removeClass('mk-toggle-active');

      }
  }

  function assignToggle() {
    // wait for ajax response propagation and insertion
    setTimeout(function() {
      $('.mk-toggle-trigger').off('click', toggle);
      $('.mk-toggle-trigger').on('click', toggle);
    }, 100);
  }

  assignToggle();
  MK.utils.eventManager.subscribe('ajaxLoaded', assignToggle);
  MK.utils.eventManager.subscribe('ajax-preview', assignToggle);

  $(window).on('vc_reload', function(){
    assignToggle();
    MK.utils.eventManager.subscribe('ajaxLoaded', assignToggle);
    MK.utils.eventManager.subscribe('ajax-preview', assignToggle);
  });

}(jQuery));
(function($) {
	'use strict';

	MK.component.Sortable = function(el) {
		this.el = el; 
	};

	MK.component.Sortable.prototype = {
		init: function init() {
			this.cacheElements();
			this.bindEvents();
		},

		cacheElements: function cacheElements() {
			this.unique = Date.now();
			this.$filter = $(this.el);
			this.config = this.$filter.data('sortable-config');

			this.ajaxLoader = new MK.utils.ajaxLoader(this.config.container);
			this.ajaxLoader.init();

			this.$container = $( this.config.container );
			this.$navItems = this.$filter.find('a');
			this.$filterItems = this.$container.find(this.config.item);
		},

		bindEvents: function bindEvents() {
			this.$navItems.on('click', this.handleClick.bind(this));
			MK.utils.eventManager.subscribe('ajaxLoaded', this.onLoad.bind(this));
		},

		handleClick: function handleClick(e) {
			e.preventDefault();

			var $item = $(e.currentTarget);
			var term = $item.data('filter');

			this.$navItems.removeClass('current');
			$item.addClass('current');

			if(this.config.mode === 'ajax') this.inDB(term, $item);
	        else this.inPage(term);
		},

		inDB: function inDB(term, $item) { 
			// Add load indicator only for long requests
			MK.ui.loader.remove(this.$filter);
			MK.ui.loader.add($item);
			
			// If mk-ajax-loaded-posts span exists and one of the filter is clicked,
			// clear post ids
			if ( this.$container.siblings('.mk-ajax-loaded-posts').length ) {		
				this.$container.siblings('.mk-ajax-loaded-posts').attr('data-loop-loaded-posts', '');
			}

			this.ajaxLoader.setData({
				paged: 1,
				term: term
			});
            this.ajaxLoader.load(this.unique);
		},

		inPage: function inPage(term) {
			var $filterItems = this.$container.find(this.config.item);
			$filterItems.removeClass('is-hidden'); // show all first
			// Replace all ', ' with ', .'. It's used to add '.' as class selector of each category.
			var className = term.replace( /, /g, ", ." );
			if(term !== '*') $filterItems.not( '.' + className ).addClass('is-hidden'); // hide filtered
			MK.utils.eventManager.publish('staticFilter');
		},

		onLoad: function onLoad(e, response) {
			if(this.config.mode === 'static') {
				this.$navItems.removeClass('current').first().addClass('current');
			}
			if( typeof response !== 'undefined' &&  response.id === this.config.container) {
				MK.ui.loader.remove(this.$filter);
				if(response.unique === this.unique) {
		            this.$container.html(response.content);
					this.ajaxLoader.setData({paged: 1});
				}
			}
		}
	};

})(jQuery);
(function($) {
    'use strict';

    MK.component.Tabs = function( el ) {
        var defaults = {
            activeClass : 'is-active'
        };

        this.config = defaults;
        this.el = el;
    };

    MK.component.Tabs.prototype = {

        init : function() {
            this.cacheElements();
            this.bindEvents();
        },

        cacheElements : function() {
            this.$this  = $( this.el );
            this.$tabs  = this.$this.find( '.mk-tabs-tab' );
            this.$panes = this.$this.find( '.mk-tabs-pane' );
            this.currentId = 0;
        },

        bindEvents : function() {
            var self = this;

            this.$tabs.on( 'click', this.switchPane.bind( this ) );
        },

        switchPane : function( evt ) {
            evt.preventDefault();

            var clickedId = $( evt.currentTarget ).index();

            this.hide( this.currentId );
            this.show( clickedId );

            // Update current id
            this.currentId = clickedId;

            // Notify rest of the app
            MK.utils.eventManager.publish('item-expanded');            
        },

        show : function( id ) {
            this.$tabs.eq( id ).addClass( this.config.activeClass );
            this.$panes.eq( id ).addClass( this.config.activeClass );
        },

        hide : function( id ) {
            this.$tabs.eq( id ).removeClass( this.config.activeClass );
            this.$panes.eq( id ).removeClass( this.config.activeClass );
        }
    };

})(jQuery);


/* Tabs */
/* -------------------------------------------------------------------- */

function mk_tabs() {

  // "use strict";

  // if ($.exists('.mk-tabs, .mk-news-tab, .mk-woo-tabs')) {
  //   $(".mk-tabs, .mk-news-tab, .mk-woo-tabs").tabs();

  //    $('.mk-tabs').on('click', function () {
  //      $('.mk-theme-loop').isotope('layout');
  //    });

  //   $('.mk-tabs.vertical-style').each(function () {
  //     $(this).find('.mk-tabs-pane').css('minHeight', $(this).find('.mk-tabs-tabs').height() - 1);
  //   });

  // }
}

function mk_tabs_responsive(){
  // $('.mk-tabs, .mk-news-tab').each(function () {
  //   $this = $(this);
  //   if ($this.hasClass('mobile-true')) {
  //     if (window.matchMedia('(max-width: 767px)').matches)
  //     {
  //         $this.tabs("destroy");
  //     } else {
  //       $this.tabs();
  //     }
  //   }
  // });
  
}


(function($) {
	'use strict';

	var $iframes = $('iframe');

	$iframes.each(function() {
		var $iframe = $(this);
		var parent = $iframe.parent().get(0);
		var tagName = parent.tagName;

		if(tagName === 'P') $iframe.wrap('<div class="mk-video-container"></div>');
	});

}(jQuery));
(function( $ ) {
    'use strict';
    if( MK.utils.isMobile() ) {
        $('.mk-animate-element').removeClass('mk-animate-element');
        return;
    }
    var init = function init() {
        var $rootLevelEls = $('.js-master-row, .widget');
        $rootLevelEls.each( spyViewport );
        $rootLevelEls.each( function rootLevelEl() {
            var $animateEl = $(this).find( '.mk-animate-element' );
            $animateEl.each( spyViewport );
            /**
             * Firefox has known issue where horizontal scrollbar will appear if an
             * element uses animation CSS. The solution should be set the element
             * position as fixed or overflow-x as hidden. Position fixed is not possible
             * to use because it's only cause other big problems. The best way is
             * set overflow-x as hidden in the page content container #theme-page.
             *
             * NOTE: The problem is spotted on Right To Left viewport only. So, it's
             *       limited to '.right-to-left' selector only for now to avoid other
             *       problems. Please extend the functionallity if it's happen in
             *       other viewport animation effect.
             */
            var browserName  = MK.utils.browser.name;
            if ( browserName === 'Firefox' ) {
                var $rightToLeft = $( this ).find( '.right-to-left' );
                if ( $rightToLeft.length > 0 ) {
                    $( '#theme-page' ).css( 'overflow-x', 'hidden' );
                }
            }
        });
    };
    var spyViewport = function spyViewport(i) {
        var self = this;
        MK.utils.scrollSpy( this, {
            position  : 'bottom',
            threshold : 200,
            after     : function() {
                animate.call(self, i);
            }
        });
    };
    var animate = function animate(i) {
        var $this = $(this);
        setTimeout(function() {
            $this.addClass( 'mk-in-viewport' );
        }, 100 * i);
    };
    $(window).on('load vc_reload', init);
}(jQuery));

function product_loop_add_cart() {
    var $body = $('body');
    $body.on('click', '.add_to_cart_button', function() {
        var icon = '<svg class="mk-svg-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M437.011 74.99c-46.326-46.328-110.318-74.99-181.011-74.99-109.744 0-203.345 69.064-239.749 166.094l59.938 22.477c27.302-72.773 97.503-124.571 179.811-124.571 53.02 0 101.01 21.5 135.753 56.247l-71.753 71.753h192v-192l-74.989 74.99zm-181.011 373.01c-53.02 0-101.013-21.496-135.756-56.244l71.756-71.756h-192v192l74.997-74.997c46.323 46.331 110.309 74.997 181.003 74.997 109.745 0 203.346-69.064 239.75-166.094l-59.938-22.477c-27.302 72.773-97.503 124.571-179.812 124.571z"/></svg>';
        var $holder = $(this).parents('.product:eq(0)');
        var $i = $holder.find('.product-loading-icon');
        $holder.addClass('adding-to-cart').removeClass('added-to-cart');
        $i.html(icon);
    });
    $body.bind('added_to_cart', function() {
        var icon = '<svg class="mk-svg-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M432 64l-240 240-112-112-80 80 192 192 320-320z"/></svg>';
        var $holder = $('.adding-to-cart');
        var $i = $holder.find('.product-loading-icon');
        $holder.removeClass('adding-to-cart').addClass('added-to-cart');
        $i.html(icon);
    });
}
(function($) {
    'use strict';

    /**
     * Entry point of application. Runs all components
     */
    $( window ).on( 'load', function() {
        MK.core.initAll( document );
        MK.utils.scrollToURLHash();
        // TODO move preloader to components and manage it state from within
        setTimeout( function() { 
            MK.ui.preloader.hide(); // site wide 
            $('.mk-preloader').hide(); // components
            $('body').removeClass('loading');
        }, 150 ); 
    });

    /**
     * VC frontend editor. Init all components.
     */
    $( window ).on( 'vc_reload', function() {
        setTimeout(function(){ 
            MK.core.initAll( document ); 
        }, 100);
    });

    /**
     * Assign global click handlers
     */
    $( document ).on( 'click', '.js-smooth-scroll, .js-main-nav a', smoothScrollToAnchor);
    $( '.side_dashboard_menu a' ).on( 'click', smoothScrollToAnchor);

    function smoothScrollToAnchor( evt ) {
        var anchor = MK.utils.detectAnchor( this );
        var $this = $(evt.currentTarget);
        var loc = window.location;
        var currentPage = loc.origin + loc.pathname;
        var href = $this.attr( 'href' );
        var linkSplit = (href) ? href.split( '#' ) : '';
        var hrefPage  = linkSplit[0] ? linkSplit[0] : ''; 
        var hrefHash  = linkSplit[1] ? linkSplit[1] : '';

        if( anchor.length ) {
            if(hrefPage === currentPage || hrefPage === '') evt.preventDefault();
            MK.utils.scrollToAnchor( anchor );

        } else if( $this.attr( 'href' ) === '#' ) {
            evt.preventDefault();
        }
    }
    
}(jQuery));})(jQuery);
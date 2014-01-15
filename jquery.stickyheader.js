/*!
 * jquery.stickyheader.js
 * version: 1.0.0
 * author: @aekendall
 * license: MIT
 * https://github.com/aekendall/sticky-header.js
 */
;(function ($, window, document, undefined) {
    'use strict';

    var defaults = {
        stickyClass:        'sticky',
        containerClass:     'sticky-container',
        anchorClass:        'sticky-anchor',
        placeholderClass:   'sticky-placeholder',
        activeClass:        'sticky-active',
        activeBottomClass:  'sticky-active-bottom',
        inactiveClass:      'sticky-inactive'
    };

    $.fn.stickyHeader = function (options) {
        options = $.extend({}, defaults, options);

        this.find('.' + options.stickyClass).each(function () {
            var sticky = new Sticky($(this), options);
            waitList.add(sticky);
            allStickyList.add(sticky);
        });

        $(window).scroll(onScroll);
        $(window).resize(onScroll);
        $(document).on('touchmove', onScroll);

        onScroll();
        setTimeout(onScroll, 50);
    };

    function Sticky($elem, options) {
        this._$elem = $elem;
        this._options = options;
        var $c = this._$c = $elem.closest('.' + options.containerClass);
        if (!$c.length) {
            $c = $('body');
        }

        // Don't make any modifications to the container
        //$c.css({
        //    position: 'relative',   // make it a container for fixed positioning
        //    overflow: 'auto'        // disables margin collapsing
        //});

        var $p = this._$p = function() {
            return $elem.clone()
                .removeClass(options.stickyClass)
                .addClass(options.placeholderClass)
                .insertBefore($elem)
                .css({ visibility: 'hidden' })
                .hide();
        }();

        this._$a = function() {
            return $('<div></div>')
                .addClass(options.anchorClass)
                .insertBefore($p);
        }();

        this._calcBottom = function() {
            return $c.offset().top + $c.outerHeight();
        };
    }

    Sticky.prototype = {
        element: function() { return this._$elem; },
        options: function() { return this._options; },
        height: function() { return this._$elem.outerHeight(true); },
        hidePlaceholder: function() { this._$p.hide(); },
        showPlaceholder: function() { this._$p.show(); },
        anchorTop: function() { return this._$a.offset().top; },
        containerBottom: function() { return this._$c.offset().top + this._$c.outerHeight(true); },
        placeholderBounds: function() {
            var off = this._$p.offset();
            return {
                left: off.left,
                top: off.top,
                width: this._$p.outerWidth(true),
                height: this._$p.outerHeight(true)
            };
        },
        isTopSticky: function(scrollTop, topOffset, bottomHeight) {
            return (scrollTop + topOffset >= this.anchorTop() && scrollTop + topOffset + this.height() < this._calcBottom() - bottomHeight);
        },
        isBottomSticky: function(scrollTop, topOffset, bottomHeight) {
            var cb = this._calcBottom();
            return (scrollTop + topOffset + this.height() >= cb - bottomHeight && scrollTop < cb);
        },
        isBottomVisible: function(scrollTop, topOffset) {
            return (scrollTop + topOffset < this._calcBottom());
        }
    };

    function StickyList() {
        var list = this._list = [];
        list.contains = function(sticky) {
            return this.indexOf(sticky) !== -1;
        };
        list.remove = function(sticky) {
            var idx = this.indexOf(sticky);
            if (idx !== -1) {
                this.splice(idx, 1);
            }
        };
        list.sortByAnchorTop = function() {
            this.sort(function(sticky1, sticky2) {
                return sticky1.anchorTop() > sticky2.anchorTop() ? 1 : -1;
            });
        };
    }

    StickyList.prototype = {
        constructor: StickyList,
        _applyStyles: function() {
            for (var i=0; i<this._list.length; i++) {
                this.applyStyle(this._list[i]);
            }
        },
        applyStyle: function(sticky) { throw new Error("sticky-header.js: applyStyle not implemented") },
        add: function(sticky) {
            if (!this._list.contains(sticky)) {
                this._list.push(sticky);
                this._list.sortByAnchorTop();
                this._applyStyles();
            }
        },
        remove: function(sticky) {
            this._list.remove(sticky);
            this._list.sortByAnchorTop();
            this._applyStyles();
        },
        index: function(i) {
            if (i < 0 || i >= this._list.length) {
                throw new Error("sticky-header.js: index out of bounds: '" + i + "'");
            }
            return this._list[i];
        },
        getLength: function() { return this._list.length; },
        toArray: function() { return this._list.slice(0); }
    };

    var topList = new StickyList();
    $.extend(topList, {
        getTopOffset: function(sticky) {
            var total = 0;
            for (var i=0; i<this.getLength(); i++) {
                if (this.index(i) === sticky) {
                    return total;
                }
                total += this.index(i).height();
            }
            return total;
        },
        applyStyle: function(sticky) {
            sticky.showPlaceholder();
            var bounds = sticky.placeholderBounds();
            sticky.element()
                .css({
                    'position': 'fixed',
                    'top': this.getTopOffset(sticky),
                    'bottom': 'auto',
                    'left': bounds.left,
                    'right': '',
                    'width': bounds.width,
                    'z-index': 500
                })
                .addClass(sticky.options().activeClass)
                .removeClass(sticky.options().inactiveClass)
        }
    });

    var bottomList = new StickyList();
    $.extend(bottomList, {
        getBottomHeight: function(sticky) {
            var total = 0;
            for (var i=0; i<this.getLength(); i++) {
                if (this.index(i) !== sticky) {
                    total += this.index(i).height();
                }
            }
            return total;
        },
        getBottomOffset: function(sticky) {
            var total = 0;
            for (var i=this.getLength()-1; i>=0; i--) {
                if (this.index(i) === sticky) {
                    return total;
                } else {
                    total += this.index(i).height();
                }
            }
            return total;
        },
        applyStyle: function(sticky) {
            sticky.showPlaceholder();
            var bounds = sticky.placeholderBounds();
            sticky.element()
                .css({
                    'position': 'absolute',
                    'left': bounds.left,
                    'right': 0,
                    'width': '',
                    'z-index': 200
                })
                // The top needs to be set after the other CSS properties are updated in order to properly calculate the updated container bottom
                .css('top', sticky.containerBottom() - bounds.height - this.getBottomOffset(sticky))
                .addClass(sticky.options().activeClass)
                .removeClass(sticky.options().inactiveClass)
            ;
        }
    });

    var waitList = new StickyList();
    $.extend(waitList, {
        applyStyle: function(sticky) {
            sticky.element()
                .css({
                    'position': 'static',
                    'top': '',
                    'bottom': '',
                    'left': '',
                    'right': '',
                    'width': '',
                    'z-index': ''
                })
                .removeClass(sticky.options().activeClass)
                .addClass(sticky.options().inactiveClass)
            ;
            sticky.hidePlaceholder();
        }
    });

    var allStickyList = new StickyList();
    $.extend(allStickyList, {
        removeActiveBottomClass: function() {
            var len = this.getLength();
            for (var i=0; i<len; i++) {
                var sticky = this.index(i);
                sticky.element().removeClass(sticky.options().activeBottomClass);
            }
        },
        applyStyle: function(sticky) { /* nothing to do */ }
    });

    var findLastSticky = function(scrollTop) {
        for (var i=bottomList.getLength()-1; i>=0; i--) {
            var sticky = bottomList.index(i);
            var topOffset = topList.getTopOffset(sticky);
            if (sticky.isBottomVisible(scrollTop, topOffset)) {
                return sticky;
            }
        }
        if (topList.getLength() > 0) {
            return topList.index(topList.getLength() - 1);
        }
        return false;
    };

    var onScroll = function() {
        var sticky, topOffset, bottomHeight, i,
            sTop = $(window).scrollTop(),
            topArray = topList.toArray(),
            bottomArray, waitArray, lastSticky;
        for (i=0; i<topArray.length; i++) {
            sticky = topArray[i];
            topOffset = topList.getTopOffset(sticky);
            bottomHeight = bottomList.getBottomHeight(sticky);

            if (sticky.isBottomSticky(sTop, topOffset, bottomHeight)) {
                topList.remove(sticky);
                bottomList.add(sticky);

            } else if (!sticky.isTopSticky(sTop, topOffset, bottomHeight)) {
                topList.remove(sticky);
                waitList.add(sticky);

            } else {
                topList.applyStyle(sticky);
            }
        }

        bottomArray = bottomList.toArray();
        for (i=bottomArray.length-1; i>=0; i--) {
            sticky = bottomArray[i];
            topOffset = topList.getTopOffset(sticky);
            bottomHeight = bottomList.getBottomHeight(sticky);

            if (sticky.isTopSticky(sTop, topOffset, bottomHeight)) {
                bottomList.remove(sticky);
                topList.add(sticky);

            } else if (!sticky.isBottomSticky(sTop, topOffset, bottomHeight)) {
                bottomList.remove(sticky);
                waitList.add(sticky);

            } else {
                bottomList.applyStyle(sticky);
            }
        }

        waitArray = waitList.toArray();
        for (i=0; i<waitArray.length; i++) {
            sticky = waitArray[i];
            topOffset = topList.getTopOffset(sticky);
            bottomHeight = bottomList.getBottomHeight(sticky);

            if (sticky.isTopSticky(sTop, topOffset, bottomHeight)) {
                waitList.remove(sticky);
                topList.add(sticky);

            } else if (sticky.isBottomSticky(sTop, topOffset, bottomHeight)) {
                waitList.remove(sticky);
                bottomList.add(sticky);

            } else {
                waitList.applyStyle(sticky);
            }
        }

        allStickyList.removeActiveBottomClass();
        lastSticky = findLastSticky(sTop);

        if (lastSticky) {
            lastSticky.element().addClass(lastSticky.options().activeBottomClass);
        }
    };

})(jQuery, window, document);

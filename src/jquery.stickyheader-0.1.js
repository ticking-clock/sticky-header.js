/*!
 * jquery.stickyheader-0.1.js
 * author: @aekendall
 * license: MIT
 * https://github.com/aekendall/sticky-header.js
 */
;(function ($, window, document, undefined) {
    'use strict';
    
    var defaults = {
        containerSelector: '.sticky-container',
        anchorClass: 'sticky-anchor',
        placeholderClass: 'sticky-placeholder',
        activeClass: 'sticky-active',
        activeBottomClass: 'sticky-active-bottom',
        inactiveClass: 'sticky-inactive'
    };
    
    $.fn.stickyHeader = function (options) {
        options = $.extend({}, defaults, options);
        
        this.each(function () {
            var sticky = Sticky($(this), options);
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
        var $c = $elem.closest(options.containerSelector),
            stickyTag = $elem.prop('tagName');
        
        if (!$c.length) {
            $c = $('body');
        }
        $c.css({ position: 'relative' });
        var $p = function() {
            return $('<div />')
                .addClass(options.placeholderClass)
                .insertBefore($elem)
                .css({ visibility: 'hidden' })
                .hide();
        }();
        
        var $a = function() {
            return $('<div />')
                .addClass(options.anchorClass)
                .insertBefore($p);
        }();
        
        var cBottom = function() {
            return $c.offset().top + $c.outerHeight();
        };
        
        var updatePlaceholder = function() {
            $p.css({
                'height': $elem.outerHeight(true)
            });
        };
        
        return {
            element: function() {
                return $elem;
            },
            options: function() {
                return options;
            },
            height: function() {
                return $elem.outerHeight(true);
            },
            hidePlaceholder: function() {
                $p.hide();
            },
            showPlaceholder: function() {
                updatePlaceholder();
                $p.show();
            },
            placeholderBounds: function() {
                var off = $p.offset();
                return {
                    left: off.left,
                    top: off.top,
                    width: $p.outerWidth()
                };
            },
            anchorTop: function() {
                return $a.offset().top;
            },
            isTopSticky: function(scrollTop, topOffset, bottomHeight) {
                return (scrollTop + topOffset >= this.anchorTop() && scrollTop + topOffset + this.height() < cBottom() - bottomHeight);
            },
            isBottomSticky: function(scrollTop, topOffset, bottomHeight) {
                var cb = cBottom();
                return (scrollTop + topOffset + this.height() >= cb - bottomHeight && scrollTop < cb);
            },
            isBottomVisible: function(scrollTop, topOffset, bottomHeight) {
                return (scrollTop + topOffset < cBottom());
            }
        };
    };
    
    function StickyList() {
        var list = [];
        list.contains = function(sticky) {
            return (list.indexOf(sticky) !== -1);
        };
        list.remove = function(sticky) {
            var idx = list.indexOf(sticky);
            if (idx !== -1) {
                list.splice(idx, 1);
            }
        };
        list.sortByAnchorTop = function() {
            list.sort(function(sticky1, sticky2) {
                return (sticky1.anchorTop() > sticky2.anchorTop());
            });
        };
        
        return {
            add: function(sticky) {
                if (!list.contains(sticky)) {
                    list.push(sticky);
                    list.sortByAnchorTop();
                    
                    if (this.applyStyle) {
                        for (var i=0; i<list.length; i++) {
                            this.applyStyle(list[i]);   // pure virtual
                        }
                    }
                }
            },
            remove: function(sticky) {
                list.remove(sticky);
                list.sortByAnchorTop();
            },
            index: function(i) {
                if (i < 0 || i >= list.length) {
                    throw new Error("sticky-header.js: index out of bounds: '" + i + "'");
                }
                return list[i];
            },
            length: function() {
                return list.length;
            },
            toArray: function() {
                return list.slice(0);
            }
        };
    };

    var topList = function() {
        var list = StickyList();
        list.getTopOffset = function(sticky) {
            var total = 0;
            for (var i=0; i<list.length(); i++) {
                if (list.index(i) === sticky) {
                    return total;
                }
                total += list.index(i).height();
            }
            return total;
        };
        list.applyStyle = function(sticky) {
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
                .removeClass(sticky.options().removeClass)
            ;
        };
        return list;
    }();
    
    var bottomList = function() {
        var list = StickyList();
        list.getBottomHeight = function(sticky) {
            var total = 0;
            for (var i=0; i<list.length(); i++) {
                if (list.index(i) !== sticky) {
                    total += list.index(i).height();
                }
            }
            return total;
        };
        list.getBottomOffset = function(sticky) {
            var total = 0;
            for (var i=list.length()-1; i>=0; i--) {
                if (list.index(i) === sticky) {
                    return total;
                } else {
                    total += list.index(i).height();
                }
            }
            return total;
        };
        list.applyStyle = function(sticky) {
            sticky.showPlaceholder();
            var bounds = sticky.placeholderBounds();
            sticky.element()
                .css({
                    'position': 'absolute',
                    'top': 'auto',
                    'bottom': this.getBottomOffset(sticky),
                    'left': 0,
                    'right': 0,
                    'width': '',
                    'z-index': 200
                })
                .addClass(sticky.options().activeClass)
                .removeClass(sticky.options().inactiveClass)
            ;
        };
        return list;
    }();
    
    var waitList = function() {
        var list = StickyList();
        list.applyStyle = function(sticky) {
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
        };
        return list;
    }();
    
    var allStickyList = function() {
        var list = StickyList();
        list.removeActiveBottomClass = function() {
            for (var i=0; i<list.length(); i++) {
                var sticky = list.index(i);
                sticky.element().removeClass(sticky.options().activeBottomClass);
            }
        }
        return list;
    }();
    
    var findLastSticky = function(scrollTop) {
        for (var i=bottomList.length()-1; i>=0; i--) {
            var sticky = bottomList.index(i);
            var topOffset = topList.getTopOffset(sticky);
            var bottomHeight = bottomList.getBottomHeight(sticky);
            if (sticky.isBottomVisible(scrollTop, topOffset, bottomHeight)) {
                return sticky;
            }
        }
        if (topList.length() > 0) {
            return topList.index(topList.length() - 1);
        }
        return false;
    };
    
    var onScroll = function() {
        var sTop = $(window).scrollTop();
        
        var topArray = topList.toArray();
        for (var i=0; i<topArray.length; i++) {
            var sticky = topArray[i];
            var topOffset = topList.getTopOffset(sticky);
            var bottomHeight = bottomList.getBottomHeight();
            
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
        
        var bottomArray = bottomList.toArray();
        for (var i=bottomArray.length-1; i>=0; i--) {
            var sticky = bottomArray[i];
            var topOffset = topList.getTopOffset(sticky);
            var bottomHeight = bottomList.getBottomHeight(sticky);
            
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
        
        var waitArray = waitList.toArray();
        for (var i=0; i<waitArray.length; i++) {
            var sticky = waitArray[i];
            var topOffset = topList.getTopOffset(sticky);
            var bottomHeight = bottomList.getBottomHeight(sticky);
            
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
        
        var lastSticky = findLastSticky(sTop);
        if (lastSticky) {
            lastSticky.element().addClass(lastSticky.options().activeBottomClass);
        }
    };

})(jQuery, window, document);

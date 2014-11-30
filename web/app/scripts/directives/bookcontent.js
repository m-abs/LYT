/*global $ */
'use strict';

angular.module( 'lyt3App' )
  .directive( 'bookcontent', [ '$window', '$log', function( $window, $log ) {
    var _focusEasing = 'easeInOutQuint';
    var _focusDuration = 500;

    // Getter and setter
    var focusEasing = function( ) {
      var easing = 1 <= arguments.length ? Array.prototype.slice.call( arguments, 0 ) : [];
      if ( easing.length > 0 ) {
        _focusEasing = easing[0];
      }

      return _focusEasing;
    };

    // Getter and setter
    var focusDuration = function( ) {
      var duration = 1 <= arguments.length ? Array.prototype.slice.call( arguments, 0 ) : [];
      if ( duration.length > 0 ) {
        _focusDuration = duration[0];
      }

      return _focusDuration;
    };

    // Return how much vertical space that is available
    var vspace = function( ) {
      var result = $window.height( );
      $( '#book-content' ).prevAll( ).each( function( i, e ) {
        result -= $( e ).height( );
      } );

      return result;
    };

    // Given an image and an area of the image, return how the image
    // should be translated in cordinates relative to its containing view.
    //  New width and height is returned as well.
    // The object returned contains css attributes that will do the translation.
    // FIXME: This function shouldn't depend on the image having a parent.
    var translate = function( image, area, view ) {
      if ( !view ) {
        view = image.parent( );
      }

      var scale = Math.max( 1, view.width( ) / area.width, vspace( ) / area.height );

      // FIXME: resizing div to fit content in case div is too large
      var centering = area.width * scale < view.width( ) ? ( view.width( ) - area.width * scale ) / 2 : 0;
      return {
        width: Math.floor( image[0].naturalWidth * scale ),
        height: Math.floor( image[0].naturalHeight * scale ),
        top: Math.floor( -area.tl.y * scale ),
        left: Math.floor( centering - area.tl.x * scale )
      };
    };

    // Move straight to focus area without any effects
    var focusImage = function( image, area ) {
      var nextFocus = translate( image, area );
      if ( !image.data( 'LYT-focus' ) ) {
        translate( image, wholeImageArea( image ) );
      }

      image.data( 'LYT-focus', nextFocus );
      image.css( nextFocus );
    };

    // Move to focus area with effects specified in focusDuration( ) and focusEasing( )
    var panZoomImage = function( segment, image, area, renderDelta ) {
      var timeScale = Math.min( 1, renderDelta / 1000 );
      var nextFocus = translate( image, area );
      if ( !image.data( 'LYT-focus' ) ) {
        translate( image, wholeImageArea( image ) );
      }

      image.stop( true );

      return image.animate( nextFocus, timeScale * focusDuration( ), focusEasing( ), function( ) {
        image.data( 'LYT-focus', nextFocus );
        if ( area.height / area.width > 2 && area.height > vspace( ) * 2 ) {
          var panArea = angular.copy( area );
          panArea.height = area.width;
          return image.animate( translate( image, panArea ), timeScale * focusDuration( ), focusEasing( ), function( ) {
            panArea.tl.y = area.height - panArea.height;
            image.animate( translate( image, panArea ), ( segment.end - segment.start ) * 1000 - 2 * focusDuration( ), 'linear' );
          } );
        }
      } );
    };

    // Return area object that will focus on the entire image
    // TODO: This method is not cross browser and needs to be rewritten
    var wholeImageArea = function( image ) {
      return {
        width: image[0].naturalWidth,
        height: image[0].naturalHeight,
        tl: {
          x: 0,
          y: 0
        },
        br: {
          x: image[0].naturalWidth,
          y: image[0].naturalHeight
        }
      };
    };

    var scaleArea = function( scale, area ) {
      return {
        width: scale * area.width,
        height: scale * area.height,
        tl: {
          x: scale * area.tl.x,
          y: scale * area.tl.y
        },
        br: {
          x: scale * area.br.x,
          y: scale * area.br.y
        }
      };
    };

    // Resizes the images to fit inside with view.
    // If the image is narrower than the view, the image
    // isn't resized.
    // If the image is wider than the view, it will be
    // resized to the view width
    var scaleImage = function( image, viewHeight, viewWidth ) {
      var imgData = image.data( );
      if ( !imgData ) {
        return;
      }

      if ( imgData.realHeight !== undefined && imgData.realWidth !== undefined && ( imgData.lastViewHeight !== viewHeight || imgData.lastViewWidth !== viewWidth ) ) {
        var imgHeight = imgData.realHeight;
        var imgWidth = imgData.realWidth;
        if ( imgHeight && imgWidth ) {
          var ratio = imgHeight / imgWidth;
          if ( imgWidth <= viewWidth ) {
            image.css( {
              width: imgWidth,
              height: imgHeight
            } );
          } else {
            image.css( {
              width: viewWidth,
              height: viewWidth * ratio
            } );
          }
        }

        image.data( {
          lastViewHeight: viewHeight,
          lastViewWidth: viewWidth
        } );
      }
    };

    var isVisible = function( image, margin, viewHeight ) {
      // view has position relative, so the position
      // of the image is relative to the visible area
      // of the view. negative values are above and values
      // larger than viewheight is below

      // this function returns:
      // -1, if the image isn't visible and is above the visible area
      //  0, if within the visible area
      //  1, if below the visible area
      var top = image.position( ).top;
      var bottom = top + image.height( );
      var res;
      if ( ( top < -margin ) && ( bottom < -margin ) ) {
        res = isVisible.aboveView;
      } else if ( ( ( -margin < top && top < ( viewHeight + margin ) ) ) || ( ( -margin < bottom && bottom < ( viewHeight + margin ) ) ) || ( top < -margin && ( viewHeight + margin ) < bottom ) ) {
        res = isVisible.visible;
      } else {
        res = isVisible.belowView;
      }

      return res;
    };
    isVisible.aboveView = -1;
    isVisible.visible = 0;
    isVisible.belowView = 1;

    // Render cartoon - a cartoon page with one or more focus areas
    var renderCartoon = function( segment, view, renderDelta ) {
      var div = segment.divObj || ( segment.divObj = $( segment.div ) );
      var image = segment.imgObj || ( segment.imgObj = $( segment.image ) );
      if ( view.find( 'img' ).attr( 'src' ) === image.attr( 'src' ) ) {
        // We are already displaying the right image
        image = view.find( 'img' );
      } else {
        // Display new image
        view.css( 'text-align', 'left' );
        image.css( 'position', 'relative' );
        view.empty( ).append( image );
        focusImage( image, wholeImageArea( image ) );
      }

      if ( !view.is( ':visible' ) ) {
        $log.info( 'Render: renderCartoon: while view isn\'t visible' );
        return;
      }

      var left = parseInt( ( div[0].style.left.match( /\d+/ ) )[0], 10 );
      var top  = parseInt( ( div[0].style.top.match( /\d+/ ) )[0], 10 );
      var area = scaleArea( segment.canvasScale, {
        width: div.width( ),
        height: div.height( ),
        tl: {
          x: left,
          y: top
        },
        br: {
          x: left + div.width( ),
          y: top + div.height( )
        }
      } );

      panZoomImage( segment, image, area, renderDelta );
    };

    var prevActive = null;
    var segmentIntoView = function( view, segment ) {
      var el = view.find( '#' + segment.contentId );
      // Is this a word-marked book?
      var isWordMarked = !!view.find( 'span.word' ).length;
      if ( isWordMarked ) {
        // Is wordHighlighting enabled?
        if ( false /* TODO: LYT.settings.get( 'wordHighlighting' ) */ ) {
          // In that case set the required style
          view.addClass( 'is-word-marked' );
        } else {
          // wordHighlighting is disabled, this would disable highlighting completely
          // for this book. Therfor we find the closest p-element and treat it like
          // it's the active element.
          // We assume that the book structure is <p> -> <span id='#{segment.contentId}'>,
          // so we select the closest p parent to the el.
          isWordMarked = false;
          el = el.closest( 'p' );
        }
      }

      if ( !isWordMarked ) {
        // Not a word-marked book, set style to highlight paragraphs
        view.removeClass( 'is-word-marked' );
      }

      // Remove highlighting of previous element
      if ( prevActive ) {
        prevActive.removeClass( 'active' );
      }

      // Highlight element and scroll to element
      if ( el.length ) {
        prevActive = el.addClass( 'active' );
        if ( view.is( ':visible' ) ) {
          view.scrollTo( el, 100, {
            offset: -10
          } );
        } else {
          $log.info( 'Render: segmentIntoView: while view isn\'t visible' );
        }
      }
    };

    var showImage = function( image, viewHeight, viewWidth, margin ) {
      scaleImage( image, viewHeight, viewWidth );

      var src = image.data( 'src' );
      if ( src ) {
        var visibility = isVisible( image, margin, viewHeight );
        if ( visibility === isVisible.visible ) {
          image
            .attr( 'src', src )
            .removeData( 'src' )
            .removeClass( 'loader-icon' );

          if ( !( image.data( 'realHeight' ) && image.data( 'realWidth' ) ) ) {
            image.one( 'load', function( ) {
              if ( this.naturalHeight !== undefined && this.naturalWidth !== undefined ) {
                return image.data( {
                  realHeight: this.naturalHeight,
                  realWidth: this.naturalWidth
                } );
              }
            } );
          }

          return true;
        } else if ( visibility === isVisible.belowView ) {
          // The image is below the correct view, there is no
          // point in continueing this loop, returning false.
          return false;
        }
      }
    };

    // Context viewer - Shows the entire DOM of the content document and
    // scrolls around when appropriate
    var renderContext = function( segment, view ) {
      var scrollHandler;
      var book      = segment.document.book;
      var html      = book.resources[segment.contentUrl].document;
      var source    = html.source[0];
      var isCartoon = html.isCartoon( );
      var contentID = '' + book.id + '/' + segment.contentUrl;
      if ( view.data( 'htmldoc' ) === contentID ) {
        return segmentIntoView( view, segment );
      }

      $log.info( 'Render: Changing context to ' + contentID );
      view.data( 'htmldoc', contentID );

      // Change to new document
      view[0].replaceChild(
        document.importNode( source.body.firstChild, true ),
        view[0].firstChild
      );

      if ( !isCartoon ) {
        var images = view.find( 'img' );
        if ( images.length ) {
          var margin = 200; // TODO Should be configurable
          images.filter( '[height]' ).each( function( ) {
            var image     = $( this );
            var imgWidth  = image.attr( 'width' );
            var imgHeight = image.attr( 'height' );

            if ( imgWidth && imgHeight ) {
              image.data( {
                realHeight: imgHeight,
                realWidth: imgWidth
              } );

              var viewHeight = view.height( );
              var viewWidth = view.width( );
              scaleImage( image, viewHeight, viewWidth );
            }
          } );

          scrollHandler = function( ) {
            if ( !view.is( ':visible' ) ) {
              $log.info( 'Render: Context scroll: View isn\'t visible do nothing' );
              return;
            }

            var height = view.height( );
            var width = view.width( );
            images.each( function( ) {
              return showImage( $( this ), height, width, margin );
            } );
          };

          view.scroll( $.throttle( 150, scrollHandler ) );
        }
      } else {
        view.find( '.page,.page img' ).css( {
          'max-width': '100%',
          'height': 'auto'
        } );
      }

      // TODO: LYT.render.setStyle( );
      segmentIntoView( view, segment );

      if ( angular.isFucntion( scrollHandler ) ) {
        scrollHandler( ); // Show initially visible images
      }

      // Catch links
      view.find( 'a[href]' ).each( function( ) {
        var link = $( this );
        var url = this.getAttribute( 'href' );
        var external = /^https?:\/\//i.test( url );
        if ( external ) {
          link.addClass( 'external' );
        }

        return link.click( function( e ) {
          e.preventDefault( );

          if ( external ) {
            window.open( url, '_blank' ); // Open external URLs
          }
          /*
          } else {
            segment = LYT.player.book.segmentByURL( url );
            segment.finally( ( function( _this ) {
              return function( segment ) {
                return LYT.player.navigate( segment );
              };
            } )( this ) );
            segment.catch( function( ) {} );
          }
          */
        } );
      } );
    };

    var selectView = function( scope, element, type ) {
      var view;
      if ( ['cartoon', 'plain', 'context'].indexOf( -1 ) ) {
        scope.bookContentViewType = type;
        view = element.children( '#book-' + type + '-content' );
      }

      return view;
    };

    var renderText = function( scope, element, text ) {
      selectView( scope, element, 'plain' );
      scope.plainText = text;
    };

    var lastRender;
    var renderSegment = function( scope, element, segment ) {
      var now = (new Date( )) / 1.0;
      var renderDelta = lastRender ? now - lastRender : 0;

      if ( segment ) {
        /* TODO:
        if ( segment.sectionTitle || segment.beginSection ) {
          $( '.player-chapter-title' ).text( segment.sectionTitle || segment.beginSection.title );
        }
        */
        switch ( segment.type ) {
          case 'cartoon': {
            renderCartoon( segment, selectView( scope, element, segment.type ), renderDelta );
            break;
          }
          default: {
            requestAnimationFrame( function( ) {
              renderContext( segment, selectView( scope, element, 'context' ), renderDelta );
            } );
          }
        }
      } else {
        selectView( scope, element, null ); // Clears the content area
      }

      lastRender = now;
    };

    return {
      templateURL: 'views/bookcontent.html',
      restrict: 'E',
      link: function( scope, element ) {
        scope.$on( 'play-end', function( ) {
          renderText( scope, element, 'The end of the book' );
        } );

        scope.watch( 'BookService.currentSegment', function( segment ) {
          renderSegment( scope, element, segment );
        } );
      }
    };
  } ] );

/*global jQuery: false, $: false */
'use strict';

angular.module( 'lyt3App' )
  .factory( 'TextContentDocument', [ 'DtbDocument',
    function( DtbDocument ) {
      // Private method for resolving URLs
      var resolveURLs = function( source, localUri, resources, isCartoon ) {
        // Resolve images
        return source.find( '*[data-src]' )
          .each( function( index, item ) {
            item = jQuery( item );
            if ( item.data( 'resolved' ) ) {
              return;
            }

            var url = item.attr( 'data-src' ).replace( /^\//, '' );

            // We need to add the relative base of the ncc
            const imageLocalUri = URI(url).absoluteTo(localUri).toString();
            const newUrl = resources[imageLocalUri] ? resources[imageLocalUri].url : null;

            item.data( 'resolved', 'yes' );
            if ( isCartoon ) {
              item.attr( 'src', newUrl.url );
              return item.removeAttr( 'data-src' );
            } else {
              item.attr( 'data-src', newUrl.url );
              return item.addClass( 'loader-icon' );
            }
          } );
      };

      // Private method for checking if a book is a cartoon.
      // A cartoon is a TextContentDocument there all pages have a single image.
      var isCartoon = function( source ) {
        var pages = source.find( '.page' ).toArray( );
        return pages.length !== 0 && pages.every( function( page ) {
          return $( page )
            .children( 'img' )
            .length === 1;
        } );
      };

      // Public prototype function:
      function TextContentDocument( localUri, resources, callback ) {
        const url = resources[localUri].url;
        DtbDocument.call( this, url, function( ) {
          resolveURLs( this.source, localUri, resources, this.isCartoon( ) );

          if ( typeof callback === 'function' ) {
            return callback( );
          }
        }.bind( this ) );
      }

      TextContentDocument.prototype = Object.create( DtbDocument.prototype );

      TextContentDocument.prototype.isCartoon = function( ) {
        if ( this._isCartoon === undefined ) {
          this._isCartoon = isCartoon( this.source );
        }

        return this._isCartoon;
      };

      return TextContentDocument;
    }
  ] );

/*global jQuery: false */
'use strict';

/**
 * @ngdoc service
 * @name lyt3App.NCCDocument
 * @description
 * # NCCDocument
 * Factory in the lyt3App.
 */
angular.module( 'lyt3App' )
  .factory( 'NCCDocument', [ '$q', 'LYTConfig', 'TextContentDocument', 'Section',
    function( $q, LYTConfig, TextContentDocument, Section ) {
      // ## Privileged

      // Internal helper function to parse the (flat) heading structure of an NCC document
      // into a nested collection of `NCCSection` objects
      var parseStructure = function( xml, book ) {
        /*
         * Collects consecutive heading of the given level or higher in the `collector`.
         * I.e. given a level of 3, it will collect all `H3` elements until it hits an `H1`
         * element. Each higher level (i.e. `H4`) heading encountered along the way will be
         * collected recursively.
         * Returns the number of headings collected.
         * FIXME: Doesn't take changes in level with more than one into account, e.g. from h1 to h3.
         */
        var getConsecutive = function( headings, level, collector ) {
          var index = 0;
          // Loop through the `headings` array
          while ( headings.length > index ) {
            var heading = headings[ index ];
            if ( heading.tagName.toLowerCase( ) !== ( 'h' + level ) ) {
              // Return the current index if the heading isn't the given level
              return index;
            }

            // Create a section object
            var section = new Section( heading, book );
            section.parent = level - 1;
            // Collect all higher-level headings into that section's `children` array,
            // and increment the `index` accordingly
            index += getConsecutive( headings.slice( index + 1 ), level +
              1, section.children );
            // Add the section to the collector array
            collector.push( section );
            index++;
          }

          // If the loop ran to the end of the `headings` array, return the array's length
          return headings.length;
        };

        // TODO: See if we can remove this, since all sections are being addressed
        // using URLs
        var numberSections = function( sections, prefix ) {
          if ( !sections ) {
            return;
          }

          if ( !prefix ) {
            prefix = '';
          }

          if ( prefix ) {
            prefix = '' + prefix + '.';
          }

          sections.forEach( function( section, index ) {
            var number = '' + prefix + ( index + 1 );
            section.id = number;
            numberSections( section.children, number );
          } );
        };

        var markMetaSections = function( sections ) {
          var metaSectionList = LYTConfig.nccDocument.metaSections || {};

          var isBlacklisted = function( section ) {
            return Object.keys(metaSectionList)
              .some( function( value ) {
                var type = metaSectionList[value];
                return section[ type ] === value;
              } );
          };

          sections.forEach( function( section ) {
            if ( isBlacklisted( section ) ) {
              section.metaContent = true;
            }

            if ( section.children.length ) {
              markMetaSections( section.children );
            }
          } );
        };

        var structure = [ ];

        // Find all headings as a plain array
        var headings = jQuery.makeArray( xml.find( ':header' ) );
        if ( headings.length === 0 ) {
          return [ ];
        }

        // Find the level of the first heading (should be level 1)
        var level = parseInt( headings[ 0 ].tagName.slice( 1 ), 10 );

        // Get all consecutive headings of that level
        getConsecutive( headings, level, structure );

        // Mark all meta sections so we don't play them per default
        markMetaSections( structure );

        // Number sections
        numberSections( structure );
        return structure;
      };

      var flattenStructure = function( structure ) {
        var flat = [ ];

        structure.forEach( function( section ) {
          flat.push( section );
          flat = flat.concat( flattenStructure( section.children ) );
        } );

        return flat;
      };

      // Initializes previous and next attributes on section objects
      var linkSections = function( sections ) {
        var previous;
        sections.forEach( function( section ) {
          section.previous = previous;
          if ( previous ) {
            previous.next = section;
          }

          previous = section;
        } );
      };

      /*
       * This class models a Daisy Navigation Control Center document
       * FIXME: Don't carry the @sections array around. @structure should be used.
       *        At the same time, the flattenStructure procedure can be replaced by
       *        an extension of the getConsecutive procedure that does the linking
       *        handled by flattenStructure followed by linkSections.
       */
      function NCCDocument( localUri, book ) {
        this.getSectionByURL = this.getSectionByURL.bind( this );
        TextContentDocument.call( this, localUri, book.resources, function( ) {
          this.structure = parseStructure( this.source, book );
          this.sections = flattenStructure( this.structure );
          this.localUri = localUri;
          linkSections( this.sections );

          return this.sections.map( function( section ) {
            section.nccDocument = this;
            return section;
          }, this );
        }.bind( this ) );
      }

      NCCDocument.prototype = Object.create( TextContentDocument.prototype );

      /*
       * The section getters below returns promises that wait for the section
       * resources to load.

       * Helper function for section getters
       * Return a promise that ensures that resources for both this object
       * and the section are loaded.
       */
      var getSection = function( nccdocument, getter ) {
        var deferred = $q.defer( );
        nccdocument.promise
          .catch( function( ) {
            return deferred.reject( );
          } )
          .then( function( document ) {
            var section = getter( document.sections );
            if ( section ) {
              section.load( )
                .promise
                  .then( function( ) {
                    deferred.resolve( section );
                  } )
                  .catch( function( ) {
                    deferred.reject( );
                  } );
            } else {
              deferred.reject( );
            }
          } );

        return deferred.promise;
      };

      NCCDocument.prototype.firstSection = function( ) {
        return getSection( this, function( sections ) {
          return sections[ 0 ];
        } );
      };

      NCCDocument.prototype.getSectionByURL = function( url ) {
        var baseUrl = url.split( '#' )[ 0 ];
        return getSection( this, function( sections ) {
          var res;
          sections.some( function( section ) {
            if ( section.url === baseUrl ) {
              res = section;
              return true;
            }
          } );

          return res;
        } );
      };

      NCCDocument.prototype.getSectionIndexById = function( id ) {
        var res;
        this.sections.some( function( section, idx ) {
          if ( section.id === id ) {
            res = idx;
            return true;
          }
        } );

        return res;
      };

      return NCCDocument;

    }
  ] );

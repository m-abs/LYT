'use strict';

describe( 'Directive: bookcontent', function( ) {

  // load the directive's module
  beforeEach( module( 'lyt3App' ) );

  var element,
    scope;

  beforeEach( inject( function( $rootScope ) {
    scope = $rootScope.$new( );
  } ) );

  xit( 'should make hidden element visible', inject( function( $compile ) {
    element = angular.element( '<bookcontent></bookcontent>' );
    element = $compile( element )( scope );
    expect( element.text( ) ).toBe( 'this is the bookcontent directive' );
  } ) );
} );

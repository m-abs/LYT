'use strict';

describe( 'Service: LYTSession', function( ) {

  // load the service's module
  beforeEach( module( 'lyt3App' ) );

  // instantiate service
  var LYTSession;
  beforeEach( inject( function( _LYTSession_ ) {
    LYTSession = _LYTSession_;
    LYTSession.clear( );
  } ) );

  it( 'credentials', function( ) {
    var data = {
      username: 'guest',
      password: 'guest'
    };

    LYTSession.setCredentials( data.username, data.password );

    expect(LYTSession.getCredentials()).toEqual(data);
  } );

} );

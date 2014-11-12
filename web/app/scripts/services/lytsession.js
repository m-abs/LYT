/*global getNotaAuthToken: false */
'use strict';

angular.module('lyt3App')
  .factory('LYTSession', ['localStorageService', function (localStorageService) {
    var credentials, memberInfo;
    var LYTSession = {
      init: function() {
        if (typeof getNotaAuthToken !== 'undefined' && getNotaAuthToken !== null) {
          credentials = getNotaAuthToken();
          if (credentials.status === 'ok') {
            // log.message('Session: init: reading credentials from getNotaAuthToken()');
            return LYTSession.setCredentials(credentials.username, credentials.token);
          }
        } else {
          // log.warn('Session: init: getNotaAuthToken is undefined');
        }
      },
      getCredentials: function() {
        return localStorageService.get('session|credentials');
      },
      setCredentials: function(username, password) {
        if ( !credentials ) {
          credentials = {};
        }
        credentials.username = username;
        credentials.password = password;

        localStorageService.set('session|credentials', credentials);
      },
      getInfo: function() {
        if ( !memberInfo ) {
          memberInfo = localStorageService.get('session|memberinfo') || {};
        }

        return memberInfo;
      },
      setInfo: function(info) {
        memberInfo = angular.extend( memberInfo || {}, info );
        localStorageService.set('session|memberinfo', memberInfo);
      },
      getMemberId: function() {
        return LYTSession.getInfo().memberId || undefined;
      },
      clear: function() {
        credentials = null;
        memberInfo = null;

        localStorageService.remove('session|credentials');
        localStorageService.remove('session|memberinfo');
      }
    };

    return LYTSession;
  }]);

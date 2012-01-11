# Requires `/common`  
# Requires `/models/member/session`  

# -------------------

# This module handles searching and search-suggestions

# --------

# ## Constants

window.SEARCH_GENERAL_ERROR = {}

# --------

# Define the `LYT.catalog` object
LYT.catalog = do ->
  
  autocompleteCache = {}
  
  # Sorting options for the server-side function
  SORTING_OPTIONS =
    "new":        1 # default
    "lastmonth":  2
    "last3month": 3
    "thisyear":   4
    "forever":    5
    "author":     6
    "title":      7
    "yearasc":    8
    "yeardesc":   9
    "series":     10
  
  # Fields to be searched by the server-side function
  FIELD_OPTIONS =
    "freetext": 0 # all fields (default)
    "author":   1
    "title":    2
    "keywords": 3
    "speaker":  4
    "teaser":   5
    "series":   6
  
  # Internal helper to build the AJAX options.  
  # Takes to 2 arguments: The URL to call, and
  # and the data (as an object) to send
  getAjaxOptions = (url, data) ->
    dataType:    "json"
    type:        "POST"
    contentType: "application/json; charset=utf-8"
    data:        JSON.stringify data
    url:         url
  
  
  # Perform a "full" search. Takes the search term as its
  # only argument, and returns a deferred object.  
  # The deferred object will resolve with an array of search
  # result objects (or an empty array, if there are no results).  
  # In case of an error, the deferred will be rejected with the
  # `SEARCH_GENERAL_ERROR` constant, the response status, and
  # the error thrown
  search = (term, page = 1, params = {}, pageSize = null) ->
    
    # AJAX success handler
    success = (data, status, jqHXR) ->
      results = data.d or []
      item.id = item.itemid for item in results
      
      # TODO: Temporary "solution", until the server response gets
      # updated with a "number of pages" or "next page available"
      # value
      results.currentPage = page
      if results.length >= (LYT.config.catalog.search.pageSize or 10)
        results.loadNextPage = -> search term, page+1, params, pageSize
      else
        results.loadNextPage = null
      
      deferred.resolve results
    
    
    # AJAX error handler
    error = (jqXHR, status, error) ->
      if status is 404
        # HTTP 404 could mean "no results", so handle that here
        deferred.resolve []
      else
        # An error ocurred
        deferred.reject SEARCH_GENERAL_ERROR, status, error
    
    
    # Get the search params
    data =
      term: term
      options:
        pagesize: pageSize or LYT.config.catalog.search.pageSize or 10
        pagenbr:  page
    
    jQuery.extend data.options, params
    
    # Get the ajax options
    options = getAjaxOptions LYT.config.catalog.search.url, data
    
    # Create the deferred
    deferred = jQuery.Deferred()
    
    # Add the `success` and `error` handlers
    options.success = success
    options.error   = error
    
    # Perform the request
    jQuery.ajax options
    
    # Return the deferred
    deferred
  
  
  # ---------------
  
  # ## Autocomplete functions
  # See jQuery UI's [`.autocomplete()`](http://docs.jquery.com/UI/Autocomplete)  
  #
  # To listen for autocomplete suggestions, add an event listener:
  #
  #     jQuery(LYT.catalog).bind "autocomplete", (event) ->
  #       # results are passed as event.data
  # 
  
  
  # Attach the autocomplete eventhandler to the element passed
  attachAutocomplete = (element) ->
    jQuery(element).autocomplete getAutocompleteOptions()
  
  
  # Returns an options array for the autocomplete function.
  getAutocompleteOptions = ->
    # Clone the autocomplete options from config
    setup = jQuery.extend {}, (LYT.config.catalog.autocomplete.setup or {})
    
    # Add the `source` callback
    setup.source = (request, response) ->
      # Create the AJAX options. Since `request` is a simple object containing
      # a single value, called `term`, the request object can be sent directly
      # to the `getAjaxOptions` helper
      options = getAjaxOptions LYT.config.catalog.autocomplete.url, request
      
      # An internal function to be called when the AJAX call completes
      complete = (results) ->
        # Send the results - empty or not - back to the jQuery
        # UI's autocomplete function (the `response` callback
        # must always be called, regardless of whether the AJAX
        # call succeeded or not)
        response results
        
        # Emit an event with the results attached as `event.results` 
        event = jQuery.Event "autocomplete"
        event.results = results
        #log.message "Search: Emitting autocomplete event"
        jQuery(LYT.catalog).trigger event
      
      if autocompleteCache[request.term]?
        complete autocompleteCache[request.term]
        return
      
      # Perform the request
      jQuery.ajax(options)
        # On success, extract the results
        .done (data) ->
          results = data.d or []
          autocompleteCache[request.term] = results
          complete results
        # On fail, just call `complete` (i.e. fail silently)
        .fail -> complete []
    
    # Return the setup object
    setup
  
  # Get book suggestions
  getSuggestions = ->
    deferred = jQuery.Deferred()
    
    data = memberid: String( LYT.session.getMemberId() )
    url  = LYT.config.catalog.suggestions.url
    
    options = getAjaxOptions url, data
    
    # Perform the request
    jQuery.ajax(options)
      # On success, extract the results and pass them on
      .done (data) ->
        results = data.d or []
        item.id = item.itemid for item in results
        
        deferred.resolve results
      
      # On fail, reject the deferred
      .fail ->
        deferred.reject()
    
    deferred
  
  
  getDetails = (bookId) ->
    deferred = jQuery.Deferred()
    
    data = itemid: String( bookId )
    url  = LYT.config.catalog.details.url
    
    options = getAjaxOptions url, data
    
    # Perform the request
    jQuery.ajax(options)
      # On success, extract the results and pass them on
      .done (data) ->
        if not data.d? or data.d.length isnt 1
          deferred.reject()
          return
        
        info = data.d.pop()
        info.id = info.itemid
        
        deferred.resolve info
      
      # On fail, reject the deferred
      .fail ->
        deferred.reject()
    
    deferred
  
  # ## Public API
  
  SORTING_OPTIONS:        SORTING_OPTIONS
  FIELD_OPTIONS:          FIELD_OPTIONS
  search:                 search
  attachAutocomplete:     attachAutocomplete
  getAutocompleteOptions: getAutocompleteOptions
  getSuggestions:         getSuggestions
  getDetails:             getDetails


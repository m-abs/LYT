# Requires `/common`
# Requires `/view/render`

# -------------------

# This module handles rendering of book content
LYT.render.content = do ->

  _focusEasing   = 'easeInOutQuint'
  _focusDuration = 500

  # Getter and setter
  focusEasing = (easing...) ->
    _focusEasing = easing[0] if easing.length > 0
    _focusEasing

  # Getter and setter
  focusDuration = (duration...) ->
    _focusDuration = duration[0] if duration.length > 0
    _focusDuration

  # Return how much vertical space that is available
  vspace = ->
    result = $(window).height()
    $('#book-content').prevAll().each (i, e) ->
      result -= $(e).height()
    return result

  # Return how much horizontal space that is available
  hspace = -> $(window).width()

  # Given an image and an area of the image, return how the image
  # should be translated in cordinates relative to its containing view.
  # New width and height is returned as well.
  # The object returned contains css attributes that will do the translation.
  # FIXME: This function shouldn't depend on the image having a parent.
  translate = (image, area, view) ->
    result = {}
    view or= image.parent()

    scale = 1
    scale = view.width() / area.width if scale > view.width() / area.width
    scale = vspace() / area.height if scale > vspace() / area.height
    # FIXME: resizing div to fit content in case div is too large
    centering = if area.width * scale < view.width() then (view.width() - area.width * scale)/2 else 0

    width:  Math.floor(image[0].naturalWidth * scale)
    height: Math.floor(image[0].naturalHeight * scale)
    top:    Math.floor(-area.tl.y * scale)
    left:   Math.floor(centering - area.tl.x * scale)

  # Move straight to focus area without any effects
  focusImage = (image, area) ->
    nextFocus = translate image, area
    thisFocus = image.data('LYT-focus') or translate image, wholeImageArea image
    image.data 'LYT-focus', nextFocus
    image.css nextFocus

  # Move to focus area with effects specified in focusDuration() and focusEasing()
  panZoomImage = (segment, image, area, renderDelta) ->
    timeScale = if renderDelta > 1000 then 1 else renderDelta / 1000
    nextFocus = translate image, area
    thisFocus = image.data('LYT-focus') or translate image, wholeImageArea image
    image.stop true
    image.animate nextFocus, timeScale*focusDuration(), focusEasing(), () ->
      image.data 'LYT-focus', nextFocus
      if area.height/area.width > 2 and area.height > vspace() * 2
        panArea = jQuery.extend {}, area
        panArea.height = area.width
        image.animate translate(image, panArea), timeScale*focusDuration(), focusEasing(), () ->
          panArea.tl.y = area.height - panArea.height
          image.animate translate(image, panArea), (segment.end - segment.start)*1000 - 2 * focusDuration(), 'linear'

  # Return area object that will focus on the entire image
  # TODO: This method is not cross browser and needs to be rewritten
  wholeImageArea = (image) ->
    width:  image[0].naturalWidth
    height: image[0].naturalHeight
    tl:
      x: 0
      y: 0
    br:
      x: image[0].naturalWidth
      y: image[0].naturalHeight

  scaleArea = (scale, area) ->
    width:  scale * area.width
    height: scale * area.height
    tl:
      x: scale * area.tl.x
      y: scale * area.tl.y
    br:
      x: scale * area.br.x
      y: scale * area.br.y

  # Resizes the images to fit inside with view.
  # If the image is narrower than the view, the image
  # isn't resized.
  # If the image is wider than the view, it will be
  # resized to the view width
  scaleImage = (image, viewHeight, viewWidth) ->
    imgData = image.data()
    return unless imgData
    if imgData.realHeight? and imgData.realWidth? and ( imgData.lastViewHeight isnt viewHeight or imgData.lastViewWidth isnt viewWidth )
      imgHeight = imgData.realHeight
      imgWidth  = imgData.realWidth
      if imgHeight and imgWidth
        ratio = imgHeight / imgWidth
        if imgWidth <= viewWidth
          image.css
            width:  imgWidth
            height: imgHeight
        else
          image.css
            width:  viewWidth
            height: viewWidth * ratio
      image.data
        lastViewHeight: viewHeight
        lastViewWidth:  viewWidth

  isVisible = (image, margin, viewHeight) ->
    # View has position relative, so the position
    # of the image is relative to the visible area
    # of the view. Negative values are above and values
    # larger than viewHeight is below
    #
    # This function returns:
    # -1, if the image isn't visible and is above the visible area
    #  0, if within the visible area
    #  1, if below the visible area
    top = image.position().top
    bottom = top + image.height()

    if (top < -margin) and (bottom < -margin)
      res = isVisible.aboveView
    else if (-margin < top < (viewHeight + margin)) or
        (-margin < bottom < (viewHeight + margin)) or
        (top < -margin and (viewHeight + margin) < bottom)
      res = isVisible.visible
    else
      res = isVisible.belowView

    res

  isVisible.aboveView = -1
  isVisible.visible   = 0
  isVisible.belowView = 1

  # Render cartoon - a cartoon page with one or more focus areas
  renderCartoon = (segment, view, renderDelta) ->
    div   = segment.divObj or= jQuery segment.div
    image = segment.imgObj or= jQuery segment.image

    if view.find('img').attr('src') is image.attr('src')
      # We are already displaying the right image
      image = view.find 'img'
    else
      # Display new image
      view.css 'text-align', 'left'
      image.css 'position', 'relative'
      view.empty().append image
      focusImage image, wholeImageArea image

    unless view.is(':visible')
      log.message "Render: renderCartoon: while view isn't visible"
      return

    left = parseInt (div[0].style.left.match /\d+/)[0]
    top  = parseInt (div[0].style.top.match /\d+/)[0]

    area = scaleArea segment.canvasScale,
      width:  div.width()
      height: div.height()
      tl:
        x: left
        y: top
      br:
        x: left + div.width()
        y: top  + div.height()

    panZoomImage segment, image, area, renderDelta

  prevActive = null
  prevActiveParagraph = null
  segmentIntoView = (view, segment) ->
    el = view.find "##{segment.contentId}"
    isWordMarked = !!view.find( 'span.word' ).length
    # Is this a word-marked book?
    if isWordMarked
      # Is wordHighlighting enabled?
      if LYT.settings.get("wordHighlighting")
        # In that case set the required style
        view.addClass 'is-word-marked'
      else
        # wordHighlighting is disabled, this would disable highlighting completely
        # for this book. Therfor we find the closest p-element and treat it like
        # it's the active element.
        isWordMarked = false

    if not isWordMarked
      # Not a word-marked book, set style to highlight paragraphs
      view.removeClass 'is-word-marked'

    # Remove highlighting of previous element
    prevActive.removeClass "active" if prevActive
    prevActiveParagraph.removeClass "active" if prevActiveParagraph

    # We assume that the book structure is <p> -> <span id="#{segment.contentId}">,
    # so we select the closest p parent to the el.
    unless el.is "p"
      parentParagraph = el.closest "p"

    # Highlight element and scroll to element
    if el.length
      prevActive = el.addClass "active"
      if parentParagraph
        prevActiveParagraph = parentParagraph.addClass "active"

      if view.is ':visible'
        view.scrollTo( el, 100, { offset: -10 } )
      else
        log.message "Render: segmentIntoView: while view isn't visible"

  # Context viewer - Shows the entire DOM of the content document and
  # scrolls around when appropriate
  renderContext = (segment, view, delta) ->
    book = segment.document.book
    html = book.resources[segment.contentUrl.toLowerCase()].document
    source = html.source[0]
    isCartoon = html.isCartoon()

    contentID = "#{book.id}/#{segment.contentUrl}"
    if view.data("htmldoc") is contentID
      segmentIntoView view, segment
    else
      log.message "Render: Changing context to #{contentID}"
      view.data "htmldoc", contentID

      # Change to new document
      view[0].replaceChild(
        document.importNode(source.body.firstChild, true),
        view[0].firstChild
      )

      if not isCartoon
        images = view.find "img"
        if images.length
          margin = 200 # TODO Should be configurable

          images.filter( '[height]' ).each ->
            image = $(this)
            imgWidth = image.attr( 'width' )
            imgHeight = image.attr( 'height' )
            if imgWidth and imgHeight
              image.data
                realHeight: imgHeight
                realWidth: imgWidth

              viewHeight = view.height()
              viewWidth = view.width()

              scaleImage image, viewHeight, viewWidth

          showImage = (image, viewHeight, viewWidth) ->
            scaleImage image, viewHeight, viewWidth
            if (src = image.attr "data-src")
              visibility = isVisible image, margin, viewHeight
              if visibility is isVisible.visible
                image.attr "src", src
                image.removeAttr "data-src"
                image.removeClass "loader-icon"
                unless image.data( 'realHeight' ) and image.data( 'realWidth' )
                  image.one( 'load', ->
                    if @.naturalHeight? and @.naturalWidth?
                      image.data
                        realHeight: @.naturalHeight
                        realWidth: @.naturalWidth
                  )
              else if visibility is isVisible.belowView
                # The image is below the correct view, there is no
                # point in continueing this loop, returning false.
                false

          scrollHandler = ->
            unless view.is ':visible'
              log.message "Render: Context scroll: View isn't visible do nothing"
              return

            height = view.height()
            width = view.width()
            images.each -> showImage $(this), height, width

          view.scroll jQuery.throttle 150, scrollHandler
      else
        view
          .find('.page,.page img')
          .css
            'max-width': '100%'
            'height': 'auto'

      LYT.render.setStyle()
      segmentIntoView view, segment
      scrollHandler() if scrollHandler? # Show initially visible images

      # Catch links
      view.find("a[href]").each ->
        link = $(this)
        url = @getAttribute "href"
        if (external = /^https?:\/\//i.test url)
          link.addClass "external"

        link.click (e) ->
          e.preventDefault()
          if external
            window.open url, "_blank" # Open external URLs
          else
            segment = LYT.player.book.segmentByURL url
            segment.done (segment) =>
              LYT.player.navigate segment
            segment.fail =>
              # Do nothing if it doesn't link to anything in the document

  selectView = (type) ->
    for viewType in ['cartoon', 'plain', 'context']
      view = $("#book-#{viewType}-content")
      if viewType is type
        result = view
      else
        view.hide()
    result?.show()
    return result

  renderText = (text) -> selectView('plain').html text

  lastRender = null
  renderSegment = (segment) ->
    now = new Date()
    renderDelta = now - lastRender if lastRender

    if segment
      if segment.sectionTitle or segment.beginSection
        $('.player-chapter-title').text segment.sectionTitle or segment.beginSection.title

      switch segment.type
        when 'cartoon'
          renderCartoon segment, selectView(segment.type), renderDelta
        else
          requestAnimationFrame ->
            renderContext segment, selectView('context'), renderDelta
    else
      selectView null # Clears the content area

    lastRender = now

# Public API

  renderSegment: renderSegment
  renderText:    renderText
  focusEasing:   focusEasing
  focusDuration: focusDuration

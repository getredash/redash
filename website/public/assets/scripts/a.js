// Segment
!(function () {
  var analytics = (window.analytics = window.analytics || [])
  if (!analytics.initialize)
    if (analytics.invoked)
      window.console &&
        console.error &&
        console.error('Segment snippet included twice.')
    else {
      analytics.invoked = !0
      analytics.methods = [
        'trackSubmit',
        'trackClick',
        'trackLink',
        'trackForm',
        'pageview',
        'identify',
        'reset',
        'group',
        'track',
        'ready',
        'alias',
        'page',
        'once',
        'off',
        'on',
      ]
      analytics.factory = function (t) {
        return function () {
          var e = Array.prototype.slice.call(arguments)
          e.unshift(t)
          analytics.push(e)
          return analytics
        }
      }
      for (var t = 0; t < analytics.methods.length; t++) {
        var e = analytics.methods[t]
        analytics[e] = analytics.factory(e)
      }
      analytics.load = function (t) {
        var e = document.createElement('script')
        e.type = 'text/javascript'
        e.async = !0
        e.src =
          ('https:' === document.location.protocol ? 'https://' : 'http://') +
          'cdn.segment.com/analytics.js/v1/' +
          t +
          '/analytics.min.js'
        var n = document.getElementsByTagName('script')[0]
        n.parentNode.insertBefore(e, n)
      }
      analytics.SNIPPET_VERSION = '3.1.0'
      analytics.load('NPyg08Ubos5mFcpyjOeYqw4GNBM2AMMY')
      analytics.page()
    }
})()

// Intercom
window.intercomSettings = {
  app_id: 'rwp8rrzy',
  hide_default_launcher: true,
}
;(function () {
  var w = window
  var ic = w.Intercom
  if (typeof ic === 'function') {
    ic('reattach_activator')
    ic('update', intercomSettings)
  } else {
    var d = document
    var i = function () {
      i.c(arguments)
    }
    i.q = []
    i.c = function (args) {
      i.q.push(args)
    }
    w.Intercom = i
    function l() {
      var s = d.createElement('script')
      s.type = 'text/javascript'
      s.async = true
      s.src = 'https://widget.intercom.io/widget/rwp8rrzy'
      var x = d.getElementsByTagName('script')[0]
      x.parentNode.insertBefore(s, x)
    }
    if (w.attachEvent) {
      w.attachEvent('onload', l)
    } else {
      w.addEventListener('load', l, false)
    }
  }
})()

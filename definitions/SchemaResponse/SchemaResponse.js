const F = global.framework

F.schemaResponse = ($, data) => {
  if (!$.controller && !$.callback) {
    throw new Error('parameter error! Can not send response')
  }
  if ($.error.hasError(null)) {
    sendError($)
  } else {
    sendData($, data)
  }
}

function sendError ($) {
  if ($.controller) {
    const errData = $.error.output()
    $.controller.status = $.error.status
    $.controller.json(errData)
  } else {
    $.callback($.error, null)
  }
}

function sendData ($, data) {
  if ($.controller) {
    $.controller.json(data)
  } else {
    $.callback(null, data)
  }
}


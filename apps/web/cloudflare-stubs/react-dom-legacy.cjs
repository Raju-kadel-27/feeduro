'use strict';
// Stub: legacy React DOM server APIs are not used in this Worker.
// react-dom/server.edge.js requires this file, but we only use renderToReadableStream.
exports.version = '19.2.5';
exports.renderToString = function () { throw new Error('renderToString is not supported in this Worker'); };
exports.renderToStaticMarkup = function () { throw new Error('renderToStaticMarkup is not supported in this Worker'); };

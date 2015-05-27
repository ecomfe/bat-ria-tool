/**
 * @file 处理edp-webserver的html页面返回
 * @author chestnutchen(mini.chenli@gmail.com)
 */
var mockup = require('./mockup');
var logger = require('./logger');
var qs = require('querystring');
var path2RegExp = require('path-to-regexp');

var page = {};

page.getLocation = function (location) {
    return function (request) {
        // 对于没有location的不处理
        if (!location) {
            return false;
        }

        // 对于referer没有ed参数的请求不处理
        if (!/[?&](?:ed|enable_debug)\b/i.test(request.headers.referer)) {
            return false;
        }

        // 不匹配的不处理
        if (typeof location === 'object' && location.test) {
            return location.test(request.pathname);
        }
        else if (typeof location === 'string') {
            location = path2RegExp(location, [], {sensitive: true});
            return location && location.test(request.pathname);
        }

        return false;
    };
};

function handler(context) {
    context.stop();
    var request = context.request;

    try {
        var reqHandler = mockup.load(request);
        if (!reqHandler) {
            context.status = 404;
            context.start();
            return;
        }
        var query = qs.parse(request.search.slice(1));

        logger.ok('edp', 'OK', 'Mockup page found for `' + request.pathname + '`');

        var timeout = reqHandler.timeout;

        context.header['Content-Type'] = 'text/html;charset=UTF-8';
        context.content = reqHandler.response(request.pathname, query);

        if (timeout) {
            setTimeout(function () {
                context.start();
            }, timeout);
        }
        else {
            context.start();
        }
    }
    catch (e) {
        context.status = 500;
        logger.error('edp', 'ERROR', e.toString());
        context.start();
    }
}

page.getHandler = function () {
    return handler;
};

page.getHandlers = function () {
    return [
        handler,
        proxyNoneExists()
    ];
};

module.exports = exports = page;

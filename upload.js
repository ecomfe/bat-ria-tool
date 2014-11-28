/**
 * @file 处理edp-webserver的upload相关功能
 * @author Justineo(justice360@gmail.com)
 */
var mockup = require('./mockup');
var logger = require('./logger');
var fs = require('fs');
var qs = require('querystring');
var multiparty = require('multiparty');

var upload = {};

upload.getLocation = function () {
    return function (request) {
        // 对于非post请求不处理
        if (!/post/i.test(request.method || '')) {
            return false;
        }

        // 对于referer没有ed参数的请求不处理
        if (!/[?&](?:ed|enable_debug)\b/i.test(request.headers.referer)) {
            return false;
        }

        if (!/^\/data\/.+\/upload(?:$|\?)/.test(request.headers.path)) {
            return false;
        }

        return true;
    };
};

function handler(context, uploadType) {
    context.stop();
    try {
        var request = context.request;
        var mockupHandler = mockup.load(request);

        if (mockupHandler) {
            request.pipe = function (dst) {
                dst.write(request.bodyBuffer);
                dst.end();
            };
            var query = qs.parse(request.search.slice(1));
            var form = new multiparty.Form();
            form.parse(request, function(err, fields, files) {
                if (err) {
                    logger.error('edp', 'ERROR', err.message.toString());
                    context.status = 500;
                    context.start();
                    return;
                }

                var timeout = mockupHandler.timeout;
                var fileInfo = files.filedata[0];
                var tmpDir = 'mockup/.tmp/';

                if (!fs.existsSync(tmpDir)) {
                    fs.mkdirSync(tmpDir);
                }

                fs.writeFileSync(tmpDir + fileInfo.originalFilename, fs.readFileSync(fileInfo.path));
                fs.unlinkSync(fileInfo.path);

                logger.ok('edp', 'OK', 'File `' + fileInfo.originalFilename + '` is saved');
                var res = {
                    url: 'http://' + request.headers.host + '/' + tmpDir + fileInfo.originalFilename,
                    previewUrl: 'http://' + request.headers.host + '/' + tmpDir + fileInfo.originalFilename,
                    fileName: fileInfo.originalFilename,
                    type: fileInfo.originalFilename.split('.').pop()
                };
                var data = mockupHandler.response(request.pathname, {
                    success: 'true',
                    callback: query.callback || fields.callback[0],
                    result: res
                });

                context.content = data;
                context.header['Content-Type'] = 'text/html;charset=UTF-8';
                context.status = 200;

                if (timeout) {
                    setTimeout(function () {
                        context.start();
                    }, timeout);
                }
                else {
                    context.start();
                }
            });
        }
        else {
            logger.error('edp', 'ERROR', 'Mockup data not found for `' + request.pathname + '`');
            context.status = 404;
            context.start();
        }
    }
    catch (e) {
        logger.error('edp', 'ERROR', e.toString());
        context.status = 500;
        context.start();
    }
}

upload.getHandler = function () {
    return handler;
};

upload.getHandlers = function () {
    return [
        handler,
        proxyNoneExists()
    ];
};

module.exports = exports = upload;




















/* vim: set ts=4 sw=4 sts=4 tw=100: */

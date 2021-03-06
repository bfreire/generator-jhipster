'use strict';
var fs = require('fs');
var FILE_EXTENSION = '.original';
try {
    var progressbar = require('progress');
} catch (e) {
    console.log(
        'You don\'t have the AWS SDK installed. Please install it in the JHipster generator directory.\n\n' +
        'WINDOWS\n' +
        'cd %USERPROFILE%\\AppData\\Roaming\\npm\\node_modules\\generator-jhipster\n' +
        'npm install aws-sdk progress node-uuid\n\n' +
        'LINUX / MAC\n' +
        'cd /usr/local/lib/node_modules/generator-jhipster\n' +
        'npm install aws-sdk progress node-uuid'
    );
    process.exit(e.code);
}


var S3 = module.exports = function S3(Aws) {
    this.Aws = Aws;
};

S3.prototype.createBucket = function createBucket(params, callback) {
    var bucket = params.bucket,
        region = this.Aws.config.region;

    var s3 = new this.Aws.S3({
        params: {
            Bucket: bucket,
            CreateBucketConfiguration: {LocationConstraint: region}
        },
        signatureVersion: 'v4'
    });

    s3.headBucket(function (err) {
            if (err && err.statusCode === 404) {
                s3.createBucket(function (err) {
                    if (err) {
                        error(err.message, callback);
                    } else {
                        success('Bucket ' + bucket + ' created successful', callback);
                    }
                });
            } else if (err && err.statusCode === 301) {
                error('Bucket ' + bucket + ' is already in use', callback);
            } else if (err) {
                error(err.message, callback);
            } else {
                success('Bucket ' + bucket + ' already exists', callback);
            }
        }
    )
    ;
};

S3.prototype.uploadWar = function uploadWar(params, callback) {
    var bucket = params.bucket,
        region = this.Aws.config.region;

    findWarFilename(function (err, warFilename) {
        if (err) {
            error(err, callback);
        } else {
            var warKey = warFilename.slice(0, -FILE_EXTENSION.length);

            var s3 = new this.Aws.S3({
                params: {
                    Bucket: bucket,
                    Key: warKey,
                    CreateBucketConfiguration: {LocationConstraint: region}
                },
                signatureVersion: 'v4'
            });

            var filePath = 'target/' + warFilename,
                body = fs.createReadStream(filePath);

            uploadToS3(s3, body, function (err, message) {
                if (err) {
                    error(err.message, callback);
                } else {
                    callback(null, {message: message, warKey: warKey});
                }
            });
        }
    }.bind(this));
};

var findWarFilename = function findWarFilename(callback) {
    var warFilename = '';
    fs.readdir('target/', function (err, files) {
        if (err) {
            error(err, callback);
        }
        files.filter(function (file) {
            return file.substr(-FILE_EXTENSION.length) === FILE_EXTENSION;
        })
            .forEach(function (file) {
                warFilename = file;
            });
        callback(null, warFilename);
    });
};

var uploadToS3 = function uploadToS3(s3, body, callback) {
    var bar;

    s3.waitFor('bucketExists', function (err) {
        if (err) {
            callback(err, null);
        } else {
            s3.upload({Body: body}).
                on('httpUploadProgress', function (evt) {

                    if (bar === undefined && evt.total) {
                        var total = evt.total / 1000000;
                        bar = new progressbar('uploading [:bar] :percent :etas', {
                            complete: '=',
                            incomplete: ' ',
                            width: 20,
                            total: total,
                            clear: true
                        });
                    }

                    var curr = evt.loaded / 1000000;
                    bar.tick(curr - bar.curr);
                }).
                send(function (err) {
                    if (err) {
                        callback(err, null);
                    } else {
                        callback(null, 'War uploaded successful');
                    }
                });
        }
    });
};

var success = function success(message, callback) {
    callback(null, {message: message});
};

var error = function error(message, callback) {
    callback({message: message}, null);
};

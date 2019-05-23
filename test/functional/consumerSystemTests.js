/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

// this object not passed with lambdas, which mocha uses
/* eslint-disable prefer-arrow-callback */

/* eslint-disable global-require */

const fs = require('fs');

const constants = require('./shared/constants.js');
const util = require('./shared/util.js');

const consumerHost = util.getHosts('CONSUMER')[0]; // only expect one
const checkDockerCmd = 'if [[ -e $(which docker) ]]; then echo exists; fi';


function setup() {
    // purpose: consumer tests
    describe(`Consumer host setup - ${consumerHost.ip}`, function () {
        const cAddr = consumerHost.ip;
        const cUsername = consumerHost.username;
        const cPassword = consumerHost.password;

        it('should install docker', function () {
            // install docker - assume it does not exist
            const installCmd = 'curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh';
            return util.performRemoteCmd(cAddr, cUsername, checkDockerCmd, { password: cPassword })
                .then((response) => {
                    if (response.indexOf('exists') !== -1) {
                        return Promise.resolve(); // exists, continue
                    }
                    return util.performRemoteCmd(cAddr, cUsername, installCmd, { password: cPassword });
                });
        });
    });
}

function test() {
    // env var to run only specific consumer type(s) (e.g. 'elast')
    const consumerFilter = process.env[constants.ENV_VARS.CONSUMER_HARNESS.TYPE_REGEX];
    const consumerDir = `${__dirname}/${constants.CONSUMERS_DIR}`;
    let consumers = fs.readdirSync(consumerDir);
    consumers = consumerFilter ? consumers.filter(fName => fName.match(new RegExp(consumerFilter, 'i')) !== null) : consumers;
    describe('Consumer Tests', () => {
        consumers.forEach((consumer) => {
            // load consumers modules
            consumer = require(`${consumerDir}/${consumer}`); //eslint-disable-line
            consumer.setup();
            consumer.test();
            consumer.teardown();
        });
    });
}

function teardown() {
    // purpose: consumer tests
    describe(`Consumer host teardown - ${consumerHost.ip}`, function () {
        const cAddr = consumerHost.ip;
        const cUsername = consumerHost.username;
        const cPassword = consumerHost.password;

        function runRemoteCmd(cmd) {
            return util.performRemoteCmd(cAddr, cUsername, cmd, { password: cPassword });
        }

        let dockerExists = false;

        it('should ensure docker installed', () => runRemoteCmd(checkDockerCmd)
            .then((response) => {
                dockerExists = response.indexOf('exists') !== -1;
            }));

        it('should remove all docker "container"', () => {
            if (dockerExists) {
                return runRemoteCmd('docker ps -a -q')
                    .then((response) => {
                        if (response) {
                            return runRemoteCmd(`docker rm -f ${response}`);
                        }
                        return Promise.resolve();
                    });
            }
            return Promise.resolve();
        });

        it('should remove all docker "image"', () => {
            if (dockerExists) {
                return runRemoteCmd('docker images -q')
                    .then((response) => {
                        if (response) {
                            return runRemoteCmd(`docker rmi -f ${response}`);
                        }
                        return Promise.resolve();
                    });
            }
            return Promise.resolve();
        });

        it('should prune all docker "system"', () => {
            if (dockerExists) {
                return runRemoteCmd('docker system prune -f');
            }
            return Promise.resolve();
        });

        it('should prune all docker "volume"', () => {
            if (dockerExists) {
                return runRemoteCmd('docker volume prune -f');
            }
            return Promise.resolve();
        });
    });
}

module.exports = {
    setup,
    test,
    teardown
};
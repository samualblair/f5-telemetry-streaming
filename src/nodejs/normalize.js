/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const logger = require('./logger.js'); // eslint-disable-line no-unused-vars

/**
 * Normalize data - standardize and reduce complexity
 *
 * @param {Object} data - data to normalize
 *
 * @returns {Object} Promise which is resolved with the normalized data
 */
function normalizeData(data) {
    const nData = data;

    const reduceNested = function (obj) {
        let objRet = {};

        if (obj.nestedStats) {
            objRet = obj.nestedStats;
            return reduceNested(objRet);
        }
        if (obj.entries) {
            Object.keys(obj.entries).forEach((k) => {
                const v = obj.entries[k];

                // child entry keys may look like https://localhost/mgmt/tm/sys/tmm-info/0.0/stats,
                // we should simplify this somewhat
                const kM = k.replace('https://localhost/', '');
                objRet[kM] = v;
            });
            return reduceNested(objRet);
        }
        if (typeof obj === 'object') {
            Object.keys(obj).forEach((k) => {
                const v = obj[k];

                objRet[k] = reduceNested(v);
            });
            return objRet;
        }

        objRet = obj;
        return objRet;
    };

    return reduceNested(nData);
}

module.exports = {
    stats: normalizeData
};

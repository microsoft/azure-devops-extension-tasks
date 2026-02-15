"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.realPromise = exports.allSettled = exports.delay = exports.wait = exports.defer = exports.timeout = void 0;
function timeout(promise, timeoutMs, message) {
    return new Promise((resolve, reject) => {
        const timeoutHandle = setTimeout(() => {
            reject(message == null ? `Timed out after ${timeoutMs} ms.` : message);
        }, timeoutMs);
        // Maybe use finally when it's available.
        promise.then(result => {
            resolve(result);
            clearTimeout(timeoutHandle);
        }, reason => {
            reject(reason);
            clearTimeout(timeoutHandle);
        });
    });
}
exports.timeout = timeout;
function defer() {
    let resolve;
    let reject;
    const promise = new Promise((resolver, rejecter) => {
        resolve = resolver;
        reject = rejecter;
    });
    return {
        resolve,
        reject,
        promise,
    };
}
exports.defer = defer;
async function wait(timeoutMs) {
    return new Promise(resolve => {
        setTimeout(resolve, timeoutMs);
    });
}
exports.wait = wait;
// Return a promise that resolves at least delayMs from now. Rejection happens immediately.
async function delay(promise, delayMs) {
    return (await Promise.all([promise, wait(delayMs)]))[0];
}
exports.delay = delay;
function allSettled(promises) {
    const results = new Array(promises.length);
    return new Promise(resolve => {
        let count = 0;
        for (let i = 0; i < promises.length; ++i) {
            const promise = promises[i];
            promise
                .then(result => {
                results[i] = {
                    state: "fulfilled",
                    value: result,
                };
            }, reason => {
                results[i] = {
                    state: "rejected",
                    reason: reason,
                };
            })
                .then(() => {
                if (++count === promises.length) {
                    resolve(results);
                }
            });
        }
    });
}
exports.allSettled = allSettled;
function realPromise(promise) {
    return new Promise((resolve, reject) => {
        promise.then(resolve, reject);
    });
}
exports.realPromise = realPromise;
//# sourceMappingURL=promiseUtils.js.map
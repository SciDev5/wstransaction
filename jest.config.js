/* eslint-disable no-undef */
module.exports = {
    preset: "ts-jest",
    coverageDirectory: "../coverage",
    testRegex: "\\.test\\.(ts)$",
    transform: {
        "^.+\\.(ts)?$": "ts-jest",
    }
};
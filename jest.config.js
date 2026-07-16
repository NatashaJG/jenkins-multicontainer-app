module.exports = {

    testEnvironment: "node",

    testMatch: [
        "**/tests/**/*.test.js"
    ],

    collectCoverage: true,

    collectCoverageFrom: [
        "src/**/*.js",
        "!src/**/*.test.js",
        "!**/node_modules/**",
        "!**/coverage/**"
    ],

    coverageDirectory: "coverage",

    coverageReporters: [
        "html",
        "lcov",
        "text-summary",
        "cobertura"
    ],

    reporters: [
        "default",
        [
            "jest-junit",
            {
                outputDirectory: "./coverage",
                outputName: "junit.xml"
            }
        ]
    ],

    verbose: true,

    testTimeout: 30000,

    forceExit: true,

    detectOpenHandles: true

};
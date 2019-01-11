module.exports = class ApiError extends Error {
    constructor(msg) {
        super(msg);
        this.msg = msg;
    }
};
const jwt = require("jsonwebtoken");
const responseManager = require("../../utilities/response.manager");
const userModel = require("../../models/User/user.model");
const verifyUser = async (req, res, next) => {
    try {
        const bearerHeader = req.headers["authorization"];
        if (!bearerHeader) return responseManager.unauthorisedRequest(res);

        const token = bearerHeader.split(" ")[1];
        if (!token) return responseManager.unauthorisedRequest(res);

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.WEB_LOGIN_AUTH_SECRET);
        } catch (err) {
            return responseManager.unauthorisedRequest(res);
        }

        const user = await userModel.findById(decoded.userId).lean();
        if (!user) return responseManager.unauthorisedRequest(res);

        // ✅ Token match DB
        if (user.jwt_token !== token) return responseManager.unauthorisedRequest(res);

        req.user = user; // attach user
        next();
    } catch (err) {
        return responseManager.onError(err, res);
    }
};

module.exports = verifyUser;
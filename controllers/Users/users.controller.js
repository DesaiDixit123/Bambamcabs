const { OAuth2Client } = require("google-auth-library");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const AwsCloud = require("../../utilities/aws");
const responseManager = require("../../utilities/response.manager");
const constants = require("../../utilities/constants");
const mongoConnection = require("../../utilities/connections");
const userModel = require("../../models/User/user.model");
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const helper = require("../../utilities/helper");


const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();


exports.registerUserOtp = async (req, res) => {
    try {
        res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
        res.setHeader("Access-Control-Allow-Origin", "*");

        let { full_name, email, phone_no, country, state, city, zip_code } = req.body;

        if (!phone_no || !/^[0-9]{10}$/.test(phone_no)) {
            return responseManager.badrequest({ message: "Invalid phone number" }, res);
        }

        if (!full_name || full_name.trim().length < 3) {
            full_name = ""; // optional
        }

        let profileImageKey = "";
        if (req.files && req.files.profile_image && req.files.profile_image[0]) {
            const file = req.files.profile_image[0];

            if (!["image/jpeg", "image/png", "image/jpg"].includes(file.mimetype)) {
                return responseManager.badrequest({ message: "Profile image must be jpeg/png/jpg" }, res);
            }

            const filesizeinMb = parseFloat(file.size / 1048576);
            if (filesizeinMb > 5) {
                return responseManager.badrequest({ message: "Profile image must be <= 5 MB" }, res);
            }

            const uploadResult = await AwsCloud.saveToS3(
                file.buffer,
                "users",
                file.mimetype,
                "profile_image"
            );
            profileImageKey = uploadResult.data.Key;
        }

        let user = await userModel.findOne({ phone_no });
        if (!user) {
           
            user = await userModel.create({
                full_name,
                email: email ? email.trim().toLowerCase() : "",
                phone_no,
                country: country || "",
                state: state || "",
                city: city || "",
                zip_code: zip_code || "",
                profile_image: profileImageKey ? `${process.env.AWS_BUCKET_URI}/${profileImageKey}` : "",
                user_type: 1, // normal user
                created: Date.now(),
                updated: Date.now()
            });
        } else if (profileImageKey) {
            // Update profile image if user exists
            await userModel.findByIdAndUpdate(user._id, {
                $set: { profile_image: `${process.env.AWS_BUCKET_URI}/${profileImageKey}`, updated: Date.now() },
            });
        }

      
        const otp = generateOtp();
        const otp_expiry = Date.now() + 60 * 1000;

        await userModel.findByIdAndUpdate(user._id, {
            $set: { otp, otp_expiry, updated: Date.now() },
        });


        console.log(`OTP for ${phone_no}: ${otp}`);

        return responseManager.onSuccess("OTP sent successfully", { otp }, res);

    } catch (err) {
        console.error("Register OTP Error:", err);
        return responseManager.onError(err, res);
    }
};

exports.verifyOtpSignup = async (req, res) => {
    try {
        res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
        res.setHeader("Access-Control-Allow-Origin", "*");

        const { phone_no, otp } = req.body;
        if (!phone_no || !otp) {
            return responseManager.badrequest({ message: "Phone number & OTP required" }, res);
        }

        const user = await userModel.findOne({ phone_no });
        if (!user) {
            return responseManager.badrequest({ message: "User not found" }, res);
        }

        if (!user.otp || !user.otp_expiry || Date.now() > user.otp_expiry) {
            return responseManager.badrequest({ message: "OTP expired, please request again" }, res);
        }

        if (user.otp !== otp) {
            return responseManager.badrequest({ message: "Invalid OTP" }, res);
        }

        
        const accesstoken = await helper.generateAccessToken({ userId: user._id.toString() });

       
        await userModel.findByIdAndUpdate(user._id, {
            $set: { jwt_token: accesstoken, otp: null, otp_expiry: null, updated: Date.now() },
        });

        const updatedUser = await userModel.findById(user._id).lean();

        return responseManager.onSuccess(
            "Signup & login successful",
            { accesstoken, userdetails: updatedUser },
            res
        );
    } catch (err) {
        console.error("Verify OTP Signup Error:", err);
        return responseManager.onError(err, res);
    }
};

exports.requestOtp = async (req, res) => {
    try {
        res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
        res.setHeader("Access-Control-Allow-Origin", "*");

        const { phone_no } = req.body;
        if (!phone_no || !/^[0-9]{10}$/.test(phone_no)) {
            return responseManager.badrequest({ message: "Invalid phone number" }, res);
        }

     
        let user = await userModel.findOne({ phone_no });
        if (!user) {
            return responseManager.badrequest({ message: "User not found, please register first" }, res);
        }

        const otp = generateOtp();
        const otp_expiry = Date.now() + 60 * 1000; // 1 minute

        await userModel.findByIdAndUpdate(user._id, {
            $set: { otp, otp_expiry, updated: Date.now() },
        });

      


        return responseManager.onSuccess("OTP sent successfully", { otp }, res);
    } catch (err) {
        console.error("Request OTP Error:", err);
        return responseManager.onError(err, res);
    }

};



exports.verifyOtp = async (req, res) => {
    try {
        res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
        res.setHeader("Access-Control-Allow-Origin", "*");

        const { phone_no, otp } = req.body;
        if (!phone_no || !otp) {
            return responseManager.badrequest({ message: "Phone number & OTP required" }, res);
        }

        const user = await userModel.findOne({ phone_no });
        if (!user) {
            return responseManager.badrequest({ message: "User not found" }, res);
        }

        if (!user.otp || !user.otp_expiry || Date.now() > user.otp_expiry) {
            return responseManager.badrequest({ message: "OTP expired, please request again" }, res);
        }

        if (user.otp !== otp) {
            return responseManager.badrequest({ message: "Invalid OTP" }, res);
        }

   
        const accesstoken = await helper.generateAccessToken({ userId: user._id.toString() });

    
        await userModel.findByIdAndUpdate(user._id, {
            $set: { jwt_token: accesstoken, otp: null, otp_expiry: null, updated: Date.now() },
        });

        const updatedUser = await userModel.findById(user._id).lean();

        return responseManager.onSuccess(
            "Login successful",
            { accesstoken, userdetails: updatedUser },
            res
        );
    } catch (err) {
        console.error("Verify OTP Error:", err);
        return responseManager.onError(err, res);
    }
};
exports.googleSignup = async (req, res) => {
  try {
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    res.setHeader("Access-Control-Allow-Origin", "*");

    const { id_token } = req.body;

    if (!id_token) {
      return responseManager.badrequest({ message: "ID token is required" }, res);
    }

    const ticket = await client.verifyIdToken({
      idToken: id_token,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const { email, name, picture, sub: google_id } = payload;

    if (!email) {
      return responseManager.badrequest({ message: "Google account must have an email" }, res);
    }

    let existingUser = await userModel.findOne({ email }).lean();
    if (existingUser) {
      return responseManager.badrequest(
        { message: "User already exists, please login instead" },
        res
      );
    }

    let userObj = {
      full_name: name || "",
      email: email.toLowerCase(),
      profile_image: picture || "",
      oauth_id: google_id,
      user_type: 2, // or whatever default type
      created: Date.now(),
      updated: Date.now()
    };

    let newUser = await userModel.create(userObj);

 
    let accesstoken = await helper.generateAccessToken({
      userId: newUser._id.toString(),
    });


    await userModel.findByIdAndUpdate(newUser._id, {
      $set: { jwt_token: accesstoken, updated: Date.now() },
    });

    let updatedUser = await userModel.findById(newUser._id).lean();

    return responseManager.onSuccess(
      "Google signup successful",
      { accesstoken: accesstoken, userdetails: updatedUser },
      res
    );

  } catch (err) {
  
    return responseManager.onError(err, res);
  }
};



exports.googleLogin = async (req, res) => {
  try {
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    res.setHeader("Access-Control-Allow-Origin", "*");

    const { id_token } = req.body;

    if (!id_token) {
      return responseManager.badrequest({ message: "ID token is required" }, res);
    }


    const ticket = await client.verifyIdToken({
      idToken: id_token,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const { email, name, picture } = payload;

    if (!email) {
      return responseManager.badrequest({ message: "Google account must have an email" }, res);
    }

 
    let existingUser = await userModel.findOne({ email }).lean();

    if (!existingUser) {
      return responseManager.badrequest(
        { message: "User not found, please signup first with Google" },
        res
      );
    }


    await userModel.updateOne(
      { email },
      { $set: { full_name: name, profile_image: picture, updated: Date.now() } }
    );


    let accesstoken = await helper.generateAccessToken({
      userId: existingUser._id.toString(),
    });

    await userModel.findByIdAndUpdate(existingUser._id, {
      $set: { jwt_token: accesstoken, updated: Date.now() },
    });

    let updatedUser = await userModel.findById(existingUser._id).lean();

    return responseManager.onSuccess(
      "Google login successful",
      { accesstoken: accesstoken, userdetails: updatedUser },
      res
    );

  } catch (err) {
    console.error("Google Login Error:", err);
    return responseManager.onError(err, res);
  }
};
exports.getProfile = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return responseManager.badrequest({ message: "User details not found, please login again...!" }, res);
    }
    return responseManager.onSuccess("User profile fetched successfully", user, res);
  } catch (err) {
    return responseManager.onError(err, res);
  }
};


exports.updateProfile = async (req, res) => {
  try {
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    res.setHeader("Access-Control-Allow-Origin", "*");

    const user = req.user; // middleware verifyUser thi attach
    if (!user) {
      return responseManager.badrequest(
        { message: "User not found, please login again" },
        res
      );
    }

    const {
      full_name,
      email,
      phone_no,
      country,
      state,
      city,
      zip_code,
    } = req.body;

    let updateData = {
      updated: Date.now(),
    };


    if (full_name) updateData.full_name = full_name;
    if (email) updateData.email = email.toLowerCase();
    if (phone_no) updateData.phone_no = phone_no;
    if (country) updateData.country = country;
    if (state) updateData.state = state;
    if (city) updateData.city = city;
    if (zip_code) updateData.zip_code = zip_code;


    if (req.files && req.files.profile_image && req.files.profile_image[0]) {
      const file = req.files.profile_image[0];

      if (!["image/jpeg", "image/png", "image/jpg"].includes(file.mimetype)) {
        return responseManager.badrequest({ message: "Profile image must be jpeg/png/jpg" }, res);
      }

      const filesizeinMb = parseFloat(file.size / 1048576);
      if (filesizeinMb > 5) {
        return responseManager.badrequest({ message: "Profile image must be <= 5 MB" }, res);
      }

      const uploadResult = await AwsCloud.saveToS3(
        file.buffer,
        "users",
        file.mimetype,
        "profile_image"
      );

      updateData.profile_image = `${process.env.AWS_BUCKET_URI}/${uploadResult.data.Key}`;
    }


    const updatedUser = await userModel.findByIdAndUpdate(user._id, updateData, { new: true }).lean();

    return responseManager.onSuccess("Profile updated successfully", updatedUser, res);

  } catch (err) {
    return responseManager.onError(err, res);
  }
};


exports.logout = async (req, res) => {
  try {
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    res.setHeader("Access-Control-Allow-Origin", "*");

    const user = req.user; // JWT middleware thi attach
    if (!user) {
      return responseManager.badrequest(
        { message: "User not found, please login again" },
        res
      );
    }

    await userModel.findByIdAndUpdate(user._id, {
      $set: { jwt_token: null, updated: Date.now() },
    });

    return responseManager.onSuccess(
      "Logout successful",
      {},
      res
    );

  } catch (err) {
 
    return responseManager.onError(err, res);
  }
};

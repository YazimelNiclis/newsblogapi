const express = require("express");
const router = express.Router();
const {
  signup,
  signin,
  signout,
  forgotPassword,
  resetPassword,
  requireSignin,
  preSignup,
  googleLogin,
} = require("../controllers/auth");

//validators
const { runValidation } = require("../validators");
const {
  userSignupValidator,
  userSigninValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
} = require("../validators/auth");

//Primero se pasa la validacion y despues se detectan que esté todo ok
router.post("/pre-signup", userSignupValidator, runValidation, preSignup);
router.post("/signup", signup);
router.post("/signin", userSigninValidator, runValidation, signin);
router.get("/signout", signout);

router.put(
  "/forgot-password",
  forgotPasswordValidator,
  runValidation,
  forgotPassword
);

router.put(
  "/reset-password",
  resetPasswordValidator,
  runValidation,
  resetPassword
);

router.post("/google-login", googleLogin);
//test
/*router.get("/secret", requireSignin, (req, res) => {
  res.json({
    user: req.user,
  });
});*/

module.exports = router;

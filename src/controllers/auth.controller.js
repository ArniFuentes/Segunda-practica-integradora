const { Router } = require("express");
const passport = require("passport");
const generateToken = require("../utils/jwt.util");
const { emailUser } = require("../configs/config");
const transport = require("../utils/nodemailer.util");

const router = Router();

router.post(
  "/login",
  passport.authenticate("login", { session: false }),
  async (req, res) => {
    try {
      const user = req.user;

      // Info a incluir en el token
      const tokenInfo = {
        id: user._id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role,
      };
      const token = generateToken(tokenInfo);

      // Enviar el token en una cookie
      res
        .cookie("authToken", token, { httpOnly: true })
        .json({ message: "Logged" });
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json({ status: "success", message: "Internal Server Error" });
    }
  }
);

router.get(
  "/github",
  passport.authenticate("github", { scope: ["user: email"] })
);

router.get(
  "/githubcallback",
  passport.authenticate("github", { session: false }),
  // Si es exitoso
  async (req, res) => {
    try {
      const user = req.user;

      // Enviar el correo electrónico
      const mailOptions = {
        from: emailUser, 
        to: user.email, 
        subject: "Registro exitoso!!",
        html: "<h1>¡Gracias por registrarte!</h1>",
      };

      await transport.sendMail(mailOptions);

      const tokenInfo = {
        id: user._id,
        role: user.role,
      };
      const token = generateToken(tokenInfo);

      // Enviar el token en una cookie
      res
        .cookie("authToken", token, { httpOnly: true })
        .json({ message: "Logged" });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  }
);

// router.get(
//   "/githubcallback",
//   passport.authenticate("github", { session: false }),
//   // Si es exitoso
//   (req, res) => {
//     try {
//       const user = JSON.stringify(req.user);
//       const token = generateToken(user);
//       res
//         .cookie("authToken", token, { httpOnly: true })
//         .json({ message: "Logged" });
//     } catch (error) {
//       console.log(error);
//       res.status(500).json({ message: "Internal Server Error" });
//     }
//   }
// );


module.exports = router;

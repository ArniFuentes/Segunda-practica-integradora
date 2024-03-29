const passport = require("passport");
const jwt = require("passport-jwt");
const local = require("passport-local");
const GithubStrategy = require("passport-github2");
const { secret, ghClientId, ghClientSecret, dbUser } = require("./config");
const extractJwtCookie = require("../utils/extract-jwt-cookie.util");
const Users = require("../models/user.model");
const {
  createHash,
  useValidPassword,
} = require("../utils/bcrypt-password.util");

const JwtStrategy = jwt.Strategy;
const ExtractJwt = jwt.ExtractJwt;
const LocalStrategy = local.Strategy;

const initializePassport = () => {
  passport.use(
    "current",
    new JwtStrategy(
      // Primer argumento
      {
        jwtFromRequest: ExtractJwt.fromExtractors([extractJwtCookie]),
        secretOrKey: secret,
      },
      // Segundo argumento (en credencials esta el objeto descifrado)
      (credentials, done) => {
        try {
          done(null, credentials);
        } catch (error) {
          done(error);
        }
      }
    )
  );

  passport.use(
    "register", // Nombre a elección
    new LocalStrategy(
      // El username en este caso será la propíedad email de req.body
      { passReqToCallback: true, usernameField: "email" },
      // Segundo argumento. username recibe un email (usernameField: "email")
      async (req, username, password, done) => {
        try {
          const { first_name, last_name, email } = req.body;
          const user = await Users.findOne({ email: username });
          // Si existe el usuario
          if (user) {
            console.log("User exists");
            return done(null, false); // Rompe la ejecución
          }

          // Si es un nuevo usuario crearlo
          const newUserInfo = {
            first_name,
            last_name,
            email,
            password: createHash(password),
          };

          // Crear el usuario en mongo
          const newUser = await Users.create(newUserInfo);
          console.log(newUser);
          return done(null, newUser);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  // Estrategia local para el inicio de sesión
  passport.use(
    "login",
    new LocalStrategy(
      // Configuración para buscar el nombre de usuario en el campo de correo electrónico
      { usernameField: "email", passwordField: "password" },
      // Toma el correo electrónico y la contraseña proporcionados por el usuario.
      async (username, password, done) => {
        try {
          // Buscar el usuario en la base de datos utilizando el correo electrónico
          const user = await Users.findOne({ email: username });
        
          if (!user) {
            console.log("Usuario no existe");
            return done(null, false);
          }

          if (!useValidPassword(user, password)) {
            console.log("Password no hace match");
            //  no hubo errores durante la autenticación (null) y no se encontró ningún usuario autenticado (false)
            done(null, false);
          }

          // Si la autenticación es exitosa, pasar los datos del usuario autenticado como segundo argumento
          return done(null, user);
        } catch (error) {
          done(error);
        }
      }
    )
  );

  // Si esta estrategia es exitosa redirigir a /auth/githubcallback
  passport.use(
    "github",
    new GithubStrategy(
      {
        clientID: ghClientId,
        clientSecret: ghClientSecret,
        callbackURL: "http://localhost:8080/auth/githubcallback",
      },
      // Info obtenida desde github (la info del profile se guarda en la base)
      async (accessToken, RefreshToken, profile, done) => {
        try {
          const { id, login, name, email } = profile._json;

          const user = await Users.findOne({ email: email }); 
          
          if (!user) {
            const newUserInfo = {
              first_name: name,
              email,
              githubId: id,
              githubUsername: login,
            };
            const newUser = await Users.create(newUserInfo);
            return done(null, newUser);
          }

          return done(null, user);

        } catch (error) {
          console.log(error);
          done(error);
        }
      }
    )
  );
};

module.exports = initializePassport;

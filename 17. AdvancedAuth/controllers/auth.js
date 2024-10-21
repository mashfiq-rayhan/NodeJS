const crypto = require("crypto");

const bcrypt = require("bcryptjs");

const brevo = require("@getbrevo/brevo");

// Load environment variables from .env
require("dotenv").config();

const User = require("../models/user");

const api = new brevo.TransactionalEmailsApi();
const apiKey = api.authentications["apiKey"];
apiKey.apiKey = process.env.BREVO_API_KEY;

const sendSmtpEmail = new brevo.SendSmtpEmail();

exports.getLogin = (req, res, next) => {
  let message = req.flash("error");
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render("auth/login", {
    path: "/login",
    pageTitle: "Login",
    errorMessage: message,
  });
};

exports.getSignup = (req, res, next) => {
  let message = req.flash("error");
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render("auth/signup", {
    path: "/signup",
    pageTitle: "Signup",
    errorMessage: message,
  });
};

exports.postLogin = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  User.findOne({ email: email })
    .then((user) => {
      if (!user) {
        req.flash("error", "Invalid Credentials!");
        return res.redirect("/login");
      }
      bcrypt
        .compare(password, user.password)
        .then((doMatch) => {
          if (doMatch) {
            req.session.isLoggedIn = true;
            req.session.user = user;
            return req.session.save((err) => {
              console.log(err);
              return res.redirect("/");
            });
          }
          req.flash("error", "Invalid Credentials!");
          res.redirect("/login");
        })
        .catch((err) => {
          console.log(err);
          res.redirect("/login");
        });
    })
    .catch((err) => console.log(err));
};

exports.postSignup = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  const confirmPassword = req.body.confirmPassword;
  User.findOne({ email: email })
    .then((userDoc) => {
      if (userDoc) {
        req.flash("error", "Email exists already!");
        return res.redirect("/signup");
      }
      return bcrypt
        .hash(password, 12)
        .then((hashedPassword) => {
          const user = new User({
            email: email,
            password: hashedPassword,
            cart: { items: [] },
          });
          return user.save();
        })
        .then((result) => {
          res.redirect("/login");

          sendSmtpEmail.to = [{ email: email }];
          sendSmtpEmail.sender = { email: process.env.SENDER_EMAIL };
          sendSmtpEmail.subject = "Signup Secceeded!";
          sendSmtpEmail.htmlContent =
            "<html><body><h1>You Successfully Signed up!</h1></body></html>";

          return api
            .sendTransacEmail(sendSmtpEmail)
            .then((data) => {
              console.log("Email sent successfully: " + JSON.stringify(data));
            })
            .catch((err) => {
              console.log(err);
            });
        });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode(500);
      return next(error);
    });
};

exports.postLogout = (req, res, next) => {
  req.session.destroy((err) => {
    console.log("Logged Out!", err);
    res.redirect("/");
  });
};

exports.getReset = (req, res, next) => {
  let message = req.flash("error");
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render("auth/reset", {
    path: "/reset",
    pageTitle: "Reset Password",
    errorMessage: message,
  });
};

exports.postReset = (req, res, next) => {
  crypto.randomBytes(32, (err, buffer) => {
    if (err) {
      console.log(err);
      return res.redirect("/reset");
    }
    const token = buffer.toString("hex");
    User.findOne({ email: req.body.email })
      .then((user) => {
        if (!user) {
          req.flash("error", "No account with that email Found!");
          return res.redirect("/reset");
        }
        user.resetToken = token;
        user.resetTokenExpiration = Date.now() + 3600000;
        return user.save();
      })
      .then((result) => {
        res.redirect("/");
        sendSmtpEmail.to = [{ email: req.body.email }];
        sendSmtpEmail.sender = { email: process.env.SENDER_EMAIL };
        sendSmtpEmail.subject = "Password Reset";
        sendSmtpEmail.htmlContent = `
            <html>
              <body>
                <p>You requested a password reset.</p>
                <p>Click this <a href="http://localhost:3000/reset/${token}">Link</a> to set a new password.</p>
              </body>
            </html>`;

        return api
          .sendTransacEmail(sendSmtpEmail)
          .then((data) => {
            console.log("Email sent successfully: " + JSON.stringify(data));
          })
          .catch((err) => {
            console.error("Error sending email:", err);
          });
      })
      .catch((err) => {
        console.log(err);
      });
  });
};

exports.getNewPassword = (req, res, next) => {
  const token = req.params.token;
  User.findOne({ resetToken: token, resetTokenExpiration: { $gt: Date.now() } })
    .then((user) => {
      let message = req.flash("error");
      if (message.length > 0) {
        message = message[0];
      } else {
        message = null;
      }
      res.render("auth/new-password", {
        path: "/new-password",
        pageTitle: "New Password",
        errorMessage: message,
        userId: user._id.toString(),
        passwordToken: token,
      });
    })
    .catch((err) => console.log(err));
};

exports.postNewPassword = (req, res, next) => {
  const newPassword = req.body.password;
  const userId = req.body.userId;
  const passwordToken = req.body.passwordToken;
  let resetUser;

  User.findOne({
    resetToken: passwordToken,
    resetTokenExpiration: { $gt: Date.now() },
    _id: userId,
  })
    .then((user) => {
      resetUser = user;
      return bcrypt.hash(newPassword, 12);
    })
    .then((hashedPassword) => {
      resetUser.password = hashedPassword;
      resetUser.resetToken = undefined;
      resetUser.resetTokenExpiration = undefined;
      return resetUser.save();
    })
    .then(result => {
      res.redirect('/login');
    })
    .catch((err) => console.log(err));
};

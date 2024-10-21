const bcrypt = require("bcryptjs");

const brevo = require("@getbrevo/brevo");

const User = require("../models/user");

// const api = new brevo.TransactionalEmailsApi();
// const apiKey = api.authentications["apiKey"];

// apiKey.apiKey = "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";

// smtp: xsmtpsib-a9b6797edf51a105820f39b2f2552ca3054047fe4219106265f549a61b943d2a-P4I5RVn6cJ9kEHB8
// api: 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

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
          sendSmtpEmail.sender = { email: "Shop@Node.com" };
          sendSmtpEmail.subject = "Signup Secceeded!";
          sendSmtpEmail.htmlContent =
            "<html><body><h1>You Successfully Signed up!</h1></body></html>";

          return api
            .sendTransacEmail(sendSmtpEmail)
            .then((data) => {
              console.log(
                "API called successfully. Returned data: " +
                  JSON.stringify(data)
              );
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

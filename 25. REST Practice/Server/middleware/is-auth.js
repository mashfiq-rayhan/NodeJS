const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {

  const authHeader = req.get('Authorization');
  if(!authHeader){
    const error = new Error('Not Authenticated.');
    error.status = 401;
    throw error;
  }

  const token = authHeader.split(' ')[1];
  let decodedToken;

  try {
    decodedToken = jwt.verify(token, 'somesupersecret');
  } catch(err){
    err.status = 500;
    throw err;
  }

  if(!decodedToken) {
    const error = new Error('Not Authenticated.');
    error.status = 500;
    throw error;
  }

  req.userId = decodedToken.userId;
  next();
}
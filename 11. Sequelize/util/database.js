const { Sequelize } = require("sequelize");

const sequelize = new Sequelize("nodejs", "root", "openmysql", {
  dialect: "mysql",
  host: "localhost",
});

module.exports = sequelize;

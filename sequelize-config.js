require('dotenv').config();

const config = {
  development: {
    url: process.env.DATABASE_URL,
    dialect: 'postgres',
    logging: console.log,
    pool: {
      max: 10,
      min: 2,
      idle: 30000,
      acquire: 60000,
    },
    define: {
      timestamps: true,
      underscored: true,
      paranoid: false,
      freezeTableName: true,
    },
  },
  test: {
    url: process.env.DATABASE_URL || process.env.TEST_DATABASE_URL,
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 5,
      min: 1,
      idle: 10000,
      acquire: 30000,
    },
    define: {
      timestamps: true,
      underscored: true,
      paranoid: false,
      freezeTableName: true,
    },
  },
  production: {
    url: process.env.DATABASE_URL,
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 20,
      min: 5,
      idle: 30000,
      acquire: 60000,
    },
    define: {
      timestamps: true,
      underscored: true,
      paranoid: false,
      freezeTableName: true,
    },
    dialectOptions: {
      ssl: process.env.NODE_ENV === 'production' ? {
        require: true,
        rejectUnauthorized: false,
      } : false,
    },
  },
};

module.exports = config;
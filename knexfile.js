require('dotenv').config(); 

module.exports = {
  client: 'pg',
  connection: process.env.PG_STRING,
  migrations: {
    directory: './db/migrations',
    tableName: 'knex_migrations'
  },
};

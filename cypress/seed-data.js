exports.seedData = [
  {
    route: '/login',
    type: 'form',
    data: {
      email: 'admin@redash.io',
      password: 'password',
    },
  },
  {
    route: '/api/data_sources',
    type: 'json',
    data: {
      name: 'Test PostgreSQL',
      options: {
        dbname: 'postgres',
        host: 'postgres',
        port: 5432,
        sslmode: 'prefer',
        user: 'postgres',
      },
      type: 'pg',
    },
  },
];

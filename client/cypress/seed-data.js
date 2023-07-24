exports.seedData = [
  {
    route: "/setup",
    type: "form",
    data: {
      name: "Example Admin",
      email: "admin@redash.io",
      password: "password",
      org_name: "Redash",
    },
  },
  {
    route: "/login",
    type: "form",
    data: {
      email: "admin@redash.io",
      password: "password",
    },
  },
  {
    route: "/api/data_sources",
    type: "json",
    data: {
      name: "Test PostgreSQL",
      options: {
        dbname: "postgres",
        host: "postgres",
        port: 5432,
        sslmode: "prefer",
        user: "postgres",
      },
      type: "pg",
    },
  },
  {
    route: "/api/destinations",
    type: "json",
    data: {
      name: "Test Email Destination",
      options: {
        addresses: "test@example.com",
      },
      type: "email",
    },
  },
];

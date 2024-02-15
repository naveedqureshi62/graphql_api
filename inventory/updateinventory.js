const { ApolloServer, gql } = require('apollo-server-lambda');
const { GraphQLScalarType } = require('graphql');
const { Kind } = require('graphql/language');
const { Client } = require('pg');
const { JSONResolver } = require('graphql-scalars');
require('dotenv').config(); // Load environment variables


// Database connection details
const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
};

// Custom scalar type for JSON
const JSONScalar = new GraphQLScalarType({
  name: 'JSON',
  description: 'The JSON scalar type represents JSON objects as a string.',
  serialize(value) {
    return JSONResolver.serialize(value);
  },
  parseValue(value) {
    return JSONResolver.parseValue(value);
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      return JSONResolver.parseLiteral(ast);
    }
    return null;
  },
});

// GraphQL schema definition
const typeDefs = gql`
  scalar JSON

  type Inventory {
    inventory_id: ID!
    inventory_details: JSON!
  }

  type Query {
    getInventoryById(inventory_id: ID!): Inventory
  }

  type Mutation {
    updateInventory(inventory_id: ID!, inventory_details: JSON!): Inventory
  }
`;

// Resolvers
const resolvers = {
  JSON: JSONScalar,
  Query: {
    getInventoryById: async (_, { inventory_id }) => {
      const pgClient = new Client(dbConfig);

      try {
        await pgClient.connect();
        const query = 'SELECT * FROM inventory WHERE inventory_id = $1';
        const result = await pgClient.query(query, [inventory_id]);
        return result.rows[0];
      } catch (error) {
        console.error("Error fetching inventory:", error.message);
        throw error;
      } finally {
        await pgClient.end();
      }
    },
  },
  Mutation: {
    updateInventory: async (_, { inventory_id, inventory_details }) => {
      const pgClient = new Client(dbConfig);

      try {
        await pgClient.connect();
        const query = 'UPDATE inventory SET inventory_details = $1 WHERE inventory_id = $2 RETURNING *';
        const result = await pgClient.query(query, [JSON.stringify(inventory_details), inventory_id]);
        return result.rows[0];
      } catch (error) {
        console.error("Error updating inventory:", error.message);
        throw error;
      } finally {
        await pgClient.end();
      }
    },
  },
};

// Apollo Server initialization
const server = new ApolloServer({
  typeDefs,
  resolvers,
});

// Lambda handler
exports.graphqlHandler = server.createHandler();
 const { ApolloServer, gql } = require('apollo-server-lambda');
const { GraphQLScalarType } = require('graphql');
const { Kind } = require('graphql/language');
const { Client } = require('pg');
const { JSONResolver } = require('graphql-scalars');
require('dotenv').config();

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

const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
};

 const typeDefs = gql`
  scalar JSON

  type Product {
    product_id: ID
    product_details: JSON
    inventory_id: ID
  }

  type Query {
    dummyQuery: String # Add a dummy query
  }

  type Mutation {
     updateProduct(product_id: ID!, product_details: JSON!, inventory_id: ID!): Product
  }
`;

const resolvers = {
  JSON: JSONScalar, 
  
 
  Mutation: {
    updateProduct: async (_, { product_id, product_details, inventory_id }) => {
      const pgClient = new Client(dbConfig);

      try {
        await pgClient.connect();
        const query = 'UPDATE product SET product_details = $1::jsonb, inventory_id = $2 WHERE product_id = $3 RETURNING *';
        const values = [product_details, inventory_id, product_id];
        const result = await pgClient.query(query, values);
        return { product_id: result.rows[0].product_id, product_details: result.rows[0].product_details, inventory_id: result.rows[0].inventory_id };
      } catch (error) {
        console.error("Error updating product:", error.message);
        throw error;
      } finally {
        await pgClient.end();
      }
    },
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  formatError: (error) => {
    console.error(error);
    return error;
  },
});

exports.graphqlHandler = server.createHandler();
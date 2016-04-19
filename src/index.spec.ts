import "mocha";
import * as chai from  "chai";
import * as util from "util";

import * as neo4j from "./index";
import * as request from "request";

let should = chai.should();

describe("Neo4j Typescript REST", function() {
  let neo4jConfig: neo4j.INeo4jConfig = {
    protocol: neo4j.NEO4J_PROTOCOL.http,
    host: "localhost",
    port: 7474,
    authentication: {
      username: "neo4j",
      password: "neo4j"
    },
    streaming: true
  };
  let badNeo4jConfig: neo4j.INeo4jConfig = JSON.parse(JSON.stringify(neo4jConfig));
  let requestOptions: request.CoreOptions = neo4j.getRequestOptions();

  describe("#connect", function() {
    let connection = null;
    it("should fail to parse url endpoint", function(done) {
      badNeo4jConfig.host = null;
      neo4j.connect(badNeo4jConfig)
        .then((response) => {
          done(response);
        })
        .catch((reason) => {
          done()
        });
    });
    it("should establish a new connection", function(done) {
      neo4j.connect(neo4jConfig).
        then((response) => {
          connection = response;
          done();
        }).
        catch((reason) => {
          done(reason);
        });
    });
    it("should return an existing connection", function(done) {
      neo4j.connect(neo4jConfig).
        then((response) => {
          response.should.eql(connection);
          done();
        }).
        catch((reason) => {
          done(reason);
        });
    });
    it("should confirm a connection is present", function(done) {
      neo4j.isConnected().should.equal(true);
      done();
    });
    it("should unset the http request header to streaming", function() {
      neo4j.setStreaming(false);
      neo4j.isStreaming().should.equal(false);
    });
  });
  describe("#global graph functions", function() {
    it("should fail to return all graph relationship types due to request error.", function(done) {
      let goodBaseUrl: string = requestOptions.baseUrl;
      requestOptions.baseUrl = "WRONG";
      neo4j.getRelationshipTypes()
        .then((response) => {
          done(response);
        })
        .catch((reason) => {
          requestOptions.baseUrl = goodBaseUrl;
          done();
        });
    });
    it("should return all graph relationship types", function(done) {
      neo4j.getRelationshipTypes()
        .then((relationshipTypes) => {
          relationshipTypes.should.be.instanceOf(Array);
          done();
        })
        .catch((reason) => {
          done(reason);
        });
    });
    it("should fail to return all graph property keys due to request error.", function(done) {
      let goodBaseUrl: string = requestOptions.baseUrl;
      requestOptions.baseUrl = "WRONG";
      neo4j.getAllPropertyKeys()
        .then((response) => {
          done(response);
        })
        .catch((reason) => {
          requestOptions.baseUrl = goodBaseUrl;
          done();
        });
    });
    it("should return all graph property keys", function(done) {
      neo4j.getAllPropertyKeys()
        .then((propertyKeys) => {
          propertyKeys.should.be.instanceOf(Array);
          done();
        })
        .catch((reason) => {
          done(reason);
        });
    });
    it("should create a new index on label", function(done) {
      neo4j.createIndex("test", "testProperty")
        .then((response) => {
          done();
        })
        .catch((reason) => {
          done(reason);
        });
    });
    it("should list index just created by label", function(done) {
      neo4j.listIndexesForLabel("test")
        .then((response) => {
          response[0].property_keys.should.contain("testProperty");
          done();
        })
        .catch((reason) => {
          done(reason);
        });
    });
    it("should drop index just created on label", function(done) {
      neo4j.dropIndex("test", "testProperty")
        .then((response) => {
          done();
        })
        .catch((reason) => {
          done(reason);
        });
    });
  });
  describe("#Cypher query function", function() {
    it("should execute a valid cypher statement", function(done) {
      let validCypher: neo4j.INeo4jCypherRequest = {
        statements: [{
          statement: "MATCH (n) RETURN n"
        }]
      };
      neo4j.cypher(validCypher)
        .then((response) => {
          done();
        })
        .catch((reason) => {
          done(reason);
        });
    });
    it("should execute several valid cypher statements", function(done) {
      let validCypher: neo4j.INeo4jCypherRequest = {
        statements: [
          {
            statement: "MATCH (n) RETURN count(n)"
          },
          {
            statement: "MATCH (x) RETURN x"
          }
        ]
      };
      neo4j.cypher(validCypher)
        .then((response) => {
          done();
        })
        .catch((reason) => {
          done(reason);
        });
    });
    it("should return cypher responses specified by 'ResultDataContents'", function(done) {
      let query: string = `MATCH (n) RETURN n LIMIT 3`;
      let cypherRequest: neo4j.INeo4jCypherRequest = {
        statements: [{
          statement: query,
          resultDataContents: ["REST"]
        }]
      };
      neo4j.cypher(cypherRequest)
        .then((response) => {
          response.results[0].data[0].should.have.property("rest");
          done();
        })
        .catch((reason) => {
          done(reason);
        });

    });
    it("should fail to execute an invalid cypher statement", function(done) {
      let invalidCypher: neo4j.INeo4jCypherRequest = {
        statements: [{
          statement: "This is not valid"
        }]
      };
      neo4j.cypher(invalidCypher)
        .then((response) => {
          done(response);
        }).catch((reason) => {
          done();
        });
    });
  });
  describe("#Node level functions", function() {
    let id: number = null;
    it("should fail to create a new Node due to request error", function(done) {
      let goodBaseUrl: string = requestOptions.baseUrl;
      requestOptions.baseUrl = "WRONG";
      neo4j.createNode({ firstName: "Testing" })
        .then((response) => {
          done(response);
        })
        .catch((reason) => {
          requestOptions.baseUrl = goodBaseUrl;
          done();
        });
    });
    it("should fail to create a new Node due to response error", function(done) {
      neo4j.createNode({ nested: { foo: "bar" } })
        .then((response) => {
          done(response);
        })
        .catch((reason) => {
          done();
        });
    });
    it("should create a new Node", function(done) {
      neo4j.createNode({ firstName: "Testing" })
        .then((response) => {
          response.metadata.id.should.be.above(0);
          id = response.metadata.id;
          done();
        })
        .catch((reason) => {
          done(reason);
        });
    });
    it("should fail to return newly created node due to request error", function(done) {
      let goodBaseUrl: string = requestOptions.baseUrl;
      requestOptions.baseUrl = "WRONG";
      neo4j.getNode(id)
        .then((response) => {
          done(response);
        })
        .catch((reason) => {
          requestOptions.baseUrl = goodBaseUrl;
          done();
        });
    });
    it("should return newly created node", function(done) {
      neo4j.getNode(id)
        .then((response) => {
          response.metadata.id.should.equal(id);
          done();
        })
        .catch((reason) => {
          done(reason);
        });
    });
    it("should get the degree of the newly created node(0)", function(done) {
      neo4j.getNodeDegree(id)
        .then((response) => {
          response.should.equal(0);
          return neo4j.getNodeDegree(id, "all");
        })
        .then((response) => {
          response.should.equal(0);
          return neo4j.getNodeDegree(id, "all", "testing");
        })
        .then((response) => {
          response.should.equal(0);
          done();
        })
        .catch((reason) => { done(reason); });
    });
    it(`should delete newly created node`, function(done) {
      neo4j.deleteNode(id)
        .then((response) => {
          done();
        })
        .catch((reason) => {
          done(reason);
        });
    });
    it(`should fail to delete node due to request error`, function(done) {
      let goodBaseUrl: string = requestOptions.baseUrl;
      requestOptions.baseUrl = "WRONG";
      neo4j.deleteNode(id)
        .then((response) => {
          done(response);
        })
        .catch((reason) => {
          requestOptions.baseUrl = goodBaseUrl;
          done();
        });
    });
    it(`should fail to delete non-existant node`, function(done) {
      neo4j.deleteNode(id)
        .then((response) => {
          done(response);
        })
        .catch((reason) => {
          done();
        });
    });
    it(`should not find deleted node`, function(done) {
      neo4j.getNode(id)
        .then((response) => {
          done(response);
        })
        .catch((reason) => {
          done();
        });
    });
  });
  describe("#Property level functions", function() {
    let id: number = null;
    before(function(done) {
      neo4j.createNode({ firstName: "Testing" })
        .then((response) => {
          id = response.metadata.id;
          done();
        })
        .catch((reason) => {
          done(reason);
        });
    });

    after(function(done) {
      neo4j.deleteNode(id)
        .then((response) => {
          done();
        })
        .catch((reason) => {
          done(reason);
        });
    });

    it("should fail to upsert a single node property", function(done) {
      neo4j.setProperty(id, "WRONG", "lastName", "Pennetta")
        .then((response) => {
          done(response);
        })
        .catch((reason) => {
          done();
        });
    });
    it("should upsert a single node property", function(done) {
      neo4j.setProperty(id, "node", "lastName", "Pennetta")
        .then((response) => {
          done();
        })
        .catch((reason) => {
          done(reason);
        });
    });
    it("should upsert node properties", function(done) {
      let addedProperties = { newProperty: "My Property" };
      neo4j.updateProperties(id, "node", addedProperties)
        .then((response) => {
          response.should.equal(true);
          done();
        })
        .catch((reason) => {
          done(reason);
        });
    });
    it("should get node properties", function(done) {
      neo4j.getProperties(id, "node")
        .then((response) => {
          response.should.include.keys("newProperty");
          done();
        })
        .catch((reason) => {
          done(reason);
        });
    });
    it("should get a single node property", function(done) {
      neo4j.getProperty(id, "newProperty", "node")
        .then((response) => {
          response.should.equal("My Property");
          done();
        })
        .catch((reason) => {
          done(reason);
        });
    });
    it("should fail on null property insert", function(done) {
      let myTestNullString: string = null;
      neo4j.setProperty(id, "node", "nullProperty", myTestNullString)
        .then((response) => {
          done(response);
        })
        .catch((reason) => {
          done();
        });
    });
    it("should fail on nested property insert.", function(done) {
      let myTestNestedObject: any = {
        "foo": {
          "bar": "baz"
        }
      };
      neo4j.updateProperties(id, "node", myTestNestedObject)
        .then((response) => {
          done(response);
        })
        .catch((reason) => {
          done();
        });
    });
    it("should delete all properties on a node", function(done) {
      neo4j.deleteProperty(id, "newProperty", "node")
        .then((response) => {
          done();
        })
        .catch((reason) => {
          done(reason);
        });
    });
    it("should delete a single property on a node", function(done) {
      neo4j.deleteAllProperties(id, "node")
        .then((response) => {
          done();
        })
        .catch((reason) => {
          done(reason);
        });
    });
  });
  describe("#Relationship level functions", function() {
    let sampleStartNode: neo4j.INode = null;
    let sampleEndNode: neo4j.INode = null;
    let sampleNewRelationship: neo4j.IRelationship = null;

    before(function(done) {
      neo4j.createNode()
        .then((response) => {
          sampleStartNode = response;
          sampleStartNode.self.should.not.equal(null);
          return neo4j.createNode();
        })
        .then((response) => {
          sampleEndNode = response;
          sampleEndNode.self.should.not.equal(null);
          done();
        })
        .catch((reason) => {
          done(reason);
        });
    });

    it("Should create a new relationship", function(done) {
      neo4j.createRelationship(sampleStartNode, sampleEndNode, "MET", { createdDate: new Date().toISOString() })
        .then((response) => {
          sampleNewRelationship = response;
          sampleNewRelationship.self.should.not.equal(null);
          sampleNewRelationship.self.should.be.a("string");
          done();
        })
        .catch((reason) => {
          done(reason);
        });
    });
    it("Should return newly created relationship", function(done) {
      neo4j.getRelationship(sampleNewRelationship.metadata.id)
        .then((response) => {
          response.self.should.equal(sampleNewRelationship.self);
          response.data.createdDate.should.not.equal(null);
          done();
        })
        .catch((reason) => {
          done(reason);
        });
    });
    it("should add a new property to newly created relationship", function(done) { done(); });
    it("should set all properties on newly created relationship", function(done) { done(); });
    it("should set a single property on newly created relationship", function(done) { done(); });
    it("should get all properties on newly created relationship", function(done) { done(); });
    it("should get a single property on newly created relationship", function(done) { done(); });
    it("should delete newly created relationship", function(done) {
      neo4j.deleteRelationship(sampleNewRelationship)
        .then((response) => {
          done();;
        })
        .catch((reason) => {
          done(reason);
        });
    });
    it("should get all relationships on node", function(done) { done(); });
    it("should get all incoming relationships on node", function(done) { done(); });
    it("should get all outgoing relationships on node", function(done) { done(); });
    it("should get all typed relationshipd on a node", function(done) { done(); });
  });
});

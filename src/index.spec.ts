import "mocha";
import * as chai from  "chai";
import * as util from "util";

import * as neo4j from "./index";

let should = chai.should();

describe("Neo4j Typescript REST", function() {
  describe("#connect", function() {
    let neo4jConfig: neo4j.INeo4jConfig = {
      protocol: neo4j.NEO4J_PROTOCOL.http,
      host: "localhost",
      port: 7474,
      authentication: {
        username: "neo4j",
        password: "neo4j"
      }
    };

    let connection = null;

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
  });
  describe("#global graph functions", function() {
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
  });
  describe("#Node level functions", function() {
    let id: number = null;
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
    it(`should delete newly created node`, function(done) {
      neo4j.deleteNode(id)
        .then((response) => {
          done();
        })
        .catch((reason) => {
          done(reason);
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
      neo4j.updateProperties(id, addedProperties)
        .then((response) => {
          response.should.equal(true);
          done();
        })
        .catch((reason) => {
          done(reason);
        });
    });
    it("should get node properties", function(done) {
      neo4j.getProperties(id)
        .then((response) => {
          response.should.include.keys("newProperty");
          done();
        })
        .catch((reason) => {
          done(reason);
        });
    });
    it("should get a single node property", function(done) {
      neo4j.getProperty(id, "newProperty")
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
      neo4j.updateProperties(id, myTestNestedObject)
        .then((response) => {
          done(response);
        })
        .catch((reason) => {
          done();
        });
    });
    it("should delete all properties on a node", function(done) {
      neo4j.deleteProperty(id, "newProperty")
        .then((response) => {
          done();
        })
        .catch((reason) => {
          done(reason);
        });
    });
    it("should delete a single property on a node", function(done) {
      neo4j.deleteAllProperties(id)
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
    it("should delete newly created relationship", function(done) { done(); });
    it("should get all relationships on node", function(done) { done(); });
    it("should get all incoming relationships on node", function(done) { done(); });
    it("should get all outgoing relationships on node", function(done) { done(); });
    it("should get all typed relationshipd on a node", function(done) { done(); });
  });
});

import * as neo4j from "neo4j-typescript";

let config: neo4j.INeo4jConfig = {
  authentication: {
    username: "neo4j",
    password: "neo4j"
  },
  protocol: neo4j.NEO4J_PROTOCOL.http,
  host: "localhost",
  port: 7474
};

neo4j.connect(config)
  .then((response) => {
    console.log("Successfully connected.");

    let myNode: any = {
      firstName: "John",
      lastName: "Doe"
    };

    neo4j.createNode(myNode)
      .then((insertResponse) => {
        console.dir(insertResponse);
      })
      .catch((insertError) => {
        console.error(insertError);
      });
  })
  .catch((reason) => {
    console.error(reason);
  });
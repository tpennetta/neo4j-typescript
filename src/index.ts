/**
 * @author Tom Pennetta <tpennetta@gmail.com>
 * TODO: Don't reuse the same instance fo requestOptions for each call.
 */

import * as path from "path";
import * as url from "url";
import * as request from "request";
import * as util from "util";
import * as http from "http";

/*********************************
 * Global request module defaults.
 */
request.defaults({
  headers: {
    "Content-Type": "application/json"
  }
});

/*********************************
 * Global constants.
 */
export enum NEO4J_PROTOCOL { http, https };

// TODO: Change to enums
const NEO4J_ENTITY_TYPES: string[] = ["node", "relationship"];
const NEO4J_HTTP_METHODS: string[] = ["DELETE", "GET", "POST", "PUT"];
const NEO4J_RELATIONSHIP_DIRECTION: string[] = ["all", "in", "out"];

const NEO4J_STANDARD_PATHS: any = {
  config: "/db/data/",
  propertyKeys: "/db/data/propertykeys"
};

/*********************************
 * Stricty enforced Interfaces
 */
export interface INeo4jInternalPaths {
  extensions: any;
  node: string;
  node_index: string;
  relationship_index: string;
  extensions_info: string;
  relationship_types: string;
  batch: string;
  cypher: string;
  indexes: string;
  constraints: string;
  transaction: string;
  node_labels: string;
  neo4j_version: string;
};

export interface INeo4jConfig {
  protocol: NEO4J_PROTOCOL;
  host: string;
  port: number;
  authentication?: INeo4jAuthConfig;
  streaming?: boolean;
}

export interface INeo4jAuthConfig {
  username: string;
  password: string;
}

export interface INeo4jEntity {
  extensions?: any;
  data?: any;
  property: string;
  properties: string;
  self: string;
  metadata: {
    id: number,
    labels?: string[],
    type?: string
  };
}

export interface INode extends INeo4jEntity {
  outgoing_relationships: string;
  labels: string;
  all_typed_relationships: string;
  traverse: string;
  outgoing_typed_relationships: string;
  incoming_relationships: string;
  create_relationship: string;
  paged_traverse: string;
  all_relationships: string;
  incoming_typed_relationships: string;
}

export interface IRelationship extends INeo4jEntity {
  start: string;
  type: string;
  end: string;
}

interface IResponseObject {
  incomingMessage: http.IncomingMessage;
  body: any;
}

/*********************************
 * Internal module variables. Connection state properties.
 */
let connected: boolean = false;
let streaming: boolean = false;
let graphPaths: INeo4jInternalPaths = null;
let relationshipTypes: string[] = [];
let requestOptions: request.CoreOptions = {};
let dbConfigUrl: url.Url = null;

/**
 * @param  {INeo4jConfig} options
 * @returns Promise
 */
export function connect(options: INeo4jConfig): Promise<INeo4jInternalPaths | string> {
  let promise = new Promise((resolve, reject) => {
    if (connected && graphPaths && url.parse(graphPaths.node).hostname === options.host) {
      return resolve(graphPaths);
    }

    streaming = options.streaming || streaming;
    if (streaming) {
      requestOptions.headers = requestOptions.headers || {};
      requestOptions.headers["X-Stream"] = true;
    }

    let dbConfigEndpointString: string = `${NEO4J_PROTOCOL[options.protocol]}://${options.host}:${options.port}`;
    dbConfigEndpointString = url.resolve(dbConfigEndpointString, NEO4J_STANDARD_PATHS.config);

    try {
      dbConfigUrl = url.parse(dbConfigEndpointString);
    } catch (ex) {
      return reject(`Error parsing Neo4j connection endpoint: ${ex}`);
    }

    requestOptions.method = "GET";
    requestOptions.port = options.port;

    if (options.authentication && typeof options.authentication.username === "string" && typeof options.authentication.password === "string") {
      requestOptions.auth = {
        username: options.authentication.username,
        password: options.authentication.password
      };
    }

    request.get(dbConfigEndpointString, requestOptions, (err, response, body) => {
      if (err) {
        reject(`Error requesting database config REST endpoint: ${err}`);
      }

      body = typeof body === "string" ? JSON.parse(body) : body;

      connected = true;
      graphPaths = body;
      resolve(body);
    });
  });

  return promise;
}

/**
 * @returns Promise
 */
export function getRelationshipTypes(): Promise<string[]> {
  let promise: Promise<string[]> = new Promise((resolve, reject) => {
    request.get(graphPaths.relationship_types, requestOptions, (err, response, body) => {
      if (err) {
        reject(err);
      }
      if (response.statusCode !== 200) {
        reject(`Invalid HTTP Response code returned: ${response.statusCode}`);
      }
      if (typeof body === "string") {
        try {
          body = JSON.parse(body);
        } catch (ex) {
          reject(`Invalid JSON string returned: ${ex.message}`);
        }
      }
      relationshipTypes = body;
      resolve(relationshipTypes);
    });
  });
  return promise;
}

/**
 * @returns Promise
 */
export function getAllPropertyKeys(): Promise<string[]> {

  let promise: Promise<string[]> = new Promise((resolve, reject) => {
    let getAllPropertyKeysEndpoint: string = `${dbConfigUrl.protocol}//${dbConfigUrl.hostname}:${dbConfigUrl.port}${NEO4J_STANDARD_PATHS.propertyKeys}`;
    request.get(getAllPropertyKeysEndpoint, requestOptions, (err, response, body) => {
      if (err) {
        reject(err);
      }
      if (response.statusCode >= 400) {
        reject(`Invalid HTTP Response code returned: ${response.statusCode}`);
      } else {
        body = typeof body === "string" ? JSON.parse(body) : body;
        resolve(body);
      }
    });
  });

  return promise;
}

/*********************************
 * Node/Vertex functions
 */

/**
 * @param  {number} id
 * @returns Promise
 */
export function getNode(id: number): Promise<INode> {
  let promise = new Promise((resolve, reject) => {
    let nodeEndpointString: string = `${graphPaths.node}/${id}`;
    request.get(nodeEndpointString, requestOptions, (err, response, body) => {
      if (err) {
        reject(err);
      }
      if (response.statusCode >= 400) {
        reject(`Invalid HTTP Response code returned: ${response.statusCode}`);
      }
      body = typeof body === "string" ? JSON.parse(body) : body;
      let returnedNode: INode = body;
      resolve(body);
    });
  });
  return promise;
}
/**
 * @param  {any} data?
 * @returns Promise
 */
export function createNode(data?: any): Promise<INode> {
  let promise = new Promise((resolve, reject) => {
    let nodeEndpointString: string = graphPaths.node;
    data = data || {};
    requestOptions.body = typeof data !== "string" ? JSON.stringify(data) : data;
    request.post(nodeEndpointString, requestOptions, (err, response, body) => {
      if (err) {
        reject(err);
      }
      if (response.statusCode !== 201) {
        reject(`Invalid HTTP Response when inserting Node: ${response.statusCode}`);
      }
      body = typeof body === "string" && body.length > 0 ? JSON.parse(body) : body;
      let returnedNode: INode = body;
      resolve(body);
    });
  });
  return promise;
}

/**
 * @param  {number} id
 * @returns Promise
 */
export function deleteNode(id: number): Promise<boolean> {
  let promise = new Promise((resolve, reject) => {
    let nodeEndpointString: string = `${graphPaths.node}/${id}`;
    request.del(nodeEndpointString, requestOptions, (err, response, body) => {
      if (err) {
        reject(err);
      }
      if (response.statusCode === 409) {
        reject(`All relationships for Node id ${id} must be deleted prior to deleting node itself.`);
      }
      if (response.statusCode !== 204) {
        reject(`Error deleting Node. HTTP Status code returned: ${response.statusCode}`);
      }
      resolve(true);
    });
  });
  return promise;
}

/*********************************
 * Property functions
 */

/**
 * @param  {number} nodeId
 * @param  {string} propertyName
 * @param  {number|string|boolean|number[]|string[]|boolean[]} data
 * @returns Promise
 */
export function setProperty(entityId: number, type: string, propertyName: string, data: number | string | boolean | number[] | string[] | boolean[]): Promise<boolean> {
  let promise = new Promise((resolve, reject) => {
    let propertyEndpointString: string = null;
    if (type === "node") {
    propertyEndpointString = `${graphPaths.node}/${entityId}/properties/${propertyName}`;
    } else if (type === "relationship") {
      propertyEndpointString = url.resolve(dbConfigUrl.href, `relationship/${entityId}/properties/${propertyName}`);
    } else {
      reject(`type must be of value: ${NEO4J_ENTITY_TYPES}`);
    }

    if (!data) {
      reject(`Property cannot have null value.`);
    }
    data = `"${data}"`;
    requestOptions.body = data;
    request.put(propertyEndpointString, requestOptions, (err, response, body) => {
      if (err) {
        reject(err);
      }
      if (response.statusCode !== 204) {
        reject(`Error setting property: ${propertyName} on Node: ${entityId}. Received HTTP status code: ${response.statusCode}. HTTP body: ${body}`);
      }
      resolve(true);
    });
  });
  return promise;
}

/**
 * @param  {number} nodeId
 * @param  {any} data
 * @returns Promise
 */
export function updateProperties(nodeId: number, data: any): Promise<boolean> {
  let promise = new Promise((resolve, reject) => {
    let propertiesEndpointString: string = `${graphPaths.node}/${nodeId}/properties`;
    if (typeof data !== "string") {
      try {
        data = JSON.stringify(data);
      } catch (ex) {
        reject(ex);
      }
    }
    requestOptions.body = data;
    request.put(propertiesEndpointString, requestOptions, (err, response, body) => {
      if (err) {
        reject(err);
      }
      if (response.statusCode !== 204) {
        reject(`Error setting properties on Node: ${nodeId}. Received HTTP status code: ${response.statusCode}. HTTP body: ${body}`);
      }
      resolve(true);
    });
  });
  return promise;
}

/**
 * @param  {number} nodeId
 */
export function getProperties(nodeId: number) {
  let promise = new Promise((resolve, reject) => {
    let propertiesEndpointString: string = `${graphPaths.node}/${nodeId}/properties`;
    request.get(propertiesEndpointString, requestOptions, (err, response, body) => {
      if (err) {
        reject(err);
      }
      if (response.statusCode !== 200) {
        reject(`Error getting properties on Node: ${nodeId}. Received HTTP status code: ${response.statusCode}. HTTP body: ${body}`);
      }
      body = typeof body === "string" && body.length > 0 ? JSON.parse(body) : body;
      resolve(body);
    });
  });
  return promise;
}

/**
 * @param  {number} nodeId
 * @param  {string} propertyName
 * @returns Promise
 */
export function getProperty(nodeId: number, propertyName: string): Promise<number | string | boolean | number[] | string[] | boolean[]> {
  let promise = new Promise((resolve, reject) => {
    let propertyEndpointString: string = `${graphPaths.node}/${nodeId}/properties/${propertyName}`;
    request.get(propertyEndpointString, requestOptions, (err, response, body) => {
      if (err) {
        reject(err);
      }
      if (response.statusCode !== 200) {
        reject(`Error getting property ${propertyName} on Node: ${nodeId}. Received HTTP status code: ${response.statusCode}. HTTP body: ${body}`);
      }
      body = typeof body === "string" && body.length > 0 ? JSON.parse(body) : body;
      resolve(body);
    });
  });
  return promise;
}

/**
 * @param  {number} nodeId
 * @param  {string} propertyName
 * @returns Promise
 */
export function deleteProperty(nodeId: number, propertyName: string): Promise<boolean> {
  let promise = new Promise((resolve, reject) => {
    let propertyEndpointString: string = `${graphPaths.node}/${nodeId}/properties/${propertyName}`;
    request.del(propertyEndpointString, requestOptions, (err, response, body) => {
      if (err) {
        reject(err);
      }
      if (response.statusCode !== 204) {
        reject(`Error deleting property ${propertyName} on Node: ${nodeId}. Received HTTP status code: ${response.statusCode}. HTTP body: ${body}`);
      }
      resolve(true);
    });
  });
  return promise;
}

/**
 * @param  {number} nodeId
 * @returns Promise
 */
export function deleteAllProperties(nodeId: number): Promise<boolean> {
  let promise = new Promise((resolve, reject) => {
    let propertiesEndpointString = `${graphPaths.node}/${nodeId}/properties`;
    request.del(propertiesEndpointString, requestOptions, (err, response, body) => {
      if (err) {
        reject(err);
      }
      if (response.statusCode !== 204) {
        reject(`Error deleting properties on Node: ${nodeId}. Received HTTP status code: ${response.statusCode}. HTTP body: ${body}`);
      }
      resolve(true);
    });
  });
  return promise;
}

/*********************************
 * Relationship functions
 */

export function getRelationship(relationshipId: number, direction?: string, types?: string[]): Promise<IRelationship> {
  let promise = new Promise((resolve, reject) => {
    if (direction && NEO4J_RELATIONSHIP_DIRECTION.indexOf(direction) === -1) {
      reject(`Relationship 'direction' must be of type: ${NEO4J_RELATIONSHIP_DIRECTION}`);
    }
    let relationshipEndpointString: string = url.resolve(dbConfigUrl.href, `relationship/${relationshipId}`);
    request.get(relationshipEndpointString, requestOptions, (err, response, body) => {
      if (err) {
        reject(err);
      }
      if (response.statusCode !== 200) {
        reject(`Error getting relationship by ID ${relationshipId}. Received HTTP status code: ${response.statusCode}. HTTP body: ${body}`);
      }
      body = typeof body === "string" && body.length > 0 ? JSON.parse(body) : body;
      resolve(body);
    });
  });
  return promise;
}

export function createRelationship(startNode: INode | string | number, toNode: INode | string | number, type?: string, data?: any): Promise<IRelationship> {
  let promise = new Promise((resolve, reject) => {
    let relationshipStartEndpointString: string = null;
    let relationshipEndEndpointString: string = null;
    try {
      relationshipStartEndpointString = `${_getNeo4jEntityUrl(startNode, "node")}/relationships`;
      relationshipEndEndpointString = `${_getNeo4jEntityUrl(toNode, "node")}`;
    } catch (ex) {
      reject(ex);
    }

    let body: any = {
      to: relationshipEndEndpointString,
      type,
      data
    };
    try {
      body = JSON.stringify(body);
    } catch (ex) {
      reject(ex);
    }
    requestOptions.body = body;
    request.post(relationshipStartEndpointString, requestOptions, (err, response, body) => {
      if (err) {
        reject(err);
      }
      if (response.statusCode !== 201) {
        reject(`Error inserting relationship. received invalid HTTP status code: ${response.statusCode}, and message: ${response.statusMessage}`);
      }
      body = typeof body === "string" && body.length > 0 ? JSON.parse(body) : body;
      resolve(body);
    });
  });
  return promise;
}

/*********************************
 * Module Accessor/Mutator functions
 */

/**
 * @returns boolean
 */
export function isConnected(): boolean {
  return connected;
}

/**
 * @returns boolean
 */
export function isStreaming(): boolean {
  return streaming;
}

/**
 * @param  {boolean} reqStreaming
 * @returns boolean
 */
export function setStreaming(reqStreaming: boolean): boolean {
  return streaming = reqStreaming;
}

function _getNeo4jEntityUrl(entity: INeo4jEntity | string | number, type?: string): string {
  if (typeof entity === "object") {
    if (entity.self) {
      return entity.self;
    } else {
      throw new TypeError(`object must have property 'self'`);
    }
  } else if (typeof entity === "string") {
    try {
      url.parse(entity);
    } catch (ex) {
      throw ex;
    }
    return entity;
  } else if (typeof entity === "number") {
    if (type === "node") {
      return `${graphPaths.node}/${entity}`;
    } else if (type === "relationship") {
      return `${dbConfigUrl}/relationship/${entity}`;
    } else {
      throw new TypeError();
    }
  } else {
    throw new TypeError(`startNode must be of type: INode, string, number`);
  }
}

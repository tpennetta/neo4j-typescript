/**
 * @author Tom Pennetta <tpennetta@gmail.com>
 * TODO: Don't reuse the same instance fo requestOptions for each call.
 */
"use strict";
const url = require("url");
const request = require("request");
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
(function (NEO4J_PROTOCOL) {
    NEO4J_PROTOCOL[NEO4J_PROTOCOL["http"] = 0] = "http";
    NEO4J_PROTOCOL[NEO4J_PROTOCOL["https"] = 1] = "https";
})(exports.NEO4J_PROTOCOL || (exports.NEO4J_PROTOCOL = {}));
var NEO4J_PROTOCOL = exports.NEO4J_PROTOCOL;
;
// TODO: Change to enums
const NEO4J_ENTITY_TYPES = ["node", "relationship"];
const NEO4J_HTTP_METHODS = ["DELETE", "GET", "POST", "PUT"];
const NEO4J_RELATIONSHIP_DIRECTION = ["all", "in", "out"];
const NEO4J_STANDARD_PATHS = {
    config: "/db/data/",
    propertyKeys: "/db/data/propertykeys"
};
;
/*********************************
 * Internal module variables. Connection state properties.
 */
let connected = false;
let streaming = false;
let graphPaths = null;
let relationshipTypes = [];
let requestOptions = {};
let dbConfigUrl = null;
/**
 * @param  {INeo4jConfig} options
 * @returns Promise
 */
function connect(options) {
    let promise = new Promise((resolve, reject) => {
        if (connected && graphPaths && url.parse(graphPaths.node).hostname === options.host) {
            return resolve(graphPaths);
        }
        streaming = options.streaming || streaming;
        if (streaming) {
            requestOptions.headers = requestOptions.headers || {};
            requestOptions.headers["X-Stream"] = true;
        }
        let dbConfigEndpointString = `${NEO4J_PROTOCOL[options.protocol]}://${options.host}:${options.port}`;
        dbConfigEndpointString = url.resolve(dbConfigEndpointString, NEO4J_STANDARD_PATHS.config);
        try {
            dbConfigUrl = url.parse(dbConfigEndpointString);
        }
        catch (ex) {
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
exports.connect = connect;
/**
 * @returns Promise
 */
function getRelationshipTypes() {
    let promise = new Promise((resolve, reject) => {
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
                }
                catch (ex) {
                    reject(`Invalid JSON string returned: ${ex.message}`);
                }
            }
            relationshipTypes = body;
            resolve(relationshipTypes);
        });
    });
    return promise;
}
exports.getRelationshipTypes = getRelationshipTypes;
/**
 * @returns Promise
 */
function getAllPropertyKeys() {
    let promise = new Promise((resolve, reject) => {
        let getAllPropertyKeysEndpoint = `${dbConfigUrl.protocol}//${dbConfigUrl.hostname}:${dbConfigUrl.port}${NEO4J_STANDARD_PATHS.propertyKeys}`;
        request.get(getAllPropertyKeysEndpoint, requestOptions, (err, response, body) => {
            if (err) {
                reject(err);
            }
            if (response.statusCode >= 400) {
                reject(`Invalid HTTP Response code returned: ${response.statusCode}`);
            }
            else {
                body = typeof body === "string" ? JSON.parse(body) : body;
                resolve(body);
            }
        });
    });
    return promise;
}
exports.getAllPropertyKeys = getAllPropertyKeys;
/*********************************
 * Node/Vertex functions
 */
/**
 * @param  {number} id
 * @returns Promise
 */
function getNode(id) {
    let promise = new Promise((resolve, reject) => {
        let nodeEndpointString = `${graphPaths.node}/${id}`;
        request.get(nodeEndpointString, requestOptions, (err, response, body) => {
            if (err) {
                reject(err);
            }
            if (response.statusCode >= 400) {
                reject(`Invalid HTTP Response code returned: ${response.statusCode}`);
            }
            body = typeof body === "string" ? JSON.parse(body) : body;
            let returnedNode = body;
            resolve(body);
        });
    });
    return promise;
}
exports.getNode = getNode;
/**
 * @param  {any} data?
 * @returns Promise
 */
function createNode(data) {
    let promise = new Promise((resolve, reject) => {
        let nodeEndpointString = graphPaths.node;
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
            let returnedNode = body;
            resolve(body);
        });
    });
    return promise;
}
exports.createNode = createNode;
/**
 * @param  {number} id
 * @returns Promise
 */
function deleteNode(id) {
    let promise = new Promise((resolve, reject) => {
        let nodeEndpointString = `${graphPaths.node}/${id}`;
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
exports.deleteNode = deleteNode;
/*********************************
 * Property functions
 */
/**
 * @param  {number} nodeId
 * @param  {string} propertyName
 * @param  {number|string|boolean|number[]|string[]|boolean[]} data
 * @returns Promise
 */
function setProperty(entityId, type, propertyName, data) {
    let promise = new Promise((resolve, reject) => {
        let propertyEndpointString = null;
        if (type === "node") {
            propertyEndpointString = `${graphPaths.node}/${entityId}/properties/${propertyName}`;
        }
        else if (type === "relationship") {
            propertyEndpointString = url.resolve(dbConfigUrl.href, `relationship/${entityId}/properties/${propertyName}`);
        }
        else {
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
exports.setProperty = setProperty;
/**
 * @param  {number} nodeId
 * @param  {any} data
 * @returns Promise
 */
function updateProperties(nodeId, data) {
    let promise = new Promise((resolve, reject) => {
        let propertiesEndpointString = `${graphPaths.node}/${nodeId}/properties`;
        if (typeof data !== "string") {
            try {
                data = JSON.stringify(data);
            }
            catch (ex) {
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
exports.updateProperties = updateProperties;
/**
 * @param  {number} nodeId
 */
function getProperties(nodeId) {
    let promise = new Promise((resolve, reject) => {
        let propertiesEndpointString = `${graphPaths.node}/${nodeId}/properties`;
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
exports.getProperties = getProperties;
/**
 * @param  {number} nodeId
 * @param  {string} propertyName
 * @returns Promise
 */
function getProperty(nodeId, propertyName) {
    let promise = new Promise((resolve, reject) => {
        let propertyEndpointString = `${graphPaths.node}/${nodeId}/properties/${propertyName}`;
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
exports.getProperty = getProperty;
/**
 * @param  {number} nodeId
 * @param  {string} propertyName
 * @returns Promise
 */
function deleteProperty(nodeId, propertyName) {
    let promise = new Promise((resolve, reject) => {
        let propertyEndpointString = `${graphPaths.node}/${nodeId}/properties/${propertyName}`;
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
exports.deleteProperty = deleteProperty;
/**
 * @param  {number} nodeId
 * @returns Promise
 */
function deleteAllProperties(nodeId) {
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
exports.deleteAllProperties = deleteAllProperties;
/*********************************
 * Relationship functions
 */
function getRelationship(relationshipId, direction, types) {
    let promise = new Promise((resolve, reject) => {
        if (direction && NEO4J_RELATIONSHIP_DIRECTION.indexOf(direction) === -1) {
            reject(`Relationship 'direction' must be of type: ${NEO4J_RELATIONSHIP_DIRECTION}`);
        }
        let relationshipEndpointString = url.resolve(dbConfigUrl.href, `relationship/${relationshipId}`);
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
exports.getRelationship = getRelationship;
function createRelationship(startNode, toNode, type, data) {
    let promise = new Promise((resolve, reject) => {
        let relationshipStartEndpointString = null;
        let relationshipEndEndpointString = null;
        try {
            relationshipStartEndpointString = `${_getNeo4jEntityUrl(startNode, "node")}/relationships`;
            relationshipEndEndpointString = `${_getNeo4jEntityUrl(toNode, "node")}`;
        }
        catch (ex) {
            reject(ex);
        }
        let body = {
            to: relationshipEndEndpointString,
            type: type,
            data: data
        };
        try {
            body = JSON.stringify(body);
        }
        catch (ex) {
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
exports.createRelationship = createRelationship;
/*********************************
 * Module Accessor/Mutator functions
 */
/**
 * @returns boolean
 */
function isConnected() {
    return connected;
}
exports.isConnected = isConnected;
/**
 * @returns boolean
 */
function isStreaming() {
    return streaming;
}
exports.isStreaming = isStreaming;
/**
 * @param  {boolean} reqStreaming
 * @returns boolean
 */
function setStreaming(reqStreaming) {
    return streaming = reqStreaming;
}
exports.setStreaming = setStreaming;
function _getNeo4jEntityUrl(entity, type) {
    if (typeof entity === "object") {
        if (entity.self) {
            return entity.self;
        }
        else {
            throw new TypeError(`object must have property 'self'`);
        }
    }
    else if (typeof entity === "string") {
        try {
            url.parse(entity);
        }
        catch (ex) {
            throw ex;
        }
        return entity;
    }
    else if (typeof entity === "number") {
        if (type === "node") {
            return `${graphPaths.node}/${entity}`;
        }
        else if (type === "relationship") {
            return `${dbConfigUrl}/relationship/${entity}`;
        }
        else {
            throw new TypeError();
        }
    }
    else {
        throw new TypeError(`startNode must be of type: INode, string, number`);
    }
}
//# sourceMappingURL=index.js.map
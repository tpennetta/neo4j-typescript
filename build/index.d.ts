/*********************************
 * Global constants.
 */
export declare enum NEO4J_PROTOCOL {
    http = 0,
    https = 1,
}
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
}
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
        id: number;
        labels?: string[];
        type?: string;
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
/**
 * @param  {INeo4jConfig} options
 * @returns Promise
 */
export declare function connect(options: INeo4jConfig): Promise<INeo4jInternalPaths | string>;
/**
 * @returns Promise
 */
export declare function getRelationshipTypes(): Promise<string[]>;
/**
 * @returns Promise
 */
export declare function getAllPropertyKeys(): Promise<string[]>;
/*********************************
 * Node/Vertex functions
 */
/**
 * @param  {number} id
 * @returns Promise
 */
export declare function getNode(id: number): Promise<INode>;
/**
 * @param  {any} data?
 * @returns Promise
 */
export declare function createNode(data?: any): Promise<INode>;
/**
 * @param  {number} id
 * @returns Promise
 */
export declare function deleteNode(id: number): Promise<boolean>;
/*********************************
 * Property functions
 */
/**
 * @param  {number} nodeId
 * @param  {string} propertyName
 * @param  {number|string|boolean|number[]|string[]|boolean[]} data
 * @returns Promise
 */
export declare function setProperty(entityId: number, type: string, propertyName: string, data: number | string | boolean | number[] | string[] | boolean[]): Promise<boolean>;
/**
 * @param  {number} nodeId
 * @param  {any} data
 * @returns Promise
 */
export declare function updateProperties(nodeId: number, data: any): Promise<boolean>;
/**
 * @param  {number} nodeId
 */
export declare function getProperties(nodeId: number): Promise<{}>;
/**
 * @param  {number} nodeId
 * @param  {string} propertyName
 * @returns Promise
 */
export declare function getProperty(nodeId: number, propertyName: string): Promise<number | string | boolean | number[] | string[] | boolean[]>;
/**
 * @param  {number} nodeId
 * @param  {string} propertyName
 * @returns Promise
 */
export declare function deleteProperty(nodeId: number, propertyName: string): Promise<boolean>;
/**
 * @param  {number} nodeId
 * @returns Promise
 */
export declare function deleteAllProperties(nodeId: number): Promise<boolean>;
/*********************************
 * Relationship functions
 */
export declare function getRelationship(relationshipId: number, direction?: string, types?: string[]): Promise<IRelationship>;
export declare function createRelationship(startNode: INode | string | number, toNode: INode | string | number, type?: string, data?: any): Promise<IRelationship>;
/*********************************
 * Module Accessor/Mutator functions
 */
/**
 * @returns boolean
 */
export declare function isConnected(): boolean;
/**
 * @returns boolean
 */
export declare function isStreaming(): boolean;
/**
 * @param  {boolean} reqStreaming
 * @returns boolean
 */
export declare function setStreaming(reqStreaming: boolean): boolean;

/* eslint-disable */
import * as types from './graphql';
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
const documents = {
    "\n  query GetUserChannels($userAccounts: [String!]!) {\n    channels(where: { ownerMember: { controllerAccount_in: $userAccounts } }) {\n      id\n      title\n      ownerMember {\n        id\n        controllerAccount\n      }\n      collaborators {\n        permissions\n        memberId\n      }\n    }\n  }\n": types.GetUserChannelsDocument,
    "\n  query GetChannelVideos($channelId: ID!) {\n    videos(where: { channel: { id_eq: $channelId } }) {\n      id\n      title\n      media {\n        id\n      }\n      thumbnailPhoto {\n        id\n      }\n    }\n  }\n": types.GetChannelVideosDocument,
    "\n  subscription GetQnState {\n    stateSubscription {\n      lastCompleteBlock\n    }\n  }\n": types.GetQnStateDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = graphql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function graphql(source: string): unknown;

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetUserChannels($userAccounts: [String!]!) {\n    channels(where: { ownerMember: { controllerAccount_in: $userAccounts } }) {\n      id\n      title\n      ownerMember {\n        id\n        controllerAccount\n      }\n      collaborators {\n        permissions\n        memberId\n      }\n    }\n  }\n"): (typeof documents)["\n  query GetUserChannels($userAccounts: [String!]!) {\n    channels(where: { ownerMember: { controllerAccount_in: $userAccounts } }) {\n      id\n      title\n      ownerMember {\n        id\n        controllerAccount\n      }\n      collaborators {\n        permissions\n        memberId\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetChannelVideos($channelId: ID!) {\n    videos(where: { channel: { id_eq: $channelId } }) {\n      id\n      title\n      media {\n        id\n      }\n      thumbnailPhoto {\n        id\n      }\n    }\n  }\n"): (typeof documents)["\n  query GetChannelVideos($channelId: ID!) {\n    videos(where: { channel: { id_eq: $channelId } }) {\n      id\n      title\n      media {\n        id\n      }\n      thumbnailPhoto {\n        id\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  subscription GetQnState {\n    stateSubscription {\n      lastCompleteBlock\n    }\n  }\n"): (typeof documents)["\n  subscription GetQnState {\n    stateSubscription {\n      lastCompleteBlock\n    }\n  }\n"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;
import { QN_URL, TRANSACTOR_MEMBER_ID } from "./config";
import { graphql } from "./gql";
import { request } from "graphql-request";
import { signatureVerify } from "@polkadot/util-crypto";
import { stringToU8a } from "@polkadot/util";

const getBagStorageBucketsQuery = graphql(/* GraphQL */ `
  query GetBagStorageBuckets($id: ID!) {
    storageBags(where: { id_eq: $id }) {
      storageBuckets {
        id
        operatorStatus {
          __typename
        }
        operatorMetadata {
          nodeEndpoint
        }
      }
    }
  }
`);

const getChannelQuery = graphql(`
  query GetChannel($id: ID!) {
    channels(where: { id_eq: $id }) {
      id
      ownerMember {
        id
        controllerAccount
      }
      collaborators {
        permissions
        memberId
      }
    }
  }
`);

export const getChannelStorageEndpoints = async (channelId: string) => {
  const data = await request(QN_URL, getBagStorageBucketsQuery, {
    id: `dynamic:channel:${channelId}`,
  });
  const buckets = data.storageBags[0].storageBuckets;

  const activeBuckets = buckets.filter(
    (bucket) =>
      bucket.operatorStatus.__typename ===
        "StorageBucketOperatorStatusActive" &&
      bucket.operatorMetadata?.nodeEndpoint?.includes("http")
  );

  const checkStorageEndpoint = async (bucket: (typeof activeBuckets)[0]) => {
    const endpointBase = bucket.operatorMetadata!.nodeEndpoint as string;
    const testEndpoint = `${endpointBase}api/v1/version`;
    const response = await fetch(testEndpoint);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return { endpoint: endpointBase, bucketId: bucket.id };
  };

  const fastestEndpoint = await Promise.any(
    activeBuckets.map((bucket) => checkStorageEndpoint(bucket))
  );

  if (!fastestEndpoint) {
    throw new Error("No responsive endpoints found");
  }

  return fastestEndpoint;
};

const SIGNATURE_EXPIRATION_TIME = 5 * 60 * 1000;

type VerifyChannelPermissionsAndSignatureArgs = {
  channelId: string;
  videoId: string;
  signature: string;
  timestamp: number;
};
export const verifyChannelPermissionsAndSignature = async ({
  channelId,
  videoId,
  signature,
  timestamp,
}: VerifyChannelPermissionsAndSignatureArgs): Promise<boolean> => {
  if (Date.now() - timestamp > SIGNATURE_EXPIRATION_TIME) {
    return false;
  }
  const data = await request(QN_URL, getChannelQuery, { id: channelId });
  const channel = data.channels[0];
  if (!channel) {
    return false;
  }
  const transactorPermissions = channel.collaborators.find(
    (collaborator) => collaborator.memberId === TRANSACTOR_MEMBER_ID
  );
  if (!transactorPermissions) {
    return false;
  }
  const correctPermissions =
    transactorPermissions.permissions.includes("UpdateVideoMetadata") &&
    transactorPermissions.permissions.includes("ManageVideoAssets");

  if (!correctPermissions) {
    return false;
  }

  const expectedPayload = {
    memberId: channel.ownerMember!.id,
    appName: "Joyutils Transcoder",
    timestamp,
    action: "uploadAssets",
    meta: {
      videoId,
    },
  };

  try {
    const { isValid } = signatureVerify(
      stringToU8a(JSON.stringify(expectedPayload)),
      signature,
      channel.ownerMember!.controllerAccount
    );

    return isValid;
  } catch (error) {
    return false;
  }
};

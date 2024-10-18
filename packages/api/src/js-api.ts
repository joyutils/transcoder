import { ApiPromise } from "@polkadot/api";
import { type SubmittableExtrinsic } from "@polkadot/api/types";
import { type KeyringPair } from "@polkadot/keyring/types";
import { type Signer } from "@polkadot/types/types";
import { Bytes, Option } from "@polkadot/types";
import {
  ContentMetadata,
  type IMediaType,
  type IVideoMetadata,
} from "@joystream/metadata-protobuf";
import { type PalletContentStorageAssetsRecord } from "@polkadot/types/lookup";
import { createType } from "@joystream/types";
import { TRANSACTOR_MEMBER_ID } from "./config";

export enum ExtrinsicStatus {
  Unsigned,
  Signed,
  Completed,
  Error,
}
export type ExtrinsicStatusCallbackFn = (
  status: ExtrinsicStatus.Signed
) => void;

export type RawExtrinsicResult = {
  events: string[];
  blockHash: string;
  transactionHash: string;
};

export function submitExtrinsic(
  tx: SubmittableExtrinsic<"promise">,
  accountId: string,
  rpcUrl: string,
  signer: Signer,
  cb?: ExtrinsicStatusCallbackFn
): Promise<RawExtrinsicResult>;

export function submitExtrinsic(
  tx: SubmittableExtrinsic<"promise">,
  account: KeyringPair,
  rpcUrl: string,
  cb?: ExtrinsicStatusCallbackFn
): Promise<RawExtrinsicResult>;
export function submitExtrinsic(
  tx: SubmittableExtrinsic<"promise">,
  account: string | KeyringPair,
  rpcUrl: string,
  signerOrCb?: Signer | ExtrinsicStatusCallbackFn,
  cb?: ExtrinsicStatusCallbackFn
): Promise<RawExtrinsicResult> {
  let signer: Signer | undefined;
  if (typeof account === "string" && typeof signerOrCb === "object") {
    signer = signerOrCb;
  } else {
    cb = signerOrCb as ExtrinsicStatusCallbackFn;
  }
  return new Promise<RawExtrinsicResult>((resolve, reject) => {
    let unsub: () => void;
    let transactionInfo: string;

    tx.signAndSend(account, { nonce: -1, signer }, (result) => {
      const extrinsicsHash = tx.hash.toHex();
      const { status, isError, events: rawEvents } = result;
      if (isError) {
        unsub();

        console.error(`Transaction error: ${transactionInfo}`);
        reject(new Error("UnknownError"));
        return;
      }

      if (status.isInBlock) {
        unsub();

        const events = rawEvents.map((record) => {
          const { event } = record;
          return `${event.section}.${event.method}`;
        });

        if (events.includes("system.ExtrinsicFailed")) {
          reject(
            new Error(
              `ExtrinsicFailed: https://polkadot.js.org/apps/?rpc=${encodeURI(
                rpcUrl
              )}#/explorer/query/${status.asInBlock.toHex()}`
            )
          );
          return;
        }

        try {
          resolve({
            events,
            blockHash: status.asInBlock.toString(),
            transactionHash: extrinsicsHash,
          });
        } catch (error) {
          reject(error);
        }
      }
    })
      .then((unsubFn) => {
        // if signAndSend succeeded, report back to the caller with the update
        cb?.(ExtrinsicStatus.Signed);
        unsub = unsubFn;
      })
      .catch((e) => {
        reject(e);
      });
  });
}

type UpdateVideoInput = {
  videoId: string;
  channelId: string;
  media?: {
    size: number;
    ipfsHash: string;
    duration: number;
    height: number;
    width: number;
    codec: string;
    container: string;
    mimeType: string;
  };
  thumbnail?: {
    size: number;
    ipfsHash: string;
  };
};

export async function prepareUpdateVideoTx(
  api: ApiPromise,
  input: UpdateVideoInput
) {
  if (!input.media && !input.thumbnail) {
    console.warn("No media or thumbnail provided for video update");
    return null;
  }

  if (input.media && input.thumbnail) {
    console.warn("Updating both media and thumbnail not supported yet");
    return null;
  }

  const actor = createType("PalletContentPermissionsContentActor", {
    Member: TRANSACTOR_MEMBER_ID,
  });

  const properties: IVideoMetadata = {};
  let assetsRecord: Option<PalletContentStorageAssetsRecord> | undefined;

  if (input.media) {
    properties.mediaPixelHeight = input.media.height;
    properties.mediaPixelWidth = input.media.width;
    properties.duration = input.media.duration;
    const mediaTypeProperties: IMediaType = {
      codecName: input.media.codec,
      container: input.media.container,
      mimeMediaType: input.media.mimeType,
    };
    properties.mediaType = mediaTypeProperties;
    properties.video = 0;

    assetsRecord = await prepareAssetForExtrinsic(api, input.media);
  }

  if (input.thumbnail) {
    properties.thumbnailPhoto = 0;

    assetsRecord = await prepareAssetForExtrinsic(api, input.thumbnail);
  }

  const rawMetadata = ContentMetadata.encode({
    videoMetadata: properties,
  }).finish();
  const metadata = wrapMetadata(rawMetadata);

  const [stateBloatBond, channelBag] = await Promise.all([
    api.query.storage.dataObjectStateBloatBondValue(),
    api.query.storage.bags({ Dynamic: { Channel: input.channelId } }),
  ]);

  const updateParams = createType("PalletContentVideoUpdateParametersRecord", {
    assetsToUpload: assetsRecord,
    newMeta: metadata,
    assetsToRemove: [],
    autoIssueNft: null,
    expectedDataObjectStateBloatBond: stateBloatBond,
    storageBucketsNumWitness: channelBag.storedBy.size,
  });

  return api.tx.content.updateVideo(actor, input.videoId, updateParams);
}

export const wrapMetadata = (metadata: Uint8Array): Option<Bytes> => {
  const metadataRaw = createType("Raw", metadata);
  const metadataBytes = createType("Bytes", metadataRaw);
  return createType("Option<Bytes>", metadataBytes);
};

export const prepareAssetForExtrinsic = async (
  api: ApiPromise,
  dataObjectMetadata: {
    size: number;
    ipfsHash: string;
  }
): Promise<Option<PalletContentStorageAssetsRecord>> => {
  const feePerMB = await api.query.storage.dataObjectPerMegabyteFee();

  const dataObjectParams = createType(
    "PalletStorageDataObjectCreationParameters",
    {
      size_: dataObjectMetadata.size,
      ipfsContentId: createType("Bytes", dataObjectMetadata.ipfsHash),
    }
  );

  const dataObjectsVec = createType(
    "Vec<PalletStorageDataObjectCreationParameters>",
    [dataObjectParams]
  );

  const storageAssets = createType("PalletContentStorageAssetsRecord", {
    objectCreationList: dataObjectsVec,
    expectedDataSizeFee: feePerMB,
  });
  return createType("Option<PalletContentStorageAssetsRecord>", storageAssets);
};

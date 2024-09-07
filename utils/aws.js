const fs = require("fs");
const path = require("path");
const {
  S3Client,
  PutObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  ListPartsCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} = require("@aws-sdk/client-s3");
const { getSignedCookies } = require("@aws-sdk/cloudfront-signer");

const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const bucketRegion = process.env.AWS_BUCKET_REGION;
const bucketName = process.env.AWS_BUCKET_NAME;
const keyPairId = process.env.KEYPAIR_ID;
const cookieExpiresIn = process.env.CLOUDFRONT_COOKIE_EXPIRES_IN; // Seconds

const s3 = new S3Client({
  region: bucketRegion,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

const upload = async (object, path, contentType) => {
  console.log("Put Object (aws-upload): ", path);

  const params = {
    Bucket: bucketName,
    Key: path,
    Body: object,
    ContentType: contentType,
  };

  const command = new PutObjectCommand(params);

  const uploadResp = await s3.send(command);

  return uploadResp;
};

// Initialize multipart
const initializeMultipartUpload = async (path, contentType = "video/mp4") => {
  console.log("Create Multipart Upload (aws-initializeMultipart): ", path);

  const params = {
    Bucket: bucketName,
    Key: path,
    ContentType: contentType,
  };

  const command = new CreateMultipartUploadCommand(params);

  const multipartInit = await s3.send(command);

  return multipartInit;
};

const uploadPart = async (object, path, uploadId, partNo) => {
  console.log("Upload Part (aws-uploadPart): ", path);

  const params = {
    Bucket: bucketName,
    Key: path,
    UploadId: uploadId,
    PartNumber: partNo,
    Body: object,
  };

  const command = new UploadPartCommand(params);

  const uploadedPart = await s3.send(command);

  return uploadedPart;
};

const getUploadParts = async (path, uploadId) => {
  console.log("List Parts (aws-getUploadParts): ", path);

  const params = {
    Bucket: bucketName,
    Key: path,
    UploadId: uploadId,
  };

  const command = new ListPartsCommand(params);

  const listParts = await s3.send(command);

  return listParts.Parts;
};

const completeMultipartUpload = async (path, uploadId) => {
  console.log("Complete Multipart (aws-completeMultipartUpload): ", path);

  const uploadParts = await getUploadParts(path, uploadId);
  const parts = uploadParts.map((part) => ({
    ETag: part.ETag,
    PartNumber: part.PartNumber,
  }));

  const params = {
    Bucket: bucketName,
    Key: path,
    UploadId: uploadId,
    MultipartUpload: {
      Parts: parts,
    },
  };

  const command = new CompleteMultipartUploadCommand(params);

  const completedMultipart = await s3.send(command);

  return completedMultipart;
};

const abortMultipartUpload = async (path, uploadId) => {
  console.log("Abort Multipart (aws-abortMultipartUpload): ", uploadId);

  const params = {
    Bucket: bucketName,
    Key: path,
    UploadId: uploadId,
  };

  const command = new AbortMultipartUploadCommand(params);

  const abortMultipart = await s3.send(command);

  return abortMultipart;
};

const getCloudfrontCookies = async (resource) => {
  console.log("Get Cloudfront Cookies (aws-getCloudfrontCookies): ", resource);

  const privateKeyPath = path.join(__dirname, "./sample_private_key.pem");
  const privateKey = fs.readFileSync(privateKeyPath);

  const expiry =
    Math.floor(new Date().getTime() / 1000) + Number(cookieExpiresIn);

  const policy = {
    Statement: [
      {
        Resource: resource,
        Condition: {
          DateLessThan: {
            "AWS:EpochTime": expiry, // time in seconds
          },
        },
      },
    ],
  };

  const policyString = JSON.stringify(policy);

  const cookies = getSignedCookies({
    keyPairId,
    privateKey,
    policy: policyString,
  });

  return cookies;
};

const deleteObject = async (key) => {
  console.log("Delete Object (aws-deleteObject): ", key);

  const params = {
    Bucket: bucketName,
    Key: key,
  };

  const command = new DeleteObjectCommand(params);

  const deleteResp = await s3.send(command);

  return deleteResp;
};

// Returns the keys of all objects in a particular path (folder)
const listObjects = async (folder) => {
  console.log("List Objects data (aws-listObjects): ", folder);

  const params = {
    Bucket: bucketName,
    Prefix: folder,
  };

  let objects = [];
  let hasFiles = true; // Indicates if the folder has any objects
  let continuationToken;

  while (hasFiles) {
    if (continuationToken) {
      params.ContinuationToken = continuationToken;
    }

    const command = new ListObjectsV2Command(params);

    const listData = await s3.send(command);

    // IsTruncated indicates if the bucket has more objects to fetch
    hasFiles = listData.IsTruncated;
    continuationToken = listData.NextContinuationToken; // Pointer to next set of objects

    if (listData.Contents) {
      const listContents = listData.Contents.map((object) => ({
        Key: object.Key,
      }));

      objects = objects.concat(listContents);
    }
  }

  return objects;
};

const deleteDir = async (path) => {
  console.log("Delete Directory (aws-deleteDir): ", path);

  const objectsToDelete = await listObjects(path);

  if (objectsToDelete.length === 0) {
    console.log("No objects to delete");
    return;
  }

  const params = {
    Bucket: bucketName,
    Delete: {
      Objects: objectsToDelete,
    },
  };

  const command = new DeleteObjectsCommand(params);

  const deleteResp = await s3.send(command);

  return deleteResp;
};

module.exports = {
  S3: {
    upload,
    deleteObject,
    deleteDir,
    multipart: {
      initialize: initializeMultipartUpload,
      uploadPart,
      complete: completeMultipartUpload,
      abort: abortMultipartUpload,
    },
  },
  CloudFront: {
    signedCookies: getCloudfrontCookies,
  },
};

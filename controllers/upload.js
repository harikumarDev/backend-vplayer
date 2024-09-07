const mongoose = require("mongoose");
const Video = require("../models/video");
const catchAsyncErrors = require("../middlewares/catchAsyncErrors");
const error = require("../utils/error");
const { S3 } = require("../utils/aws");

const video = catchAsyncErrors(async (req, res, next) => {
  console.log("Upload video: ", req.user.email);

  if (!req.file) {
    return error(res, next, "File not found");
  }

  const { title } = req.body;

  if (!title) {
    return error(res, next, "Title is required");
  }

  const { buffer, mimetype, size } = req.file;

  // Limiting the file size as it is a test app
  const MAX_FILE_SIZE = 250 * 1024 * 1024; // 250 MB
  if (size > MAX_FILE_SIZE) {
    return error(res, next, "File size should be less than 250 MB");
  }

  const videoId = new mongoose.Types.ObjectId();
  const videoPath = req.user._id + "/videos/" + videoId + "/raw";

  await S3.upload(buffer, videoPath, mimetype);

  const newVideo = await Video.create({
    title,
    key: videoPath,
    user: req.user._id,
    _id: videoId,
  });

  res.status(201).json({
    success: true,
    newVideo,
  });
});

const initializeMultipart = catchAsyncErrors(async (req, res, next) => {
  console.log("Initialise multipart upload: ", req.user.email);

  const videoId = new mongoose.Types.ObjectId();
  const videoPath = req.user._id + "/videos/" + videoId + "/raw";

  const multipartUpload = await S3.multipart.initialize(videoPath);

  const { UploadId } = multipartUpload;

  res.status(202).json({
    success: true,
    uploadId: UploadId,
    videoId,
    videoPath,
  });
});

const chunk = catchAsyncErrors(async (req, res, next) => {
  console.log("Chunk upload: ", req.user.email);

  if (!req.file) {
    return error(res, next, "Chunk not found");
  }

  // Limiting the file size as it is a test app and to avoid huge AWS bill
  const MAX_CHUNK_SIZE = 6 * 1024 * 1024; // 6 MB
  if (req.file.size > MAX_CHUNK_SIZE) {
    return error(res, next, "Chunk size should be less than 6 MB");
  }

  const { buffer } = req.file;
  const { index, uploadId, videoPath } = req.body;
  console.log("Chunk upload for video: ", videoPath);

  const uploadedPart = await S3.multipart.uploadPart(
    buffer,
    videoPath,
    uploadId,
    parseInt(index) + 1
  );

  res.status(201).json({
    success: true,
    ETag: uploadedPart.ETag,
  });
});

const completeMultipart = catchAsyncErrors(async (req, res, next) => {
  console.log("Complete multipart upload: ", req.user.email);

  const { uploadId, title, videoId, videoPath } = req.body;

  if (!(videoId && videoPath && uploadId)) {
    return error(res, next, "All fields are required");
  }

  console.log("Complete multipart for video: ", videoId);

  const completedMultipart = await S3.multipart.complete(videoPath, uploadId);

  console.log("Multipart upload completed: ", completedMultipart.Location);

  if (!title) {
    return error(res, next, "Title is required");
  }

  // Adding new video to the DB
  const newVideo = await Video.create({
    title,
    key: videoPath,
    user: req.user._id,
    _id: videoId,
  });

  res.status(200).json({
    success: true,
    newVideo,
  });
});

const abortMultipart = catchAsyncErrors(async (req, res, next) => {
  console.log("Abort multipart upload: ", req.user.email);

  const { uploadId, videoPath } = req.body;

  if (!(uploadId && videoPath)) {
    return error(res, next, "Upload Id is required");
  }

  console.log("Abort multipart of video: ", videoPath);

  await S3.multipart.abort(videoPath, uploadId);

  res.status(200).json({
    success: true,
  });
});

module.exports = {
  video,
  initializeMultipart,
  chunk,
  completeMultipart,
  abortMultipart,
};

const Video = require("../models/video");
const catchAsyncErrors = require("../middlewares/catchAsyncErrors");
const { S3, CloudFront } = require("../utils/aws");
const error = require("../utils/error");
const { randomiseArray } = require("../utils/helpers");

const getAll = catchAsyncErrors(async (req, res, next) => {
  console.log("Get videos");

  let videos = await Video.find({
    isProcessed: true,
  }).populate("user", "name");

  // Randomise the videos
  videos = randomiseArray(videos);

  // Set CloudFront cookies to access thumbnails
  const cloudFrontDomain = process.env.CLOUDFRONT_DOMAIN;

  const resource = `${cloudFrontDomain}/thumbnails/*`;

  if (process.env.NODE_ENV === "production") {
    const cloudFrontCookies = await CloudFront.signedCookies(resource);

    for (const [key, value] of Object.entries(cloudFrontCookies)) {
      res.cookie(key, value, {
        httpOnly: true,
        secure: true,
        path: "/",
        domain: ".zcode.pro",
      });
    }
  }

  res.status(200).json({
    success: true,
    videos,
  });
});

const getById = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;

  console.log("Get video: ", id);

  if (!id) {
    return error(res, next, "Video id is required");
  }

  const video = await Video.findById(id).populate("user", "name");

  if (!video) {
    return error(res, next, "Video not found");
  }

  const hlsPath = video.hlsPath;
  const cloudFrontDomain = process.env.CLOUDFRONT_DOMAIN;

  const url = `${cloudFrontDomain}/${hlsPath}`; // HLS master.m3u8 url

  // Provide access to all files in path/to/hls/* directory
  const resource = url.replace("master.m3u8", "*");

  if (process.env.NODE_ENV === "production") {
    const cloudFrontCookies = await CloudFront.signedCookies(resource);

    for (const [key, value] of Object.entries(cloudFrontCookies)) {
      res.cookie(key, value, {
        httpOnly: true,
        secure: true,
        path: "/",
        domain: ".zcode.pro",
      });
    }
  }

  res.status(200).json({
    success: true,
    video: {
      ...video._doc,
      url,
    },
  });
});

// Videos uploaded by a particular user
const uploaded = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;

  console.log("Get videos of user: ", req.user.email);

  if (!id) {
    return error(res, next, "User id is required");
  }

  const authenticatedUserId = String(req.user._id);

  if (id !== authenticatedUserId) {
    return error(res, next, "Unauthorized", 403);
  }

  const videos = await Video.find({ user: id })
    .populate("user", "name")
    .sort({ createdAt: -1 });

  // Set CloudFront cookies to access thumbnails
  const cloudFrontDomain = process.env.CLOUDFRONT_DOMAIN;

  const resource = `${cloudFrontDomain}/thumbnails/*`;

  if (process.env.NODE_ENV === "production") {
    const cloudFrontCookies = await CloudFront.signedCookies(resource);

    for (const [key, value] of Object.entries(cloudFrontCookies)) {
      res.cookie(key, value, {
        httpOnly: true,
        secure: true,
        path: "/",
        domain: ".zcode.pro",
      });
    }
  }

  res.status(200).json({
    success: true,
    videos,
  });
});

const edit = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  const { title } = req.body;

  console.log("Edit video: ", id);

  if (!id) {
    return error(res, next, "Video id is required");
  }

  if (!title) {
    return error(res, next, "Video title is required");
  }

  const video = await Video.findById(id);
  if (!video) {
    return error(res, next, "Video not found");
  }

  const userId = String(video.user);

  if (String(req.user._id) !== userId) {
    return error(res, next, "Unauthorized", 403);
  }

  await Video.findByIdAndUpdate(id, {
    title,
  });

  res.status(200).json({
    success: true,
  });
});

const deleteVideo = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;

  console.log("Delete video: ", id);

  if (!id) {
    return error(res, next, "Video id is required");
  }

  const video = await Video.findById(id);
  if (!video) {
    return error(res, next, "Video not found");
  }

  const userId = String(video.user);

  if (String(req.user._id) !== userId) {
    return error(res, next, "Unauthorized", 403);
  }

  const thumbnailKey = video.thumbnailPath;
  const rawFileKey = video.key;
  const hlsDir = video.hlsPath.replace("master.m3u8", "");

  await video.deleteOne();

  // Remove thumbnail, raw video and HLS files from S3
  await S3.deleteObject(thumbnailKey);
  await S3.deleteObject(rawFileKey);
  await S3.deleteDir(hlsDir);

  res.status(200).json({
    success: true,
  });
});

module.exports = {
  getAll,
  getById,
  uploaded,
  edit,
  delete: deleteVideo,
};

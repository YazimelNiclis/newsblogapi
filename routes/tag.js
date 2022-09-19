const express = require("express");
const router = express.Router();
const { requireSignin, adminMiddleware } = require("../controllers/auth");
const { create, read, remove, list } = require("../controllers/tag");
const { runValidation } = require("../validators");
const { tagCreateValidator } = require("../validators/tag");

router.post(
  "/tag",
  tagCreateValidator,
  runValidation,
  requireSignin,
  adminMiddleware,
  create
);

router.get("/tag/:slug", read);

router.get("/tags", list);

router.delete("/tag/:slug", requireSignin, adminMiddleware, remove);

module.exports = router;

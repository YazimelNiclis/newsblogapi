const Blog = require("../models/blog");
const Category = require("../models/category");
const User = require("../models/user");
const Tag = require("../models/tag");
const formidable = require("formidable");
const slugify = require("slugify");
const _ = require("lodash");
const { stripHtml } = require("string-strip-html");
const { errorHandler } = require("../helpers/dbErrorHandler");
const fs = require("fs");
const { smartTrim } = require("../helpers/blog");

exports.create = (req, res) => {
  let form = new formidable.IncomingForm();
  form.keepExtensions = true;
  form.parse(req, (err, fields, files) => {
    if (err) {
      return res.status(400).json({
        error: "Image could not upload",
      });
    }
    const { title, body, categories, tags } = fields;

    if (!title || !title.length) {
      return res.status(400).json({ error: "Title is required" });
    }

    if (!body || body.length < 100) {
      return res.status(400).json({ error: "Content is too short" });
    }

    if (!categories || categories.length === 0) {
      return res
        .status(400)
        .json({ error: "At least one category is required" });
    }

    if (!tags || tags.length === 0) {
      return res.status(400).json({ error: "At least one tag is required" });
    }

    //blog
    let blog = new Blog();
    blog.title = title;
    blog.body = body;
    blog.excerpt = smartTrim(body, 320, " ", " (...)");
    blog.slug = slugify(title).toLowerCase();
    blog.mtitle = `${title} | ${process.env.APP_NAME}`;
    blog.mdesc = stripHtml(body.substring(0, 160)).result;
    blog.postedBy = req.user._id;

    /* let arrayOfCategories = categories && categories.split(",");
    let arrayOfTags = categories && tags.split(","); */
    blog.categories = categories?.split(",");
    blog.tags = tags?.split(",");

    //file
    if (files.photo) {
      if (files.photo.size > 10000000) {
        return res.status(400).json({
          error: "Image should be less than 1mb in size",
        });
      }
      blog.photo.data = fs.readFileSync(files.photo.filepath);
      blog.photo.contentType = files.photo.mimetype;
    }

    blog.save((err, result) => {
      if (err) {
        return res.status(400).json({
          error: errorHandler(err),
        });
      }
      res.json(result);
      /* Blog.findByIdAndUpdate(
        result._id,
        { $push: { categories: arrayOfCategories } },
        { new: true }
      ).exec((err, result) => {
        if (err) {
          return res.status(400).json({ error: errorHandler(err) });
        } else {
          Blog.findByIdAndUpdate(
            result._id,
            { $push: { tags: arrayOfTags } },
            { new: true }
          ).exec((err, result) => {
            if (err) {
              return res.status(400).json({ error: errorHandler(err) });
            } else {
              res.json(result);
            }
          });
        }
      }); */
    });
  });
};

//read,remove,update,

exports.list = (req, res) => {
  Blog.find({})
    .populate("categories", "_id name slug")
    .populate("tags", "_id name slug")
    .populate("postedBy", "_id name username")
    .select(
      "_id title slug excerpt categories tags postedBy createdAt updatedAt"
    )
    .exec((err, data) => {
      if (err) {
        return res.status(400).json({ error: errorHandler(err) });
      }
      res.json(data);
    });
};

exports.listAll = (req, res) => {
  const limit = req.body.limit ? parseInt(req.body.limit) : 100;
  const skip = req.body.skip ? parseInt(req.body.skip) : 0;

  let blogs;
  let categories;
  let tags;

  Blog.find({})
    .populate("categories", "_id name slug")
    .populate("tags", "_id name slug")
    .populate("postedBy", "_id name username profile")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .select(
      "_id title slug excerpt categories tags postedBy createdAt updatedAt"
    )
    .exec((err, b) => {
      if (err) {
        return res.status(400).json({ error: errorHandler(err) });
      }
      blogs = b; //blogs
      //get all categories
      Category.find({}).exec((err, c) => {
        if (err) {
          return res.status(400).json({ error: errorHandler(err) });
        }
        categories = c; //categories
        //get all tags
        Tag.find({}).exec((err, t) => {
          if (err) {
            return res.status(400).json({ error: errorHandler(err) });
          }
          tags = t; //tags
          // return all
          res.json({ blogs, categories, tags, size: blogs.length });
        });
      });
    });
};

exports.read = (req, res) => {
  const slug = req.params.slug.toLowerCase();
  Blog.findOne({ slug })
    .populate("categories", "_id name slug")
    .populate("tags", "_id name slug")
    .populate("postedBy", "_id name username")
    .select(
      "_id title body slug mtitle mdesc categories tags postedBy createdAt updatedAt"
    )
    .exec((err, blog) => {
      if (err) {
        return res.status(400).json({ error: errorHandler(err) });
      }
      if (blog == null) {
        return res.json({ message: "Blog not found" });
      }
      res.json(blog); //blogs
    });
};

exports.remove = (req, res) => {
  const slug = req.params.slug.toLowerCase();
  Blog.findOneAndRemove({ slug }).exec((err, blog) => {
    if (err) {
      return res.status(400).json({ error: errorHandler(err) });
    }
    if (blog == null) {
      return res.json({ message: "Blog not found" });
    }
    res.json({ message: "Blog deleted successfully" });
  });
};

exports.update = (req, res) => {
  const slug = req.params.slug.toLowerCase();
  Blog.findOne({ slug }).exec((err, oldBlog) => {
    if (err) {
      return res.status(400).json({ error: errorHandler(err) });
    }
    if (oldBlog == null) {
      return res.json({ message: "Blog not found" });
    }

    let form = new formidable.IncomingForm();
    form.keepExtensions = true;

    form.parse(req, (err, fields, files) => {
      if (err) {
        return res.status(400).json({
          error: "Image could not upload",
        });
      }

      let slugBeforeMerge = oldBlog.slug;
      oldBlog = _.merge(oldBlog, fields);
      oldBlog.slug = slugBeforeMerge;

      const { body, categories, tags } = fields;

      if (body) {
        if (!body || body.length < 10) {
          return res.status(400).json({ error: "Content is too short" });
        }
        oldBlog.excerpt = smartTrim(body, 320, " ", " (...)");
        oldBlog.mdesc = stripHtml(body.substring(0, 160)).result;
      }

      if (categories) {
        oldBlog.categories = categories?.split(",");
      }

      if (tags) {
        oldBlog.categories = tags?.split(",");
      }

      //file
      if (files.photo) {
        if (files.photo.size > 10000000) {
          return res.status(400).json({
            error: "Image should be less than 1mb in size",
          });
        }
        oldBlog.photo.data = fs.readFileSync(files.photo.filepath);
        oldBlog.photo.contentType = files.photo.mimetype;
      }

      oldBlog.save((err, result) => {
        if (err) {
          return res.status(400).json({
            error: errorHandler(err),
          });
        }
        //res.photo = undefined;
        res.json(result);
      });
    });
  });
};

exports.photo = (req, res) => {
  const slug = req.params.slug.toLowerCase();
  Blog.findOne({ slug })
    .select("photo")
    .exec((err, blog) => {
      if (err) {
        return res.status(400).json({ error: errorHandler(err) });
      }
      if (blog == null) {
        return res.status(400).json({ message: "Blog not found" });
      }
      res.set("Content-Type", blog.photo.contentType);
      return res.send(blog.photo.data);
    });
};

exports.listRelated = (req, res) => {
  let limit = req.body.limit ? parseInt(req.body.limit) : 3;

  const { _id, categories } = req.body.blog;

  Blog.find({ _id: { $ne: _id }, categories: { $in: categories } })
    .limit(limit)
    .populate("postedBy", "_id name username profile")
    .select("title slug excerpt postedBy createdAt updatedAt")
    .exec((err, blogs) => {
      if (err) {
        return res.status(400).json({ error: "Blogs not found" });
      }
      res.json(blogs);
    });
};

exports.listSearch = (req, res) => {
  const { search } = req.query;
  if (search) {
    Blog.find(
      {
        $or: [
          { title: { $regex: search, $options: "i" } },
          { body: { $regex: search, $options: "i" } },
        ],
      },
      (err, blogs) => {
        if (err) {
          return res.status(400).json({
            error: errorHandler(err),
          });
        }
        res.json(blogs);
      }
    ).select("-photo -body"); //seleccionar todo menos photo y body
  }
};

exports.listByUser = (req, res) => {
  User.findOne({ username: req.params.username }).exec((err, user) => {
    if (err) {
      return res.status(400).json({
        error: errorHandler(err),
      });
    }

    let userId = user?._id;

    Blog.find({ postedBy: userId })
      .populate("categories", "_id name slug")
      .populate("tags", "_id name slug")
      .populate("postedBy", "_id name username")
      .select("_id title slug postedBy createdAt updatedAt")
      .exec((err, data) => {
        if (err) {
          return res.status(400).json({ error: errorHandler(err) });
        }
        res.json(data);
      });
  });
};

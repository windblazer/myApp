// import modules
var express = require('express');
var app = express();
var path = require('path');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');

// connect database
mongoose.set('strictQuery', false);
mongoose.set('sanitizeFilter', true); // strip $-operators from query filters
mongoose.connect(process.env.MONGO_DB);
var db = mongoose.connection;
db.once("open",function () {
  console.log("DB connected!");
});
db.on("error",function (err) {
  console.log("DB ERROR :", err);
});

// model setting
var postSchema = mongoose.Schema({
  title: {type:String, required:true},
  body: {type:String, required:true},
  createdAt: {type:Date, default:Date.now},
  updatedAt: Date
});
var Post = mongoose.model('post',postSchema);

// view setting
app.set("view engine", 'ejs');

// set middlewares
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));
app.use(methodOverride("_method"));

// input validation
// Only title and body are accepted, and both must be non-empty strings.
// Any other keys (e.g. createdAt, _id, $-operators, toString) are dropped.
function pickPostInput(body) {
  var input = body && body.post;
  if (!input || typeof input !== 'object') return { error: 'post is required' };
  var title = input.title, text = input.body;
  if (typeof title !== 'string' || !title.trim()) return { error: 'title must be a non-empty string' };
  if (typeof text !== 'string' || !text.trim()) return { error: 'body must be a non-empty string' };
  return { value: { title: title, body: text } };
}

app.param('id', function (req, res, next, id) {
  if (mongoose.isValidObjectId(id)) return next();
  res.status(400).json({ success: false, message: 'invalid post id' });
});

// set routes
app.get('/posts', function(req,res){
  Post.find({}).sort('-createdAt').exec(function (err,posts) {
    if(err) return res.json({success:false, message:err});
    res.render("posts/index", {data:posts});
  });
}); // index
app.get('/posts/new', function(req,res){
  res.render("posts/new");
}); // new
app.post('/posts', function(req,res){
  var input = pickPostInput(req.body);
  if (input.error) return res.status(400).json({ success: false, message: input.error });
  Post.create(input.value, function (err,post) {
    if(err) return res.json({success:false, message:err});
    res.redirect('/posts');
  });
}); // create
app.get('/posts/:id', function(req,res){
  Post.findById(req.params.id, function (err,post) {
    if(err) return res.json({success:false, message:err});
    res.render("posts/show", {data:post});
  });
}); // show
app.get('/posts/:id/edit', function(req,res){
  Post.findById(req.params.id, function (err,post) {
    if(err) return res.json({success:false, message:err});
    res.render("posts/edit", {data:post});
  });
}); // edit
app.put('/posts/:id', function(req,res){
  var input = pickPostInput(req.body);
  if (input.error) return res.status(400).json({ success: false, message: input.error });
  input.value.updatedAt = Date.now();
  Post.findByIdAndUpdate(req.params.id, input.value, { runValidators: true }, function (err,post) {
    if(err) return res.json({success:false, message:err});
    res.redirect('/posts/'+req.params.id);
  });
}); //update
app.delete('/posts/:id', function(req,res){
  Post.findByIdAndRemove(req.params.id, function (err,post) {
    if(err) return res.json({success:false, message:err});
    res.redirect('/posts');
  });
}); //destroy

// start server
app.listen(3000, function(){
  console.log('Server On!');
});

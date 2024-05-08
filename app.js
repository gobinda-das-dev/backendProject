const express = require('express');
const app = express();
const crypto = require('crypto');

const path = require('path');
const userModel = require('./models/user');
const postModel = require('./models/post');
const cookieParser = require('cookie-parser');

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const upload = require('./config/multerconfig');


app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());

app.get('/', (req, res) => {
  res.render('index');
});

app.get('/error', (req, res) => {
  res.render('error');
});

app.post('/register', async (req, res) => {
  const { name, username, email, password, age } = req.body;

  const existedUser = await userModel.findOne({ email });
  if (existedUser) return res.status(500).send("User already exists");

  bcrypt.genSalt(10, (err, salt) => {
    bcrypt.hash(password, salt, (err, hash) => {
      const newUser = userModel.create({
        name,
        username,
        email,
        age,
        password: hash
      })

      const token = jwt.sign({ email, userid: newUser._id }, "shhhh");
      res.cookie("token", token);
      res.redirect('/profile');
    })
  });
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.get('/profile', isLoggedIn, async (req, res) => {
  const user = await userModel.findOne({ email: req.user.email }).populate('posts');
  res.render('profile', { user });
});

app.get('/profile/upload', isLoggedIn, (req, res) => {
  res.render('profileUpload');
});

app.post('/profile/upload', isLoggedIn, upload.single('profile_image_file'), async (req, res) => {
  const user = await userModel.findOne({email: req.user.email});
  user.profilepic = req.file.filename;
  user.save();
  res.redirect('/profile');
});

app.post('/post', isLoggedIn, async (req, res) => {
  const user = await userModel.findOne({ email: req.user.email })
  const post = await postModel.create({
    user: user._id,
    content: req.body.content
  });

  user.posts.push(post._id);
  await user.save();

  res.redirect('/profile')
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const existedUser = await userModel.findOne({ email });
  if (!existedUser) return res.status(500).redirect('/error');

  bcrypt.compare(password, existedUser.password, (err, result) => {
    if (result) {
      const token = jwt.sign({ email, userid: existedUser._id }, "shhhh");
      res.cookie("token", token);
      res.redirect('/profile');
    } else res.redirect('/error');
  })
});

app.get('/logout', (req, res) => {
  res.cookie('token', '');
  res.redirect('/login');
});

app.get('/like/:id', isLoggedIn, async (req, res) => {
  const post = await postModel.findById(req.params.id);

  if (post.likes.indexOf(req.user.userid) === -1) {
    post.likes.push(req.user.userid);
  } else {
    post.likes.splice(post.likes.indexOf(req.user.userid), 1);
  }

  await post.save();
  res.redirect('/profile')
});

app.get('/edit/:id', isLoggedIn, async (req, res) => {
  const post = await postModel.findById(req.params.id);
  res.render('edit', { post });
});

app.post('/edit', async (req, res) => {
  res.redirect('/profile');
});

app.post('/update/:id', async (req, res) => {
  const updatedPost = await postModel.findByIdAndUpdate(req.params.id, { content: req.body.content });
  res.redirect('/profile');
});

function isLoggedIn(req, res, next) {
  if (req.cookies.token === "") res.redirect("/login");
  else {
    const data = jwt.verify(req.cookies.token, "shhhh");
    req.user = data;
    next();
  }
}


app.listen(3000);
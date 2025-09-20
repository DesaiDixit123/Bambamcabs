const dotenv = require('dotenv').config();
const cors = require('cors');
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
let mongoose = require("mongoose");
const CommonRouter = require('./routes/vendors/common');
var app = express();
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());
mongoose.set('runValidators', true);
mongoose.connect(process.env.MONGO_URI, {});
mongoose.connection.once('open', () => {
  console.log("Well done! , connected with mongoDB database");
}).on('error', error => {
  console.log("Oops! database connection error:" + error);
});
const adminpaths = [
  { pathUrl: '/', routeFile: 'login' },
  { pathUrl: '/role', routeFile: 'role' },
  { pathUrl: '/user', routeFile: 'adminuser' },
];
const vendorpaths = [
  { pathUrl: '/common', routeFile: 'common' },
  { pathUrl: '/partener', routeFile: 'partener' },
  { pathUrl: '/', routeFile: 'vendorRegister' },
  { pathUrl: '/driver', routeFile: 'driver' },
  { pathUrl: '/vehicles', routeFile: 'vehicles' },

];
const MasterPaths = [
  { pathUrl: '/fueltype', routeFile: 'fueltype' },
  { pathUrl: '/vehicletype', routeFile: 'vehicletype' },
  { pathUrl: '/language', routeFile: 'language' },
  { pathUrl: '/penalty', routeFile: 'penalty' },
  { pathUrl: '/special-service', routeFile: 'SpecialService' },
  { pathUrl: '/tax', routeFile: 'tax' },
  { pathUrl: '/payment', routeFile: 'payment' },
  { pathUrl: '/deposit', routeFile: 'deposit' },
  { pathUrl: '/blog', routeFile: 'blog' },
  { pathUrl: '/privacy-policy', routeFile: 'privacy_policy' },
  { pathUrl: '/offer', routeFile: 'Offer' },
  { pathUrl: '/invoice', routeFile: 'invoice' },
];

adminpaths.forEach((path) => {
  app.use('/admin' + path.pathUrl, require('./routes/admin/' + path.routeFile));
});
vendorpaths.forEach((path) => {

  app.use('/vendor' + path.pathUrl, require('./routes/vendors/' + path.routeFile));
});
MasterPaths.forEach((path) => {

  app.use('/master' + path.pathUrl, require('./routes/masters/' + path.routeFile));
});


app.use(function (req, res, next) {
  next(createError(404));
});
app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});
module.exports = app;

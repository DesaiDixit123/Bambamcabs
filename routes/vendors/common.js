const express = require("express");
const { getAllCountries, getAllStates, getAllCities, getAllCountryCodes } = require('../../controllers/vendors/CommonApis/Country_State_City.controller');

const router = express.Router();

// Countries
router.get("/countries", getAllCountries);
router.get("/country-code", getAllCountryCodes);

// States by country
router.get("/states/:countryCode", getAllStates);

// Cities by state
router.get("/cities/:countryCode/:stateCode", getAllCities);




module.exports = router;

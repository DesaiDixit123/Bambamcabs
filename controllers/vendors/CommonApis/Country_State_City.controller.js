const { Country, State, City } = require("country-state-city");

// Get all countries with flag
exports.getAllCountries = (req, res) => {
  try {
    const countries = Country.getAllCountries();

    const countriesWithFlags = countries.map((c) => ({
      name: c.name,
      isoCode: c.isoCode,
      phonecode: c.phonecode,
      currency: c.currency,
      latitude: c.latitude,
      longitude: c.longitude,
      flag: `https://flagcdn.com/${c.isoCode.toLowerCase()}.svg`, // flag link
    }));

    res.status(200).json({ success: true, data: countriesWithFlags });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get states by country code
exports.getAllStates = (req, res) => {
  try {
    const { countryCode } = req.params; // Example: "IN"
    const states = State.getStatesOfCountry(countryCode);
    res.status(200).json({ success: true, data: states });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get cities by state code
exports.getAllCities = (req, res) => {
  try {
    const { countryCode, stateCode } = req.params; // Example: "IN", "GJ"
    const cities = City.getCitiesOfState(countryCode, stateCode);
    res.status(200).json({ success: true, data: cities });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


// Get only country codes
exports.getAllCountryCodes = (req, res) => {
  try {
    const countries = Country.getAllCountries();

    const codes = countries.map((c) => ({
      name: c.name,
      isoCode: c.isoCode,
      flag: `https://flagcdn.com/${c.isoCode.toLowerCase()}.svg`, // flag sathe code
    }));

    res.status(200).json({ success: true, data: codes });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
// routes/admins/vehicles.js
const express = require("express");
const router = express.Router();
const { addVehicle } = require("../../controllers/admins/vehicles/vehicleAdd");
const multer = require("../../utilities/multer.functions");

// --- Dynamic logo fields helper ---
function generateDynamicFields() {
  let fields = [
    { name: "car_photo", maxCount: 1 },
    { name: "insurance_document", maxCount: 1 },
    { name: "fitness_document", maxCount: 1 },
    { name: "permit_document", maxCount: 1 },
    { name: "puc_document", maxCount: 1 },
    { name: "rc_image", maxCount: 1 },
  ];

  // Suppose max 10 dynamic logos allow kariye
  for (let i = 0; i < 10; i++) {
    fields.push({ name: `include_facilities[${i}][logo]`, maxCount: 1 });
    fields.push({ name: `exclude_facilities[${i}][logo]`, maxCount: 1 });
    fields.push({ name: `vehicles_features[${i}][logo]`, maxCount: 1 });
  }
  return fields;
}

// POST API
router.post(
  "/save",
  multer.memoryUpload.fields(generateDynamicFields()),
  addVehicle
);

module.exports = router;

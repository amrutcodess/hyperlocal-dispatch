const express = require('express');
const router = express.Router();
const { register, login, getMerchants } = require('../controllers/authController');

router.post('/register', register);
router.post('/login', login);
router.get('/merchants', getMerchants); // Public — returns all registered merchants/admins

module.exports = router;

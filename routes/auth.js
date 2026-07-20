import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import House from '../models/House.js';
import auth from '../middleware/auth.js';

const router = express.Router();

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

const userResponse = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  partnerId: user.partnerId,
  house: user.house,
  token: undefined
});

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: 'El email ya está registrado' });
    }
    let user = await User.create({ name, email, password });
    user = await User.findById(user._id).populate('house');
    const token = generateToken(user._id);
    res.status(201).json({ ...userResponse(user), token });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Email o contraseña incorrectos' });
    }
    const populated = await User.findById(user._id).populate('house');
    const token = generateToken(user._id);
    res.json({ ...userResponse(populated), token });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/profile', auth, async (req, res) => {
  const user = await User.findById(req.user._id).select('-password').populate('house');
  res.json(user);
});

router.put('/profile', auth, async (req, res) => {
  try {
    const { name, avatar } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, avatar },
      { new: true }
    ).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/link-partner', auth, async (req, res) => {
  try {
    const { partnerEmail } = req.body;
    const partner = await User.findOne({ email: partnerEmail });
    if (!partner) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    if (partner._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'No puedes vincularte a ti mismo' });
    }
    if (partner.partnerId) {
      return res.status(400).json({ message: 'Este usuario ya tiene una pareja vinculada' });
    }
    req.user.partnerId = partner._id;
    partner.partnerId = req.user._id;

    if (!req.user.house && !partner.house) {
      const house = await House.create({
        name: `Casa de ${req.user.name} & ${partner.name}`,
        members: [req.user._id, partner._id],
        createdBy: req.user._id
      });
      req.user.house = house._id;
      partner.house = house._id;
    } else if (req.user.house && !partner.house) {
      partner.house = req.user.house;
      await House.findByIdAndUpdate(req.user.house, { $addToSet: { members: partner._id } });
    } else if (!req.user.house && partner.house) {
      req.user.house = partner.house;
      await House.findByIdAndUpdate(partner.house, { $addToSet: { members: req.user._id } });
    }

    await req.user.save();
    await partner.save();
    res.json({ message: 'Vinculación exitosa', partner });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;

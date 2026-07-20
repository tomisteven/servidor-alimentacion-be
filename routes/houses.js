import express from 'express';
import House from '../models/House.js';
import User from '../models/User.js';
import auth from '../middleware/auth.js';

const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const houses = await House.find({ members: req.user._id }).populate('members', 'name email');
    res.json(houses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'El nombre de la casa es requerido' });

    const house = await House.create({
      name,
      members: [req.user._id],
      createdBy: req.user._id
    });

    const user = await User.findById(req.user._id);
    if (!user.house) {
      user.house = house._id;
      await user.save();
    }

    res.status(201).json(house);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/:id/join', auth, async (req, res) => {
  try {
    const house = await House.findById(req.params.id);
    if (!house) return res.status(404).json({ message: 'Casa no encontrada' });
    if (house.members.includes(req.user._id)) {
      return res.status(400).json({ message: 'Ya eres miembro de esta casa' });
    }
    house.members.push(req.user._id);
    await house.save();
    res.json(house);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/:id/invite', auth, async (req, res) => {
  try {
    const { email } = req.body;
    const house = await House.findById(req.params.id);
    if (!house) return res.status(404).json({ message: 'Casa no encontrada' });
    if (!house.members.includes(req.user._id)) {
      return res.status(403).json({ message: 'No eres miembro de esta casa' });
    }
    const invited = await User.findOne({ email });
    if (!invited) return res.status(404).json({ message: 'Usuario no encontrado' });
    if (house.members.includes(invited._id)) {
      return res.status(400).json({ message: 'Ya es miembro de esta casa' });
    }
    house.members.push(invited._id);
    await house.save();
    invited.house = house._id;
    await invited.save();
    res.json({ message: 'Usuario agregado a la casa', house });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/switch/:id', auth, async (req, res) => {
  try {
    const house = await House.findById(req.params.id);
    if (!house) return res.status(404).json({ message: 'Casa no encontrada' });
    if (!house.members.includes(req.user._id)) {
      return res.status(403).json({ message: 'No eres miembro de esta casa' });
    }
    req.user.house = house._id;
    await req.user.save();
    const populated = await User.findById(req.user._id).select('-password').populate('house');
    res.json({ message: `Cambiaste a ${house.name}`, user: populated });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;

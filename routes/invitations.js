import express from 'express';
import Invitation from '../models/Invitation.js';
import House from '../models/House.js';
import User from '../models/User.js';
import auth from '../middleware/auth.js';

const router = express.Router();

router.post('/', auth, async (req, res) => {
  try {
    const { email, userId } = req.body;
    if (!email && !userId) {
      return res.status(400).json({ message: 'Debes proporcionar un email o ID de usuario' });
    }

    const house = await House.findOne({ members: req.user._id });
    if (!house) {
      return res.status(400).json({ message: 'No tienes una casa. Primero crea una.' });
    }

    let targetUser;
    if (userId) {
      targetUser = await User.findById(userId);
    } else {
      targetUser = await User.findOne({ email: email.toLowerCase() });
    }
    if (!targetUser) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    if (house.members.includes(targetUser._id)) {
      return res.status(400).json({ message: 'Este usuario ya es miembro de la casa' });
    }

    const exists = await Invitation.findOne({
      house: house._id,
      toUser: targetUser._id,
      status: 'pending'
    });
    if (exists) {
      return res.status(400).json({ message: 'Ya hay una invitación pendiente para este usuario' });
    }

    const invitation = await Invitation.create({
      house: house._id,
      from: req.user._id,
      toUser: targetUser._id,
      toEmail: targetUser.email
    });

    const populated = await Invitation.findById(invitation._id)
      .populate('house', 'name')
      .populate('from', 'name email');

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/pending', auth, async (req, res) => {
  try {
    const invitations = await Invitation.find({ toUser: req.user._id, status: 'pending' })
      .populate('house', 'name')
      .populate('from', 'name email');
    res.json(invitations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id/accept', auth, async (req, res) => {
  try {
    const invitation = await Invitation.findById(req.params.id);
    if (!invitation) return res.status(404).json({ message: 'Invitación no encontrada' });
    if (invitation.toUser.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Esta invitación no es para ti' });
    }
    if (invitation.status !== 'pending') {
      return res.status(400).json({ message: 'Esta invitación ya fue procesada' });
    }

    const house = await House.findById(invitation.house);
    if (!house) return res.status(404).json({ message: 'La casa ya no existe' });

    house.members.push(req.user._id);
    await house.save();

    req.user.house = house._id;
    await req.user.save();

    invitation.status = 'accepted';
    await invitation.save();

    res.json({ message: `Te uniste a ${house.name}`, house });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id/reject', auth, async (req, res) => {
  try {
    const invitation = await Invitation.findById(req.params.id);
    if (!invitation) return res.status(404).json({ message: 'Invitación no encontrada' });
    if (invitation.toUser.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Esta invitación no es para ti' });
    }
    if (invitation.status !== 'pending') {
      return res.status(400).json({ message: 'Esta invitación ya fue procesada' });
    }

    invitation.status = 'rejected';
    await invitation.save();

    res.json({ message: 'Invitación rechazada' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;

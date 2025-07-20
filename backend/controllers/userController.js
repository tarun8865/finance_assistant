import User from '../models/User.js';

export async function getMe(req, res) {
  const user = await User.findById(req.user.id).select('-password');
  res.json(user);
} 
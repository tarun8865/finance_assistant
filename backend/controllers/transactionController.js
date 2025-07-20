import Transaction from '../models/Transaction.js';

export async function createTransaction(req, res) {
  try {
    const transaction = await Transaction.create({ ...req.body, user: req.user.id });
    res.status(201).json(transaction);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

export async function getTransactions(req, res) {
  try {
    const { from, to, page = 1, limit = 10 } = req.query;
    const filter = { user: req.user.id };
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }
    const transactions = await Transaction.find(filter)
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    const count = await Transaction.countDocuments(filter);
    res.json({ transactions, count });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

export async function deleteTransaction(req, res) {
  try {
    const { id } = req.params;
    await Transaction.deleteOne({ _id: id, user: req.user.id });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
} 
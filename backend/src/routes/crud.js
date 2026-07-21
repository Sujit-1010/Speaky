const express = require('express');
const auth = require('../middleware/auth');

function toPlain(doc) {
    if (!doc) return null;
    const obj = doc.toObject ? doc.toObject() : doc;
    const id = (obj._id || obj.id || '').toString();
    const createdAt = obj.createdAt || obj.created_date || obj.created_at;
    const plain = { ...obj, id };
    if (createdAt) plain.created_date = createdAt;
    delete plain._id;
    delete plain.__v;
    return plain;
}

function createCrudRouter(Model) {
    const router = express.Router();
    router.get('/', auth, async (req, res) => {
        try {
            const filter = { ...req.query };
            Object.keys(filter).forEach((k) => { if (filter[k] === 'true') filter[k] = true; if (filter[k] === 'false') filter[k] = false; });
            const items = await Model.find(filter).sort(req.query.sort || '-createdAt');
            res.json(items.map(toPlain));
        } catch (e) {
            res.status(500).json({ message: 'Server error' });
        }
    });
    router.get('/:id', auth, async (req, res) => {
        try {
            const item = await Model.findById(req.params.id);
            if (!item) return res.status(404).json({ message: 'Not found' });
            res.json(toPlain(item));
        } catch (e) {
            res.status(500).json({ message: 'Server error' });
        }
    });
    router.post('/', async (req, res) => {
        const created = await Model.create(req.body || {});
        res.status(201).json(toPlain(created));
    });
    router.patch('/:id', async (req, res) => {
        const updated = await Model.findByIdAndUpdate(req.params.id, req.body || {}, { new: true });
        if (!updated) return res.status(404).json({ message: 'Not found' });
        res.json(toPlain(updated));
    });
    router.delete('/:id', async (req, res) => {
        const deleted = await Model.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: 'Not found' });
        res.json({ success: true });
    });
    return router;
}

module.exports = createCrudRouter;

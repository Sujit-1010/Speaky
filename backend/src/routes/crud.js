const express = require('express');
const config = require('../config');
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

function crudError(res, req, e) {
    console.error(`[CRUD] ${req.method} ${req.originalUrl} failed:`, e);
    const msg = (config.nodeEnv !== 'production' && e?.message) ? e.message : 'Server error';
    res.status(500).json({ message: msg });
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
            crudError(res, req, e);
        }
    });

    router.get('/:id', auth, async (req, res) => {
        try {
            const item = await Model.findById(req.params.id);
            if (!item) return res.status(404).json({ message: 'Not found' });
            res.json(toPlain(item));
        } catch (e) {
            crudError(res, req, e);
        }
    });

    router.post('/', async (req, res) => {
        try {
            const created = await Model.create(req.body || {});
            res.status(201).json(toPlain(created));
        } catch (e) {
            crudError(res, req, e);
        }
    });

    router.patch('/:id', async (req, res) => {
        try {
            const updated = await Model.findByIdAndUpdate(req.params.id, req.body || {}, { new: true });
            if (!updated) return res.status(404).json({ message: 'Not found' });
            res.json(toPlain(updated));
        } catch (e) {
            crudError(res, req, e);
        }
    });

    router.delete('/:id', async (req, res) => {
        try {
            const deleted = await Model.findByIdAndDelete(req.params.id);
            if (!deleted) return res.status(404).json({ message: 'Not found' });
            res.json({ success: true });
        } catch (e) {
            crudError(res, req, e);
        }
    });

    return router;
}

module.exports = createCrudRouter;
module.exports.toPlain = toPlain;

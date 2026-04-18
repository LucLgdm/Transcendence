"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SomeController = void 0;
class SomeController {
    async getExample(req, res) {
        // Business logic for getting an example resource
        return res.status(200).json({ message: 'Example resource' });
    }
    async createExample(req, res) {
        // Business logic for creating an example resource
        return res.status(201).json({ message: 'Example resource created' });
    }
    async someMethod(req, res) {
        // Business logic for someMethod
        return res.status(200).json({ message: 'someMethod executed' });
    }
    async anotherMethod(req, res) {
        // Business logic for anotherMethod
        return res.status(200).json({ message: 'anotherMethod executed' });
    }
}
exports.SomeController = SomeController;

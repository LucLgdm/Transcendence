import { Request, Response } from 'express';

export class SomeController {
    public async getExample(req: Request, res: Response): Promise<Response> {
        // Business logic for getting an example resource
        return res.status(200).json({ message: 'Example resource' });
    }

    public async createExample(req: Request, res: Response): Promise<Response> {
        // Business logic for creating an example resource
        return res.status(201).json({ message: 'Example resource created' });
    }

    public async someMethod(req: Request, res: Response): Promise<Response> {
        // Business logic for someMethod
        return res.status(200).json({ message: 'someMethod executed' });
    }

    public async anotherMethod(req: Request, res: Response): Promise<Response> {
        // Business logic for anotherMethod
        return res.status(200).json({ message: 'anotherMethod executed' });
    }
}